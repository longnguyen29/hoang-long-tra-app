import test from 'node:test';
import assert from 'node:assert/strict';
import https from 'node:https';
import {EventEmitter} from 'node:events';
import {extractPublicEvidence, pinnedGet, retrieveWithRedirects, robotsAllowed} from './safe-public-fetch.mjs';

test('a disallowed same-origin redirect is rejected before the target request', async () => {
  const calls=[];
  const transport=async url => {
    calls.push(url);
    if(url.endsWith('/robots.txt')) return {status:200,headers:{},body:'User-agent: *\nDisallow: /private'};
    if(url.endsWith('/menu')) return {status:302,headers:{location:'/private/customer'},body:''};
    throw Error('disallowed_target_fetched');
  };
  await assert.rejects(extractPublicEvidence('https://tea.example.com/menu',{transport}),/robots_denied/);
  assert.deepEqual(calls,['https://tea.example.com/robots.txt','https://tea.example.com/menu']);
});

test('redirect chain checks every intermediate request against robots', async () => {
  const calls=[];
  const transport=async url => {
    calls.push(url);
    if(url.endsWith('/robots.txt')) return {status:200,headers:{},body:'User-agent: *\nDisallow: /private'};
    if(url.endsWith('/menu')) return {status:302,headers:{location:'/private'},body:''};
    return {status:302,headers:{location:'/allowed'},body:''};
  };
  await assert.rejects(extractPublicEvidence('https://tea.example.com/menu',{transport}),/robots_denied/);
  assert.equal(calls.length,2);
});

test('hung DNS is canceled and bounded by wall-clock timeout', async () => {
  let canceled=false;
  const resolverFactory=()=>({resolve4:()=>new Promise(()=>{}),cancel:()=>{canceled=true;}});
  const start=Date.now();
  await assert.rejects(pinnedGet('https://tea.example.com/menu',{timeoutMs:35,resolverFactory}),/timeout/);
  assert.equal(canceled,true);
  assert.ok(Date.now()-start<1000);
});

test('hung injected transport is aborted at the overall deadline', async () => {
  let aborted=false;
  const transport=async (_url,{signal}) => {
    signal.addEventListener('abort',()=>{aborted=true;},{once:true});
    return new Promise(()=>{});
  };
  const start=Date.now();
  await assert.rejects(retrieveWithRedirects('https://tea.example.com/menu',transport,{deadlineAt:Date.now()+35}),/timeout/);
  assert.equal(aborted,true);
  assert.ok(Date.now()-start<1000);
});

test('a trickling body cannot extend the absolute transport deadline', async () => {
  const originalGet=https.get;
  let stopped=false, timer;
  https.get=(_url,opts,callback)=>{
    const request=new EventEmitter();
    opts.signal.addEventListener('abort',()=>{stopped=true;clearInterval(timer);request.emit('error',new Error('aborted'));},{once:true});
    const response=new EventEmitter();
    response.statusCode=200;response.headers={'content-type':'text/plain'};
    response.destroy=()=>clearInterval(timer);
    queueMicrotask(()=>{callback(response);timer=setInterval(()=>response.emit('data',Buffer.from('x')),5);});
    return request;
  };
  try {
    const resolverFactory=()=>({resolve4:async()=>['8.8.8.8'],cancel:()=>{}});
    await assert.rejects(pinnedGet('https://tea.example.com/menu',{timeoutMs:45,resolverFactory}),/timeout/);
    assert.equal(stopped,true);
  } finally { clearInterval(timer);https.get=originalGet; }
});

test('hostile many-wildcard rules complete without exponential regex backtracking', () => {
  const rule='/'+'*a'.repeat(10)+'b$';
  const started=Date.now();
  assert.equal(robotsAllowed(`User-agent: *\nDisallow: ${rule}`,'/'+'a'.repeat(1900)),true);
  assert.ok(Date.now()-started<1000);
});

test('redaction is applied before excerpt truncation, so contacts crossing boundary do not leak', async () => {
  const transport=async url=>url.endsWith('/robots.txt')
    ? {status:404,headers:{},body:''}
    : {status:200,headers:{'content-type':'text/plain'},body:'x'.repeat(480)+' sales@example.com end'};
  const evidence=await extractPublicEvidence('https://tea.example.com/menu',{transport});
  assert.doesNotMatch(evidence.excerpt,/sales@|example\.com/);
  assert.match(evidence.excerpt,/\[email\]/);
});

test('redirected evidence exposes the actual page URL for persistence', async () => {
  const transport=async url=>url.endsWith('/robots.txt')
    ? {status:404,headers:{},body:''}
    : url.endsWith('/menu') ? {status:302,headers:{location:'/about'},body:''}
    : {status:200,headers:{'content-type':'text/plain'},body:'A tea company'};
  const evidence=await extractPublicEvidence('https://tea.example.com/menu',{transport});
  assert.equal(evidence.source_url,'https://tea.example.com/about');
});

test('robots normalizes unreserved encoded octets in request paths', () => {
 const raw='User-agent: *\nDisallow: /private';
 for (const path of ['/%70rivate','/p%72%69vate','/%50rivate','/priv%61te']) {
  assert.equal(robotsAllowed(raw,path),path==='/%50rivate',path);
 }
});

test('robots normalizes unreserved encoded octets in rules regardless of hex case', () => {
 const raw='User-agent: *\nDisallow: /%70r%69v%61t%65';
 assert.equal(robotsAllowed(raw,'/private'),false);
 assert.equal(robotsAllowed(raw,'/%70rivate'),false);
 const mixed='User-agent: *\nDisallow: /%4a%4B';
 assert.equal(robotsAllowed(mixed,'/JK'),false);
});

test('robots retains encoded reserved slash, normalizing only its hex case', () => {
 const raw='User-agent: *\nDisallow: /private%2fsecret';
 assert.equal(robotsAllowed(raw,'/private%2Fsecret'),false);
 assert.equal(robotsAllowed(raw,'/private/secret'),true);
 assert.equal(robotsAllowed('User-agent: *\nDisallow: /private/secret','/private%2Fsecret'),true);
});

test('redirect with percent-encoded disallowed path is not fetched', async () => {
 const calls=[];
 const transport=async url=>{
  calls.push(url);
  if(url.endsWith('/robots.txt'))return {status:200,headers:{},body:'User-agent: *\nDisallow: /private'};
  if(url.endsWith('/menu'))return {status:302,headers:{location:'/%70rivate'},body:''};
  throw new Error('disallowed_target_fetched');
 };
 await assert.rejects(extractPublicEvidence('https://tea.example.com/menu',{transport}),/robots_denied/);
 assert.deepEqual(calls,['https://tea.example.com/robots.txt','https://tea.example.com/menu']);
});

test('malformed percent-encoded paths and rules fail closed', () => {
 assert.throws(()=>robotsAllowed('User-agent: *\nDisallow: /','/bad%zz'),/invalid_path/);
 assert.throws(()=>robotsAllowed('User-agent: *\nDisallow: /bad%zz','/bad'),/invalid_robots/);
});

test('real Node HTTP request uses the pinned IPv4 with single-address lookup', async () => {
 const http=(await import('node:http')).default;
 const originalGet=http.get;
 const server=http.createServer((_req,res)=>{res.setHeader('content-type','text/plain');res.end('tea');});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 let observed;
 http.get=(url,opts,cb)=>originalGet({
  hostname:'teatest.invalid',port:server.address().port,path:url.pathname,
  family:opts.family,autoSelectFamily:opts.autoSelectFamily,signal:opts.signal,
  lookup:(host,options,callback)=>opts.lookup(host,options,(err,address,family)=>{
   observed={err,address,family,options};
   if(err)return callback(err);
   if(options.all)callback(null,[{address:'127.0.0.1',family:4}]);
   else callback(null,'127.0.0.1',4);
  })
 },cb);
 try {
  const resolverFactory=()=>({resolve4:async()=>['8.8.8.8'],cancel:()=>{}});
  const response=await pinnedGet('http://tea.example.com/menu',{timeoutMs:500,resolverFactory});
  assert.equal(response.body,'tea');
  assert.equal(observed.options.all,undefined);
  assert.equal(observed.address,'8.8.8.8');
  assert.equal(observed.family,4);
 } finally {http.get=originalGet;await new Promise(resolve=>server.close(resolve));}
});

test('pinned lookup also supports Node all-address callback format', async () => {
 const http=(await import('node:http')).default;
 const originalGet=http.get; let seen;
 http.get=(_url,opts,cb)=>{
  opts.lookup('tea.example.com',{all:true},(err,addresses)=>{assert.ifError(err);seen=addresses;});
  const request=new EventEmitter();
  const response=new EventEmitter();response.statusCode=200;response.headers={};
  queueMicrotask(()=>{cb(response);response.emit('end');});return request;
 };
 try {
  const resolverFactory=()=>({resolve4:async()=>['8.8.8.8'],cancel:()=>{}});
  await pinnedGet('http://tea.example.com/',{timeoutMs:500,resolverFactory});
  assert.deepEqual(seen,[{address:'8.8.8.8',family:4}]);
 } finally {http.get=originalGet;}
});

test('HTML scanner handles many unterminated script tags in bounded time', async () => {
 const {plainPage}=await import('./safe-public-fetch.mjs');
 const input='<script>'.repeat(60_000);
 const started=Date.now();
 assert.equal(plainPage(input),'');
 assert.ok(Date.now()-started<1000);
});

test('HTML scanner suppresses raw elements and malformed unclosed tags', async () => {
 const {plainPage}=await import('./safe-public-fetch.mjs');
 assert.equal(plainPage('Tea<script>private</script>after <form action="x>y">secret</form> end'),'Tea after end');
 assert.equal(plainPage('Tea<script>unfinished<p>secret'),'Tea');
 assert.equal(plainPage('Tea<!-- unterminated secret'),'Tea');
});

test('robots normalizes literal and encoded Unicode rules and paths', () => {
 const raw='User-agent: *\nDisallow: /café\nDisallow: /trà-xanh';
 assert.equal(robotsAllowed(raw,'/caf%C3%A9'),false);
 assert.equal(robotsAllowed(raw,'/caf%c3%a9'),false);
 assert.equal(robotsAllowed(raw,'/tr%C3%A0-xanh'),false);
 const encoded='User-agent: *\nDisallow: /tr%c3%a0-xanh';
 assert.equal(robotsAllowed(encoded,'/trà-xanh'),false);
 assert.equal(robotsAllowed(encoded,'/tr%C3%A0-xanh'),false);
});

test('robots normalizes literal non-BMP characters as UTF-8 too', () => {
 const raw='User-agent: *\nDisallow: /🍵';
 assert.equal(robotsAllowed(raw,'/%F0%9F%8D%B5'),false);
 assert.throws(()=>robotsAllowed('User-agent: *\nDisallow: /\ud800','/x'),/invalid_robots/);
});

test('robots rule specificity uses decoded octet count rather than encoding length', () => {
 const raw='User-agent: *\nDisallow: /é*\nAllow: /*abcd';
 assert.equal(robotsAllowed(raw,'/%C3%A9abcd'),true);
});

test('redirect to a unicode disallowed path is blocked before fetching', async () => {
 const calls=[];
 const transport=async url=>{
  calls.push(url);
  if(url.endsWith('/robots.txt'))return {status:200,headers:{},body:'User-agent: *\nDisallow: /trà'};
  if(url.endsWith('/menu'))return {status:302,headers:{location:'/tr%C3%A0'},body:''};
  throw Error('disallowed_target_fetched');
 };
 await assert.rejects(extractPublicEvidence('https://tea.example.com/menu',{transport}),/robots_denied/);
 assert.deepEqual(calls,['https://tea.example.com/robots.txt','https://tea.example.com/menu']);
});

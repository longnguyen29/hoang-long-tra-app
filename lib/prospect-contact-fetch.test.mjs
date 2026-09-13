import test from 'node:test';
import assert from 'node:assert/strict';
import { publicV4, robotsBlocks, fetchPublicPage } from './prospect-contact-fetch.js';
test('blocks private, loopback, link-local, reserved and metadata addresses',()=>{
 for(const ip of ['127.0.0.1','10.0.0.1','172.16.2.1','192.168.1.2','169.254.169.254','100.64.0.1','0.0.0.0','224.0.0.1','198.18.1.1','203.0.113.1','::1']) assert.equal(publicV4(ip),false,ip);
 assert.equal(publicV4('8.8.8.8'),true);
});
test('rejects unsupported protocols and credentials before any request',async()=>{
 for(const url of ['file:///tmp/x','https://user:pass@example.com','http://example.com:8080'])await assert.rejects(fetchPublicPage(url),/unsafe_source/);
});
test('honors disallowed paths and leaves empty rules open',()=>{
 assert.equal(robotsBlocks('User-agent: *\nDisallow: /private','/private/contact'),true);
 assert.equal(robotsBlocks('Disallow:','/contact'),false);
 assert.equal(robotsBlocks('Disallow: /private','/contact'),false);
});

test('robots wildcard and end anchor match paths accurately',()=>{
 assert.equal(robotsBlocks('Disallow: /contact$', '/contact'),true);
 assert.equal(robotsBlocks('Disallow: /contact$', '/contact-us'),false);
 assert.equal(robotsBlocks('Disallow: /*?private=', '/menu?private=1'),true);
});
test('redirect targets are checked before fetching and cannot leave the source origin',async()=>{
 const {collectPublicContacts}=await import('./prospect-contact-fetch.js');
 for (const target of ['/private','https://other.example/contact']) {
  const calls=[];
  const result=await collectPublicContacts('https://cafe.example/',async url=>{
   calls.push(url);
   if(url.endsWith('/robots.txt'))return {status:200,body:'Disallow: /private'};
   return {status:302,location:target,url};
  });
  assert.deepEqual(calls,['https://cafe.example/robots.txt','https://cafe.example/']);
  assert.equal(result.contacts.length,0);assert.ok(result.errors.length);
 }
});
test('collector preserves sources, deduplicates and caps requests',async()=>{
 const {collectPublicContacts}=await import('./prospect-contact-fetch.js');let calls=0;
 const result=await collectPublicContacts('https://cafe.example/menu',async url=>{
  calls++;
  return url.endsWith('robots.txt') ? {status:404,body:''} : {status:200,type:'text/html',url,body:'<a href="mailto:hello@cafe.example">Email</a><a href="/contact">Contact</a>'};
 });
 assert.equal(result.contacts.length,1); assert.ok(result.contacts[0].sources.length>1);assert.ok(calls<=4);
});
test('uses declared crawler groups and longest allow, not another crawler restriction',()=>{
 const text='User-agent: *\nAllow: /\nDisallow: /admin\nAllow: /admin/public\nUser-agent: OtherBot\nDisallow: /';
 assert.equal(robotsBlocks(text,'/contact'),false);
 assert.equal(robotsBlocks(text,'/admin/private'),true);
 assert.equal(robotsBlocks(text,'/admin/public'),false);
 assert.equal(robotsBlocks(text+'\nUser-agent: HoangLongResearch\nDisallow: /','/contact'),true);
 assert.equal(robotsBlocks('User-agent: *\nDisallow: /contact\nAllow: /contact','/contact'),false);
 assert.equal(robotsBlocks('User-agent: *\nDisallow: /%63ontact','/contact'),true);
});

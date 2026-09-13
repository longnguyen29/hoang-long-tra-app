import { lookup } from 'node:dns/promises';
import https from 'node:https';
import http from 'node:http';
import { extractContacts, dedupeContacts } from './prospect-contacts.js';

export function publicV4(address) {
  const parts = address.split('.').map(Number);
  if (parts.length !== 4 || parts.some(p => !Number.isInteger(p) || p < 0 || p > 255)) return false;
  const [a,b,c] = parts;
  return !(a === 0 || a === 10 || a === 127 || a >= 224 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && (b === 168 || b === 0 || (b === 88 && c === 99))) || (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) || (a === 203 && b === 0 && c === 113));
}
export async function fetchPublicPage(value) {
  const url = new URL(value);
  if (!['http:','https:'].includes(url.protocol) || url.username || url.password || (url.port && !['80','443'].includes(url.port))) throw new Error('unsafe_source');
  let timer;
  const addresses = await Promise.race([lookup(url.hostname, {family:4,all:true}), new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('dns_timeout')), 3000); })]).finally(() => clearTimeout(timer));
  if (!addresses.length || addresses.some(({address}) => !publicV4(address))) throw new Error('unsafe_source');
  // Pin the validated address to prevent DNS rebinding between validation and request.
  const result = await new Promise((resolve,reject) => {
    const client = url.protocol === 'https:' ? https : http;
    const request = client.get(url, {headers:{'User-Agent':'HoangLongResearch/1.0 (+https://www.hoanglongtra.com)',Accept:'text/html,text/plain;q=0.9'},lookup:(_host,options,callback) => options?.all ? callback(null,[addresses[0]]) : callback(null,addresses[0].address,4)}, response => {
      const chunks=[]; let size=0;
      response.on('data',chunk=>{size+=chunk.length;if(size>1500000){response.destroy();reject(new Error('page_too_large'));}else chunks.push(chunk);});
      response.on('error',reject);
      response.on('end',()=>resolve({status:response.statusCode,location:response.headers.location,type:response.headers['content-type'] || '',body:Buffer.concat(chunks).toString('utf8'),url:url.href}));
    });
    const deadline=setTimeout(()=>request.destroy(new Error('source_timeout')),8000);
    request.on('close',()=>clearTimeout(deadline)); request.on('error',reject);
  });
  return result;
}
// Apply our declared crawler group, or wildcard groups. This is a bounded parser,
// not a claim of full RFC compliance (robots redirects/errors fail closed).
export function robotsBlocks(text, path) {
  const groups=[]; let group={agents:[],rules:[]};
  for(const line of String(text).split(/\r?\n/)) {
    const match=line.replace(/#.*/, '').match(/^\s*(user-agent|allow|disallow)\s*:\s*(\S*)/i);
    if(!match)continue;
    const key=match[1].toLowerCase(),value=match[2];
    if(key==='user-agent') {
      if(group.rules.length){groups.push(group);group={agents:[],rules:[]};}
      group.agents.push(value.toLowerCase());
    } else if(value)group.rules.push({allow:key==='allow',value});
  }
  groups.push(group);
  const own=groups.filter(g=>g.agents.includes('hoanglongresearch'));
  const active=own.length?own:groups.filter(g=>g.agents.includes('*') || !g.agents.length);
  const normalized=value=>encodeURI(value).replace(/%25([0-9a-f]{2})/gi,'%$1').replace(/%[0-9a-f]{2}/gi,m=>{const c=String.fromCharCode(parseInt(m.slice(1),16));return /[a-z0-9._~-]/i.test(c)?c:m.toUpperCase();});
  const target=normalized(path); let longest=-1,allowed=true;
  for(const rule of active.flatMap(g=>g.rules)) {
    const anchored=rule.value.endsWith('$');
    const pattern=normalized(anchored?rule.value.slice(0,-1):rule.value);
    const pieces=pattern.split('*');
    if(!target.startsWith(pieces[0]))continue;
    let cursor=pieces[0].length,matched=true;
    for(let i=1;i<pieces.length;i++) {
      const part=pieces[i];
      const position=anchored && i===pieces.length-1?target.length-part.length:target.indexOf(part,cursor);
      if(position<cursor || !target.startsWith(part,position)){matched=false;break;}
      cursor=position+part.length;
    }
    if(!matched || (anchored && cursor!==target.length))continue;
    const length=pattern.length;
    if(length>longest || (length===longest && rule.allow)){longest=length;allowed=rule.allow;}
  }
  return !allowed;
}
export async function collectPublicContacts(sourceUrl, readPage = fetchPublicPage) {
  const start=new URL(sourceUrl); const robots=new Map(); const pages=[],errors=[],records=[];
  async function allowed(url) {
    if (!robots.has(url.origin)) {
      const response=await readPage(`${url.origin}/robots.txt`);
      if (response.status !== 404 && response.status !== 200) throw new Error('robots_unavailable');
      robots.set(url.origin,response.status===404?'':response.body);
    }
    return !robotsBlocks(robots.get(url.origin),`${url.pathname}${url.search}`);
  }
  const queue=[start.href];
  if (start.pathname !== '/') queue.push(start.origin+'/');
  const visited=new Set();
  while(queue.length && visited.size<3) {
    const target=queue.shift(); if(visited.has(target))continue;visited.add(target);
    try {
      const url=new URL(target);
      if (!await allowed(url)) { errors.push({url:target,reason:'Trang không cho phép thu thập tự động.'});continue; }
      const response=await readPage(target);
      if (response.status >= 300 && response.status < 400 && response.location) {
        const destination = new URL(response.location, url);
        if (destination.origin !== start.origin) throw new Error('source_redirected');
        queue.unshift(destination.href);
        continue; // Recheck robots before requesting the destination; redirects share the page budget.
      }
      if(response.status!==200 || !/text\/(html|plain)/i.test(response.type)) throw new Error('page_unavailable');
      // A redirect is allowed only within the already-reviewed origin here.
      if(new URL(response.url).origin!==url.origin) throw new Error('source_redirected');
      const result=extractContacts(response.body,response.url);
      pages.push(response.url);records.push(...result.contacts);
      for(const link of result.contact_pages) if(!visited.has(link)) queue.unshift(link);
    } catch { errors.push({url:target,reason:'Chưa đọc được trang. Có thể mở nguồn và bổ sung liên hệ thủ công.'}); }
  }
  return {contacts:dedupeContacts(records),pages,errors};
}

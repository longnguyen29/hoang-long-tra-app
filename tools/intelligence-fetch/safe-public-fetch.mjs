/** Hoang Long Gate 1: bounded, public-only extraction; standalone Node 22 module.
 * Never browse on behalf of a customer, sign in, submit forms, or send messages.
 * The injected `transport` boundary supports adversarial tests without network.
 */
import http from 'node:http';
import https from 'node:https';
import {Resolver} from 'node:dns/promises';
import {createHash} from 'node:crypto';
import {sourceURL, sameOriginRedirect, isPublicIPv4, redactEvidence, workerPolicy} from './research-gate.mjs';

export const REQUEST_AGENT = 'HoangLongResearch/0.1';
export const ROBOTS_AGENT = 'HoangLongResearch';
const unsafeRedirect = new Error('unsafe_redirect');

/** Enforce a wall-clock deadline across DNS, connection and response body.
 * Abort cooperative transports as well as returning promptly for a broken one.
 */
async function withDeadline(operation, {deadlineAt, signal} = {}) {
  const remaining = deadlineAt - Date.now();
  if (remaining <= 0 || signal?.aborted) throw new Error('timeout');
  const controller = new AbortController();
  let timer;
  let onAbort;
  const aborted = new Promise((_, reject) => {
    const expire = () => { controller.abort(); reject(new Error('timeout')); };
    timer = setTimeout(expire, remaining);
    onAbort = expire;
    signal?.addEventListener('abort', onAbort, {once:true});
  });
  try { return await Promise.race([operation(controller.signal), aborted]); }
  finally { clearTimeout(timer); signal?.removeEventListener('abort', onAbort); }
}

/** Resolve all A records and pin one public answer for the HTTPS socket. */
export async function pinnedGet(url, {maxBytes = workerPolicy.maxBytes, timeoutMs = workerPolicy.timeoutMs, signal, resolverFactory = () => new Resolver()} = {}) {
  const u = sourceURL(url);
  return withDeadline(async activeSignal => {
    const resolver = resolverFactory();
    const cancelDNS = () => resolver.cancel();
    activeSignal.addEventListener('abort', cancelDNS, {once:true});
    let answers;
    try { answers = await resolver.resolve4(u.hostname); }
    finally { activeSignal.removeEventListener('abort', cancelDNS); }
    if (activeSignal.aborted) throw new Error('timeout');
    if (!answers.length || answers.some(ip => !isPublicIPv4(ip))) throw new Error('private_network');
    const pinned = answers[0];
    return await new Promise((resolve, reject) => {
      const client = u.protocol === 'https:' ? https : http;
      const request = client.get(u, {
        signal: activeSignal,
        family: 4, autoSelectFamily: false,
        lookup: (_host, opts, cb) => opts?.all ? cb(null,[{address:pinned,family:4}]) : cb(null,pinned,4),
        headers: { 'User-Agent': REQUEST_AGENT, 'Accept': 'text/html,text/plain;q=0.8,*/*;q=0.1',
          'Accept-Encoding': 'identity', 'Cookie': '', 'Connection':'close' },
      }, response => {
        const contentEncoding = String(response.headers['content-encoding'] || 'identity').toLowerCase();
        if (contentEncoding !== 'identity') { response.destroy(); reject(new Error('encoded_response')); return; }
        const chunks = []; let total = 0;
        response.on('data', chunk => {
          total += chunk.length;
          if (total > maxBytes) {response.destroy(new Error('response_too_large')); return;}
          chunks.push(chunk);
        });
        response.on('end', () => resolve({status:Number(response.statusCode), headers:response.headers,
          body:Buffer.concat(chunks).toString('utf8')}));
        response.on('error', reject);
      });
      request.on('error', reject);
    });
  }, {deadlineAt:Date.now()+timeoutMs, signal});
}

// RFC 9309: compare unreserved ASCII octets as literals and all literal
// non-ASCII characters as percent-encoded UTF-8. Encoded reserved ASCII such
// as %2F stays encoded so it cannot become a path delimiter.
function normalizeRobotsOctets(value, errorCode) {
  if (/%(?![0-9a-f]{2})/i.test(value)) throw new Error(errorCode);
  return value.replace(/%[0-9a-f]{2}|[^\x00-\x7f]/giu, token => {
    if (token[0] === '%') {
      const hex=token.slice(1), character=String.fromCharCode(parseInt(hex,16));
      return /^[a-z0-9._~-]$/i.test(character) ? character : `%${hex.toUpperCase()}`;
    }
    try { return encodeURIComponent(token).toUpperCase(); }
    catch { throw new Error(errorCode); }
  });
}

// Rules are compared by octet count, not the 3-character %XX representation.
function ruleOctetLength(value) {
  return value.replace(/[\*$]/g,'').replace(/%[0-9a-f]{2}/gi,'x').length;
}

// Bounded wildcard matching: avoid regex backtracking on untrusted robots files.
function matchesRule(value, path) {
  const anchored=value.endsWith('$');
  const pattern=(anchored?value.slice(0,-1):value)+(anchored?'':'*');
  let i=0,j=0,star=-1,retry=0;
  while(i<path.length) {
    if(j<pattern.length && pattern[j]!=='*' && pattern[j]===path[i]) {i++;j++;}
    else if(j<pattern.length && pattern[j]==='*') {star=j++;retry=i;}
    else if(star!==-1) {j=star+1;i=++retry;}
    else return false;
  }
  while(pattern[j]==='*')j++;
  return j===pattern.length;
}

/** Supports the essential RFC9309 subset used by this bounded crawler:
 * User-agent groups, Allow, Disallow, wildcard * and end anchor $. The longest
 * matching rule wins; Allow breaks ties. Conservative on malformed robots.
 */
export function robotsAllowed(raw, pathname, agent = ROBOTS_AGENT) {
  if (typeof raw !== 'string' || raw.length > 65_536) throw new Error('invalid_robots');
  if (!pathname.startsWith('/') || pathname.length > 2048) throw new Error('invalid_path');
  pathname=normalizeRobotsOctets(pathname,'invalid_path');
  const groups = [];
  let current = {agents:[],rules:[]};
  const save = () => {if (current.agents.length) groups.push(current); current={agents:[],rules:[]};};
  for (const rawLine of raw.split(/\r?\n/)) {
    const line = rawLine.split('#')[0].trim();
    if (!line) { if (current.rules.length) save(); continue; }
    const m = line.match(/^([a-z-]+)\s*:\s*(.*)$/i);
    if (!m) continue;
    const key = m[1].toLowerCase(), value=m[2].trim();
    if (key === 'user-agent') {
      if (current.rules.length) save();
      current.agents.push(value.toLowerCase());
    } else if ((key==='allow'||key==='disallow') && current.agents.length) {
      if (!value && key==='disallow') continue;
      if (!value.startsWith('/') || value.length > 200 || (value.match(/\*/g)||[]).length > 10 || groups.length > 100) throw new Error('invalid_robots');
      current.rules.push({allow:key==='allow', value:normalizeRobotsOctets(value,'invalid_robots')});
    }
  }
  save();
  if (groups.length > 100) throw new Error('invalid_robots');
  const lower=agent.toLowerCase();
  const specificity = g => Math.max(...g.agents.map(a=>a==='*'?0:(lower.includes(a)?a.length:-1)));
  const scored=groups.map(g=>({...g,specificity:specificity(g)})).filter(g=>g.specificity>=0);
  if (!scored.length) return true;
  const best=Math.max(...scored.map(g=>g.specificity));
  const rules=scored.filter(g=>g.specificity===best).flatMap(g=>g.rules);
  const matching=rules.filter(r=>matchesRule(r.value,pathname));
  if (!matching.length) return true;
  matching.sort((a,b)=>ruleOctetLength(b.value)-ruleOctetLength(a.value) || Number(b.allow)-Number(a.allow));
  return matching[0].allow;
}

export async function retrieveWithRedirects(url, transport=pinnedGet, {maxBytes=workerPolicy.maxBytes, timeoutMs=workerPolicy.timeoutMs, deadlineAt=Date.now()+45_000, beforeRequest}={}) {
  const initial=sourceURL(url);
  let current=initial.href;
  for (let redirects=0; redirects<=workerPolicy.maxRedirects; redirects++) {
    const remaining=deadlineAt-Date.now();
    if(remaining<=0) throw new Error('timeout');
    if (beforeRequest) beforeRequest(current);
    const result=await withDeadline(signal => transport(current,{maxBytes,timeoutMs:Math.min(timeoutMs,remaining),signal}),
      {deadlineAt:Math.min(deadlineAt,Date.now()+timeoutMs)});
    if ([301,302,303,307,308].includes(result.status)) {
      if (redirects===workerPolicy.maxRedirects) throw new Error('too_many_redirects');
      const location=result.headers?.location;
      if (typeof location!=='string') throw unsafeRedirect;
      let next; try {next=new URL(location,current).href;} catch {throw unsafeRedirect;}
      if (!sameOriginRedirect(initial.href,next)) throw unsafeRedirect;
      current=next;
      continue;
    }
    if (!Number.isInteger(result.status) || typeof result.body!=='string') throw new Error('malformed_response');
    if (Buffer.byteLength(result.body)>maxBytes) throw new Error('response_too_large');
    return {...result, finalURL:current};
  }
  throw new Error('too_many_redirects');
}

function decodedText(s){
  const named={amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' '};
  return s.replace(/&(#x[0-9a-f]+|#[0-9]+|amp|lt|gt|quot|apos|nbsp);/gi,(_,e)=> {
    const key=e.toLowerCase();
    if (key.startsWith('#')) {
      const cp=key.startsWith('#x')?parseInt(key.slice(2),16):parseInt(key.slice(1),10);
      return Number.isInteger(cp)&&cp>0&&cp<=0x10ffff?String.fromCodePoint(cp):' ';
    }
    return named[key]??' ';
  });
}
/** Conservative, bounded HTML text scanner. It stops on an unterminated tag
 * or suppressed element rather than repeatedly backtracking through the input.
 * It is not a browser DOM parser and its output remains untrusted. */
export function plainPage(raw){
  const text=String(raw), lower=text.toLowerCase(), hidden=new Set(['script','style','svg','noscript','template','head','form']);
  const out=[]; let pos=0, suppressed=null;
  const tagEnd = start => {
    let quote=null;
    for(let k=start;k<text.length;k++) {
      const ch=text[k];
      if(quote) { if(ch===quote)quote=null; }
      else if(ch==='"'||ch==="'")quote=ch;
      else if(ch==='>')return k;
    }
    return -1;
  };
  while(pos<text.length) {
    if(suppressed) {
      const candidate=lower.indexOf(`</${suppressed}`,pos);
      if(candidate<0)break;
      const following=lower[candidate+suppressed.length+2];
      if(following && !/[\s/>]/.test(following)) {pos=candidate+2;continue;}
      const end=tagEnd(candidate+2);
      if(end<0)break;
      pos=end+1;suppressed=null;out.push(' ');continue;
    }
    const start=text.indexOf('<',pos);
    if(start<0){out.push(text.slice(pos));break;}
    out.push(text.slice(pos,start));
    if(text.startsWith('<!--',start)) {
      const end=text.indexOf('-->',start+4);
      if(end<0)break;
      pos=end+3;out.push(' ');continue;
    }
    const end=tagEnd(start+1);
    if(end<0)break;
    const tag=text.slice(start+1,end).match(/^\s*(\/?)\s*([a-z][a-z0-9:-]*)/i);
    if(tag && !tag[1] && hidden.has(tag[2].toLowerCase())) suppressed=tag[2].toLowerCase();
    pos=end+1;out.push(' ');
  }
  return decodedText(out.join('').replace(/\s+/g,' ').trim());
}

export async function extractPublicEvidence(rawUrl,{transport=pinnedGet,now=()=>new Date(),deadlineMs=45_000}={}){
  const target=sourceURL(rawUrl);
  const robotsURL=`${target.origin}/robots.txt`;
  // Whole-job upper bound, including robots redirects AND target redirects.
  const deadlineAt=Date.now()+deadlineMs;
  let robots;
  try {robots=await retrieveWithRedirects(robotsURL,transport,{maxBytes:65_536,deadlineAt});}
  catch (error) {
    // Never downgrade a confirmed policy/security denial to a transient error.
    // That would waste retries on private destinations and unsafe redirects.
    if (['private_network','blocked_host','blocked_port','invalid_source_url',
      'unsafe_redirect','too_many_redirects'].includes(error?.message)) throw error;
    throw new Error('robots_unavailable');
  }
  if (robots.status===404 || robots.status===410) {
    // RFC9309 unavailable robots file: no restriction from robots for this origin.
  } else if (robots.status===200) {
    if (!robotsAllowed(robots.body, target.pathname+target.search)) throw new Error('robots_denied');
  } else {throw new Error('robots_unavailable');}
  const page=await retrieveWithRedirects(target.href,transport,{deadlineAt,beforeRequest:url => {
    const next=new URL(url);
    if (robots.status===200 && !robotsAllowed(robots.body,next.pathname+next.search)) throw new Error('robots_denied');
  }});
  if (page.status!==200) throw new Error(`http_${page.status}`);
  const contentType=String(page.headers?.['content-type']||'').toLowerCase();
  if (!/^(text\/html|text\/plain)(;|$)/.test(contentType)) throw new Error('unsupported_content_type');
  // Extra conservative: robots rules must also allow the final redirected path.
  if (robots.status===200 && !robotsAllowed(robots.body,new URL(page.finalURL).pathname+new URL(page.finalURL).search)) throw new Error('robots_denied');
  const plain=plainPage(page.body);
  if (!plain) throw new Error('empty_page');
  const excerpt=redactEvidence(plain,{truncate:true});
  return {source_url:page.finalURL,content_hash:createHash('sha256').update(plain.slice(0,30_000)).digest('hex'),
    excerpt,observed_at:now().toISOString()};
}

import test from 'node:test';
import assert from 'node:assert/strict';
import {processResearchBatch, failureCode} from './gate1-runner.mjs';
const u='https://tea.example.com/menu';
const claim={id:'a',kind:'source_extract',status:'claimed',claim_token:'private-token',prospect_id:'p',requested_version:4};
const transport=async url=>url.endsWith('/robots.txt')?{status:404,headers:{},body:''}:{status:200,headers:{'content-type':'text/html'},body:'<p>Hoang Long tea wholesale</p>'};
function repo(prospect={status:'research',version:4,source_url:u},claims=[claim]){const log=[];return {log,claimResearch:async args=>{log.push(['claim',args]);return claims;},getProspect:async id=>{log.push(['get',id]);return prospect;},completeResearch:async args=>{log.push(['complete',args]);return 'observation-id';},failResearch:async args=>{log.push(['fail',args]);return 'dead_letter';}}}
test('success preserves private claim token in server API only',async()=>{const r=repo();const result=await processResearchBatch(r,{transport});assert.deepEqual(result,[{job_id:'a',result:'succeeded'}]);assert.equal(r.log.filter(x=>x[0]==='complete').length,1);assert.equal(r.log[2][1].claimToken,'private-token');});
test('suppressed prospect cannot be fetched',async()=>{const r=repo({status:'do_not_contact',version:4,source_url:u});const o=await processResearchBatch(r,{transport});assert.equal(o[0].result,'dead_letter');assert.equal(o[0].error_code,'policy_blocked');assert.equal(r.log.some(e=>e[0]==='complete'),false);});
test('stale prospect cannot be fetched',async()=>{const r=repo({status:'research',version:5,source_url:u});const o=await processResearchBatch(r,{transport});assert.equal(o[0].result,'dead_letter');assert.equal(r.log.some(e=>e[0]==='complete'),false);});
test('invalid claims fail safely',async()=>{const r=repo(undefined,[{...claim,kind:'media_render'}]);await assert.rejects(()=>processResearchBatch(r,{transport}),/unsafe_claim/)});
test('bounded claim sizes required',async()=>await assert.rejects(()=>processResearchBatch(repo(),{limit:99}),/invalid_worker_settings/));
test('missing repo interface rejected',async()=>await assert.rejects(()=>processResearchBatch({},{}),/invalid_repository/));
test('irrecoverable failure reports terminal result',async()=>{const r=repo();const bad=async url=>{if(url.endsWith('/robots.txt'))return{status:200,headers:{},body:'User-agent: *\nDisallow: /'};throw new Error('network_failure')}; const out=await processResearchBatch(r,{transport:bad});assert.equal(out[0].error_code,'robots_denied');});
test('stale worker claim failure is marked unknown, never retried immediately',async()=>{const r=repo();r.completeResearch=async()=>{throw new Error('expired_claim')};r.failResearch=async()=>{throw new Error('invalid_claim_token')};const out=await processResearchBatch(r,{transport});assert.equal(out[0].result,'unknown');assert.equal(r.log.filter(x=>x[0]==='complete').length,0);});
test('failure code maps HTTP errors to bounded value',()=>assert.equal(failureCode(new Error('http_404')),'http_error'));
test('redirected evidence never completes under the saved original URL',async()=>{
 const r=repo();
 const calls=[];
 const redirect=async url=>{calls.push(url);return url.endsWith('/robots.txt')?{status:404,headers:{},body:''}:
  url.endsWith('/menu')?{status:302,headers:{location:'/about'},body:''}:
  {status:200,headers:{'content-type':'text/html'},body:'Tea wholesale'};};
 const result=await processResearchBatch(r,{transport:redirect});
 assert.deepEqual(calls,['https://tea.example.com/robots.txt','https://tea.example.com/menu']);
 assert.equal(r.log.some(e=>e[0]==='complete'),false);
 assert.equal(r.log.find(e=>e[0]==='fail')[1].code,'policy_blocked');
 assert.deepEqual(result,[{job_id:'a',result:'dead_letter',error_code:'policy_blocked'}]);
});
test('canonicalized URL mismatch also fails closed rather than attributing incorrectly',async()=>{
 const r=repo({status:'research',version:4,source_url:'https://tea.example.com'});
 const out=await processResearchBatch(r,{transport});
 assert.equal(out[0].error_code,'policy_blocked');
 assert.equal(r.log.some(e=>e[0]==='complete'),false);
});
test('blocking page redirects does not disable same-origin robots redirects',async()=>{
 const r=repo();const calls=[];
 const t=async url=>{calls.push(url);
  if(url.endsWith('/robots.txt'))return {status:302,headers:{location:'/rules.txt'},body:''};
  if(url.endsWith('/rules.txt'))return {status:200,headers:{},body:'User-agent: *\nAllow: /'};
  return {status:200,headers:{'content-type':'text/plain'},body:'Tea wholesale'};
 };
 const result=await processResearchBatch(r,{transport:t});
 assert.equal(result[0].result,'succeeded');
 assert.deepEqual(calls,['https://tea.example.com/robots.txt','https://tea.example.com/rules.txt','https://tea.example.com/menu']);
});

/** Gate-1 route-independent operations. Pure validation + explicit injected adapters.
 * No service-role client in user actions; never sends messages or edits prospects.
 * Designed for Codex to adapt to the existing Next.js/Supabase helpers.
 */
import {randomUUID, createHash} from 'node:crypto';

const uuidRE=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const hexRE=/^[a-f0-9]{64}$/;
const safeText=(x)=>typeof x==='string'&&x.trim()===x&&!/[\u0000-\u001f\u007f]/.test(x);
export const isUUID=(x)=>typeof x==='string'&&uuidRE.test(x);

export class PublicError extends Error{
  constructor(status,code){super(code);this.status=status;this.code=code;}
}
function fail(status,code){throw new PublicError(status,code);}
function objectShape(input,required,optional=[]){
  if(!input||typeof input!=='object'||Array.isArray(input))fail(400,'invalid_input');
  const permitted=new Set([...required,...optional]);
  if(required.some(k=>!Object.hasOwn(input,k))||Object.keys(input).some(k=>!permitted.has(k)))fail(400,'invalid_input');
}
export function validateResearch(body){
  objectShape(body,['prospect_id','expected_version','idempotency_key']);
  if(!isUUID(body.prospect_id)||!Number.isSafeInteger(body.expected_version)||body.expected_version<1||
      typeof body.idempotency_key!=='string'||!hexRE.test(body.idempotency_key))fail(400,'invalid_input');
  return body;
}
export function validateReview(body){
  objectShape(body,['expected_version','decision'],['note']);
  if(!Number.isSafeInteger(body.expected_version)||body.expected_version<1||
   !['approved','rejected'].includes(body.decision)||
   !safeText(body.note??'')||(body.note??'').length>1200)fail(400,'invalid_input');
  return {...body,note:body.note??''};
}
export function validateWatch(body){
  objectShape(body,['prospect_id','reason']);
  if(!isUUID(body.prospect_id)||!safeText(body.reason)||body.reason.length<3||body.reason.length>300)fail(400,'invalid_input');
  return body;
}
// PostgREST emits timestamptz with Z or explicit UTC offset. Keep the exact
// original microseconds and offset when passing the checkpoint to PostgreSQL;
// Date conversions truncate microseconds and would skip or repeat rows.
function isSafeTimestamp(value){
  if(typeof value!=='string')return false;
  const match=/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,6}))?(Z|[+-]\d{2}:\d{2})$/.exec(value);
  if(!match)return false;
  const [,ys,ms,ds,hs,mins,ss,,zone]=match;
  const y=Number(ys),m=Number(ms),d=Number(ds),h=Number(hs),min=Number(mins),sec=Number(ss);
  if(y<1 || m<1 || m>12 || h>23 || min>59 || sec>59)return false;
  const leap=y%4===0 && (y%100!==0 || y%400===0);
  const days=[31,leap?29:28,31,30,31,30,31,31,30,31,30,31];
  if(d<1 || d>days[m-1])return false;
  if(zone!=='Z'){
    const zh=Number(zone.slice(1,3)), zm=Number(zone.slice(4,6));
    if(zh>14 || zm>59 || (zh===14 && zm!==0))return false;
  }
  return true;
}

export function validateJobQuery({limit='20',status, cursor}={}){
  const n=Number(limit);
  if(!/^\d+$/.test(String(limit))||!Number.isInteger(n)||n<1||n>50)fail(400,'invalid_limit');
  if(status!==undefined&&!['pending','claimed','succeeded','failed','canceled','dead_letter'].includes(status))fail(400,'invalid_status');
  let checkpoint=null;
  if(cursor!==undefined){
    if(typeof cursor!=='string'||cursor.length>200||!/^[A-Za-z0-9_-]+$/.test(cursor))fail(400,'invalid_cursor');
    try{
      const parsed=JSON.parse(Buffer.from(cursor,'base64url').toString('utf8'));
      if(!Array.isArray(parsed)||parsed.length!==2||typeof parsed[0]!=='string'||!isUUID(parsed[1])||
         !isSafeTimestamp(parsed[0]))fail(400,'invalid_cursor');
      checkpoint={created_at:parsed[0],id:parsed[1]};
    } catch {fail(400,'invalid_cursor');}
  }
  return {limit:n,status,checkpoint};
}
export function makeJobCursor(row){
  if(!isUUID(row?.id)||!isSafeTimestamp(row.created_at))throw new Error('invalid_job_cursor');
  return Buffer.from(JSON.stringify([row.created_at,row.id])).toString('base64url');
}
export function safeJob(row){
  if(!row||!isUUID(row.id))throw new Error('invalid_job_row');
  // Always project explicit keys, even if the upstream query changes.
  const fields=['id','kind','prospect_id','requested_version','correlation_id','status',
    'attempt_count','next_attempt_at','error_code','created_at','updated_at'];
  return Object.fromEntries(fields.filter(k=>Object.hasOwn(row,k)).map(k=>[k,row[k]]));
}
export function safeObservation(row){
  if(!row||!isUUID(row.id))throw new Error('invalid_observation_row');
  const fields=['id','job_id','prospect_id','source_url','content_hash','excerpt','observed_at',
  'decision','version','reviewed_at','review_note','created_at'];
  return Object.fromEntries(fields.filter(k=>Object.hasOwn(row,k)).map(k=>[k,row[k]]));
}
export function mapRPCError(error){
  const reason=String(error?.message||'');
  // Omit detailed internal error strings from response; stable bounded codes only.
  const rules=[
    [/manager_required/,403,'forbidden'],
    [/intel_daily_limit/,429,'daily_limit'],
    [/stale_prospect|stale_observation|stale_observation_source|idempotency_conflict/,409,'conflict'],
    [/prospect_suppressed/,409,'prospect_suppressed'],
    [/job_already_claimed|job_terminal/,409,'job_not_cancelable'],
    [/job_not_found/,404,'job_not_found'],
    [/invalid_idempotency_key|invalid_expected_version|invalid_review|invalid_reason/,400,'invalid_input']
  ];
  const match=rules.find(([pattern])=>pattern.test(reason));
  return match?new PublicError(match[1],match[2]):new PublicError(503,'service_unavailable');
}
function ensureManager(ctx){
  if(!ctx||!['admin','manager'].includes(ctx.role)||!isUUID(ctx.userId))fail(403,'forbidden');
  // Manager JWT scoped RPC client, NEVER service key for user actions.
  if(typeof ctx.scopedRPC!=='function')fail(503,'service_unavailable');
}
function enabled(ctx,flag){if(ctx?.flags?.[flag]!==true)fail(503,'feature_disabled');}
async function rpc(ctx,name,args){
  try{const response=await ctx.scopedRPC(name,args);
      if(response?.error)throw response.error;
      return response?.data;
  }catch(err){throw mapRPCError(err);}
}
export async function requestResearch(ctx,body){
  enabled(ctx,'research');ensureManager(ctx);validateResearch(body);
  const data=await rpc(ctx,'request_hl_intel_research',{
    p_prospect_id:body.prospect_id,p_expected_version:body.expected_version,p_idempotency_key:body.idempotency_key});
  const row=Array.isArray(data)?data[0]:data;
  if(!isUUID(row?.job_id)||typeof row.job_status!=='string'||typeof row.reused!=='boolean')fail(503,'service_unavailable');
  return {status:202,body:{job_id:row.job_id,status:row.job_status,reused:row.reused}};
}
export async function reviewObservation(ctx,id,body){
  enabled(ctx,'review');ensureManager(ctx);
  if(!isUUID(id))fail(400,'invalid_observation_id');
  const v=validateReview(body);
  const data=await rpc(ctx,'review_hl_intel_observation',{
    p_observation_id:id,p_expected_version:v.expected_version,p_decision:v.decision,p_note:v.note});
  return {status:200,body:{observation:safeObservation(data)}};
}
export async function proposeWatch(ctx,body){
  enabled(ctx,'watches');ensureManager(ctx);validateWatch(body);
  const data=await rpc(ctx,'propose_hl_intel_watch',{p_prospect_id:body.prospect_id,p_reason:body.reason});
  if(!isUUID(data?.id)||data.enabled!==false)fail(503,'service_unavailable');
  return {status:201,body:{watch:{id:data.id,prospect_id:data.prospect_id,source_url:data.source_url,
    reason:data.reason,enabled:false}}};
}
/** Creates a fresh per-click idempotency key. Do not derive from contact details. */
export function newResearchKey(){return createHash('sha256').update(randomUUID()).digest('hex');}

/** The repository adapter must enforce keyset ordering (created_at DESC,id DESC),
 * apply manager RLS or manager authorization, and only return bounded rows.
 */
export async function listJobs(ctx,query={}){
  enabled(ctx,'research');ensureManager(ctx);
  const options=validateJobQuery(query);
  if(typeof ctx.listManagerJobs!=='function')fail(503,'service_unavailable');
  let rows;
  try{rows=await ctx.listManagerJobs({...options,fetchLimit:options.limit+1});}
  catch{fail(503,'service_unavailable');}
  if(!Array.isArray(rows)||rows.length>options.limit+1)fail(503,'service_unavailable');
  const page=rows.slice(0,options.limit);
  return {status:200,body:{jobs:page.map(safeJob),next_cursor:rows.length>options.limit?
     makeJobCursor(page.at(-1)):null}};
}
/** Aggregate counts, never project raw contact/person/site fields into charts. */
export async function getSummary(ctx){
  enabled(ctx,'research');ensureManager(ctx);
  if(typeof ctx.getManagerSummary!=='function')fail(503,'service_unavailable');
  let data;try{data=await ctx.getManagerSummary();}catch{fail(503,'service_unavailable');}
  const fields=['pending','claimed','succeeded','failed','canceled','dead_letter','observations_pending'];
  if(!data||fields.some(k=>!Number.isSafeInteger(data[k])||data[k]<0))fail(503,'service_unavailable');
  return {status:200,body:{counts:Object.fromEntries(fields.map(k=>[k,data[k]]))}};
}

/** Cancel only an unclaimed job owned by the manager (DB independently checks).
 * Stale/claimed/finished jobs are not force-canceled by the public API.
 */
export async function cancelResearch(ctx,jobId){
  enabled(ctx,'research');ensureManager(ctx);
  if(!isUUID(jobId))fail(400,'invalid_job_id');
  const data=await rpc(ctx,'cancel_hl_intel_research',{p_job_id:jobId});
  const row=Array.isArray(data)?data[0]:data;
  if(!isUUID(row?.job_id)||row.job_status!=='canceled'||typeof row.canceled!=='boolean')
    fail(503,'service_unavailable');
  return {status:200,body:{job_id:row.job_id,status:row.job_status,canceled:row.canceled}};
}

/** RLS-scoped, bounded evidence list for one saved prospect. The supplied
 * adapter must query as the verified manager JWT; this pure function does not
 * implement or prove row-level security. */
export async function listObservations(ctx,{prospect_id,limit='20'}={}){
  enabled(ctx,'research');ensureManager(ctx);
  if (!isUUID(prospect_id)) fail(400,'invalid_input');
  const n=Number(limit);
  if(!/^\d+$/.test(String(limit))||!Number.isInteger(n)||n<1||n>50)fail(400,'invalid_limit');
  if(typeof ctx.listManagerObservations!=='function')fail(503,'service_unavailable');
  let rows;try{rows=await ctx.listManagerObservations({prospectId:prospect_id,limit:n});}
  catch{fail(503,'service_unavailable');}
  if(!Array.isArray(rows)||rows.length>n||rows.some(row=>row.prospect_id!==prospect_id))fail(503,'service_unavailable');
  return {status:200,body:{observations:rows.map(safeObservation)}};
}

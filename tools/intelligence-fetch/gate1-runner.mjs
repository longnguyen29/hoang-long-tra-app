/** Gate-1 worker interface. No production credentials or network calls here.
 * Concrete repository implementation belongs inside authenticated server code.
 */
import {extractPublicEvidence} from './safe-public-fetch.mjs';
import {canResearch} from './research-gate.mjs';

const VALID_FAILURE_CODES = new Set(['robots_denied','robots_unavailable','private_network',
 'policy_blocked','timeout','unsafe_redirect','too_many_redirects','response_too_large',
 'unsupported_content_type','empty_page','malformed_response','encoded_response',
 'dns_failure','network_failure','invalid_source_url','blocked_host','blocked_port','http_error']);
export function failureCode(error) {
 const msg=String(error?.message||'network_failure');
 return VALID_FAILURE_CODES.has(msg)?msg:/^http_\d{3}$/.test(msg)?'http_error':
    /^(EAI_|ENOTFOUND|ENET|ECONN|EHOST)/.test(msg)?'network_failure':'policy_blocked';
}

/** repo must implement claimResearch, getProspect, completeResearch, failResearch.
 * All are server-side only; in particular claim_token is never returned to UI.
 */
export async function processResearchBatch(repo,{transport,now,workerId='hl-intel-worker',limit=3}={}){
 if (!repo || !['claimResearch','getProspect','completeResearch','failResearch'].every(k=>typeof repo[k]==='function'))
   throw new Error('invalid_repository');
 if (!/^[a-z0-9_-]{1,80}$/.test(workerId)||!Number.isInteger(limit)||limit<1||limit>3)throw new Error('invalid_worker_settings');
 const claims=await repo.claimResearch({workerId,limit});
 if (!Array.isArray(claims)||claims.length>limit)throw new Error('invalid_claim_result');
 const results=[];
 for(const job of claims){
   if(job.kind!=='source_extract'||job.status!=='claimed'||!job.claim_token||!job.prospect_id){
     throw new Error('unsafe_claim');
   }
   try{
     const prospect=await repo.getProspect(job.prospect_id);
     const eligibility=canResearch({status:prospect?.status,version:prospect?.version,
       expectedVersion:job.requested_version,sourceUrl:prospect?.source_url});
     if(!eligibility.allowed) throw new Error(eligibility.reason);
     const evidence=await extractPublicEvidence(prospect.source_url,{transport,now,allowPageRedirects:false});
     // Gate 0 SQL can persist only the saved URL. Reject changed destinations
     // before completion so a redirected page is never misattributed. Exact
     // string comparison intentionally fails closed on canonicalization too.
     if (evidence.source_url !== prospect.source_url) throw new Error('policy_blocked');
     const saved=await repo.completeResearch({jobId:job.id,claimToken:job.claim_token,
       sha256:evidence.content_hash,excerpt:evidence.excerpt});
     results.push({job_id:job.id,result:saved?'succeeded':'canceled'});
   }catch(err){
     // Some transient lease changes can cause failResearch to reject; do not
     // retry here with a stale claim. Preserve both error codes for operators.
     const code=failureCode(err);
     try{const status=await repo.failResearch({jobId:job.id,claimToken:job.claim_token,code});
       results.push({job_id:job.id,result:status,error_code:code});
     }catch(failErr){results.push({job_id:job.id,result:'unknown',error_code:code,
       settlement_error:failureCode(failErr)});}
   }
 }
 return results;
}

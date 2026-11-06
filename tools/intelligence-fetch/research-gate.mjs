/** Pure safeguards for the Gate-1 source-extract worker. No HTTP requests here.
 * The real fetcher MUST additionally pin DNS to a public IPv4, enforce robots,
 * bound bytes/time/redirects, and reject credentialed/private URLs at EVERY hop.
 */
import { createHash } from 'node:crypto';
import { isIP } from 'node:net';

const deniedHosts = new Set(['localhost','metadata.google.internal','instance-data','host.docker.internal']);
export function isPublicIPv4(address) {
  if (isIP(address) !== 4) return false;
  const a = address.split('.').map(Number), [x,y,z] = a;
  if (x === 0 || x === 10 || x === 127 || x >= 224 || x === 255) return false;
  if (x === 169 && y === 254) return false;
  if (x === 172 && y >= 16 && y <= 31) return false;
  if (x === 192 && (y === 168 || y === 0 || (y === 88 && z === 99))) return false;
  if (x === 100 && y >= 64 && y <= 127) return false;
  if (x === 198 && (y === 18 || y === 19)) return false;
  if (x === 192 && y === 0 && z === 2) return false;
  if (x === 198 && y === 51 && z === 100) return false;
  if (x === 203 && y === 0 && z === 113) return false;
  return true;
}
export function sourceURL(raw) {
  if (typeof raw !== 'string' || raw.length > 2000 || raw.trim() !== raw) throw new Error('invalid_source_url');
  let u; try { u = new URL(raw); } catch { throw new Error('invalid_source_url'); }
  if (!['http:', 'https:'].includes(u.protocol) || u.username || u.password || u.hash) throw new Error('invalid_source_url');
  const h = u.hostname.toLowerCase().replace(/\.$/, '');
  if (deniedHosts.has(h) || h.endsWith('.local') || h.endsWith('.internal') || !h.includes('.')) throw new Error('blocked_host');
  if (isIP(h) === 6 || (isIP(h) === 4 && !isPublicIPv4(h))) throw new Error('blocked_host');
  if (u.port && !((u.protocol === 'https:' && u.port === '443') || (u.protocol === 'http:' && u.port === '80'))) throw new Error('blocked_port');
  return u;
}
export function sameOriginRedirect(original, next) {
  const a = sourceURL(original), b = sourceURL(next);
  return a.origin === b.origin;
}
export function researchKey({prospectId, version, actorId}) {
  if (!/^[0-9a-f-]{36}$/i.test(prospectId || '') || !Number.isInteger(version) || version < 1 || !actorId) throw new Error('invalid_work_identity');
  return createHash('sha256').update(`source_extract|${prospectId.toLowerCase()}|${version}|${actorId}`).digest('hex');
}
export function redactEvidence(value, {truncate = false} = {}) {
  const text=String(value||'').replace(/<[^>]*>/g,' ').replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,'[email]')
    .replace(/(?:\+?84|0)(?:[\s().-]*\d){9,10}\b/g,'[phone]')
    .replace(/\b(?:sk|pk)_[A-Za-z0-9_-]{12,}\b/g,'[redacted]').replace(/\s+/g,' ').trim();
  if (!text || (!truncate && text.length>500)) throw new Error('invalid_excerpt');
  return truncate ? text.slice(0,500).trimEnd() : text;
}
export const workerPolicy = Object.freeze({
  allowedKinds: ['source_extract'], maxBytes: 512_000, timeoutMs: 15_000,
  maxSourcePages: 3, maxRedirects: 2, maxAttempts: 4, maxJobsPerClaim: 3,
  preventThirdPartyCookies: true, allowBrowserAgent: false,
  allowAuthentication: false, allowForms: false, allowOutboundMessages: false,
});
export function canResearch({status, version, expectedVersion, sourceUrl}) {
  if (['do_not_contact','not_fit'].includes(status)) return {allowed:false,reason:'prospect_suppressed'};
  if (!Number.isInteger(version) || version!==expectedVersion) return {allowed:false,reason:'stale_prospect'};
  try { sourceURL(sourceUrl); return {allowed:true}; } catch(e) {return {allowed:false,reason:e.message};}
}
export function nextStatus({state, attemptCount, failureCode}) {
  if (state!=='claimed' || !Number.isInteger(attemptCount) || attemptCount<1) throw new Error('illegal_job_transition');
  if (['robots_denied','private_network','policy_blocked'].includes(failureCode) || attemptCount>=4) return 'dead_letter';
  return 'failed';
}

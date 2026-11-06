/** Offline idempotency lifecycle prototype; storage must be session-scoped and
 * contain no JWT or contact data. Caller only clears on known terminal outcome
 * or intentional new research, never on a timeout or uncertain network error. */
import {createHash,randomUUID} from 'node:crypto';
import {isUUID} from './core.mjs';
const keyFor = (actorId,prospectId,version) => {
  if(!isUUID(actorId)||!isUUID(prospectId)||!Number.isSafeInteger(version)||version<1) throw new Error('invalid_attempt');
  return `hl-intel:attempt:${actorId}:${prospectId}:${version}`;
};
export function getOrCreateAttempt(storage, {actorId,prospectId,version}, makeId=randomUUID){
  const slot=keyFor(actorId,prospectId,version);
  const existing=storage.getItem(slot);
  if(existing && /^[a-f0-9]{64}$/.test(existing)) return existing;
  const key=createHash('sha256').update(makeId()).digest('hex');
  // Storage failures propagate: caller must not silently use a key it cannot retry.
  storage.setItem(slot,key);
  return key;
}
export function clearAttempt(storage,{actorId,prospectId,version}){
  storage.removeItem(keyFor(actorId,prospectId,version));
}

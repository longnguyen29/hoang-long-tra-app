/**
 * Offline-only facade around pure V6 API operations. Injected authentication and
 * JWT-scoped data clients are NOT implemented here; this is not a Next route.
 * Do not wire into production until staging JWT/RLS and adapter review pass.
 */
import * as core from './core.mjs';

const ACTION_FLAGS = Object.freeze({
  request:'research', cancel:'research', jobs:'research', observations:'research', review:'review',
});
const reply = (status,error) => ({status,body:{error}});

export function createManagerApi({flags={},authenticate,createScopedClient}={}) {
  return async function execute({action,authorization,body,params={}}={}) {
    if(!Object.hasOwn(ACTION_FLAGS,action)) return reply(404,'not_found');
    if(flags.research!==true || flags[ACTION_FLAGS[action]]!==true) return reply(503,'feature_disabled');
    if(typeof authorization!=='string' || !/^Bearer [^\s]+$/.test(authorization)) return reply(401,'unauthorized');
    if(typeof authenticate!=='function' || typeof createScopedClient!=='function') return reply(503,'service_unavailable');
    const jwt=authorization.slice(7);
    let identity;
    try {identity=await authenticate(jwt);} catch {return reply(401,'unauthorized');}
    const userId=identity?.userId ?? identity?.user?.id;
    if(!core.isUUID(userId)) return reply(401,'unauthorized');
    if(!['admin','manager'].includes(identity.role)) return reply(403,'forbidden');
    let client;
    try {client=await createScopedClient(jwt);} catch {return reply(503,'service_unavailable');}
    if(!client || typeof client.rpc!=='function') return reply(503,'service_unavailable');
    const ctx={role:identity.role,userId,flags,scopedRPC:(...args)=>client.rpc(...args),
      listManagerJobs: options => client.listJobs(options),
      listManagerObservations: options => client.listObservations(options)};
    try {
      switch(action){
        case 'request': return await core.requestResearch(ctx,body);
        case 'cancel': return await core.cancelResearch(ctx,params.job_id);
        case 'review': return await core.reviewObservation(ctx,params.observation_id,body);
        case 'jobs': return await core.listJobs(ctx,params);
        case 'observations': return await core.listObservations(ctx,params);
      }
    } catch(error) {
      if(error instanceof core.PublicError) return reply(error.status,error.code);
      return reply(503,'service_unavailable');
    }
    return reply(404,'not_found');
  };
}

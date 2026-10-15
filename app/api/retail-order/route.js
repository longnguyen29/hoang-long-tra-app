import {createHash} from 'node:crypto';
import { loadRetailProducts, retailPublicClient } from '@/lib/retail-catalog-server';
import { prepareRetailCheckout, validateRetailCheckout } from '@/lib/retail-checkout';
import { normalizeRetailPartnerCheckout } from '@/lib/retail-partner';
import { createAdminClient } from '@/lib/supabase/admin';
import { partnerNetworkEnabled } from '@/lib/partner-network-server';
const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
const failure = error => {
 const message=error?.message||'';
 const code=['out_of_stock','price_changed','cart_changed','checkout_retry_conflict','retail_partner_unavailable','partner_consent_required','invalid_partner_contact','invalid_checkout'].find(value=>message.includes(value))||'order_unavailable';
 return Response.json({error:code},{status:code==='order_unavailable'?503:['invalid_checkout','partner_consent_required','invalid_partner_contact'].includes(code)?400:409,headers});
};
export async function POST(request) {
 const origin = request.headers.get('origin');
 if (origin && origin !== new URL(request.url).origin) return Response.json({ error: 'invalid_origin' }, { status: 403,headers });
 try {
  const body = await request.text();
  if (body.length > 20000) return Response.json({ error: 'invalid_checkout' }, { status: 400,headers });
  const payload = JSON.parse(body);
  const {cart,customer,expectedTotal}=validateRetailCheckout(payload);
  const {requestId,partner}=normalizeRetailPartnerCheckout(payload);
  if(partner && !partnerNetworkEnabled())return failure(new Error('retail_partner_unavailable'));
  const fingerprint=createHash('sha256').update(JSON.stringify({cart,customer,expectedTotal,expectedLines:payload.expectedLines,partner})).digest('hex');
  const admin=createAdminClient();
  const stored=await admin.rpc('partner_network_retail_receipt',{p_request_id:requestId,p_fingerprint:fingerprint});
  if(stored.error)return failure(stored.error);
  if(stored.data?.orderId)return Response.json({orderId:stored.data.orderId,total:stored.data.total},{headers});
  // Rebuild catalogue prices, units and existing volume benefits. The transaction
  // repeats this validation under stock locks; referral values never set prices.
  const client = retailPublicClient();
  const products = await loadRetailProducts(client);
  const {lines,total,count}=prepareRetailCheckout(payload,products);
  const {data,error}=await admin.rpc('submit_partner_retail_order',{
   p_request_id:requestId,p_fingerprint:fingerprint,p_partner:partner,
   p_input:{name:customer.name,contact:customer.contact,address:customer.address,tax:customer.tax,note:customer.note,lines,total_items:count,total,payment:customer.payment},
  });
  if(error||!data?.orderId)return failure(error);
  return Response.json({orderId:data.orderId,total:data.total},{headers});
 }catch(error){return failure(error instanceof SyntaxError?new Error('invalid_checkout'):error);}
}

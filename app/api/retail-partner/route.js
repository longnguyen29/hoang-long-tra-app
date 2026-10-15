import { createClient } from '@/lib/supabase/server';
import { partnerNetworkEnabled } from '@/lib/partner-network-server';
import { isPartnerSalesPageSlug } from '@/lib/partner-sales-page';
import { publicRetailPartner } from '@/lib/retail-partner';
export const dynamic='force-dynamic';
export async function GET(request){
 const slug=new URL(request.url).searchParams.get('ref');
 if(!partnerNetworkEnabled() || !isPartnerSalesPageSlug(slug))return Response.json({error:'partner_unavailable'},{status:404,headers:{'Cache-Control':'no-store'}});
 try{
  const client=await createClient(); const {data,error}=await client.rpc('partner_network_public_retail_partner',{p_slug:slug});
  const partner=!error&&publicRetailPartner(data);
  return Response.json(partner?{partner}:{error:'partner_unavailable'},{status:partner?200:404,headers:{'Cache-Control':'no-store'}});
 }catch{return Response.json({error:'partner_unavailable'},{status:503,headers:{'Cache-Control':'no-store'}});}
}

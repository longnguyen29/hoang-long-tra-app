import 'server-only';
import {cache} from 'react';
import {createClient} from '@/lib/supabase/server';
import {partnerNetworkEnabled} from '@/lib/partner-network-server';
import {isPartnerSalesPageSlug} from '@/lib/partner-sales-page';
import {publicRetailPartner} from '@/lib/retail-partner';
export const getRetailPartner=cache(async slug=>{
 if(!partnerNetworkEnabled()||!isPartnerSalesPageSlug(slug))return null;
 const client=await createClient();const {data,error}=await client.rpc('partner_network_public_retail_partner',{p_slug:slug});
 return error?null:publicRetailPartner(data);
});

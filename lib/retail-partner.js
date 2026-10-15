import { isPartnerSalesPageSlug } from './partner-sales-page.js';
export const RETAIL_PARTNER_STORAGE_KEY = 'hl-retail-partner-v1';
export const RETAIL_CHECKOUT_REQUEST_KEY = 'hl-retail-checkout-request-v1';
export const retailRequestIdValid = value => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
export function publicRetailPartner(value) {
 if (!value || !isPartnerSalesPageSlug(value.slug) || typeof value.display_name !== 'string' || !value.display_name.trim() || value.display_name.length>100
  || typeof value.phone!=='string' || value.phone.length<8 || value.phone.length>40 || !/^[+0-9 ().-]+$/.test(value.phone)
  || typeof value.region!=='string' || value.region.length>160 || !Number.isInteger(value.revision) || value.revision<1) return null;
 return {slug:value.slug,display_name:value.display_name,phone:value.phone,region:value.region,revision:value.revision};
}
export function normalizeRetailPartnerCheckout(payload) {
 if (!retailRequestIdValid(payload?.requestId)) throw new Error('invalid_checkout');
 if (['partner_id','partnerId','commission','partnerCode','approved'].some(key=>Object.hasOwn(payload,key))) throw new Error('invalid_checkout');
 if (payload.partner===undefined || payload.partner===null) return {requestId:payload.requestId,partner:null};
 const page=payload.partner;
 if (typeof page!=='object' || Array.isArray(page) || Object.keys(page).some(key=>!['slug','revision','consent'].includes(key))
  || !isPartnerSalesPageSlug(page.slug) || !Number.isInteger(page.revision) || page.revision<1 || page.revision>2147483647) throw new Error('invalid_checkout');
 if(page.consent!==true) throw new Error('partner_consent_required');
 return {requestId:payload.requestId,partner:{slug:page.slug,revision:page.revision,consent:true}};
}
export function retailPartnerShareHref(page) {
 return page?.published===true && isPartnerSalesPageSlug(page.slug) ? `/gioi-thieu/${encodeURIComponent(page.slug)}` : null;
}

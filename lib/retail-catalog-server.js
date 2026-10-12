import { cache } from 'react';
import { createClient } from '@supabase/supabase-js';
import { RETAIL_PRODUCT_FIELDS, RETAIL_VARIANT_FIELDS } from './retail-catalog';
import { fromCatalogRow, fromVariantRow } from './mappers';

// Always the public role, including when a staff member views a product page.
export function retailPublicClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
}

export async function loadRetailProducts(client, ids) {
  let query = client.from('catalog_products').select(RETAIL_PRODUCT_FIELDS).eq('available', true);
  if (ids) query = query.in('id', ids);
  const { data: rows, error } = await query.order('id');
  if (error) throw new Error('catalog_unavailable');
  if (!rows?.length) return [];
  const variants = await client.from('catalog_variants').select(RETAIL_VARIANT_FIELDS).in('product_id', rows.map(row => row.id));
  if (variants.error) throw new Error('catalog_unavailable');
  return rows.map(row => ({ ...fromCatalogRow(row), variants: (variants.data || []).filter(item => item.product_id === row.id).map(fromVariantRow) }));
}

export const getRetailProduct = cache(async id => {
  if (typeof id !== 'string' || id.length > 200) return null;
  const products = await loadRetailProducts(retailPublicClient(), [id]);
  return products.find(product => product.kind !== 'goods' && product.line !== 'sample') || null;
});

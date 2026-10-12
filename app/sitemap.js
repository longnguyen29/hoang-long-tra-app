// Only canonical pages intended for search. Sample forms and internal routes stay out.
import { retailPublicClient } from '@/lib/retail-catalog-server';
import { retailProductHref } from '@/lib/retail-catalog';

export const revalidate = 3600;
export default async function sitemap() {
  const base = "https://www.hoanglongtra.com";
  let teas = [];
  try {
    const { data, error } = await retailPublicClient().from('catalog_products').select('id,kind,line').eq('available', true);
    if (!error) teas = (data || []).filter(product => product.kind !== 'goods' && product.line !== 'sample');
  } catch { /* Core pages remain discoverable if the catalogue is temporarily unavailable. */ }
  return [
    { url: base, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/cho-quan`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/meet`, changeFrequency: "monthly", priority: 0.5 },
    ...["/company", "/catalog", "/wholesale", "/shop", "/story", "/terms", "/shipping", "/returns"].map(path => ({url: `${base}${path}`, changeFrequency: "monthly", priority: 0.7})),
    { url: `${base}/privacy`, changeFrequency: "yearly", priority: 0.3 },
    ...teas.map(product => ({ url: `${base}${retailProductHref(product.id)}`, changeFrequency: 'weekly', priority: 0.7 })),
  ];
}

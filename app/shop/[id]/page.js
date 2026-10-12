import { notFound } from 'next/navigation';
import { getRetailProduct } from '@/lib/retail-catalog-server';
import { retailProductFacts, retailProductHref } from '@/lib/retail-catalog';
import TeaShop from '@/components/public/TeaShop';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
  const { id } = await params;
  const product = await getRetailProduct(id);
  if (!product) return { title: 'Trà chưa có trong danh mục | Hoàng Long', robots: { index: false, follow: true } };
  const facts = retailProductFacts(product, 'vi');
  const title = `${facts.name} | Mua trà Hoàng Long`;
  const description = (facts.note || `Xem quy cách và cách pha ${facts.name}, chọn trà tại Hoàng Long.`).slice(0, 200);
  const url = `https://www.hoanglongtra.com${retailProductHref(product.id)}`;
  return { title, description, alternates: { canonical: url }, openGraph: {
    title, description, url, type: 'website', locale: 'vi_VN', ...(product.photoUrl ? { images: [{ url: product.photoUrl, alt: facts.name }] } : {}),
  }, twitter: { card: product.photoUrl ? 'summary_large_image' : 'summary', title, description, ...(product.photoUrl ? { images: [product.photoUrl] } : {}) } };
}

export default async function RetailProductPage({ params }) {
  const { id } = await params;
  const product = await getRetailProduct(id);
  if (!product) notFound();
  return <TeaShop product={product}/>;
}

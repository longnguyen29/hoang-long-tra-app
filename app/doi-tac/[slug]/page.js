import { notFound } from "next/navigation";
import TaiwanExportDesk from "@/components/public/TaiwanExportDesk";
import { getPublicPartnerSalesPage } from "@/lib/partner-sales-page-server";
import { EXPORT_CURRENCIES } from "@/lib/export-teas";
import { parseExportTeaIds } from "@/lib/export-sales-kit";
import { EXPORT_SALES_KIT_PDF } from "@/lib/export-sales-kit";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const page = await getPublicPartnerSalesPage(slug);
  return {
    title: page ? `Trà Hoàng Long · ${page.display_name}` : "Trang đối tác | Hoàng Long",
    description: "Thông tin trà, giá EXW, quy trình đặt hàng và liên hệ đối tác giới thiệu của Hoàng Long.",
    robots: { index: false, follow: true },
    alternates: { canonical: `https://www.hoanglongtra.com/doi-tac/${encodeURIComponent(slug)}` },
  };
}

export default async function PartnerSalesPage({ params, searchParams }) {
  const { slug } = await params;
  const page = await getPublicPartnerSalesPage(slug);
  if (!page) notFound();
  const query = await searchParams;
  const teaIds = query?.teas === undefined ? page.tea_ids : parseExportTeaIds(query.teas);
  if (!teaIds || teaIds.some(id => !page.tea_ids.includes(id))) notFound();
  const profile = { id: `partner-${page.slug}`, label: page.display_name,
    contact: { name: page.display_name, role: "Đối tác giới thiệu của Hoàng Long", phone: page.phone, phoneLabel: page.phone },
    pdf: EXPORT_SALES_KIT_PDF };
  return <TaiwanExportDesk profile={profile} salesPage={page} initialTeaIds={teaIds}
    initialCurrency={EXPORT_CURRENCIES.includes(query?.currency) ? query.currency : "VND"}/>;
}

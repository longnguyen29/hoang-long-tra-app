import TaiwanExportDesk from "@/components/public/TaiwanExportDesk";
import { notFound, redirect } from "next/navigation";
import { EXPORT_CURRENCIES } from "@/lib/export-teas";
import { parseExportTeaIds } from "@/lib/export-sales-kit";
import { TAIWAN_EXPORT_COPY } from "@/lib/export-taiwan-copy";
import { getExportSalesProfile } from "@/lib/export-sales-profiles";
import { getPublicPartnerSalesPage } from "@/lib/partner-sales-page-server";

export async function generateMetadata({ searchParams }) {
  const t = TAIWAN_EXPORT_COPY.vi;
  const profile = getExportSalesProfile((await searchParams)?.profile);
  const title = `${t.title}${profile?.contact ? ` · ${profile.contact.name}` : ""} | Hoàng Long`;
  return {
    title,
    description: t.intro,
    robots: { index: false, follow: true },
    alternates: { canonical: "https://www.hoanglongtra.com/export/taiwan" },
    openGraph: {
      title, description: t.intro,
      url: "https://www.hoanglongtra.com/export/taiwan", type: "website",
      locale: "vi_VN",
      images: [{ url: "https://www.hoanglongtra.com/landing/3.jpg", width: 1024, height: 1024, alt: t.visit.title }],
    },
  };
}

export default async function TaiwanExportPage({ searchParams }) {
  const params = await searchParams;
  const teaIds = parseExportTeaIds(params?.teas);
  const profile = getExportSalesProfile(params?.profile);
  if (!teaIds || !profile) notFound();
  // Keep old shared links and printed QR codes useful after the owner explicitly
  // binds and publishes the real partner page. Static names never grant credit.
  if (profile.id === "anh-long") {
    let page;
    try { page = await getPublicPartnerSalesPage("anh-long"); }
    catch { /* The existing presentation remains usable; its form retains the unverified source hint for manager review. */ }
    if (page) {
      const query = new URLSearchParams();
      if (params?.teas !== undefined) query.set("teas", teaIds.join(","));
      if (EXPORT_CURRENCIES.includes(params?.currency)) query.set("currency", params.currency);
      for (const field of ["utm_source", "utm_medium", "utm_campaign", "utm_content"]) {
        if (typeof params?.[field] === "string" && /^[a-z0-9._-]{1,64}$/i.test(params[field])) query.set(field, params[field]);
      }
      redirect(`/doi-tac/${page.slug}${query.size ? `?${query}` : ""}`);
    }
  }
  return <TaiwanExportDesk profile={profile} initialTeaIds={teaIds} initialCurrency={EXPORT_CURRENCIES.includes(params?.currency) ? params.currency : "VND"} />;
}

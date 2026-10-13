import TaiwanExportDesk from "@/components/public/TaiwanExportDesk";
import { notFound } from "next/navigation";
import { EXPORT_CURRENCIES } from "@/lib/export-teas";
import { parseExportTeaIds } from "@/lib/export-sales-kit";
import { TAIWAN_EXPORT_COPY } from "@/lib/export-taiwan-copy";
import { getExportSalesProfile } from "@/lib/export-sales-profiles";

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
  return <TaiwanExportDesk profile={profile} initialTeaIds={teaIds} initialCurrency={EXPORT_CURRENCIES.includes(params?.currency) ? params.currency : "VND"} />;
}

import TaiwanExportDesk from "@/components/public/TaiwanExportDesk";
import { notFound } from "next/navigation";
import { EXPORT_CURRENCIES } from "@/lib/export-teas";
import { parseExportTeaIds } from "@/lib/export-sales-kit";
import { TAIWAN_EXPORT_COPY } from "@/lib/export-taiwan-copy";

export async function generateMetadata({ searchParams }) {
  const t = TAIWAN_EXPORT_COPY.vi;
  return {
    title: `${t.title} | Hoàng Long`,
    description: t.intro,
    robots: { index: false, follow: true },
    alternates: { canonical: "https://www.hoanglongtra.com/export/taiwan" },
    openGraph: {
      title: `${t.title} | Hoàng Long`, description: t.intro,
      url: "https://www.hoanglongtra.com/export/taiwan", type: "website",
      locale: "vi_VN",
      images: [{ url: "https://www.hoanglongtra.com/landing/3.jpg", width: 1024, height: 1024, alt: t.visit.title }],
    },
  };
}

export default async function TaiwanExportPage({ searchParams }) {
  const params = await searchParams;
  const teaIds = parseExportTeaIds(params?.teas);
  if (!teaIds) notFound();
  return <TaiwanExportDesk initialTeaIds={teaIds} initialCurrency={EXPORT_CURRENCIES.includes(params?.currency) ? params.currency : "VND"} />;
}

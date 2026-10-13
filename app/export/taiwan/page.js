import TaiwanExportDesk from "@/components/public/TaiwanExportDesk";
import { exportLocale, EXPORT_CURRENCIES } from "@/lib/export-teas";
import { TAIWAN_EXPORT_COPY } from "@/lib/export-taiwan-copy";

export async function generateMetadata({ searchParams }) {
  const params = await searchParams;
  const language = exportLocale(params?.lang);
  const t = TAIWAN_EXPORT_COPY[language];
  return {
    title: `${t.title} | Hoàng Long`,
    description: t.intro,
    robots: { index: false, follow: true },
    alternates: { canonical: "https://www.hoanglongtra.com/export/taiwan" },
    openGraph: {
      title: `${t.title} | Hoàng Long`, description: t.intro,
      url: "https://www.hoanglongtra.com/export/taiwan", type: "website",
      locale: language === "zh-TW" ? "zh_TW" : language === "vi" ? "vi_VN" : "en_US",
      images: [{ url: "https://www.hoanglongtra.com/landing/3.jpg", width: 1024, height: 1024, alt: t.visit.title }],
    },
  };
}

export default async function TaiwanExportPage({ searchParams }) {
  const params = await searchParams;
  return <TaiwanExportDesk initialLocale={exportLocale(params?.lang)} initialCurrency={EXPORT_CURRENCIES.includes(params?.currency) ? params.currency : "TWD"} />;
}

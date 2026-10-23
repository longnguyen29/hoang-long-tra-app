import CompanyProfile from "@/components/public/CompanyProfile";

export const metadata = {
  title: "Hồ sơ năng lực & hợp tác xuất khẩu trà | Hoàng Long",
  description: "Hồ sơ Công ty TNHH Thương Mại Trà Hoàng Long: nguồn trà, chế biến tại Hà Giang, năng lực cung ứng và hợp tác thị trường. Catalog Việt/Anh và đầu mối phát triển xuất khẩu.",
  alternates: { canonical: "https://www.hoanglongtra.com/company" },
  openGraph: {
    title: "Hồ sơ năng lực & hợp tác xuất khẩu trà | Hoàng Long",
    description: "Năng lực tại nguồn, kế hoạch cung ứng và hợp tác phát triển thị trường. Hồ sơ năng lực & catalog PDF Việt/Anh.",
    url: "https://www.hoanglongtra.com/company",
    type: "website",
    locale: "vi_VN",
    alternateLocale: ["en_US"],
    images: [{ url: "https://www.hoanglongtra.com/landing/3.jpg", width: 1024, height: 1024, alt: "Chế biến trà tại xưởng Hoàng Long" }],
  },
};

export default function CompanyPage() {
  return <CompanyProfile />;
}

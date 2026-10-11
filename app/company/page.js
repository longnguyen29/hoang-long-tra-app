import CompanyProfile from "@/components/public/CompanyProfile";

export const metadata = {
  title: "Hồ sơ doanh nghiệp & danh mục trà | Hoàng Long",
  description: "Tìm hiểu Nhà làm Trà Hoàng Long, nguồn nguyên liệu, chế biến và lộ trình hợp tác. Tải hồ sơ và catalog bằng tiếng Việt hoặc tiếng Anh, trao đổi mẫu trà và yêu cầu báo giá.",
  alternates: { canonical: "https://www.hoanglongtra.com/company" },
  openGraph: {
    title: "Hồ sơ doanh nghiệp & danh mục trà | Hoàng Long",
    description: "Nguồn trà Việt, chế biến và hợp tác cung ứng. Hồ sơ & catalog PDF bằng tiếng Việt và tiếng Anh.",
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

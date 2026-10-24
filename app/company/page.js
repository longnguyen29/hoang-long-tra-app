import CompanyProfile from "@/components/public/CompanyProfile";

export const metadata = {
  title: "Hồ sơ doanh nghiệp & đề xuất hợp tác thương mại | Hoàng Long",
  description: "Hồ sơ Công ty TNHH Thương Mại Trà Hoàng Long, đề xuất kết nối người mua và phát triển thị trường trà Việt. Tải đề xuất hợp tác, hồ sơ doanh nghiệp và phụ lục sản phẩm Việt/Anh.",
  alternates: { canonical: "https://www.hoanglongtra.com/company" },
  openGraph: {
    title: "Hồ sơ doanh nghiệp & đề xuất hợp tác thương mại | Hoàng Long",
    description: "Nền tảng sản xuất tại Hà Giang, danh mục cung ứng và đề xuất kết nối giao thương. Bộ tài liệu doanh nghiệp Việt/Anh cho cuộc gặp và triển khai hợp tác.",
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

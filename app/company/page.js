import CompanyProfile from "@/components/public/CompanyProfile";

export const metadata = {
  title: "Hồ sơ năng lực & hợp tác xuất khẩu trà | Hoàng Long",
  description: "Hồ sơ Hoàng Long: nguồn trà Việt, chế biến tại Hà Giang, danh mục theo ứng dụng, mô hình cung ứng và cơ sở đánh giá chất lượng. Hợp tác nhập khẩu, phân phối và phát triển thị trường; PDF Việt/Anh.",
  alternates: { canonical: "https://www.hoanglongtra.com/company" },
  openGraph: {
    title: "Hồ sơ năng lực & hợp tác xuất khẩu trà | Hoàng Long",
    description: "Từ đặc tính nguồn trà đến giá trị thương mại: sản phẩm, mô hình cung ứng, đánh giá chất lượng và hợp tác thị trường. Hồ sơ & catalog PDF Việt/Anh.",
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

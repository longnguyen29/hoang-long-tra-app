import CompanyProfile from "@/components/public/CompanyProfile";

export const metadata = {
  title: "Hồ sơ sản phẩm xuất khẩu & doanh nghiệp | Hoàng Long",
  description: "Hồng Trà Mật, Hồng Trà Khói, Xanh Mộc và Hoa Ngọc Lan. Hồ sơ bốn dòng trà chủ lực, quy cách PP/PE, cung ứng EXW Hà Giang và tài liệu Việt/Anh cho nhà nhập khẩu.",
  alternates: { canonical: "https://www.hoanglongtra.com/company" },
  openGraph: {
    title: "Bốn dòng trà xuất khẩu chủ lực | Hoàng Long",
    description: "Hồ sơ sản phẩm, mẫu chào hàng, quy cách xuất khẩu và điều kiện cung ứng. Tải tài liệu PDF Việt/Anh.",
    url: "https://www.hoanglongtra.com/company",
    type: "website",
    locale: "vi_VN",
    alternateLocale: ["en_US"],
    images: [{ url: "https://www.hoanglongtra.com/export/core-hong-tra-shan-mat.jpeg", alt: "Hồng Trà Mật — một trong bốn dòng trà xuất khẩu chủ lực Hoàng Long" }],
  },
};

export default function CompanyPage() {
  return <CompanyProfile />;
}

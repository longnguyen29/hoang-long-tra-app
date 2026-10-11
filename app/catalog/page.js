import TradeCatalog from "@/components/public/TradeCatalog";

export const metadata = {
  title: "Danh mục trà cho phân phối & xuất khẩu | Hoàng Long",
  description: "Tìm trà theo nhóm, xem thông tin mẫu, cách pha và quy cách đang niêm yết. Tải hồ sơ & catalog Hoàng Long Việt/Anh hoặc yêu cầu mẫu, báo giá.",
  alternates: { canonical: "https://www.hoanglongtra.com/catalog" },
  openGraph: {
    title: "Danh mục trà & hồ sơ doanh nghiệp | Hoàng Long",
    description: "Danh mục trà Hoàng Long cho phân phối, quán đồ uống và xuất khẩu. Thử mẫu, thống nhất quy cách và nhận báo giá theo nhu cầu.",
    url: "https://www.hoanglongtra.com/catalog",
    type: "website",
    locale: "vi_VN",
    images: [{ url: "https://www.hoanglongtra.com/landing/3.jpg", width: 1024, height: 1024, alt: "Dây chuyền chế biến trà Hoàng Long" }],
  },
};

export default function CatalogPage() { return <TradeCatalog/>; }

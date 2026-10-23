import TradeCatalog from "@/components/public/TradeCatalog";

export const metadata = {
  "title": "Danh mục trà thương mại & hồ sơ năng lực | Hoàng Long",
  "description": "Danh mục trà cho phân phối và xuất khẩu: đối chiếu mẫu, thống nhất tiêu chuẩn, quy cách đơn lớn và báo giá EXW. Tải hồ sơ Hoàng Long Việt/Anh.",
  "alternates": {
    "canonical": "https://www.hoanglongtra.com/catalog"
  },
  "openGraph": {
    "title": "Danh mục trà thương mại & hồ sơ năng lực | Hoàng Long",
    "description": "Danh mục trà cho phân phối và xuất khẩu: đối chiếu mẫu, thống nhất tiêu chuẩn, quy cách đơn lớn và báo giá EXW. Tải hồ sơ Hoàng Long Việt/Anh.",
    "url": "https://www.hoanglongtra.com/catalog",
    "type": "website",
    "locale": "vi_VN",
    "images": [
      {
        "url": "https://www.hoanglongtra.com/landing/3.jpg",
        "width": 1024,
        "height": 1024,
        "alt": "Dây chuyền chế biến trà Hoàng Long"
      }
    ]
  }
};

export default function CatalogPage() { return <TradeCatalog/>; }

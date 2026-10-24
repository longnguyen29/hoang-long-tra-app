import TradeCatalog from "@/components/public/TradeCatalog";

export const metadata = {
  "title": "Danh mục trà xuất khẩu & B2B | Hoàng Long",
  "description": "Bốn sản phẩm chủ lực: Hồng Trà Mật, Hồng Trà Khói, Xanh Mộc và Trà Xanh Hoa Ngọc Lan. Hồ sơ sản phẩm, quy cách PP/PE, mẫu và báo giá xuất khẩu.",
  "alternates": {
    "canonical": "https://www.hoanglongtra.com/catalog"
  },
  "openGraph": {
    "title": "Danh mục trà xuất khẩu & B2B | Hoàng Long",
    "description": "Bốn sản phẩm chủ lực: Hồng Trà Mật, Hồng Trà Khói, Xanh Mộc và Trà Xanh Hoa Ngọc Lan. Hồ sơ sản phẩm, quy cách PP/PE, mẫu và báo giá xuất khẩu.",
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

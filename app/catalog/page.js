import TradeCatalog from "@/components/public/TradeCatalog";

export const metadata = {
  "title": "Danh mục trà B2B · Pha chế, phân phối & xuất khẩu | Hoàng Long",
  "description": "Chọn trà nền đồ uống, trà nguyên lá và dòng chuyên trà theo ứng dụng. Đánh giá mẫu, quy cách đơn lớn PP/PE và yêu cầu thương mại; tải hồ sơ Hoàng Long Việt/Anh.",
  "alternates": {
    "canonical": "https://www.hoanglongtra.com/catalog"
  },
  "openGraph": {
    "title": "Danh mục trà B2B · Pha chế, phân phối & xuất khẩu | Hoàng Long",
    "description": "Chọn trà nền đồ uống, trà nguyên lá và dòng chuyên trà theo ứng dụng. Đánh giá mẫu, quy cách đơn lớn PP/PE và yêu cầu thương mại; tải hồ sơ Hoàng Long Việt/Anh.",
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

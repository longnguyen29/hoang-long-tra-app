export const metadata = {
  "title": "Hoàng Long | Trà Việt · Sản xuất, cung ứng & phát triển thị trường",
  "description": "Hoàng Long kết nối nguyên liệu vùng cao, chế biến tại Hà Giang và danh mục trà theo ứng dụng. Tìm hiểu nền tảng sản xuất, hợp tác B2B, xuất khẩu và cửa hàng trà.",
  "alternates": {
    "canonical": "https://www.hoanglongtra.com/"
  },
  "openGraph": {
    "title": "Hoàng Long | Trà Việt · Sản xuất, cung ứng & phát triển thị trường",
    "description": "Hoàng Long kết nối nguyên liệu vùng cao, chế biến tại Hà Giang và danh mục trà theo ứng dụng. Tìm hiểu nền tảng sản xuất, hợp tác B2B, xuất khẩu và cửa hàng trà.",
    "url": "https://www.hoanglongtra.com/",
    "type": "website",
    "locale": "vi_VN"
  }
};

import HouseHome from "@/components/public/HouseHome";
import IdleScreen from "@/components/IdleScreen";

export default function HomePage() {
  return (
    <>
      <HouseHome />
      {/* Public site only — deliberately not mounted on /admin, where it would interrupt
          staff reviewing orders every thirty seconds. */}
      <IdleScreen />
    </>
  );
}

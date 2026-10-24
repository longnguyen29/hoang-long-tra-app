export const metadata = {
  "title": "Hoàng Long | Trà Việt Nam · Sản phẩm xuất khẩu & cung ứng B2B",
  "description": "Hồng Trà Mật, Hồng Trà Khói, Xanh Mộc và Trà Xanh Hoa Ngọc Lan. Hồ sơ sản phẩm xuất khẩu, nhà máy Hà Giang, quy cách lô lớn và cửa hàng trà Hoàng Long.",
  "alternates": {
    "canonical": "https://www.hoanglongtra.com/"
  },
  "openGraph": {
    "title": "Hoàng Long | Trà Việt Nam · Sản phẩm xuất khẩu & cung ứng B2B",
    "description": "Hồng Trà Mật, Hồng Trà Khói, Xanh Mộc và Trà Xanh Hoa Ngọc Lan. Hồ sơ sản phẩm xuất khẩu, nhà máy Hà Giang, quy cách lô lớn và cửa hàng trà Hoàng Long.",
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

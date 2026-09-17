export const metadata = {
  "title": "Sản xuất trà cho phân phối & xuất khẩu | Hoàng Long",
  "description": "Năng lực sản xuất 1.000 tấn trà/năm. Nguyên liệu Tây Bắc, Hà Giang, trà cổ thụ vùng cao. Công nghệ Nhật Bản, hấp hơi, giá tại xưởng và hợp tác dài hạn.",
  "alternates": {
    "canonical": "https://www.hoanglongtra.com/"
  },
  "openGraph": {
    "title": "Sản xuất trà cho phân phối & xuất khẩu | Hoàng Long",
    "description": "Năng lực sản xuất 1.000 tấn trà/năm. Nguyên liệu Tây Bắc, Hà Giang, trà cổ thụ vùng cao. Công nghệ Nhật Bản, hấp hơi, giá tại xưởng và hợp tác dài hạn.",
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

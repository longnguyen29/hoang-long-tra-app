export const metadata = {
  "title": "Trà Shan Tuyết Hà Giang cho quán & thưởng trà | Hoàng Long",
  "description": "Khám phá trà Shan Tuyết Hoàng Long: chọn trà cho quán, tính chi phí trà mỗi ly, thử mẫu và tìm hiểu câu chuyện nhà làm trà.",
  "alternates": {
    "canonical": "https://www.hoanglongtra.com/"
  },
  "openGraph": {
    "title": "Trà Shan Tuyết Hà Giang cho quán & thưởng trà | Hoàng Long",
    "description": "Khám phá trà Shan Tuyết Hoàng Long: chọn trà cho quán, tính chi phí trà mỗi ly, thử mẫu và tìm hiểu câu chuyện nhà làm trà.",
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

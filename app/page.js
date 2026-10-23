export const metadata = {
  "title": "Hoàng Long | Nguồn trà Việt · Sản xuất & hợp tác xuất khẩu",
  "description": "Kết nối nguồn trà vùng cao với chế biến tại Tân Lập, Hà Giang. Năng lực 50–100 tấn/tháng phục vụ lập kế hoạch, thử mẫu và hợp tác phân phối, xuất khẩu.",
  "alternates": {
    "canonical": "https://www.hoanglongtra.com/"
  },
  "openGraph": {
    "title": "Hoàng Long | Nguồn trà Việt · Sản xuất & hợp tác xuất khẩu",
    "description": "Kết nối nguồn trà vùng cao với chế biến tại Tân Lập, Hà Giang. Năng lực 50–100 tấn/tháng phục vụ lập kế hoạch, thử mẫu và hợp tác phân phối, xuất khẩu.",
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

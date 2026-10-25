import DomesticBlackTeaLanding from "@/components/public/DomesticBlackTeaLanding";
import { PROFILE_LEGAL } from "@/lib/company-profile";
export const metadata = {
  title:"Hồng trà Shan bán sỉ cho nhà phân phối & chuỗi đồ uống | Hoàng Long",
  description:"Chọn Hồng Trà Shan Mật hoặc Shan Khói. Gửi nhu cầu thử mẫu, khối lượng và quy cách bao PP/PE để nhận tư vấn, báo giá từ Hoàng Long.",
  alternates:{canonical:"https://www.hoanglongtra.com/hong-tra-ban-si"},
  openGraph:{title:"Hồng trà Shan bán sỉ | Hoàng Long",description:"Hai dòng hồng trà, hai bản sắc hương. Chọn mẫu và nhận báo giá theo nhu cầu doanh nghiệp.",url:"https://www.hoanglongtra.com/hong-tra-ban-si",type:"website",locale:"vi_VN",images:[{url:"https://www.hoanglongtra.com/export/core-hong-tra-shan-mat.jpeg",alt:"Hồng Trà Shan Mật Hoàng Long"}]},
};
export default function Page(){return <DomesticBlackTeaLanding legal={{name:PROFILE_LEGAL.name,taxNumber:PROFILE_LEGAL.taxNumber}}/>;}

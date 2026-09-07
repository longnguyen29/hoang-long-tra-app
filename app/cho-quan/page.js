import CafeEntry from "@/components/public/CafeEntry";

const title = "Trà pha chế cho quán: chọn nền trà & tính chi phí mỗi ly | Hoàng Long";
const description = "Chọn nền trà Shan Tuyết cho trà sữa, trà trái cây và cold brew. Xem lượng trà, chi phí trà khô mỗi ly và chọn bộ mẫu để thử tại quán.";
const url = "https://www.hoanglongtra.com/cho-quan";

export const metadata = {
  title,
  description,
  alternates: { canonical: url },
  robots: { index: true, follow: true },
  openGraph: { title, description, url, type: "website", locale: "vi_VN" },
};

export default function CafeEntryPage() {
  return <CafeEntry />;
}

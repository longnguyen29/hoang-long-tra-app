import CafeEntry from "@/components/public/CafeEntry";

const title = "Trà pha chế và bộ mẫu trà cho quán | Hoàng Long";
const description = "Chọn nền trà Shan Tuyết Hà Giang cho trà sữa, trà trái cây và cold brew. Tính chi phí trà mỗi ly và xem bộ mẫu 4 loại trà để pha thử trước khi đặt sỉ.";
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

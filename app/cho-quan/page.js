import CafeEntry from "@/components/public/CafeEntry";

export const metadata = {
  title: "Tìm nền trà cho quán | Nhà Hoàng Long",
  description: "Chọn món quán đang phát triển. Xem gợi ý nền trà, tỷ lệ ủ tham chiếu và chi phí trà khô trên mỗi ly trước khi chọn bộ mẫu.",
  robots: { index: false, follow: true },
};

export default function CafeEntryPage() {
  return <CafeEntry />;
}

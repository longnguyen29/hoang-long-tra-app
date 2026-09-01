import TeaTasteSelector from "@/components/public/TeaTasteSelector";

export const metadata = {
  title: "Chọn trà theo vị | House of Hoàng Long",
  description:
    "Chọn hướng vị cần giữ trong ly để xem trà Hoàng Long đang có và món pha chế phù hợp để thử trước.",
  robots: { index: false, follow: false },
};

export default function TeaTasteSelectorPage() {
  return <TeaTasteSelector />;
}

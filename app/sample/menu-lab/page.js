import SampleRequest from "@/components/SampleRequest";

// Experimental sample funnel. Keep /sample as the stable control so links can be
// tested deliberately instead of changing every visitor's experience at once.
export const metadata = {
  title: "Menu Lab — trà mẫu cho quán | House of Hoàng Long",
  description:
    "Chọn món quán muốn phát triển để nhận gợi ý nền trà, cách pha khởi điểm và bộ mẫu phù hợp.",
  robots: { index: false, follow: false },
};

export default function SampleMenuLabPage() {
  return <SampleRequest variant="menu-lab" />;
}

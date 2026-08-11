import SampleRequest from "@/components/SampleRequest";

// Not linked from anywhere on the site. This address is handed to café owners directly, in
// person or over Zalo, which is what makes the free pack a gesture rather than a giveaway.
export const metadata = {
  title: "Trà mẫu cho quán — House of Hoàng Long",
  description:
    "Gói trà mẫu dành cho quán cà phê, quán trà và bar: pha thử ngay trên quầy của bạn trước khi đặt sỉ.",
  robots: { index: false, follow: false },
};

export default function SamplePage() {
  return <SampleRequest />;
}

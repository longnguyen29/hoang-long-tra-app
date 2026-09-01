import TeaJourney from "@/components/public/TeaJourney";

export const metadata = {
  title: "Hành trình của lá trà | House of Hoàng Long",
  description:
    "Từ cây trà Shan Tuyết cổ thụ Hà Giang đến công thức tại quán: nguồn trà, chế biến, thử món và nhận mẫu.",
  robots: { index: false, follow: false },
};

export default function TeaJourneyPage() {
  return <TeaJourney />;
}

import EventContact from "@/components/public/EventContact";

export const metadata = {
  title: "Gặp Hoàng Long — Liên hệ & trao đổi về trà",
  description: "Giữ liên hệ với Trà Hoàng Long sau hội chợ: Zalo, danh thiếp, danh mục trà và nhu cầu mẫu hoặc báo giá.",
  alternates: { canonical: "https://www.hoanglongtra.com/meet" },
  openGraph: {
    title: "Gặp Hoàng Long. Tiếp tục câu chuyện về trà.",
    description: "Trà Việt cho quán, nhà phân phối và doanh nghiệp. Kết nối trực tiếp qua Zalo.",
    url: "https://www.hoanglongtra.com/meet",
    locale: "vi_VN",
    type: "website",
  },
};

export default function MeetPage() {
  return <EventContact />;
}

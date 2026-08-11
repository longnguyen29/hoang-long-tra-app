import LandingWholesale from "@/components/LandingWholesale";

// Advert landing page. Not in the site navigation and not indexed — traffic arrives from
// paid placements, and an ad landing page competing with the real site in search results
// helps nobody.
export const metadata = {
  title: "Mẫu thử trà doanh nghiệp — Nhà làm Trà Hoàng Long",
  description:
    "Trà nền cho quán trà sữa và cà phê: trà cổ thụ mọc hoang Hà Giang, chế biến bằng công nghệ Nhật Bản. Nhận mẫu thử miễn phí về pha tại quán.",
  robots: { index: false, follow: false },
};

export default function LandingPage() {
  return <LandingWholesale />;
}

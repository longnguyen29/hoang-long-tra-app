import PrivacyPolicy from "@/components/PrivacyPolicy";

// Deliberately indexable, unlike the advert and sample pages. Advertising platforms fetch
// this URL to verify it before approving lead campaigns, and a policy nobody can reach is
// not a policy.
export const metadata = {
  title: "Chính sách quyền riêng tư — Nhà làm Trà Hoàng Long",
  description:
    "Nhà làm Trà Hoàng Long thu thập thông tin gì, dùng để làm gì, ai có thể tiếp cận, và bạn có quyền yêu cầu gì.",
};

export default function PrivacyPage() {
  return <PrivacyPolicy />;
}

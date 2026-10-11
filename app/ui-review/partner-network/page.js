import { notFound } from "next/navigation";
import { partnerNetworkEnabled } from "@/lib/partner-network-server";
import PartnerNetworkReview from "@/components/staff/PartnerNetworkReview";
export const metadata = { title: "Duyệt nội bộ · Đối tác Hoàng Long", robots: { index: false, follow: false } };
export default function PartnerNetworkReviewPage() {
  if (process.env.NODE_ENV !== "development" || !partnerNetworkEnabled()) notFound();
  return <PartnerNetworkReview/>;
}

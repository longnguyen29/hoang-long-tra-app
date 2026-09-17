import { notFound } from "next/navigation";
import ProspectDiscovery from "@/components/staff/ProspectDiscovery";
export const metadata = { title: "Tìm khách hàng · Xem thử", robots: { index: false, follow: false } };
export default function DiscoveryReview() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <ProspectDiscovery preview/>;
}

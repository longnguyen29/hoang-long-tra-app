import { notFound } from "next/navigation";
import PartnerNetworkDesk from "@/components/staff/PartnerNetworkDesk";
import { partnerNetworkEnabled } from "@/lib/partner-network-server";

export const metadata = {
  title: "Mạng lưới đối tác | Hoàng Long",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default function PartnerNetworkPage() {
  if (!partnerNetworkEnabled()) notFound();
  return <PartnerNetworkDesk />;
}

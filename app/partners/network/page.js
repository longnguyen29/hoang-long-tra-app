import { notFound } from "next/navigation";
import PartnerNetworkPortal from "@/components/public/PartnerNetworkPortal";
import { partnerNetworkEnabled } from "@/lib/partner-network-server";
export const metadata = { title: "Bàn giới thiệu khách — Hoàng Long", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export default function PartnerNetworkPage() {
  if (!partnerNetworkEnabled()) notFound();
  return <PartnerNetworkPortal/>;
}

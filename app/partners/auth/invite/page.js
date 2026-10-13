import { notFound } from "next/navigation";
import { partnerNetworkEnabled } from "@/lib/partner-network-server";
import PartnerInviteAccept from "@/components/public/PartnerInviteAccept";

export const dynamic = "force-dynamic";
export const metadata = { title: "Nhận lời mời đối tác | Hoàng Long", robots: { index: false, follow: false }, referrer: "no-referrer" };

export default function PartnerInvitePage() {
  if (!partnerNetworkEnabled()) notFound();
  return <PartnerInviteAccept/>;
}

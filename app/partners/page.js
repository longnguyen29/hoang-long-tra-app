import PartnerPortal from "@/components/public/PartnerPortal";
import PartnerNetworkLanding from "@/components/public/PartnerNetworkLanding";
import { partnerNetworkEnabled } from "@/lib/partner-network-server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const metadata={title:partnerNetworkEnabled() ? "Chương trình đối tác B2B — Hoàng Long" : "Bàn đối tác — House of Hoàng Long",robots:{index:false,follow:false}};

export default async function PartnersPage({ searchParams }) {
  if (!partnerNetworkEnabled()) return <PartnerPortal/>;
  // Buyer email links already sent to the old address must also finish their original flow.
  const query = await searchParams;
  if (typeof query?.code === "string") return <PartnerPortal/>;
  // Existing signed-in wholesale buyers keep their original private ordering workflow.
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { data: account } = await supabase.from("wholesale_accounts").select("id").eq("user_id", user.id).maybeSingle();
    if (account) return <PartnerPortal/>;
  }
  return <PartnerNetworkLanding/>;
}

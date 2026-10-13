import PartnerPortal from "@/components/public/PartnerPortal";
import PartnerNetworkLanding from "@/components/public/PartnerNetworkLanding";
import { partnerNetworkEnabled, partnerNetworkPublicRegistrationEnabled, partnerRegistrationAccess } from "@/lib/partner-network-server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const metadata={title:partnerNetworkPublicRegistrationEnabled() ? "Chương trình đối tác B2B — Hoàng Long" : "Bàn đối tác — House of Hoàng Long",robots:{index:false,follow:false}};

export default async function PartnersPage({ searchParams }) {
  if (!partnerNetworkEnabled()) return <PartnerPortal/>;
  // Buyer email links already sent to the old address must also finish their original flow.
  const query = await searchParams;
  if (typeof query?.code === "string") return <PartnerPortal/>;
  // Existing signed-in wholesale buyers keep their original private ordering workflow.
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const registration = await partnerRegistrationAccess(user, supabase);
  if (registration.allowRegistration && !registration.publicRegistration) return <PartnerNetworkLanding {...registration}/>;
  if (user) {
    const { data: account } = await supabase.from("wholesale_accounts").select("id").eq("user_id", user.id).maybeSingle();
    if (account) return <PartnerPortal/>;
  }
  if (!registration.allowRegistration) return <PartnerPortal/>;
  return <PartnerNetworkLanding {...registration}/>;
}

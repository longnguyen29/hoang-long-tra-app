import { notFound } from "next/navigation";
import PartnerNetworkPortal from "@/components/public/PartnerNetworkPortal";
import { partnerNetworkEnabled, partnerRegistrationAccess } from "@/lib/partner-network-server";
import { createClient } from "@/lib/supabase/server";
export const metadata = { title: "Bàn giới thiệu khách — Hoàng Long", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export default async function PartnerNetworkPage() {
  if (!partnerNetworkEnabled()) notFound();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const registration = await partnerRegistrationAccess(user, supabase);
  return <PartnerNetworkPortal {...registration}/>;
}

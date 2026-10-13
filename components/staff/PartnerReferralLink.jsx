"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useStaffFeatures } from "./StaffFeatures";
import styles from "./PartnerReferralLink.module.css";

// Read only. Referral approval and attribution continue to live in the partner desk.
export default function PartnerReferralLink({ opportunityId, orderId }) {
  const { partnerNetworkEnabled } = useStaffFeatures();
  const supabase = useMemo(() => createClient(), []);
  const [source, setSource] = useState(null);
  useEffect(() => {
    let active = true;
    setSource(null);
    if (!partnerNetworkEnabled || (!opportunityId && !orderId)) return;
    (async () => {
      try {
        let referralId;
        if (orderId) {
          const link = await supabase.from("partner_network_order_links").select("referral_id").eq("order_id", orderId).maybeSingle();
          if (link.error || !link.data) return;
          referralId = link.data.referral_id;
        }
        let query = supabase.from("partner_network_referrals").select("id,partner_id").eq("status", "accepted");
        query = referralId ? query.eq("id", referralId) : query.eq("opportunity_id", opportunityId);
        const referral = await query.maybeSingle();
        if (referral.error || !referral.data) return;
        const partner = await supabase.from("partner_network_partners").select("code,business_name").eq("id", referral.data.partner_id).maybeSingle();
        if (active && !partner.error && partner.data) setSource({ ...partner.data, referralId: referral.data.id });
      } catch { /* Missing migration or non-manager: never disturb the existing sales workflow. */ }
    })();
    return () => { active = false; };
  }, [partnerNetworkEnabled, supabase, opportunityId, orderId]);
  if (!partnerNetworkEnabled || !source) return null;
  return <section className={styles.source} data-no-translate aria-label="Nguồn giới thiệu B2B">
    <div><small>Đối tác giới thiệu</small><strong>{source.business_name}</strong><span>{source.code}</span></div>
    <Link href={`/admin/partner-network?referral=${encodeURIComponent(source.referralId)}`}>Xem giới thiệu & hoa hồng →</Link>
  </section>;
}

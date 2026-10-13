"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { parsePartnerInviteFragment } from "@/lib/partner-invite-callback";
import styles from "./PartnerNetworkPortal.module.css";

export default function PartnerInviteAccept() {
  const [failed, setFailed] = useState(false);
  const acceptance = useRef(null);
  useEffect(() => {
    let active = true;
    if (!acceptance.current) {
      // Supabase admin invitations use an implicit callback, unlike the PKCE
      // login links. Remove the fragment before initializing the shared client.
      const tokens = parsePartnerInviteFragment(window.location.hash);
      window.history.replaceState(null, "", window.location.pathname);
      acceptance.current = (async () => {
        if (!tokens) throw new Error("invite_invalid");
        const supabase = createClient();
        const { error } = await supabase.auth.setSession(tokens);
        if (error) throw new Error("invite_invalid");
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user?.id || !user.email_confirmed_at) throw new Error("invite_invalid");
      })();
    }
    acceptance.current.then(() => { if (active) window.location.replace("/partners/network"); }).catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, []);

  return <main className={styles.page} lang="vi" data-no-translate>
    <header className={styles.header}><Link className={styles.brand} href="/"><span className={styles.seal} aria-hidden="true">皇龍</span>Hoàng Long · Đối tác B2B</Link></header>
    <div className={styles.content}><div className={styles.titleRow}><div><p className={styles.eyebrow}>Lời mời riêng</p><h1>{failed ? "Mở lại thư mời." : "Đang xác nhận lời mời…"}</h1></div></div>
      {failed ? <section className={styles.empty} role="alert"><p>Liên kết chưa hợp lệ hoặc đã hết hạn. Nếu đã nhận lời mời trước đó, đăng nhập bằng đúng email được mời. Nếu chưa, liên hệ Hoàng Long để nhận lại thư mời.</p><Link className={styles.textLink} href="/partners/network">Đăng nhập bàn đối tác</Link></section> : <p className={styles.subtitle} role="status">Sau khi xác minh email, bạn hoàn tất hồ sơ. Hoàng Long sẽ xét duyệt trước khi bạn được gửi khách giới thiệu.</p>}
    </div>
  </main>;
}

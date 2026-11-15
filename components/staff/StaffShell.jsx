"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { CalendarDays, ExternalLink, LogOut, Menu, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { STAFF_APPS, STAFF_APP_GROUPS } from "./staff-navigation";
import styles from "./StaffShell.module.css";
import { StaffFeaturesContext } from "./StaffFeatures";

export default function StaffShell({ children, partnerNetworkEnabled = false, allowedModules = null, canManageAccess = false }) {
  const pathname = usePathname();
  const router = useRouter();
  const menu = useRef(null);
  const [leaving, setLeaving] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { if (menu.current) menu.current.open = false; }, [pathname]);
  if (pathname === "/admin/login" || pathname === "/admin/legacy") return children;
  const active = (href) => href === "/admin" ? pathname === href : pathname.startsWith(href.split("?")[0]);
  const isVisible = key => (allowedModules === null || allowedModules.includes(key)) && (key !== "partnerNetwork" || partnerNetworkEnabled);
  const home = allowedModules === null ? "/admin" : allowedModules.includes("work") ? "/admin/work" : "/admin";
  const current = Object.values(STAFF_APPS).find(app => active(app.href));
  const currentGroup = STAFF_APP_GROUPS.find(group => group.keys.includes(current?.key));
  const related = currentGroup?.keys.filter(isVisible).map(key => STAFF_APPS[key]) || [];
  function prefetchOnIntent(event) {
    const anchor = event.target.closest("a[href]");
    if (!anchor || navigator.connection?.saveData) return;
    const url = new URL(anchor.href, window.location.origin);
    if (url.origin === window.location.origin && url.pathname.startsWith("/admin") && url.pathname !== pathname) {
      router.prefetch(url.pathname + url.search);
    }
  }
  const navigation = <>
    {allowedModules === null && <Link href="/admin" aria-current={active("/admin") ? "page" : undefined}><CalendarDays/><span>Hôm nay</span></Link>}
    {STAFF_APP_GROUPS.map(({ label, keys }) => {
      const visibleKeys = keys.filter(isVisible);
      if (!visibleKeys.length) return null;
      return <section key={label}>
        <h2>{label}</h2>
        {visibleKeys.map(key => {
          const app = STAFF_APPS[key];
          const Icon = app.icon;
          return <Link key={key} href={app.href} aria-current={active(app.href) ? "page" : undefined}><Icon/><span>{app.label}</span></Link>;
        })}
      </section>;
    })}
    {canManageAccess && <Link href="/admin/team-access" aria-current={active("/admin/team-access") ? "page" : undefined}><ShieldCheck/><span>Quyền thành viên</span></Link>}
    <a href="/" target="_blank" rel="noreferrer"><ExternalLink/><span>Xem website ↗</span></a>
  </>;
  async function logout() {
    setLeaving(true); setError("");
    try {
      const { error: failure } = await createClient().auth.signOut();
      if (failure) throw failure;
      router.replace("/admin/login"); router.refresh();
    } catch { setError("Chưa đăng xuất được. Hãy thử lại."); setLeaving(false); }
  }
  return <StaffFeaturesContext.Provider value={{ partnerNetworkEnabled: partnerNetworkEnabled && isVisible("partnerNetwork"), allowedModules }}><div className={styles.shell} data-staff-shell onPointerOver={prefetchOnIntent} onFocus={prefetchOnIntent}>
    <a href="#staff-content" className={styles.skip}>Đến nội dung công việc</a>
    <aside className={styles.sidebar} data-staff-navigation>
      <Link href={home} className={styles.brand}><span aria-hidden="true">皇龍</span><b>Hoàng Long<small>Bàn làm việc</small></b></Link>
      <nav aria-label="Điều hướng công việc" className={styles.desktop}>{navigation}</nav>
      <details ref={menu} className={styles.mobile} onKeyDown={event => { if(event.key === "Escape") { menu.current.open = false; menu.current.querySelector("summary").focus(); } }}>
        <summary><Menu/><span>{current?.label || (pathname === "/admin/team-access" ? "Quyền thành viên" : "Hôm nay")}</span></summary>
        <nav aria-label="Điều hướng công việc trên điện thoại">{navigation}</nav>
      </details>
      <div className={styles.account}><button onClick={logout} disabled={leaving} aria-label="Đăng xuất"><LogOut/><span>{leaving ? "Đang đăng xuất…" : "Đăng xuất"}</span></button>{error && <p role="alert">{error}</p>}</div>
    </aside>
    <div id="staff-content" tabIndex={-1} className={styles.content}>
      {currentGroup && <div className={styles.contextBar}>
        <div className={styles.contextHeading}><span>{currentGroup.label}</span><small>{current?.description}</small></div>
        <nav className={styles.contextLinks} aria-label={`Các mục ${currentGroup.label}`}>
          {related.map(app => <Link key={app.key} href={app.href} aria-current={active(app.href) ? "page" : undefined}>{app.short}</Link>)}
        </nav>
      </div>}
      {children}
    </div>
  </div></StaffFeaturesContext.Provider>;
}

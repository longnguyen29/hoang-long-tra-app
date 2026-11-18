"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CalendarDays, ChevronDown, ExternalLink, LogOut, Menu } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { visibleStaffWorkAreas, activeStaffWorkLink } from "./staff-navigation";
import styles from "./StaffShell.module.css";
import { StaffFeaturesContext } from "./StaffFeatures";

export default function StaffShell({ children, partnerNetworkEnabled = false, allowedModules = null, canManageAccess = false }) {
  const pathname = usePathname();
  const router = useRouter();
  const search = useSearchParams();
  const tab = search.get("tab");
  const locationKey = pathname + "?" + (tab || "");
  const menu = useRef(null);
  const [expanded, setExpanded] = useState(null);
  const [leaving, setLeaving] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { if (menu.current) menu.current.open = false; }, [locationKey]);
  if (pathname === "/admin/login" || pathname === "/admin/legacy") return children;
  const areas = visibleStaffWorkAreas(allowedModules, partnerNetworkEnabled, canManageAccess);
  const home = allowedModules === null ? "/admin" : allowedModules.includes("work") ? "/admin/work" : "/admin";
  const current = activeStaffWorkLink(areas, pathname, search);
  const openArea = expanded?.locationKey === locationKey ? expanded.id : current?.area || (allowedModules !== null && areas.length === 1 ? areas[0].id : null);
  function prefetchOnIntent(event) {
    const anchor = event.target.closest("a[href]");
    if (!anchor || navigator.connection?.saveData) return;
    const url = new URL(anchor.href, window.location.origin);
    if (url.origin === window.location.origin && url.pathname.startsWith("/admin") && url.pathname !== pathname) {
      router.prefetch(url.pathname + url.search);
    }
  }
  const navigation = <>
    {allowedModules === null && <Link prefetch={false} href="/admin" aria-current={pathname === "/admin" ? "page" : undefined}><CalendarDays/><span>Hôm nay</span></Link>}
    {areas.map(({ id, label, icon: Icon, links }) => {
      const open = openArea === id;
      return <section key={id} className={styles.navArea}>
        <button type="button" aria-expanded={open} data-current={current?.area === id} onClick={() => setExpanded({ locationKey, id: open ? null : id })}>
          <Icon aria-hidden="true"/><span>{label}</span><ChevronDown aria-hidden="true"/>
        </button>
        {open && <ul>{links.map(item => <li key={item.href}>{item.external
          ? <a href={item.href} target="_blank" rel="noreferrer">{item.label}<ExternalLink aria-hidden="true"/></a>
          : <Link href={item.href} prefetch={false} aria-current={item.href === current?.href ? "page" : undefined}>
            {item.label}
          </Link>}</li>)}</ul>}
      </section>;
    })}
  </>;
  async function logout() {
    setLeaving(true); setError("");
    try {
      const { error: failure } = await createClient().auth.signOut();
      if (failure) throw failure;
      router.replace("/admin/login"); router.refresh();
    } catch { setError("Chưa đăng xuất được. Hãy thử lại."); setLeaving(false); }
  }
  return <StaffFeaturesContext.Provider value={{ partnerNetworkEnabled: partnerNetworkEnabled && (allowedModules === null || allowedModules.includes("partnerNetwork")), allowedModules }}><div className={styles.shell} data-staff-shell onPointerOver={prefetchOnIntent} onFocus={prefetchOnIntent}>
    <a href="#staff-content" className={styles.skip}>Đến nội dung công việc</a>
    <aside className={styles.sidebar} data-staff-navigation>
      <Link href={home} className={styles.brand}><span aria-hidden="true">皇龍</span><b>Hoàng Long<small>Bàn làm việc</small></b></Link>
      <nav aria-label="Điều hướng công việc" className={styles.desktop}>{navigation}</nav>
      <details ref={menu} className={styles.mobile} onKeyDown={event => { if(event.key === "Escape") { menu.current.open = false; menu.current.querySelector("summary").focus(); } }}>
        <summary aria-label={`Menu công việc · ${current?.label || "Hôm nay"}`}><Menu aria-hidden="true"/><span>{current?.label || "Hôm nay"}</span></summary>
        <nav aria-label="Điều hướng công việc trên điện thoại">{navigation}</nav>
      </details>
      <div className={styles.account}><button onClick={logout} disabled={leaving} aria-label="Đăng xuất"><LogOut/><span>{leaving ? "Đang đăng xuất…" : "Đăng xuất"}</span></button>{error && <p role="alert">{error}</p>}</div>
    </aside>
    <div id="staff-content" tabIndex={-1} className={styles.content}>
      {children}
    </div>
  </div></StaffFeaturesContext.Provider>;
}

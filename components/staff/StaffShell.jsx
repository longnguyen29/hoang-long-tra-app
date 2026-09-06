"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { CalendarDays, ExternalLink, LogOut, Menu } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { STAFF_APPS, STAFF_APP_GROUPS } from "./staff-navigation";
import styles from "./StaffShell.module.css";

export default function StaffShell({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const menu = useRef(null);
  const [leaving, setLeaving] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { if (menu.current) menu.current.open = false; }, [pathname]);
  if (pathname === "/admin/login" || pathname === "/admin/legacy") return children;
  const active = (href) => href === "/admin" ? pathname === href : pathname.startsWith(href.split("?")[0]);
  const current = Object.values(STAFF_APPS).find(app => active(app.href));
  const navigation = <>
    <Link href="/admin" aria-current={active("/admin") ? "page" : undefined}><CalendarDays/><span>Hôm nay</span></Link>
    {STAFF_APP_GROUPS.map(group => <section key={group.label}>
      <h2>{group.label}</h2>
      {group.keys.map(key => { const app = STAFF_APPS[key]; const Icon = app.icon;
        return <Link key={key} href={app.href} aria-current={active(app.href) ? "page" : undefined}><Icon/><span>{app.label}</span></Link>;
      })}
    </section>)}
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
  return <div className={styles.shell}>
    <a href="#staff-content" className={styles.skip}>Đến nội dung công việc</a>
    <aside className={styles.sidebar}>
      <Link href="/admin" className={styles.brand}><span aria-hidden="true">皇龍</span><b>Hoàng Long<small>Bàn làm việc</small></b></Link>
      <nav aria-label="Điều hướng công việc" className={styles.desktop}>{navigation}</nav>
      <details ref={menu} className={styles.mobile} onKeyDown={event => { if(event.key === "Escape") { menu.current.open = false; menu.current.querySelector("summary").focus(); } }}>
        <summary><Menu/><span>{current?.label || "Hôm nay"}</span></summary>
        <nav aria-label="Điều hướng công việc trên điện thoại">{navigation}</nav>
      </details>
      <div className={styles.account}><button onClick={logout} disabled={leaving} aria-label="Đăng xuất"><LogOut/><span>{leaving ? "Đang đăng xuất…" : "Đăng xuất"}</span></button>{error && <p role="alert">{error}</p>}</div>
    </aside>
    <div id="staff-content" tabIndex={-1} className={styles.content}>{children}</div>
  </div>;
}

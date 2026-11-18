"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, History } from "lucide-react";
import { recentStaffActivity } from "@/lib/recent-staff-activity";
import styles from "./MorningDesk.module.css";

const formatDate = new Intl.DateTimeFormat("vi-VN", {
  timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
});

export default function RecentStaffActivity({ records, loading, incomplete }) {
  const [expanded, setExpanded] = useState(false);
  const rows = recentStaffActivity(records);
  return <section className={styles.recentActivity} aria-labelledby="desk-recent-title">
    <header>
      <h2 id="desk-recent-title"><History size={19} aria-hidden="true"/> Gần đây</h2>
      {rows.length > 6 && <button type="button" aria-expanded={expanded} aria-controls="desk-recent-list"
        onClick={() => setExpanded(value => !value)}>{expanded ? "Thu gọn" : "Xem thêm"}</button>}
    </header>
    {rows.length > 0 ? <ul id="desk-recent-list">
      {rows.slice(0, expanded ? 24 : 6).map(row => <li key={row.id}>
        <Link href={row.href} prefetch={false}>
          <span><strong>{row.title}</strong><small>{row.type} · {row.action}</small></span>
          <time dateTime={row.at}>{formatDate.format(new Date(row.at))}</time>
          <ArrowUpRight size={17} aria-hidden="true"/>
        </Link>
      </li>)}
    </ul> : <p role="status">{loading ? "Đang tải hoạt động…" : incomplete ? "Chưa tải được hoạt động." : "Chưa có hoạt động nào để hiển thị."}</p>}
    {incomplete && rows.length > 0 && <p role="status">Một số hoạt động chưa tải được.</p>}
  </section>;
}

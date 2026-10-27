"use client";

import { useCallback, useEffect, useState } from "react";
import styles from "./MetaInsights.module.css";

const number = (value) => value == null ? "—" : new Intl.NumberFormat("vi-VN").format(value);
const money = (value) => value == null ? "—" : `${number(Math.round(value))} ₫`;
const when = (value) => value ? new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", dateStyle: "short", timeStyle: "short" }).format(new Date(value)) : "—";

export default function MetaInsights({ supabase }) {
  const [data, setData] = useState({ status: "loading" });
  const [loading, setLoading] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) { setData({ status: "unavailable" }); return; }
      const response = await fetch("/api/staff/meta-insights", { headers: { Authorization: `Bearer ${session.access_token}` }, cache: "no-store" });
      const next = await response.json();
      setData(response.ok && ["connected", "not_configured"].includes(next.status) ? next : { status: "unavailable" });
    } catch { setData({ status: "unavailable" }); }
    finally { setLoading(false); }
  }, [supabase]);
  useEffect(() => { load(); }, [load]);

  return <section className={styles.section} aria-labelledby="meta-insights-title">
    <header><div><p>Meta Ads · 7 ngày gần nhất</p><h2 id="meta-insights-title">Quảng cáo trà</h2></div><button type="button" onClick={load} disabled={loading}>{loading ? "Đang đọc…" : "Làm mới"}</button></header>
    {data.status === "loading" && <p role="status">Đang đọc kết quả từ Meta…</p>}
    {data.status === "not_configured" && <p role="status">Chưa kết nối số liệu Meta. Quản trị viên cần cấu hình quyền đọc quảng cáo trên máy chủ; số liệu website bên dưới vẫn hoạt động.</p>}
    {data.status === "unavailable" && <p role="status">Chưa đọc được số liệu từ Meta. Kiểm tra quyền truy cập quảng cáo và thử làm mới.</p>}
    {data.status === "connected" && <>
      <p className={styles.note}>Cập nhật {when(data.fetchedAt)} · Múi giờ tài khoản quảng cáo (giờ Việt Nam). Lead là sự kiện Pixel do Meta phân bổ theo cài đặt của nhóm quảng cáo; có thể khác số yêu cầu website và chưa phải đơn hàng.</p>
      {data.rows.length === 0 ? <p>Meta chưa có dữ liệu cho khoảng thời gian này.</p> : <div className={styles.cards}>{data.rows.map((ad) => <article key={ad.adId || ad.adName}>
        <div><h3>{ad.adName || "Quảng cáo"}</h3><small>{ad.adSetName}{ad.dateStart && ad.dateStop ? ` · ${ad.dateStart} – ${ad.dateStop}` : ""}</small></div>
        <dl><div><dt>Chi tiêu</dt><dd>{money(ad.spend)}</dd></div><div><dt>Hiển thị</dt><dd>{number(ad.impressions)}</dd></div><div><dt>Nhấp liên kết</dt><dd>{number(ad.linkClicks)}</dd></div><div><dt>Lead Pixel</dt><dd>{number(ad.pixelLeads)}</dd></div><div><dt>Chi phí / Lead</dt><dd>{money(ad.spend != null && ad.pixelLeads > 0 ? ad.spend / ad.pixelLeads : null)}</dd></div></dl>
      </article>)}</div>}
      <p className={styles.note}>“—” nghĩa là Meta không trả số liệu. Meta có thể cập nhật chậm; dữ liệu đọc lại được lưu tạm tối đa 5 phút.</p>
    </>}
    <a href="https://adsmanager.facebook.com/adsmanager/manage/ads?act=569279908663703&selected_campaign_ids=120251073471340262" target="_blank" rel="noreferrer">Mở báo cáo chi tiết trong Meta ↗</a>
  </section>;
}

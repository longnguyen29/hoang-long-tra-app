"use client";

import { useMemo, useState } from "react";
import { ArrowUpRight, Check, Copy, Download, FileText } from "lucide-react";
import { EXPORT_TEAS } from "@/lib/export-teas";
import { buildExportSalesKitHref } from "@/lib/export-sales-kit";
import styles from "./PartnerSalesKit.module.css";

const money = (value) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(value);

export default function PartnerSalesKit({ mode = "partner", partners = [], partner = null, disabled = false }) {
  const [teaIds, setTeaIds] = useState(() => EXPORT_TEAS.map((tea) => tea.id));
  const locale = "vi";
  const [currency, setCurrency] = useState("VND");
  const [partnerId, setPartnerId] = useState("");
  const [copyStatus, setCopyStatus] = useState("");
  const isManager = mode === "manager";
  const approved = useMemo(() => (Array.isArray(partners) ? partners : []).filter((row) => row.status === "approved" && typeof row.code === "string" && row.code), [partners]);
  const selectedPartner = isManager ? approved.find((row) => row.id === partnerId) : partner;
  const authorized = isManager || Boolean(partner?.status === "approved" && partner.code);
  let href = "";
  if (authorized && teaIds.length) {
    try { href = buildExportSalesKitHref({ teaIds, locale, currency, partnerCode: selectedPartner?.status === "approved" ? selectedPartner.code : undefined }); }
    catch { /* Keep sharing unavailable when a selection cannot be validated. */ }
  }
  const canShare = Boolean(href) && !disabled;
  const shareUrl = href ? `https://www.hoanglongtra.com${href}` : "";
  const selectedTeas = EXPORT_TEAS.filter((tea) => teaIds.includes(tea.id));
  const update = (setter, value) => { setter(value); setCopyStatus(""); };
  const toggleTea = (id, checked) => update(setTeaIds, checked ? [...teaIds, id] : teaIds.filter((value) => value !== id));
  const copy = async () => {
    if (!canShare) return;
    try { await navigator.clipboard.writeText(shareUrl); setCopyStatus("copied"); }
    catch { setCopyStatus("manual"); }
  };

  if (!authorized) return <section className={styles.panel}><h2>Bộ chào hàng</h2><p>Hoàng Long cần duyệt hồ sơ trước khi bạn tạo bộ chào hàng mang mã đối tác. Quyền gửi khách mới vẫn theo trạng thái hồ sơ.</p></section>;

  return <section className={styles.panel} aria-labelledby="partner-sales-kit-title" lang="vi" data-no-translate>
    <header className={styles.header}><p className={styles.eyebrow}>Partner Network · Đài Loan</p><h2 id="partner-sales-kit-title">Bộ chào hàng</h2><p>Chọn dòng trà và tiền tệ để gửi cho khách. Hồ sơ tiếng Việt gồm giá EXW, quy trình đặt hàng, mẫu thử, vùng nguyên liệu, nhà máy và liên hệ.</p></header>
    <div className={styles.workspace}>
      <div className={styles.controls}>
        {isManager ? <label className={styles.field}><span>Chia sẻ cho đối tác đã duyệt <small>Tuỳ chọn</small></span><select value={approved.some((row) => row.id === partnerId) ? partnerId : ""} disabled={disabled} onChange={(e) => update(setPartnerId, e.target.value)}><option value="">Xem trước chung · không chọn đối tác</option>{approved.map((row) => <option key={row.id} value={row.id}>{row.business_name} · {row.code}</option>)}</select><small>Chỉ lấy mã của đối tác đã được duyệt. Tên và thông tin liên hệ đối tác không đưa vào trang khách xem.</small></label> : <div className={styles.owner}><span>Mã đối tác của bạn</span><strong>{partner.code}</strong></div>}
        <fieldset className={styles.teas} disabled={disabled}><legend>Dòng trà trong bộ chào hàng</legend>{EXPORT_TEAS.map((tea) => <label key={tea.id}><input type="checkbox" checked={teaIds.includes(tea.id)} onChange={(e) => toggleTea(tea.id, e.target.checked)}/><span><strong>{tea.name.vi}</strong><small>{money(tea.priceVndPerKg)} / kg · EXW</small></span></label>)}</fieldset>
        {!teaIds.length && <p className={styles.warning} role="status">Chọn ít nhất một dòng trà để tạo bộ chào hàng.</p>}
        <label className={styles.field}><span>Tiền tệ hiển thị</span><select value={currency} disabled={disabled} onChange={(e) => update(setCurrency, e.target.value)}><option value="TWD">TWD · Đài tệ (NT$)</option><option value="USD">USD · Đô la Mỹ</option><option value="CNY">CNY · Nhân dân tệ</option><option value="VND">VND · Việt Nam đồng</option></select></label>
      </div>
      <aside className={styles.preview}>
        <h3>Sẵn sàng gửi khách</h3><ul>{selectedTeas.map((tea) => <li key={tea.id}>{tea.name[locale]}</li>)}</ul>
        <p>{selectedPartner ? <>Mã nguồn giới thiệu: <strong>{selectedPartner.code}</strong></> : "Bản chung để xem trước, chưa kèm mã đối tác."}</p>
        <div className={styles.actions}>{canShare ? <a className={styles.primary} href={href} target="_blank" rel="noopener noreferrer">Mở bộ chào hàng<ArrowUpRight size={17} aria-hidden="true"/></a> : <button className={styles.primary} type="button" disabled>Mở bộ chào hàng<ArrowUpRight size={17} aria-hidden="true"/></button>}<button type="button" disabled={!canShare} onClick={copy}>{copyStatus === "copied" ? <Check size={17} aria-hidden="true"/> : <Copy size={17} aria-hidden="true"/>}{copyStatus === "copied" ? "Đã sao chép link" : "Sao chép link gửi khách"}</button></div>
        {copyStatus === "copied" && <p className={styles.feedback} role="status">Đã sao chép. Bạn kiểm tra rồi tự gửi link cho khách qua LINE, email hoặc kênh đang trao đổi.</p>}
        {copyStatus === "manual" && <label className={styles.field}><span>Chọn và sao chép link thủ công</span><textarea rows={4} readOnly value={shareUrl} onFocus={(e) => e.target.select()}/></label>}
        <div className={styles.print}><FileText size={18} aria-hidden="true"/><div><strong>PDF để gửi ngay</strong><p>Tải hồ sơ tổng quan tiếng Việt gồm cả 4 dòng trà, giá gốc VND và quy trình hợp tác.</p><a className={styles.pdf} href="/downloads/hoang-long-b2b-sales-kit-vi.pdf" download><Download size={17} aria-hidden="true"/>PDF tổng quan · 4 dòng trà</a><p>Muốn PDF chỉ gồm dòng trà đã chọn: mở bộ chào hàng, bấm “In / lưu PDF” rồi chọn Lưu thành PDF. Bản in dùng đúng lựa chọn trà và tiền tệ trên trang.</p></div></div>
      </aside>
    </div>
    <footer className={styles.notice}><strong>Sau khi khách quan tâm</strong><p>Đăng ký khách được phép liên hệ tại mục “Khách giới thiệu”. Hoàng Long đối chiếu hồ sơ và tiếp tục mẫu → báo giá → đơn hàng trong quy trình hiện có.</p><p>Mã trong link giúp Hoàng Long đối chiếu nguồn giới thiệu. Khách và điều kiện hoa hồng được xác nhận trong Partner Network trước khi đối soát.</p></footer>
  </section>;
}

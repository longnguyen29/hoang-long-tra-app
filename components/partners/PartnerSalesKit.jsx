"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, Check, Copy, Download, FileText } from "lucide-react";
import { EXPORT_TEAS } from "@/lib/export-teas";
import { buildExportSalesKitHref } from "@/lib/export-sales-kit";
import { EXPORT_SALES_PROFILES, getExportSalesProfile } from "@/lib/export-sales-profiles";
import { buildPartnerSalesPageHref, parsePublicPartnerSalesPage, partnerSalesPageProfile } from "@/lib/partner-sales-page";
import styles from "./PartnerSalesKit.module.css";

const money = (value) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(value);

export default function PartnerSalesKit({ mode = "partner", partners = [], partner = null, salesPages = [], salesPage = null, disabled = false }) {
  const [teaIds, setTeaIds] = useState(() => EXPORT_TEAS.map((tea) => tea.id));
  const locale = "vi";
  const [currency, setCurrency] = useState("VND");
  const [partnerId, setPartnerId] = useState("");
  const [profileId, setProfileId] = useState("house");
  const [copyStatus, setCopyStatus] = useState("");
  const isManager = mode === "manager";
  const approved = useMemo(() => (Array.isArray(partners) ? partners : []).filter((row) => row.status === "approved" && typeof row.code === "string" && row.code), [partners]);
  const selectedPartner = isManager ? approved.find((row) => row.id === partnerId) : partner;
  const boundPage = isManager ? salesPages.find(row => row.partner_id === selectedPartner?.id && row.published === true) : selectedPartner?.status === "approved" && salesPage?.published !== false ? salesPage : null;
  const publicPage = parsePublicPartnerSalesPage(boundPage);
  const profile = publicPage ? partnerSalesPageProfile(publicPage) : getExportSalesProfile(isManager ? profileId : "house");
  const availableTeas = EXPORT_TEAS.filter(tea => !publicPage || publicPage.tea_ids.includes(tea.id));
  const pageKey = publicPage?.slug || "common";
  const allowedKey = availableTeas.map(tea => tea.id).join(",");
  useEffect(() => { setTeaIds(allowedKey.split(",")); setCopyStatus(""); }, [pageKey, allowedKey]);
  const selectedIds = teaIds.filter(id => availableTeas.some(tea => tea.id === id));
  const authorized = isManager || Boolean(partner?.status === "approved" && partner.code);
  let href = "";
  if (authorized && selectedIds.length) {
    try { href = publicPage ? buildPartnerSalesPageHref({ salesPage: publicPage, teaIds: selectedIds, currency }) : buildExportSalesKitHref({ teaIds: selectedIds, locale, currency, profileId: profile?.id, partnerCode: selectedPartner?.status === "approved" ? selectedPartner.code : undefined }); }
    catch { /* Keep sharing unavailable when a selection cannot be validated. */ }
  }
  const canShare = Boolean(href) && !disabled;
  const shareUrl = href ? `https://www.hoanglongtra.com${href}` : "";
  const selectedTeas = availableTeas.filter((tea) => selectedIds.includes(tea.id));
  const update = (setter, value) => { setter(value); setCopyStatus(""); };
  const toggleTea = (id, checked) => update(setTeaIds, checked ? [...teaIds, id] : teaIds.filter((value) => value !== id));
  const copy = async () => {
    if (!canShare) return;
    try { await navigator.clipboard.writeText(shareUrl); setCopyStatus("copied"); }
    catch { setCopyStatus("manual"); }
  };

  if (!authorized) return <section className={styles.panel}><h2>Bộ chào hàng</h2><p>Hoàng Long cần duyệt hồ sơ trước khi bạn tạo bộ chào hàng mang mã đối tác. Quyền gửi khách mới vẫn theo trạng thái hồ sơ.</p></section>;

  return <section className={styles.panel} aria-labelledby="partner-sales-kit-title" lang="vi" data-no-translate>
    <header className={styles.header}><p className={styles.eyebrow}>Hoàng Long · Đối tác B2B</p><h2 id="partner-sales-kit-title">Bộ chào hàng</h2><p>Chọn dòng trà, tiền tệ và liên hệ trên tài liệu, rồi gửi link hoặc PDF để trao đổi với khách.</p></header>
    <div className={styles.workspace}>
      <div className={styles.controls}>
        {isManager ? <><label className={styles.field}><span>Đối tác giới thiệu <small>Tuỳ chọn</small></span><select value={approved.some((row) => row.id === partnerId) ? partnerId : ""} disabled={disabled} onChange={(e) => update(setPartnerId, e.target.value)}><option value="">Bộ chào hàng chung</option>{approved.map((row) => <option key={row.id} value={row.id}>{row.business_name} · {row.code}</option>)}</select><small>Trang riêng đã mở sẽ được dùng khi chọn đúng hồ sơ.</small></label>{!publicPage && <label className={styles.field}><span>Liên hệ trên tài liệu</span><select value={profileId} disabled={disabled} onChange={(e) => update(setProfileId, e.target.value)}>{EXPORT_SALES_PROFILES.map(row => <option key={row.id} value={row.id}>{row.contact ? `${row.contact.name} · ${row.contact.phoneLabel}` : "Hoàng Long · bản chung"}</option>)}</select><small>Liên hệ trên bản chung chỉ để trao đổi; không tự xác nhận nguồn hoa hồng.</small></label>}</> : <div className={styles.owner}><span>Mã đối tác của bạn</span><strong>{partner.code}</strong></div>}
        {publicPage ? <div className={styles.owner}><span>Trang giới thiệu riêng</span><strong>{publicPage.display_name} · {publicPage.phone}</strong><small>{publicPage.region}</small></div> : <p className={styles.warning}>Chưa gắn trang riêng với hồ sơ này. Link hiện tại là bộ chào hàng chung; nguồn khách cần được đăng ký và đối chiếu tại “Khách giới thiệu”.</p>}
        <fieldset className={styles.teas} disabled={disabled}><legend>Dòng trà trong bộ chào hàng</legend>{availableTeas.map((tea) => <label key={tea.id}><input type="checkbox" checked={selectedIds.includes(tea.id)} onChange={(e) => toggleTea(tea.id, e.target.checked)}/><span><strong>{tea.name.vi}</strong><small>{money(tea.priceVndPerKg)} / kg · EXW</small></span></label>)}</fieldset>
        {!selectedIds.length && <p className={styles.warning} role="status">Chọn ít nhất một dòng trà để tạo bộ chào hàng.</p>}
        <label className={styles.field}><span>Tiền tệ hiển thị</span><select value={currency} disabled={disabled} onChange={(e) => update(setCurrency, e.target.value)}><option value="TWD">TWD · Đài tệ (NT$)</option><option value="USD">USD · Đô la Mỹ</option><option value="CNY">CNY · Nhân dân tệ</option><option value="VND">VND · Việt Nam đồng</option></select></label>
      </div>
      <aside className={styles.preview}>
        <h3>Tài liệu gửi khách</h3><ul>{selectedTeas.map((tea) => <li key={tea.id}>{tea.name[locale]}</li>)}</ul>
        {profile?.contact && <p>Liên hệ: <strong>{profile.contact.name} · {profile.contact.phoneLabel}</strong>, cạnh Hoàng Long.</p>}
        <p>{publicPage ? "Yêu cầu gửi từ trang sẽ ghi nguồn đối tác và chờ Hoàng Long kiểm tra trước khi xác nhận." : selectedPartner ? <>Mã đối chiếu: <strong>{selectedPartner.code}</strong> · chưa phải trang ghi nhận giới thiệu tự động.</> : "Bản chung để xem trước, chưa kèm nguồn đối tác."}</p>
        <div className={styles.actions}>{canShare ? <a className={styles.primary} href={href} target="_blank" rel="noopener noreferrer">Mở bộ chào hàng<ArrowUpRight size={17} aria-hidden="true"/></a> : <button className={styles.primary} type="button" disabled>Mở bộ chào hàng<ArrowUpRight size={17} aria-hidden="true"/></button>}<button type="button" disabled={!canShare} onClick={copy}>{copyStatus === "copied" ? <Check size={17} aria-hidden="true"/> : <Copy size={17} aria-hidden="true"/>}{copyStatus === "copied" ? "Đã sao chép link" : "Sao chép link gửi khách"}</button></div>
        {copyStatus === "copied" && <p className={styles.feedback} role="status">Đã sao chép link để gửi khách.</p>}
        {copyStatus === "manual" && <label className={styles.field}><span>Chọn và sao chép link thủ công</span><textarea rows={4} readOnly value={shareUrl} onFocus={(e) => e.target.select()}/></label>}
        <div className={styles.print}><FileText size={18} aria-hidden="true"/><div><strong>{publicPage ? "PDF riêng từ trang của đối tác" : "PDF để gửi ngay"}</strong><p>{publicPage ? "Mở trang rồi bấm “In / lưu PDF” để giữ đúng tên, điện thoại, dòng trà và tiền tệ đang chọn." : `Tổng quan 4 dòng trà, giá gốc VND và quy trình hợp tác${profile?.contact ? `, kèm liên hệ ${profile.contact.name}` : ""}.`}</p><a className={styles.pdf} href={profile?.pdf || EXPORT_SALES_PROFILES[0].pdf} download><Download size={17} aria-hidden="true"/>{publicPage ? "PDF Hoàng Long · bản chung, không kèm liên hệ riêng" : "PDF tổng quan · 4 dòng trà"}</a>{!publicPage && <p>Để lưu các dòng trà và tiền tệ đang chọn: mở bộ chào hàng, bấm “In / lưu PDF” rồi chọn Lưu thành PDF.</p>}</div></div>
      </aside>
    </div>
    <footer className={styles.notice}><strong>Khi khách quan tâm</strong><p>{publicPage ? "Khách gửi nhu cầu trên trang riêng; bạn xem tiến triển tại “Khách giới thiệu”. Hoàng Long kiểm tra khách trùng trước khi xác nhận nguồn giới thiệu." : "Gửi nhu cầu qua biểu mẫu trên trang, rồi đăng ký tại “Khách giới thiệu” để đối chiếu nguồn đối tác."} Chỉ chuyển thông tin khách đã cho phép liên hệ.</p><p>Mẫu → báo giá → đơn hàng tiếp tục trong luồng hiện có. Hoa hồng tạm tính, được duyệt và đã chi trả được ghi nhận riêng.</p></footer>
  </section>;
}

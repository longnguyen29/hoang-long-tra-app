"use client";

import { useMemo, useState } from "react";
import { ArrowUpRight, Save } from "lucide-react";
import { EXPORT_TEAS } from "@/lib/export-teas";
import { normalizePartnerSalesPageInput } from "@/lib/partner-sales-page";
import styles from "./PartnerSalesPageEditor.module.css";

function suggestedSlug(name) {
  return String(name || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 64).replace(/-+$/g, "");
}

function PageForm({ partner, page, disabled, onAction }) {
  const [form, setForm] = useState(() => ({
    expected_revision: page?.revision ?? 0,
    slug: page?.slug || suggestedSlug(partner.contact_name), display_name: page?.display_name || partner.contact_name || "",
    phone: page?.phone || partner.phone || "", region: page?.region || partner.region || "",
    tea_ids: page?.tea_ids || EXPORT_TEAS.map(tea => tea.id), published: page?.published === true, content_reviewed: false, reason: "",
  }));
  const [error, setError] = useState("");
  const change = (field, value) => { setError(""); setForm(current => ({ ...current, [field]: value, ...(!["content_reviewed", "reason"].includes(field) ? { content_reviewed: false } : {}) })); };
  async function submit(event) {
    event.preventDefault();
    if (disabled) return;
    const result = normalizePartnerSalesPageInput(form);
    if (!result.ok) { setError(result.error); return; }
    await onAction("partner_network_manage_sales_page", { p_partner_id: partner.id, p_input: result.data }, form.published ? "Đã lưu trang giới thiệu và mở theo link riêng." : "Đã lưu trang ở trạng thái chưa hiển thị.");
  }
  return <form className={styles.form} onSubmit={submit}>
    <fieldset disabled={disabled}>
      <div className={styles.identity}><strong>{partner.business_name}</strong><span>{page?.published ? "Đang hiển thị qua link" : page ? "Chưa hiển thị" : "Chưa có trang giới thiệu"}</span></div>
      <div className={styles.grid}>
        <label className={styles.field}>Tên hiển thị cho khách<input required maxLength={100} value={form.display_name} onChange={e => change("display_name", e.target.value)} autoComplete="off"/></label>
        <label className={styles.field}>Điện thoại hiển thị<input required type="tel" maxLength={40} value={form.phone} onChange={e => change("phone", e.target.value)} autoComplete="off"/></label>
        <label className={styles.field}>Tên đường dẫn<input required minLength={3} maxLength={64} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" readOnly={Boolean(page?.reviewed_at)} value={form.slug} onChange={e => change("slug", e.target.value)} autoComplete="off" spellCheck={false}/><small>www.hoanglongtra.com/doi-tac/{form.slug || "ten-doi-tac"}</small>{page?.reviewed_at && <small>Đường dẫn được giữ cố định để link và mã QR đã gửi tiếp tục dùng được.</small>}</label>
        <label className={styles.field}>Khu vực hợp tác<input required maxLength={160} value={form.region} onChange={e => change("region", e.target.value)} autoComplete="off"/></label>
      </div>
      <div className={styles.teas}><p>Dòng trà được chào trên trang</p>{EXPORT_TEAS.map(tea => <label key={tea.id}><input type="checkbox" checked={form.tea_ids.includes(tea.id)} onChange={e => change("tea_ids", e.target.checked ? [...form.tea_ids, tea.id] : form.tea_ids.filter(id => id !== tea.id))}/><span>{tea.name.vi}</span></label>)}</div>
      <label className={styles.check}><input type="checkbox" checked={form.published} onChange={e => change("published", e.target.checked)}/><span><strong>Cho phép xem qua link riêng</strong><small>Khách có link xem trang và gửi nhu cầu. Tắt để ngừng nhận yêu cầu mới; lịch sử đã nhận vẫn được giữ.</small></span></label>
      {form.published && <label className={styles.check}><input type="checkbox" required checked={form.content_reviewed} onChange={e => change("content_reviewed", e.target.checked)}/><span>Tôi đã kiểm tra tên, điện thoại và có sự đồng ý để công khai những thông tin này trên trang giới thiệu.</span></label>}
      <label className={styles.field}>Lý do tạo / cập nhật<textarea required maxLength={1000} rows={2} value={form.reason} onChange={e => change("reason", e.target.value)} placeholder="Ví dụ: mở trang riêng cho thử nghiệm với khách đã được giới thiệu."/></label>
      {error && <p className={styles.error} role="alert">{error}</p>}
      <div className={styles.actions}><button type="submit"><Save size={17} aria-hidden="true"/>{disabled ? "Đang lưu…" : form.published ? "Lưu & mở trang" : "Lưu chưa hiển thị"}</button>{page?.published && <a href={`/doi-tac/${page.slug}`} target="_blank" rel="noopener noreferrer">Xem trang hiện tại<ArrowUpRight size={17} aria-hidden="true"/></a>}</div>
    </fieldset>
    <p className={styles.note}>Yêu cầu từ trang được lưu vào Pipeline hiện có, kèm nguồn đối tác để quản lý kiểm tra. Mở trang không tự xác nhận quyền hưởng hoa hồng cho khách trùng.</p>
  </form>;
}

export default function PartnerSalesPageEditor({ partners = [], salesPages = [], busy = false, ready = false, onAction }) {
  const [partnerId, setPartnerId] = useState("");
  const approved = useMemo(() => partners.filter(partner => partner.status === "approved"), [partners]);
  const selected = approved.find(partner => partner.id === partnerId);
  const page = selected ? salesPages.find(row => row.partner_id === selected.id) : null;
  return <section className={styles.panel} aria-labelledby="partner-sales-page-editor-title">
    <header><p className={styles.eyebrow}>Trang giới thiệu riêng</p><h2 id="partner-sales-page-editor-title">Một trang cho mỗi đối tác.</h2><p>Tên và điện thoại xuất hiện cạnh Hoàng Long. Khách gửi nhu cầu tại đây; đối tác theo dõi phần việc của mình trong bàn đối tác.</p></header>
    {!approved.length ? <p className={styles.empty}>Duyệt hồ sơ đối tác trước khi tạo trang. Trang Anh Long hiện có vẫn là bản giới thiệu riêng, chưa gắn với tài khoản đối tác.</p> : <><label className={styles.field}>Chọn đối tác đã duyệt<select value={partnerId} disabled={busy || !ready} onChange={e => setPartnerId(e.target.value)}><option value="">Chọn hồ sơ để tạo hoặc sửa trang</option>{approved.map(partner => <option key={partner.id} value={partner.id}>{partner.contact_name} · {partner.business_name}</option>)}</select></label>{selected && <PageForm key={`${selected.id}-${page?.revision || "new"}-${page?.published || false}`} partner={selected} page={page} disabled={busy || !ready} onAction={onAction}/>}</>}
  </section>;
}

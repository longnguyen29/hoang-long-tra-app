"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, ChevronDown, RefreshCw, Search, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import PartnerSalesKit from "@/components/partners/PartnerSalesKit";
import PartnerSalesPageEditor from "@/components/partners/PartnerSalesPageEditor";
import PartnerOrderUpdateEditor from "@/components/partners/PartnerOrderUpdateEditor";
import PartnerQuoteDesk from "@/components/partners/PartnerQuoteDesk";
import PartnerRewardsDesk from "@/components/partners/PartnerRewardsDesk";
import PartnerRetailShare from "@/components/partners/PartnerRetailShare";
import { currentClassicAgreement } from "@/lib/partner-classic-display";
import PartnerInvitePanel from "@/components/partners/PartnerInvitePanel";
import CommissionCostStatement from "@/components/partners/CommissionCostStatement";
import {
  PARTNER_TYPES, PARTNER_STATUS, REFERRAL_STATUS, COMMISSION_STATUS,
  formatPartnerMoney, partnerErrorMessage, partnerStageLabel, commissionBasisLabel,
} from "@/lib/partner-network";
import { PARTNER_COMMISSION_TIERS, applyCommissionTier, getCommissionTier } from "@/lib/partner-commission-tiers";
import styles from "./PartnerNetworkDesk.module.css";

const PAGE_SIZE = 20;
const when = value => {
  const date = new Date(value);
  return value && Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh" }).format(date)
    : "—";
};
const reference = id => String(id || "").slice(0, 8).toUpperCase();
const label = (list, value) => Array.isArray(list)
  ? list.find(item => (item.id || item.value) === value)?.label || value || "—"
  : list[value]?.label || list[value] || value || "—";
const text = (form, key) => String(form.get(key) || "").trim();
const number = (form, key) => Number(form.get(key));
const normalized = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[đĐ]/g, "d").toLowerCase();
const money = value => formatPartnerMoney(Number(value) || 0);
const latestValue = (row, key, previousKey) => row && Object.hasOwn(row, key) ? row[key] : row?.[previousKey];
function auditDescription(item) {
  const entity = ({ partner_network_partners: "đối tác", partner_network_referrals: "khách giới thiệu", partner_network_order_links: "liên kết đơn hàng", partner_network_commissions: "hoa hồng", partner_network_order_reviews: "đối soát đơn" })[item.entity] || "hồ sơ";
  const row = item.after_data || {};
  const changedStatus = row.status && row.status !== item.before_data?.status;
  const action = changedStatus ? label(item.entity === "partner_network_partners" ? PARTNER_STATUS : item.entity === "partner_network_referrals" ? REFERRAL_STATUS : COMMISSION_STATUS, row.status) : item.action === "insert" ? "Tạo mới" : "Cập nhật";
  const reasons = [row.review_reason, row.resolution_reason, row.reason, row.review_note, row.adjustment_reason, row.exception_reason, row.void_reason].filter(Boolean);
  return { title: `${action} · ${entity}`, note: [...new Set(reasons)].join(" · "), actor: item.actor_id ? reference(item.actor_id) : "Hệ thống" };
}

function Chip({ status, children }) {
  return <span className={styles.chip} data-status={status}>{children}</span>;
}

function Field({ children, label: title, hint, wide = false }) {
  return <label className={wide ? styles.wideField : styles.field}><span>{title}</span>{children}{hint && <small>{hint}</small>}</label>;
}

function OrderInput({ orders, name = "order_id", id, defaultValue = "", onChange, readOnly = false }) {
  return <Field label="Mã đơn hàng" hint="Chọn đơn gợi ý hoặc dán mã đầy đủ từ hồ sơ đơn hàng.">
    <input name={name} list={id} required maxLength="120" defaultValue={defaultValue} autoComplete="off" onChange={onChange} readOnly={readOnly} />
    <datalist id={id}>{orders.map(order => <option key={order.id} value={order.id}>{order.customer_name || "Khách hàng"} · {reference(order.id)} · đã thu {money(order.collected)}</option>)}</datalist>
  </Field>;
}

export function PartnerCard({ partner, classicAgreement, busy, ready, onAction }) {
  const [action, setAction] = useState(partner.status === "pending" ? "approve" : "update");
  const firstRate = partner.first_order_rate_percent ?? partner.default_rate_percent ?? partner.rate_percent;
  const [rates, setRates] = useState(() => ({ commission_basis: partner.commission_basis ?? "revenue", first_order_rate_percent: firstRate ?? "", repeat_rate_percent: partner.repeat_rate_percent ?? "", repeat_order_limit: partner.repeat_order_limit ?? 0 }));
  const [tier, setTier] = useState("custom");
  useEffect(() => {
    setRates({ commission_basis: partner.commission_basis ?? "revenue", first_order_rate_percent: firstRate ?? "", repeat_rate_percent: partner.repeat_rate_percent ?? "", repeat_order_limit: partner.repeat_order_limit ?? 0 });
    setTier("custom");
  }, [partner.id, partner.commission_basis, firstRate, partner.repeat_rate_percent, partner.repeat_order_limit]);
  const basisAgreementChanged = ["approve", "update"].includes(action) && partner.approved_at && rates.commission_basis !== (partner.commission_basis ?? "revenue");
  const editRate = (key, value) => { setRates(current => ({ ...current, [key]: value })); setTier("custom"); };
  const chooseTier = id => { setRates(current => applyCommissionTier(id, current)); setTier(id); };
  async function submit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const rate = text(form, "rate");
    const input = { reason: text(form, "reason") };
    if (["approve", "update"].includes(action)) Object.assign(input, {
      commission_basis: text(form, "commission_basis"),
      default_rate_percent: rate === "" ? null : Number(rate), first_order_rate_percent: rate === "" ? null : Number(rate),
      repeat_rate_percent: text(form, "repeat_rate") === "" ? null : number(form, "repeat_rate"),
      repeat_order_limit: number(form, "repeat_order_limit"), terms: text(form, "terms"),
    });
    if (action === "update") Object.assign(input, {
      business_name: text(form, "business_name"), contact_name: text(form, "contact_name"),
      phone: text(form, "phone"), region: text(form, "region"), partner_type: text(form, "partner_type") || partner.partner_type,
    });
    await onAction("partner_network_manage_partner", { p_id: partner.id, p_action: action, p_input: input }, "Đã cập nhật đối tác.");
  }
  return <details className={styles.record}>
    <summary><div><small>{partner.code || "Chờ cấp mã"} · {label(PARTNER_TYPES, partner.partner_type)}</small><h3>{partner.business_name}</h3><p>{partner.contact_name} · {partner.region || "Chưa ghi khu vực"}</p></div><span className={styles.summaryEnd}><Chip status={partner.status}>{label(PARTNER_STATUS, partner.status)}</Chip><ChevronDown aria-hidden="true" /></span></summary>
    <div className={styles.recordBody}>
      {classicAgreement && <p className={styles.note}><strong>{classicAgreement.tier_name || "Classic"}</strong> · {classicAgreement.first_rate}% lãi cho hai đơn đủ điều kiện đầu, {classicAgreement.repeat_rate}% từ đơn thứ ba. Hiệu lực {when(classicAgreement.effective_at)}; chỉ các đơn được xác nhận do đối tác mang về. Điều kiện trước đây bên dưới được giữ cho lịch sử.</p>}
      {!classicAgreement && partner.status === "approved" && <p className={styles.note}>Chưa áp dụng Classic. Mở mục “Chính sách & thưởng” để chốt 1% lãi cho hai đơn đầu, 2% từ đơn thứ ba hoặc một hạng đã được duyệt. Các thỏa thuận đang có được giữ nguyên.</p>}
      <dl className={styles.facts}><div><dt>Email đăng nhập</dt><dd>{partner.email}</dd></div><div><dt>Điện thoại</dt><dd>{partner.phone || "—"}</dd></div><div><dt>Đăng ký</dt><dd>{when(partner.created_at)}</dd></div><div><dt>Cơ sở tỷ lệ đã lưu</dt><dd>{commissionBasisLabel(partner.commission_basis)}</dd></div><div><dt>Hoa hồng đơn đầu</dt><dd>{firstRate == null ? "Chưa thỏa thuận" : `${firstRate}%`}</dd></div><div><dt>Hoa hồng đơn tiếp theo</dt><dd>{Number(partner.repeat_order_limit) > 0 && partner.repeat_rate_percent != null ? `${partner.repeat_rate_percent}% · tối đa ${partner.repeat_order_limit} đơn tiếp theo` : "Chưa áp dụng cho đơn tiếp theo"}</dd></div></dl>
      {partner.notes && <p className={styles.note}>{partner.notes}</p>}
      {partner.review_reason && <p className={styles.note}><strong>Ghi chú xét duyệt:</strong> {partner.review_reason}</p>}
      {partner.status === "approved" && <Link className={styles.reviewButton} href={`/admin/documents?partner=${encodeURIComponent(partner.id)}`}>Soạn thỏa thuận hoa hồng</Link>}
      <form onSubmit={submit} className={styles.form}>
        <h4>Xét duyệt / quản lý đối tác</h4><p className={styles.help}>Muốn sửa thông tin liên hệ, chọn “Cập nhật hồ sơ / điều kiện”. Sau khi duyệt, chốt Classic hoặc hạng tại mục “Chính sách & thưởng”; không ghi đè điều kiện cũ.</p>
        <div className={styles.formGrid}>
          <Field label="Thao tác"><select value={action} onChange={event => setAction(event.target.value)}>
            <option value="update">Cập nhật hồ sơ / điều kiện</option><option value="approve">Duyệt đối tác</option><option value="reject">Từ chối đăng ký</option><option value="disable">Tạm ngừng đối tác</option>
          </select></Field>
          {["approve", "update"].includes(action) && <><Field label="Thỏa thuận riêng / điều kiện trước Classic" wide hint="Chỉ điền các ô đang sửa. Chưa tạo quyền hưởng; cần kiểm tra, ghi lý do và bấm Lưu / Duyệt. Các khoản đã đối soát hoặc chi trả không tự thay đổi."><select value={tier} onChange={event => chooseTier(event.target.value)} disabled={busy || !ready}>{PARTNER_COMMISSION_TIERS.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select><small>{getCommissionTier(tier)?.description}</small></Field>
          <Field label="Cơ sở tính hoa hồng" wide hint="Mẫu gợi ý mới tính trên lãi sau toàn bộ chi phí, trước hoa hồng. Chính sách doanh thu đã có được giữ nguyên cho đến khi bạn đổi, ghi lý do và lưu."><select name="commission_basis" value={rates.commission_basis} onChange={event => editRate("commission_basis", event.target.value)} disabled={busy || !ready}><option value="profit">Lãi sau toàn bộ chi phí, trước hoa hồng</option><option value="revenue">Doanh thu thực thu đủ điều kiện</option></select></Field>
          <Field label="Hoa hồng đơn đầu (%)" hint="Để trống nếu chưa thỏa thuận; mức gợi ý vẫn cần đối soát tiền thực thu và kiểm tra lợi nhuận."><input name="rate" type="number" min="0" max="100" step="0.0001" value={rates.first_order_rate_percent ?? ""} onChange={event => editRate("first_order_rate_percent", event.target.value)} disabled={busy || !ready} /></Field>
          <Field label="Hoa hồng đơn tiếp theo (%)" hint="Để trống nếu chưa thỏa thuận hoa hồng tái đặt hàng."><input name="repeat_rate" type="number" min="0" max="100" step="0.0001" value={rates.repeat_rate_percent ?? ""} onChange={event => editRate("repeat_rate_percent", event.target.value)} disabled={busy || !ready} /></Field>
          <Field label="Số đơn tiếp theo tối đa" hint="0 = không hưởng hoa hồng tái mua. Giới hạn theo số đơn, chưa có tự động hết hạn theo tháng."><input name="repeat_order_limit" type="number" min="0" max="30" step="1" required value={rates.repeat_order_limit ?? ""} onChange={event => editRate("repeat_order_limit", event.target.value)} disabled={busy || !ready} /></Field></>}
          {action === "update" && <><Field label="Tên đơn vị"><input readOnly={action !== "update"} name="business_name" required maxLength="160" defaultValue={partner.business_name || ""} /></Field>
          <Field label="Người liên hệ"><input readOnly={action !== "update"} name="contact_name" required maxLength="100" defaultValue={partner.contact_name || ""} /></Field>
          <Field label="Điện thoại"><input readOnly={action !== "update"} name="phone" type="tel" required maxLength="30" defaultValue={partner.phone || ""} /></Field>
          <Field label="Khu vực"><input readOnly={action !== "update"} name="region" required maxLength="120" defaultValue={partner.region || ""} /></Field>
          <Field label="Loại đối tác"><select disabled={action !== "update"} name="partner_type" defaultValue={partner.partner_type}>{PARTNER_TYPES.map(type => <option key={type.id} value={type.id}>{type.label}</option>)}</select></Field></>}
          {["approve", "update"].includes(action) && <Field label="Điều kiện hợp tác" wide><textarea name="terms" rows="3" maxLength="2000" defaultValue={partner.terms || ""} /></Field>}
          <Field label="Lý do / ghi chú cho thao tác này" wide hint={basisAgreementChanged ? "Đổi cơ sở đã thỏa thuận cần lý do ít nhất 10 ký tự." : undefined}><textarea name="reason" required minLength={basisAgreementChanged ? 10 : 1} rows="2" maxLength="1000" /></Field>
        </div>
        <p className={styles.help}>Duyệt mới cấp mã đối tác. Tài khoản dùng đúng email đăng ký mới xem được hồ sơ của mình.</p>
        <button className={action === "reject" || action === "disable" ? styles.dangerButton : styles.primary} disabled={busy || !ready} type="submit">{busy ? "Đang lưu…" : ({ approve: "Duyệt đối tác", update: "Lưu thay đổi", reject: "Từ chối đăng ký", disable: "Tạm ngừng đối tác" })[action]}</button>
      </form>
    </div>
  </details>;
}

export function ReferralCard({ referral, partner, orders, busy, ready, onAction }) {
  const [action, setAction] = useState("accept");
  const duplicates = Array.isArray(referral.duplicates) ? referral.duplicates : [];
  async function resolve(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const input = { reason: text(form, "reason") };
    const opportunity = text(form, "opportunity_id");
    if (opportunity && action === "accept") input.opportunity_id = opportunity;
    await onAction("partner_network_resolve_lead", { p_id: referral.id, p_action: action, p_input: input }, action === "accept" ? "Đã nhận khách vào hồ sơ bán hàng." : "Đã từ chối giới thiệu khách.");
  }
  async function linkOrder(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await onAction("partner_network_link_order", { p_referral_id: referral.id, p_order_id: text(form, "order_id"), p_reason: text(form, "reason") }, "Đã liên kết đơn hàng với giới thiệu.");
  }
  return <details className={styles.record}>
    <summary><div><small>{partner?.code || reference(referral.partner_id)} · {partner?.business_name || "Đối tác"}</small><h3>{referral.business_name}</h3><p>{referral.channel === "b2c" ? "Bán lẻ · " : "B2B · "}{referral.location || "Chưa ghi địa điểm"} · {when(referral.created_at)}</p></div><span className={styles.summaryEnd}><Chip status={referral.status}>{label(REFERRAL_STATUS, referral.status)}</Chip>{duplicates.length > 0 && referral.status === "pending" && <span className={styles.warningTag}>Cần đối chiếu</span>}<ChevronDown aria-hidden="true" /></span></summary>
    <div className={styles.recordBody}>
      <dl className={styles.facts}><div><dt>Người liên hệ</dt><dd>{referral.contact_name || "—"}</dd></div><div><dt>Liên hệ được phép sử dụng</dt><dd>{referral.contact || "—"}</dd></div><div><dt>Trà quan tâm</dt><dd>{referral.product_interest || "—"}</dd></div><div><dt>Sản lượng dự kiến / tháng</dt><dd>{referral.expected_volume_kg == null ? "Chưa rõ" : `${new Intl.NumberFormat("vi-VN").format(referral.expected_volume_kg)} kg`}</dd></div></dl>
      {Number(referral.source_order_count) > 0 && <p className={styles.note}>{referral.source_order_count} đơn gửi từ trang giới thiệu; chỉ ghi nguồn sau khi quản lý đối chiếu và tiếp nhận.</p>}
      {referral.notes && <p className={styles.note}>{referral.notes}</p>}
      {referral.opportunity_id && <div className={styles.flowLink}><div><small>Hồ sơ bán hàng hiện tại</small><strong>{partnerStageLabel(referral.pipeline_stage)}</strong></div><Link href={`/admin/pipeline?opportunity=${encodeURIComponent(referral.opportunity_id)}`}>Mở khách hàng <ArrowUpRight aria-hidden="true" /></Link></div>}
      {referral.resolution_reason && <p className={styles.note}><strong>Kết quả đối chiếu:</strong> {referral.resolution_reason}</p>}
      {referral.status === "pending" && <>
        {duplicates.length > 0 && <section className={styles.duplicates}><h4>Hồ sơ có thể trùng</h4><p>Đối chiếu trước khi nhận. Hồ sơ trùng chưa tự xác định đối tác được hưởng hoa hồng.</p>{duplicates.map((candidate, index) => <article key={`${candidate.kind}-${candidate.id}-${index}`}><strong>{candidate.name || "Hồ sơ đã có"}</strong><span>{({ opportunity: "Khách hàng", customer: "Tài khoản mua sỉ", prospect: "Khách tiềm năng", order: "Đơn hàng", referral: "Giới thiệu khác" })[candidate.kind] || "Hồ sơ liên quan"} · {({ contact: "Trùng thông tin liên hệ", contact_or_business_location: "Trùng liên hệ hoặc tên và địa điểm", authorized_contact: "Trùng liên hệ được phép sử dụng", business_location: "Trùng tên và địa điểm" })[candidate.reason] || "Cần kiểm tra thông tin"}</span><code>{candidate.id}</code>{candidate.opportunity_id && <Link href={`/admin/pipeline?opportunity=${encodeURIComponent(candidate.opportunity_id)}`}>Mở hồ sơ liên quan <ArrowUpRight aria-hidden="true" /></Link>}</article>)}</section>}
        <form className={styles.form} onSubmit={resolve}><h4>Đối chiếu giới thiệu khách</h4><div className={styles.formGrid}>
          <Field label="Quyết định"><select value={action} onChange={event => setAction(event.target.value)}><option value="accept">Nhận vào hồ sơ bán hàng</option><option value="reject">Từ chối giới thiệu</option></select></Field>
          {action === "accept" && <Field label="Mã hồ sơ khách hàng đã có (nếu có)" hint="Để trống để tạo hồ sơ mới. Dán mã hồ sơ đã có để dùng chung lịch sử bán hàng."><input name="opportunity_id" maxLength="120" list={`matches-${referral.id}`} autoComplete="off" /><datalist id={`matches-${referral.id}`}>{duplicates.filter(candidate => candidate.opportunity_id || candidate.kind === "opportunity").map((candidate, index) => <option key={index} value={candidate.opportunity_id || candidate.id}>{candidate.name}</option>)}</datalist></Field>}
          <Field label="Lý do đối chiếu / quyết định" wide><textarea name="reason" required rows="2" maxLength="1000" /></Field>
        </div><button className={action === "reject" ? styles.dangerButton : styles.primary} type="submit" disabled={busy || !ready}>{busy ? "Đang lưu…" : action === "accept" ? "Nhận giới thiệu khách" : "Từ chối giới thiệu"}</button></form>
      </>}
      {referral.status === "accepted" && <details className={styles.subsection}><summary>Gắn đơn hàng đã có <ChevronDown aria-hidden="true" /></summary><form className={styles.form} onSubmit={linkOrder}><p className={styles.help}>Mẫu, báo giá và đơn vẫn xử lý trong hồ sơ khách hàng hiện có. Chỉ gắn đơn thực sự phát sinh từ giới thiệu này.</p><OrderInput orders={orders} id={`orders-${referral.id}`} /><Field label="Lý do xác nhận đơn thuộc giới thiệu này"><textarea name="reason" required minLength={referral.channel === "b2c" ? 10 : 1} rows="2" maxLength="1000" /></Field><button className={styles.primary} disabled={busy || !ready} type="submit">Gắn đơn hàng</button></form></details>}
    </div>
  </details>;
}

export function ReconcileForm({ orders, partners, review, busy, ready, onAction, onClearReview }) {
  const details = useRef(null);
  const [selectedOrderId, setSelectedOrderId] = useState(review?.order_id || "");
  const selectedOrder = orders.find(order => order.id === selectedOrderId);
  const selectedPartner = partners.get(selectedOrder?.partner_id);
  const distributor = selectedPartner?.partner_type === "distributor" && !selectedOrder?.classic_agreement && selectedOrder?.remuneration_mode !== "price_difference";
  const paidReview = review?.status === "paid";
  const priceDifference = (review?.remuneration_mode || selectedOrder?.remuneration_mode) === "price_difference";
  const classic = Boolean(review?.classic_agreement_id || selectedOrder?.classic_agreement);
  const savedBasis = review ? review.commission_basis ?? "revenue" : classic || priceDifference ? "profit" : selectedPartner?.commission_basis ?? "revenue";
  const [basis, setBasis] = useState(savedBasis);
  const basisChanged = !paidReview && basis !== savedBasis;
  const termsChanged = !paidReview && review && selectedPartner && review.terms_version_snapshot != null && selectedPartner.commission_terms_version != null && Number(review.terms_version_snapshot) !== Number(selectedPartner.commission_terms_version);
  useEffect(() => {
    if (review && details.current) { details.current.open = true; details.current.scrollIntoView({ block: "start" }); }
  }, [review]);
  async function submit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const input = {
      vat_amount: number(form, "vat_amount"), billed_shipping_amount: number(form, "billed_shipping_amount"),
      refunded_amount: number(form, "refunded_amount"), cancelled: form.get("cancelled") === "on", review_note: text(form, "review_note"),
      internal_cost_total: text(form, "internal_cost_total") === "" ? null : number(form, "internal_cost_total"),
      minimum_retained_profit: text(form, "minimum_retained_profit") === "" ? null : number(form, "minimum_retained_profit"),
      commission_basis: paidReview ? savedBasis : classic || priceDifference ? "profit" : basis,
    };
    if (!paidReview && !priceDifference && text(form, "rate_percent") !== "") input.rate_percent = number(form, "rate_percent");
    if (!paidReview && !priceDifference && (text(form, "rate_percent") !== "" || basisChanged || termsChanged)) input.adjustment_reason = text(form, "adjustment_reason");
    await onAction("partner_network_reconcile", { p_order_id: text(form, "order_id"), p_input: input }, "Đã đối soát hoa hồng theo số tiền thực thu.");
  }
  return <details className={styles.reconcile} ref={details}><summary><div><strong>{paidReview ? "Rà soát đơn sau khi đã trả hoa hồng" : "Đối soát hoa hồng cho một đơn"}</strong><small>Kiểm tra tiền đã thu và các khoản loại trừ trước khi duyệt.</small></div><ChevronDown aria-hidden="true" /></summary><form className={styles.form} onSubmit={submit}>
    <p className={styles.help}>Doanh thu đủ điều kiện = tiền thực thu − VAT − phí vận chuyển tính cho khách − tiền hoàn. Nếu chọn lãi: cơ sở hoa hồng = doanh thu đủ điều kiện − toàn bộ chi phí đơn, trước hoa hồng. Lỗ hoặc hòa vốn không có hoa hồng theo tỷ lệ. Xác nhận các khoản dưới đây, kể cả khi bằng 0.</p>
    {selectedOrder && <p className={styles.note}><strong>{selectedOrder.customer_name || "Khách hàng"}</strong> · đã thu {money(selectedOrder.collected)}{selectedPartner && ` · ${selectedPartner.business_name}`}</p>}
    {priceDifference && <p className={styles.note}>Đơn hưởng chênh giá theo báo giá đã duyệt. Không cộng hoa hồng phần trăm; số thực nhận còn phụ thuộc tiền thu, hoàn tiền và kiểm tra lợi nhuận.</p>}
    {classic && !priceDifference && <p className={styles.note}>Áp dụng Classic / hạng đã chốt tại thời điểm tạo đơn, tính trên lãi sau chi phí. Để trống tỷ lệ riêng để hệ thống xác định theo số đơn đủ điều kiện của cùng khách.</p>}
    {paidReview && <p className={styles.warning}>Giữ nguyên lịch sử khoản đã trả. Lần rà soát này cập nhật điều kiện hiện tại để phát hiện số chi vượt sau hoàn tiền / hủy đơn; không sửa giao dịch đã trả.</p>}
    {termsChanged && <p className={styles.warning}>Điều kiện hoa hồng trong hồ sơ đối tác đã thay đổi. Đơn này vẫn giữ cơ sở và tỷ lệ đã lưu; kiểm tra thỏa thuận và ghi lý do xác nhận trước khi đối soát lại.</p>}
    {distributor && !paidReview && <p className={styles.warning}>Nhà phân phối cần thỏa thuận riêng theo đơn. Điền tỷ lệ và lý do / tham chiếu thỏa thuận đã chốt.</p>}
    <div className={styles.formGrid}><OrderInput orders={orders} id="commission-order-options" defaultValue={review?.order_id || ""} readOnly={Boolean(review)} onChange={event => { const id = event.target.value.trim(); setSelectedOrderId(id); const order = orders.find(row => row.id === id); setBasis(order?.classic_agreement || order?.remuneration_mode === "price_difference" ? "profit" : partners.get(order?.partner_id)?.commission_basis ?? "revenue"); }} />
      <Field label="Cơ sở tính hoa hồng của đơn" wide hint={paidReview ? "Cơ sở và tỷ lệ của khoản đã trả được giữ nguyên." : "Đối soát đã có giữ cơ sở đã lưu. Đổi doanh thu sang lãi hoặc ngược lại cần lý do / thỏa thuận riêng; không tự đổi theo hồ sơ đối tác."}><select name="commission_basis" value={paidReview ? savedBasis : basis} onChange={event => setBasis(event.target.value)} disabled={busy || !ready || paidReview || classic || priceDifference}><option value="profit">Lãi sau toàn bộ chi phí, trước hoa hồng</option><option value="revenue">Doanh thu thực thu đủ điều kiện</option></select></Field>
      <Field label="VAT cần loại trừ (VND)" hint="VAT còn lại sau điều chỉnh hoặc hoàn tiền; không trừ lại VAT đã nằm trong tiền hoàn."><input name="vat_amount" type="number" min="0" step="1" required defaultValue={review?.current_vat_amount ?? review?.vat_amount ?? ""} /></Field>
      <Field label="Phí vận chuyển tính cho khách (VND)" hint="Khoản thu giao hàng còn giữ lại; đây không phải chi phí giao hàng của Hoàng Long."><input name="billed_shipping_amount" type="number" min="0" step="1" required defaultValue={review?.current_billed_shipping_amount ?? review?.billed_shipping_amount ?? ""} /></Field>
      <Field label="Tiền hoàn lại (VND)" hint="Số thực tế hoàn cho khách. Tránh tính trùng phần VAT hoặc vận chuyển đã hoàn ở hai ô trên."><input name="refunded_amount" type="number" min="0" step="1" required defaultValue={review?.current_refunded_amount ?? review?.refunded_amount ?? ""} /></Field>
      <Field label="Toàn bộ chi phí đơn, trước hoa hồng (VND)" hint="Giá vốn, bao bì, QC, giao vận Hoàng Long chịu, mẫu / bán hàng, vận hành và dự phòng phân bổ; mỗi khoản một lần. Không cộng lại khoản đã nằm trong giá vốn hoặc phí vận chuyển đã loại trừ. Chưa biết thì để trống, không coi là 0."><input name="internal_cost_total" type="number" min="0" step="1" defaultValue={latestValue(review, "cost_total", "internal_cost_total") ?? ""} /></Field>
      <Field label="Lợi nhuận tối thiểu cần giữ lại (VND)" hint="Cần xác nhận, kể cả bằng 0. Chỉ quản lý xem được thông tin này."><input name="minimum_retained_profit" type="number" min="0" step="1" defaultValue={latestValue(review, "minimum_profit", "minimum_retained_profit") ?? ""} /></Field>
      <Field label={priceDifference ? "Hưởng chênh giá · không áp dụng tỷ lệ" : "Tỷ lệ riêng cho đơn (%)"} hint={paidReview ? "Tỷ lệ của khoản đã trả được giữ nguyên." : "Để trống để dùng chính sách đơn đầu / tái đặt đã thỏa thuận. Nhà phân phối cần chốt riêng từng đơn."}><input name="rate_percent" type="number" min="0" max="100" step="0.0001" required={distributor && !paidReview} disabled={priceDifference} readOnly={paidReview} defaultValue={priceDifference ? "" : review?.rate_percent ?? ""} /></Field>
      {!paidReview && !priceDifference && <Field label="Lý do thỏa thuận riêng / xác nhận lại điều kiện"><input name="adjustment_reason" minLength="10" maxLength="1000" required={distributor || basisChanged || Boolean(termsChanged)} /></Field>}
      <label className={styles.checkField}><input name="cancelled" type="checkbox" defaultChecked={review?.current_cancelled ?? review?.cancelled ?? false} /><span>Đơn đã hủy / không đủ điều kiện hoa hồng</span></label>
      <Field label="Ghi chú đối soát" wide><textarea name="review_note" rows="3" required maxLength="2000" placeholder="Nguồn kiểm tra tiền thu, VAT, vận chuyển, hoàn tiền và điều kiện thỏa thuận." /></Field>
    </div><p className={styles.help}>Khi khách mới thanh toán một phần, hệ thống vẫn trừ toàn bộ chi phí đơn để giữ mức hoa hồng thận trọng. Chưa đủ chi phí / mức lợi nhuận cần giữ thì chỉ lưu đối soát, chưa duyệt hoặc ghi nhận trả.</p><button className={styles.primary} disabled={busy || !ready} type="submit">{busy ? "Đang đối soát…" : "Lưu đối soát"}</button>{review && <button type="button" disabled={busy} onClick={onClearReview}>Chọn đơn khác để đối soát</button>}
  </form></details>;
}

export function CommissionCard({ commission, partner, referral, role, busy, ready, onAction, onReview, supabase, onChange }) {
  const [action, setAction] = useState(commission.status === "approved" ? "pay" : "approve");
  const outstanding = Math.max(0, Number(commission.approved_amount || 0) - Number(commission.paid_amount || 0));
  const collectionComplete = commission.collection_complete === true;
  const currentCost = latestValue(commission, "cost_total", "internal_cost_total");
  const currentMinimum = latestValue(commission, "minimum_profit", "minimum_retained_profit");
  const costsKnown = currentCost != null && currentMinimum != null;
  const cap = commission.current_commission_cap;
  const savedBasis = commission.commission_basis ?? "revenue";
  const currentBasis = commission.current_commission_basis ?? savedBasis;
  const savedBase = commission.commission_base ?? (savedBasis === "revenue" ? commission.eligible_base : null);
  const currentBase = Object.hasOwn(commission, "current_commission_base") ? commission.current_commission_base : currentBasis === "revenue" ? commission.current_eligible_base : null;
  const proposedRaw = Object.hasOwn(commission, "current_amount") ? commission.current_amount : commission.calculated_amount == null ? null : Number(commission.calculated_amount) + Number(commission.adjustment_amount || 0);
  const proposedAmount = proposedRaw == null || proposedRaw === "" || !Number.isFinite(Number(proposedRaw)) ? null : Number(proposedRaw);
  const aboveCap = cap != null && proposedAmount != null && proposedAmount > Number(cap);
  const needsException = costsKnown && aboveCap && !commission.exception_reason;
  async function submit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const input = action === "adjust" ? { adjustment_amount: number(form, "adjustment_amount"), reason: text(form, "reason") }
      : action === "pay" ? { amount: number(form, "amount"), reference: text(form, "reference"), paid_at: text(form, "paid_at") }
        : action === "void" ? { reason: text(form, "reason") } : {};
    if (["approve", "pay"].includes(action) && text(form, "exception_reason")) input.exception_reason = text(form, "exception_reason");
    await onAction("partner_network_commission_action", { p_id: commission.id, p_action: action, p_input: input }, ({ approve: "Đã duyệt hoa hồng.", adjust: "Đã ghi điều chỉnh; cần duyệt lại.", pay: "Đã ghi nhận khoản hoa hồng đã trả.", void: "Đã hủy khoản hoa hồng." })[action]);
  }
  return <details className={styles.record}>
    <summary><div><small>{partner?.code || reference(commission.partner_id)} · Đơn {reference(commission.order_id)}</small><h3>{referral?.business_name || partner?.business_name || "Hoa hồng đối tác"}</h3><p>{partner?.business_name || "Đối tác"} · {commission.remuneration_mode === "price_difference" ? "Hưởng chênh giá" : `${commission.rate_percent}% · ${commissionBasisLabel(savedBasis)}`}</p></div><span className={styles.summaryEnd}><strong className={styles.amount}>{formatPartnerMoney(commission.status === "paid" ? commission.paid_amount : proposedAmount)}</strong><Chip status={commission.status}>{label(COMMISSION_STATUS, commission.status)}</Chip><ChevronDown aria-hidden="true" /></span></summary>
    <div className={styles.recordBody}>
      {commission.stale && <p className={styles.warning} role="status">Số tiền thu hoặc điều kiện đơn đã đổi. Cần đối soát lại trước khi duyệt hoặc ghi nhận chi trả.</p>}
      {commission.entitlement_review_required && <p className={styles.warning} role="status">Lịch sử chi trả và tỷ lệ đã áp dụng được giữ nguyên. Thứ tự đơn đầu / tái mua đã thay đổi; cần quản lý rà soát quyền hưởng và khoản thu hồi / bù trừ. Số cần thu hồi chưa xác định, không mặc định là 0.</p>}
      {Number(commission.overpaid_amount) > 0 && <p className={styles.warning}>Đã trả vượt mức đủ điều kiện hiện tại {money(commission.overpaid_amount)}. Cần xử lý thu hồi / bù trừ riêng.</p>}
      {!costsKnown && commission.status !== "void" && <p className={styles.warning}>Chưa xác nhận đủ chi phí đơn và lợi nhuận tối thiểu cần giữ. Chưa thể duyệt hoặc ghi nhận trả hoa hồng.</p>}
      {proposedAmount === null && !["paid", "void"].includes(commission.status) && <p className={styles.warning}>Hoa hồng chưa xác định. Với cơ sở lãi, cần xác nhận toàn bộ chi phí đơn trước khi tính; không mặc định chi phí hoặc hoa hồng là 0.</p>}
      {aboveCap && <p className={styles.warning}>Hoa hồng đề xuất vượt mức có thể chi {money(proposedAmount - Number(cap))}. Cần điều chỉnh hoặc admin xác nhận ngoại lệ có lý do.</p>}
      {proposedAmount !== null && proposedAmount <= 0 && !["paid", "void"].includes(commission.status) && <p className={styles.warning}>Chưa có hoa hồng đủ điều kiện để duyệt hoặc trả. Kiểm tra tiền đã thu, các khoản loại trừ, lãi và chính sách đã thỏa thuận.</p>}
      {!collectionComplete && !["paid", "void"].includes(commission.status) && <p className={styles.warning}>V1 ghi nhận trả hoa hồng một lần khi khách đã thanh toán đủ đơn. Đối soát tạm tính vẫn dùng tiền đã thu; cần đối soát lại khi có thêm khoản thanh toán.</p>}
      <dl className={styles.facts}><div><dt>Thực thu khi đối soát</dt><dd>{money(commission.collected_amount)}</dd></div><div><dt>Thực thu hiện tại</dt><dd>{money(commission.current_collected)}</dd></div><div><dt>VAT / vận chuyển / hoàn tiền</dt><dd>{money(commission.vat_amount)} / {money(commission.billed_shipping_amount)} / {money(commission.refunded_amount)}</dd></div><div><dt>Doanh thu đủ điều kiện khi đối soát</dt><dd>{formatPartnerMoney(commission.eligible_base)}</dd></div><div><dt>Cơ sở tính hoa hồng đã lưu</dt><dd>{commissionBasisLabel(savedBasis)} · {formatPartnerMoney(savedBase)}</dd></div><div><dt>{commission.remuneration_mode === "price_difference" ? "Chênh giá đã đối soát" : "Hoa hồng theo tỷ lệ đã lưu"}</dt><dd>{formatPartnerMoney(commission.calculated_amount)}</dd></div><div><dt>Điều chỉnh</dt><dd>{money(commission.adjustment_amount)}</dd></div><div><dt>Đã duyệt</dt><dd>{formatPartnerMoney(commission.approved_amount)}</dd></div><div><dt>Đã trả</dt><dd>{money(commission.paid_amount)}</dd></div></dl>
      {commission.cancelled && <p className={styles.warning}>Đơn được xác nhận đã hủy / không đủ điều kiện.</p>}
      <section className={styles.costReview}><h4>Kiểm tra lợi nhuận hiện tại · nội bộ quản lý</h4><dl className={styles.facts}><div><dt>Doanh thu đủ điều kiện hiện tại</dt><dd>{formatPartnerMoney(commission.current_eligible_base)}</dd></div><div><dt>Toàn bộ chi phí đơn, trước hoa hồng</dt><dd>{formatPartnerMoney(currentCost)}</dd></div><div><dt>Lãi trước hoa hồng</dt><dd>{formatPartnerMoney(commission.current_profit_before_commission)}</dd></div><div><dt>Cơ sở tính hoa hồng hiện tại</dt><dd>{commissionBasisLabel(currentBasis)} · {formatPartnerMoney(currentBase)}</dd></div><div><dt>Hoa hồng sau điều chỉnh hiện tại</dt><dd>{formatPartnerMoney(proposedAmount)}</dd></div><div><dt>Lợi nhuận tối thiểu cần giữ</dt><dd>{formatPartnerMoney(currentMinimum)}</dd></div><div><dt>Trần hoa hồng giữ lợi nhuận</dt><dd>{formatPartnerMoney(cap)}</dd></div><div><dt>VAT / vận chuyển / hoàn tiền hiện tại</dt><dd>{money(commission.current_vat_amount)} / {money(commission.current_billed_shipping_amount)} / {money(commission.current_refunded_amount)}</dd></div></dl><p className={styles.help}>Cơ sở lãi = doanh thu đủ điều kiện − toàn bộ chi phí, trước hoa hồng; cơ sở tính không âm. Chưa rõ chi phí thì chưa thể duyệt. Chỉ thông tin được chủ động công bố trong bảng giải trình bên dưới mới chia sẻ cho đối tác.</p>{commission.exception_reason && <p className={styles.note}><strong>Ngoại lệ đã xác nhận:</strong> {commission.exception_reason}</p>}</section>
      <CommissionCostStatement commissionId={commission.id} remunerationMode={commission.remuneration_mode} orderId={commission.order_id} supabase={supabase} mode="manager" onChange={onChange} />
      {commission.review_note && <p className={styles.note}><strong>Đối soát:</strong> {commission.review_note}</p>}
      {commission.adjustment_reason && <p className={styles.note}><strong>Điều chỉnh:</strong> {commission.adjustment_reason}</p>}
      {commission.paid_reference && <p className={styles.note}><strong>Tham chiếu đã trả:</strong> {commission.paid_reference} · {when(commission.paid_at)}</p>}
      <p className={styles.help}>Mã đơn: <code>{commission.order_id}</code>. Muốn cập nhật VAT, vận chuyển hoặc tiền hoàn, dùng “Đối soát hoa hồng cho một đơn” ở đầu trang.</p>
      <button type="button" className={styles.reviewButton} disabled={busy || !ready} onClick={() => onReview(commission)}>{commission.status === "paid" ? "Rà soát sau hoàn tiền / hủy đơn" : "Rà soát lại số thu / điều kiện"}</button>
      {!["void", "paid"].includes(commission.status) && <form className={styles.form} onSubmit={submit}><h4>Duyệt / ghi nhận chi trả</h4><div className={styles.formGrid}>
        <Field label="Thao tác"><select value={action} onChange={event => setAction(event.target.value)}><option value="approve">Duyệt kết quả đối soát</option><option value="adjust">Điều chỉnh hoa hồng</option><option value="pay" disabled={commission.status !== "approved" || outstanding <= 0 || !collectionComplete || proposedAmount === null}>Ghi nhận đã trả</option><option value="void">Hủy khoản hoa hồng</option></select></Field>
        {action === "adjust" && <Field label="Số điều chỉnh (VND)" hint="Số dương cộng thêm, số âm giảm đi; đây là số điều chỉnh tổng cho khoản này."><input name="adjustment_amount" type="number" step="1" required defaultValue={commission.adjustment_amount || 0} /></Field>}
        {(action === "adjust" || action === "void") && <Field label="Lý do" wide><textarea name="reason" required rows="2" maxLength="1000" /></Field>}
        {action === "pay" && <><Field label="Số tiền đã trả (VND)" hint="V1 ghi nhận một lần trả toàn bộ khoản đã duyệt, sau khi khách thanh toán đủ đơn."><input name="amount" type="number" readOnly value={outstanding} /></Field><Field label="Ngày chuyển / chi tiền"><input name="paid_at" type="date" required /></Field><Field label="Mã chuyển khoản / tham chiếu chứng từ" wide><input name="reference" required maxLength="200" /></Field></>}
        {["approve", "pay"].includes(action) && needsException && role === "admin" && <Field label="Lý do ngoại lệ vượt giới hạn lợi nhuận" wide hint="Chỉ admin được xác nhận ngoại lệ khi chi phí đã rõ. Lý do được lưu trong lịch sử."><textarea name="exception_reason" required minLength="10" maxLength="1000" rows="3" /></Field>}
      </div><p className={styles.help}>{action === "pay" ? "Khách cần thanh toán đủ đơn trước khi ghi nhận một lần trả hoa hồng. Chỉ ghi khoản đã chuyển hoặc chi thực tế; nút này không chuyển tiền tự động." : "Không có chi trả tự động. Kết quả đối soát và các thay đổi được lưu trong lịch sử."}</p><button className={action === "void" ? styles.dangerButton : styles.primary} disabled={busy || !ready || (["approve", "pay"].includes(action) && (commission.stale || !costsKnown || proposedAmount === null || Number(commission.current_collected) <= 0 || proposedAmount <= 0 || (needsException && role !== "admin"))) || (action === "adjust" && currentBasis === "profit" && proposedAmount === null) || (action === "approve" && !["review", "draft"].includes(commission.status)) || (action === "pay" && (commission.status !== "approved" || outstanding <= 0 || !collectionComplete))} type="submit">{busy ? "Đang lưu…" : ({ approve: "Duyệt hoa hồng", adjust: "Lưu điều chỉnh", pay: "Ghi nhận đã trả", void: "Hủy khoản hoa hồng" })[action]}</button></form>}
    </div>
  </details>;
}

export default function PartnerNetworkDesk() {
  const supabase = useMemo(() => createClient(), []);
  const request = useRef(0);
  const identity = useRef("");
  const authVersion = useRef(0);
  const [access, setAccess] = useState("checking");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [snapshot, setSnapshot] = useState({ partners: [], referrals: [], commissions: [], orders: [], audit: [] });
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [tab, setTab] = useState("partners");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [review, setReview] = useState(null);

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("referral");
    if (requested && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requested)) {
      setTab("referrals"); setQuery(requested.toLowerCase()); setFilter("all"); setPage(1);
    }
  }, []);

  const load = useCallback(async () => {
    const current = ++request.current;
    setLoading(true); setReady(false); setError("");
    try {
      const result = await supabase.rpc("partner_network_admin_snapshot");
      if (result.error) throw result.error;
      if (current !== request.current) return;
      const data = result.data;
      if (!data || !Array.isArray(data.partners) || !Array.isArray(data.referrals) || !Array.isArray(data.commissions)) throw new Error("partner_snapshot_unavailable");
      setSnapshot({ ...data, orders: Array.isArray(data.orders) ? data.orders : [], audit: Array.isArray(data.audit) ? data.audit : [] });
      setReady(true);
    } catch (failure) {
      if (current === request.current) setError(partnerErrorMessage(failure));
    } finally { if (current === request.current) setLoading(false); }
  }, [supabase]);

  useEffect(() => {
    let active = true;
    const checkAccess = async () => {
      const version = ++authVersion.current;
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        if (!active || version !== authVersion.current) return;
        if (!user) { setAccess("signed_out"); return; }
        const result = await supabase.from("staff_roles").select("role").eq("user_id", user.id).maybeSingle();
        if (result.error) throw result.error;
        if (!active || version !== authVersion.current) return;
        identity.current = user.id;
        setEmail(user.email || "");
        setRole(result.data?.role || "");
        if (!["manager", "admin"].includes(result.data?.role) || !user.email_confirmed_at) { setAccess("denied"); return; }
        setAccess("allowed"); await load();
      } catch (failure) { if (active && version === authVersion.current) { setAccess("error"); setError(partnerErrorMessage(failure)); } }
    };
    checkAccess();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if ((session?.user?.id || "") !== identity.current) {
        authVersion.current += 1; request.current += 1; identity.current = "";
        setSnapshot({ partners: [], referrals: [], commissions: [], orders: [], audit: [] });
        setReview(null); setEmail(""); setRole(""); setReady(false); setAccess("checking");
        setTimeout(checkAccess, 0);
      }
    });
    return () => { active = false; request.current += 1; subscription.unsubscribe(); };
  }, [supabase, load]);

  async function perform(name, args, success) {
    if (!ready || busy) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const result = await supabase.rpc(name, args);
      if (result.error) throw result.error;
      setNotice(success); await load(); return true;
    } catch (failure) { setError(partnerErrorMessage(failure)); return false; }
    finally { setBusy(false); }
  }

  const partnerById = useMemo(() => new Map(snapshot.partners.map(row => [row.id, row])), [snapshot.partners]);
  const referralById = useMemo(() => new Map(snapshot.referrals.map(row => [row.id, row])), [snapshot.referrals]);
  const statuses = tab === "partners" ? PARTNER_STATUS : tab === "referrals" ? REFERRAL_STATUS : COMMISSION_STATUS;
  const statusOptions = Array.isArray(statuses) ? statuses.map(item => [item.id || item.value, item.label]) : Object.entries(statuses).map(([key, value]) => [key, value?.label || value]);
  const filtered = (snapshot[tab] || []).filter(row => {
    if (filter !== "all" && row.status !== filter) return false;
    const partner = partnerById.get(row.partner_id);
    const referral = referralById.get(row.referral_id);
    return normalized([row.id, row.business_name, row.contact_name, row.email, row.phone, row.contact, row.region, row.location, row.code, row.order_id, partner?.business_name, partner?.code, referral?.business_name].filter(Boolean).join(" ")).includes(normalized(query));
  });
  const maxPage = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, maxPage);
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  if (access === "checking") return <main className="hl-admin-state" aria-live="polite"><span className="hl-admin-state__pulse" /><p>Đang mở mạng lưới đối tác…</p></main>;
  if (access !== "allowed") return <main className={styles.page} data-no-translate><section className={styles.access}><ShieldCheck aria-hidden="true" /><h1>{access === "signed_out" ? "Đăng nhập để quản lý đối tác" : access === "error" ? "Chưa kiểm tra được quyền truy cập" : "Mục này dành cho quản lý"}</h1><p>{access === "error" ? error : access === "signed_out" ? "Dùng tài khoản quản lý Hoàng Long hiện có." : "Cần tài khoản quản lý / admin đã xác nhận email để duyệt đối tác và đối soát hoa hồng."}</p><Link href="/admin/login">Đến trang đăng nhập</Link></section></main>;

  return <main className={styles.page} data-no-translate>
    <header className={styles.header}><div><p>Hoàng Long · Đối tác B2B & B2C</p><h1>Mạng lưới đối tác</h1><span>Đăng ký → duyệt đối tác → nhận giới thiệu → bán hàng → đối soát hoa hồng.</span></div><div className={styles.headerActions}><small>{email}</small><button onClick={load} disabled={loading || busy} type="button"><RefreshCw aria-hidden="true" />{loading ? "Đang tải…" : "Làm mới"}</button></div></header>
    <p className={styles.internalNotice}>Đang thử nội bộ. Chưa mở chương trình công khai. Xét duyệt đối tác và xác nhận khách được thực hiện riêng.</p>
    {error && <div className={styles.error} role="alert"><p>{error}</p><button disabled={loading || busy} onClick={load} type="button">Tải lại dữ liệu</button></div>}
    {notice && <p className={styles.notice} role="status">{notice}</p>}
    <div className={styles.counts}><div><span>Đăng ký cần duyệt</span><strong>{ready ? snapshot.partners.filter(row => row.status === "pending").length : "—"}</strong></div><div><span>Giới thiệu cần đối chiếu</span><strong>{ready ? snapshot.referrals.filter(row => row.status === "pending").length : "—"}</strong></div><div><span>Hoa hồng cần rà soát</span><strong>{ready ? snapshot.commissions.filter(row => row.status === "review" || row.stale).length : "—"}</strong></div></div>
    <nav className={styles.tabs} aria-label="Các mục quản lý đối tác">{[["partners", "Đăng ký & đối tác"], ["referrals", "Khách giới thiệu"], ["progress", "Tiến độ đơn"], ["commissions", "Hoa hồng"], ["quotes", "Giá chào khách"], ["rewards", "Chính sách & thưởng"], ["saleskit", "Bộ chào hàng"]].map(([key, title]) => <button key={key} type="button" aria-current={tab === key ? "page" : undefined} onClick={() => { setTab(key); setFilter("all"); setQuery(""); setPage(1); }}>{title}</button>)}</nav>
    <section className={styles.workspace} aria-busy={loading}>
      {tab === "quotes" ? <PartnerQuoteDesk proposals={snapshot.quote_proposals || []} referrals={snapshot.referrals.map(row => ({ ...row, partner_name: partnerById.get(row.partner_id)?.business_name }))} products={snapshot.quote_catalog || []} busy={busy || loading} ready={ready} onAction={perform}/> : tab === "rewards" ? <PartnerRewardsDesk partners={snapshot.partners} snapshot={snapshot.rewards || {}} busy={busy || loading} ready={ready} onAction={perform}/> : tab === "saleskit" ? <><PartnerSalesPageEditor key={identity.current} partners={ready ? snapshot.partners : []} salesPages={ready ? snapshot.sales_pages || [] : []} busy={busy || loading} ready={ready} onAction={perform}/><PartnerRetailShares salesPages={snapshot.sales_pages || []}/><PartnerSalesKit mode="manager" partners={ready ? snapshot.partners : []} salesPages={ready ? snapshot.sales_pages || [] : []} disabled={loading || busy}/></> : tab === "progress" ? <PartnerOrderUpdateEditor key={identity.current} orders={snapshot.orders || []} updates={snapshot.order_updates || []} referrals={snapshot.referrals} partners={snapshot.partners} busy={busy || loading} ready={ready} onAction={perform}/> : <>
      {tab === "partners" && <PartnerInvitePanel key={identity.current} supabase={supabase} managerId={identity.current} disabled={!ready || busy || loading}/>}
      {tab === "commissions" && <ReconcileForm key={review?._request || "new"} orders={snapshot.orders} partners={partnerById} review={review} busy={busy} ready={ready} onAction={perform} onClearReview={() => setReview(null)} />}
      <div className={styles.tools}><label><Search aria-hidden="true" /><span className={styles.srOnly}>Tìm trong danh sách</span><input value={query} onChange={event => { setQuery(event.target.value); setPage(1); }} placeholder={tab === "partners" ? "Tìm tên, mã, email, khu vực…" : "Tìm khách, đối tác, mã đơn…"} /></label><label className={styles.filter}><span>Trạng thái</span><select value={filter} onChange={event => { setFilter(event.target.value); setPage(1); }}><option value="all">Tất cả</option>{statusOptions.map(([key, title]) => <option value={key} key={key}>{title}</option>)}</select></label></div>
      {loading ? <p className={styles.empty} role="status">Đang tải dữ liệu đối tác…</p> : !ready ? <p className={styles.empty}>Chưa có dữ liệu để đối soát. Kiểm tra thông báo phía trên rồi tải lại.</p> : visible.length === 0 ? <p className={styles.empty}>{query || filter !== "all" ? "Không có kết quả phù hợp. Thử đổi tìm kiếm hoặc trạng thái." : tab === "partners" ? "Chưa nhận hồ sơ đối tác. Mời riêng phía trên; hồ sơ xuất hiện khi người được mời hoàn tất đăng ký." : tab === "referrals" ? "Chưa có khách giới thiệu. Đối tác đã duyệt gửi khách từ trang của mình." : "Chưa có khoản hoa hồng. Gắn đơn với giới thiệu rồi đối soát tiền thực thu."}</p> : <div className={styles.records}>{visible.map(row => tab === "partners" ? <PartnerCard key={`${row.id}-${row.updated_at || row.status}`} partner={row} classicAgreement={currentClassicAgreement(snapshot.rewards, row.id)} busy={busy} ready={ready} onAction={perform} /> : tab === "referrals" ? <ReferralCard key={`${row.id}-${row.status}`} referral={row} partner={partnerById.get(row.partner_id)} orders={snapshot.orders} busy={busy} ready={ready} onAction={perform} /> : <CommissionCard key={`${row.id}-${row.updated_at || row.status}`} commission={row} partner={partnerById.get(row.partner_id)} referral={referralById.get(row.referral_id)} role={role} busy={busy} ready={ready} supabase={supabase} onChange={load} onAction={perform} onReview={row => setReview({ ...row, _request: `${row.id}-${Date.now()}` })} />)}</div>}
      {ready && <div className={styles.pagination}><span>{filtered.length} hồ sơ · trang {currentPage}/{maxPage}</span><div><button type="button" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>Trước</button><button type="button" disabled={currentPage >= maxPage} onClick={() => setPage(currentPage + 1)}>Sau</button></div></div>}
      {ready && snapshot.audit.length > 0 && <details className={styles.history}><summary>Lịch sử thao tác gần đây <ChevronDown aria-hidden="true" /></summary><ol>{snapshot.audit.slice(0, 50).map((item, index) => {
        const entry = auditDescription(item);
        return <li key={item.id || index}><time>{when(item.created_at)}</time><strong>{entry.title}</strong><span>{entry.note || "Không có ghi chú thêm."}<small>Hồ sơ {item.entity_id} · Người thực hiện: {entry.actor}</small></span></li>;
      })}</ol></details>}
      </>}
    </section>
  </main>;
}

function PartnerRetailShares({salesPages}) { return <section><h2>Link giới thiệu bán lẻ</h2>{salesPages.filter(page => page.published).length ? salesPages.filter(page => page.published).map(page => <PartnerRetailShare key={page.id || page.slug} salesPage={page}/>) : <p>Chỉ có link B2C sau khi quản lý duyệt đối tác và chủ động mở trang cá nhân ở trên.</p>}</section>; }

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Award, Plus, Save } from "lucide-react";
import styles from "./PartnerRewards.module.css";

const money = value => Number(value || 0).toLocaleString("vi-VN") + "đ";
const todayMonth = () => {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", timeZone: "Asia/Ho_Chi_Minh" }).formatToParts(new Date()).map(part => [part.type, part.value]));
  return `${parts.year}-${parts.month}`;
};
const periodDate = (kind, value) => kind === "yearly" ? `${value}-01-01` : `${value}-01`;
const periodLabel = (kind, value) => kind === "yearly" ? `Năm ${String(value).slice(0, 4)}` : `Tháng ${String(value).slice(5, 7)}/${String(value).slice(0, 4)}`;
const rewardLabel = reward => reward.kind === "personal" ? "Thưởng cá nhân" : reward.reward_basis !== "net_collected_revenue" ? "Thưởng theo số đơn (lịch sử)" : reward.kind === "yearly" ? "Thưởng doanh thu năm" : "Thưởng doanh thu tháng";
const nullableMoney = value => value == null ? "chưa đủ dữ liệu đối soát" : money(value);
const list = value => Array.isArray(value) ? value : [];
const reason = form => String(form.get("reason") || "").trim();
const statuses = { review: "Chờ duyệt", approved: "Đã duyệt", paid: "Đã trả", void: "Đã hủy" };

function RewardRecord({ reward, onAction, disabled }) {
  const [mode, setMode] = useState("");
  async function submit(event) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    const input = mode === "pay" ? { amount: Number(reward.amount), reference: String(form.get("reference") || ""), paid_at: new Date().toISOString() } : { reason: reason(form) };
    await onAction("partner_network_reward_action", { p_id: reward.id, p_action: mode, p_input: input }, mode === "pay" ? "Đã ghi nhận khoản thưởng đã trả. Hệ thống không chuyển tiền." : "Đã hủy đề nghị thưởng."); setMode("");
  }
  return <article className={styles.reward}><div className={styles.rewardHead}><strong>{rewardLabel(reward)} · {periodLabel(reward.period_kind || reward.kind, reward.period_start || reward.month)}</strong><span className={styles.chip}>{statuses[reward.status] || reward.status}</span></div><b className={styles.amount}>{money(reward.amount)}</b><p>{reward.reason}</p>{reward.kind !== "personal" && <small>{reward.reward_basis === "net_collected_revenue" ? `Doanh thu thuần đã đối soát: ${nullableMoney(reward.qualifying_revenue)}` : `${reward.qualifying_orders} đơn theo quy tắc cũ; chỉ giữ để đối chiếu`}</small>}{reward.legacy && reward.status !== "paid" && reward.status !== "void" && <p className={styles.warning}>Khoản theo số đơn cũ cần hủy và đối soát lại theo chính sách doanh thu; chưa thể duyệt hoặc ghi trả.</p>}{reward.stale && <p className={styles.warning}>Dữ liệu nguồn đã thay đổi. Hủy đề nghị chưa trả và lập lại; khoản đã trả được giữ nguyên để đối chiếu.</p>}{reward.paid_reference && <small>Chứng từ trả thưởng: {reward.paid_reference}</small>}{reward.status !== "paid" && reward.status !== "void" && <div className={styles.actions}>
    {reward.status === "review" && <button type="button" disabled={disabled || reward.stale || reward.legacy} onClick={() => onAction("partner_network_reward_action", { p_id: reward.id, p_action: "approve", p_input: {} }, "Đã duyệt thưởng; chưa ghi nhận trả tiền.")}>Duyệt thưởng</button>}
    {reward.status === "approved" && <button type="button" disabled={disabled || reward.stale || reward.legacy} onClick={() => setMode(mode === "pay" ? "" : "pay")}>Ghi nhận đã trả</button>}
    <button type="button" disabled={disabled} onClick={() => setMode(mode === "void" ? "" : "void")}>Hủy đề nghị</button>
  </div>}{mode && <form onSubmit={submit} className={styles.inlineForm}>{mode === "pay" ? <label><span>Mã giao dịch / chứng từ đã trả</span><input name="reference" required maxLength={240}/><small>Chỉ ghi nhận chuyển khoản đã thực hiện bên ngoài; không tự chuyển tiền.</small></label> : <label><span>Lý do hủy (đối tác có thể xem)</span><textarea name="reason" required minLength={10} maxLength={1000}/></label>}<button disabled={disabled} type="submit">{mode === "pay" ? `Xác nhận đã trả ${money(reward.amount)}` : "Xác nhận hủy"}</button></form>}</article>;
}

function PartnerFinance({ partner, snapshot, onAction, disabled }) {
  const rewardRequests = useRef(new Map());
  const agreements = list(snapshot.classic_agreements).filter(row => row.partner_id === partner.id);
  const lastAgreement = agreements.slice().sort((a, b) => b.version - a.version)[0];
  const [tierId, setTierId] = useState("");
  const rewards = list(snapshot.rewards).filter(row => row.partner_id === partner.id);
  const tierOptions = list(snapshot.tiers).filter(row => row.enabled);
  const qualification = list(snapshot.tier_eligibility).find(row => row.partner_id === partner.id && row.tier_id === tierId);
  async function applyClassic(event) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    await onAction("partner_network_apply_classic", { p_partner_id: partner.id, p_input: { expected_version: lastAgreement?.version || 0, reason: reason(form), ...(tierId ? { tier_id: tierId } : {}) } }, "Đã lưu điều kiện Classic cho đơn mới kể từ thời điểm áp dụng. Điều kiện và khoản đã trả trước đó được giữ nguyên.");
  }
  async function createReward(event) {
    event.preventDefault(); const form = new FormData(event.currentTarget); const kind = String(form.get("kind"));
    const input = { kind, month: periodDate(kind, String(form.get("period"))), reason: reason(form), ...(kind === "personal" ? { amount: Number(form.get("amount")), reference: String(form.get("reference") || "") } : {}) };
    const key = JSON.stringify(input); if (!rewardRequests.current.has(key)) rewardRequests.current.set(key, crypto.randomUUID());
    const saved = await onAction("partner_network_reward_create", { p_partner_id: partner.id, p_input: { ...input, request_id: rewardRequests.current.get(key) } }, "Đã lập đề nghị thưởng để duyệt. Chưa trả tiền.");
    if (saved) rewardRequests.current.delete(key);
  }
  return <div className={styles.workspace}>
    <section className={styles.card}><h3>Điều kiện Classic</h3><p>Áp dụng cho doanh thu của chính đối tác mang về, đã xác nhận nguồn. Hai đơn đầu của cùng khách: <strong>1% lãi sau chi phí</strong>; từ đơn thứ ba: <strong>2%</strong>. Đơn trước chỉ được tính khi hoàn tất, thu đủ tiền và không hoàn tiền.</p><p className={styles.hint}>Lãi tính sau toàn bộ chi phí được quản lý xác nhận, trước hoa hồng; chưa rõ chi phí thì chưa có số tiền được nhận. Không cộng chồng với cơ chế hưởng chênh giá.</p>
      {lastAgreement && <p className={styles.notice}>Phiên bản {lastAgreement.version}: {lastAgreement.tier_name || "Classic"} · {lastAgreement.first_rate}% / {lastAgreement.repeat_rate}% · từ {new Date(lastAgreement.effective_at).toLocaleString("vi-VN")}. Chỉ đổi đơn phát sinh từ thời điểm này.</p>}
      <form onSubmit={applyClassic} className={styles.form}><label><span>Cấp áp dụng cho đơn mới</span><select value={tierId} onChange={event => setTierId(event.target.value)}><option value="">Classic · 1% hai đơn đầu / 2% từ đơn thứ ba</option>{tierOptions.map(row => <option key={row.id} value={row.id}>{row.name} · {row.first_rate}% / {row.repeat_rate}%</option>)}</select></label>{qualification && <small>{qualification.eligible ? "Đủ điều kiện cấp này" : "Chưa đủ điều kiện cấp này"} · {qualification.tenure_months} tháng từ lúc được duyệt · thu thuần 12 tháng: {qualification.collected_12m === null ? "chưa đủ dữ liệu đối soát" : money(qualification.collected_12m)}</small>}<label><span>Lý do / xác nhận thỏa thuận</span><textarea name="reason" required minLength={10} maxLength={1000} rows={2} placeholder="Điều kiện đã thống nhất với đối tác, ngày và phạm vi áp dụng…"/></label><button className={styles.primary} disabled={disabled || (tierId && !qualification?.eligible)} type="submit"><Save size={16}/>Áp dụng cho đơn mới</button></form>
    </section>
    <PeriodRewardConfig partner={partner} snapshot={snapshot} onAction={onAction} disabled={disabled} onCreateReward={createReward}/>
    <section className={styles.card}><h3>Thưởng cá nhân ngoài</h3><p>Số tiền riêng do quản lý quyết định; không tự nhân hệ số cấp và không sửa hoa hồng đã trả.</p><form onSubmit={createReward} className={styles.form}><input type="hidden" name="kind" value="personal"/><div className={styles.grid}><label><span>Tháng ghi nhận</span><input name="period" type="month" required defaultValue={todayMonth()}/></label><label><span>Số tiền VND</span><input name="amount" type="number" required min="1" max="999999999999" step="1" inputMode="numeric"/></label></div><label><span>Lý do / đóng góp cụ thể (đối tác xem được)</span><textarea name="reason" required minLength={10} maxLength={1000} rows={2}/></label><label><span>Tham chiếu nếu có</span><input name="reference" maxLength={240}/></label><button disabled={disabled} type="submit">Lập đề nghị thưởng cá nhân</button></form></section>
    <section className={styles.card}><h3>Các khoản thưởng đã ghi nhận</h3>{rewards.length ? rewards.map(row => <RewardRecord key={`${row.id}-${row.status}`} reward={row} disabled={disabled} onAction={onAction}/>) : <p className={styles.hint}>Chưa có khoản thưởng. Hoa hồng từng đơn tiếp tục ở mục Đối soát.</p>}</section>
  </div>;
}

function PeriodRewardConfig({ partner, snapshot, onAction, onCreateReward, disabled }) {
  const rules = list(snapshot.reward_rules).filter(row => row.partner_id === partner.id).sort((a, b) => b.version - a.version);
  const currentRule = rules.find(row => row.reward_basis === "net_collected_revenue");
  const activeRule = rules.find(row => row.reward_basis === "net_collected_revenue" && row.enabled);
  const expectedVersion = rules[0]?.version || 0;
  const [periodKind, setPeriodKind] = useState(currentRule?.period_kind || "monthly");
  const [effectiveMonth, setEffectiveMonth] = useState(String(currentRule?.effective_month || `${todayMonth()}-01`).slice(0, 7));
  const [thresholds, setThresholds] = useState(currentRule?.thresholds || []);
  const [enabled, setEnabled] = useState(currentRule?.enabled || false);
  const [reviewKind, setReviewKind] = useState(currentRule?.period_kind || "monthly");
  const [reviewPeriod, setReviewPeriod] = useState(currentRule?.period_kind === "yearly" ? todayMonth().slice(0, 4) : todayMonth());
  const [queriedPreview, setQueriedPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");
  const request = useRef(0);
  const alive = useRef(false);
  const client = useMemo(() => createClient(), []);
  useEffect(() => {
    alive.current = true;
    const { data: { subscription } } = client.auth.onAuthStateChange(event => {
      if (event === "SIGNED_OUT" || event === "USER_UPDATED") {
        request.current += 1;
        setQueriedPreview(null);
        setLoading(false);
      }
    });
    return () => { alive.current = false; request.current += 1; subscription.unsubscribe(); };
  }, [client]);
  const reviewStart = periodDate(reviewKind, reviewPeriod);
  const preview = queriedPreview?.period_kind === reviewKind && queriedPreview?.period_start === reviewStart ? queriedPreview : list(snapshot.period_previews).find(row => row.partner_id === partner.id && row.period_kind === reviewKind && String(row.period_start).slice(0, 10) === reviewStart);
  const changingCadence = activeRule && activeRule.period_kind !== periodKind;
  const nextYear = String(Number(todayMonth().slice(0, 4)) + 1);
  function changePeriodKind(value) {
    setPeriodKind(value);
    if (activeRule && activeRule.period_kind !== value) setEffectiveMonth(`${nextYear}-01`);
    else if (value === "yearly") setEffectiveMonth(`${todayMonth().slice(0, 4)}-01`);
  }
  function changeReviewKind(value) {
    request.current += 1; setLoading(false); setQueriedPreview(null); setPreviewError("");
    setReviewKind(value); setReviewPeriod(value === "yearly" ? reviewPeriod.slice(0, 4) : `${reviewPeriod.slice(0, 4)}-${todayMonth().slice(5, 7)}`);
  }
  async function loadPreview() {
    const version = ++request.current;
    setLoading(true); setPreviewError(""); setQueriedPreview(null);
    const { data, error } = await client.rpc("partner_network_reward_preview", { p_partner_id: partner.id, p_period_kind: reviewKind, p_period_start: reviewStart });
    if (!alive.current || request.current !== version) return;
    setLoading(false);
    if (error) setPreviewError("Không tải được đối soát cho kỳ này. Vui lòng thử lại hoặc tải lại trang.");
    else setQueriedPreview(data);
  }
  async function saveRule(event) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    await onAction("partner_network_reward_rule", {
      p_partner_id: partner.id,
      p_input: { period_kind: periodKind, effective_month: periodKind === "yearly" ? `${effectiveMonth.slice(0, 4)}-01-01` : `${effectiveMonth}-01`, expected_version: expectedVersion, thresholds: thresholds.map(row => ({ minimum_revenue: Number(row.minimum_revenue), amount: Number(row.amount) })), enabled, reason: reason(form) }
    }, "Đã lưu bảng thưởng theo doanh thu thực thu. Chưa tạo hoặc trả khoản thưởng nào.");
  }
  function fillExample() {
    const scale = periodKind === "yearly" ? 12 : 1;
    setThresholds([{ minimum_revenue: 50000000 * scale, amount: 100000 * scale }, { minimum_revenue: 100000000 * scale, amount: 300000 * scale }, { minimum_revenue: 200000000 * scale, amount: 700000 * scale }]);
    setEnabled(false);
  }
  return <section className={styles.card}>
    <h3>Thưởng theo doanh thu tháng hoặc năm</h3>
    <p>Mỗi đối tác chọn <strong>một chu kỳ: tháng hoặc năm</strong>. Chỉ xét doanh thu thực thu thuần từ đơn do đối tác mang về, tính theo ngày nhận tiền, gồm cả thanh toán từng phần; trừ VAT, phí vận chuyển thu hộ và hoàn tiền đã đối soát. <strong>Không xét số lượng đơn.</strong></p>
    <p className={styles.hint}>Mức cao nhất đạt được được nhận một lần, không cộng các bậc hoặc cộng cả thưởng tháng lẫn năm. Đây là thưởng doanh thu, tách biệt với hoa hồng Classic tính trên lãi sau chi phí và thưởng cá nhân.</p>
    {currentRule && <p className={styles.notice}>Phiên bản {currentRule.version}: thưởng {currentRule.period_kind === "yearly" ? "cuối năm" : "cuối tháng"} · từ {String(currentRule.effective_month).slice(0, 7)} · {currentRule.enabled ? "đã bật" : "chưa bật"}.</p>}
    <form onSubmit={saveRule} className={styles.form}>
      <label><span>Chu kỳ duy nhất áp dụng</span><select value={periodKind} onChange={event => changePeriodKind(event.target.value)}><option value="monthly">Thưởng cuối tháng</option><option value="yearly">Thưởng cuối năm</option></select></label>
      <label><span>{periodKind === "yearly" ? "Năm bắt đầu quy tắc" : "Tháng bắt đầu quy tắc"}</span>{periodKind === "yearly" ? <input type="number" min="2020" max="2100" step="1" value={effectiveMonth.slice(0, 4)} required onChange={event => setEffectiveMonth(`${event.target.value}-01`)}/> : <input type="month" value={effectiveMonth} required onChange={event => setEffectiveMonth(event.target.value)}/>}</label>
      {changingCadence && <p className={styles.warning}>Đổi giữa thưởng tháng và năm áp dụng từ ngày 01/01 năm sau để không thưởng trùng cùng một doanh thu. Các khoản của chu kỳ trước vẫn được lưu.</p>}
      <div className={styles.tiers}>{thresholds.map((row, index) => <div className={styles.tierRow} key={index}>
        <label><span>Từ doanh thu thuần (VND)</span><input type="number" min="1" max="999999999999" step="1" inputMode="numeric" required value={row.minimum_revenue} onChange={event => setThresholds(thresholds.map((item, i) => i === index ? { ...item, minimum_revenue: event.target.value } : item))}/></label>
        <label><span>Tiền thưởng (VND)</span><input type="number" min="1" max="999999999999" step="1" inputMode="numeric" required value={row.amount} onChange={event => setThresholds(thresholds.map((item, i) => i === index ? { ...item, amount: event.target.value } : item))}/></label>
        <button type="button" aria-label={`Xóa bậc ${index + 1}`} onClick={() => setThresholds(thresholds.filter((_, i) => i !== index))}>×</button>
      </div>)}</div>
      <div className={styles.actions}><button type="button" onClick={() => setThresholds([...thresholds, { minimum_revenue: "", amount: "" }])} disabled={disabled || thresholds.length >= 20}><Plus size={15}/>Thêm bậc</button><button type="button" disabled={disabled} onClick={fillExample}>Điền ví dụ để chỉnh</button></div>
      <small>{periodKind === "yearly" ? "Ví dụ năm: 600 triệu / 1,2 tỷ / 2,4 tỷ → thưởng 1,2 / 3,6 / 8,4 triệu." : "Ví dụ tháng: 50 / 100 / 200 triệu → thưởng 100k / 300k / 700k."} Chỉ là bản nháp tham khảo, chưa kiểm chứng ngân sách Hoàng Long; bạn chỉnh và duyệt trước khi áp dụng.</small>
      <label className={styles.check}><input type="checkbox" checked={enabled} onChange={event => setEnabled(event.target.checked)}/><span>Tôi duyệt áp dụng bảng thưởng đã nhập</span></label>
      <label><span>Lý do duyệt hoặc tạm tắt</span><textarea name="reason" required minLength={10} maxLength={1000} rows={2}/></label>
      <button type="submit" disabled={disabled || (enabled && !thresholds.length)}>Lưu phiên bản quy tắc</button>
    </form>
    <form onSubmit={onCreateReward} className={styles.form}>
      <h3>Đối soát một kỳ</h3>
      <label><span>Chu kỳ cần đối soát</span><select name="kind" value={reviewKind} onChange={event => changeReviewKind(event.target.value)}><option value="monthly">Theo tháng</option><option value="yearly">Theo năm</option></select></label>
      <label><span>{reviewKind === "yearly" ? "Năm đối soát" : "Tháng đối soát"}</span><input name="period" type={reviewKind === "yearly" ? "number" : "month"} {...(reviewKind === "yearly" ? { min: 2020, max: 2100, step: 1 } : {})} required value={reviewPeriod} onChange={event => { request.current += 1; setLoading(false); setQueriedPreview(null); setPreviewError(""); setReviewPeriod(event.target.value); }}/></label>
      <button type="button" disabled={disabled || loading || !reviewPeriod} onClick={loadPreview}>{loading ? "Đang đối soát…" : "Cập nhật dự kiến"}</button>
      {previewError && <p role="alert" className={styles.warning}>{previewError}</p>}
      {preview && <div className={styles.notice}><strong>{periodLabel(reviewKind, reviewStart)}</strong><p>Doanh thu thực thu thuần: {nullableMoney(preview.revenue_amount)} · thưởng dự kiến: {nullableMoney(preview.estimated_amount)}{Number(preview.bonus_multiplier) !== 1 && preview.bonus_multiplier != null ? ` · hệ số thưởng ${preview.bonus_multiplier}` : ""}.</p>{Number(preview.unreviewed_orders) > 0 && <p className={styles.warning}>Có {preview.unreviewed_orders} đơn chưa chốt số liệu doanh thu; chưa thể chốt thưởng.</p>}<small>{preview.rule_enabled ? "Theo bảng được duyệt." : "Kỳ này chưa có bảng thưởng được bật."} {preview.period_closed ? "Kỳ đã kết thúc; quản lý cần duyệt trước khi ghi nhận trả." : "Kỳ chưa kết thúc, số dự kiến còn có thể thay đổi."}</small></div>}
      {!preview && <small>Chọn kỳ và cập nhật để xem doanh thu, bảng áp dụng và thưởng dự kiến. Chu kỳ đối soát phải đúng quy tắc có hiệu lực trong kỳ đó.</small>}
      <label><span>Ghi chú đề nghị (đối tác xem được)</span><textarea name="reason" required minLength={10} maxLength={1000} rows={2}/></label>
      <button disabled={disabled || loading || !preview?.rule_enabled || preview.revenue_amount == null || !(Number(preview.estimated_amount) > 0) || Number(preview.unreviewed_orders) > 0} type="submit">Lập đề nghị thưởng {reviewKind === "yearly" ? "năm" : "tháng"}</button>
      <small>Không tự tạo hoặc chi trả. Chỉ duyệt / ghi nhận trả sau khi kỳ kết thúc và đủ dữ liệu đối soát.</small>
    </form>
  </section>;
}

function TierConfig({ tiers = [], onAction, disabled }) {
  const [example, setExample] = useState("");
  const preset = example === "growth" ? {name:"Phát triển",months:24,revenue:2000000000,multiplier:1.5} : example === "senior" ? {name:"Gắn bó",months:12,revenue:500000000,multiplier:1.25} : {};
  async function submit(event) {
    event.preventDefault(); const f = new FormData(event.currentTarget); const optional = key => String(f.get(key) || "").trim() === "" ? null : Number(f.get(key));
    await onAction("partner_network_tier_create", { p_input: { name: String(f.get("name") || ""), enabled: f.get("enabled") === "on", min_tenure_months: optional("min_tenure_months"), min_collected_12m: optional("min_collected_12m"), eligibility_mode: String(f.get("eligibility_mode")), first_rate: Number(f.get("first_rate")), repeat_rate: Number(f.get("repeat_rate")), monthly_bonus_multiplier: Number(f.get("monthly_bonus_multiplier")), reason: reason(f) } }, "Đã lưu định nghĩa cấp. Chưa nâng cấp hay thay đổi thỏa thuận của đối tác nào.");
  }
  return <details className={styles.card}><summary>Cấu hình cấp đối tác</summary><p>Cấp là điều kiện có thể áp dụng, không tự nâng hạng. Gợi ý để thảo luận: Senior có thể dùng 2% / 2%; bạn chốt số tháng, doanh thu thuần 12 tháng và hệ số thưởng trước khi bật.</p><div className={styles.actions}><button type="button" disabled={disabled} onClick={() => setExample("senior")}>Điền ví dụ Gắn bó</button><button type="button" disabled={disabled} onClick={() => setExample("growth")}>Điền ví dụ Phát triển</button></div><p className={styles.hint}>Mốc 12 tháng / 500 triệu hoặc 24 tháng / 2 tỷ chỉ là gợi ý để bạn chỉnh. Chưa kiểm chứng khả năng chi thưởng; chưa áp dụng cho bất kỳ ai.</p><form key={example} onSubmit={submit} className={styles.form}><label><span>Tên cấp</span><input name="name" required maxLength={100} defaultValue={preset.name || ""} placeholder="Ví dụ: Gắn bó"/></label><div className={styles.grid}><label><span>Tối thiểu số tháng từ khi duyệt</span><input name="min_tenure_months" defaultValue={preset.months || ""} type="number" min="0" max="1200" step="1" placeholder="Để trống nếu không xét"/></label><label><span>Thu thuần do đối tác mang về / 12 tháng</span><input name="min_collected_12m" defaultValue={preset.revenue || ""} type="number" min="0" max="999999999999" step="1" placeholder="Ngưỡng VND đã chốt"/></label></div><label><span>Cách xét điều kiện</span><select name="eligibility_mode" defaultValue={example ? "any" : "all"}><option value="all">Đạt tất cả ngưỡng đã nhập</option><option value="any">Đạt ít nhất một ngưỡng</option></select></label><div className={styles.grid}><label><span>% lãi hai đơn đầu</span><input name="first_rate" type="number" required min="0" max="100" step="0.0001" defaultValue="2"/></label><label><span>% lãi từ đơn thứ ba</span><input name="repeat_rate" type="number" required min="0" max="100" step="0.0001" defaultValue="2"/></label><label><span>Hệ số thưởng doanh thu theo kỳ</span><input name="monthly_bonus_multiplier" type="number" required min="0" max="100" step="0.0001" defaultValue={preset.multiplier || 1}/></label></div><label className={styles.check}><input name="enabled" type="checkbox"/><span>Bật cấp để quản lý có thể xét áp dụng</span></label><label><span>Lý do / cơ sở chính sách</span><textarea name="reason" required minLength={10} maxLength={1000}/></label><button disabled={disabled} type="submit">Lưu cấp đối tác</button></form>{tiers.length > 0 && <div><h3>Các cấp đã cấu hình</h3>{tiers.map(tier => <details className={styles.reward} key={tier.id}><summary>{tier.name} · {tier.enabled ? "Đang mở xét" : "Chưa mở xét"}</summary><p>{tier.first_rate}% / {tier.repeat_rate}% lãi · thưởng doanh thu theo kỳ ×{tier.monthly_bonus_multiplier}. {tier.eligibility_mode === "all" ? "Đạt tất cả" : "Đạt một trong"} các ngưỡng: {tier.min_tenure_months == null ? "" : `${tier.min_tenure_months} tháng `}{tier.min_collected_12m == null ? "" : `${money(tier.min_collected_12m)} thu thuần / 12 tháng`}.</p><form className={styles.form} onSubmit={async event => {event.preventDefault();const form = new FormData(event.currentTarget);await onAction("partner_network_tier_state",{p_id:tier.id,p_input:{enabled:!tier.enabled,reason:reason(form)}},"Đã đổi trạng thái xét hạng. Thỏa thuận đã áp dụng giữ nguyên.");}}><label>Lý do mở / ngừng xét mới<textarea name="reason" required minLength={10} maxLength={1000}/></label><button type="submit" disabled={disabled}>{tier.enabled ? "Ngừng xét mới" : "Mở xét hạng này"}</button></form></details>)}</div>}</details>;
}

export default function PartnerRewardsDesk({ partners = [], snapshot = {}, onAction, busy = false, ready = false }) {
  const [selectedId, setSelectedId] = useState(""); const approved = list(partners).filter(row => row.status === "approved"); const selected = approved.find(row => row.id === selectedId) || approved[0]; const disabled = busy || !ready || typeof onAction !== "function";
  return <section className={styles.panel}><header><Award size={23}/><div><h2>Classic & thưởng đối tác</h2><p>Cùng cơ chế cho B2B và B2C; mọi số liệu chỉ từ khách và đơn đã xác nhận đúng nguồn.</p></div></header><label className={styles.select}><span>Đối tác đã được duyệt</span><select disabled={!approved.length || busy} value={selected?.id || ""} onChange={event => setSelectedId(event.target.value)}>{approved.length ? approved.map(row => <option key={row.id} value={row.id}>{row.business_name} · {row.code}</option>) : <option value="">Chưa có đối tác đã duyệt</option>}</select></label>{selected ? <PartnerFinance key={`${selected.id}-${list(snapshot.classic_agreements).length}-${list(snapshot.reward_rules).length}`} partner={selected} snapshot={snapshot} onAction={onAction} disabled={disabled}/> : <p>Duyệt hồ sơ trước khi áp dụng điều kiện và thưởng.</p>}<TierConfig tiers={list(snapshot.tiers)} onAction={onAction} disabled={disabled}/></section>;
}

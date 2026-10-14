"use client";

import { useMemo, useState } from "react";
import { Save, Search } from "lucide-react";
import { normalizePartnerOrderUpdate } from "@/lib/partner-order-journey";
import PartnerOrderJourney from "./PartnerOrderJourney";
import styles from "./PartnerOrderUpdateEditor.module.css";

function UpdateForm({ order, onAction, busy, ready }) {
  const [forecast, setForecast] = useState(order.forecast_amount ?? "");
  const [error, setError] = useState("");
  async function submit(event) {
    event.preventDefault();
    if (busy || !ready || typeof onAction !== "function") return;
    setError("");
    const form = new FormData(event.currentTarget);
    let input;
    try { input = normalizePartnerOrderUpdate(Object.fromEntries(["forecast_amount", "forecast_note", "expected_payment_on", "public_note", "next_action", "reason"].map(key => [key, String(form.get(key) || "")]))); }
    catch (err) {
      setError(err.message === "invalid_partner_forecast" ? "Nhập hoa hồng dự kiến theo nguyên đồng VND, hoặc để trống nếu chưa rõ." : err.message === "invalid_partner_payment_date" ? "Kiểm tra ngày dự kiến trả hoa hồng." : err.message === "partner_forecast_note_required" ? "Ghi cơ sở hoặc điều kiện cho số hoa hồng dự kiến." : "Kiểm tra độ dài thông tin và ghi lý do cập nhật.");
      return;
    }
    await onAction("partner_network_order_partner_update", { p_order_id: order.id, p_input: input }, "Đã cập nhật tiến độ và dự kiến cho đối tác.");
  }
  return <form className={styles.form} onSubmit={submit}>
    <h3>Cập nhật cho đối tác</h3><p className={styles.hint}>Các ô dưới đây hiển thị trong bàn của đúng đối tác giới thiệu đơn này. Chỉ viết thông tin được phép chia sẻ; ghi chú nội bộ vẫn ở hồ sơ đơn / Pipeline.</p>
    <fieldset className={styles.fields} disabled={busy || !ready}>
      <label className={styles.wide}><span>Bước tiếp theo để đối tác theo dõi</span><input name="next_action" maxLength={160} defaultValue={order.next_action || ""} placeholder="Ví dụ: chờ khách thử trà và xác nhận số lượng"/></label>
      <label className={styles.wide}><span>Cập nhật tiến triển / vướng mắc được chia sẻ</span><textarea name="public_note" rows={3} maxLength={500} defaultValue={order.public_note || ""} placeholder="Tình hình mới, thông tin cần khách xác nhận…"/></label>
      <label><span>Hoa hồng dự kiến (VND)</span><input name="forecast_amount" type="number" min="0" max="999999999999" step="1" inputMode="numeric" value={forecast} onChange={event => setForecast(event.target.value)} placeholder="Chưa rõ thì để trống"/><small>Số dự kiến do quản lý nhập; không đổi kết quả đối soát hoặc khoản đã trả.</small></label>
      <label><span>Dự kiến trả hoa hồng</span><input name="expected_payment_on" type="date" min="1900-01-01" max="2100-12-31" defaultValue={order.expected_payment_on || ""}/><small>Để trống nếu chưa chốt. Khác với ngày giao hàng dự kiến.</small></label>
      <label className={styles.wide}><span>Cơ sở / điều kiện của dự kiến</span><textarea name="forecast_note" rows={2} maxLength={1000} required={forecast !== ""} defaultValue={order.forecast_note || ""} placeholder="Ví dụ: dự kiến khi khách thanh toán đủ và chi phí được đối soát"/></label>
      <label className={styles.wide}><span>Lý do cập nhật <small>Chỉ lưu trong lịch sử quản lý</small></span><textarea name="reason" rows={2} required maxLength={1000} placeholder="Thông tin mới từ đâu, vì sao đổi dự kiến…"/></label>
    </fieldset>
    {error && <p className={styles.error} role="alert">{error}</p>}
    <button className={styles.primary} type="submit" disabled={busy || !ready}><Save size={17} aria-hidden="true"/>{busy ? "Đang lưu…" : "Lưu cập nhật cho đối tác"}</button>
  </form>;
}

// Reuses the manager desk's authenticated onAction RPC runner. This component
// never fetches the CRM independently or bypasses the desk's role/feature gate.
export default function PartnerOrderUpdateEditor({ orders = [], updates = [], referrals = [], partners = [], onAction, busy = false, ready = false }) {
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const records = useMemo(() => {
    const updateRows = new Map((Array.isArray(updates) ? updates : []).map(row => [row.id || row.order_id, row]));
    const sourceOrders = Array.isArray(orders) ? orders : [];
    const source = [...sourceOrders, ...[...updateRows].filter(([id]) => !sourceOrders.some(row => row.id === id)).map(([, row]) => row)];
    return source.filter(row => row.partner_id && row.referral_id).map(row => {
      const update = updateRows.get(row.id || row.order_id);
      const referral = referrals.find(item => item.id === row.referral_id);
      const partner = partners.find(item => item.id === row.partner_id);
      return { ...row, ...update, id: row.id || row.order_id, business_name: referral?.business_name || update?.referral_name || row.referral_name || row.business_name || row.customer_name, partner_name: partner?.business_name || partner?.contact_name || row.partner_name || "Đối tác giới thiệu" };
    });
  }, [orders, updates, referrals, partners]);
  const query = search.trim().toLocaleLowerCase("vi");
  const matching = records.filter(row => `${row.id} ${row.business_name || ""} ${row.partner_name}`.toLocaleLowerCase("vi").includes(query));
  const selected = matching.find(row => row.id === selectedId) || matching[0];
  return <section className={styles.panel} aria-labelledby="partner-order-progress-title">
    <header><h2 id="partner-order-progress-title">Tiến độ đơn cho đối tác</h2><p>Mỗi đơn vẫn được xử lý ở Orderbook. Tại đây bạn chọn thông tin tiến triển và dự kiến hoa hồng để đối tác theo dõi.</p></header>
    <div className={styles.selector}><label className={styles.search}><span>Tìm đơn / khách / đối tác</span><div><Search size={17} aria-hidden="true"/><input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Tên khách hoặc mã đơn"/></div></label><label className={styles.choose}><span>Đơn đã gắn nguồn giới thiệu</span><select value={selected?.id || ""} disabled={!matching.length || busy} onChange={event => setSelectedId(event.target.value)}>{matching.length ? matching.map(row => <option key={row.id} value={row.id}>{row.business_name || row.id} · {row.partner_name} · {row.id}</option>) : <option value="">{records.length ? "Không có đơn khớp tìm kiếm" : "Chưa có đơn gắn nguồn giới thiệu"}</option>}</select></label></div>
    {selected ? <div className={styles.workspace}><div><p className={styles.owner}>Đối tác theo dõi: <strong>{selected.partner_name}</strong></p><PartnerOrderJourney order={selected} businessName={selected.business_name} compact/></div><UpdateForm key={`${selected.id}-${selected.updated_at || ""}-${selected.forecast_amount ?? ""}`} order={selected} onAction={onAction} busy={busy} ready={ready}/></div> : <p className={styles.empty}>{records.length ? "Thử mã đơn, tên khách hoặc tên đối tác khác." : "Đơn sẽ xuất hiện khi được gắn với khách giới thiệu đã tiếp nhận. Bạn vẫn tạo mẫu, báo giá và đơn theo quy trình hiện có."}</p>}
  </section>;
}

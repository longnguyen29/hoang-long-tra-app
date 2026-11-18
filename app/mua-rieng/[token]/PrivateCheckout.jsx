"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Leaf } from "lucide-react";
import { sellingUnitLabel } from "@/lib/selling-units";
import styles from "./page.module.css";

const money = value => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value);

export default function PrivateCheckout({ token, name, items, revision, deliveryContact, deliveryAddress }) {
  const [quantities, setQuantities] = useState({});
  const [payment, setPayment] = useState("");
  const [receipt, setReceipt] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const attempt = useRef(null);
  const submitting = useRef(false);
  const total = items.reduce((sum, item) => sum + Math.round(Number(quantities[item.id] || 0) * item.price), 0);

  async function submit(event) {
    event.preventDefault();
    if (!total || submitting.current) return;
    const details = new FormData(event.currentTarget);
    const order = {
      revision, payment, consent: details.get("consent") === "on",
      quantities: Object.fromEntries(items.filter(item => Number(quantities[item.id]) > 0)
        .map(item => [item.id, Number(quantities[item.id])])),
      contact: String(details.get("contact")).trim(),
      address: String(details.get("address")).trim(),
      note: String(details.get("note")).trim(),
    };
    const signature = JSON.stringify(order);
    if (!attempt.current || attempt.current.signature !== signature) attempt.current = { signature, id: crypto.randomUUID() };
    submitting.current = true;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/mua-rieng/${token}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...order, requestId: attempt.current.id }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setReceipt(data);
    } catch (problem) {
      setError(problem.message === "page_changed" || problem.message === "page_closed"
        ? "Trang đặt hàng đã thay đổi. Vui lòng tải lại trang để xem thông tin mới nhất."
        : "Chưa xác nhận được đơn. Hãy giữ nguyên thông tin rồi bấm gửi lại để kiểm tra.");
    } finally { submitting.current = false; setBusy(false); }
  }

  return <main className={styles.page} lang="vi" data-no-translate>
    <header><Leaf size={18} aria-hidden="true"/> NHÀ HOÀNG LONG</header>
    {receipt ? <section className={styles.receipt} aria-live="polite">
      <Check aria-hidden="true"/>
      <h1>Nhà đã nhận đơn</h1>
      <p>Hoàng Long sẽ liên hệ để xác nhận giao hàng và thanh toán.</p>
      <p>Mã đơn: <strong>{receipt.orderId}</strong></p>
      {receipt.trackingToken && <Link href={`/don-hang/${receipt.trackingToken}`}>Theo dõi đơn hàng <ArrowRight size={16} aria-hidden="true"/></Link>}
    </section> : <>
      <h1>Đặt trà cho {name}</h1>
      <form onSubmit={submit}>
        <fieldset disabled={busy} className={styles.items}>
          <legend>Trà đã chọn</legend>
          {items.map(item => {
            const unit = sellingUnitLabel(item.unit);
            return <div className={styles.item} key={item.id}>
              <div><strong>{item.name}</strong>{item.weight && <small>{item.weight}</small>}
                <small>{money(item.price)} / {unit}</small></div>
              <label>Số lượng ({unit})<input aria-label={`Số lượng ${item.name} (${unit})`} type="number" min="0" max="100000"
                step={item.unit === "kg" ? "0.001" : "1"} inputMode={item.unit === "kg" ? "decimal" : "numeric"}
                value={quantities[item.id] ?? ""} placeholder="0"
                onChange={event => setQuantities(previous => ({ ...previous, [item.id]: event.target.value }))}/></label>
              <b>{money(Math.round(Number(quantities[item.id] || 0) * item.price))}</b>
            </div>;
          })}
        </fieldset>
        <div className={styles.total}><span>Tổng tiền trà</span><strong>{money(total)}</strong></div>
        <p className={styles.hint}>Hoàng Long xác nhận phí giao hàng và số tiền thanh toán khi liên hệ.</p>
        <fieldset disabled={busy} className={styles.details}>
          <legend>Thông tin giao hàng</legend>
          <label>Số điện thoại hoặc email<input name="contact" required maxLength={240} defaultValue={deliveryContact}/></label>
          <label>Địa chỉ giao hàng<textarea name="address" rows={2} required maxLength={1000} autoComplete="street-address" defaultValue={deliveryAddress}/></label>
          <label>Ghi chú <small>(không bắt buộc)</small><textarea name="note" rows={2} maxLength={1000}/></label>
        </fieldset>
        <fieldset disabled={busy} className={styles.payment}>
          <legend>Phương thức thanh toán</legend>
          <label><input type="radio" name="payment" value="qr" required checked={payment === "qr"} onChange={() => setPayment("qr")}/> Chuyển khoản</label>
          <label><input type="radio" name="payment" value="cash" required checked={payment === "cash"} onChange={() => setPayment("cash")}/> Tiền mặt</label>
        </fieldset>
        <label className={styles.consent}><input type="checkbox" name="consent" required disabled={busy}/> <span>Tôi đồng ý để Hoàng Long dùng thông tin trên để xử lý đơn hàng. <Link href="/privacy">Quyền riêng tư</Link></span></label>
        {error && <p role="alert">{error}</p>}
        <button className={styles.submit} disabled={!total || busy}>{busy ? "Đang gửi đơn…" : "Gửi đơn hàng"}<ArrowRight size={18} aria-hidden="true"/></button>
      </form>
    </>}
  </main>;
}

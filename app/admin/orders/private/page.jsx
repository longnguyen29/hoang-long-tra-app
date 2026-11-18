"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { PRIVATE_LINK } from "@/lib/private-order";
import { ORDER_UNIT_CHOICES, sellingUnitLabel } from "@/lib/selling-units";
import styles from "./page.module.css";

const blank = { customer_name: "", active: false, items: [] };
const newItem = () => ({ id: crypto.randomUUID(), name: "", unit: "kg", price: "", weight: "" });

async function request(options = {}) {
  const { data: { session } } = await createClient().auth.getSession();
  if (!session) throw new Error("forbidden");
  const response = await fetch("/api/staff/private-orders", {
    ...options, cache: "no-store",
    headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error);
  return body;
}

export default function PrivateOrderAdmin() {
  const [pages, setPages] = useState([]);
  const [draft, setDraft] = useState(blank);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const stored = pages.find(page => page.id === draft.id);

  useEffect(() => {
    request().then(({ pages: rows }) => setPages(rows)).catch(() => setError("Chưa tải được danh sách trang mua riêng."))
      .finally(() => setLoading(false));
  }, []);

  function editItem(id, patch) {
    setDraft(previous => ({ ...previous, items: previous.items.map(item => item.id === id ? { ...item, ...patch } : item) }));
  }

  async function save(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const { page } = await request({
        method: "POST",
        body: JSON.stringify({ ...draft, items: draft.items.map(item => ({ ...item, price: Number(item.price) })) }),
      });
      setPages(previous => previous.some(item => item.id === page.id) ? previous.map(item => item.id === page.id ? page : item) : [page, ...previous]);
      setDraft(page);
      setMessage(page.active ? "Đã lưu. Khách có thể mở link để đặt hàng." : "Đã lưu trang ở trạng thái tạm đóng.");
    } catch (problem) {
      setError(problem.message === "page_changed" ? "Trang đã được sửa ở nơi khác. Tải lại trước khi tiếp tục." : "Chưa lưu được. Kiểm tra tên, giá và trạng thái mở trang.");
    } finally { setBusy(false); }
  }

  const sharePath = stored?.active ? PRIVATE_LINK + stored.token : "";

  return <main className={styles.page}>
    <Link href="/admin/orders">Về bàn đơn hàng</Link>
    <h1>Trang mua riêng</h1>
    <label>Trang của khách
      <select value={draft.id || ""} disabled={loading || busy} onChange={event => {
        setDraft(pages.find(page => page.id === event.target.value) || blank);
        setError(""); setMessage("");
      }}>
        <option value="">Tạo trang mới</option>
        {pages.map(page => <option key={page.id} value={page.id}>{page.customer_name}{page.active ? "" : " (tạm đóng)"}</option>)}
      </select>
    </label>
    {loading && <p role="status">Đang tải…</p>}
    <form onSubmit={save}>
      <fieldset disabled={busy || loading}>
        <label>Tên khách / quán<input required maxLength={120} value={draft.customer_name}
          onChange={event => setDraft({ ...draft, customer_name: event.target.value })}/></label>
        {draft.items.map((item, index) => <fieldset key={item.id} className={styles.item}>
          <legend>Sản phẩm {index + 1}</legend>
          <label>Tên đã chốt<input required maxLength={160} value={item.name} onChange={event => editItem(item.id, { name: event.target.value })}/></label>
          <label>Đơn vị<select value={item.unit} onChange={event => editItem(item.id, { unit: event.target.value })}>
            {ORDER_UNIT_CHOICES.map(unit => <option key={unit} value={unit}>{sellingUnitLabel(unit)}</option>)}
          </select></label>
          <label>Giá đã chốt (đ/đơn vị)<input type="number" min="1" max="1000000000" step="1" required
            value={item.price} onChange={event => editItem(item.id, { price: event.target.value })}/></label>
          <label>Quy cách <small>(nếu có)</small><input maxLength={120} value={item.weight} onChange={event => editItem(item.id, { weight: event.target.value })}/></label>
          <button type="button" onClick={() => setDraft({ ...draft, items: draft.items.filter(row => row.id !== item.id) })}>Bỏ sản phẩm</button>
        </fieldset>)}
        <button type="button" disabled={draft.items.length >= 30} onClick={() => setDraft({ ...draft, items: [...draft.items, newItem()] })}>Thêm sản phẩm</button>
        <label className={styles.toggle}><input type="checkbox" checked={draft.active}
          onChange={event => setDraft({ ...draft, active: event.target.checked })}/> Mở trang cho khách đặt hàng</label>
        <button className="hl-button hl-button--primary" type="submit">{busy ? "Đang lưu…" : "Lưu trang"}</button>
      </fieldset>
    </form>
    {message && <p role="status">{message}</p>}
    {error && <p role="alert">{error}</p>}
    {sharePath && <section className={styles.share}>
      <Link href={sharePath} prefetch={false}>Mở trang của khách</Link>
      <button type="button" onClick={async () => {
        try { await navigator.clipboard.writeText(new URL(sharePath, location.origin).href); setMessage("Đã sao chép link."); }
        catch { setMessage("Mở trang của khách rồi sao chép địa chỉ từ trình duyệt."); }
      }}>Sao chép link gửi khách</button>
      <p>Ai có link đều có thể xem giá và gửi đơn.</p>
    </section>}
  </main>;
}

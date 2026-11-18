"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { houseDateKey } from "@/lib/dashboard-calendar";
import { reconcileOrderStage, orderStageMeta } from "@/lib/order-flow";
import { loadMapIndex, loadMapStory } from "@/lib/system-map";
import OrderGraph from "./OrderGraph";
import styles from "./OrderJourneyMap.module.css";

const homeCamera = { yaw: -0.14, pitch: 0.15, zoom: 1 };
const hubs = [
  { xyz: [-2.9, 1, 0.25], color: "#7edec3" },
  { xyz: [-0.15, -0.25, 0.5], color: "#f2b76d" },
  { xyz: [2.8, 1.1, -0.3], color: "#80c7fc" },
  { xyz: [1.95, -1.3, -0.45], color: "#ba9bed" },
];
const titles = ["Khách & bán hàng", "Đơn hàng", "Xưởng & giao hàng", "Công nợ"];
const money = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 });
const orderLink = id => `/admin/orders?order=${encodeURIComponent(id)}#orders`;
const customerLink = id => `/admin/pipeline?opportunity=${encodeURIComponent(id)}`;
const quoteState = { draft: "Nháp", sent: "Đã gửi", accepted: "Đã chấp nhận", converted: "Đã tạo đơn", expired: "Hết hạn", declined: "Đã từ chối" };
const sampleState = { new: "Chờ gửi", sent: "Đã gửi", delivered: "Đã nhận", cancelled: "Đã hủy" };

function SaleStory({ story, onOrder, today }) {
  if (!story?.customer) return <p>Chưa ghi nhận khách hoặc cơ hội bán hàng liên kết.</p>;
  const { customer, samples, quotes, orders, partner, suggested, quote } = story;
  const latest = orders.find(order => reconcileOrderStage(order.stage, order.status) === "completed");
  const daysSince = latest?.ts ? (Date.parse(today) - Date.parse(houseDateKey(new Date(latest.ts)))) / 86400000 : null;
  const needsReorder = partner?.reorder_cadence_days > 0 && daysSince !== null && daysSince >= partner.reorder_cadence_days;
  return <>
    <Link href={customerLink(customer.id)}>{customer.business_name}</Link>
    {suggested && <p className={styles.blocked}>Cần xác nhận · Trùng thông tin liên hệ</p>}
    {customer.next_action && <p>{customer.next_action}{customer.next_action_at && houseDateKey(new Date(customer.next_action_at)) <= today ? " · Đến hạn theo dõi" : ""}</p>}
    {needsReorder && <p className={styles.blocked}>Đến nhịp đặt lại · {daysSince} ngày từ đơn hoàn tất gần nhất.</p>}
    {samples.length > 0 && <p>Mẫu thử · {samples.map(item => `${item.pack || item.id} (${sampleState[item.status] || item.status})`).join(", ")}</p>}
    {quotes.length > 0 && <p>Báo giá · {quotes.map(item => `${item.id} (${quoteState[item.status] || item.status})`).join(", ")}</p>}
    {quote && !quotes.some(item => item.id === quote.id) && <p>Báo giá của đơn · {quote.id} · {quoteState[quote.status] || quote.status}</p>}
    {orders.length > 0 && <ul>{orders.map(order => <li key={order.id}>
      <button type="button" onClick={() => onOrder(order.id)}>Xem đơn {order.id}</button>
    </li>)}</ul>}
  </>;
}

export default function SystemMap({ supabase, allowedModules }) {
  const sales = allowedModules === null || allowedModules.includes("pipeline");
  const operations = allowedModules === null || allowedModules.includes("operations");
  const procedures = allowedModules === null || allowedModules.includes("procedures");
  const [camera, setCamera] = useState(homeCamera);
  const [flat, setFlat] = useState(false);
  const fallback = useCallback(() => setFlat(true), []);
  const [section, setSection] = useState("1");
  const [kind, setKind] = useState("order");
  const [id, setId] = useState("");
  const [lookup, setLookup] = useState("");
  const [index, setIndex] = useState(null);
  const [story, setStory] = useState(null);
  const [indexError, setIndexError] = useState(false);
  const [storyError, setStoryError] = useState(false);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let active = true;
    setIndexError(false);
    loadMapIndex(supabase, sales).then(data => { if (active) setIndex(data); })
      .catch(() => { if (active) setIndexError(true); });
    return () => { active = false; };
  }, [supabase, sales, revision]);

  useEffect(() => {
    let active = true;
    setStory(null);
    setStoryError(false);
    if (id) loadMapStory(supabase, kind, id, { sales, operations, procedures })
      .then(data => { if (active) { setStory(data); setStoryError(!data); } })
      .catch(() => { if (active) setStoryError(true); });
    return () => { active = false; };
  }, [supabase, kind, id, sales, operations, procedures, revision]);

  const selectOrder = orderId => { setSection("1"); setKind("order"); setId(orderId); };
  const selectCustomer = customerId => { setSection("0"); setKind("customer"); setId(customerId); };
  const matchedStory = kind === "order" ? story?.order?.id === id && story : story?.customer?.id === id && story;
  const order = matchedStory?.order;
  const sale = order ? matchedStory?.sales : matchedStory;
  const allocations = matchedStory?.allocations || [];
  const procedure = matchedStory?.procedure;
  const receivable = matchedStory?.receivable;
  const today = houseDateKey();
  const amountDue = receivable && ["open", "partial"].includes(receivable.status) ? Math.max(0, Number(receivable.total) - Number(receivable.paid)) : 0;
  const orderStage = order && reconcileOrderStage(order.stage, order.status);
  const missingBatch = operations && order?.type === "wholesale" && ["production", "packing"].includes(orderStage) && !allocations.length;
  const late = procedure?.delivery_due_at && new Date(procedure.delivery_due_at) < new Date() && orderStage !== "completed";
  const counts = matchedStory
    ? [(sale?.samples?.length || 0) + (sale?.quotes?.length || 0), order ? 1 : sale?.orders?.length ?? 0,
      order ? allocations.length + Number(Boolean(procedure)) + Number(Boolean(order.tracking_code)) : null,
      order ? Number(Boolean(receivable)) : null]
    : [index?.acceptedQuotes.length, index?.orders.length, null, null];
  const visible = [sales, true, operations || procedures, operations];
  const phases = titles.map((zone, key) => ({ id: String(key), zone, count: counts[key],
    blocked: key === 1 && order?.health === "blocked" ? 1 : 0,
    caption: key === 0 && sale?.suggested ? "Cần xác nhận" : key === 2 && (missingBatch || late) ? "Cần kiểm tra" : undefined,
  }));
  const connections = [
    { from: 0, to: 1, tentative: Boolean(sale?.suggested), show: !id || Boolean(order ? sale?.customer || sale?.quote : sale?.orders?.length) },
    { from: 1, to: 2, show: !id || Boolean(allocations.length || procedure || order?.tracking_code) },
    { from: 1, to: 3, show: !id || Boolean(receivable) },
  ].filter(edge => edge.show && visible[edge.from] && visible[edge.to]);
  const visiblePhases = phases.filter((_, key) => visible[key]);
  const visibleHubs = hubs.filter((_, key) => visible[key]);
  const edges = connections.map(edge => ({ ...edge, from: visiblePhases.indexOf(phases[edge.from]), to: visiblePhases.indexOf(phases[edge.to]) }));
  const options = kind === "order" ? index?.orders || [] : index?.customers || [];
  const extra = id && !options.some(item => item.id === id);
  const activeSection = visible[Number(section)] ? section : "1";

  return <div className={styles.systemMap}>
    <div className={styles.systemToolbar}>
      <label>Tra theo<select value={kind} onChange={event => { setKind(event.target.value); setId(""); setLookup(""); setSection(event.target.value === "order" ? "1" : "0"); }}>
        <option value="order">Đơn hàng</option>{sales && <option value="customer">Khách hàng</option>}
      </select></label>
      <label>Hồ sơ gần đây<select value={id} onChange={event => kind === "order" ? selectOrder(event.target.value) : selectCustomer(event.target.value)}>
        <option value="">Xem toàn cảnh</option>{extra && <option value={id}>{id}</option>}
        {options.map(item => <option key={item.id} value={item.id}>{item.customer_name || item.business_name || item.id}{kind === "order" ? ` · ${item.id}` : ""}</option>)}
      </select></label>
      <button type="button" onClick={() => setRevision(value => value + 1)}>Làm mới</button>
    </div>
    <form className={styles.systemLookup} onSubmit={event => {
      event.preventDefault();
      if (lookup.trim()) (kind === "order" ? selectOrder : selectCustomer)(lookup.trim());
    }}>
      <label>{kind === "order" ? "Mã đơn" : "Mã khách"}<input value={lookup} maxLength={160} onChange={event => setLookup(event.target.value)} /></label>
      <button type="submit" disabled={!lookup.trim()}>Mở theo mã</button>
    </form>
    {indexError && <p role="status">Chưa tải được danh sách hồ sơ. Bấm Làm mới để thử lại.</p>}
    <div className={styles.scene}>
      <div className={styles.controls}>
        {!flat && <button type="button" onClick={() => setCamera(homeCamera)}>Đặt lại góc nhìn</button>}
        {!flat && <button type="button" onClick={() => setCamera(value => ({ ...value, yaw: value.yaw + 0.3 }))}>Xoay</button>}
        <button type="button" aria-pressed={flat} onClick={() => setFlat(value => !value)}>{flat ? "Mở đồ thị 3D" : "Xem dạng phẳng"}</button>
      </div>
      {flat ? <div className={styles.track}>{visiblePhases.map(phase =>
        <button key={phase.id} type="button" aria-pressed={phase.id === activeSection} className={styles.stop} onClick={() => setSection(phase.id)}>
          <strong>{phase.zone}</strong><span>{phase.count ?? "—"}</span>
        </button>)}</div> : <OrderGraph phases={visiblePhases} hubs={visibleHubs} edges={edges} current={activeSection} snapshot={Boolean(index || matchedStory)}
        controls={camera} onCameraChange={setCamera} onSelect={setSection} detailId="system-map-detail" onUnavailable={fallback} />}
      <p className={styles.graphHint}>{id ? "Nét liền · Có liên kết đã lưu. Nét đứt · Cần xác nhận." : "Luồng tổng quan · Chọn một hồ sơ để xem các liên kết đã lưu."}</p>
    </div>
    <section className={styles.systemDetail} id="system-map-detail" aria-label={titles[Number(activeSection)]}>
      <h3>{titles[Number(activeSection)]}</h3>
      {storyError ? <p role="status">Chưa tải được liên kết cho hồ sơ này. Bấm Làm mới để thử lại.</p>
        : id && !matchedStory ? <p role="status">Đang tải hồ sơ…</p>
        : !id ? <>
          <p>{index ? `Đang hiển thị tối đa 60 hồ sơ gần đây mỗi loại.` : "Đang tải danh sách hồ sơ…"}</p>
          {sales && activeSection === "0" && index?.acceptedQuotes.length > 0 && <>
            <p>Báo giá đã chấp nhận chưa có đơn trong danh sách đang xem</p>
            <ul>{index.acceptedQuotes.map(quote => <li key={quote.id}>
              {quote.opportunity_id ? <button type="button" onClick={() => selectCustomer(quote.opportunity_id)}>{quote.id}</button> : quote.id}
            </li>)}</ul>
          </>}
        </> : activeSection === "0" ? <SaleStory story={sale} onOrder={selectOrder} today={today} />
        : activeSection === "1" ? order ? <>
          <Link href={orderLink(order.id)}>{order.customer_name || order.id} · {orderStageMeta(orderStage).label}</Link>
          {order.reorder_of_order_id && <button type="button" onClick={() => selectOrder(order.reorder_of_order_id)}>Xem đơn gốc</button>}
          {matchedStory.laterOrders.map(item => <button key={item.id} type="button" onClick={() => selectOrder(item.id)}>Đơn đặt lại {item.id}</button>)}
        </> : <><p>Đơn liên kết đã lưu với khách này</p><ul>{sale?.orders?.map(item => <li key={item.id}><button type="button" onClick={() => selectOrder(item.id)}>{item.id}</button></li>)}</ul>{!sale?.orders?.length && <p>Chưa có đơn liên kết.</p>}</>
        : !order ? <p>Chọn một đơn liên kết để xem nhánh này.</p>
        : activeSection === "2" ? <>
          {operations && <p>{allocations.length ? allocations.map(item => `${item.tea_batches?.code || "Lô trà"} · ${item.quantity_kg} kg${item.tea_batches?.status === "held" ? " · Đang giữ" : ""}`).join(", ") : "Chưa có lô phân bổ."}</p>}
          {missingBatch && <p className={styles.blocked}>Đơn đang sản xuất hoặc đóng gói và chưa có lô phân bổ.</p>}
          {procedure && <Link href={`/admin/procedures/${encodeURIComponent(procedure.id)}`}>{procedure.next_action || "Mở quy trình xử lý đơn"}</Link>}
          {late && <p className={styles.blocked}>Đã qua hạn giao dự kiến.</p>}
          {order.tracking_code && <p>Mã vận đơn · {order.tracking_code}</p>}
        </> : receivable ? <>
          <p>Khoản phải thu {receivable.invoice_number || receivable.id} · Đã thu {money.format(receivable.paid)} · Còn {money.format(amountDue)}</p>
          {amountDue > 0 && receivable.due_at && <p className={receivable.due_at < today ? styles.blocked : undefined}>Hạn thu · {receivable.due_at}</p>}
          {matchedStory.payments.length > 0 && <ul>{matchedStory.payments.map(item => <li key={item.id}>{new Date(item.paid_at).toLocaleDateString("vi-VN", {timeZone:"Asia/Ho_Chi_Minh"})} · {money.format(item.amount)}</li>)}</ul>}
          <Link href="/admin/operations?tab=finance">Mở công nợ</Link>
        </> : <p>Chưa có khoản phải thu liên kết với đơn.</p>}
    </section>
  </div>;
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  CalendarClock,
  Check,
  CircleDollarSign,
  ClipboardCheck,
  Factory,
  FilePlus2,
  Leaf,
  PackageCheck,
  Plus,
  RefreshCw,
  Save,
  ShieldCheck,
  TrendingUp,
  WalletCards,
  X,
} from "lucide-react";
import styles from "./OperationsControl.module.css";

const money = (value) => `${Number(value || 0).toLocaleString("vi-VN")}đ`;
const shortDate = (value) =>
  value ? new Intl.DateTimeFormat("vi-VN").format(new Date(value)) : "—";
const inputDate = (days = 0) => {
  const value = new Date();
  value.setDate(value.getDate() + days);
  return value.toISOString().slice(0, 10);
};
const slug = (value) =>
  `${value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 28)}-${Date.now().toString(36)}`;
const emptyBatch = () => ({
  id: "",
  code: "",
  product_id: "",
  name: "",
  origin: "Hà Giang",
  producer: "Nhà làm Trà Hoàng Long",
  harvest_date: "",
  season: "",
  process: "",
  cultivar: "Shan Tuyết",
  tasting_vi: "",
  tasting_en: "",
  aroma: "",
  liquor: "",
  leaf: "",
  moisture_percent: "",
  grade: "",
  available_kg: "",
  reserved_kg: 0,
  cost_per_kg: "",
  status: "draft",
  photo_url: "",
  document_url: "",
  notes: "",
});

export default function OperationsControl({ supabase, email, onLogout }) {
  const [tab, setTab] = useState("owner"),
    [snapshot, setSnapshot] = useState(null),
    [orders, setOrders] = useState([]),
    [receivables, setReceivables] = useState([]),
    [payments, setPayments] = useState([]),
    [batches, setBatches] = useState([]),
    [allocations, setAllocations] = useState([]),
    [reservations, setReservations] = useState([]),
    [products, setProducts] = useState([]),
    [loading, setLoading] = useState(true),
    [saving, setSaving] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [invoice, setInvoice] = useState(null),
    [payment, setPayment] = useState(null),
    [batch, setBatch] = useState(null),
    [allocation, setAllocation] = useState(null);
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const [s, o, r, p, b, a, i, c] = await Promise.all([
      supabase.rpc("operations_control_snapshot"),
      supabase.from("orders").select("*").order("ts", { ascending: false }),
      supabase
        .from("receivables")
        .select("*")
        .order("issued_at", { ascending: false }),
      supabase
        .from("receivable_payments")
        .select("*")
        .order("paid_at", { ascending: false }),
      supabase
        .from("tea_batches")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase
        .from("order_batch_allocations")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase
        .from("inventory_reservations")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase
        .from("catalog_products")
        .select("id,name,stock_ha_giang,stock_soc_son,available,kind")
        .order("name"),
    ]);
    if ([s, o, r, p, b, a, i, c].some((result) => result.error))
      setError(
        "Chưa tải được toàn bộ dữ liệu vận hành. Kiểm tra migration 0035.",
      );
    if (!s.error) setSnapshot(s.data);
    if (!o.error) setOrders(o.data || []);
    if (!r.error) setReceivables(r.data || []);
    if (!p.error) setPayments(p.data || []);
    if (!b.error) setBatches(b.data || []);
    if (!a.error) setAllocations(a.data || []);
    if (!i.error) setReservations(i.data || []);
    if (!c.error) setProducts(c.data || []);
    setLoading(false);
  }, [supabase]);
  useEffect(() => {
    load();
  }, [load]);
  const flash = (message) => {
    setNotice(message);
    setTimeout(() => setNotice(""), 2200);
  };
  const kpis = snapshot?.kpis || {},
    actions = snapshot?.today_actions || {},
    reorders = snapshot?.reorders || [],
    stock = snapshot?.stock || [];
  const orderMap = useMemo(
      () => Object.fromEntries(orders.map((item) => [item.id, item])),
      [orders],
    ),
    productMap = useMemo(
      () => Object.fromEntries(products.map((item) => [item.id, item])),
      [products],
    );
  const uninvoiced = orders.filter(
    (order) =>
      order.type === "wholesale" &&
      !receivables.some((item) => item.order_id === order.id) &&
      order.estimated_total > 0,
  );
  const openReceivables = receivables.filter((item) =>
    ["open", "partial"].includes(item.status),
  );
  const saveInvoice = async (event) => {
    event.preventDefault();
    const order = orderMap[invoice.order_id];
    if (!order) return;
    setSaving(true);
    const row = {
      id: `recv-${order.id}`,
      order_id: order.id,
      partner_account_id: order.partner_account_id || null,
      invoice_number: invoice.invoice_number.trim(),
      issued_at: invoice.issued_at,
      due_at: invoice.due_at || null,
      total: Number(order.estimated_total) || 0,
      paid: 0,
      status: "open",
      payment_terms: invoice.payment_terms.trim(),
      note: invoice.note.trim(),
    };
    const { error: saveError } = await supabase.from("receivables").insert(row);
    setSaving(false);
    if (saveError) {
      setError("Chưa phát hành được công nợ cho đơn này.");
      return;
    }
    setInvoice(null);
    flash("Đã phát hành công nợ");
    load();
  };
  const recordPayment = async (event) => {
    event.preventDefault();
    setSaving(true);
    const { error: saveError } = await supabase.rpc(
      "record_receivable_payment",
      {
        p_receivable_id: payment.receivable_id,
        p_amount: Number(payment.amount),
        p_method: payment.method,
        p_reference: payment.reference,
        p_note: payment.note,
        p_actor: email,
      },
    );
    setSaving(false);
    if (saveError) {
      setError("Số tiền không hợp lệ hoặc vượt số còn phải thu.");
      return;
    }
    setPayment(null);
    flash("Đã ghi nhận thanh toán");
    load();
  };
  const editBatch = (item) =>
    setBatch(
      item
        ? {
            ...item,
            name: item.name?.vi || item.name?.en || "",
            harvest_date: item.harvest_date || "",
            tasting_vi: item.tasting_notes?.vi || "",
            tasting_en: item.tasting_notes?.en || "",
            aroma: item.quality_metrics?.aroma || "",
            liquor: item.quality_metrics?.liquor || "",
            leaf: item.quality_metrics?.leaf || "",
          }
        : emptyBatch(),
    );
  const saveBatch = async (event) => {
    event.preventDefault();
    if (!batch.code.trim() || !batch.name.trim()) return;
    setSaving(true);
    const row = {
      ...batch,
      id: batch.id || slug(batch.code),
      code: batch.code.trim().toUpperCase(),
      product_id: batch.product_id || null,
      name: { vi: batch.name.trim(), en: batch.name.trim() },
      harvest_date: batch.harvest_date || null,
      tasting_notes: {
        vi: batch.tasting_vi.trim(),
        en: batch.tasting_en.trim(),
      },
      quality_metrics: {
        aroma: batch.aroma.trim(),
        liquor: batch.liquor.trim(),
        leaf: batch.leaf.trim(),
      },
      moisture_percent:
        batch.moisture_percent === "" ? null : Number(batch.moisture_percent),
      available_kg: Number(batch.available_kg) || 0,
      reserved_kg: Number(batch.reserved_kg) || 0,
      cost_per_kg: batch.cost_per_kg === "" ? null : Number(batch.cost_per_kg),
      updated_at: new Date().toISOString(),
    };
    delete row.tasting_vi;
    delete row.tasting_en;
    delete row.aroma;
    delete row.liquor;
    delete row.leaf;
    const { error: saveError } = await supabase.from("tea_batches").upsert(row);
    setSaving(false);
    if (saveError) {
      setError("Chưa lưu được hồ sơ lô trà.");
      return;
    }
    setBatch(null);
    flash("Đã lưu hồ sơ lô trà");
    load();
  };
  const allocate = async (event) => {
    event.preventDefault();
    setSaving(true);
    const { error: saveError } = await supabase.rpc("allocate_batch_to_order", {
      p_order_id: allocation.order_id,
      p_batch_id: allocation.batch_id,
      p_product_id: allocation.product_id || "",
      p_quantity_kg: Number(allocation.quantity_kg),
      p_actor: email,
    });
    setSaving(false);
    if (saveError) {
      setError("Không thể phân bổ: kiểm tra lượng còn lại và trạng thái lô.");
      return;
    }
    setAllocation(null);
    flash("Đã gắn lô trà với đơn");
    load();
  };
  const reservationStatus = async (item, status) => {
    const { error: updateError } = await supabase
      .from("inventory_reservations")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", item.id);
    if (updateError) {
      setError("Chưa cập nhật được phần giữ hàng.");
      return;
    }
    flash(
      status === "fulfilled" ? "Đã xuất phần giữ hàng" : "Đã trả hàng về tồn",
    );
    load();
  };
  const tabs = [
    ["owner", "Chủ doanh nghiệp", BarChart3],
    ["finance", "Công nợ", WalletCards],
    ["batches", "Lô & chất lượng", ShieldCheck],
    ["planning", "Kế hoạch", TrendingUp],
  ];
  if (loading)
    return (
      <main className={styles.state}>
        <RefreshCw />
        <p>Đang tổng hợp vận hành…</p>
      </main>
    );
  return (
    <main className={styles.page}>
      <header className={styles.top}>
        <div>
          <Link href="/admin">
            <ArrowLeft />
            Điều phối
          </Link>
          <span>Operating control</span>
        </div>
        <div>
          <span>
            <b>{email}</b>
            <small>Góc nhìn chủ doanh nghiệp</small>
          </span>
          <button onClick={load}>
            <RefreshCw />
          </button>
          <button onClick={onLogout}>Đăng xuất</button>
        </div>
      </header>
      <section className={styles.heading}>
        <p>Từ doanh thu đến lá trà</p>
        <h1>Một vòng vận hành, không đứt đoạn.</h1>
        <span>
          Tiền phải thu, lô nào đang giao, khách nào sắp đặt lại và sản phẩm nào
          cần chuẩn bị.
        </span>
      </section>
      <nav className={styles.tabs}>
        {tabs.map(([id, label, Icon]) => (
          <button key={id} data-active={tab === id} onClick={() => setTab(id)}>
            <Icon />
            {label}
          </button>
        ))}
        <Link href="/admin/operations/budget">
          <CircleDollarSign />
          Ngân sách
        </Link>
      </nav>
      {error && (
        <p className={styles.toast} data-error>
          {error}
          <button onClick={() => setError("")}>×</button>
        </p>
      )}
      {notice && (
        <p className={styles.toast}>
          <Check />
          {notice}
        </p>
      )}
      {tab === "owner" && (
        <section className={styles.owner}>
          <div className={styles.metrics}>
            {[
              [
                "Doanh thu 30 ngày",
                money(kpis.revenue_30d),
                `${kpis.orders_30d || 0} đơn`,
                CircleDollarSign,
              ],
              [
                "Đã thu 30 ngày",
                money(kpis.cash_collected_30d),
                "Theo sổ thanh toán",
                WalletCards,
              ],
              [
                "Phải thu",
                money(kpis.receivable_open),
                `${money(kpis.receivable_overdue)} quá hạn`,
                CalendarClock,
              ],
              [
                "Biên gộp đã xác định",
                money(kpis.gross_margin_known_30d),
                `${kpis.cost_coverage_orders || 0} đơn đã gắn lô và giá vốn`,
                Leaf,
              ],
            ].map(([label, value, note, Icon]) => (
              <article key={label}>
                <Icon />
                <span>{label}</span>
                <b>{value}</b>
                <small>{note}</small>
              </article>
            ))}
          </div>
          <div className={styles.ownerGrid}>
            <section className={styles.actions}>
              <header>
                <p>Today</p>
                <h2>Việc cần nhìn hôm nay</h2>
              </header>
              {[
                [
                  "Công nợ quá hạn",
                  actions.overdue_invoices || 0,
                  "finance",
                  AlertTriangle,
                ],
                [
                  "Báo giá sắp hết hạn",
                  actions.quotes_expiring || 0,
                  "owner",
                  FilePlus2,
                ],
                [
                  "Đơn đang bị chặn",
                  actions.orders_blocked || 0,
                  "owner",
                  PackageCheck,
                ],
                [
                  "Bảng giá cần rà soát",
                  actions.price_reviews || 0,
                  "owner",
                  CalendarClock,
                ],
              ].map(([label, value, target, Icon]) => (
                <button key={label} onClick={() => setTab(target)}>
                  <Icon />
                  <span>{label}</span>
                  <b>{value}</b>
                </button>
              ))}
            </section>
            <section className={styles.reorder}>
              <header>
                <p>Reorder watch</p>
                <h2>Đối tác đến nhịp đặt lại</h2>
              </header>
              {reorders
                .filter((item) => Number(item.days_due) >= -7)
                .slice(0, 8)
                .map((item) => (
                  <article key={item.account_id} data-due={item.days_due >= 0}>
                    <span>
                      <b>{item.business_name}</b>
                      <small>
                        {item.contact} · đơn gần nhất{" "}
                        {shortDate(item.last_order_at)}
                      </small>
                    </span>
                    <strong>
                      {item.days_due >= 0
                        ? `Trễ ${item.days_due} ngày`
                        : `Còn ${Math.abs(item.days_due)} ngày`}
                    </strong>
                  </article>
                ))}
              {!reorders.length && <p>Chưa đủ lịch sử đơn sỉ.</p>}
            </section>
          </div>
        </section>
      )}
      {tab === "finance" && (
        <section className={styles.panel}>
          <header>
            <div>
              <p>Accounts receivable</p>
              <h2>Tiền phải thu</h2>
            </div>
            <button
              disabled={!uninvoiced.length}
              onClick={() =>
                setInvoice({
                  order_id: uninvoiced[0]?.id || "",
                  invoice_number: "",
                  issued_at: inputDate(),
                  due_at: inputDate(30),
                  payment_terms: "Thanh toán trong 30 ngày.",
                  note: "",
                })
              }
            >
              <FilePlus2 />
              Phát hành công nợ
            </button>
          </header>
          <div className={styles.financeSummary}>
            <article>
              <span>Đang mở</span>
              <b>
                {money(
                  openReceivables.reduce(
                    (sum, item) => sum + Number(item.total - item.paid),
                    0,
                  ),
                )}
              </b>
            </article>
            <article>
              <span>Quá hạn</span>
              <b>
                {money(
                  openReceivables
                    .filter((item) => item.due_at && item.due_at < inputDate())
                    .reduce(
                      (sum, item) => sum + Number(item.total - item.paid),
                      0,
                    ),
                )}
              </b>
            </article>
            <article>
              <span>Chưa phát hành</span>
              <b>{uninvoiced.length} đơn</b>
            </article>
          </div>
          <div className={styles.rows}>
            {receivables.map((item) => {
              const remaining = Number(item.total) - Number(item.paid),
                overdue =
                  ["open", "partial"].includes(item.status) &&
                  item.due_at &&
                  item.due_at < inputDate();
              return (
                <article key={item.id} data-alert={overdue}>
                  <span>
                    <b>{item.invoice_number || item.id}</b>
                    <small>
                      {orderMap[item.order_id]?.customer_name || item.order_id}{" "}
                      · hạn {shortDate(item.due_at)}
                    </small>
                  </span>
                  <strong>
                    {money(remaining)}
                    <small> / {money(item.total)}</small>
                  </strong>
                  <i>
                    {item.status === "paid"
                      ? "Đã thu"
                      : overdue
                        ? "Quá hạn"
                        : item.status === "partial"
                          ? "Một phần"
                          : "Đang mở"}
                  </i>
                  {remaining > 0 && item.status !== "void" && (
                    <button
                      onClick={() =>
                        setPayment({
                          receivable_id: item.id,
                          amount: remaining,
                          method: "bank_transfer",
                          reference: "",
                          note: "",
                        })
                      }
                    >
                      <Plus />
                      Ghi nhận tiền
                    </button>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      )}
      {tab === "batches" && (
        <section className={styles.panel}>
          <header>
            <div>
              <p>Batch passports</p>
              <h2>Lô trà & chất lượng</h2>
            </div>
            <div>
              <button
                onClick={() =>
                  setAllocation({
                    order_id:
                      orders.find(
                        (item) =>
                          item.type === "wholesale" &&
                          item.status !== "completed",
                      )?.id || "",
                    batch_id:
                      batches.find((item) => item.status === "released")?.id ||
                      "",
                    product_id: "",
                    quantity_kg: "",
                  })
                }
              >
                <ClipboardCheck />
                Gắn vào đơn
              </button>
              <button onClick={() => editBatch(null)}>
                <Plus />
                Tạo lô
              </button>
            </div>
          </header>
          <div className={styles.batchGrid}>
            {batches.map((item) => (
              <article key={item.id} data-status={item.status}>
                {item.photo_url ? (
                  <img src={item.photo_url} alt="" />
                ) : (
                  <Leaf />
                )}
                <span>
                  {item.code} · {item.status}
                </span>
                <h3>{item.name?.vi || item.name?.en}</h3>
                <p>
                  {item.origin} · {item.season || shortDate(item.harvest_date)}
                </p>
                <div>
                  <b>
                    {Number(item.available_kg) - Number(item.reserved_kg)} kg
                  </b>
                  <small>khả dụng / {item.available_kg} kg</small>
                </div>
                <footer>
                  <Link
                    href={`/batches/${encodeURIComponent(item.code)}`}
                    target="_blank"
                  >
                    Xem passport
                  </Link>
                  <button onClick={() => editBatch(item)}>Sửa</button>
                </footer>
              </article>
            ))}
          </div>
        </section>
      )}
      {tab === "planning" && (
        <section className={styles.planning}>
          <section className={styles.panel}>
            <header>
              <div>
                <p>Demand & stock</p>
                <h2>Kế hoạch 30 ngày</h2>
              </div>
            </header>
            <div className={styles.planRows}>
              {stock.map((item) => {
                const monthly = Number(item.demand_90d || 0) / 3,
                  available = Number(item.available || 0),
                  gap = Math.max(0, monthly - available),
                  coverage = monthly > 0 ? available / monthly : null;
                return (
                    <article
                      key={item.row_key || `${item.product_id}|${item.variant_weight || ""}`}
                    data-risk={gap > 0 || (coverage !== null && coverage < 1)}
                  >
                    <span>
                          <b>
                            {item.name?.vi || item.name?.en}
                            {item.variant_weight ? ` · ${item.variant_weight}` : ""}
                          </b>
                      <small>
                        Nhu cầu ước tính {monthly.toFixed(1)} / tháng
                      </small>
                    </span>
                    <div>
                      <small>Tồn thực dụng</small>
                      <b>{available.toFixed(1)}</b>
                    </div>
                    <div>
                      <small>Đang giữ</small>
                      <b>{Number(item.reserved || 0).toFixed(1)}</b>
                    </div>
                    <div>
                      <small>Cần chuẩn bị</small>
                      <b>{gap.toFixed(1)}</b>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
          <section className={styles.panel}>
            <header>
              <div>
                <p>Reservations</p>
                <h2>Hàng đang giữ cho đơn</h2>
              </div>
            </header>
            <div className={styles.rows}>
              {reservations
                .filter((item) => item.status === "active")
                .map((item) => (
                  <article key={item.id}>
                    <span>
                      <b>
                        {productMap[item.product_id]?.name?.vi ||
                          item.product_id}
                      </b>
                      <small>
                        {item.order_id} ·{" "}
                        {item.variant_weight || "Quy cách chính"}
                      </small>
                    </span>
                    <strong>{item.quantity}</strong>
                    <button
                      onClick={() => reservationStatus(item, "fulfilled")}
                    >
                      Đã xuất
                    </button>
                    <button onClick={() => reservationStatus(item, "released")}>
                      Trả tồn
                    </button>
                  </article>
                ))}
            </div>
          </section>
        </section>
      )}
      {invoice && (
        <div className={styles.overlay}>
          <form className={styles.drawer} onSubmit={saveInvoice}>
            <header>
              <div>
                <p>Receivable record</p>
                <h2>Phát hành công nợ</h2>
              </div>
              <button type="button" onClick={() => setInvoice(null)}>
                <X />
              </button>
            </header>
            <label>
              Đơn hàng
              <select
                value={invoice.order_id}
                onChange={(event) =>
                  setInvoice({ ...invoice, order_id: event.target.value })
                }
              >
                {uninvoiced.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.customer_name} · {item.id} ·{" "}
                    {money(item.estimated_total)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Số hóa đơn / chứng từ
              <input
                value={invoice.invoice_number}
                onChange={(event) =>
                  setInvoice({ ...invoice, invoice_number: event.target.value })
                }
              />
            </label>
            <div className={styles.formGrid}>
              <label>
                Ngày phát hành
                <input
                  type="date"
                  value={invoice.issued_at}
                  onChange={(event) =>
                    setInvoice({ ...invoice, issued_at: event.target.value })
                  }
                />
              </label>
              <label>
                Hạn thanh toán
                <input
                  type="date"
                  value={invoice.due_at}
                  onChange={(event) =>
                    setInvoice({ ...invoice, due_at: event.target.value })
                  }
                />
              </label>
            </div>
            <label>
              Điều khoản
              <input
                value={invoice.payment_terms}
                onChange={(event) =>
                  setInvoice({ ...invoice, payment_terms: event.target.value })
                }
              />
            </label>
            <label>
              Ghi chú nội bộ
              <textarea
                rows="3"
                value={invoice.note}
                onChange={(event) =>
                  setInvoice({ ...invoice, note: event.target.value })
                }
              />
            </label>
            <button className={styles.primary} disabled={saving}>
              <Save />
              Phát hành
            </button>
          </form>
        </div>
      )}
      {payment && (
        <div className={styles.overlay}>
          <form className={styles.drawer} onSubmit={recordPayment}>
            <header>
              <div>
                <p>Cash receipt</p>
                <h2>Ghi nhận thanh toán</h2>
              </div>
              <button type="button" onClick={() => setPayment(null)}>
                <X />
              </button>
            </header>
            <label>
              Số tiền
              <input
                required
                type="number"
                min="1"
                value={payment.amount}
                onChange={(event) =>
                  setPayment({ ...payment, amount: event.target.value })
                }
              />
            </label>
            <label>
              Phương thức
              <select
                value={payment.method}
                onChange={(event) =>
                  setPayment({ ...payment, method: event.target.value })
                }
              >
                <option value="bank_transfer">Chuyển khoản</option>
                <option value="cash">Tiền mặt</option>
                <option value="card">Thẻ</option>
                <option value="other">Khác</option>
              </select>
            </label>
            <label>
              Mã tham chiếu
              <input
                value={payment.reference}
                onChange={(event) =>
                  setPayment({ ...payment, reference: event.target.value })
                }
              />
            </label>
            <label>
              Ghi chú
              <textarea
                rows="3"
                value={payment.note}
                onChange={(event) =>
                  setPayment({ ...payment, note: event.target.value })
                }
              />
            </label>
            <button className={styles.primary} disabled={saving}>
              <Save />
              Ghi nhận
            </button>
          </form>
        </div>
      )}
      {batch && (
        <div className={styles.overlay}>
          <form
            className={`${styles.drawer} ${styles.wide}`}
            onSubmit={saveBatch}
          >
            <header>
              <div>
                <p>Tea batch passport</p>
                <h2>{batch.id ? "Sửa hồ sơ lô" : "Lô trà mới"}</h2>
              </div>
              <button type="button" onClick={() => setBatch(null)}>
                <X />
              </button>
            </header>
            <div className={styles.formGrid}>
              <label>
                Mã lô
                <input
                  required
                  value={batch.code}
                  onChange={(event) =>
                    setBatch({ ...batch, code: event.target.value })
                  }
                />
              </label>
              <label>
                Tên lô
                <input
                  required
                  value={batch.name}
                  onChange={(event) =>
                    setBatch({ ...batch, name: event.target.value })
                  }
                />
              </label>
              <label>
                Sản phẩm
                <select
                  value={batch.product_id || ""}
                  onChange={(event) =>
                    setBatch({ ...batch, product_id: event.target.value })
                  }
                >
                  <option value="">Chưa liên kết</option>
                  {products
                    .filter((item) => item.kind === "tea")
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name?.vi || item.name?.en}
                      </option>
                    ))}
                </select>
              </label>
              <label>
                Trạng thái
                <select
                  value={batch.status}
                  onChange={(event) =>
                    setBatch({ ...batch, status: event.target.value })
                  }
                >
                  <option value="draft">Bản nháp</option>
                  <option value="released">Được xuất</option>
                  <option value="held">Tạm giữ</option>
                  <option value="exhausted">Đã hết</option>
                </select>
              </label>
              <label>
                Vùng nguyên liệu
                <input
                  value={batch.origin}
                  onChange={(event) =>
                    setBatch({ ...batch, origin: event.target.value })
                  }
                />
              </label>
              <label>
                Người / nhà chế biến
                <input
                  value={batch.producer}
                  onChange={(event) =>
                    setBatch({ ...batch, producer: event.target.value })
                  }
                />
              </label>
              <label>
                Ngày hái
                <input
                  type="date"
                  value={batch.harvest_date || ""}
                  onChange={(event) =>
                    setBatch({ ...batch, harvest_date: event.target.value })
                  }
                />
              </label>
              <label>
                Mùa vụ
                <input
                  value={batch.season}
                  onChange={(event) =>
                    setBatch({ ...batch, season: event.target.value })
                  }
                />
              </label>
              <label>
                Quy trình
                <input
                  value={batch.process}
                  onChange={(event) =>
                    setBatch({ ...batch, process: event.target.value })
                  }
                />
              </label>
              <label>
                Giống trà
                <input
                  value={batch.cultivar}
                  onChange={(event) =>
                    setBatch({ ...batch, cultivar: event.target.value })
                  }
                />
              </label>
              <label>
                Độ ẩm %
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={batch.moisture_percent ?? ""}
                  onChange={(event) =>
                    setBatch({ ...batch, moisture_percent: event.target.value })
                  }
                />
              </label>
              <label>
                Phân hạng
                <input
                  value={batch.grade}
                  onChange={(event) =>
                    setBatch({ ...batch, grade: event.target.value })
                  }
                />
              </label>
              <label>
                Khối lượng lô (kg)
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={batch.available_kg}
                  onChange={(event) =>
                    setBatch({ ...batch, available_kg: event.target.value })
                  }
                />
              </label>
              <label>
                Giá vốn / kg
                <input
                  type="number"
                  min="0"
                  value={batch.cost_per_kg ?? ""}
                  onChange={(event) =>
                    setBatch({ ...batch, cost_per_kg: event.target.value })
                  }
                />
              </label>
              <label>
                Hương
                <input
                  value={batch.aroma}
                  onChange={(event) =>
                    setBatch({ ...batch, aroma: event.target.value })
                  }
                />
              </label>
              <label>
                Nước trà
                <input
                  value={batch.liquor}
                  onChange={(event) =>
                    setBatch({ ...batch, liquor: event.target.value })
                  }
                />
              </label>
              <label>
                Bã lá
                <input
                  value={batch.leaf}
                  onChange={(event) =>
                    setBatch({ ...batch, leaf: event.target.value })
                  }
                />
              </label>
              <label>
                Ảnh URL
                <input
                  value={batch.photo_url}
                  onChange={(event) =>
                    setBatch({ ...batch, photo_url: event.target.value })
                  }
                />
              </label>
            </div>
            <label>
              Ghi chú nếm · VI
              <textarea
                rows="3"
                value={batch.tasting_vi}
                onChange={(event) =>
                  setBatch({ ...batch, tasting_vi: event.target.value })
                }
              />
            </label>
            <label>
              Tasting notes · EN
              <textarea
                rows="3"
                value={batch.tasting_en}
                onChange={(event) =>
                  setBatch({ ...batch, tasting_en: event.target.value })
                }
              />
            </label>
            <label>
              Ghi chú nội bộ
              <textarea
                rows="3"
                value={batch.notes}
                onChange={(event) =>
                  setBatch({ ...batch, notes: event.target.value })
                }
              />
            </label>
            <button className={styles.primary} disabled={saving}>
              <Save />
              Lưu hồ sơ lô
            </button>
          </form>
        </div>
      )}
      {allocation && (
        <div className={styles.overlay}>
          <form className={styles.drawer} onSubmit={allocate}>
            <header>
              <div>
                <p>Traceability</p>
                <h2>Gắn lô vào đơn</h2>
              </div>
              <button type="button" onClick={() => setAllocation(null)}>
                <X />
              </button>
            </header>
            <label>
              Đơn hàng
              <select
                value={allocation.order_id}
                onChange={(event) =>
                  setAllocation({ ...allocation, order_id: event.target.value })
                }
              >
                {orders
                  .filter((item) => item.type === "wholesale")
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.customer_name} · {item.id}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              Lô trà
              <select
                value={allocation.batch_id}
                onChange={(event) =>
                  setAllocation({ ...allocation, batch_id: event.target.value })
                }
              >
                {batches
                  .filter((item) => ["released", "held"].includes(item.status))
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.code} ·{" "}
                      {Number(item.available_kg) - Number(item.reserved_kg)} kg
                      còn lại
                    </option>
                  ))}
              </select>
            </label>
            <label>
              Sản phẩm
              <select
                value={allocation.product_id}
                onChange={(event) =>
                  setAllocation({
                    ...allocation,
                    product_id: event.target.value,
                  })
                }
              >
                <option value="">Không chỉ định</option>
                {products
                  .filter((item) => item.kind === "tea")
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name?.vi || item.name?.en}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              Số kg
              <input
                required
                type="number"
                min="0.01"
                step="0.01"
                value={allocation.quantity_kg}
                onChange={(event) =>
                  setAllocation({
                    ...allocation,
                    quantity_kg: event.target.value,
                  })
                }
              />
            </label>
            <button className={styles.primary} disabled={saving}>
              <Save />
              Gắn lô
            </button>
          </form>
        </div>
      )}
    </main>
  );
}

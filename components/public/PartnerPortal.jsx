"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  Clock3,
  CreditCard,
  FileCheck2,
  Leaf,
  Loader2,
  LogOut,
  PackageCheck,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import styles from "./PartnerPortal.module.css";
import FormattedNumberInput from "@/components/FormattedNumberInput";

const money = (value) => `${Number(value || 0).toLocaleString("vi-VN")}đ`;
const date = (value) =>
  value
    ? new Intl.DateTimeFormat("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(new Date(value))
    : "—";
const STATUS = {
  pending: "Đã nhận",
  confirmed: "Đang chuẩn bị",
  shipped: "Đang giao",
  completed: "Hoàn tất",
  sent: "Chờ duyệt",
  converted: "Đã tạo đơn",
  expired: "Hết hạn",
  declined: "Từ chối",
  open: "Chưa thanh toán",
  partial: "Thanh toán một phần",
  paid: "Đã thanh toán",
  overdue: "Quá hạn",
  draft: "Bản nháp",
  void: "Đã hủy",
};

export default function PartnerPortal() {
  const supabase = useMemo(() => createClient(), []),
    [session, setSession] = useState(null),
    [loading, setLoading] = useState(true),
    [snapshot, setSnapshot] = useState(null),
    [error, setError] = useState(""),
    [tab, setTab] = useState("overview"),
    [auth, setAuth] = useState({ email: "" }),
    [application, setApplication] = useState({
      business: "",
      contact: "",
      address: "",
      tax: "",
    }),
    [profile, setProfile] = useState({
      business: "",
      contact: "",
      address: "",
      tax: "",
    }),
    [checkEmail, setCheckEmail] = useState(false),
    [quantities, setQuantities] = useState({}),
    [orderNote, setOrderNote] = useState(""),
    [submitting, setSubmitting] = useState(false),
    [success, setSuccess] = useState("");
  const load = useCallback(async () => {
    if (!session?.user) {
      setSnapshot(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    const { data, error: loadError } = await supabase.rpc(
      "partner_portal_snapshot",
    );
    if (loadError) setError("Chưa tải được bàn đối tác. Vui lòng thử lại.");
    else setSnapshot(data);
    setLoading(false);
  }, [session, supabase]);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, next) =>
      setSession(next),
    );
    return () => data.subscription.unsubscribe();
  }, [supabase]);
  useEffect(() => {
    load();
  }, [load]);
  const agreement = snapshot?.price_agreement,
    rules = agreement?.rules || [],
    orders = snapshot?.orders || [],
    quotes = snapshot?.quotes || [],
    receivables = snapshot?.receivables || [],
    batches = snapshot?.batch_passports || [],
    account = snapshot?.account;
  useEffect(() => {
    if (!rules.length) return;
    setQuantities((current) =>
      Object.keys(current).length
        ? current
        : Object.fromEntries(rules.map((rule) => [rule.id, ""])),
    );
  }, [rules]);
  useEffect(() => {
    if (!account) return;
    setProfile({
      business: account.business_name || "",
      contact: account.contact || "",
      address: account.delivery_address || "",
      tax: account.tax_number || "",
    });
  }, [account]);
  const authenticate = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    const { error: authError } = await supabase.auth.signInWithOtp({
      email: auth.email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/partners`,
        shouldCreateUser: true,
      },
    });
    setSubmitting(false);
    if (authError) {
      setError("Chưa gửi được liên kết đăng nhập.");
      return;
    }
    setCheckEmail(true);
  };
  const apply = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    const { error: applyError } = await supabase.rpc(
      "submit_partner_application",
      {
        p_business_name: application.business,
        p_contact: application.contact,
        p_address: application.address,
        p_tax_number: application.tax,
      },
    );
    setSubmitting(false);
    if (applyError) {
      setError("Chưa gửi được hồ sơ. Vui lòng kiểm tra thông tin.");
      return;
    }
    await load();
  };
  const logout = async () => {
    await supabase.auth.signOut();
    setSnapshot(null);
    setTab("overview");
  };
  const saveProfile = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    const { error: profileError } = await supabase.rpc(
      "partner_update_profile",
      {
        p_business_name: profile.business,
        p_contact: profile.contact,
        p_address: profile.address,
        p_tax_number: profile.tax,
      },
    );
    setSubmitting(false);
    if (profileError) {
      setError("Chưa cập nhật được hồ sơ.");
      return;
    }
    setSuccess("Đã cập nhật thông tin doanh nghiệp.");
    await load();
  };
  const submitOrder = async () => {
    const lines = rules
      .map((rule) => ({
        product_id: rule.product_id,
        variant_weight: rule.variant_weight || "",
        quantity: Number(quantities[rule.id] || 0),
      }))
      .filter((line) => line.quantity > 0);
    if (!lines.length) {
      setError("Hãy chọn ít nhất một sản phẩm.");
      return;
    }
    const invalid = lines.find((line) => {
      const rule = rules.find(
        (item) =>
          item.product_id === line.product_id &&
          (item.variant_weight || "") === line.variant_weight,
      );
      return line.quantity < Number(rule?.minimum_quantity || 0);
    });
    if (invalid) {
      setError("Một số lượng đặt chưa đạt mức tối thiểu trong bảng giá.");
      return;
    }
    setSubmitting(true);
    setError("");
    const { data, error: orderError } = await supabase.rpc(
      "partner_submit_order",
      {
        p_lines: lines,
        p_address: account.delivery_address || "",
        p_note: orderNote,
      },
    );
    setSubmitting(false);
    if (orderError) {
      setError(
        "Chưa tạo được đơn. Bảng giá có thể đã hết hiệu lực; hãy tải lại trang.",
      );
      return;
    }
    setSuccess(`Đã tạo đơn ${data}`);
    setQuantities(Object.fromEntries(rules.map((rule) => [rule.id, ""])));
    setOrderNote("");
    await load();
    setTab("orders");
  };
  const reorder = (order) => {
    const next = {};
    for (const rule of rules) {
      const line = (order.lines || []).find(
        (item) =>
          (item.productId || item.product_id) === rule.product_id &&
          (item.weight || item.variant_weight || "") === rule.variant_weight,
      );
      next[rule.id] = line
        ? String(line.qty || line.quantity || rule.minimum_quantity)
        : "";
    }
    setQuantities(next);
    setTab("new-order");
    setSuccess("Đã đưa đơn cũ vào biểu mẫu với bảng giá hiện tại.");
  };
  const acceptQuote = async (quote) => {
    setSubmitting(true);
    setError("");
    const { data, error: quoteError } = await supabase.rpc(
      "partner_accept_quote",
      { p_quote_id: quote.id },
    );
    setSubmitting(false);
    if (quoteError) {
      setError("Báo giá không còn khả dụng hoặc đã được xử lý.");
      return;
    }
    setSuccess(`Đã chấp nhận báo giá và tạo đơn ${data}`);
    await load();
    setTab("orders");
  };
  if (loading)
    return (
      <main className={styles.state}>
        <Loader2 />
        <p>Đang mở bàn đối tác…</p>
      </main>
    );
  if (!session)
    return (
      <main className={styles.authPage}>
        <section className={styles.authStory}>
          <Link href="/">
            <ArrowLeft />
            Nhà Hoàng Long
          </Link>
          <div>
            <p>Bàn trà dành cho đối tác</p>
            <h1>Một nơi để đặt lại, theo dõi và làm việc lâu dài.</h1>
            <span>
              Giá riêng, báo giá, đơn hàng, công nợ và hồ sơ lô trà — cùng một
              tài khoản.
            </span>
          </div>
          <footer>House of Hoàng Long · Since 1995</footer>
        </section>
        <section className={styles.authPanel}>
          {checkEmail ? (
            <div className={styles.emailState}>
              <FileCheck2 />
              <h2>Kiểm tra email của bạn</h2>
              <p>
                Mở liên kết bảo mật để vào bàn đối tác. Không cần ghi nhớ mật
                khẩu.
              </p>
            </div>
          ) : (
            <form onSubmit={authenticate}>
              <p>Secure partner access</p>
              <h2>Nhận liên kết đăng nhập</h2>
              <label>
                Email
                <input
                  type="email"
                  autoComplete="email"
                  required
                  value={auth.email}
                  onChange={(event) => setAuth({ email: event.target.value })}
                />
              </label>
              <span className={styles.authHint}>
                Liên kết dùng một lần sẽ được gửi tới email này. Tài khoản mới
                sẽ tiếp tục sang bước đăng ký doanh nghiệp.
              </span>
              {error && <p className={styles.error}>{error}</p>}
              <button disabled={submitting}>
                {submitting ? <Loader2 /> : <ArrowRight />}Gửi liên kết bảo mật
              </button>
            </form>
          )}
        </section>
      </main>
    );
  if (!snapshot)
    return (
      <main className={styles.state}>
        {error ? <Clock3 /> : <Loader2 />}
        <p>{error || "Đang đồng bộ bàn đối tác…"}</p>
        {error && <button onClick={load}>Thử lại</button>}
      </main>
    );
  if (snapshot?.state === "application_required")
    return (
      <main className={styles.application}>
        <header>
          <Link href="/">
            <ArrowLeft />
            Nhà Hoàng Long
          </Link>
          <button onClick={logout}>
            <LogOut />
            Đăng xuất
          </button>
        </header>
        <form onSubmit={apply}>
          <p>Hồ sơ đối tác</p>
          <h1>Cho Nhà biết bạn đang vận hành điều gì.</h1>
          <span>
            Nhà sẽ xác nhận nhu cầu và mở bảng giá phù hợp trước khi tài khoản
            đặt hàng được kích hoạt.
          </span>
          <div>
            <label>
              Tên quán / doanh nghiệp
              <input
                required
                value={application.business}
                onChange={(event) =>
                  setApplication({
                    ...application,
                    business: event.target.value,
                  })
                }
              />
            </label>
            <label>
              Điện thoại / Zalo
              <input
                required
                value={application.contact}
                onChange={(event) =>
                  setApplication({
                    ...application,
                    contact: event.target.value,
                  })
                }
              />
            </label>
            <label>
              Địa chỉ giao thường dùng
              <input
                value={application.address}
                onChange={(event) =>
                  setApplication({
                    ...application,
                    address: event.target.value,
                  })
                }
              />
            </label>
            <label>
              Mã số thuế
              <input
                value={application.tax}
                onChange={(event) =>
                  setApplication({ ...application, tax: event.target.value })
                }
              />
            </label>
          </div>
          {error && <p className={styles.error}>{error}</p>}
          <button disabled={submitting}>
            {submitting ? <Loader2 /> : <ArrowRight />}Gửi hồ sơ
          </button>
        </form>
      </main>
    );
  if (snapshot?.state === "pending")
    return (
      <main className={styles.state}>
        <Clock3 />
        <h1>Hồ sơ đang được xác nhận.</h1>
        <p>
          Nhà sẽ liên hệ với {snapshot.account?.business_name} qua{" "}
          {snapshot.account?.contact}.
        </p>
        <button onClick={logout}>Đăng xuất</button>
      </main>
    );
  return (
    <main className={styles.portal}>
      <aside>
        <Link href="/" className={styles.brand}>
          <span>皇龍</span>
          <b>Hoàng Long</b>
        </Link>
        <div className={styles.account}>
          <Building2 />
          <span>
            <b>{account?.business_name}</b>
            <small>{account?.contact}</small>
          </span>
        </div>
        <nav>
          {[
            ["overview", "Tổng quan", Leaf],
            ["new-order", "Đặt hàng", RefreshCw],
            ["orders", "Đơn hàng", PackageCheck],
            ["quotes", "Báo giá", FileCheck2],
            ["finance", "Công nợ", CreditCard],
            ["batches", "Lô trà", ShieldCheck],
            ["profile", "Hồ sơ", Building2],
          ].map(([id, label, Icon]) => (
            <button
              key={id}
              data-active={tab === id}
              onClick={() => setTab(id)}
            >
              <Icon />
              {label}
            </button>
          ))}
        </nav>
        <button className={styles.logout} onClick={logout}>
          <LogOut />
          Đăng xuất
        </button>
      </aside>
      <section className={styles.workspace}>
        <header>
          <div>
            <p>Partner desk</p>
            <h1>{account?.business_name}</h1>
          </div>
          <span>
            {agreement
              ? `Bảng giá v${agreement.version} · ${agreement.valid_until ? `đến ${date(agreement.valid_until)}` : "vô thời hạn"}`
              : "Chưa có bảng giá đang hiệu lực"}
          </span>
        </header>
        {error && (
          <p className={styles.alert} data-error>
            {error}
            <button onClick={() => setError("")}>×</button>
          </p>
        )}
        {success && (
          <p className={styles.alert}>
            {success}
            <button onClick={() => setSuccess("")}>×</button>
          </p>
        )}
        {tab === "overview" && (
          <div className={styles.overview}>
            <section className={styles.hero}>
              <p>Nhịp tái đặt dự kiến</p>
              <h2>
                {snapshot.reorder?.expected_at
                  ? date(snapshot.reorder.expected_at)
                  : "Chưa đủ dữ liệu"}
              </h2>
              <span>
                {snapshot.reorder?.order_count || 0} đơn đã ghi nhận · chu kỳ{" "}
                {snapshot.reorder?.avg_days ||
                  account?.reorder_cadence_days ||
                  30}{" "}
                ngày
              </span>
              <button
                onClick={() =>
                  orders[0] ? reorder(orders[0]) : setTab("new-order")
                }
              >
                <RotateCcw />
                Đặt lại đơn gần nhất
              </button>
            </section>
            <div className={styles.summary}>
              {[
                [
                  "Đơn đang chạy",
                  orders.filter((order) => order.status !== "completed").length,
                  PackageCheck,
                ],
                [
                  "Báo giá chờ duyệt",
                  quotes.filter((quote) => quote.status === "sent").length,
                  FileCheck2,
                ],
                [
                  "Còn phải trả",
                  money(
                    receivables.reduce(
                      (sum, item) => sum + Number(item.total - item.paid),
                      0,
                    ),
                  ),
                  CreditCard,
                ],
              ].map(([label, value, Icon]) => (
                <article key={label}>
                  <Icon />
                  <span>{label}</span>
                  <b>{value}</b>
                </article>
              ))}
            </div>
            <section className={styles.recent}>
              <header>
                <h2>Hoạt động gần đây</h2>
                <button onClick={load}>
                  <RefreshCw />
                  Làm mới
                </button>
              </header>
              {orders.slice(0, 4).map((order) => (
                <article key={order.id}>
                  <span>
                    <b>{order.id}</b>
                    <small>{date(order.ts)}</small>
                  </span>
                  <strong>{money(order.estimated_total)}</strong>
                  <i>{STATUS[order.status] || order.status}</i>
                </article>
              ))}
              {!orders.length && <p>Chưa có đơn hàng.</p>}
            </section>
          </div>
        )}
        {tab === "new-order" && (
          <section className={styles.orderForm}>
            <header>
              <p>Current agreement</p>
              <h2>Đặt hàng theo giá đã chốt</h2>
              <span>
                Giá lấy trực tiếp từ phiên bản đang hiệu lực · thời gian chuẩn
                bị dự kiến {account?.lead_time_days || 7} ngày ·{" "}
                {agreement?.payment_terms || "thanh toán khi xác nhận đơn"}.
              </span>
            </header>
            {rules.length ? (
              <>
                <div className={styles.ruleList}>
                  {rules.map((rule) => (
                    <article key={rule.id}>
                      <span>
                        <b>{rule.product_name?.vi || rule.product_name?.en}</b>
                        <small>
                          Tối thiểu {Number(rule.minimum_quantity)} {rule.unit}{" "}
                          · khả dụng {Number(rule.stock || 0)}
                        </small>
                      </span>
                      <strong>
                        {money(rule.price)}
                        <small>/{rule.unit}</small>
                      </strong>
                      <label>
                        Số lượng
                        <FormattedNumberInput
                          min={rule.minimum_quantity}
                          max={Math.max(
                            Number(rule.minimum_quantity),
                            Number(rule.stock || 0),
                          )}
                          step="0.1"
                          value={quantities[rule.id] || ""}
                          onChange={(event) =>
                            setQuantities({
                              ...quantities,
                              [rule.id]: event.target.value,
                            })
                          }
                        />
                      </label>
                    </article>
                  ))}
                </div>
                <label className={styles.note}>
                  Ghi chú cho đơn
                  <textarea
                    rows="3"
                    value={orderNote}
                    onChange={(event) => setOrderNote(event.target.value)}
                    placeholder="Ngày cần hàng, yêu cầu đóng gói, lưu ý công thức…"
                  />
                </label>
                <div className={styles.orderTotal}>
                  <span>Tổng dự kiến</span>
                  <b>
                    {money(
                      rules.reduce(
                        (sum, rule) =>
                          sum +
                          Number(quantities[rule.id] || 0) *
                            Number(rule.price || 0),
                        0,
                      ),
                    )}
                  </b>
                  <button onClick={submitOrder} disabled={submitting}>
                    {submitting ? <Loader2 /> : <ArrowRight />}Gửi đơn
                  </button>
                </div>
              </>
            ) : (
              <div className={styles.empty}>
                <Clock3 />
                <h3>Chưa có bảng giá đang hiệu lực.</h3>
                <p>Liên hệ Nhà để thiết lập hoặc gia hạn bảng giá riêng.</p>
              </div>
            )}
          </section>
        )}
        {tab === "orders" && (
          <section className={styles.listPage}>
            <header>
              <p>Order history</p>
              <h2>Đơn hàng</h2>
            </header>
            {orders.map((order) => (
              <article key={order.id}>
                <div>
                  <b>{order.id}</b>
                  <small>
                    {date(order.ts)} ·{" "}
                    {order.total_kg ? `${order.total_kg} kg` : "Đơn hàng"}
                  </small>
                </div>
                <div className={styles.lineSummary}>
                  {(order.lines || []).map((line, index) => (
                    <span key={index}>
                      {line.name?.vi || line.name?.en || line.name} · {line.qty}{" "}
                      {line.unit || ""}
                    </span>
                  ))}
                </div>
                <strong>{money(order.estimated_total)}</strong>
                <i>{STATUS[order.status] || order.status}</i>
                {order.tracking_code && (
                  <a
                    href={
                      order.tracking_code.startsWith("http")
                        ? order.tracking_code
                        : undefined
                    }
                  >
                    <Truck />
                    Theo dõi giao hàng
                  </a>
                )}
                <button onClick={() => reorder(order)}>
                  <RotateCcw />
                  Đặt lại
                </button>
              </article>
            ))}
            {!orders.length && (
              <div className={styles.empty}>
                <PackageCheck />
                <h3>Chưa có đơn hàng.</h3>
              </div>
            )}
          </section>
        )}
        {tab === "quotes" && (
          <section className={styles.listPage}>
            <header>
              <p>Quote book</p>
              <h2>Báo giá</h2>
            </header>
            {quotes.map((quote) => (
              <article key={quote.id}>
                <div>
                  <b>{quote.id}</b>
                  <small>
                    {date(quote.created_at)} ·{" "}
                    {quote.valid_until
                      ? `hiệu lực đến ${date(quote.valid_until)}`
                      : "vô thời hạn"}
                  </small>
                </div>
                <div className={styles.lineSummary}>
                  {(quote.lines || []).map((line, index) => (
                    <span key={index}>
                      {line.name?.vi || line.name?.en || line.name} · {line.qty}{" "}
                      {line.unit || ""}
                    </span>
                  ))}
                </div>
                <strong>{money(quote.total)}</strong>
                <i>{STATUS[quote.status] || quote.status}</i>
                {quote.status === "sent" &&
                  (!quote.valid_until ||
                    new Date(quote.valid_until) >=
                      new Date(new Date().toDateString())) && (
                    <button
                      className={styles.accept}
                      disabled={submitting}
                      onClick={() => acceptQuote(quote)}
                    >
                      <Check />
                      Chấp nhận & tạo đơn
                    </button>
                  )}
              </article>
            ))}
            {!quotes.length && (
              <div className={styles.empty}>
                <FileCheck2 />
                <h3>Chưa có báo giá.</h3>
              </div>
            )}
          </section>
        )}
        {tab === "finance" && (
          <section className={styles.listPage}>
            <header>
              <p>Accounts receivable</p>
              <h2>Công nợ & thanh toán</h2>
            </header>
            {receivables.map((item) => (
              <article
                key={item.id}
                data-overdue={item.display_status === "overdue"}
              >
                <div>
                  <b>{item.invoice_number || item.id}</b>
                  <small>
                    Phát hành {date(item.issued_at)} · hạn {date(item.due_at)}
                  </small>
                </div>
                <div className={styles.paymentBar}>
                  <span
                    style={{
                      width: `${Math.min(100, Number(item.total) ? (Number(item.paid) / Number(item.total)) * 100 : 0)}%`,
                    }}
                  />
                </div>
                <strong>
                  {money(Number(item.total) - Number(item.paid))}
                  <small> còn lại / {money(item.total)}</small>
                </strong>
                <i>{STATUS[item.display_status] || item.display_status}</i>
              </article>
            ))}
            {!receivables.length && (
              <div className={styles.empty}>
                <CreditCard />
                <h3>Chưa có công nợ được phát hành.</h3>
              </div>
            )}
          </section>
        )}
        {tab === "batches" && (
          <section className={styles.batchPage}>
            <header>
              <p>Batch passports</p>
              <h2>Hồ sơ lô trà đã nhận</h2>
            </header>
            <div>
              {batches.map((batch, index) => (
                <article key={`${batch.order_id}-${batch.code}-${index}`}>
                  {batch.photo_url ? (
                    <img src={batch.photo_url} alt="" />
                  ) : (
                    <Leaf />
                  )}
                  <span>{batch.code}</span>
                  <h3>{batch.name?.vi || batch.name?.en || "Lô trà"}</h3>
                  <p>
                    {batch.origin} · {batch.season || date(batch.harvest_date)}
                  </p>
                  <dl>
                    <div>
                      <dt>Chế biến</dt>
                      <dd>{batch.process || "—"}</dd>
                    </div>
                    <div>
                      <dt>Giống</dt>
                      <dd>{batch.cultivar}</dd>
                    </div>
                    <div>
                      <dt>Độ ẩm</dt>
                      <dd>
                        {batch.moisture_percent
                          ? `${batch.moisture_percent}%`
                          : "—"}
                      </dd>
                    </div>
                    <div>
                      <dt>Phân hạng</dt>
                      <dd>{batch.grade || "—"}</dd>
                    </div>
                  </dl>
                  <footer>
                    <span>
                      {batch.quantity_kg} kg · đơn {batch.order_id}
                    </span>
                    {batch.document_url && (
                      <a
                        href={batch.document_url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Chứng từ
                        <ArrowRight />
                      </a>
                    )}
                  </footer>
                </article>
              ))}
            </div>
            {!batches.length && (
              <div className={styles.empty}>
                <ShieldCheck />
                <h3>Chưa có lô trà được gắn với đơn của bạn.</h3>
              </div>
            )}
          </section>
        )}
        {tab === "profile" && (
          <section className={styles.profileForm}>
            <header>
              <p>Business profile</p>
              <h2>Thông tin dùng cho đơn hàng</h2>
              <span>
                Cập nhật tại đây để đơn sau tự điền đúng địa chỉ và mã số thuế.
              </span>
            </header>
            <form onSubmit={saveProfile}>
              <label>
                Tên quán / doanh nghiệp
                <input
                  required
                  value={profile.business}
                  onChange={(event) =>
                    setProfile({ ...profile, business: event.target.value })
                  }
                />
              </label>
              <label>
                Điện thoại / Zalo
                <input
                  required
                  value={profile.contact}
                  onChange={(event) =>
                    setProfile({ ...profile, contact: event.target.value })
                  }
                />
              </label>
              <label>
                Địa chỉ giao thường dùng
                <input
                  value={profile.address}
                  onChange={(event) =>
                    setProfile({ ...profile, address: event.target.value })
                  }
                />
              </label>
              <label>
                Mã số thuế
                <input
                  value={profile.tax}
                  onChange={(event) =>
                    setProfile({ ...profile, tax: event.target.value })
                  }
                />
              </label>
              <button disabled={submitting}>
                <Check />
                Lưu hồ sơ
              </button>
            </form>
          </section>
        )}
      </section>
    </main>
  );
}

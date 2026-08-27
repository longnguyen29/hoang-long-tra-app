"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  Brain,
  Check,
  CheckCircle2,
  ChevronRight,
  Circle,
  ClipboardList,
  Handshake,
  Leaf,
  LogOut,
  Menu,
  PencilLine,
  Plus,
  RefreshCw,
  RotateCcw,
  Scale,
  Settings2,
  Sprout,
} from "lucide-react";
import { useLocale } from "@/components/i18n/LocaleProvider";
import styles from "./MorningDesk.module.css";

const MODES = [
  ["owner", "Chủ doanh nghiệp"],
  ["sales", "Phát triển đối tác"],
  ["operations", "Vận hành"],
];

const APPS = {
  orders: {
    key: "orders",
    label: "Điều phối đơn",
    short: "Đơn",
    href: "/admin/orders",
    description: "Đơn hàng, tin nhắn, lead, mẫu thử và lịch trà.",
    icon: ClipboardList,
  },
  pipeline: {
    key: "pipeline",
    label: "Phát triển đối tác",
    short: "Đối tác",
    href: "/admin/pipeline",
    description: "Cơ hội, báo giá và nhịp theo đuổi khách B2B.",
    icon: Handshake,
  },
  operations: {
    key: "operations",
    label: "Vận hành & tài chính",
    short: "Vận hành",
    href: "/admin/operations",
    description: "Công nợ, ngân sách, lô trà, tồn khả dụng và kế hoạch chuẩn bị.",
    icon: BarChart3,
  },
  control: {
    key: "control",
    label: "Thương mại",
    short: "Thương mại",
    href: "/admin/control",
    description: "Giá, tồn kho, khuyến mãi và thiết lập bán hàng.",
    icon: Settings2,
  },
  house: {
    key: "house",
    label: "Nhà & danh mục",
    short: "Nhà",
    href: "/admin/house",
    description: "Nội dung, sản phẩm và câu chuyện đang hiển thị.",
    icon: Sprout,
  },
};

const APP_LIST = Object.values(APPS);
const KIND_LABEL = { decision: "Quyết định", policy: "Quy tắc", learning: "Bài học" };
const MODE_DEFAULT_APP = { owner: "operations", sales: "pipeline", operations: "orders" };

const money = (value) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const dayLabel = (locale) =>
  new Intl.DateTimeFormat(locale === "en" ? "en-US" : "vi-VN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

const relativeUpdate = (value, locale) => {
  if (!value) return locale === "en" ? "No previous session" : "Chưa có phiên trước";
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return locale === "en" ? "Latest session" : "Phiên gần nhất";
  const minutes = Math.max(1, Math.round((Date.now() - time) / 60000));
  if (minutes < 60) return locale === "en" ? `${minutes} minutes ago` : `${minutes} phút trước`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return locale === "en" ? `${hours} hours ago` : `${hours} giờ trước`;
  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "vi-VN").format(new Date(time));
};

function buildExceptions(snapshot, mode) {
  const queue = snapshot?.queue || {};
  const budget = snapshot?.budget || {};
  const actions = snapshot?.operations?.today_actions || {};
  const reorders = snapshot?.operations?.reorders || [];
  const stock = snapshot?.operations?.stock || [];
  const items = [];
  const add = (condition, item) => condition && items.push(item);

  add(budget.has_active_period === false, {
    id: "budget-period-missing",
    title: "Chưa có kỳ ngân sách đang hoạt động",
    detail: "Tạo một kỳ để phân bổ tiền trước khi ghi cam kết hoặc thanh toán.",
    appKey: "operations",
    href: "/admin/operations/budget",
    level: "attention",
    rank: mode === "owner" ? 1 : 5,
  });
  add(Number(budget.pending_count) > 0, {
    id: "budget-approvals",
    title: `${budget.pending_count} khoản ngân sách đang chờ duyệt`,
    detail: `${money(budget.pending)} chưa trở thành phần ngân sách được phép chi.`,
    appKey: "operations",
    href: "/admin/operations/budget",
    level: "attention",
    rank: mode === "owner" ? 1.5 : 5,
  });
  add(Number(budget.risk_count) > 0, {
    id: "budget-risk",
    title: `${budget.risk_count} khoản phân bổ đã dùng từ 80%`,
    detail: "Rà lại cam kết còn mở trước khi duyệt thêm hoặc tạo khoản chi mới.",
    appKey: "operations",
    href: "/admin/operations/budget",
    level: "critical",
    rank: mode === "owner" ? 2 : 4,
  });

  add(Number(actions.overdue_invoices) > 0, {
    id: "overdue-invoices",
    title: `${actions.overdue_invoices} công nợ đã quá hạn`,
    detail: "Ưu tiên xác nhận tình trạng thanh toán và ngày thu dự kiến.",
    appKey: "operations",
    href: "/admin/operations",
    level: "critical",
    rank: mode === "owner" ? 1 : 3,
  });
  add(Number(actions.orders_blocked) > 0, {
    id: "blocked-orders",
    title: `${actions.orders_blocked} đơn đang bị chặn`,
    detail: "Mở hồ sơ đơn để gỡ nguyên nhân trước khi hứa ngày giao.",
    appKey: "orders",
    href: "/admin/orders",
    level: "critical",
    rank: mode === "operations" ? 1 : 2,
  });
  add(Number(queue.pipeline_due) > 0, {
    id: "pipeline-due",
    title: `${queue.pipeline_due} cơ hội đã đến hạn theo đuổi`,
    detail: "Liên hệ hoặc đặt lại hành động tiếp theo để pipeline không đứng yên.",
    appKey: "pipeline",
    href: "/admin/pipeline",
    level: "attention",
    rank: mode === "sales" ? 1 : 4,
  });
  add(Number(actions.quotes_expiring) > 0, {
    id: "quotes-expiring",
    title: `${actions.quotes_expiring} báo giá sắp hết hạn`,
    detail: "Xác nhận phản hồi của khách trước khi báo giá mất hiệu lực.",
    appKey: "pipeline",
    href: "/admin/pipeline",
    level: "attention",
    rank: mode === "sales" ? 2 : 5,
  });
  add(Number(actions.price_reviews) > 0, {
    id: "price-reviews",
    title: `${actions.price_reviews} bảng giá cần rà soát`,
    detail: "Kiểm tra hiệu lực và điều kiện giá riêng của đối tác định kỳ.",
    appKey: "pipeline",
    href: "/admin/pipeline",
    level: "attention",
    rank: 5,
  });
  add(Number(queue.orders_unread) > 0, {
    id: "orders-unread",
    title: `${queue.orders_unread} đơn mới chưa đọc`,
    detail: "Xác nhận đơn và chuyển bước xử lý đầu tiên.",
    appKey: "orders",
    href: "/admin/orders",
    level: "normal",
    rank: mode === "operations" ? 2 : 6,
  });
  add(Number(queue.messages_unread) > 0, {
    id: "messages-unread",
    title: `${queue.messages_unread} cuộc trò chuyện chưa đọc`,
    detail: "Đọc phản hồi mới trước khi tiếp tục bán hàng hoặc giao nhận.",
    appKey: "orders",
    href: "/admin/orders#messages",
    level: "normal",
    rank: mode === "sales" ? 3 : 7,
  });
  add(Number(queue.samples_waiting) > 0, {
    id: "samples-waiting",
    title: `${queue.samples_waiting} yêu cầu mẫu đang chờ`,
    detail: "Xác nhận điều kiện và ngày gửi mẫu cho quán.",
    appKey: "orders",
    href: "/admin/orders#contacts",
    level: "normal",
    rank: mode === "sales" ? 4 : 8,
  });

  const dueReorders = reorders.filter((item) => Number(item.days_due) >= 0);
  add(dueReorders.length > 0, {
    id: "reorders-due",
    title: `${dueReorders.length} đối tác đã đến nhịp đặt lại`,
    detail: dueReorders
      .slice(0, 2)
      .map((item) => item.business_name)
      .filter(Boolean)
      .join(" · "),
    appKey: "operations",
    href: "/admin/operations",
    level: "normal",
    rank: mode === "sales" ? 2.5 : 7,
  });

  const stockRisks = stock.filter((item) => {
    const monthlyDemand = Number(item.demand_90d || 0) / 3;
    return monthlyDemand > 0 && Number(item.available || 0) < monthlyDemand;
  });
  add(stockRisks.length > 0, {
    id: "stock-risk",
    title: `${stockRisks.length} mặt hàng dưới nhu cầu một tháng`,
    detail: "Đối chiếu hàng thực dụng với đơn đang giữ trước khi nhận thêm cam kết.",
    appKey: "operations",
    href: "/admin/operations",
    level: "attention",
    rank: mode === "operations" ? 2 : 6,
  });

  return items.sort((a, b) => a.rank - b.rank).slice(0, 8);
}

function buildMetrics(snapshot, mode) {
  const queue = snapshot?.queue || {};
  const budget = snapshot?.budget || {};
  const kpis = snapshot?.operations?.kpis || {};
  const actions = snapshot?.operations?.today_actions || {};
  const reorders = snapshot?.operations?.reorders || [];
  const reorderDue = reorders.filter((item) => Number(item.days_due) >= 0).length;

  if (mode === "sales") {
    return [
      ["Đến hạn theo đuổi", queue.pipeline_due || 0, "cơ hội"],
      ["Báo giá đang chờ", kpis.quotes_waiting || 0, "báo giá"],
      ["Đến nhịp đặt lại", reorderDue, "đối tác"],
      ["Tin chưa đọc", queue.messages_unread || 0, "cuộc trò chuyện"],
    ];
  }
  if (mode === "operations") {
    return [
      ["Đơn đang mở", queue.orders_open || 0, "đơn"],
      ["Đơn bị chặn", actions.orders_blocked || 0, "đơn"],
      ["Công nợ quá hạn", actions.overdue_invoices || 0, "khoản"],
      ["Ngân sách khả dụng", money(Math.max(0, Number(budget.allocated || 0) - Number(budget.committed || 0))), "đã duyệt, chưa cam kết"],
    ];
  }
  return [
    ["Doanh thu 30 ngày", money(kpis.revenue_30d), `${kpis.orders_30d || 0} đơn`],
    ["Tiền phải thu", money(kpis.receivable_open), `${money(kpis.receivable_overdue)} quá hạn`],
    ["Ngân sách khả dụng", money(Math.max(0, Number(budget.allocated || 0) - Number(budget.committed || 0))), "đã duyệt, chưa cam kết"],
    ["Pipeline đến hạn", queue.pipeline_due || 0, "cơ hội"],
  ];
}

export default function MorningDesk({ supabase, email, role, onLogout }) {
  const router = useRouter();
  const { locale } = useLocale();
  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [moving, setMoving] = useState("");
  const [error, setError] = useState("");
  const [editingSlot, setEditingSlot] = useState(1);
  const [focusDraft, setFocusDraft] = useState({ title: "", appKey: "operations" });
  const [memoryDraft, setMemoryDraft] = useState({ kind: "decision", title: "", body: "" });

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const [deskResult, budgetResult] = await Promise.all([
      supabase.rpc("morning_desk_snapshot"),
      supabase.rpc("budget_morning_snapshot"),
    ]);
    if (deskResult.error) {
      setError("Bàn ngày chưa tải được dữ liệu. Kiểm tra migration 0036 rồi thử lại.");
    } else {
      setSnapshot({ ...deskResult.data, budget: budgetResult.data || {} });
      if (budgetResult.error)
        setError("Bàn ngày đã tải, nhưng chưa đọc được ngân sách từ migration 0037.");
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  const mode = snapshot?.preference?.mode || "owner";
  const focus = snapshot?.focus || [];
  const focusMap = useMemo(
    () => Object.fromEntries(focus.map((item) => [Number(item.position), item])),
    [focus],
  );
  const exceptions = useMemo(() => buildExceptions(snapshot, mode), [snapshot, mode]);
  const metrics = useMemo(() => buildMetrics(snapshot, mode), [snapshot, mode]);
  const memory = snapshot?.memory || { inbox: [], approved: [], inbox_count: 0 };
  const canReview = role === "admin" || role === "manager";

  const saveMode = async (nextMode) => {
    if (nextMode === mode) return;
    const previous = snapshot;
    setSnapshot((current) => ({
      ...current,
      preference: { ...(current?.preference || {}), mode: nextMode },
    }));
    const { error: saveError } = await supabase.rpc("save_morning_preference", {
      p_mode: nextMode,
      p_last_app_key: "",
      p_last_href: "",
      p_last_label: "",
      p_last_context: {},
    });
    if (saveError) {
      setSnapshot(previous);
      setError("Chưa lưu được góc nhìn. Thử lại sau khi làm mới.");
    }
  };

  const openApp = async (event, app, context = {}) => {
    event.preventDefault();
    setMoving(app.key);
    const { error: saveError } = await supabase.rpc("save_morning_preference", {
      p_mode: mode,
      p_last_app_key: app.key,
      p_last_href: app.href,
      p_last_label: app.label,
      p_last_context: context,
    });
    if (saveError) {
      setError("Không lưu được điểm làm việc gần nhất. App vẫn sẽ được mở.");
    }
    router.push(app.href);
  };

  const beginFocusEdit = (position, item = null) => {
    setEditingSlot(position);
    setFocusDraft({
      title: item?.title || "",
      appKey: item?.app_key || MODE_DEFAULT_APP[mode],
    });
    requestAnimationFrame(() => document.querySelector("#focus-editor input")?.focus());
  };

  const saveFocus = async (event) => {
    event.preventDefault();
    const title = focusDraft.title.trim();
    if (!title) {
      setError("Việc ưu tiên cần một mô tả ngắn, đủ để ngày mai vẫn hiểu.");
      return;
    }
    setSaving(true);
    setError("");
    const app = APPS[focusDraft.appKey];
    const { error: saveError } = await supabase.rpc("save_morning_focus", {
      p_position: editingSlot,
      p_title: title,
      p_app_key: app.key,
      p_href: app.href,
    });
    setSaving(false);
    if (saveError) {
      setError("Chưa chốt được việc ưu tiên. Kiểm tra kết nối và thử lại.");
      return;
    }
    setFocusDraft({ title: "", appKey: MODE_DEFAULT_APP[mode] });
    await load();
  };

  const pinException = async (item) => {
    const position = [1, 2, 3].find((slot) => !focusMap[slot]);
    if (!position) {
      setError("Ba vị trí đã đầy. Chọn “Sửa” ở một việc để thay ưu tiên.");
      return;
    }
    setSaving(true);
    const { error: saveError } = await supabase.rpc("save_morning_focus", {
      p_position: position,
      p_title: item.title,
      p_app_key: item.appKey,
      p_href: item.href,
    });
    setSaving(false);
    if (saveError) {
      setError("Chưa ghim được ngoại lệ này vào ngày làm việc.");
      return;
    }
    await load();
  };

  const toggleFocus = async (item) => {
    const nextStatus = item.status === "done" ? "planned" : "done";
    setSnapshot((current) => ({
      ...current,
      focus: (current?.focus || []).map((focusItem) =>
        focusItem.id === item.id ? { ...focusItem, status: nextStatus } : focusItem,
      ),
    }));
    const { error: saveError } = await supabase.rpc("set_morning_focus_status", {
      p_id: item.id,
      p_status: nextStatus,
    });
    if (saveError) {
      setError("Chưa cập nhật được trạng thái việc. Làm mới để đồng bộ lại.");
    }
  };

  const saveMemory = async (event) => {
    event.preventDefault();
    if (!memoryDraft.title.trim()) {
      setError("Hãy viết điều cần nhớ thành một câu rõ ràng.");
      return;
    }
    setSaving(true);
    const { error: saveError } = await supabase.rpc("capture_company_memory", {
      p_kind: memoryDraft.kind,
      p_title: memoryDraft.title.trim(),
      p_body: memoryDraft.body.trim(),
      p_source: "morning_desk",
    });
    setSaving(false);
    if (saveError) {
      setError("Chưa đưa được ghi nhận vào hộp chờ duyệt.");
      return;
    }
    setMemoryDraft({ kind: "decision", title: "", body: "" });
    await load();
  };

  const reviewMemory = async (id, status) => {
    setSaving(true);
    const { error: reviewError } = await supabase.rpc("review_company_memory", {
      p_id: id,
      p_status: status,
    });
    setSaving(false);
    if (reviewError) {
      setError("Tài khoản này chưa duyệt được ghi nhận. Cần quyền quản lý hoặc admin.");
      return;
    }
    await load();
  };

  const resumePreference = snapshot?.preference || {};
  const resumeApp = APPS[resumePreference.last_app_key] || APPS[MODE_DEFAULT_APP[mode]];
  const resumeHref = resumePreference.last_href || resumeApp.href;
  const resume = { ...resumeApp, href: resumeHref, label: resumePreference.last_label || resumeApp.label };
  const completedFocus = focus.filter((item) => item.status === "done").length;

  return (
    <main className={styles.shell}>
      <aside className={styles.rail}>
        <div className={styles.brand}>
          <span aria-hidden="true">皇龍</span>
          <b>Hoàng Long</b>
        </div>
        <details className={styles.mobileMenu}>
          <summary><Menu />Ứng dụng</summary>
          <nav aria-label="Ứng dụng Hoàng Long">
            <Link href="/admin" className={styles.active}><Brain />Bàn ngày</Link>
            {APP_LIST.map((app) => {
              const Icon = app.icon;
              return <Link key={app.key} href={app.href} onClick={(event) => openApp(event, app)}><Icon />{app.short}</Link>;
            })}
          </nav>
        </details>
        <nav className={styles.desktopNav} aria-label="Ứng dụng Hoàng Long">
          <Link href="/admin" className={styles.active}><Brain /><span>Bàn ngày</span></Link>
          {APP_LIST.map((app) => {
            const Icon = app.icon;
            return <Link key={app.key} href={app.href} onClick={(event) => openApp(event, app)} data-loading={moving === app.key}><Icon /><span>{app.short}</span></Link>;
          })}
        </nav>
        <button className={styles.logout} onClick={onLogout}><LogOut /><span>Đăng xuất</span></button>
      </aside>

      <section className={styles.desk}>
        <header className={styles.topbar}>
          <div>
            <p>{dayLabel(locale)}</p>
            <h1>Bàn ngày</h1>
          </div>
          <div className={styles.identity}>
            <span><b>{email}</b><small>{role}</small></span>
            <button onClick={load} disabled={loading} aria-label="Làm mới bàn ngày"><RefreshCw className={loading ? styles.spin : ""} /></button>
          </div>
        </header>

        <section className={styles.brief}>
          <div className={styles.briefCopy}>
            <p>Chọn góc nhìn trước khi mở công việc</p>
            <h2>Hôm nay cần giữ điều gì?</h2>
          </div>
          <div className={styles.modeTabs} role="tablist" aria-label="Góc nhìn buổi sáng">
            {MODES.map(([id, label]) => <button key={id} role="tab" aria-selected={mode === id} onClick={() => saveMode(id)}>{label}</button>)}
          </div>
        </section>

        {error && <p className={styles.error} role="alert"><AlertTriangle />{error}<button onClick={() => setError("")} aria-label="Đóng thông báo">×</button></p>}

        <section className={styles.metrics} aria-label="Sự thật vận hành">
          {metrics.map(([label, value, note]) => (
            <article key={label}>
              <span>{label}</span>
              <b>{loading ? "—" : value}</b>
              <small>{note}</small>
            </article>
          ))}
        </section>

        <div className={styles.workGrid}>
          <div className={styles.primaryColumn}>
            <section className={styles.focusSection}>
              <header className={styles.sectionHeader}>
                <div><h2>Ba việc phải tiến</h2><p>Ít việc hơn, nhưng mỗi việc có đích đến rõ.</p></div>
                <span>{completedFocus}/{focus.length || 3} hoàn tất</span>
              </header>
              <div className={styles.focusRail}>
                {[1, 2, 3].map((position) => {
                  const item = focusMap[position];
                  const app = item ? APPS[item.app_key] : null;
                  return (
                    <article key={position} data-done={item?.status === "done"}>
                      <span className={styles.position}>0{position}</span>
                      {item ? (
                        <>
                          <button className={styles.checkButton} onClick={() => toggleFocus(item)} aria-pressed={item.status === "done"} aria-label={item.status === "done" ? "Đánh dấu chưa xong" : "Đánh dấu hoàn tất"}>
                            {item.status === "done" ? <CheckCircle2 /> : <Circle />}
                          </button>
                          <div className={styles.focusText}>
                            <b>{item.title}</b>
                            <span>{app?.label}</span>
                          </div>
                          <div className={styles.focusActions}>
                            <button onClick={() => beginFocusEdit(position, item)} aria-label={`Sửa ưu tiên ${position}`}><PencilLine /></button>
                            <Link href={item.href} onClick={(event) => openApp(event, { ...app, href: item.href }, { focus_id: item.id, focus_title: item.title })}>Mở<ArrowRight /></Link>
                          </div>
                        </>
                      ) : (
                        <button className={styles.emptyFocus} onClick={() => beginFocusEdit(position)}><Plus />Chọn việc cho vị trí này</button>
                      )}
                    </article>
                  );
                })}
              </div>
              <form className={styles.focusEditor} id="focus-editor" onSubmit={saveFocus}>
                <label>
                  <span>Ưu tiên {editingSlot}</span>
                  <input value={focusDraft.title} onChange={(event) => setFocusDraft({ ...focusDraft, title: event.target.value })} placeholder="Ví dụ: Chốt lịch giao cho đơn đang bị chặn" maxLength={160} />
                </label>
                <label>
                  <span>App tiếp tục</span>
                  <select value={focusDraft.appKey} onChange={(event) => setFocusDraft({ ...focusDraft, appKey: event.target.value })}>
                    {APP_LIST.map((app) => <option key={app.key} value={app.key}>{app.label}</option>)}
                  </select>
                </label>
                <button disabled={saving || !focusDraft.title.trim()}>{saving ? "Đang lưu" : "Chốt ưu tiên"}</button>
              </form>
            </section>

            <section className={styles.exceptions}>
              <header className={styles.sectionHeader}>
                <div><h2>Ngoại lệ cần quyết định</h2><p>Chỉ những gì lệch nhịp hoặc đang chờ người chịu trách nhiệm.</p></div>
                <span>{exceptions.length} {locale === "en" ? (exceptions.length === 1 ? "item" : "items") : "mục"}</span>
              </header>
              {loading ? (
                <div className={styles.skeleton} aria-label="Đang tải ngoại lệ"><i /><i /><i /></div>
              ) : exceptions.length ? (
                <div className={styles.exceptionRows}>
                  {exceptions.map((item) => {
                    const app = APPS[item.appKey];
                    return (
                      <article key={item.id} data-level={item.level}>
                        <span className={styles.signal}>{item.level === "critical" ? <AlertTriangle /> : item.level === "attention" ? <Scale /> : <Circle />}</span>
                        <div><b>{item.title}</b><p>{item.detail}</p><small>{app.label}</small></div>
                        <button onClick={() => pinException(item)} disabled={saving || focus.length >= 3}><Plus />Ghim</button>
                        <Link href={item.href} onClick={(event) => openApp(event, { ...app, href: item.href }, { exception: item.id })} aria-label={`Mở ${item.title}`}><ChevronRight /></Link>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className={styles.clearState}><CheckCircle2 /><div><b>Không có ngoại lệ đang mở.</b><p>Chọn một việc chủ động cho vị trí còn trống, hoặc tiếp tục phiên gần nhất.</p></div></div>
              )}
            </section>
          </div>

          <aside className={styles.contextColumn}>
            <section className={styles.resume}>
              <div><RotateCcw /><span>Tiếp tục từ lần trước</span></div>
              <h2>{resume.label}</h2>
              <p>{resumePreference.last_href ? (locale === "en" ? `You left the desk ${relativeUpdate(resumePreference.updated_at, locale)}.` : `Đã rời bàn ${relativeUpdate(resumePreference.updated_at, locale)}.`) : "Chưa có phiên trước. Mở app phù hợp với góc nhìn hiện tại."}</p>
              <Link href={resume.href} onClick={(event) => openApp(event, resume)}>Tiếp tục<ArrowRight /></Link>
            </section>

            <section className={styles.appMap}>
              <header className={styles.sectionHeader}><div><h2>Đi đúng app</h2><p>Mỗi app giữ một loại sự thật.</p></div></header>
              <div>
                {APP_LIST.map((app) => {
                  const Icon = app.icon;
                  return (
                    <Link key={app.key} href={app.href} onClick={(event) => openApp(event, app)}>
                      <Icon />
                      <span><b>{app.label}</b><small>{app.description}</small></span>
                      <ChevronRight />
                    </Link>
                  );
                })}
              </div>
            </section>

            <section className={styles.memory}>
              <header className={styles.sectionHeader}>
                <div><h2>Điều công ty cần nhớ</h2><p>Ghi nhận trước, duyệt sau. Không tự biến chat thành quy tắc.</p></div>
                <span>{memory.inbox_count || 0} chờ duyệt</span>
              </header>
              <form onSubmit={saveMemory}>
                <label>
                  <span>Loại ghi nhận</span>
                  <select value={memoryDraft.kind} onChange={(event) => setMemoryDraft({ ...memoryDraft, kind: event.target.value })}>
                    <option value="decision">Quyết định</option>
                    <option value="policy">Quy tắc</option>
                    <option value="learning">Bài học</option>
                  </select>
                </label>
                <label>
                  <span>Điều cần nhớ</span>
                  <input value={memoryDraft.title} onChange={(event) => setMemoryDraft({ ...memoryDraft, title: event.target.value })} placeholder="Viết thành một câu có thể dùng lại" maxLength={180} />
                </label>
                <label>
                  <span>Ngữ cảnh</span>
                  <textarea value={memoryDraft.body} onChange={(event) => setMemoryDraft({ ...memoryDraft, body: event.target.value })} placeholder="Vì sao điều này đúng, áp dụng khi nào?" />
                </label>
                <button disabled={saving || !memoryDraft.title.trim()}><BookOpenCheck />Đưa vào hộp duyệt</button>
              </form>

              {memory.inbox?.length > 0 && (
                <div className={styles.memoryInbox}>
                  {memory.inbox.map((item) => (
                    <article key={item.id}>
                      <span>{KIND_LABEL[item.kind]}</span>
                      <b>{item.title}</b>
                      {item.body && <p>{item.body}</p>}
                      {canReview ? (
                        <div><button onClick={() => reviewMemory(item.id, "approved")} disabled={saving}><Check />Duyệt</button><button onClick={() => reviewMemory(item.id, "archived")} disabled={saving}>Lưu kho</button></div>
                      ) : <small>Chờ quản lý duyệt</small>}
                    </article>
                  ))}
                </div>
              )}

              {memory.approved?.length > 0 && (
                <div className={styles.approvedMemory}>
                  <h3>Đã trở thành trí nhớ chung</h3>
                  {memory.approved.slice(0, 4).map((item) => <article key={item.id}><Leaf /><span><small>{KIND_LABEL[item.kind]}</small><b>{item.title}</b></span></article>)}
                </div>
              )}
            </section>
          </aside>
        </div>

        <footer className={styles.footer}>
          <span>Hoàng Long · Bàn ngày</span>
          <p>Dữ liệu thật ở app nguồn. Quyết định chỉ thành trí nhớ sau khi được duyệt.</p>
        </footer>
      </section>
    </main>
  );
}

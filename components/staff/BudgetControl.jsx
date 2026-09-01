"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  Banknote,
  CalendarRange,
  Check,
  ChevronRight,
  CircleDollarSign,
  ClipboardCheck,
  Clock3,
  Gauge,
  LogOut,
  Plus,
  Receipt,
  RefreshCw,
  ShieldCheck,
  Target,
  WalletCards,
  X,
} from "lucide-react";
import styles from "./BudgetControl.module.css";
import FormattedNumberInput from "@/components/FormattedNumberInput";

const money = (value) => `${Number(value || 0).toLocaleString("vi-VN")} ₫`;
const shortDate = (value) =>
  value ? new Intl.DateTimeFormat("vi-VN").format(new Date(`${value}T00:00:00`)) : "—";
const isoDate = (value) => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
const currentMonth = () => {
  const now = new Date();
  return {
    startsOn: isoDate(new Date(now.getFullYear(), now.getMonth(), 1)),
    endsOn: isoDate(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
  };
};

const KIND_LABEL = {
  recurring: "Chi thường xuyên",
  one_off: "Đầu tư một lần",
  reserve: "Khoản linh hoạt",
};
const envelopeName = (envelope) => envelope?.code === "reserve" ? "Quỹ linh hoạt" : envelope?.name;
const STATUS_LABEL = {
  pending: "Chờ duyệt",
  approved: "Đã duyệt",
  rejected: "Không duyệt",
  closed: "Đã đóng",
  planned: "Dự kiến",
  committed: "Đã cam kết",
  paid: "Đã thanh toán",
  cancelled: "Đã hủy",
};
const APP_LABEL = {
  "": "Không liên kết",
  orders: "Điều phối đơn",
  pipeline: "Phát triển đối tác",
  operations: "Vận hành & tài chính",
  control: "Thương mại",
  house: "Nhà & danh mục",
};

function Dialog({ title, label, onClose, children }) {
  const ref = useRef(null);
  useEffect(() => {
    const node = ref.current;
    if (node && !node.open) node.showModal();
    return () => {
      if (node?.open) node.close();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      aria-label={label || title}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
    >
      <section>
        <header>
          <h2>{title}</h2>
          <button type="button" onClick={onClose} aria-label={`Đóng ${title}`}>
            <X />
          </button>
        </header>
        {children}
      </section>
    </dialog>
  );
}

export default function BudgetControl({ supabase, email, role, onLogout }) {
  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [periodId, setPeriodId] = useState("");
  const [periodDraft, setPeriodDraft] = useState(null);
  const [allocationDraft, setAllocationDraft] = useState(null);
  const [spendDraft, setSpendDraft] = useState(null);

  const load = useCallback(
    async (nextPeriodId = "") => {
      setLoading(true);
      setError("");
      const { data, error: loadError } = await supabase.rpc("budget_snapshot", {
        p_period_id: nextPeriodId || null,
      });
      if (loadError) {
        setError("Chưa tải được ngân sách. Kiểm tra migration 0037 rồi thử lại.");
      } else {
        setSnapshot(data);
        setPeriodId(data?.period?.id || "");
      }
      setLoading(false);
    },
    [supabase],
  );

  useEffect(() => {
    load("");
  }, [load]);

  const period = snapshot?.period;
  const periods = snapshot?.periods || [];
  const envelopes = snapshot?.envelopes || [];
  const allocations = snapshot?.allocations || [];
  const spends = snapshot?.spends || [];
  const summary = snapshot?.summary || {};
  const canApprove = snapshot?.can_approve || ["admin", "manager"].includes(role);
  const approved = allocations.filter((item) => item.status === "approved");
  const pending = allocations.filter((item) => item.status === "pending");
  const totalLimit = Number(summary.total_limit || 0);
  const allocated = Number(summary.approved_allocated || 0);
  const committed = Number(summary.committed || 0);
  const spent = Number(summary.spent || 0);
  const unallocated = Math.max(0, totalLimit - allocated);
  const available = Math.max(0, allocated - committed);
  const envelopeRows = useMemo(
    () =>
      envelopes.map((envelope) => {
        const lines = approved.filter((item) => item.envelope_code === envelope.code);
        return {
          ...envelope,
          amount: lines.reduce((sum, item) => sum + Number(item.amount || 0), 0),
          committed: lines.reduce((sum, item) => sum + Number(item.committed || 0), 0),
          spent: lines.reduce((sum, item) => sum + Number(item.spent || 0), 0),
        };
      }),
    [approved, envelopes],
  );

  const beginPeriod = () => {
    const dates = currentMonth();
    setPeriodDraft({
      name: `Ngân sách tháng ${new Date().getMonth() + 1}/${new Date().getFullYear()}`,
      startsOn: dates.startsOn,
      endsOn: dates.endsOn,
      totalLimit: "",
      note: "",
      activate: true,
    });
  };

  const savePeriod = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    const { data, error: saveError } = await supabase.rpc("create_budget_period", {
      p_name: periodDraft.name.trim(),
      p_starts_on: periodDraft.startsOn,
      p_ends_on: periodDraft.endsOn,
      p_total_limit: Number(periodDraft.totalLimit || 0),
      p_note: periodDraft.note.trim(),
      p_activate: periodDraft.activate,
    });
    setSaving(false);
    if (saveError) {
      setError("Chưa tạo được kỳ ngân sách. Cần quyền quản lý và khoảng ngày hợp lệ.");
      return;
    }
    setPeriodDraft(null);
    await load(data);
  };

  const beginAllocation = (envelopeCode = envelopes[0]?.code || "") => {
    const envelope = envelopes.find((item) => item.code === envelopeCode);
    setAllocationDraft({
      envelopeCode,
      title: "",
      spendKind:
        envelope?.default_kind === "operating"
          ? "recurring"
          : envelope?.default_kind === "reserve"
            ? "reserve"
            : "one_off",
      amount: "",
      owner: email,
      expectedOutcome: "",
    });
  };

  const saveAllocation = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    const { error: saveError } = await supabase.rpc("create_budget_allocation", {
      p_period_id: period.id,
      p_envelope_code: allocationDraft.envelopeCode,
      p_title: allocationDraft.title.trim(),
      p_spend_kind: allocationDraft.spendKind,
      p_amount: Number(allocationDraft.amount),
      p_owner: allocationDraft.owner.trim(),
      p_expected_outcome: allocationDraft.expectedOutcome.trim(),
    });
    setSaving(false);
    if (saveError) {
      setError("Chưa gửi được khoản phân bổ. Kiểm tra số tiền, mục tiêu và kỳ đang mở.");
      return;
    }
    setAllocationDraft(null);
    await load(period.id);
  };

  const reviewAllocation = async (id, status) => {
    setSaving(true);
    setError("");
    const { error: reviewError } = await supabase.rpc("review_budget_allocation", {
      p_id: id,
      p_status: status,
      p_note: "",
    });
    setSaving(false);
    if (reviewError) {
      setError("Chưa cập nhật được phê duyệt. Tài khoản cần quyền quản lý hoặc admin.");
      return;
    }
    await load(period.id);
  };

  const beginSpend = (allocation) =>
    setSpendDraft({
      allocationId: allocation.id,
      description: "",
      vendor: "",
      amount: "",
      status: "planned",
      incurredOn: "",
      dueOn: "",
      linkedApp: "",
      linkedRef: "",
      outcomeNote: "",
    });

  const saveSpend = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    const { error: saveError } = await supabase.rpc("create_budget_spend", {
      p_allocation_id: spendDraft.allocationId,
      p_description: spendDraft.description.trim(),
      p_vendor: spendDraft.vendor.trim(),
      p_amount: Number(spendDraft.amount),
      p_status: spendDraft.status,
      p_incurred_on: spendDraft.incurredOn || null,
      p_due_on: spendDraft.dueOn || null,
      p_linked_app: spendDraft.linkedApp,
      p_linked_ref: spendDraft.linkedRef.trim(),
      p_outcome_note: spendDraft.outcomeNote.trim(),
    });
    setSaving(false);
    if (saveError) {
      setError("Chưa ghi được khoản chi. Khoản đã cam kết hoặc thanh toán không được vượt phần phân bổ.");
      return;
    }
    setSpendDraft(null);
    await load(period.id);
  };

  const setSpendStatus = async (id, status) => {
    setSaving(true);
    setError("");
    const { error: statusError } = await supabase.rpc("set_budget_spend_status", {
      p_id: id,
      p_status: status,
    });
    setSaving(false);
    if (statusError) {
      setError("Chưa đổi được trạng thái. Kiểm tra phần ngân sách còn lại của khoản phân bổ.");
      return;
    }
    await load(period.id);
  };

  if (loading && !snapshot)
    return (
      <main className={styles.loading} aria-live="polite">
        <div className={styles.loadingLedger} aria-hidden="true"><i /><i /><i /><i /></div>
        <p>Đang mở sổ ngân sách…</p>
      </main>
    );

  return (
    <main className={styles.page}>
      <header className={styles.topbar}>
        <div>
          <Link href="/admin/operations"><ArrowLeft />Vận hành</Link>
          <span>Ngân sách & đầu tư</span>
        </div>
        <div className={styles.identity}>
          <span><b>{email}</b><small>{role}</small></span>
          <button onClick={() => load(periodId)} disabled={loading} aria-label="Làm mới ngân sách"><RefreshCw /></button>
          <button onClick={onLogout}><LogOut />Đăng xuất</button>
        </div>
      </header>

      <section className={styles.intro}>
        <div>
          <p>Tiền được quyết định trước khi được chi</p>
          <h1>Phân bổ. Cam kết. Thanh toán.</h1>
          <span>Mỗi khoản tiền có chủ sở hữu, mục tiêu và kết quả để nhìn lại.</span>
        </div>
        <div className={styles.periodControl}>
          <Link href="/admin/operations/expenses"><Receipt />Ghi chi nhanh</Link>
          <label>
            <span>Kỳ đang xem</span>
            <select
              value={periodId}
              onChange={(event) => {
                setPeriodId(event.target.value);
                load(event.target.value);
              }}
              disabled={!periods.length}
            >
              {!periods.length && <option value="">Chưa có kỳ ngân sách</option>}
              {periods.map((item) => <option key={item.id} value={item.id}>{item.name} · {STATUS_LABEL[item.status] || item.status}</option>)}
            </select>
          </label>
          {canApprove && <button onClick={beginPeriod}><CalendarRange />Tạo kỳ</button>}
        </div>
      </section>

      {error && <p className={styles.error} role="alert"><AlertTriangle />{error}<button onClick={() => setError("")} aria-label="Đóng thông báo">×</button></p>}

      {!period ? (
        <section className={styles.empty}>
          <WalletCards />
          <div><h2>Chưa có kỳ ngân sách.</h2><p>Tạo kỳ đầu tiên để bắt đầu phân bổ tiền theo mục tiêu.</p></div>
          {canApprove && <button onClick={beginPeriod}><Plus />Tạo kỳ ngân sách</button>}
        </section>
      ) : (
        <>
          <section className={styles.periodLine}>
            <div><b>{period.name}</b><span>{shortDate(period.starts_on)}–{shortDate(period.ends_on)}</span></div>
            <span data-status={period.status}>{STATUS_LABEL[period.status] || period.status}</span>
          </section>

          <section className={styles.metrics} aria-label="Tình trạng ngân sách">
            {[
              ["Trần ngân sách", totalLimit, "Tổng có thể phân bổ", CircleDollarSign],
              ["Đã phân bổ", allocated, `${money(unallocated)} chưa phân bổ`, Target],
              ["Đã cam kết", committed, `${money(available)} còn khả dụng`, ClipboardCheck],
              ["Đã thanh toán", spent, `${money(Math.max(0, committed - spent))} chưa thanh toán`, Banknote],
            ].map(([label, value, note, Icon]) => (
              <article key={label}><Icon /><span>{label}</span><b>{money(value)}</b><small>{note}</small></article>
            ))}
          </section>

          {pending.length > 0 && (
            <section className={styles.approvals}>
              <header><div><h2>Đang chờ quyết định</h2><p>{pending.length} khoản chưa trở thành ngân sách được phép chi.</p></div><ShieldCheck /></header>
              {pending.map((item) => (
                <article key={item.id}>
                  <div><span>{item.envelope_name} · {KIND_LABEL[item.spend_kind]}</span><b>{item.title}</b><p>{item.expected_outcome}</p><small>{item.owner || "Chưa chỉ định người phụ trách"}</small></div>
                  <strong>{money(item.amount)}</strong>
                  {canApprove ? <nav><button onClick={() => reviewAllocation(item.id, "approved")} disabled={saving}><Check />Duyệt</button><button onClick={() => reviewAllocation(item.id, "rejected")} disabled={saving}><X />Không duyệt</button></nav> : <em>Chờ quản lý duyệt</em>}
                </article>
              ))}
            </section>
          )}

          <div className={styles.workGrid}>
            <section className={styles.ledger}>
              <header className={styles.sectionHeader}>
                <div><h2>Phong bì ngân sách</h2><p>Nhìn tiền được duyệt và mức sử dụng trước khi tạo khoản chi mới.</p></div>
                <button onClick={() => beginAllocation()} disabled={period.status === "closed"}><Plus />Xin phân bổ</button>
              </header>
              <div className={styles.envelopes}>
                {envelopeRows.map((item) => {
                  const ratio = item.amount > 0 ? item.committed / item.amount : 0;
                  return (
                    <article key={item.code} data-risk={ratio >= 0.8}>
                      <div><b>{envelopeName(item)}</b><p>{item.description}</p><small>{item.default_kind === "operating" ? "Vận hành" : item.default_kind === "investment" ? "Đầu tư" : "Linh hoạt"}</small></div>
                      <dl>
                        <div><dt>Được duyệt</dt><dd>{money(item.amount)}</dd></div>
                        <div><dt>Cam kết</dt><dd>{money(item.committed)}</dd></div>
                        <div><dt>Còn lại</dt><dd>{money(Math.max(0, item.amount - item.committed))}</dd></div>
                      </dl>
                      <div className={styles.usage} aria-label={`Đã dùng ${Math.min(100, Math.round(ratio * 100))}%`}><i style={{ "--usage": `${Math.min(100, ratio * 100)}%` }} /></div>
                      <button onClick={() => beginAllocation(item.code)}><Plus />Thêm đề xuất</button>
                    </article>
                  );
                })}
              </div>
            </section>

            <aside className={styles.allocations}>
              <header className={styles.sectionHeader}><div><h2>Khoản được phép chi</h2><p>Khoản chi chỉ được tạo từ phân bổ đã duyệt.</p></div><span>{approved.length} khoản</span></header>
              {approved.length ? approved.map((item) => {
                const ratio = Number(item.amount) > 0 ? Number(item.committed) / Number(item.amount) : 0;
                return (
                  <article key={item.id} data-risk={ratio >= 0.8}>
                    <span>{item.envelope_name} · {KIND_LABEL[item.spend_kind]}</span>
                    <h3>{item.title}</h3>
                    <p>{item.expected_outcome}</p>
                    <dl><div><dt>Phân bổ</dt><dd>{money(item.amount)}</dd></div><div><dt>Cam kết</dt><dd>{money(item.committed)}</dd></div><div><dt>Đã chi</dt><dd>{money(item.spent)}</dd></div></dl>
                    <button onClick={() => beginSpend(item)}><Receipt />Ghi khoản chi</button>
                  </article>
                );
              }) : <div className={styles.smallEmpty}><Gauge /><p>Chưa có khoản phân bổ được duyệt.</p></div>}
            </aside>
          </div>

          <section className={styles.spends}>
            <header className={styles.sectionHeader}><div><h2>Sổ khoản chi</h2><p>Dự kiến chưa giữ tiền; cam kết và thanh toán đều trừ vào phần khả dụng.</p></div><span>{spends.length} dòng</span></header>
            {spends.length ? <div className={styles.spendRows}>{spends.map((item) => (
              <article key={item.id} data-status={item.status}>
                <div><span>{item.allocation_title}</span><b>{item.description}</b><small>{item.vendor || "Chưa ghi nhà cung cấp"}{item.due_on ? ` · hạn ${shortDate(item.due_on)}` : ""}</small></div>
                <strong>{money(item.amount)}</strong>
                <em>{STATUS_LABEL[item.status] || item.status}</em>
                <nav>
                  {item.status === "planned" && <><button onClick={() => setSpendStatus(item.id, "committed")} disabled={saving}>Cam kết</button><button onClick={() => setSpendStatus(item.id, "cancelled")} disabled={saving}>Hủy</button></>}
                  {item.status === "committed" && <button onClick={() => setSpendStatus(item.id, "paid")} disabled={saving}>Đã thanh toán</button>}
                  {item.linked_app && <Link href={APP_LABEL[item.linked_app] ? `/admin/${item.linked_app === "operations" ? "operations" : item.linked_app}` : "/admin"} aria-label={`Mở ${APP_LABEL[item.linked_app]}`}><ChevronRight /></Link>}
                </nav>
              </article>
            ))}</div> : <div className={styles.emptyRows}><Receipt /><p>Chưa có khoản chi. Chọn một phân bổ đã duyệt để ghi dòng đầu tiên.</p></div>}
          </section>
        </>
      )}

      <footer className={styles.footer}><span>Hoàng Long · Ngân sách</span><p>Phân bổ là quyền được chi. Cam kết và thanh toán là tiền đã được sử dụng.</p></footer>

      {periodDraft && (
        <Dialog title="Tạo kỳ ngân sách" onClose={() => setPeriodDraft(null)}>
          <form className={styles.form} onSubmit={savePeriod}>
            <label><span>Tên kỳ</span><input required value={periodDraft.name} onChange={(event) => setPeriodDraft({ ...periodDraft, name: event.target.value })} /><small>Tên xuất hiện trên báo cáo và Bảng điều khiển.</small></label>
            <div className={styles.formGrid}><label><span>Từ ngày</span><input required type="date" value={periodDraft.startsOn} onChange={(event) => setPeriodDraft({ ...periodDraft, startsOn: event.target.value })} /><small>&nbsp;</small></label><label><span>Đến ngày</span><input required type="date" value={periodDraft.endsOn} onChange={(event) => setPeriodDraft({ ...periodDraft, endsOn: event.target.value })} /><small>&nbsp;</small></label></div>
            <label><span>Trần ngân sách</span><FormattedNumberInput required min="0" step="1000" value={periodDraft.totalLimit} onChange={(event) => setPeriodDraft({ ...periodDraft, totalLimit: event.target.value })} /><small>Tổng tiền tối đa có thể phân bổ trong kỳ.</small></label>
            <label><span>Ghi chú</span><textarea value={periodDraft.note} onChange={(event) => setPeriodDraft({ ...periodDraft, note: event.target.value })} /><small>Nguyên tắc hoặc giới hạn quan trọng của kỳ.</small></label>
            <label className={styles.check}><input type="checkbox" checked={periodDraft.activate} onChange={(event) => setPeriodDraft({ ...periodDraft, activate: event.target.checked })} /><span>Kích hoạt ngay; kỳ đang hoạt động sẽ được đóng.</span></label>
            <button disabled={saving || !periodDraft.name.trim()}>{saving ? "Đang tạo" : "Tạo kỳ ngân sách"}</button>
          </form>
        </Dialog>
      )}

      {allocationDraft && (
        <Dialog title="Xin phân bổ ngân sách" onClose={() => setAllocationDraft(null)}>
          <form className={styles.form} onSubmit={saveAllocation}>
            <label><span>Phong bì</span><select value={allocationDraft.envelopeCode} onChange={(event) => setAllocationDraft({ ...allocationDraft, envelopeCode: event.target.value })}>{envelopes.map((item) => <option key={item.code} value={item.code}>{envelopeName(item)}</option>)}</select><small>Nhóm mục tiêu mà khoản tiền phục vụ.</small></label>
            <label><span>Tên khoản phân bổ</span><input required maxLength={160} value={allocationDraft.title} onChange={(event) => setAllocationDraft({ ...allocationDraft, title: event.target.value })} placeholder="Ví dụ: Quảng cáo tìm quán pha chế tháng 9" /><small>Đủ cụ thể để phân biệt với các khoản khác.</small></label>
            <div className={styles.formGrid}><label><span>Loại chi</span><select value={allocationDraft.spendKind} onChange={(event) => setAllocationDraft({ ...allocationDraft, spendKind: event.target.value })}><option value="recurring">Chi thường xuyên</option><option value="one_off">Đầu tư một lần</option><option value="reserve">Khoản linh hoạt</option></select><small>&nbsp;</small></label><label><span>Số tiền</span><FormattedNumberInput required min="1" step="1000" value={allocationDraft.amount} onChange={(event) => setAllocationDraft({ ...allocationDraft, amount: event.target.value })} /><small>&nbsp;</small></label></div>
            <label><span>Người phụ trách</span><input value={allocationDraft.owner} onChange={(event) => setAllocationDraft({ ...allocationDraft, owner: event.target.value })} /><small>Người chịu trách nhiệm sử dụng và báo kết quả.</small></label>
            <label><span>Kết quả kỳ vọng</span><textarea required maxLength={500} value={allocationDraft.expectedOutcome} onChange={(event) => setAllocationDraft({ ...allocationDraft, expectedOutcome: event.target.value })} placeholder="Ví dụ: tạo 20 lead quán phù hợp và xác định chi phí trên mỗi lead" /><small>Viết một kết quả có thể kiểm tra sau khi chi.</small></label>
            <button disabled={saving || !allocationDraft.title.trim() || !allocationDraft.expectedOutcome.trim()}>{saving ? "Đang gửi" : "Đưa vào hàng chờ duyệt"}</button>
          </form>
        </Dialog>
      )}

      {spendDraft && (
        <Dialog title="Ghi khoản chi" onClose={() => setSpendDraft(null)}>
          <form className={styles.form} onSubmit={saveSpend}>
            <label><span>Khoản phân bổ</span><select value={spendDraft.allocationId} onChange={(event) => setSpendDraft({ ...spendDraft, allocationId: event.target.value })}>{approved.map((item) => <option key={item.id} value={item.id}>{item.title} · còn {money(Math.max(0, Number(item.amount) - Number(item.committed)))}</option>)}</select><small>Khoản chi không thể vượt phần phân bổ còn lại.</small></label>
            <label><span>Nội dung chi</span><input required maxLength={200} value={spendDraft.description} onChange={(event) => setSpendDraft({ ...spendDraft, description: event.target.value })} placeholder="Ví dụ: In thử 3 phương án nhãn" /><small>Một dòng cho một cam kết hoặc thanh toán.</small></label>
            <div className={styles.formGrid}><label><span>Nhà cung cấp</span><input value={spendDraft.vendor} onChange={(event) => setSpendDraft({ ...spendDraft, vendor: event.target.value })} /><small>&nbsp;</small></label><label><span>Số tiền</span><FormattedNumberInput required min="1" step="1000" value={spendDraft.amount} onChange={(event) => setSpendDraft({ ...spendDraft, amount: event.target.value })} /><small>&nbsp;</small></label></div>
            <div className={styles.formGrid}><label><span>Trạng thái</span><select value={spendDraft.status} onChange={(event) => setSpendDraft({ ...spendDraft, status: event.target.value })}><option value="planned">Dự kiến</option><option value="committed">Đã cam kết</option><option value="paid">Đã thanh toán</option></select><small>Dự kiến chưa trừ vào tiền khả dụng.</small></label><label><span>Hạn thanh toán</span><input type="date" value={spendDraft.dueOn} onChange={(event) => setSpendDraft({ ...spendDraft, dueOn: event.target.value })} /><small>&nbsp;</small></label></div>
            <div className={styles.formGrid}><label><span>App liên quan</span><select value={spendDraft.linkedApp} onChange={(event) => setSpendDraft({ ...spendDraft, linkedApp: event.target.value })}>{Object.entries(APP_LABEL).map(([key, label]) => <option key={key || "none"} value={key}>{label}</option>)}</select><small>&nbsp;</small></label><label><span>Mã liên quan</span><input value={spendDraft.linkedRef} onChange={(event) => setSpendDraft({ ...spendDraft, linkedRef: event.target.value })} placeholder="Campaign, đơn hoặc đối tác" /><small>&nbsp;</small></label></div>
            <label><span>Kết quả thực tế</span><textarea value={spendDraft.outcomeNote} onChange={(event) => setSpendDraft({ ...spendDraft, outcomeNote: event.target.value })} /><small>Có thể để trống và bổ sung sau khi có kết quả.</small></label>
            <button disabled={saving || !spendDraft.description.trim()}>{saving ? "Đang ghi" : "Ghi khoản chi"}</button>
          </form>
        </Dialog>
      )}
    </main>
  );
}

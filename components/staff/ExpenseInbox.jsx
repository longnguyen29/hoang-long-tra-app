"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle, ArrowLeft, Check, ChevronRight, CircleDollarSign, Clock3,
  Inbox, LogOut, PackageOpen, ReceiptText, RefreshCw, SlidersHorizontal, WalletCards, X,
} from "lucide-react";
import FormattedNumberInput from "@/components/FormattedNumberInput";
import styles from "./ExpenseInbox.module.css";

const money = (value) => `${Number(value || 0).toLocaleString("vi-VN")} ₫`;
const isoDate = () => {
  const value = new Date();
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
};
const shortDate = (value) => value ? new Intl.DateTimeFormat("vi-VN").format(new Date(`${value}T00:00:00`)) : "—";
const statusLabel = { planned: "Dự kiến", committed: "Đã cam kết", paid: "Đã thanh toán" };
const emptyDraft = () => ({ description: "", amount: "", vendor: "", incurredOn: isoDate(), paymentStatus: "paid", suggestedEnvelopeCode: "", note: "" });

function SortDialog({ expense, allocations, onClose, onSort, saving }) {
  const ref = useRef(null);
  const firstMatch = allocations.find((item) => item.envelope_code === expense.suggested_envelope_code) || allocations[0];
  const [allocationId, setAllocationId] = useState(firstMatch?.id || "");
  useEffect(() => {
    const node = ref.current;
    if (node && !node.open) node.showModal();
    return () => { if (node?.open) node.close(); };
  }, []);
  const selected = allocations.find((item) => item.id === allocationId);
  const remaining = selected ? Math.max(0, Number(selected.amount) - Number(selected.committed)) : 0;
  const enough = remaining >= Number(expense.amount);
  return <dialog ref={ref} className={styles.dialog} aria-label="Phân loại khoản chi" onCancel={(event)=>{event.preventDefault();onClose()}} onClick={(event)=>{if(event.target===ref.current)onClose()}}>
    <section><header><div><p>Phân loại</p><h2>Đưa khoản chi vào đúng sổ</h2></div><button onClick={onClose} aria-label="Đóng"><X/></button></header>
      <div className={styles.sortReceipt}><span>{shortDate(expense.incurred_on)}</span><b>{expense.description}</b><strong>{money(expense.amount)}</strong></div>
      {allocations.length ? <form onSubmit={(event)=>{event.preventDefault();onSort(expense.id,allocationId)}}>
        <label><span>Khoản ngân sách đã duyệt</span><select value={allocationId} onChange={(event)=>setAllocationId(event.target.value)}>{allocations.map((item)=><option key={item.id} value={item.id}>{item.title} · còn {money(Math.max(0,Number(item.amount)-Number(item.committed)))}</option>)}</select><small>Khoản chi sẽ chuyển khỏi hộp chờ và xuất hiện trong sổ ngân sách.</small></label>
        {!enough&&<p className={styles.warning}><AlertTriangle/>Khoản phân bổ này không còn đủ số dư.</p>}
        <button disabled={saving||!allocationId||!enough}>{saving?"Đang phân loại…":"Đưa vào sổ ngân sách"}</button>
      </form> : <div className={styles.noAllocation}><WalletCards/><h3>Chưa có ngân sách được duyệt.</h3><p>Khoản chi vẫn an toàn trong hộp chờ. Tạo và duyệt một khoản phân bổ trước khi phân loại.</p><Link href="/admin/operations/budget">Mở Ngân sách <ChevronRight/></Link></div>}
    </section>
  </dialog>;
}

export default function ExpenseInbox({ supabase, email, onLogout }) {
  const [expenses, setExpenses] = useState([]);
  const [budget, setBudget] = useState(null);
  const [draft, setDraft] = useState(emptyDraft);
  const [sorting, setSorting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    const [expenseResult, budgetResult] = await Promise.all([
      supabase.from("expense_inbox").select("*, budget_allocations(title,envelope_code)").order("created_at",{ascending:false}).limit(100),
      supabase.rpc("budget_snapshot",{p_period_id:null}),
    ]);
    if (expenseResult.error || budgetResult.error) setError("Chưa tải được hộp khoản chi. Kiểm tra migration 0044.");
    else { setExpenses(expenseResult.data || []); setBudget(budgetResult.data); }
    setLoading(false);
  }, [supabase]);
  useEffect(()=>{load()},[load]);

  const envelopes = budget?.envelopes || [];
  const allocations = (budget?.allocations || []).filter((item)=>item.status==="approved");
  const unsorted = expenses.filter((item)=>item.status==="unsorted");
  const classified = expenses.filter((item)=>item.status==="classified");
  const unsortedTotal = unsorted.reduce((sum,item)=>sum+Number(item.amount||0),0);
  const envelopeByCode = useMemo(()=>Object.fromEntries(envelopes.map((item)=>[item.code,item])),[envelopes]);

  const flash = (message) => { setNotice(message); window.setTimeout(()=>setNotice(""),2400); };
  const saveQuick = async (event) => {
    event.preventDefault();
    if (!draft.description.trim() || Number(draft.amount)<=0) return;
    setSaving(true); setError("");
    const { error: saveError } = await supabase.rpc("create_quick_expense",{
      p_description:draft.description.trim(), p_amount:Number(draft.amount), p_vendor:draft.vendor.trim(),
      p_incurred_on:draft.incurredOn, p_payment_status:draft.paymentStatus,
      p_suggested_envelope_code:draft.suggestedEnvelopeCode||null, p_note:draft.note.trim(),
    });
    setSaving(false);
    if (saveError) { setError("Chưa lưu được khoản chi. Cần nội dung và số tiền lớn hơn 0."); return; }
    setDraft(emptyDraft()); flash("Đã lưu vào hộp chờ phân loại"); await load();
  };
  const classify = async (id, allocationId) => {
    setSaving(true); setError("");
    const { error: classifyError } = await supabase.rpc("classify_quick_expense",{p_id:id,p_allocation_id:allocationId});
    setSaving(false);
    if (classifyError) { setError("Chưa phân loại được. Kiểm tra số dư của khoản ngân sách đã duyệt."); return; }
    setSorting(null); flash("Đã đưa khoản chi vào sổ ngân sách"); await load();
  };

  return <main className={styles.page}>
    <header className={styles.topbar}><div><Link href="/admin/operations"><ArrowLeft/>Vận hành</Link><span>Hộp khoản chi</span></div><div><span><b>{email}</b><small>Ghi trước · xếp sau</small></span><button onClick={load} disabled={loading} aria-label="Làm mới"><RefreshCw/></button><button onClick={onLogout}><LogOut/>Đăng xuất</button></div></header>
    <section className={styles.intro}><div><p>Ghi ngay khi tiền vừa rời tay</p><h1>Đừng để khoản nhỏ biến mất.</h1><span>Chỉ cần ghi số tiền và nội dung. Phân loại vào ngân sách khi bạn có thời gian.</span></div><nav><Link href="/admin/operations/budget"><CircleDollarSign/>Ngân sách</Link></nav></section>
    {error&&<p className={styles.error}><AlertTriangle/>{error}<button onClick={()=>setError("")} aria-label="Đóng">×</button></p>}
    {notice&&<p className={styles.notice}><Check/>{notice}</p>}

    <section className={styles.captureArea}>
      <form className={styles.capture} onSubmit={saveQuick}><header><ReceiptText/><div><p>Phiếu mới</p><h2>Vừa chi khoản gì?</h2></div></header>
        <label className={styles.amount}><span>Số tiền</span><FormattedNumberInput required min="1" step="1000" value={draft.amount} onChange={(event)=>setDraft({...draft,amount:event.target.value})} placeholder="383.000" autoFocus/><small>VNĐ</small></label>
        <label><span>Nội dung</span><input required maxLength={200} value={draft.description} onChange={(event)=>setDraft({...draft,description:event.target.value})} placeholder="Ví dụ: Mua túi zipper"/></label>
        <details><summary>Thêm thông tin để dễ tìm lại</summary><div className={styles.detailsGrid}>
          <label><span>Nhà cung cấp</span><input value={draft.vendor} onChange={(event)=>setDraft({...draft,vendor:event.target.value})} placeholder="Không bắt buộc"/></label>
          <label><span>Ngày phát sinh</span><input type="date" value={draft.incurredOn} onChange={(event)=>setDraft({...draft,incurredOn:event.target.value})}/></label>
          <label><span>Tình trạng tiền</span><select value={draft.paymentStatus} onChange={(event)=>setDraft({...draft,paymentStatus:event.target.value})}><option value="paid">Đã thanh toán</option><option value="committed">Đã cam kết</option><option value="planned">Dự kiến</option></select></label>
          <label><span>Nhóm tạm</span><select value={draft.suggestedEnvelopeCode} onChange={(event)=>setDraft({...draft,suggestedEnvelopeCode:event.target.value})}><option value="">Để phân loại sau</option>{envelopes.map((item)=><option key={item.code} value={item.code}>{item.name}</option>)}</select></label>
          <label className={styles.full}><span>Ghi chú</span><textarea value={draft.note} onChange={(event)=>setDraft({...draft,note:event.target.value})} placeholder="Số lượng, mục đích hoặc thông tin hóa đơn…"/></label>
        </div></details>
        <button disabled={saving||!draft.description.trim()||Number(draft.amount)<=0}>{saving?"Đang lưu…":"Lưu vào hộp chờ"}</button><footer><Clock3/>Có thể phân loại sau mà không mất dấu khoản chi.</footer>
      </form>

      <aside className={styles.summary}><article><Inbox/><span>Chờ phân loại</span><b>{unsorted.length}</b><small>{money(unsortedTotal)}</small></article><article><PackageOpen/><span>Đã vào sổ</span><b>{classified.length}</b><small>100 dòng gần nhất</small></article></aside>
    </section>

    <section className={styles.ledger}><header><div><p>Hộp chờ phân loại</p><h2>Sắp xếp khi đã rõ ngân sách.</h2></div><span>{unsorted.length} khoản</span></header>
      {loading?<div className={styles.loading}><i/><i/><i/></div>:unsorted.length?<div className={styles.rows}>{unsorted.map((item)=><article key={item.id}><div className={styles.date}><span>{shortDate(item.incurred_on)}</span><small>{statusLabel[item.payment_status]}</small></div><div className={styles.description}><b>{item.description}</b><small>{item.vendor||"Chưa ghi nhà cung cấp"}{item.suggested_envelope_code?` · gợi ý ${envelopeByCode[item.suggested_envelope_code]?.name||item.suggested_envelope_code}`:""}</small></div><strong>{money(item.amount)}</strong><button onClick={()=>setSorting(item)}><SlidersHorizontal/>Phân loại</button></article>)}</div>:<div className={styles.empty}><Check/><div><h3>Không còn khoản nào chờ.</h3><p>Mọi khoản đã được đưa vào sổ ngân sách.</p></div></div>}
    </section>

    {classified.length>0&&<section className={styles.history}><header><div><p>Đã sắp xếp gần đây</p><h2>Dấu vết vẫn còn nguyên.</h2></div></header><div>{classified.slice(0,12).map((item)=><article key={item.id}><Check/><span><b>{item.description}</b><small>{item.budget_allocations?.title||"Khoản ngân sách"} · {shortDate(item.incurred_on)}</small></span><strong>{money(item.amount)}</strong></article>)}</div></section>}
    <footer className={styles.footer}><span>Hoàng Long · Hộp khoản chi</span><p>Ghi nhanh không thay thế ngân sách. Nó giúp không khoản tiền nào bị quên trước khi được phân loại.</p></footer>
    {sorting&&<SortDialog expense={sorting} allocations={allocations} onClose={()=>setSorting(null)} onSort={classify} saving={saving}/>}
  </main>;
}

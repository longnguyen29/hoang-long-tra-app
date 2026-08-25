"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CalendarClock, Check, ChevronRight, Clipboard, FileText, Handshake, Plus, RefreshCw, Save, Search, Send, Target, X } from "lucide-react";
import { fromCatalogRow, fromVariantRow } from "@/lib/mappers";
import { dateInput, money, normalizeContact, QUOTE_STATUS, quoteMessage, shortDate, stageLabel, TRADE_STAGES } from "@/lib/trade-pipeline";
import styles from "./TradePipeline.module.css";

const newOpportunity = () => ({ business_name: "", contact: "", stage: "lead", owner: "", monthly_potential_kg: "", next_action: "Liên hệ và xác nhận nhu cầu", next_action_at: dateInput(1), notes: "" });
const blankQuoteLine = () => ({ id: crypto.randomUUID(), productKey: "", qty: 1, price: "" });
const newQuote = (opportunity) => ({ opportunity_id: opportunity.id, customer_name: opportunity.business_name, contact: opportunity.contact, address: "", valid_until: dateInput(14), discount_percent: 0, payment_method: "qr", terms: "Giá có hiệu lực trong thời hạn nêu trên. Thời gian giao hàng được xác nhận khi chốt đơn.", note: "", lines: [blankQuoteLine()] });

function flattenProducts(products) {
  return products.flatMap((product) => product.variants?.length
    ? product.variants.map((variant) => ({ key: `${product.id}__${variant.weight}`, productId: product.id, weight: variant.weight, name: product.name, price: variant.price || 0 }))
    : [{ key: product.id, productId: product.id, weight: null, name: product.name, price: product.price || 0 }]);
}

export default function TradePipeline({ supabase, email }) {
  const [opportunities, setOpportunities] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [products, setProducts] = useState([]);
  const [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState(null);
  const [quoteDraft, setQuoteDraft] = useState(null);
  const [query, setQuery] = useState("");
  const [showLost, setShowLost] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    const [o, q, p, v] = await Promise.all([
      supabase.from("trade_opportunities").select("*").order("updated_at", { ascending: false }),
      supabase.from("trade_quotes").select("*").order("created_at", { ascending: false }),
      supabase.from("catalog_products").select("*").eq("available", true).order("line"),
      supabase.from("catalog_variants").select("*"),
    ]);
    if (o.error || q.error) setError("Chưa tải được dữ liệu phát triển đối tác. Kiểm tra migration 0033.");
    if (!o.error) setOpportunities(o.data || []);
    if (!q.error) setQuotes(q.data || []);
    if (!p.error) {
      const byProduct = {};
      (v.data || []).forEach((row) => (byProduct[row.product_id] ||= []).push(fromVariantRow(row)));
      setProducts((p.data || []).map((row) => ({ ...fromCatalogRow(row), variants: byProduct[row.id] || [] })));
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => { load(); }, [load]);
  const flash = (message) => { setNotice(message); setTimeout(() => setNotice(""), 2200); };
  const today = dateInput();
  const searchable = useMemo(() => opportunities.filter((item) => `${item.business_name} ${item.contact} ${item.owner}`.toLowerCase().includes(query.toLowerCase())), [opportunities, query]);
  const overdue = opportunities.filter((item) => item.stage !== "lost" && item.next_action_at && item.next_action_at.slice(0, 10) < today);
  const dueToday = opportunities.filter((item) => item.stage !== "lost" && item.next_action_at?.slice(0, 10) === today);
  const openQuotes = quotes.filter((quote) => ["draft", "sent", "accepted"].includes(quote.status));
  const totalPotential = opportunities.filter((item) => item.stage !== "lost").reduce((sum, item) => sum + Number(item.monthly_potential_kg || 0), 0);
  const orderableProducts = useMemo(() => flattenProducts(products), [products]);

  const openOpportunity = (item) => { setSelected(item); setEditing(null); setQuoteDraft(null); };
  const saveOpportunity = async (event) => {
    event.preventDefault();
    if (!editing.business_name.trim() || !editing.contact.trim()) return;
    setSaving(true); setError("");
    const row = {
      ...editing,
      id: editing.id || `opp-${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 4)}`,
      contact_key: normalizeContact(editing.contact),
      business_name: editing.business_name.trim(),
      contact: editing.contact.trim(),
      monthly_potential_kg: Number(editing.monthly_potential_kg) || 0,
      next_action_at: editing.next_action_at ? new Date(`${editing.next_action_at.slice(0, 10)}T09:00:00+07:00`).toISOString() : null,
      owner: editing.owner?.trim() || email,
      source_type: editing.source_type || "manual",
      updated_at: new Date().toISOString(),
    };
    const { data, error: saveError } = await supabase.from("trade_opportunities").upsert(row).select().single();
    setSaving(false);
    if (saveError) { setError(saveError.code === "23505" ? "Liên hệ này đã có trong pipeline." : "Chưa lưu được cơ hội."); return; }
    setOpportunities((current) => [data, ...current.filter((item) => item.id !== data.id)]);
    setSelected(data); setEditing(null); flash("Đã lưu bước tiếp theo");
  };

  const moveStage = async (stage) => {
    if (!selected) return;
    const nextAction = stage === "sample_sent" ? "Hỏi phản hồi sau khi thử trà" : stage === "quoted" ? "Xác nhận khách đã nhận báo giá" : stage === "won" ? "Xác nhận và chuẩn bị đơn đầu tiên" : selected.next_action;
    const patch = { stage, next_action: nextAction, updated_at: new Date().toISOString() };
    const { data, error: updateError } = await supabase.from("trade_opportunities").update(patch).eq("id", selected.id).select().single();
    if (updateError) { setError("Chưa chuyển được giai đoạn."); return; }
    setSelected(data); setOpportunities((current) => current.map((item) => item.id === data.id ? data : item)); flash(`Đã chuyển sang ${stageLabel(stage)}`);
  };

  const saveQuote = async (event) => {
    event.preventDefault();
    const chosen = quoteDraft.lines.map((line) => {
      const product = orderableProducts.find((item) => item.key === line.productKey);
      return product ? { ...line, product } : null;
    }).filter(Boolean);
    if (!chosen.length || chosen.length !== quoteDraft.lines.length) return;
    setSaving(true); setError("");
    const lines = chosen.map(({ product, qty, price }) => ({ productId: product.productId, weight: product.weight, name: product.weight ? { vi: `${product.name.vi || product.name.en} (${product.weight})`, en: `${product.name.en || product.name.vi} (${product.weight})` } : product.name, qty: Number(qty) || 1, unit: "kg", price: Number(price) || product.price || null }));
    const subtotal = lines.reduce((sum, line) => sum + (line.price || 0) * line.qty, 0);
    const total = Math.round(subtotal * (1 - (Number(quoteDraft.discount_percent) || 0) / 100));
    const row = { ...quoteDraft, id: `quote-${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 4)}`, status: "draft", lines, subtotal, total, discount_percent: Number(quoteDraft.discount_percent) || 0, created_by: email };
    const { data, error: quoteError } = await supabase.from("trade_quotes").insert(row).select().single();
    if (quoteError) { setSaving(false); setError("Chưa lưu được báo giá."); return; }
    const { data: opportunity } = await supabase.from("trade_opportunities").update({ stage: "quoted", next_action: "Gửi báo giá và xác nhận khách đã nhận", next_action_at: new Date(`${today}T09:00:00+07:00`).toISOString(), updated_at: new Date().toISOString() }).eq("id", selected.id).select().single();
    setSaving(false); setQuotes((current) => [data, ...current]); setQuoteDraft(null);
    if (opportunity) { setSelected(opportunity); setOpportunities((current) => current.map((item) => item.id === opportunity.id ? opportunity : item)); }
    flash("Đã tạo bản nháp báo giá");
  };

  const setQuoteStatus = async (quote, status) => {
    const patch = { status, updated_at: new Date().toISOString() };
    if (status === "sent") patch.sent_at = new Date().toISOString();
    if (status === "accepted") patch.accepted_at = new Date().toISOString();
    const { data, error: updateError } = await supabase.from("trade_quotes").update(patch).eq("id", quote.id).select().single();
    if (updateError) { setError("Chưa cập nhật được báo giá."); return; }
    setQuotes((current) => current.map((item) => item.id === data.id ? data : item)); flash(`Báo giá: ${QUOTE_STATUS[status]}`);
    if (status === "accepted" && selected) {
      const opportunityPatch = { stage: "quoted", next_action: "Tạo đơn từ báo giá đã đồng ý", next_action_at: new Date().toISOString(), updated_at: new Date().toISOString() };
      const { data: opportunity } = await supabase.from("trade_opportunities").update(opportunityPatch).eq("id", selected.id).select().single();
      if (opportunity) { setSelected(opportunity); setOpportunities((current) => current.map((item) => item.id === opportunity.id ? opportunity : item)); }
    }
  };

  const convertQuote = async (quote) => {
    setSaving(true); setError("");
    const { data: orderId, error: convertError } = await supabase.rpc("convert_trade_quote_to_order", { p_quote_id: quote.id, p_actor: email });
    setSaving(false);
    if (convertError) { setError("Chưa chuyển được báo giá thành đơn."); return; }
    await load();
    const { data: refreshed } = await supabase.from("trade_opportunities").select("*").eq("id", quote.opportunity_id).maybeSingle();
    if (refreshed) setSelected(refreshed);
    flash(`Đã tạo đơn ${orderId}`);
  };

  const copyQuote = async (quote) => { await navigator.clipboard.writeText(quoteMessage(quote)); flash("Đã sao chép lời nhắn báo giá"); };
  const selectedQuotes = selected ? quotes.filter((quote) => quote.opportunity_id === selected.id) : [];

  return <main className={styles.page}>
    <header className={styles.top}><div><Link href="/admin"><ArrowLeft/>Điều phối</Link><span>Partner growth</span></div><div><span><b>{email}</b><small>Bàn phát triển đối tác</small></span><button onClick={load} disabled={loading} aria-label="Làm mới"><RefreshCw/></button></div></header>
    <section className={styles.hero}><div><p>Wholesale relationship desk</p><h1>Từ chén thử đến nhịp đặt đều.</h1><span>Mỗi mối quan hệ phải có một bước tiếp theo, một người giữ nhịp và một ngày quay lại.</span></div><button onClick={() => setEditing(newOpportunity())}><Plus/>Thêm cơ hội</button></section>
    {error && <p className={styles.error} role="alert">{error}</p>}{notice && <p className={styles.notice}><Check/>{notice}</p>}
    <section className={styles.summary}>
      <article data-urgent={overdue.length > 0}><CalendarClock/><span>Quá hạn</span><b>{overdue.length}</b><small>{dueToday.length} việc đến hạn hôm nay</small></article>
      <article><Target/><span>Tiềm năng tháng</span><b>{totalPotential} kg</b><small>{opportunities.filter((item) => item.stage !== "lost").length} mối quan hệ đang mở</small></article>
      <article><FileText/><span>Báo giá đang mở</span><b>{openQuotes.length}</b><small>{quotes.filter((item) => item.status === "accepted").length} đã đồng ý</small></article>
      <article><Handshake/><span>Đối tác định kỳ</span><b>{opportunities.filter((item) => item.stage === "active").length}</b><small>{opportunities.filter((item) => item.stage === "won").length} đang ở đơn đầu</small></article>
    </section>
    <section className={styles.tools}><label><Search/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm doanh nghiệp, liên hệ, người phụ trách"/></label><button data-active={showLost} onClick={() => setShowLost(!showLost)}>Tạm dừng · {opportunities.filter((item) => item.stage === "lost").length}</button></section>
    <section className={styles.stageRail} aria-label="Hành trình đối tác">{TRADE_STAGES.map((stage, index) => <div key={stage.id}><span>{String(index + 1).padStart(2, "0")}</span><b>{stage.label}</b><small>{searchable.filter((item) => item.stage === stage.id).length}</small></div>)}</section>
    <section className={styles.board}>
      {TRADE_STAGES.map((stage) => <section className={styles.column} key={stage.id}><header><b>{stage.short}</b><span>{searchable.filter((item) => item.stage === stage.id).length}</span></header><div>{searchable.filter((item) => item.stage === stage.id).map((item) => {
        const isOverdue = item.next_action_at && item.next_action_at.slice(0, 10) < today;
        return <button key={item.id} onClick={() => openOpportunity(item)} data-overdue={isOverdue}><span className={styles.source}>{item.source_type}</span><h3>{item.business_name}</h3><p>{item.next_action || "Chưa có bước tiếp theo"}</p><footer><span>{item.monthly_potential_kg ? `${item.monthly_potential_kg} kg/tháng` : item.contact}</span><time>{shortDate(item.next_action_at)}</time></footer></button>;
      })}<button className={styles.addCard} onClick={() => setEditing({ ...newOpportunity(), stage: stage.id })}><Plus/>Thêm tại đây</button></div></section>)}
    </section>
    {showLost && <section className={styles.lost}><header><h2>Cơ hội đang tạm dừng</h2><span>Giữ lại lịch sử; đưa về pipeline khi thời điểm phù hợp.</span></header>{searchable.filter((item) => item.stage === "lost").map((item) => <button key={item.id} onClick={() => openOpportunity(item)}><span><b>{item.business_name}</b><small>{item.lost_reason || "Chưa ghi lý do"}</small></span><ChevronRight/></button>)}</section>}

    {selected && <div className={styles.overlay} onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }}><aside className={styles.drawer} aria-label="Chi tiết cơ hội" role="dialog" aria-modal="true">
      <header><div><p>{stageLabel(selected.stage)}</p><h2>{selected.business_name}</h2><span>{selected.contact}</span></div><button onClick={() => setSelected(null)} aria-label="Đóng"><X/></button></header>
      <section className={styles.next}><span>Bước tiếp theo</span><h3>{selected.next_action || "Chưa đặt bước tiếp theo"}</h3><time>{shortDate(selected.next_action_at)}</time><button onClick={() => setEditing({ ...selected, next_action_at: selected.next_action_at?.slice(0, 10) || "" })}>Sửa nhịp làm việc</button></section>
      <section className={styles.progress}><header><h3>Chuyển giai đoạn</h3><span>{selected.monthly_potential_kg || 0} kg/tháng</span></header><div>{TRADE_STAGES.map((stage) => <button key={stage.id} data-active={selected.stage === stage.id} onClick={() => moveStage(stage.id)}>{stage.short}</button>)}<button data-lost onClick={() => moveStage("lost")}>Tạm dừng</button></div></section>
      <section className={styles.quoteBook}><header><div><p>Quote book</p><h3>Báo giá</h3></div><button onClick={() => setQuoteDraft(newQuote(selected))}><Plus/>Tạo báo giá</button></header>{selectedQuotes.length ? selectedQuotes.map((quote) => <article key={quote.id}><header><span><b>{quote.id}</b><small>{shortDate(quote.created_at)} · hiệu lực {shortDate(quote.valid_until)}</small></span><i data-status={quote.status}>{QUOTE_STATUS[quote.status]}</i></header><div>{quote.lines.map((line, index) => <span key={index}>{line.name?.vi || line.name?.en} · {line.qty} {line.unit}</span>)}</div><footer><b>{money(quote.total)}</b><div><button onClick={() => copyQuote(quote)}><Clipboard/>Sao chép</button>{quote.status === "draft" && <button onClick={() => setQuoteStatus(quote, "sent")}><Send/>Đã gửi</button>}{quote.status === "sent" && <button onClick={() => setQuoteStatus(quote, "accepted")}><Check/>Đồng ý</button>}{quote.status === "accepted" && <button className={styles.convert} onClick={() => convertQuote(quote)} disabled={saving}>Tạo đơn<ArrowRight/></button>}{quote.converted_order_id && <Link href="/admin">{quote.converted_order_id}<ArrowRight/></Link>}</div></footer></article>) : <div className={styles.emptyQuote}><FileText/><p>Chưa có báo giá. Tạo bản đầu tiên từ danh mục đang bán.</p></div>}</section>
      {selected.notes && <section className={styles.notes}><h3>Ghi chú quan hệ</h3><p>{selected.notes}</p></section>}
    </aside></div>}

    {editing && <div className={styles.overlay}><form className={styles.editDrawer} onSubmit={saveOpportunity}><header><div><p>Relationship record</p><h2>{editing.id ? "Sửa nhịp đối tác" : "Cơ hội mới"}</h2></div><button type="button" onClick={() => setEditing(null)} aria-label="Đóng"><X/></button></header><label>Tên doanh nghiệp<input autoFocus required value={editing.business_name} onChange={(event) => setEditing({ ...editing, business_name: event.target.value })}/></label><label>Điện thoại / liên hệ<input required value={editing.contact} onChange={(event) => setEditing({ ...editing, contact: event.target.value })}/></label><div className={styles.formGrid}><label>Giai đoạn<select value={editing.stage} onChange={(event) => setEditing({ ...editing, stage: event.target.value })}>{TRADE_STAGES.map((stage) => <option key={stage.id} value={stage.id}>{stage.label}</option>)}<option value="lost">Tạm dừng</option></select></label><label>Tiềm năng kg/tháng<input type="number" min="0" value={editing.monthly_potential_kg} onChange={(event) => setEditing({ ...editing, monthly_potential_kg: event.target.value })}/></label></div><label>Người phụ trách<input value={editing.owner || ""} onChange={(event) => setEditing({ ...editing, owner: event.target.value })} placeholder={email}/></label><label>Bước tiếp theo<input value={editing.next_action || ""} onChange={(event) => setEditing({ ...editing, next_action: event.target.value })}/></label><label>Ngày quay lại<input type="date" value={editing.next_action_at || ""} onChange={(event) => setEditing({ ...editing, next_action_at: event.target.value })}/></label>{editing.stage === "lost" && <label>Lý do tạm dừng<input value={editing.lost_reason || ""} onChange={(event) => setEditing({ ...editing, lost_reason: event.target.value })} placeholder="Chưa đúng thời điểm, ngân sách, không phản hồi…"/></label>}<label>Ghi chú<textarea rows="5" value={editing.notes || ""} onChange={(event) => setEditing({ ...editing, notes: event.target.value })}/></label><button className={styles.primary} disabled={saving}><Save/>{saving ? "Đang lưu…" : "Lưu cơ hội"}</button></form></div>}

    {quoteDraft && <div className={styles.overlay}><form className={`${styles.editDrawer} ${styles.quoteDrawer}`} onSubmit={saveQuote}><header><div><p>Wholesale quotation</p><h2>Báo giá mới</h2></div><button type="button" onClick={() => setQuoteDraft(null)} aria-label="Đóng"><X/></button></header><div className={styles.formGrid}><label>Khách hàng<input value={quoteDraft.customer_name} onChange={(event) => setQuoteDraft({ ...quoteDraft, customer_name: event.target.value })}/></label><label>Hiệu lực đến<input type="date" min={today} value={quoteDraft.valid_until} onChange={(event) => setQuoteDraft({ ...quoteDraft, valid_until: event.target.value })}/></label></div><label>Địa chỉ<input value={quoteDraft.address} onChange={(event) => setQuoteDraft({ ...quoteDraft, address: event.target.value })}/></label><section className={styles.quoteLines}><header><h3>Sản phẩm</h3><button type="button" onClick={() => setQuoteDraft({ ...quoteDraft, lines: [...quoteDraft.lines, blankQuoteLine()] })}><Plus/>Thêm dòng</button></header>{quoteDraft.lines.map((line, index) => <div key={line.id}><span>{index + 1}</span><select required value={line.productKey} onChange={(event) => { const product = orderableProducts.find((item) => item.key === event.target.value); setQuoteDraft({ ...quoteDraft, lines: quoteDraft.lines.map((item) => item.id === line.id ? { ...item, productKey: event.target.value, price: product?.price || "" } : item) }); }}><option value="">Chọn trà / quy cách</option>{orderableProducts.map((product) => <option key={product.key} value={product.key}>{product.name.vi || product.name.en}{product.weight ? ` · ${product.weight}` : ""}</option>)}</select><input aria-label="Số lượng" type="number" min="1" value={line.qty} onChange={(event) => setQuoteDraft({ ...quoteDraft, lines: quoteDraft.lines.map((item) => item.id === line.id ? { ...item, qty: event.target.value } : item) })}/><input aria-label="Đơn giá" type="number" min="0" placeholder="Đơn giá/kg" value={line.price} onChange={(event) => setQuoteDraft({ ...quoteDraft, lines: quoteDraft.lines.map((item) => item.id === line.id ? { ...item, price: event.target.value } : item) })}/><button type="button" disabled={quoteDraft.lines.length === 1} onClick={() => setQuoteDraft({ ...quoteDraft, lines: quoteDraft.lines.filter((item) => item.id !== line.id) })}>−</button></div>)}</section><div className={styles.formGrid}><label>Chiết khấu %<input type="number" min="0" max="100" value={quoteDraft.discount_percent} onChange={(event) => setQuoteDraft({ ...quoteDraft, discount_percent: event.target.value })}/></label><label>Thanh toán<select value={quoteDraft.payment_method} onChange={(event) => setQuoteDraft({ ...quoteDraft, payment_method: event.target.value })}><option value="qr">Chuyển khoản QR</option><option value="cash">Tiền mặt</option></select></label></div><label>Điều khoản<textarea rows="3" value={quoteDraft.terms} onChange={(event) => setQuoteDraft({ ...quoteDraft, terms: event.target.value })}/></label><label>Ghi chú nội bộ<textarea rows="2" value={quoteDraft.note} onChange={(event) => setQuoteDraft({ ...quoteDraft, note: event.target.value })}/></label><div className={styles.quoteTotal}><span>Tổng dự kiến</span><b>{money(Math.round(quoteDraft.lines.reduce((sum, line) => sum + (Number(line.price) || 0) * (Number(line.qty) || 0), 0) * (1 - (Number(quoteDraft.discount_percent) || 0) / 100)))}</b></div><button className={styles.primary} disabled={saving}><Save/>{saving ? "Đang lưu…" : "Lưu bản nháp"}</button></form></div>}
  </main>;
}

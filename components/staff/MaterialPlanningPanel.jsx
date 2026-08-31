"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Boxes, CheckCircle2, ClipboardList, PackagePlus, PencilLine, Plus, RefreshCw, Save, X } from "lucide-react";
import { bomCoverage, buildPurchasePlan } from "@/lib/material-planning";
import FormattedNumberInput from "@/components/FormattedNumberInput";
import styles from "./MaterialPlanningPanel.module.css";

const money = (value) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(Number(value || 0));
const quantity = (value) => Number(value || 0).toLocaleString("vi-VN", { maximumFractionDigits: 3 });
const itemDraft = () => ({ id: "", code: "", name: "", category: "packaging", unit: "unit", stock_on_hand: 0, reorder_point: 0, target_stock: 0, lead_time_days: 0, unit_cost: 0, supplier_name: "", supplier_contact: "", note: "", active: true });
const bomDraft = (coverage = null, supplyItem = "") => ({ id: "", product_id: coverage?.product_id || "", variant_weight: coverage?.variant_weight || "", supply_item_id: supplyItem, quantity_per_sale: 1, waste_percent: 0, note: "" });
const CATEGORY = { tea: "Trà", packaging: "Bao bì", label: "Nhãn", production: "Gia công", labor: "Nhân công", other: "Khác" };
const UNIT = { kg: "kg", g: "g", unit: "cái", roll: "cuộn", box: "thùng" };
const editableMaterial = (item) => ({
  id: item.id,
  code: item.code,
  name: item.name,
  category: item.category,
  unit: item.unit,
  stock_on_hand: item.stock_on_hand,
  reorder_point: item.reorder_point,
  target_stock: item.target_stock,
  lead_time_days: item.lead_time_days,
  unit_cost: item.unit_cost,
  supplier_name: item.supplier_name || "",
  supplier_contact: item.supplier_contact || "",
  note: item.note || "",
  active: item.active,
});

export default function MaterialPlanningPanel({ supabase, orders, products, variants, role }) {
  const [items, setItems] = useState([]);
  const [bom, setBom] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [material, setMaterial] = useState(null);
  const [component, setComponent] = useState(null);
  const canManage = role === "admin" || role === "manager";

  const load = useCallback(async () => {
    setLoading(true); setError("");
    const [itemResult, bomResult] = await Promise.all([
      supabase.from("supply_items").select("*").order("active", { ascending: false }).order("category").order("name"),
      supabase.from("product_bom_components").select("*").order("product_id").order("variant_weight"),
    ]);
    if (itemResult.error || bomResult.error) setError("Chưa tải được vật tư và định mức. Cần áp dụng migration 0052.");
    if (!itemResult.error) setItems(itemResult.data || []);
    if (!bomResult.error) setBom(bomResult.data || []);
    setLoading(false);
  }, [supabase]);
  useEffect(() => { load(); }, [load]);

  const plan = useMemo(() => buildPurchasePlan({ items: items.filter((item) => item.active), bom, orders }), [items, bom, orders]);
  const coverage = useMemo(() => bomCoverage(products, variants, bom), [products, variants, bom]);
  const itemMap = useMemo(() => Object.fromEntries(items.map((item) => [item.id, item])), [items]);
  const purchaseRows = plan.filter((item) => item.status !== "enough");
  const uncovered = coverage.filter((row) => !row.components.length);
  const purchaseTotal = purchaseRows.reduce((sum, item) => sum + item.suggestedCost, 0);

  const saveMaterial = async (event) => {
    event.preventDefault();
    if (!canManage || !material.code.trim() || !material.name.trim()) return;
    setSaving(true); setError("");
    const row = {
      code: material.code.trim().toUpperCase(),
      name: material.name.trim(),
      category: material.category,
      unit: material.unit,
      stock_on_hand: Number(material.stock_on_hand) || 0,
      reorder_point: Number(material.reorder_point) || 0,
      target_stock: Math.max(Number(material.target_stock) || 0, Number(material.reorder_point) || 0),
      lead_time_days: Number(material.lead_time_days) || 0,
      unit_cost: Number(material.unit_cost) || 0,
      supplier_name: material.supplier_name.trim(),
      supplier_contact: material.supplier_contact.trim(),
      note: material.note.trim(),
      active: material.active,
      updated_at: new Date().toISOString(),
    };
    const query = material.id
      ? supabase.from("supply_items").update(row).eq("id", material.id)
      : supabase.from("supply_items").insert(row);
    const { error: saveError } = await query;
    setSaving(false);
    if (saveError) { setError(saveError.code === "42501" ? "Tài khoản cần quyền quản lý để sửa vật tư." : "Chưa lưu được vật tư. Kiểm tra mã không bị trùng."); return; }
    setMaterial(null); await load();
  };

  const saveComponent = async (event) => {
    event.preventDefault();
    if (!canManage || !component.product_id || !component.supply_item_id) return;
    setSaving(true); setError("");
    const row = {
      product_id: component.product_id,
      variant_weight: component.variant_weight || "",
      supply_item_id: component.supply_item_id,
      quantity_per_sale: Number(component.quantity_per_sale),
      waste_percent: Number(component.waste_percent) || 0,
      note: component.note.trim(),
      updated_at: new Date().toISOString(),
    };
    const query = component.id
      ? supabase.from("product_bom_components").update(row).eq("id", component.id)
      : supabase.from("product_bom_components").insert(row);
    const { error: saveError } = await query;
    setSaving(false);
    if (saveError) { setError(saveError.code === "42501" ? "Tài khoản cần quyền quản lý để sửa định mức." : "Chưa lưu được định mức. Số lượng phải lớn hơn 0."); return; }
    setComponent(null); await load();
  };

  if (loading) return <section className={styles.loading}><RefreshCw/><p>Đang tính nhu cầu vật tư từ các đơn mở…</p></section>;

  return <section className={styles.workspace}>
    {error && <p className={styles.error} role="alert"><AlertTriangle/>{error}<button onClick={() => setError("")} aria-label="Đóng">×</button></p>}
    <header className={styles.intro}>
      <div><p>Kiểm soát vật tư</p><h2>Biết cần mua gì trước khi đơn bị kẹt.</h2><span>Mỗi định mức nối một quy cách bán với trà, túi, nhãn hoặc công đoạn thật. Đơn mở tự tạo chi phí ước tính và trừ vào tồn dự kiến.</span></div>
      {canManage && <button onClick={() => setMaterial(itemDraft())}><Plus/>Thêm vật tư</button>}
    </header>

    <section className={styles.summary} aria-label="Tình trạng vật tư">
      <article data-alert={purchaseRows.some((item) => item.status === "short")}><PackagePlus/><span>Cần đặt mua</span><b>{purchaseRows.length}</b><small>{money(purchaseTotal)} dự kiến</small></article>
      <article><Boxes/><span>Vật tư đang dùng</span><b>{items.filter((item) => item.active).length}</b><small>{items.filter((item) => !item.active).length} đã ngừng</small></article>
      <article data-alert={uncovered.length > 0}><ClipboardList/><span>Thiếu định mức</span><b>{uncovered.length}</b><small>quy cách chưa tự tính giá vốn</small></article>
    </section>

    <div className={styles.grid}>
      <section className={styles.purchase}>
        <header><div><p>Hàng chờ mua</p><h3>Danh sách cần mua</h3></div><span>{purchaseRows.length} dòng</span></header>
        {purchaseRows.length ? <div>{purchaseRows.map((item) => <article key={item.id} data-status={item.status}>
          <span><b>{item.name}</b><small>{item.supplier_name || "Chưa ghi nhà cung cấp"} · chờ {item.lead_time_days} ngày</small></span>
          <dl><div><dt>Đơn đang cần</dt><dd>{quantity(item.required)} {UNIT[item.unit]}</dd></div><div><dt>Sau khi giữ</dt><dd>{quantity(item.projected)} {UNIT[item.unit]}</dd></div><div><dt>Đề xuất mua</dt><dd>{quantity(item.suggested)} {UNIT[item.unit]}</dd></div></dl>
          <strong>{money(item.suggestedCost)}</strong>
          {canManage && <button onClick={() => setMaterial(editableMaterial(item))}><PencilLine/>Cập nhật tồn</button>}
        </article>)}</div> : <div className={styles.clear}><CheckCircle2/><span><b>Chưa cần đặt thêm vật tư.</b><small>Tồn dự kiến vẫn cao hơn ngưỡng đặt lại đã đặt.</small></span></div>}
      </section>

      <section className={styles.materials}>
        <header><div><p>Danh mục vật tư</p><h3>Sổ vật tư</h3></div><button onClick={load} aria-label="Làm mới"><RefreshCw/></button></header>
        <div>{plan.map((item) => <article key={item.id} data-status={item.status}>
          <span><i>{item.code}</i><b>{item.name}</b><small>{CATEGORY[item.category]} · {item.supplier_name || "chưa có nhà cung cấp"}</small></span>
          <div><small>Tồn</small><b>{quantity(item.stock_on_hand)} {UNIT[item.unit]}</b></div>
          <div><small>Giá</small><b>{money(item.unit_cost)}</b></div>
          {canManage && <button onClick={() => setMaterial(editableMaterial(item))} aria-label={`Sửa ${item.name}`}><PencilLine/></button>}
        </article>)}</div>
      </section>
    </div>

    <section className={styles.bom}>
      <header><div><p>Cấu phần sản phẩm</p><h3>Định mức theo quy cách bán</h3></div><span>{coverage.length - uncovered.length}/{coverage.length} đã có định mức</span></header>
      <div>{coverage.map((row) => <article key={`${row.product_id}|${row.variant_weight}`} data-missing={!row.components.length}>
        <header><span><b>{row.name?.vi || row.name?.en || row.product_id}</b><small>{row.variant_weight || "Quy cách chính"}</small></span>{canManage && <button onClick={() => setComponent(bomDraft(row, items.find((item) => item.active)?.id || ""))}><Plus/>Thêm dòng</button>}</header>
        {row.components.length ? <div>{row.components.map((entry) => <button key={entry.id} disabled={!canManage} onClick={() => setComponent({ ...entry })}><span><b>{itemMap[entry.supply_item_id]?.name || entry.supply_item_id}</b><small>{quantity(entry.quantity_per_sale)} {UNIT[itemMap[entry.supply_item_id]?.unit] || "đơn vị"} / 1 đơn vị bán{Number(entry.waste_percent) ? ` · hao hụt ${entry.waste_percent}%` : ""}</small></span>{canManage && <PencilLine/>}</button>)}</div> : <p>Chưa có định mức; đơn chứa quy cách này chưa tự tính đủ giá vốn.</p>}
      </article>)}</div>
    </section>

    {material && <div className={styles.overlay}><form className={styles.drawer} onSubmit={saveMaterial}>
      <header><div><p>Hồ sơ vật tư</p><h2>{material.id ? "Cập nhật vật tư" : "Vật tư mới"}</h2></div><button type="button" onClick={() => setMaterial(null)} aria-label="Đóng"><X/></button></header>
      <div className={styles.formGrid}><label>Mã vật tư<input required value={material.code} onChange={(event) => setMaterial({ ...material, code: event.target.value })} placeholder="ZIP-500"/></label><label>Tên vật tư<input required value={material.name} onChange={(event) => setMaterial({ ...material, name: event.target.value })} placeholder="Túi zipper 500 g"/></label><label>Loại<select value={material.category} onChange={(event) => setMaterial({ ...material, category: event.target.value })}>{Object.entries(CATEGORY).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label><label>Đơn vị<select value={material.unit} onChange={(event) => setMaterial({ ...material, unit: event.target.value })}>{Object.entries(UNIT).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label><label>Tồn thực tế<FormattedNumberInput min="0" step="0.001" value={material.stock_on_hand} onChange={(event) => setMaterial({ ...material, stock_on_hand: event.target.value })}/></label><label>Đơn giá<FormattedNumberInput min="0" step="100" value={material.unit_cost} onChange={(event) => setMaterial({ ...material, unit_cost: event.target.value })}/></label><label>Ngưỡng đặt lại<FormattedNumberInput min="0" step="0.001" value={material.reorder_point} onChange={(event) => setMaterial({ ...material, reorder_point: event.target.value })}/></label><label>Tồn mục tiêu<FormattedNumberInput min="0" step="0.001" value={material.target_stock} onChange={(event) => setMaterial({ ...material, target_stock: event.target.value })}/></label><label>Thời gian chờ (ngày)<FormattedNumberInput min="0" max="365" value={material.lead_time_days} onChange={(event) => setMaterial({ ...material, lead_time_days: event.target.value })}/></label><label>Nhà cung cấp<input value={material.supplier_name} onChange={(event) => setMaterial({ ...material, supplier_name: event.target.value })}/></label><label className={styles.wide}>Liên hệ nhà cung cấp<input value={material.supplier_contact} onChange={(event) => setMaterial({ ...material, supplier_contact: event.target.value })}/></label><label className={styles.wide}>Ghi chú<textarea rows="3" value={material.note} onChange={(event) => setMaterial({ ...material, note: event.target.value })}/></label></div>
      <button className={styles.save} disabled={saving}><Save/>{saving ? "Đang lưu…" : "Lưu vật tư"}</button>
    </form></div>}

    {component && <div className={styles.overlay}><form className={styles.drawer} onSubmit={saveComponent}>
      <header><div><p>Cấu phần sản phẩm</p><h2>Định mức vật tư</h2></div><button type="button" onClick={() => setComponent(null)} aria-label="Đóng"><X/></button></header>
      <div className={styles.formGrid}><label>Sản phẩm<select value={`${component.product_id}|${component.variant_weight || ""}`} onChange={(event) => { const [product_id, variant_weight] = event.target.value.split("|"); setComponent({ ...component, product_id, variant_weight }); }}>{coverage.map((row) => <option key={`${row.product_id}|${row.variant_weight}`} value={`${row.product_id}|${row.variant_weight}`}>{row.name?.vi || row.name?.en} · {row.variant_weight || "Quy cách chính"}</option>)}</select></label><label>Vật tư<select value={component.supply_item_id} onChange={(event) => setComponent({ ...component, supply_item_id: event.target.value })}>{items.filter((item) => item.active).map((item) => <option key={item.id} value={item.id}>{item.name} · {UNIT[item.unit]}</option>)}</select></label><label>Số lượng / 1 đơn vị bán<FormattedNumberInput required min="0.0001" step="0.0001" value={component.quantity_per_sale} onChange={(event) => setComponent({ ...component, quantity_per_sale: event.target.value })}/></label><label>Hao hụt %<FormattedNumberInput min="0" max="100" step="0.1" value={component.waste_percent} onChange={(event) => setComponent({ ...component, waste_percent: event.target.value })}/></label><label className={styles.wide}>Ghi chú<input value={component.note} onChange={(event) => setComponent({ ...component, note: event.target.value })} placeholder="Ví dụ: gồm túi chính, chưa gồm túi vận chuyển"/></label></div>
      <button className={styles.save} disabled={saving || !component.supply_item_id}><Save/>{saving ? "Đang lưu…" : "Lưu định mức"}</button>
    </form></div>}
  </section>;
}

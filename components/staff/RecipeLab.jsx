"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Beaker,
  Check,
  ChevronRight,
  CircleDollarSign,
  Droplets,
  Handshake,
  PencilLine,
  Plus,
  RefreshCw,
  Save,
  Search,
  Target,
  Thermometer,
  Timer,
  X,
} from "lucide-react";
import FormattedNumberInput from "@/components/FormattedNumberInput";
import {
  newIngredient,
  recipeEconomics,
  RECIPE_STATUSES,
  sensoryAverage,
  SENSORY_FIELDS,
  uid,
  versionSeed,
} from "@/lib/recipe-lab";
import styles from "./RecipeLab.module.css";

const money = (value) => value === null || value === undefined || value === ""
  ? "—"
  : `${Math.round(Number(value) || 0).toLocaleString("vi-VN")}đ`;
const shortDate = (value) => value ? new Intl.DateTimeFormat("vi-VN").format(new Date(`${String(value).slice(0, 10)}T00:00:00`)) : "—";
const localName = (item) => item?.name?.vi || item?.name?.en || "Chưa chọn trà";
const statusLabel = (status) => RECIPE_STATUSES.find((item) => item.id === status)?.label || status;
const resultLabel = (result) => ({ pass: "Đạt", retest: "Thử lại", fail: "Không đạt" })[result] || "Thử lại";

const blankRecipe = (opportunityId = "") => ({
  id: "",
  name: "",
  purpose: "",
  status: "draft",
  opportunity_id: opportunityId,
  sample_request_id: "",
  product_id: "",
  batch_id: "",
  source_type: opportunityId ? "customer" : "manual",
  source_reference: "",
  source_url: "",
  target_serving_ml: 500,
  target_cost_per_serving: "",
  target_sell_price: "",
  notes: "",
});

export default function RecipeLab({ supabase, email }) {
  const [recipes, setRecipes] = useState([]);
  const [versions, setVersions] = useState([]);
  const [products, setProducts] = useState([]);
  const [batches, setBatches] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [samples, setSamples] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [activeVersionId, setActiveVersionId] = useState("");
  const [recipeDraft, setRecipeDraft] = useState(null);
  const [versionDraft, setVersionDraft] = useState(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const flash = (message) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2200);
  };

  const load = useCallback(async ({ preserveSelection = true, preferredId = "" } = {}) => {
    setLoading(true);
    setError("");
    const [recipeResult, versionResult, productResult, batchResult, opportunityResult, sampleResult] = await Promise.all([
      supabase.from("recipes").select("*").order("updated_at", { ascending: false }),
      supabase.from("recipe_versions").select("*").order("version_number", { ascending: false }),
      supabase.from("catalog_products").select("id,name,kind,available,price").eq("kind", "tea").order("sort_order"),
      supabase.from("tea_batches").select("id,code,product_id,cost_per_kg,status,available_kg").order("created_at", { ascending: false }),
      supabase.from("trade_opportunities").select("id,business_name,contact,stage").neq("stage", "lost").order("updated_at", { ascending: false }),
      supabase.from("sample_requests").select("id,store_name,phone,status").order("ts", { ascending: false }).limit(100),
    ]);
    if (recipeResult.error || versionResult.error) {
      setError("Chưa mở được dữ liệu công thức. Cần áp dụng migration 0049_recipe_lab.sql.");
      setLoading(false);
      return;
    }
    const nextRecipes = recipeResult.data || [];
    const nextVersions = versionResult.data || [];
    setRecipes(nextRecipes);
    setVersions(nextVersions);
    if (!productResult.error) setProducts(productResult.data || []);
    if (!batchResult.error) setBatches(batchResult.data || []);
    if (!opportunityResult.error) setOpportunities(opportunityResult.data || []);
    if (!sampleResult.error) setSamples(sampleResult.data || []);

    const opportunityId = new URLSearchParams(window.location.search).get("opportunity") || "";
    const connected = opportunityId ? nextRecipes.find((item) => item.opportunity_id === opportunityId) : null;
    const currentId = preferredId && nextRecipes.some((item) => item.id === preferredId)
      ? preferredId
      : preserveSelection && selectedId && nextRecipes.some((item) => item.id === selectedId)
        ? selectedId
        : connected?.id || nextRecipes[0]?.id || "";
    setSelectedId(currentId);
    const currentRecipe = nextRecipes.find((item) => item.id === currentId);
    const currentVersions = nextVersions.filter((item) => item.recipe_id === currentId);
    setActiveVersionId(currentRecipe?.approved_version_id || currentVersions[0]?.id || "");
    if (opportunityId && !connected && !preserveSelection) setRecipeDraft(blankRecipe(opportunityId));
    setLoading(false);
  }, [selectedId, supabase]);

  useEffect(() => { load({ preserveSelection: false }); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const selected = recipes.find((item) => item.id === selectedId) || null;
  const selectedVersions = versions.filter((item) => item.recipe_id === selectedId).sort((a, b) => b.version_number - a.version_number);
  const activeVersion = selectedVersions.find((item) => item.id === activeVersionId) || selectedVersions[0] || null;
  const productMap = useMemo(() => Object.fromEntries(products.map((item) => [item.id, item])), [products]);
  const batchMap = useMemo(() => Object.fromEntries(batches.map((item) => [item.id, item])), [batches]);
  const opportunityMap = useMemo(() => Object.fromEntries(opportunities.map((item) => [item.id, item])), [opportunities]);
  const sampleMap = useMemo(() => Object.fromEntries(samples.map((item) => [item.id, item])), [samples]);

  const filteredRecipes = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("vi");
    return recipes.filter((recipe) => {
      if (statusFilter === "active" && recipe.status === "archived") return false;
      if (statusFilter !== "active" && statusFilter !== "all" && recipe.status !== statusFilter) return false;
      const partner = opportunityMap[recipe.opportunity_id]?.business_name || "";
      return !needle || `${recipe.name} ${recipe.purpose} ${partner} ${localName(productMap[recipe.product_id])}`.toLocaleLowerCase("vi").includes(needle);
    });
  }, [opportunityMap, productMap, query, recipes, statusFilter]);

  const selectRecipe = (recipe) => {
    setSelectedId(recipe.id);
    const recipeVersions = versions.filter((item) => item.recipe_id === recipe.id).sort((a, b) => b.version_number - a.version_number);
    setActiveVersionId(recipe.approved_version_id || recipeVersions[0]?.id || "");
  };

  const saveRecipe = async (event) => {
    event.preventDefault();
    if (!recipeDraft?.name.trim()) return;
    setSaving(true);
    const row = {
      ...recipeDraft,
      id: recipeDraft.id || uid("recipe"),
      name: recipeDraft.name.trim(),
      purpose: recipeDraft.purpose.trim(),
      opportunity_id: recipeDraft.opportunity_id || null,
      sample_request_id: recipeDraft.sample_request_id || null,
      product_id: recipeDraft.product_id || null,
      batch_id: recipeDraft.batch_id || null,
      target_serving_ml: Number(recipeDraft.target_serving_ml) || null,
      target_cost_per_serving: recipeDraft.target_cost_per_serving === "" ? null : Number(recipeDraft.target_cost_per_serving),
      target_sell_price: recipeDraft.target_sell_price === "" ? null : Number(recipeDraft.target_sell_price),
      created_by: recipeDraft.created_by || email,
      updated_at: new Date().toISOString(),
    };
    const { error: saveError } = await supabase.from("recipes").upsert(row);
    setSaving(false);
    if (saveError) { setError("Chưa lưu được hồ sơ công thức."); return; }
    setSelectedId(row.id);
    setRecipeDraft(null);
    await load({ preferredId: row.id });
    flash(recipeDraft.id ? "Đã cập nhật công thức" : "Đã tạo công thức");
  };

  const openVersion = () => {
    if (!selected) return;
    const latest = selectedVersions[0] || null;
    const selectedBatch = batchMap[latest?.batch_id || selected.batch_id];
    setVersionDraft(versionSeed(selected, latest, selectedBatch));
  };

  const updateVersion = (key, value) => setVersionDraft((current) => ({ ...current, [key]: value }));
  const updateIngredient = (id, key, value) => updateVersion("ingredients", versionDraft.ingredients.map((item) => item.id === id ? { ...item, [key]: value } : item));
  const chooseBatch = (batchId) => {
    const batch = batchMap[batchId];
    setVersionDraft((current) => ({
      ...current,
      batch_id: batchId,
      product_id: batch?.product_id || current.product_id,
      tea_cost_per_kg: batch?.cost_per_kg ?? current.tea_cost_per_kg,
    }));
  };

  const versionEconomics = versionDraft ? recipeEconomics({
    teaDoseG: versionDraft.tea_dose_g,
    teaCostPerKg: versionDraft.tea_cost_per_kg,
    ingredients: versionDraft.ingredients,
    sellPrice: selected?.target_sell_price,
  }) : null;

  const saveVersion = async (event) => {
    event.preventDefault();
    setSaving(true);
    const cleanIngredients = versionDraft.ingredients
      .filter((item) => item.name.trim() || Number(item.cost) > 0)
      .map(({ id, ...item }) => ({ ...item, amount: Number(item.amount) || 0, cost: Number(item.cost) || 0 }));
    const average = sensoryAverage(versionDraft.sensory);
    const payload = {
      ...versionDraft,
      ingredients: cleanIngredients,
      steps: Array.isArray(versionDraft.steps) ? versionDraft.steps.filter(Boolean) : [],
      cost_per_serving: versionEconomics.cost,
      sensory_average: average,
    };
    const { data, error: saveError } = await supabase.rpc("create_recipe_version", {
      p_recipe_id: selected.id,
      p_payload: payload,
      p_actor: email,
    });
    setSaving(false);
    if (saveError) { setError("Chưa lưu được lần thử. Kiểm tra các con số và thử lại."); return; }
    setVersionDraft(null);
    setActiveVersionId(data?.id || "");
    await load({ preferredId: selected.id });
    flash("Đã lưu một phiên bản mới");
  };

  const approveVersion = async (version) => {
    setSaving(true);
    const { error: approveError } = await supabase.rpc("approve_recipe_version", {
      p_recipe_id: selected.id,
      p_version_id: version.id,
      p_actor: email,
    });
    setSaving(false);
    if (approveError) { setError("Chưa chốt được phiên bản này."); return; }
    await load({ preferredId: selected.id });
    flash(`Đã chốt V${version.version_number} làm công thức chuẩn`);
  };

  const markCustomerTest = async () => {
    const { error: updateError } = await supabase.from("recipes").update({ status: "customer_test", updated_at: new Date().toISOString() }).eq("id", selected.id);
    if (updateError) { setError("Chưa chuyển được sang bước khách thử."); return; }
    await load({ preferredId: selected.id });
    flash("Đã chuyển sang khách thử");
  };

  const activeEconomics = activeVersion ? recipeEconomics({
    teaDoseG: activeVersion.tea_dose_g,
    teaCostPerKg: activeVersion.tea_cost_per_kg,
    ingredients: activeVersion.ingredients,
    sellPrice: selected?.target_sell_price,
  }) : null;

  if (loading) return <main className={styles.state}><RefreshCw/><p>Đang mở sổ thử công thức…</p></main>;

  return (
    <main className={styles.page}>
      <header className={styles.top}>
        <div><Link href="/admin"><ArrowLeft/>Bảng điều khiển</Link><span>Phòng công thức</span></div>
        <button onClick={() => load()} aria-label="Làm mới dữ liệu"><RefreshCw/></button>
      </header>

      <section className={styles.heading}>
        <div><p>Recipe development</p><h1>Biến mỗi lần pha thành một công thức có thể lặp lại.</h1><span>Gắn công thức với khách, trà, lô sản xuất và giá vốn—rồi giữ lại đúng phiên bản đã được nếm và chốt.</span></div>
        <button onClick={() => setRecipeDraft(blankRecipe())}><Plus/>Tạo công thức</button>
      </section>

      {error && <p className={styles.toast} data-error><span>{error}</span><button onClick={() => setError("")}>×</button></p>}
      {notice && <p className={styles.toast}><Check/>{notice}</p>}

      <div className={styles.workbench}>
        <aside className={styles.index}>
          <header><div><span>Sổ đang mở</span><b>{recipes.filter((item) => item.status !== "archived").length} công thức</b></div><button onClick={() => setRecipeDraft(blankRecipe())} aria-label="Tạo công thức"><Plus/></button></header>
          <label className={styles.search}><Search/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm món, khách hoặc trà…"/></label>
          <select className={styles.filter} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="active">Đang hoạt động</option><option value="all">Tất cả</option>
            {RECIPE_STATUSES.map((item) => <option value={item.id} key={item.id}>{item.label}</option>)}
          </select>
          <div className={styles.recipeList}>
            {filteredRecipes.map((recipe) => {
              const count = versions.filter((item) => item.recipe_id === recipe.id).length;
              return <button key={recipe.id} data-active={recipe.id === selectedId} onClick={() => selectRecipe(recipe)}><span><i data-status={recipe.status}/>{statusLabel(recipe.status)}</span><b>{recipe.name}</b><p>{opportunityMap[recipe.opportunity_id]?.business_name || localName(productMap[recipe.product_id])}</p><footer><small>{count ? `${count} phiên bản` : "Chưa pha thử"}</small><ChevronRight/></footer></button>;
            })}
            {!filteredRecipes.length && <div className={styles.emptyIndex}><Beaker/><b>Chưa có công thức phù hợp.</b><p>Tạo hồ sơ đầu tiên từ một món quán đang muốn phát triển.</p></div>}
          </div>
        </aside>

        <section className={styles.detail}>
          {selected ? <>
            <header className={styles.recipeHeader}>
              <div><span>{statusLabel(selected.status)}</span><h2>{selected.name}</h2><p>{selected.purpose || "Chưa ghi mục tiêu sử dụng."}</p></div>
              <div><button className={styles.secondary} onClick={() => setRecipeDraft({ ...selected })}><PencilLine/>Sửa hồ sơ</button><button className={styles.primary} onClick={openVersion}><Plus/>Ghi lần thử</button></div>
            </header>

            <section className={styles.connections} aria-label="Dữ liệu liên kết">
              <div><Handshake/><span><small>Khách / dự án</small><b>{opportunityMap[selected.opportunity_id]?.business_name || sampleMap[selected.sample_request_id]?.store_name || "Công thức nội bộ"}</b></span></div>
              <div><Beaker/><span><small>Nền trà</small><b>{localName(productMap[selected.product_id])}</b></span></div>
              <div><Target/><span><small>Mục tiêu giá vốn</small><b>{money(selected.target_cost_per_serving)} / ly</b></span></div>
              <div><CircleDollarSign/><span><small>Giá bán dự kiến</small><b>{money(selected.target_sell_price)}</b></span></div>
            </section>

            <section className={styles.versionSection}>
              <header><div><span>Version history</span><h3>Các lần pha đã lưu</h3></div>{selectedVersions.length > 0 && <small>Chọn một phiên bản để xem đúng công thức tại thời điểm đó.</small>}</header>
              {selectedVersions.length ? <div className={styles.versionRail}>{selectedVersions.map((version) => <button key={version.id} data-active={version.id === activeVersion?.id} data-result={version.result} onClick={() => setActiveVersionId(version.id)}><span>V{version.version_number}<i>{resultLabel(version.result)}</i></span><b>{money(version.cost_per_serving)} / ly</b><small>{version.sensory_average === null ? "Chưa chấm vị" : `${version.sensory_average}/10`} · {shortDate(version.tested_at)}</small>{selected.approved_version_id === version.id && <em><Check/>Bản chuẩn</em>}</button>)}</div> : <div className={styles.emptyVersions}><Beaker/><div><b>Chưa có lần pha nào được lưu.</b><p>Bắt đầu bằng thông số đang dùng; những lần sau có thể kế thừa rồi điều chỉnh.</p></div><button onClick={openVersion}>Ghi lần thử đầu tiên</button></div>}
            </section>

            {activeVersion && <article className={styles.brewTicket}>
              <header><div className={styles.versionStamp}><span>HL / RECIPE</span><b>V{activeVersion.version_number}</b><small>{shortDate(activeVersion.tested_at)}</small></div><div><span>{selected.approved_version_id === activeVersion.id ? "Công thức chuẩn đang áp dụng" : "Hồ sơ lần pha"}</span><h3>{localName(productMap[activeVersion.product_id])}</h3><p>{batchMap[activeVersion.batch_id]?.code ? `Lô ${batchMap[activeVersion.batch_id].code}` : "Chưa gắn lô sản xuất"}</p></div><div className={styles.ticketActions}>{selected.approved_version_id !== activeVersion.id && <button className={styles.secondary} onClick={markCustomerTest}>Gửi khách thử</button>}<button className={styles.approve} disabled={saving || selected.approved_version_id === activeVersion.id} onClick={() => approveVersion(activeVersion)}><Check/>{selected.approved_version_id === activeVersion.id ? "Đã chốt" : "Chốt bản này"}</button></div></header>

              <div className={styles.brewMetrics}>
                <div><Beaker/><span><small>Trà</small><b>{activeVersion.tea_dose_g || "—"} g</b></span></div>
                <div><Droplets/><span><small>Nước</small><b>{activeVersion.water_ml || "—"} ml</b></span></div>
                <div><Thermometer/><span><small>Nhiệt</small><b>{activeVersion.temperature_c || "—"}°C</b></span></div>
                <div><Timer/><span><small>Ủ</small><b>{activeVersion.brew_seconds || "—"} giây</b></span></div>
                <div><Target/><span><small>Thành phẩm</small><b>{activeVersion.serving_ml || "—"} ml</b></span></div>
              </div>

              <div className={styles.ticketBody}>
                <section className={styles.formulaSheet}>
                  <header><span>Công thức cho một ly</span><b>{activeVersion.ingredients?.length || 0} thành phần bổ sung</b></header>
                  <div className={styles.teaLine}><span>01</span><div><b>{localName(productMap[activeVersion.product_id])}</b><small>{activeVersion.tea_dose_g || "—"} g · {money(activeVersion.tea_cost_per_kg)}/kg</small></div><strong>{money(activeEconomics?.teaCost)}</strong></div>
                  {(activeVersion.ingredients || []).map((item, index) => <div className={styles.ingredientLine} key={`${item.name}-${index}`}><span>{String(index + 2).padStart(2, "0")}</span><div><b>{item.name}</b><small>{item.amount || "—"} {item.unit}</small></div><strong>{money(item.cost)}</strong></div>)}
                  <div className={styles.steps}><span>Thứ tự pha</span>{activeVersion.steps?.length ? <ol>{activeVersion.steps.map((step, index) => <li key={`${step}-${index}`}><i>{index + 1}</i>{step}</li>)}</ol> : <p>Chưa ghi thứ tự thao tác.</p>}</div>
                </section>

                <aside className={styles.decisionSheet}>
                  <section className={styles.costCard}><header><span>Giá vốn / ly</span><b>{money(activeEconomics?.cost)}</b></header><dl><div><dt>Trà</dt><dd>{money(activeEconomics?.teaCost)}</dd></div><div><dt>Phần còn lại</dt><dd>{money(activeEconomics?.additionsCost)}</dd></div><div><dt>Lãi gộp dự kiến</dt><dd>{money(activeEconomics?.grossProfit)}</dd></div><div><dt>Biên dự kiến</dt><dd>{activeEconomics?.marginPercent === null ? "—" : `${activeEconomics.marginPercent}%`}</dd></div></dl></section>
                  <section className={styles.sensoryCard}><header><span>Phiếu nếm</span><b>{activeVersion.sensory_average === null ? "—" : `${activeVersion.sensory_average}/10`}</b></header>{SENSORY_FIELDS.map(([key, label]) => <div key={key}><span>{label}</span><i><b style={{ width: `${Math.max(0, Math.min(10, Number(activeVersion.sensory?.[key]) || 0)) * 10}%` }}/></i><strong>{activeVersion.sensory?.[key] ?? "—"}</strong></div>)}</section>
                  {activeVersion.notes && <section className={styles.noteCard}><span>Ghi chú nội bộ</span><p>{activeVersion.notes}</p></section>}
                  {activeVersion.customer_feedback && <section className={styles.feedbackCard}><span>Phản hồi của khách</span><p>{activeVersion.customer_feedback}</p></section>}
                </aside>
              </div>
            </article>}
          </> : <div className={styles.emptyDetail}><Beaker/><h2>Một nơi cho mọi lần thử.</h2><p>Chọn công thức bên trái hoặc tạo hồ sơ mới. Radar thị trường có thể đưa ý tưởng vào đây sau; dữ liệu pha thật mới quyết định công thức nào được giữ.</p><button className={styles.primary} onClick={() => setRecipeDraft(blankRecipe())}><Plus/>Tạo công thức đầu tiên</button></div>}
        </section>
      </div>

      {recipeDraft && <div className={styles.overlay} onMouseDown={(event) => { if (event.target === event.currentTarget) setRecipeDraft(null); }}><form className={styles.drawer} onSubmit={saveRecipe}>
        <header><div><span>Recipe brief</span><h2>{recipeDraft.id ? "Sửa hồ sơ công thức" : "Tạo công thức mới"}</h2><p>Ghi mục tiêu trước; thông số pha nằm trong từng phiên bản.</p></div><button type="button" onClick={() => setRecipeDraft(null)} aria-label="Đóng"><X/></button></header>
        <div className={styles.formGrid}>
          <label className={styles.wide}>Tên món / công thức<input autoFocus required value={recipeDraft.name} onChange={(event) => setRecipeDraft({ ...recipeDraft, name: event.target.value })} placeholder="Ví dụ: Hồng trà Shan mật sữa tươi"/></label>
          <label className={styles.wide}>Mục đích sử dụng<input value={recipeDraft.purpose} onChange={(event) => setRecipeDraft({ ...recipeDraft, purpose: event.target.value })} placeholder="Món chủ lực, nền trà trái cây, thử cho menu mùa hè…"/></label>
          <label>Khách / dự án<select value={recipeDraft.opportunity_id || ""} onChange={(event) => setRecipeDraft({ ...recipeDraft, opportunity_id: event.target.value, source_type: event.target.value ? "customer" : recipeDraft.source_type })}><option value="">Công thức nội bộ</option>{opportunities.map((item) => <option key={item.id} value={item.id}>{item.business_name} · {item.contact}</option>)}</select></label>
          <label>Yêu cầu mẫu<select value={recipeDraft.sample_request_id || ""} onChange={(event) => setRecipeDraft({ ...recipeDraft, sample_request_id: event.target.value, source_type: event.target.value ? "sample" : recipeDraft.source_type })}><option value="">Không gắn yêu cầu mẫu</option>{samples.map((item) => <option key={item.id} value={item.id}>{item.store_name} · {item.phone}</option>)}</select></label>
          <label>Nền trà dự kiến<select value={recipeDraft.product_id || ""} onChange={(event) => setRecipeDraft({ ...recipeDraft, product_id: event.target.value, batch_id: "" })}><option value="">Chọn sau khi thử</option>{products.map((item) => <option key={item.id} value={item.id}>{localName(item)}</option>)}</select></label>
          <label>Lô trà<select value={recipeDraft.batch_id || ""} onChange={(event) => setRecipeDraft({ ...recipeDraft, batch_id: event.target.value })}><option value="">Chưa gắn lô</option>{batches.filter((item) => !recipeDraft.product_id || item.product_id === recipeDraft.product_id).map((item) => <option key={item.id} value={item.id}>{item.code} · {money(item.cost_per_kg)}/kg</option>)}</select></label>
          <label>Thành phẩm mục tiêu<FormattedNumberInput value={recipeDraft.target_serving_ml ?? ""} onChange={(event) => setRecipeDraft({ ...recipeDraft, target_serving_ml: event.target.value })} min="1"/><small>ml / ly</small></label>
          <label>Giá vốn mục tiêu<FormattedNumberInput value={recipeDraft.target_cost_per_serving ?? ""} onChange={(event) => setRecipeDraft({ ...recipeDraft, target_cost_per_serving: event.target.value })} min="0"/><small>đ / ly</small></label>
          <label>Giá bán dự kiến<FormattedNumberInput value={recipeDraft.target_sell_price ?? ""} onChange={(event) => setRecipeDraft({ ...recipeDraft, target_sell_price: event.target.value })} min="0"/><small>đ / ly</small></label>
          <label>Trạng thái<select value={recipeDraft.status} onChange={(event) => setRecipeDraft({ ...recipeDraft, status: event.target.value })}>{RECIPE_STATUSES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
          <label className={styles.wide}>Ghi chú<textarea value={recipeDraft.notes || ""} onChange={(event) => setRecipeDraft({ ...recipeDraft, notes: event.target.value })} placeholder="Điều phải giữ đúng hoặc ràng buộc của quán"/></label>
        </div>
        <button className={styles.save} disabled={saving || !recipeDraft.name.trim()}><Save/>{saving ? "Đang lưu…" : "Lưu hồ sơ công thức"}</button>
      </form></div>}

      {versionDraft && <div className={styles.overlay} onMouseDown={(event) => { if (event.target === event.currentTarget) setVersionDraft(null); }}><form className={`${styles.drawer} ${styles.versionDrawer}`} onSubmit={saveVersion}>
        <header><div><span>New brew ticket</span><h2>Ghi lần thử V{selectedVersions.length + 1}</h2><p>Kế thừa bản gần nhất, rồi chỉ sửa những gì thực sự thay đổi.</p></div><button type="button" onClick={() => setVersionDraft(null)} aria-label="Đóng"><X/></button></header>
        <section className={styles.editorSection}><header><span>01 · Nền trà và cách ủ</span><b>{versionDraft.serving_ml || "—"} ml thành phẩm</b></header><div className={styles.formGrid}>
          <label>Ngày thử<input type="date" value={versionDraft.tested_at} onChange={(event) => updateVersion("tested_at", event.target.value)}/></label>
          <label>Nền trà<select value={versionDraft.product_id} onChange={(event) => updateVersion("product_id", event.target.value)}><option value="">Chọn trà</option>{products.map((item) => <option key={item.id} value={item.id}>{localName(item)}</option>)}</select></label>
          <label>Lô trà<select value={versionDraft.batch_id} onChange={(event) => chooseBatch(event.target.value)}><option value="">Chưa gắn lô</option>{batches.filter((item) => !versionDraft.product_id || item.product_id === versionDraft.product_id).map((item) => <option key={item.id} value={item.id}>{item.code} · {money(item.cost_per_kg)}/kg</option>)}</select></label>
          <label>Giá vốn trà / kg<FormattedNumberInput min="0" value={versionDraft.tea_cost_per_kg} onChange={(event) => updateVersion("tea_cost_per_kg", event.target.value)}/></label>
          <label>Trà (g)<FormattedNumberInput min="0" step="0.1" value={versionDraft.tea_dose_g} onChange={(event) => updateVersion("tea_dose_g", event.target.value)}/></label>
          <label>Nước (ml)<FormattedNumberInput min="0" value={versionDraft.water_ml} onChange={(event) => updateVersion("water_ml", event.target.value)}/></label>
          <label>Nhiệt độ (°C)<FormattedNumberInput min="0" max="110" value={versionDraft.temperature_c} onChange={(event) => updateVersion("temperature_c", event.target.value)}/></label>
          <label>Thời gian ủ (giây)<FormattedNumberInput min="0" value={versionDraft.brew_seconds} onChange={(event) => updateVersion("brew_seconds", event.target.value)}/></label>
          <label>Thành phẩm (ml)<FormattedNumberInput min="1" value={versionDraft.serving_ml} onChange={(event) => updateVersion("serving_ml", event.target.value)}/></label>
        </div></section>

        <section className={styles.editorSection}><header><span>02 · Thành phần cho một ly</span><button type="button" onClick={() => updateVersion("ingredients", [...versionDraft.ingredients, newIngredient()])}><Plus/>Thêm thành phần</button></header><div className={styles.ingredientEditor}>{versionDraft.ingredients.map((item, index) => <div key={item.id}><span>{String(index + 1).padStart(2, "0")}</span><input value={item.name} onChange={(event) => updateIngredient(item.id, "name", event.target.value)} placeholder="Tên nguyên liệu"/><FormattedNumberInput aria-label="Lượng dùng" min="0" value={item.amount} onChange={(event) => updateIngredient(item.id, "amount", event.target.value)} placeholder="Lượng"/><select aria-label="Đơn vị" value={item.unit} onChange={(event) => updateIngredient(item.id, "unit", event.target.value)}><option value="g">g</option><option value="ml">ml</option><option value="portion">phần</option><option value="piece">cái</option></select><FormattedNumberInput aria-label="Chi phí phần dùng" min="0" value={item.cost} onChange={(event) => updateIngredient(item.id, "cost", event.target.value)} placeholder="Chi phí / ly"/><button type="button" disabled={versionDraft.ingredients.length === 1} onClick={() => updateVersion("ingredients", versionDraft.ingredients.filter((row) => row.id !== item.id))}>×</button></div>)}</div><label className={styles.stepsEditor}>Thứ tự thao tác<textarea value={(versionDraft.steps || []).join("\n")} onChange={(event) => updateVersion("steps", event.target.value.split("\n"))} placeholder={"Ủ trà và lọc bã\nKhuấy trà với đường\nThêm sữa và đá"}/><small>Mỗi dòng là một bước để người khác có thể pha lại đúng thứ tự.</small></label></section>

        <section className={styles.editorSection}><header><span>03 · Nếm và quyết định</span><b>{sensoryAverage(versionDraft.sensory) ?? "—"}/10</b></header><div className={styles.sensoryEditor}>{SENSORY_FIELDS.map(([key, label]) => <label key={key}><span>{label}<b>{versionDraft.sensory[key]}</b></span><input type="range" min="0" max="10" step="1" value={versionDraft.sensory[key]} onChange={(event) => updateVersion("sensory", { ...versionDraft.sensory, [key]: Number(event.target.value) })}/></label>)}</div><div className={styles.formGrid}><label>Kết quả<select value={versionDraft.result} onChange={(event) => updateVersion("result", event.target.value)}><option value="retest">Thử lại</option><option value="pass">Đạt</option><option value="fail">Không đạt</option></select></label><label className={styles.wide}>Ghi chú lần pha<textarea value={versionDraft.notes} onChange={(event) => updateVersion("notes", event.target.value)} placeholder="Điều đã thay đổi và điều cần sửa ở bản sau"/></label><label className={styles.wide}>Phản hồi của khách<textarea value={versionDraft.customer_feedback} onChange={(event) => updateVersion("customer_feedback", event.target.value)} placeholder="Để trống nếu đây là lần thử nội bộ"/></label></div></section>

        <aside className={styles.liveCost}><div><span>Giá vốn đang tính</span><b>{money(versionEconomics.cost)} / ly</b><small>Trà {money(versionEconomics.teaCost)} · phần còn lại {money(versionEconomics.additionsCost)}</small></div><div><span>So với giá bán dự kiến</span><b>{versionEconomics.marginPercent === null ? "Chưa có giá bán" : `${versionEconomics.marginPercent}% biên`}</b><small>{selected?.target_cost_per_serving ? `Mục tiêu giá vốn ${money(selected.target_cost_per_serving)}` : "Chưa đặt mục tiêu giá vốn"}</small></div></aside>
        <button className={styles.save} disabled={saving}><Save/>{saving ? "Đang lưu…" : `Lưu lần thử V${selectedVersions.length + 1}`}</button>
      </form></div>}
    </main>
  );
}

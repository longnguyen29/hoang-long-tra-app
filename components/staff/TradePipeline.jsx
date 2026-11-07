"use client";
import { formatMassKg } from "@/lib/format-mass";

import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, BadgeDollarSign, Calculator, CalendarClock, Check, ChevronRight, Clipboard, FileText, FlaskConical, Handshake, History, Plus, RefreshCw, Save, Search, Send, Target, X } from "lucide-react";
import { fromCatalogRow, fromVariantRow } from "@/lib/mappers";
import { dateInput, money, normalizeContact, QUOTE_STATUS, quoteMessage, shortDate, stageLabel, TRADE_STAGES } from "@/lib/trade-pipeline";
import { buildCustomerJourney } from "@/lib/customer-journey";
import { CUSTOMER_CATEGORIES, customerOrderSummary, customerMatchRank } from "@/lib/customer-directory";
import { contactCandidates, searchCustomer, interestItems, addInterest, removeInterest } from "@/lib/customer-contacts";
import { useDialogFocus } from "./useDialogFocus";
import LoadFailure from "./LoadFailure";
import styles from "./TradePipeline.module.css";
import FormattedNumberInput from "@/components/FormattedNumberInput";
import CustomerJourneyPanel from "./CustomerJourneyPanel";
import { notifyHouse } from "@/lib/notify";
import PipelineSample from "./PipelineSample";
import EventEnquiryInbox from "./EventEnquiryInbox";
import PartnerReferralLink from "./PartnerReferralLink";
import { SUPPORTED_SELLING_UNITS, sellingUnitLabel } from "@/lib/selling-units";
import { buildTradeQuoteLines, buildTradePriceRules, selectTradeProduct, tradeMassUnit, tradeProductOptions } from "@/lib/trade-line-units";

const newOpportunity = () => ({ business_name: "", contact: "", product_interest: "", stage: "lead", owner: "", monthly_potential_kg: "", next_action: "Liên hệ và xác nhận nhu cầu", next_action_at: dateInput(1), notes: "" });
const blankQuoteLine = () => ({ id: crypto.randomUUID(), productKey: "", qty: 1, unit: "", price: "" });
const blankPriceLine = () => ({ id: crypto.randomUUID(), productKey: "", minimum_quantity: 1, unit: "", price: "" });

const productKeyFor = (productId, weight = "") => weight ? `${productId}__${weight}` : productId;
const pricingHref = (opportunityId, key = "") => {
  const [product = "", variant = ""] = key.split("__");
  const query = new URLSearchParams();
  if (opportunityId) query.set("opportunity", opportunityId);
  if (product) query.set("product", product);
  if (variant) query.set("variant", variant);
  return `/admin/operations/pricing?${query}`;
};
const agreementTerms = (agreement) => [
  agreement?.includes_vat ? "Giá đã gồm VAT." : "Giá chưa gồm VAT.",
  agreement?.includes_delivery ? "Giá đã gồm vận chuyển." : "Phí vận chuyển được xác nhận theo địa chỉ giao hàng.",
  agreement?.payment_terms,
].filter(Boolean).join(" ");
const newQuote = (opportunity, agreement = null) => ({
  opportunity_id: opportunity.id,
  customer_name: opportunity.business_name,
  contact: opportunity.preferred_contact || opportunity.contact,
  address: "",
  valid_until: agreement?.valid_until || dateInput(14),
  is_indefinite: Boolean(agreement && !agreement.valid_until),
  discount_percent: 0,
  payment_method: "qr",
  terms: agreement ? agreementTerms(agreement) : "Giá có hiệu lực trong thời hạn nêu trên. Thời gian giao hàng được xác nhận khi chốt đơn.",
  note: agreement ? `Áp dụng bảng giá đối tác phiên bản ${agreement.version}.` : "",
  priceAgreementId: agreement?.id || null,
  lines: agreement?.partner_price_rules?.length
    ? agreement.partner_price_rules.map((rule) => ({ id: crypto.randomUUID(), productKey: productKeyFor(rule.product_id, rule.variant_weight), qty: Number(rule.minimum_quantity) || 1, unit: rule.unit, price: Number(rule.price), priceAgreementId: agreement.id }))
    : [blankQuoteLine()],
});
const newPriceAgreement = (opportunity, agreement = null) => {
  const today = dateInput();
  const hadFixedTerm = Boolean(agreement?.valid_until);
  return {
    opportunity_id: opportunity.id,
    effective_from: today,
    valid_until: hadFixedTerm ? (agreement.valid_until >= today ? agreement.valid_until : dateInput(90)) : "",
    is_indefinite: !hadFixedTerm,
    review_at: agreement?.review_at >= today ? agreement.review_at : dateInput(180),
    includes_vat: agreement?.includes_vat || false,
    includes_delivery: agreement?.includes_delivery || false,
    payment_terms: agreement?.payment_terms || "Chuyển khoản khi xác nhận đơn.",
    note: "",
    lines: agreement?.partner_price_rules?.length
      ? agreement.partner_price_rules.map((rule) => ({ id: crypto.randomUUID(), productKey: productKeyFor(rule.product_id, rule.variant_weight), minimum_quantity: Number(rule.minimum_quantity) || 1, unit: rule.unit, price: Number(rule.price) }))
      : [blankPriceLine()],
  };
};

function TradeLineFields({ line, index, products, quantityKey, agreement, onChange, onRemove, removeDisabled }) {
  const product = products.find(item => item.key === line.productKey);
  const unit = line.unit || product?.unit || "";
  const unitName = sellingUnitLabel(unit);
  const quantityTitle = quantityKey === "qty" ? "Số lượng" : "Số lượng tối thiểu";
  return <div className={styles.tradeLine}>
    <span>{index + 1}</span>
    <select className={styles.lineProduct} aria-label={`Sản phẩm dòng ${index + 1}`} required value={line.productKey} onChange={event => {
      const selected = products.find(item => item.key === event.target.value);
      const rule = agreement?.partner_price_rules?.find(item => productKeyFor(item.product_id, item.variant_weight) === event.target.value);
      onChange(selectTradeProduct(line, selected, rule, agreement?.id, quantityKey));
    }}><option value="">Chọn trà / quy cách</option>{products.map(item => <option key={item.key} value={item.key}>{item.name.vi || item.name.en}{item.weight ? ` · ${item.weight}` : ""}</option>)}</select>
    <FormattedNumberInput className={styles.lineQuantity} aria-label={`${quantityTitle} dòng ${index + 1} (${unitName || "chọn đơn vị"})`} title={`${quantityTitle} (${unitName})`} required min={tradeMassUnit(unit) ? "0.01" : "1"} step={tradeMassUnit(unit) ? "0.01" : "1"} value={line[quantityKey]} onChange={event => onChange({ ...line, [quantityKey]: event.target.value })} />
    <select className={styles.lineUnit} aria-label={`Đơn vị dòng ${index + 1}`} required value={unit} onChange={event => onChange({ ...line, unit: event.target.value, price: "", priceAgreementId: null })}>
      <option value="">Đơn vị</option>{SUPPORTED_SELLING_UNITS.map(value => <option key={value} value={value}>{sellingUnitLabel(value)}</option>)}
    </select>
    <FormattedNumberInput className={styles.linePrice} aria-label={`Đơn giá dòng ${index + 1} / ${unitName || "đơn vị"}`} min="0" required placeholder={`Đơn giá/${unitName || "đơn vị"}`} value={line.price} onChange={event => onChange({ ...line, price: event.target.value })} />
    <button type="button" className={styles.lineRemove} disabled={removeDisabled} onClick={onRemove} aria-label={`Xóa dòng ${index + 1}`}>−</button>
  </div>;
}

export default function TradePipeline({ supabase, email }) {
  const dialogRef = useRef(null);
  const [opportunities, setOpportunities] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [agreements, setAgreements] = useState([]);
  const [partners, setPartners] = useState([]);
  const [samples, setSamples] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [recipeVersions, setRecipeVersions] = useState([]);
  const [orders, setOrders] = useState([]);
  const [directoryHidden, setDirectoryHidden] = useState([]);
  const [directoryLinks, setDirectoryLinks] = useState([]);
  const [showHidden, setShowHidden] = useState(false);
  const [linkChoice, setLinkChoice] = useState({});
  const [directoryBusy, setDirectoryBusy] = useState(false);
  const [receivables, setReceivables] = useState([]);
  const [products, setProducts] = useState([]);
  const [selected, setSelectedRaw] = useState(null);
  const setSelected = (value) => setSelectedRaw(previous => value && ({...value, prospect_suppressed: value.prospect_suppressed ?? (previous?.id===value.id ? previous.prospect_suppressed : Boolean(value.discovery_prospect_id))}));
  const [editing, setEditing] = useState(null);
  const [quoteDraft, setQuoteDraft] = useState(null);
  const [priceDraft, setPriceDraft] = useState(null);
  const [query, setQuery] = useState("");
  const [viewMode, setViewMode] = useState("list");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [categorySaving, setCategorySaving] = useState(false);
  const [contactDraft, setContactDraft] = useState("");
  const [contactSaving, setContactSaving] = useState(false);
  const [contactFeedback, setContactFeedback] = useState("");
  const [categoryError, setCategoryError] = useState("");
  const [showLost, setShowLost] = useState(false);
  const [mobileStage, setMobileStage] = useState(TRADE_STAGES[0].id);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const closeSelected = useCallback(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.has("opportunity")) {
      url.searchParams.delete("opportunity");
      window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
    }
    setSelected(null);
  }, []);

  useDialogFocus(dialogRef, Boolean(selected) && !editing && !quoteDraft && !priceDraft, closeSelected);

  const openEventOpportunity = async (id) => {
    const { data, error: readError } = await supabase.from("trade_opportunities").select("*").eq("id", id).maybeSingle();
    if (readError || !data) { setError("Chưa mở được khách hàng của yêu cầu này. Thử làm mới Pipeline."); return; }
    let suppressed = false;
    if (data.discovery_prospect_id) {
      const result = await supabase.rpc("pipeline_prospect_suppressed", { p_opportunity_id: data.id });
      suppressed = result.error ? true : Boolean(result.data);
    }
    setSelected({ ...data, prospect_suppressed: suppressed });
    setEditing(null); setQuoteDraft(null); setPriceDraft(null);
  };

  const [dataFailure, setDataFailure] = useState(false);
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
    const [o, q, a, p, v, w, s, r, rv, ord, rec, hidden, links] = await Promise.all([
      supabase.from("trade_opportunities").select("*").order("updated_at", { ascending: false }),
      supabase.from("trade_quotes").select("*").order("created_at", { ascending: false }),
      supabase.from("partner_price_agreements").select("*, partner_price_rules(*)").order("version", { ascending: false }),
      supabase.from("catalog_products").select("*").eq("available", true).order("line"),
      supabase.from("catalog_variants").select("*"),
      supabase.from("wholesale_accounts").select("id, opportunity_id, contact, business_name, reorder_cadence_days, created_at"),
      supabase.from("sample_requests").select("*").order("ts", { ascending: false }),
      supabase.from("recipes").select("*").order("updated_at", { ascending: false }),
      supabase.from("recipe_versions").select("*").order("created_at", { ascending: false }),
      supabase.from("orders").select("*").order("ts", { ascending: false }),
      supabase.from("receivables").select("*").order("created_at", { ascending: false }),
      supabase.from("customer_directory_hidden").select("kind,entry_id"),
      supabase.from("customer_directory_order_links").select("order_id,opportunity_id"),
    ]);
    const failed = [o, q, a, p, v, w, s, r, rv, ord, rec, hidden, links].some(result => result.error);
    setDataFailure(failed);
    if(failed) return;
    if (o.error || q.error) setError("Chưa tải được dữ liệu phát triển đối tác. Kiểm tra migration 0033.");
    else if (a.error) setError("Chưa tải được sổ giá đối tác. Kiểm tra migration 0034.");
    if (!o.error) {
      const enriched=await Promise.all((o.data||[]).map(async item=>{
        if(!item.discovery_prospect_id)return item;
        const result=await supabase.rpc('pipeline_prospect_suppressed',{p_opportunity_id:item.id});
        return {...item,prospect_suppressed:result.error?true:result.data};
      }));
      setOpportunities(enriched);
    }
    if (!q.error) setQuotes(q.data || []);
    if (!a.error) setAgreements((a.data || []).map((agreement) => ({ ...agreement, partner_price_rules: [...(agreement.partner_price_rules || [])].sort((left, right) => left.sort_order - right.sort_order) })));
    if (!w.error) setPartners(w.data || []);
    if (!s.error) setSamples(s.data || []);
    if (!r.error) setRecipes(r.data || []);
    if (!rv.error) setRecipeVersions(rv.data || []);
    if (!ord.error) setOrders(ord.data || []);
    setDirectoryHidden(hidden.data || []); setDirectoryLinks(links.data || []);
    if (!rec.error) setReceivables(rec.data || []);
    if (!p.error) {
      const byProduct = {};
      (v.data || []).forEach((row) => (byProduct[row.product_id] ||= []).push(fromVariantRow(row)));
      setProducts((p.data || []).map((row) => ({ ...fromCatalogRow(row), variants: byProduct[row.id] || [] })));
    }
    setLoading(false);

    } catch { setDataFailure(true); } finally { setLoading(false); }
  }, [supabase]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const opportunityId = new URLSearchParams(window.location.search).get("opportunity");
    if (!selected && opportunityId && opportunities.length) {
      const opportunity = opportunities.find((item) => item.id === opportunityId);
      if (opportunity) { setSelected(opportunity); setEditing(null); setQuoteDraft(null); setPriceDraft(null); }
    }
  }, [opportunities, selected]);
  const flash = (message) => { setNotice(message); setTimeout(() => setNotice(""), 2200); };
  const today = dateInput();
  const searchable = useMemo(() => opportunities.filter(item => searchCustomer(item, query, orders, directoryLinks)), [opportunities, query, orders, directoryLinks]);
  const isHidden = (kind, id) => directoryHidden.some(entry => entry.kind === kind && entry.entry_id === id);
  const directory = useMemo(() => searchable.filter(item => !isHidden("opportunity", item.id) && (showLost || item.stage !== "lost") && (categoryFilter === "all" || (item.customer_category || "uncategorized") === categoryFilter)).map(item => ({ item, summary: customerOrderSummary(item, opportunities, orders, quotes, partners, directoryLinks) })).sort((a,b) => (Date.parse(b.summary.lastOrder) || 0) - (Date.parse(a.summary.lastOrder) || 0)), [searchable, opportunities, orders, quotes, partners, directoryLinks, directoryHidden, categoryFilter, showLost]);
  const saveContacts = async (patch) => {
    if (!selected || contactSaving) return;
    setContactSaving(true); setContactFeedback("");
    const { data, error: contactError } = await supabase.from("trade_opportunities").update(patch).eq("id", selected.id).select().single();
    setContactSaving(false);
    if (contactError || !data) { setContactFeedback("Chưa lưu được liên hệ. Vui lòng thử lại."); return; }
    const updated = {...selected, preferred_contact:data.preferred_contact, additional_contacts:data.additional_contacts};
    setSelected(updated); setOpportunities(rows => rows.map(row => row.id === updated.id ? {...row, preferred_contact:updated.preferred_contact, additional_contacts:updated.additional_contacts} : row));
    setContactDraft(""); setContactFeedback("Đã lưu liên hệ.");
  };
  const addContact = () => {
    const value = contactDraft.trim();
    if (!value || value.length > 120 || /[\r\n]/.test(value)) { setContactFeedback("Nhập một số điện thoại hoặc email, tối đa 120 ký tự."); return; }
    const existing = Array.isArray(selected.additional_contacts) ? selected.additional_contacts : [];
    if (contactCandidates(selected, orders, directoryLinks).some(item => normalizeContact(item) === normalizeContact(value))) { setContactFeedback("Liên hệ này đã có trong hồ sơ hoặc đơn được nối."); return; }
    if (existing.length >= 20) { setContactFeedback("Hồ sơ đã có 20 liên hệ bổ sung."); return; }
    saveContacts({additional_contacts:[...existing,value]});
  };
  const updateCategory = async (value) => {
    if (!selected || categorySaving) return;
    setCategorySaving(true); setCategoryError("");
    const { data, error: updateError } = await supabase.from("trade_opportunities").update({customer_category: value || null}).eq("id", selected.id).select().single();
    setCategorySaving(false);
    if (updateError || !data) { setCategoryError("Chưa lưu được loại khách. Vui lòng thử lại hoặc kiểm tra cấu hình dữ liệu."); return; }
    const updated = {...selected, customer_category: data.customer_category};
    setSelected(updated); setOpportunities(rows => rows.map(row => row.id === updated.id ? {...row, customer_category: updated.customer_category} : row));
    flash("Đã cập nhật loại khách hàng");
  };
  const orderOnly = useMemo(() => {
    const assigned = new Set(opportunities.flatMap(item => customerOrderSummary(item, opportunities, orders, quotes, partners, directoryLinks).orderIds));
    const groups = new Map();
    orders.filter(o => !assigned.has(o.id) && !isHidden("order", o.id) && !o.deleted_at && !["cancelled", "canceled", "deleted"].includes(o.status)).forEach(order => {
      const contact = normalizeContact(order.contact || "");
      const key = contact ? `contact:${contact}` : `order:${order.id}`;
      if (!groups.has(key)) groups.set(key, {key, name: order.customer_name || "Chưa có tên", contact: order.contact || "", orders: []});
      groups.get(key).orders.push(order);
    });
    return [...groups.values()].filter(group => `${group.name} ${group.contact}`.toLowerCase().includes(query.toLowerCase())).sort((a,b) => (Date.parse(b.orders[0]?.ts) || 0) - (Date.parse(a.orders[0]?.ts) || 0));
  }, [opportunities, orders, quotes, partners, directoryLinks, directoryHidden, query]);
  const setDirectoryVisibility = async (kind, ids, hide) => {
    if (directoryBusy || !ids.length) return;
    setDirectoryBusy(true); setError("");
    const result = hide ? await supabase.from("customer_directory_hidden").upsert(ids.map(entry_id => ({kind, entry_id})), {onConflict:"kind,entry_id",ignoreDuplicates:true}) : await supabase.from("customer_directory_hidden").delete().eq("kind",kind).in("entry_id",ids);
    setDirectoryBusy(false);
    if (result.error) { setError("Chưa thay đổi được danh sách. Thử lại."); return; }
    setDirectoryHidden(rows => hide ? [...rows, ...ids.filter(id => !rows.some(r => r.kind === kind && r.entry_id === id)).map(entry_id => ({kind,entry_id}))] : rows.filter(r => r.kind !== kind || !ids.includes(r.entry_id)));
    flash(hide ? "Đã ẩn khỏi danh sách; có thể khôi phục." : "Đã khôi phục vào danh sách.");
  };
  const linkOrders = async (group) => {
    const target = linkChoice[group.key];
    if (!target || directoryBusy) return;
    setDirectoryBusy(true); setError("");
    const records = group.orders.map(order => ({order_id:order.id, opportunity_id:target}));
    const {data,error:linkError} = await supabase.from("customer_directory_order_links").upsert(records,{onConflict:"order_id"}).select("order_id,opportunity_id");
    setDirectoryBusy(false);
    if (linkError || !data || data.length !== records.length) { setError("Chưa nối được đơn vào hồ sơ. Thử lại."); return; }
    setDirectoryLinks(rows => [...rows.filter(row => !records.some(record => record.order_id === row.order_id)), ...data]);
    flash("Đã nối đơn vào hồ sơ đã chọn.");
  };
  const unlinkOrder = async (orderId) => {
    if (directoryBusy) return;
    setDirectoryBusy(true); setError("");
    const {error: unlinkError} = await supabase.from("customer_directory_order_links").delete().eq("order_id",orderId).eq("opportunity_id",selected.id);
    setDirectoryBusy(false);
    if (unlinkError) { setCategoryError("Chưa gỡ được liên kết. Thử lại."); return; }
    setDirectoryLinks(rows => rows.filter(row => row.order_id !== orderId));
    flash("Đã gỡ liên kết thủ công; đơn gốc vẫn được giữ.");
  };
  const overdue = opportunities.filter((item) => item.stage !== "lost" && item.next_action_at && item.next_action_at.slice(0, 10) < today);
  const dueToday = opportunities.filter((item) => item.stage !== "lost" && item.next_action_at?.slice(0, 10) === today);
  const openQuotes = quotes.filter((quote) => ["draft", "sent", "accepted"].includes(quote.status));
  const totalPotential = opportunities.filter((item) => item.stage !== "lost").reduce((sum, item) => sum + Number(item.monthly_potential_kg || 0), 0);
  const orderableProducts = useMemo(() => tradeProductOptions(products), [products]);

  const openOpportunity = (item) => { setCategoryError(""); setContactFeedback(""); setContactDraft(""); setSelected(item); setEditing(null); setQuoteDraft(null); setPriceDraft(null); };
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
    // The prospect link is managed only by promotion; omit it from ordinary upserts.
    delete row.discovery_prospect_id;
    delete row.prospect_suppressed;
    const { data, error: saveError } = await supabase.from("trade_opportunities").upsert(row).select().single();
    setSaving(false);
    if (saveError) { setError(saveError.code === "23505" ? "Liên hệ này đã có trong pipeline." : "Chưa lưu được cơ hội."); return; }
    setOpportunities((current) => [data, ...current.filter((item) => item.id !== data.id)]);
    setSelected(data); setEditing(null); setQuery(""); setCategoryFilter("all"); setViewMode("list"); if (data.stage === "lost") setShowLost(true); flash("Đã lưu hồ sơ khách hàng");
  };

  const moveStage = async (stage) => {
    if (!selected) return;
    if(selected.prospect_suppressed && ["sample_requested","sample_sent","feedback","quoted"].includes(stage)){setError("Không liên hệ: dừng bước chuẩn bị mới.");return;}
    const nextAction = stage === "sample_sent" ? "Hỏi phản hồi sau khi thử trà" : stage === "quoted" ? "Xác nhận khách đã nhận báo giá" : stage === "won" ? "Xác nhận và chuẩn bị đơn đầu tiên" : selected.next_action;
    const patch = { stage, next_action: nextAction, updated_at: new Date().toISOString() };
    const { data, error: updateError } = await supabase.from("trade_opportunities").update(patch).eq("id", selected.id).select().single();
    if (updateError) { setError("Chưa chuyển được giai đoạn."); return; }
    setSelected(data); setOpportunities((current) => current.map((item) => item.id === data.id ? data : item)); flash(`Đã chuyển sang ${stageLabel(stage)}`);
  };

  const saveQuote = async (event) => {
    event.preventDefault();
    if(selected?.prospect_suppressed){setError("Không liên hệ: không tạo báo giá mới.");return;}
    let lines;
    try { lines = buildTradeQuoteLines(quoteDraft.lines, orderableProducts); }
    catch { setError("Kiểm tra sản phẩm, số lượng và đơn giá theo đúng đơn vị. Gói / viên / bánh phải có số lượng nguyên; đổi đơn vị cần nhập lại đơn giá."); return; }
    setSaving(true); setError("");
    const subtotal = lines.reduce((sum, line) => sum + (line.price || 0) * line.qty, 0);
    const total = Math.round(subtotal * (1 - (Number(quoteDraft.discount_percent) || 0) / 100));
    const quoteFields = { ...quoteDraft };
    delete quoteFields.is_indefinite; delete quoteFields.priceAgreementId;
    const partnerAccount = partners.find((item) => item.opportunity_id === selected.id) || partners.find((item) => normalizeContact(item.contact) === normalizeContact(selected.contact));
    const row = { ...quoteFields, partner_account_id: partnerAccount?.id || null, valid_until: quoteDraft.is_indefinite ? null : quoteDraft.valid_until || null, id: `quote-${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 4)}`, status: "draft", lines, subtotal, total, discount_percent: Number(quoteDraft.discount_percent) || 0, created_by: email };
    const { data, error: quoteError } = await supabase.from("trade_quotes").insert(row).select().single();
    if (quoteError) { setSaving(false); setError("Chưa lưu được báo giá."); return; }
    const { data: opportunity } = await supabase.from("trade_opportunities").update({ stage: "quoted", next_action: "Gửi báo giá và xác nhận khách đã nhận", next_action_at: new Date(`${today}T09:00:00+07:00`).toISOString(), updated_at: new Date().toISOString() }).eq("id", selected.id).select().single();
    setSaving(false); setQuotes((current) => [data, ...current]); setQuoteDraft(null);
    if (opportunity) { setSelected(opportunity); setOpportunities((current) => current.map((item) => item.id === opportunity.id ? opportunity : item)); }
    flash("Đã tạo bản nháp báo giá");
  };

  const savePriceAgreement = async (event) => {
    event.preventDefault();
    let rules;
    try { rules = buildTradePriceRules(priceDraft.lines, orderableProducts); }
    catch { setError("Kiểm tra sản phẩm, số lượng tối thiểu và đơn giá theo đúng đơn vị. Gói / viên / bánh phải có số lượng nguyên; đổi đơn vị cần nhập lại đơn giá."); return; }
    setSaving(true); setError("");
    const { error: saveError } = await supabase.rpc("create_partner_price_agreement", {
      p_opportunity_id: priceDraft.opportunity_id,
      p_effective_from: priceDraft.effective_from,
      p_valid_until: priceDraft.is_indefinite ? null : priceDraft.valid_until || null,
      p_review_at: priceDraft.review_at || null,
      p_includes_vat: priceDraft.includes_vat,
      p_includes_delivery: priceDraft.includes_delivery,
      p_payment_terms: priceDraft.payment_terms.trim(),
      p_note: priceDraft.note.trim(),
      p_created_by: email,
      p_rules: rules,
    });
    setSaving(false);
    if (saveError) { setError("Chưa lưu được phiên bản bảng giá mới."); return; }
    setPriceDraft(null); await load(); flash("Đã áp dụng phiên bản giá mới");
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
    if (convertError) { setError(String(convertError.message).includes("quote_stock_unit_mismatch")
      ? "Đơn vị báo giá khác đơn vị tồn kho. Kiểm tra lại số lượng, đơn vị và đơn giá trước khi tạo đơn; hệ thống không tự đổi kg sang gói / viên / bánh."
      : "Chưa chuyển được báo giá thành đơn."); return; }
    notifyHouse("orders", orderId);
    await load();
    const { data: refreshed } = await supabase.from("trade_opportunities").select("*").eq("id", quote.opportunity_id).maybeSingle();
    if (refreshed) setSelected(refreshed);
    flash(`Đã tạo đơn ${orderId}`);
  };

  const copyQuote = async (quote) => { await navigator.clipboard.writeText(quoteMessage(quote)); flash("Đã sao chép lời nhắn báo giá"); };
  const selectedQuotes = selected ? quotes.filter((quote) => quote.opportunity_id === selected.id) : [];
  const selectedAgreements = selected ? agreements.filter((agreement) => agreement.opportunity_id === selected.id) : [];
  const latestAgreement = selectedAgreements.find((agreement) => agreement.status === "active") || null;
  const activeAgreement = latestAgreement && latestAgreement.effective_from <= today && (!latestAgreement.valid_until || latestAgreement.valid_until >= today) ? latestAgreement : null;
  const selectedJourney = useMemo(() => selected ? buildCustomerJourney({ opportunity: selected, samples, recipes, recipeVersions, quotes, orders, receivables, partners, directoryLinks }) : null, [selected, samples, recipes, recipeVersions, quotes, orders, receivables, partners, directoryLinks]);
  const runJourneyCommand = (action) => {
    if (action.command === "edit-rhythm") setEditing({ ...selected, next_action_at: selected.next_action_at?.slice(0, 10) || "" });
    if (action.command === "create-quote") setQuoteDraft(newQuote(selected, activeAgreement));
    if (action.command === "open-quote") document.getElementById("customer-quotes")?.scrollIntoView({ behavior: "auto", block: "start" });
    if (action.command === "convert-quote") {
      const quote = selectedQuotes.find((item) => item.id === action.sourceId);
      if (quote) convertQuote(quote);
    }
  };

  if(dataFailure) return <LoadFailure onRetry={load} loading={loading}/>;

  return <main className={styles.page}>
    <header className={styles.top}><div><Link href="/admin"><ArrowLeft/>Bàn làm việc</Link></div><div><button onClick={load} disabled={loading} aria-label="Làm mới"><RefreshCw/></button></div></header>
    <section className={styles.hero}><div><h1>Khách hàng</h1><span>Quản lý liên hệ, đơn hàng và việc cần làm tiếp theo.</span></div><button onClick={() => setEditing(newOpportunity())}><Plus/>Thêm khách hàng</button></section>
    {error && <p className={styles.error} role="alert">{error}</p>}{notice && <p className={styles.notice}><Check/>{notice}</p>}
    <details className={styles.summaryDisclosure}><summary>Tổng quan công việc <span>· {overdue.length} việc quá hạn</span></summary><section className={styles.summary}>
      <article data-urgent={overdue.length > 0}><CalendarClock/><span>Quá hạn</span><b>{overdue.length}</b><small>{dueToday.length} việc đến hạn hôm nay</small></article>
      <article><Target/><span>Tiềm năng tháng</span><b>{formatMassKg(totalPotential)}</b><small>{opportunities.filter((item) => item.stage !== "lost").length} mối quan hệ đang mở</small></article>
      <article><FileText/><span>Báo giá đang mở</span><b>{openQuotes.length}</b><small>{quotes.filter((item) => item.status === "accepted").length} đã đồng ý</small></article>
      <article><Handshake/><span>Đối tác định kỳ</span><b>{opportunities.filter((item) => item.stage === "active").length}</b><small>{opportunities.filter((item) => item.stage === "won").length} đang ở đơn đầu</small></article>
    </section></details>
    <div className={styles.viewSwitch} aria-label="Kiểu xem khách hàng"><button type="button" data-active={viewMode === "list"} onClick={() => setViewMode("list")}>Danh sách</button><button type="button" data-active={viewMode === "pipeline"} onClick={() => setViewMode("pipeline")}>Theo giai đoạn</button></div>
    <section className={styles.tools}><label><Search/><input aria-label="Tìm khách hàng" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm khách, liên hệ hoặc sản phẩm quan tâm"/></label><button data-active={showLost} onClick={() => setShowLost(!showLost)}>Tạm dừng · {opportunities.filter((item) => item.stage === "lost").length}</button></section>
    {viewMode === "list" && <section className={styles.directory} aria-label="Danh sách khách hàng">
      <header><div><h2>Danh sách khách hàng</h2><p>{directory.length} hồ sơ CRM · Tổng đơn là giá trị dự kiến, không phải tiền đã thu.</p></div><label>Loại khách<select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}><option value="all">Tất cả</option><option value="uncategorized">Chưa phân loại</option>{CUSTOMER_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}</select></label></header>
      <div className={styles.directoryHead} aria-hidden="true"><span>Khách hàng</span><span>Loại / giai đoạn</span><span>Số đơn</span><span>Tổng dự kiến</span><span>Đặt gần nhất</span></div>
      {directory.map(({item, summary}) => <div className={styles.customerRowWrap} key={item.id}><button type="button" className={styles.customerRow} onClick={() => openOpportunity(item)}><span className={styles.customerIdentity}><strong>{item.business_name}</strong><small>{item.preferred_contact || item.contact || "Chưa có liên hệ"}</small>{item.product_interest && <small>Quan tâm: {item.product_interest}</small>}</span><span><b>{CUSTOMER_CATEGORIES.find(c => c.id === item.customer_category)?.label || "Chưa phân loại"}</b><small>{stageLabel(item.stage)}</small></span><span><small>Số đơn</small>{summary.count}</span><span><small>Tổng dự kiến</small>{summary.total === null ? "—" : `${new Intl.NumberFormat("vi-VN").format(summary.total)} ₫`}</span><span><small>Đặt gần nhất</small>{summary.lastOrder ? shortDate(summary.lastOrder) : "Chưa có đơn"}</span></button><button type="button" className={styles.hideCustomer} disabled={directoryBusy} onClick={() => setDirectoryVisibility("opportunity",[item.id],true)} aria-label={`Ẩn ${item.business_name} khỏi danh sách`}>Ẩn</button></div>)}
      {!directory.length && <p className={styles.emptyDirectory}>Chưa có khách phù hợp. Thử đổi bộ lọc hoặc thêm khách mới.</p>}
      <button className={styles.hiddenToggle} type="button" onClick={() => setShowHidden(!showHidden)} aria-expanded={showHidden}>Đã ẩn · {directoryHidden.length}</button>
      {showHidden && <section className={styles.hiddenSection}><h3>Đã ẩn khỏi danh sách</h3><p>Có thể khôi phục; đơn hàng và hồ sơ vẫn được giữ.</p>{directoryHidden.map(entry => { const item = entry.kind === "opportunity" ? opportunities.find(o => o.id === entry.entry_id) : orders.find(o => o.id === entry.entry_id); return <div key={`${entry.kind}:${entry.entry_id}`}><span>{item?.business_name || item?.customer_name || "Không còn dữ liệu"} <small>· {entry.kind === "order" ? "Đơn" : "Hồ sơ"}</small></span><button type="button" disabled={directoryBusy} onClick={() => setDirectoryVisibility(entry.kind,[entry.entry_id],false)}>Khôi phục</button></div>; })}</section>}
      <p className={styles.directoryNote}>Đơn được nối qua báo giá, tài khoản sỉ hoặc liên hệ trùng duy nhất. Liên hệ dùng chung cần kiểm tra trong hồ sơ.</p>
      {categoryFilter === "all" && orderOnly.length > 0 && <section className={styles.orderOnly}><h3>Khách có đơn chưa có hồ sơ CRM · {orderOnly.length}</h3><p>Kiểm tra liên hệ trước khi tạo hồ sơ; các đơn sẽ được đối chiếu theo liên hệ.</p>{orderOnly.map(group => <div key={group.key}><span><strong>{group.name}</strong><small>{group.contact || "Chưa có liên hệ"} · {group.orders.length} đơn · gần nhất {shortDate(group.orders[0]?.ts)}</small></span><span className={styles.orderActions}>{group.contact && !opportunities.some(item => normalizeContact(item.contact || "") === normalizeContact(group.contact)) && <button type="button" onClick={() => setEditing({...newOpportunity(), business_name:group.name, contact:group.contact})}>Tạo hồ sơ</button>}<label><span className={styles.srOnly}>Chọn hồ sơ để nối {group.name}</span><select value={linkChoice[group.key] || ""} onChange={e => setLinkChoice({...linkChoice,[group.key]:e.target.value})}><option value="">Chọn hồ sơ để nối</option>{[...opportunities].sort((a,b) => customerMatchRank(group,b)-customerMatchRank(group,a)).map(item => <option key={item.id} value={item.id}>{customerMatchRank(group,item) ? "Gợi ý · " : ""}{item.business_name} · {item.contact}</option>)}</select></label><button type="button" disabled={!linkChoice[group.key] || directoryBusy} onClick={() => linkOrders(group)}>Nối đơn</button><button type="button" disabled={directoryBusy} onClick={() => setDirectoryVisibility("order",group.orders.map(order => order.id),true)}>Ẩn</button></span></div>)}</section>}

    </section>}
    {viewMode === "pipeline" && <>
    <label className={styles.mobileStagePicker}><span>Giai đoạn đang xem</span><select value={mobileStage} onChange={(event) => setMobileStage(event.target.value)}>{TRADE_STAGES.map((stage) => <option key={stage.id} value={stage.id}>{stage.label} · {searchable.filter((item) => item.stage === stage.id).length}</option>)}</select></label>
    <section className={styles.stageRail} aria-label="Hành trình đối tác">{TRADE_STAGES.map((stage, index) => <div key={stage.id}><span>{String(index + 1).padStart(2, "0")}</span><b>{stage.label}</b><small>{searchable.filter((item) => item.stage === stage.id).length}</small></div>)}</section>
    <section className={styles.board}>
      {TRADE_STAGES.map((stage) => <section className={styles.column} data-mobile-active={mobileStage === stage.id} key={stage.id}><header><b>{stage.short}</b><span>{searchable.filter((item) => item.stage === stage.id).length}</span></header><div>{searchable.filter((item) => item.stage === stage.id).map((item) => {
        const isOverdue = item.next_action_at && item.next_action_at.slice(0, 10) < today;
        return <button key={item.id} onClick={() => openOpportunity(item)} data-overdue={isOverdue}><span className={styles.source}>{item.source_type === "partner_referral" ? "Đối tác giới thiệu" : item.source_type}</span><h3>{item.business_name}</h3><p>{item.next_action || "Chưa có bước tiếp theo"}</p><footer><span>{item.monthly_potential_kg ? `${formatMassKg(item.monthly_potential_kg)}/tháng` : item.contact}</span><time>{shortDate(item.next_action_at)}</time></footer></button>;
      })}<button className={styles.addCard} onClick={() => setEditing({ ...newOpportunity(), stage: stage.id })}><Plus/>Thêm tại đây</button></div></section>)}
    </section>
    {showLost && <section className={styles.lost}><header><h2>Cơ hội đang tạm dừng</h2><span>Giữ lại lịch sử; đưa về pipeline khi thời điểm phù hợp.</span></header>{searchable.filter((item) => item.stage === "lost").map((item) => <button key={item.id} onClick={() => openOpportunity(item)}><span><b>{item.business_name}</b><small>{item.lost_reason || "Chưa ghi lý do"}</small></span><ChevronRight/></button>)}</section>}

    </>}

    <div className={styles.enquiries}><EventEnquiryInbox supabase={supabase} refreshKey={opportunities} onOpenOpportunity={openEventOpportunity}/></div>
    {selected && <div className={styles.overlay} onPointerDown={(event) => { if (event.target === event.currentTarget) closeSelected(); }}><aside ref={dialogRef} tabIndex={-1} className={styles.drawer} aria-label="Chi tiết cơ hội" role="dialog" aria-modal="true">
      <header><div><p>{stageLabel(selected.stage)}</p><h2>{selected.business_name}</h2><span>{selected.preferred_contact || selected.contact}</span></div><button type="button" onClick={closeSelected} aria-label="Đóng"><X/></button></header>
      <section className={styles.categoryEditor} aria-label="Thông tin liên hệ"><div className={styles.contactHeading}><strong>Thông tin khách hàng</strong><button type="button" onClick={() => setEditing({...selected, next_action_at:selected.next_action_at?.slice(0,10) || ""})}>Sửa hồ sơ</button></div><label>Liên hệ ưu tiên<select value={contactCandidates(selected, orders, directoryLinks).find(value => normalizeContact(value) === normalizeContact(selected.preferred_contact || selected.contact || "")) || ""} disabled={contactSaving} onChange={e => saveContacts({preferred_contact:e.target.value})}>{contactCandidates(selected, orders, directoryLinks).map(value => <option key={value} value={value}>{value}{normalizeContact(value) === normalizeContact(selected.contact) ? " · liên hệ gốc" : ""}</option>)}</select></label><div className={styles.contactAdd}><input value={contactDraft} onChange={e => setContactDraft(e.target.value)} placeholder="Thêm số điện thoại hoặc email" aria-label="Liên hệ bổ sung" maxLength={120}/><button type="button" disabled={contactSaving} onClick={addContact}>Thêm liên hệ</button></div><small>Liên hệ gốc được giữ để đối chiếu đơn cũ. Số ưu tiên hiển thị trong hồ sơ và dùng cho báo giá mới; hãy kiểm tra trước khi gửi.</small>{contactFeedback && <p role="status">{contactFeedback}</p>}</section>
      <section className={styles.categoryEditor}><strong>Sản phẩm quan tâm</strong><span>{selected.product_interest || "Chưa ghi nhận"}</span><small>Chỉnh sửa trong hồ sơ khách hàng.</small></section>
      <section className={styles.categoryEditor}><label>Loại khách hàng<select value={selected.customer_category || ""} disabled={categorySaving} onChange={e => updateCategory(e.target.value)}><option value="">Chưa phân loại</option>{CUSTOMER_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}{c.hint ? ` · ${c.hint}` : ""}</option>)}</select></label><small>Chọn theo thực tế; mức kg/tháng chỉ để tham khảo.</small>{categoryError && <p role="alert">{categoryError}</p>}</section>
      {directoryLinks.some(link => link.opportunity_id === selected.id) && <section className={styles.categoryEditor}><strong>Đơn đã nối thủ công</strong>{directoryLinks.filter(link => link.opportunity_id === selected.id).map(link => {const order=orders.find(o => o.id === link.order_id); return <div className={styles.manualLink} key={link.order_id}><span>{order?.customer_name || "Đơn hàng"} · {shortDate(order?.ts)} · {order?.contact || ""}</span><button type="button" disabled={directoryBusy} onClick={() => unlinkOrder(link.order_id)}>Gỡ nối</button></div>;})}<small>Gỡ nối không xóa đơn; hệ thống vẫn có thể ghép theo liên hệ hoặc báo giá.</small></section>}
      <PartnerReferralLink key={selected.id} opportunityId={selected.id}/>
      <section className={styles.next}><span>Bước tiếp theo</span><h3>{selected.next_action || "Chưa đặt bước tiếp theo"}</h3><time>{shortDate(selected.next_action_at)}</time><p>Phụ trách: {selected.owner || "Chưa phân công"}</p><div><button onClick={() => setEditing({ ...selected, next_action_at: selected.next_action_at?.slice(0, 10) || "" })}>Sửa nhịp làm việc</button><Link className={styles.recipeBridge} href={`/admin/recipes?view=lab&opportunity=${encodeURIComponent(selected.id)}`}><FlaskConical/>Mở phòng công thức</Link></div></section>
      <CustomerJourneyPanel primaryActionTitle={selected.prospect_suppressed?"Không liên hệ · chỉ xử lý giao dịch đã có":selected.next_action} journey={selectedJourney} onCommand={runJourneyCommand}/>
      <PipelineSample key={selected.id} opportunity={selected} supabase={supabase} samples={samples} onCreated={async()=>{await load();const {data}=await supabase.from('trade_opportunities').select('*').eq('id',selected.id).single();if(data)setSelected(data);}}/>
      <section className={styles.progress}><header><h3>Chuyển giai đoạn</h3><span>{Number(selected.monthly_potential_kg)>0?`${formatMassKg(selected.monthly_potential_kg)}/tháng`:'Chưa xác minh sản lượng'}</span></header><div>{TRADE_STAGES.map((stage) => <button key={stage.id} data-active={selected.stage === stage.id} disabled={selected.prospect_suppressed&&["sample_requested","sample_sent","feedback","quoted"].includes(stage.id)} onClick={() => moveStage(stage.id)}>{stage.short}</button>)}<button data-lost onClick={() => moveStage("lost")}>Tạm dừng</button></div></section>
      <section className={styles.priceBook}>
        <header><div><p>Partner price ledger</p><h3>Giá riêng đang áp dụng</h3></div><div className={styles.priceActions}><Link className={styles.priceCalculator} href={pricingHref(selected.id)}><Calculator/>Tính giá riêng</Link><button disabled={selected.prospect_suppressed} onClick={() => setPriceDraft(newPriceAgreement(selected, latestAgreement))}><Plus/>{latestAgreement ? "Phiên bản mới" : "Thiết lập giá"}</button></div></header>
        {latestAgreement ? <>
          <article className={styles.activePrice} data-expired={!activeAgreement}>
            <header><span><b>Phiên bản {latestAgreement.version}</b><small>Từ {shortDate(latestAgreement.effective_from)} · {latestAgreement.valid_until ? `đến ${shortDate(latestAgreement.valid_until)}` : "vô thời hạn"}</small></span><i>{activeAgreement ? "Đang dùng" : "Hết hiệu lực"}</i></header>
            <div className={styles.priceTimeline}><span/><p>Rà soát lại <b>{latestAgreement.review_at ? shortDate(latestAgreement.review_at) : "chưa đặt lịch"}</b></p></div>
            <div className={styles.priceRules}>{latestAgreement.partner_price_rules.map((rule) => <div key={rule.id}><span><b>{rule.product_name?.vi || rule.product_name?.en}</b><small>Tối thiểu {Number(rule.minimum_quantity)} {sellingUnitLabel(rule.unit)}</small></span><strong>{money(rule.price)}</strong></div>)}</div>
            <footer><div><span>{latestAgreement.includes_vat ? "Đã gồm VAT" : "Chưa gồm VAT"}</span><span>{latestAgreement.includes_delivery ? "Đã gồm giao hàng" : "Chưa gồm giao hàng"}</span></div>{latestAgreement.payment_terms && <p>{latestAgreement.payment_terms}</p>}{activeAgreement ? <button disabled={selected.prospect_suppressed} onClick={() => setQuoteDraft(newQuote(selected, activeAgreement))}><FileText/>Tạo báo giá từ bảng giá</button> : <button disabled={selected.prospect_suppressed} onClick={() => setPriceDraft(newPriceAgreement(selected, latestAgreement))}><RefreshCw/>Gia hạn bằng phiên bản mới</button>}</footer>
          </article>
          {selectedAgreements.length > 1 && <details className={styles.priceHistory}><summary><History/>Xem {selectedAgreements.length - 1} phiên bản trước</summary>{selectedAgreements.filter((agreement) => agreement.status !== "active").map((agreement) => <div key={agreement.id}><span><b>Phiên bản {agreement.version}</b><small>{shortDate(agreement.effective_from)} – {agreement.valid_until ? shortDate(agreement.valid_until) : "vô thời hạn"}</small></span><small>{agreement.created_by || "Nhân viên"}</small></div>)}</details>}
        </> : <div className={styles.emptyPrice}><BadgeDollarSign/><p><b>Chưa có giá thỏa thuận.</b><span>Lưu giá riêng để các báo giá sau tự điền đúng mức đã chốt với đối tác này.</span></p></div>}
      </section>
      <section className={styles.quoteBook} id="customer-quotes"><header><div><p>Quote book</p><h3>Báo giá</h3></div><button disabled={selected.prospect_suppressed} onClick={() => setQuoteDraft(newQuote(selected, activeAgreement))}><Plus/>Tạo báo giá</button></header>{selectedQuotes.length ? selectedQuotes.map((quote) => <article key={quote.id}><header><span><b>{quote.id}</b><small>{shortDate(quote.created_at)} · {quote.valid_until ? `hiệu lực ${shortDate(quote.valid_until)}` : "vô thời hạn"}</small></span><i data-status={quote.status}>{QUOTE_STATUS[quote.status]}</i></header><div>{quote.lines.map((line, index) => <span key={index}>{line.name?.vi || line.name?.en} · {line.qty} {sellingUnitLabel(line.unit)}</span>)}</div><footer><b>{money(quote.total)}</b><div><button disabled={selected.prospect_suppressed} onClick={() => copyQuote(quote)}><Clipboard/>Sao chép</button>{quote.status === "draft" && <button disabled={selected.prospect_suppressed} onClick={() => setQuoteStatus(quote, "sent")}><Send/>Đã gửi</button>}{quote.status === "sent" && <button onClick={() => setQuoteStatus(quote, "accepted")}><Check/>Đồng ý</button>}{quote.status === "accepted" && <button className={styles.convert} onClick={() => convertQuote(quote)} disabled={saving}>Tạo đơn<ArrowRight/></button>}{quote.converted_order_id && <Link href="/admin/orders">{quote.converted_order_id}<ArrowRight/></Link>}</div></footer></article>) : <div className={styles.emptyQuote}><FileText/><p>Chưa có báo giá. Tạo bản đầu tiên từ danh mục đang bán.</p></div>}</section>
      {selected.notes && <section className={styles.notes}><h3>Ghi chú quan hệ</h3><p>{selected.notes}</p></section>}
    </aside></div>}

    {editing && <div className={styles.overlay}><form className={styles.editDrawer} onSubmit={saveOpportunity}><header><div><p>Relationship record</p><h2>{editing.id ? "Sửa hồ sơ khách hàng" : "Thêm khách hàng"}</h2></div><button type="button" onClick={() => setEditing(null)} aria-label="Đóng"><X/></button></header><label>Tên doanh nghiệp<input autoFocus required value={editing.business_name} onChange={(event) => setEditing({ ...editing, business_name: event.target.value })}/></label><label>Liên hệ gốc (dùng đối chiếu lịch sử)<input required value={editing.contact} onChange={(event) => setEditing({ ...editing, contact: event.target.value })}/></label><div className={styles.formGrid}><label>Giai đoạn<select value={editing.stage} onChange={(event) => setEditing({ ...editing, stage: event.target.value })}>{TRADE_STAGES.map((stage) => <option key={stage.id} value={stage.id}>{stage.label}</option>)}<option value="lost">Tạm dừng</option></select></label><label>Tiềm năng kg/tháng<FormattedNumberInput min="0" value={editing.monthly_potential_kg} onChange={(event) => setEditing({ ...editing, monthly_potential_kg: event.target.value })}/></label></div><div className={styles.interestEditor}><label htmlFor="customer-interest-select">Sản phẩm quan tâm</label><select id="customer-interest-select" value="" onChange={event => setEditing({ ...editing, product_interest: addInterest(editing.product_interest, event.target.value) })}><option value="">Chọn sản phẩm để thêm</option>{products.map(product => <option key={product.id} value={product.name?.vi || product.name?.en || ""}>{product.name?.vi || product.name?.en}</option>)}</select>{interestItems(editing.product_interest).length > 0 && <div className={styles.interestChips}>{interestItems(editing.product_interest).map((name, index) => <span key={`${name}-${index}`}>{name}<button type="button" aria-label={`Bỏ ${name}`} onClick={() => setEditing({ ...editing, product_interest: removeInterest(editing.product_interest, index) })}>×</button></span>)}</div>}<label htmlFor="customer-interest-notes">Sửa danh sách hoặc thêm nhu cầu khác</label><input id="customer-interest-notes" maxLength={500} value={editing.product_interest || ""} onChange={event => setEditing({ ...editing, product_interest: event.target.value })} placeholder="Ngăn cách các loại bằng dấu phẩy"/><small>Chọn nhiều sản phẩm; có thể thêm loại chưa có trong danh mục.</small></div><label>Người phụ trách<input value={editing.owner || ""} onChange={(event) => setEditing({ ...editing, owner: event.target.value })} placeholder={email}/></label><label>Bước tiếp theo<input value={editing.next_action || ""} onChange={(event) => setEditing({ ...editing, next_action: event.target.value })}/></label><label>Ngày quay lại<input type="date" value={editing.next_action_at || ""} onChange={(event) => setEditing({ ...editing, next_action_at: event.target.value })}/></label>{editing.stage === "lost" && <label>Lý do tạm dừng<input value={editing.lost_reason || ""} onChange={(event) => setEditing({ ...editing, lost_reason: event.target.value })} placeholder="Chưa đúng thời điểm, ngân sách, không phản hồi…"/></label>}<label>Ghi chú<textarea rows="5" value={editing.notes || ""} onChange={(event) => setEditing({ ...editing, notes: event.target.value })}/></label>{error && <p role="alert">{error}</p>}<button className={styles.primary} disabled={saving}><Save/>{saving ? "Đang lưu…" : "Lưu hồ sơ"}</button></form></div>}

    {priceDraft && <div className={styles.overlay}><form className={`${styles.editDrawer} ${styles.priceDrawer}`} onSubmit={savePriceAgreement}><header><div><p>Partner price ledger</p><h2>{activeAgreement ? `Phiên bản giá ${activeAgreement.version + 1}` : "Bảng giá riêng"}</h2></div><button type="button" onClick={() => setPriceDraft(null)} aria-label="Đóng"><X/></button></header><p className={styles.formIntro}>Bản mới sẽ thay phiên bản đang dùng. Báo giá và đơn hàng cũ không thay đổi.</p><div className={styles.formGrid}><label>Áp dụng từ<input required type="date" max={today} value={priceDraft.effective_from} onChange={(event) => setPriceDraft({ ...priceDraft, effective_from: event.target.value })}/></label><label>Rà soát lại<input type="date" min={today} value={priceDraft.review_at} onChange={(event) => setPriceDraft({ ...priceDraft, review_at: event.target.value })}/></label></div><div className={styles.validityChoice}><label><input type="checkbox" checked={priceDraft.is_indefinite} onChange={(event) => setPriceDraft({ ...priceDraft, is_indefinite: event.target.checked, valid_until: event.target.checked ? "" : priceDraft.valid_until || dateInput(90) })}/><span><b>Vô thời hạn</b><small>Giữ giá đến khi tạo phiên bản mới</small></span></label>{!priceDraft.is_indefinite && <label>Hiệu lực đến<input required type="date" min={priceDraft.effective_from || today} value={priceDraft.valid_until} onChange={(event) => setPriceDraft({ ...priceDraft, valid_until: event.target.value })}/></label>}</div><section className={`${styles.quoteLines} ${styles.priceLines}`}><header><h3>Giá theo sản phẩm</h3><button type="button" onClick={() => setPriceDraft({ ...priceDraft, lines: [...priceDraft.lines, blankPriceLine()] })}><Plus/>Thêm dòng</button></header>{priceDraft.lines.map((line, index) => <TradeLineFields key={line.id} line={line} index={index} products={orderableProducts} quantityKey="minimum_quantity" onChange={updated => setPriceDraft({ ...priceDraft, lines: priceDraft.lines.map(item => item.id === line.id ? updated : item) })} removeDisabled={priceDraft.lines.length === 1} onRemove={() => setPriceDraft({ ...priceDraft, lines: priceDraft.lines.filter(item => item.id !== line.id) })} />)}<p className={styles.unitHelp}>Chọn đơn vị đã thỏa thuận. Đổi đơn vị cần nhập lại giá; hệ thống không tự đổi gói / viên / bánh sang kg.</p></section><fieldset className={styles.inclusions}><legend>Giá đã bao gồm</legend><label><input type="checkbox" checked={priceDraft.includes_vat} onChange={(event) => setPriceDraft({ ...priceDraft, includes_vat: event.target.checked })}/>VAT</label><label><input type="checkbox" checked={priceDraft.includes_delivery} onChange={(event) => setPriceDraft({ ...priceDraft, includes_delivery: event.target.checked })}/>Vận chuyển</label></fieldset><label>Điều khoản thanh toán<input value={priceDraft.payment_terms} onChange={(event) => setPriceDraft({ ...priceDraft, payment_terms: event.target.value })}/></label><label>Lý do / ghi chú phiên bản<textarea rows="3" value={priceDraft.note} onChange={(event) => setPriceDraft({ ...priceDraft, note: event.target.value })} placeholder="Ví dụ: điều chỉnh theo sản lượng cam kết quý IV"/></label><button className={styles.primary} disabled={saving}><Save/>{saving ? "Đang lưu…" : "Áp dụng phiên bản giá"}</button></form></div>}

    {quoteDraft && <div className={styles.overlay}><form className={`${styles.editDrawer} ${styles.quoteDrawer}`} onSubmit={saveQuote}><header><div><p>Wholesale quotation</p><h2>Báo giá mới</h2></div><button type="button" onClick={() => setQuoteDraft(null)} aria-label="Đóng"><X/></button></header>{quoteDraft.priceAgreementId && <p className={styles.appliedPrice}><BadgeDollarSign/>Đang dùng bảng giá riêng phiên bản {activeAgreement?.version}</p>}<div className={styles.formGrid}><label>Khách hàng<input value={quoteDraft.customer_name} onChange={(event) => setQuoteDraft({ ...quoteDraft, customer_name: event.target.value })}/></label><div className={styles.validityChoice}><label><input type="checkbox" checked={quoteDraft.is_indefinite} onChange={(event) => setQuoteDraft({ ...quoteDraft, is_indefinite: event.target.checked, valid_until: event.target.checked ? "" : quoteDraft.valid_until || dateInput(14) })}/><span><b>Vô thời hạn</b><small>Không đặt ngày hết hiệu lực</small></span></label>{!quoteDraft.is_indefinite && <label>Hiệu lực đến<input required type="date" min={today} value={quoteDraft.valid_until} onChange={(event) => setQuoteDraft({ ...quoteDraft, valid_until: event.target.value })}/></label>}</div></div><label>Địa chỉ<input value={quoteDraft.address} onChange={(event) => setQuoteDraft({ ...quoteDraft, address: event.target.value })}/></label><section className={styles.quoteLines}><header><h3>Sản phẩm</h3><button type="button" onClick={() => setQuoteDraft({ ...quoteDraft, lines: [...quoteDraft.lines, blankQuoteLine()] })}><Plus/>Thêm dòng</button></header>{quoteDraft.lines.map((line, index) => <TradeLineFields key={line.id} line={line} index={index} products={orderableProducts} quantityKey="qty" agreement={activeAgreement} onChange={updated => setQuoteDraft({ ...quoteDraft, lines: quoteDraft.lines.map(item => item.id === line.id ? updated : item) })} removeDisabled={quoteDraft.lines.length === 1} onRemove={() => setQuoteDraft({ ...quoteDraft, lines: quoteDraft.lines.filter(item => item.id !== line.id) })} />)}<p className={styles.unitHelp}>Giá và số lượng dùng cùng đơn vị. Đổi đơn vị cần nhập lại giá; quy cách 500g là một gói, không tự coi là 500 kg hay 0,5 kg.</p></section><div className={styles.formGrid}><label>Chiết khấu %<FormattedNumberInput min="0" max="100" value={quoteDraft.discount_percent} onChange={(event) => setQuoteDraft({ ...quoteDraft, discount_percent: event.target.value })}/></label><label>Thanh toán<select value={quoteDraft.payment_method} onChange={(event) => setQuoteDraft({ ...quoteDraft, payment_method: event.target.value })}><option value="qr">Chuyển khoản QR</option><option value="cash">Tiền mặt</option></select></label></div><label>Điều khoản<textarea rows="3" value={quoteDraft.terms} onChange={(event) => setQuoteDraft({ ...quoteDraft, terms: event.target.value })}/></label><label>Ghi chú nội bộ<textarea rows="2" value={quoteDraft.note} onChange={(event) => setQuoteDraft({ ...quoteDraft, note: event.target.value })}/></label><div className={styles.quoteTotal}><span>Tổng dự kiến<Link href={pricingHref(selected.id, quoteDraft.lines[0]?.productKey)} target="_blank"><Calculator/>Kiểm tra biên</Link></span><b>{money(Math.round(quoteDraft.lines.reduce((sum, line) => sum + (Number(line.price) || 0) * (Number(line.qty) || 0), 0) * (1 - (Number(quoteDraft.discount_percent) || 0) / 100)))}</b></div><button className={styles.primary} disabled={saving}><Save/>{saving ? "Đang lưu…" : "Lưu bản nháp"}</button></form></div>}
  </main>;
}

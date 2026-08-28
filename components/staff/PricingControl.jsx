"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  Calculator,
  Check,
  ChevronRight,
  CircleDollarSign,
  Handshake,
  History,
  Package,
  RefreshCw,
  Save,
  Scale,
  ShieldCheck,
  Target,
} from "lucide-react";
import FormattedNumberInput from "@/components/FormattedNumberInput";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { calculatePricing, DEFAULT_PRICING_INPUTS, packGramsFromLabel } from "@/lib/pricing";
import styles from "./PricingControl.module.css";

const COPY = {
  vi: {
    back: "Vận hành",
    room: "Price room",
    owner: "Giá & biên lợi nhuận",
    eyebrow: "Từ giá vốn đến giá bán",
    title: "Biết mức giá thấp nhất trước khi thương lượng.",
    intro: "Chi phí thật, giá an toàn và biên lợi nhuận cho từng quy cách, từng đối tác.",
    refresh: "Tải lại dữ liệu giá",
    calculator: "Bài tính đang mở",
    scenarioName: "Tên bài tính",
    scenarioPlaceholder: "Ví dụ: Shan Tuyết 100g · giá sỉ quý IV",
    product: "Sản phẩm / quy cách",
    noProduct: "Chưa gắn sản phẩm",
    batch: "Lô dùng làm giá vốn",
    manualCost: "Nhập giá vốn thủ công",
    partner: "Đối tác áp dụng",
    noPartner: "Chưa gắn đối tác",
    channel: "Kênh chính",
    b2b: "B2B / pha chế",
    retail: "Bán lẻ",
    costSection: "01 · Chi phí thật",
    commercialSection: "02 · Điều kiện bán",
    teaCost: "Giá trà đầu vào / kg",
    yield: "Tỷ lệ thành phẩm",
    processing: "Chế biến / kg",
    labour: "Nhân công / kg",
    packaging: "Bao bì / gói",
    label: "Nhãn / gói",
    packGrams: "Khối lượng gói",
    brewGrams: "Gram trà / khẩu phần",
    delivery: "Giao hàng / đơn",
    orderKg: "Sản lượng đơn",
    overhead: "Phân bổ chi phí chung",
    channelFee: "Phí kênh / hoa hồng",
    vat: "VAT",
    b2bMargin: "Biên mục tiêu B2B",
    retailMargin: "Biên mục tiêu bán lẻ",
    discount: "Chiết khấu đối tác",
    currentPricePack: "Giá đang bán / gói",
    currentPriceKg: "Giá đang bán / kg",
    partnerUnit: "Đơn vị giá riêng",
    minimumQuantity: "Số lượng tối thiểu",
    kg: "Theo kg",
    pack: "Theo gói",
    costTruth: "Giá vốn đã phân bổ",
    perKg: "mỗi kg thành phẩm",
    perPack: "mỗi gói",
    perServing: "mỗi khẩu phần pha",
    ladder: "Thang giá quyết định",
    floor: "Sàn an toàn",
    partnerPrice: "Giá đối tác",
    b2bList: "Giá niêm yết B2B",
    retailPrice: "Giá bán lẻ",
    afterDiscount: "sau chiết khấu, đã gồm VAT",
    currentMargin: "Biên của giá hiện tại",
    orderProfit: "Lợi nhuận dự kiến / đơn",
    breakEven: "Số gói hòa vốn phí giao",
    marginFeel: "Cảm nhận biên lợi nhuận",
    marginEyebrow: "Mỗi 100đ doanh thu chưa VAT",
    profitShare: "Lợi nhuận giữ lại",
    feeShare: "Phí kênh",
    costShare: "Phần dành cho chi phí",
    currentPriceMargin: "Biên của giá hiện tại",
    workingRangeB2b: "Vùng làm việc B2B của Nhà: 28–38%",
    workingRangeRetail: "Vùng làm việc bán lẻ của Nhà: 42–58%",
    marginLoss: "Đang lỗ — giá bán chưa bù đủ các chi phí đã nhập.",
    marginThin: "Quá mỏng — gần như không còn chỗ cho hao hụt hoặc thương lượng.",
    marginTight: "Khá chặt — chỉ ổn khi sản lượng và chi phí thật sự ổn định.",
    marginRight: "Đúng vùng — có khoảng đệm hợp lý cho kênh bán này.",
    marginStrong: "Biên dày — kiểm tra thêm sức cạnh tranh của giá bán.",
    marginPremium: "Biên rất cao — nên xác nhận khách vẫn chấp nhận mức giá này.",
    marginNote: "Thước cảm nhận nhanh, không phải lợi nhuận kế toán. Chưa gồm chi phí bạn chưa nhập và thuế thu nhập doanh nghiệp.",
    missingCost: "Chưa có giá trà đầu vào. Kết quả chưa dùng để quyết định được.",
    belowFloor: "Giá hiện tại thấp hơn sàn an toàn sau khi tính đủ chi phí.",
    unworkable: "Biên mục tiêu và phí kênh quá cao để hình thành mức giá hợp lệ.",
    missingVolume: "Cần sản lượng đơn để phân bổ phí giao hàng.",
    noWarnings: "Cấu trúc giá đang nằm trên sàn chi phí.",
    save: "Lưu bài tính",
    saving: "Đang lưu…",
    applyCatalogue: "Áp giá bán lẻ vào danh mục",
    applyPartner: "Tạo phiên bản giá riêng",
    saveFirst: "Hệ thống sẽ lưu bài tính trước khi áp dụng.",
    catalogueGuard: "Giá công khai sẽ đổi sang",
    partnerGuard: "Một phiên bản giá riêng mới sẽ thay phiên bản đang dùng. Báo giá và đơn cũ không đổi.",
    saved: "Đã lưu bài tính giá.",
    catalogueApplied: "Đã áp giá bán lẻ vào danh mục.",
    partnerApplied: "Đã tạo phiên bản giá riêng cho đối tác.",
    loadError: "Chưa tải được dữ liệu tính giá. Kiểm tra migration 0039 rồi thử lại.",
    saveError: "Chưa lưu được bài tính giá.",
    applyError: "Chưa áp dụng được mức giá. Dữ liệu trực tiếp chưa thay đổi.",
    history: "Bài tính gần đây",
    draft: "Bản nháp",
    applied: "Đã áp dụng",
    emptyHistory: "Chưa có bài tính đã lưu. Bắt đầu từ một sản phẩm hoặc một đối tác.",
    openScenario: "Mở lại bài tính này",
    migration: "Cần chạy migration 0039 để lưu lịch sử; phép tính vẫn hoạt động tại chỗ.",
    nothingSelected: "Chọn sản phẩm trước khi áp giá.",
    partnerRequired: "Chọn đối tác trước khi tạo giá riêng.",
  },
  en: {
    back: "Operations",
    room: "Price room",
    owner: "Price & margin",
    eyebrow: "From cost to selling price",
    title: "Know the lowest safe price before you negotiate.",
    intro: "True cost, safe price and margin for each pack and each partner.",
    refresh: "Reload pricing data",
    calculator: "Open calculation",
    scenarioName: "Calculation name",
    scenarioPlaceholder: "Example: Shan Tuyết 100g · Q4 wholesale",
    product: "Product / pack",
    noProduct: "No product attached",
    batch: "Batch used for tea cost",
    manualCost: "Enter tea cost manually",
    partner: "Partner to apply",
    noPartner: "No partner attached",
    channel: "Primary channel",
    b2b: "B2B / beverage",
    retail: "Retail",
    costSection: "01 · True cost",
    commercialSection: "02 · Selling terms",
    teaCost: "Tea input cost / kg",
    yield: "Usable yield",
    processing: "Processing / kg",
    labour: "Labour / kg",
    packaging: "Packaging / pack",
    label: "Label / pack",
    packGrams: "Pack weight",
    brewGrams: "Tea grams / serving",
    delivery: "Delivery / order",
    orderKg: "Order volume",
    overhead: "Overhead allocation",
    channelFee: "Channel fee / commission",
    vat: "VAT",
    b2bMargin: "Target B2B margin",
    retailMargin: "Target retail margin",
    discount: "Partner discount",
    currentPricePack: "Current price / pack",
    currentPriceKg: "Current price / kg",
    partnerUnit: "Private-price unit",
    minimumQuantity: "Minimum quantity",
    kg: "Per kg",
    pack: "Per pack",
    costTruth: "Allocated true cost",
    perKg: "per sellable kg",
    perPack: "per pack",
    perServing: "per brewed serving",
    ladder: "Decision price ladder",
    floor: "Safe floor",
    partnerPrice: "Partner price",
    b2bList: "B2B list price",
    retailPrice: "Retail price",
    afterDiscount: "after discount, VAT included",
    currentMargin: "Margin at current price",
    orderProfit: "Expected profit / order",
    breakEven: "Packs to cover delivery",
    marginFeel: "Margin feel",
    marginEyebrow: "For every 100₫ of revenue before VAT",
    profitShare: "Profit retained",
    feeShare: "Channel fee",
    costShare: "Cost allowance",
    currentPriceMargin: "Margin at current price",
    workingRangeB2b: "House B2B working range: 28–38%",
    workingRangeRetail: "House retail working range: 42–58%",
    marginLoss: "Loss-making — the selling price does not cover the costs entered.",
    marginThin: "Too thin — almost no room remains for waste or negotiation.",
    marginTight: "Tight — workable only when volume and costs stay predictable.",
    marginRight: "In range — a practical buffer for this selling channel.",
    marginStrong: "Strong margin — check that the selling price still competes.",
    marginPremium: "Very high margin — validate that customers still accept the price.",
    marginNote: "A quick commercial guide, not accounting profit. It excludes costs you have not entered and corporate income tax.",
    missingCost: "Tea input cost is missing. Do not use this result for a decision yet.",
    belowFloor: "The current price is below the safe floor after all entered costs.",
    unworkable: "The target margin and channel fee are too high to produce a valid price.",
    missingVolume: "Order volume is required to allocate delivery cost.",
    noWarnings: "This price structure is above its cost floor.",
    save: "Save calculation",
    saving: "Saving…",
    applyCatalogue: "Apply retail price to catalogue",
    applyPartner: "Create private-price version",
    saveFirst: "The calculation will be saved before a price is applied.",
    catalogueGuard: "The public price will change to",
    partnerGuard: "A new private-price version will replace the active version. Earlier quotations and orders stay unchanged.",
    saved: "Pricing calculation saved.",
    catalogueApplied: "Retail price applied to the catalogue.",
    partnerApplied: "New private-price version created for the partner.",
    loadError: "Pricing data could not load. Check migration 0039 and try again.",
    saveError: "The pricing calculation could not be saved.",
    applyError: "The price could not be applied. Live data was not changed.",
    history: "Recent calculations",
    draft: "Draft",
    applied: "Applied",
    emptyHistory: "No saved calculations yet. Start from a product or partner.",
    openScenario: "Open this calculation again",
    migration: "Migration 0039 is required for history; the calculator still works locally.",
    nothingSelected: "Choose a product before applying a price.",
    partnerRequired: "Choose a partner before creating a private price.",
  },
};

const money = (value) => `${Number(value || 0).toLocaleString("vi-VN")} ₫`;
const date = (value, locale) => value
  ? new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "vi-VN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value))
  : "—";
const productKey = (productId, weight = "") => weight ? `${productId}__${weight}` : productId;
const splitProductKey = (value = "") => {
  const [productId = "", variantWeight = ""] = value.split("__");
  return { productId, variantWeight };
};
const buildSkuOptions = (products, variants) => products.flatMap((product) => {
  const productVariants = variants.filter((variant) => variant.product_id === product.id);
  if (!productVariants.length) return [{ key: product.id, product, weight: "", price: product.price }];
  return productVariants.map((variant) => ({
    key: productKey(product.id, variant.weight),
    product,
    weight: variant.weight,
    price: variant.price,
  }));
});
const addDays = (days) => {
  const value = new Date();
  value.setDate(value.getDate() + days);
  return value.toISOString().slice(0, 10);
};

function NumberField({ label, suffix, value, onChange, step, min = "0" }) {
  return (
    <label className={styles.numberField}>
      <span>{label}</span>
      <span className={styles.inputShell}>
        <FormattedNumberInput value={value} onChange={onChange} min={min} step={step} />
        {suffix && <small>{suffix}</small>}
      </span>
    </label>
  );
}

export default function PricingControl({ supabase, email }) {
  const { locale } = useLocale();
  const t = COPY[locale];
  const [products, setProducts] = useState([]);
  const [variants, setVariants] = useState([]);
  const [batches, setBatches] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [scenarios, setScenarios] = useState([]);
  const [scenarioId, setScenarioId] = useState("");
  const [scenarioName, setScenarioName] = useState("");
  const [channel, setChannel] = useState("b2b");
  const [selectedKey, setSelectedKey] = useState("");
  const [batchId, setBatchId] = useState("");
  const [opportunityId, setOpportunityId] = useState("");
  const [inputs, setInputs] = useState(DEFAULT_PRICING_INPUTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [historyAvailable, setHistoryAvailable] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const skuOptions = useMemo(() => buildSkuOptions(products, variants), [products, variants]);
  const selectedSku = skuOptions.find((item) => item.key === selectedKey) || null;
  const selectedProductBatches = batches.filter((item) => !selectedSku || item.product_id === selectedSku.product.id);
  const results = useMemo(() => calculatePricing(inputs), [inputs]);
  const activeTargetMargin = Number(channel === "retail" ? inputs.retailMarginPercent : inputs.b2bMarginPercent) || 0;
  const activeProposedPrice = channel === "retail" ? results.retailPricePerKg : results.b2bPartnerPricePerKg;
  const calculatedMargin = channel === "retail" ? results.retailMarginPercent : results.b2bMarginPercent;
  const activeMargin = activeProposedPrice > 0 ? calculatedMargin : activeTargetMargin;
  const activeProfitPerOrder = channel === "retail" ? results.retailProfitPerOrder : results.b2bProfitPerOrder;

  const flash = (message) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2400);
  };

  const selectSku = (key) => {
    setSelectedKey(key);
    const sku = skuOptions.find((item) => item.key === key);
    if (!sku) return;
    const latestBatch = batches.find((item) => item.product_id === sku.product.id && Number(item.cost_per_kg) > 0);
    setBatchId(latestBatch?.id || "");
    setInputs((current) => ({
      ...current,
      teaCostPerKg: latestBatch?.cost_per_kg ?? current.teaCostPerKg,
      packGrams: packGramsFromLabel(sku.weight || sku.product.pack_size),
      currentPrice: sku.price ?? 0,
      currentPriceUnit: sku.product.line === "everyday" ? "kg" : "pack",
    }));
    if (!scenarioName) setScenarioName(`${sku.product.name?.vi || sku.product.name?.en}${sku.weight ? ` · ${sku.weight}` : ""}`);
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const [productResult, variantResult, batchResult, opportunityResult, scenarioResult] = await Promise.all([
      supabase.from("catalog_products").select("id,name,pack_size,price,kind,line,available").order("line"),
      supabase.from("catalog_variants").select("product_id,weight,price").order("weight"),
      supabase.from("tea_batches").select("id,code,product_id,cost_per_kg,status,created_at").order("created_at", { ascending: false }),
      supabase.from("trade_opportunities").select("id,business_name,contact,stage").order("updated_at", { ascending: false }),
      supabase.from("pricing_scenarios").select("*").order("updated_at", { ascending: false }).limit(20),
    ]);
    if (productResult.error || variantResult.error || batchResult.error || opportunityResult.error) {
      setError(t.loadError);
    }
    const nextProducts = productResult.data || [];
    const nextVariants = variantResult.data || [];
    const nextBatches = batchResult.data || [];
    setProducts(nextProducts);
    setVariants(nextVariants);
    setBatches(nextBatches);
    setOpportunities(opportunityResult.data || []);
    if (scenarioResult.error) {
      setHistoryAvailable(false);
      setScenarios([]);
    } else {
      setHistoryAvailable(true);
      setScenarios(scenarioResult.data || []);
    }

    const query = new URLSearchParams(window.location.search);
    const requestedProduct = query.get("product") || "";
    const requestedVariant = query.get("variant") || "";
    const requestedOpportunity = query.get("opportunity") || "";
    const requestedChannel = query.get("channel");
    if (requestedOpportunity) setOpportunityId(requestedOpportunity);
    if (requestedChannel === "b2b" || requestedChannel === "retail") setChannel(requestedChannel);
    else if (requestedOpportunity) setChannel("b2b");
    else if (requestedProduct) setChannel("retail");
    if (requestedProduct) {
      const requestedKey = productKey(requestedProduct, requestedVariant);
      const sku = buildSkuOptions(nextProducts, nextVariants).find((item) => item.key === requestedKey);
      setSelectedKey(requestedKey);
      if (sku) {
        const latestBatch = nextBatches.find((item) => item.product_id === sku.product.id && Number(item.cost_per_kg) > 0);
        setBatchId(latestBatch?.id || "");
        setInputs((current) => ({
          ...current,
          teaCostPerKg: latestBatch?.cost_per_kg ?? current.teaCostPerKg,
          packGrams: packGramsFromLabel(sku.weight || sku.product.pack_size),
          currentPrice: sku.price ?? 0,
          currentPriceUnit: sku.product.line === "everyday" ? "kg" : "pack",
        }));
        setScenarioName((current) => current || `${sku.product.name?.vi || sku.product.name?.en}${sku.weight ? ` · ${sku.weight}` : ""}`);
      }
    }
    setLoading(false);
  }, [supabase, t.loadError]);

  useEffect(() => {
    load();
  }, [load]);

  const updateInput = (key) => (event) => setInputs((current) => ({ ...current, [key]: event.target.value }));
  const chooseBatch = (event) => {
    const nextId = event.target.value;
    setBatchId(nextId);
    const selected = batches.find((item) => item.id === nextId);
    if (selected) setInputs((current) => ({ ...current, teaCostPerKg: selected.cost_per_kg || 0 }));
  };

  const saveScenario = async ({ quiet = false } = {}) => {
    if (!historyAvailable) {
      setError(t.migration);
      return "";
    }
    if (!scenarioName.trim()) {
      setError(t.scenarioPlaceholder);
      return "";
    }
    setSaving(true);
    setError("");
    const { productId, variantWeight } = splitProductKey(selectedKey);
    const { data, error: saveError } = await supabase.rpc("save_pricing_scenario", {
      p_id: scenarioId || null,
      p_name: scenarioName.trim(),
      p_product_id: productId || null,
      p_variant_weight: variantWeight,
      p_opportunity_id: opportunityId || null,
      p_channel: channel,
      p_inputs: inputs,
      p_results: results,
    });
    setSaving(false);
    if (saveError) {
      setError(t.saveError);
      return "";
    }
    setScenarioId(data);
    if (!quiet) flash(t.saved);
    const scenarioResult = await supabase.from("pricing_scenarios").select("*").order("updated_at", { ascending: false }).limit(20);
    if (!scenarioResult.error) setScenarios(scenarioResult.data || []);
    return data;
  };

  const markApplied = async (id, target, reference) => {
    const { error: markError } = await supabase.rpc("mark_pricing_scenario_applied", {
      p_id: id,
      p_applied_to: target,
      p_applied_reference: reference,
    });
    if (markError) {
      setError(t.applyError);
      return false;
    }
    setScenarioId("");
    await load();
    return true;
  };

  const applyCatalogue = async () => {
    if (!selectedSku) {
      setError(t.nothingSelected);
      return;
    }
    const price = selectedSku.product.line === "everyday" ? results.retailPricePerKg : results.retailPricePerPack;
    const priceUnit = selectedSku.product.line === "everyday" ? "/ kg" : "/ pack";
    if (!window.confirm(`${t.catalogueGuard} ${money(price)} ${priceUnit}. ${t.saveFirst}`)) return;
    const id = await saveScenario({ quiet: true });
    if (!id) return;
    setSaving(true);
    const request = selectedSku.weight
      ? supabase.from("catalog_variants").update({ price }).eq("product_id", selectedSku.product.id).eq("weight", selectedSku.weight)
      : supabase.from("catalog_products").update({ price }).eq("id", selectedSku.product.id);
    const { error: applyError } = await request;
    setSaving(false);
    if (applyError) {
      setError(t.applyError);
      return;
    }
    if (await markApplied(id, "catalogue", selectedSku.key)) flash(t.catalogueApplied);
  };

  const applyPartner = async () => {
    if (!selectedSku) {
      setError(t.nothingSelected);
      return;
    }
    if (!opportunityId) {
      setError(t.partnerRequired);
      return;
    }
    if (!window.confirm(`${t.partnerGuard} ${t.saveFirst}`)) return;
    const id = await saveScenario({ quiet: true });
    if (!id) return;
    setSaving(true);
    const { data: activeAgreement, error: agreementError } = await supabase
      .from("partner_price_agreements")
      .select("*,partner_price_rules(*)")
      .eq("opportunity_id", opportunityId)
      .eq("status", "active")
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (agreementError) {
      setSaving(false);
      setError(t.applyError);
      return;
    }
    const nextRule = {
      product_id: selectedSku.product.id,
      variant_weight: selectedSku.weight,
      product_name: selectedSku.product.name,
      unit: inputs.partnerUnit,
      minimum_quantity: Number(inputs.minimumQuantity || 1),
      price: inputs.partnerUnit === "pack" ? results.b2bPartnerPricePerPack : results.b2bPartnerPricePerKg,
      sort_order: activeAgreement?.partner_price_rules?.length || 0,
    };
    const preserved = (activeAgreement?.partner_price_rules || [])
      .filter((rule) => !(rule.product_id === nextRule.product_id && (rule.variant_weight || "") === (nextRule.variant_weight || "")))
      .map((rule, index) => ({
        product_id: rule.product_id,
        variant_weight: rule.variant_weight || "",
        product_name: rule.product_name,
        unit: rule.unit,
        minimum_quantity: Number(rule.minimum_quantity),
        price: Number(rule.price),
        sort_order: index,
      }));
    const { data: agreementId, error: applyError } = await supabase.rpc("create_partner_price_agreement", {
      p_opportunity_id: opportunityId,
      p_effective_from: new Date().toISOString().slice(0, 10),
      p_valid_until: activeAgreement?.valid_until || null,
      p_review_at: activeAgreement?.review_at || addDays(180),
      p_includes_vat: true,
      p_includes_delivery: Number(inputs.deliveryPerOrder) > 0,
      p_payment_terms: activeAgreement?.payment_terms || "Chuyển khoản khi xác nhận đơn.",
      p_note: `Áp dụng từ bài tính giá ${scenarioName.trim()}.`,
      p_created_by: email,
      p_rules: [...preserved, { ...nextRule, sort_order: preserved.length }],
    });
    setSaving(false);
    if (applyError) {
      setError(t.applyError);
      return;
    }
    if (await markApplied(id, "partner_price", agreementId)) flash(t.partnerApplied);
  };

  const openScenario = (scenario) => {
    setScenarioId(scenario.status === "draft" ? scenario.id : "");
    setScenarioName(scenario.name);
    setChannel(scenario.channel);
    setSelectedKey(productKey(scenario.product_id || "", scenario.variant_weight || ""));
    setOpportunityId(scenario.opportunity_id || "");
    setBatchId("");
    setInputs({ ...DEFAULT_PRICING_INPUTS, ...(scenario.inputs || {}) });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const warningCopy = {
    tea_cost_missing: t.missingCost,
    current_price_below_floor: t.belowFloor,
    b2b_margin_unworkable: t.unworkable,
    order_volume_missing: t.missingVolume,
  };
  const ladderMax = Math.max(results.retailPricePerKg, 1);
  const ladderRows = [
    [t.floor, results.minimumSafePartnerPricePerKg, "floor"],
    [t.partnerPrice, results.b2bPartnerPricePerKg, "partner"],
    [t.b2bList, results.b2bListPricePerKg, "b2b"],
    [t.retailPrice, results.retailPricePerKg, "retail"],
  ];
  const guide = channel === "retail"
    ? { thin: 30, working: 42, strong: 58, premium: 68, label: t.workingRangeRetail }
    : { thin: 20, working: 28, strong: 38, premium: 50, label: t.workingRangeB2b };
  const marginStatus = activeMargin < 0
    ? { tone: "loss", text: t.marginLoss }
    : activeMargin < guide.thin
      ? { tone: "thin", text: t.marginThin }
      : activeMargin < guide.working
        ? { tone: "tight", text: t.marginTight }
        : activeMargin <= guide.strong
          ? { tone: "right", text: t.marginRight }
          : activeMargin <= guide.premium
            ? { tone: "strong", text: t.marginStrong }
            : { tone: "premium", text: t.marginPremium };
  const profitCells = Math.max(0, Math.min(100, Math.round(activeMargin)));
  const feeCells = Math.max(0, Math.min(100 - profitCells, Math.round(Number(inputs.channelFeePercent) || 0)));
  const costCells = 100 - profitCells - feeCells;
  const marginCells = Array.from({ length: 100 }, (_, index) => (
    index < profitCells ? "profit" : index < profitCells + feeCells ? "fee" : "cost"
  ));

  if (loading) return <main className={styles.state}><RefreshCw /><p>{t.refresh}</p></main>;

  return (
    <main className={styles.page}>
      <header className={styles.top}>
        <div><Link href="/admin/operations"><ArrowLeft />{t.back}</Link><span>{t.room}</span></div>
        <div><span><b>{email}</b><small>{t.owner}</small></span><button onClick={load} aria-label={t.refresh}><RefreshCw /></button></div>
      </header>

      <section className={styles.heading}>
        <div><p>{t.eyebrow}</p><h1>{t.title}</h1><span>{t.intro}</span></div>
        <div className={styles.headingMark}><Calculator /><span>{t.owner}</span></div>
      </section>

      {error && <p className={styles.toast} data-error><AlertTriangle />{error}<button onClick={() => setError("")} aria-label="Đóng thông báo">×</button></p>}
      {notice && <p className={styles.toast}><Check />{notice}</p>}

      <div className={styles.workspace}>
        <section className={styles.ledger}>
          <header><div><p>{t.calculator}</p><h2>{scenarioName || t.scenarioPlaceholder}</h2></div><span>{scenarioId ? t.draft : t.calculator}</span></header>
          <div className={styles.identityGrid}>
            <label className={styles.wide}><span>{t.scenarioName}</span><input value={scenarioName} onChange={(event) => setScenarioName(event.target.value)} placeholder={t.scenarioPlaceholder} /></label>
            <label><span>{t.product}</span><select value={selectedKey} onChange={(event) => selectSku(event.target.value)}><option value="">{t.noProduct}</option>{skuOptions.map((item) => <option value={item.key} key={item.key}>{item.product.name?.[locale] || item.product.name?.vi || item.product.name?.en}{item.weight ? ` · ${item.weight}` : ""}</option>)}</select></label>
            <label><span>{t.batch}</span><select value={batchId} onChange={chooseBatch}><option value="">{t.manualCost}</option>{selectedProductBatches.map((item) => <option value={item.id} key={item.id}>{item.code} · {money(item.cost_per_kg)}/kg</option>)}</select></label>
            <label><span>{t.partner}</span><select value={opportunityId} onChange={(event) => setOpportunityId(event.target.value)}><option value="">{t.noPartner}</option>{opportunities.map((item) => <option value={item.id} key={item.id}>{item.business_name} · {item.contact}</option>)}</select></label>
            <label><span>{t.channel}</span><select value={channel} onChange={(event) => setChannel(event.target.value)}><option value="b2b">{t.b2b}</option><option value="retail">{t.retail}</option></select></label>
          </div>

          <section className={styles.inputSection}>
            <header><span>{t.costSection}</span><p>{money(results.trueCostPerKg)} / kg</p></header>
            <div className={styles.fieldGrid}>
              <NumberField label={t.teaCost} suffix="₫" value={inputs.teaCostPerKg} onChange={updateInput("teaCostPerKg")} />
              <NumberField label={t.yield} suffix="%" value={inputs.usableYieldPercent} onChange={updateInput("usableYieldPercent")} />
              <NumberField label={t.processing} suffix="₫" value={inputs.processingPerKg} onChange={updateInput("processingPerKg")} />
              <NumberField label={t.labour} suffix="₫" value={inputs.labourPerKg} onChange={updateInput("labourPerKg")} />
              <NumberField label={t.packaging} suffix="₫" value={inputs.packagingPerPack} onChange={updateInput("packagingPerPack")} />
              <NumberField label={t.label} suffix="₫" value={inputs.labelPerPack} onChange={updateInput("labelPerPack")} />
              <NumberField label={t.packGrams} suffix="g" value={inputs.packGrams} onChange={updateInput("packGrams")} />
              <NumberField label={t.brewGrams} suffix="g" value={inputs.brewGrams} onChange={updateInput("brewGrams")} step="0.1" />
            </div>
          </section>

          <section className={styles.inputSection}>
            <header><span>{t.commercialSection}</span><p>{money(activeProfitPerOrder)} / order</p></header>
            <div className={styles.fieldGrid}>
              <NumberField label={t.delivery} suffix="₫" value={inputs.deliveryPerOrder} onChange={updateInput("deliveryPerOrder")} />
              <NumberField label={t.orderKg} suffix="kg" value={inputs.orderKg} onChange={updateInput("orderKg")} step="0.1" />
              <NumberField label={t.overhead} suffix="%" value={inputs.overheadPercent} onChange={updateInput("overheadPercent")} step="0.1" />
              <NumberField label={t.channelFee} suffix="%" value={inputs.channelFeePercent} onChange={updateInput("channelFeePercent")} step="0.1" />
              <NumberField label={t.vat} suffix="%" value={inputs.vatPercent} onChange={updateInput("vatPercent")} step="0.1" />
              <NumberField label={t.discount} suffix="%" value={inputs.partnerDiscountPercent} onChange={updateInput("partnerDiscountPercent")} step="0.1" />
              <NumberField label={t.b2bMargin} suffix="%" value={inputs.b2bMarginPercent} onChange={updateInput("b2bMarginPercent")} step="0.1" />
              <NumberField label={t.retailMargin} suffix="%" value={inputs.retailMarginPercent} onChange={updateInput("retailMarginPercent")} step="0.1" />
              <NumberField label={inputs.currentPriceUnit === "kg" ? t.currentPriceKg : t.currentPricePack} suffix="₫" value={inputs.currentPrice} onChange={updateInput("currentPrice")} />
              <label className={styles.numberField}><span>{t.partnerUnit}</span><select value={inputs.partnerUnit} onChange={(event) => setInputs((current) => ({ ...current, partnerUnit: event.target.value }))}><option value="kg">{t.kg}</option><option value="pack">{t.pack}</option></select></label>
              <NumberField label={t.minimumQuantity} suffix={inputs.partnerUnit === "kg" ? "kg" : "pack"} value={inputs.minimumQuantity} onChange={updateInput("minimumQuantity")} step="0.1" />
            </div>
          </section>
        </section>

        <aside className={styles.decision}>
          <section className={styles.costTruth}>
            <header><Scale /><span>{t.costTruth}</span></header>
            <b>{money(results.trueCostPerKg)}</b><small>{t.perKg}</small>
            <div><span><b>{money(results.trueCostPerPack)}</b><small>{t.perPack}</small></span><span><b>{money(results.costPerServing)}</b><small>{t.perServing}</small></span></div>
          </section>

          <section className={styles.ladder}>
            <header><p>{t.ladder}</p><CircleDollarSign /></header>
            <div>{ladderRows.map(([label, value, tone]) => <article key={tone} data-tone={tone}><span><b>{label}</b><small>{money(value)} / kg</small></span><i><span style={{ width: `${Math.max(4, (value / ladderMax) * 100)}%` }} /></i></article>)}</div>
            <p>{t.afterDiscount}</p>
          </section>

          <section className={styles.marginFeel} data-tone={marginStatus.tone}>
            <header><div><p>{t.marginEyebrow}</p><h3>{t.marginFeel}</h3></div><Target /></header>
            <div className={styles.marginReadout}>
              <div
                className={styles.marginBoard}
                role="img"
                aria-label={`${profitCells}% ${t.profitShare}, ${feeCells}% ${t.feeShare}, ${costCells}% ${t.costShare}`}
              >
                {marginCells.map((part, index) => <i key={index} data-part={part} />)}
              </div>
              <div className={styles.marginVerdict}>
                <span>{channel === "retail" ? t.retail : t.b2b}</span>
                <strong>{activeMargin}%</strong>
                <p>{marginStatus.text}</p>
                <b>{guide.label}</b>
              </div>
            </div>
            <dl className={styles.marginLegend}>
              <div data-part="profit"><dt>{t.profitShare}</dt><dd>{profitCells}₫</dd></div>
              <div data-part="fee"><dt>{t.feeShare}</dt><dd>{feeCells}₫</dd></div>
              <div data-part="cost"><dt>{t.costShare}</dt><dd>{costCells}₫</dd></div>
            </dl>
            {results.currentMarginPercent != null && <p className={styles.currentMarginNote}>{t.currentPriceMargin}: <b>{results.currentMarginPercent}%</b></p>}
            <small>{t.marginNote}</small>
          </section>

          <section className={styles.health} data-clear={!results.warnings.length}>
            <header>{results.warnings.length ? <AlertTriangle /> : <ShieldCheck />}<b>{results.warnings.length ? warningCopy[results.warnings[0]] : t.noWarnings}</b></header>
            <dl><div><dt>{t.currentMargin}</dt><dd>{results.currentMarginPercent == null ? "—" : `${results.currentMarginPercent}%`}</dd></div><div><dt>{t.orderProfit}</dt><dd>{money(activeProfitPerOrder)}</dd></div><div><dt>{t.breakEven}</dt><dd>{results.breakEvenPacks ?? "—"}</dd></div></dl>
          </section>

          <div className={styles.actions}>
            <button className={styles.saveAction} onClick={() => saveScenario()} disabled={saving}><Save />{saving ? t.saving : t.save}</button>
            <button onClick={applyCatalogue} disabled={saving || !selectedSku}><Package /><span>{t.applyCatalogue}<small>{selectedSku?.product.line === "everyday" ? `${money(results.retailPricePerKg)} / kg` : money(results.retailPricePerPack)}</small></span><ChevronRight /></button>
            <button onClick={applyPartner} disabled={saving || !selectedSku || !opportunityId}><Handshake /><span>{t.applyPartner}<small>{inputs.partnerUnit === "pack" ? money(results.b2bPartnerPricePerPack) : `${money(results.b2bPartnerPricePerKg)} / kg`}</small></span><ChevronRight /></button>
          </div>
        </aside>
      </div>

      <section className={styles.history}>
        <header><div><History /><span><p>Pricing memory</p><h2>{t.history}</h2></span></div>{!historyAvailable && <small>{t.migration}</small>}</header>
        {scenarios.length ? <div>{scenarios.map((scenario) => <button key={scenario.id} onClick={() => openScenario(scenario)} aria-label={`${t.openScenario}: ${scenario.name}`}><span><b>{scenario.name}</b><small>{date(scenario.updated_at, locale)} · {scenario.channel.toUpperCase()}</small></span><i data-status={scenario.status}>{scenario.status === "applied" ? t.applied : t.draft}</i><strong>{money(scenario.results?.[scenario.channel === "retail" ? "retailPricePerPack" : "b2bPartnerPricePerKg"])}</strong><ChevronRight /></button>)}</div> : <p>{t.emptyHistory}</p>}
      </section>
    </main>
  );
}

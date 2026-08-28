const number = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, number(value)));
const roundMoney = (value) => Math.round(number(value));
const roundUp = (value, step = 1000) => Math.ceil(number(value) / step) * step;

export const DEFAULT_PRICING_INPUTS = {
  teaCostPerKg: 0,
  usableYieldPercent: 92,
  processingPerKg: 0,
  labourPerKg: 0,
  packagingPerPack: 0,
  labelPerPack: 0,
  packGrams: 100,
  brewGrams: 8,
  deliveryPerOrder: 0,
  orderKg: 10,
  overheadPercent: 8,
  channelFeePercent: 0,
  vatPercent: 8,
  b2bMarginPercent: 32,
  retailMarginPercent: 52,
  partnerDiscountPercent: 0,
  currentPrice: 0,
  currentPriceUnit: "pack",
  partnerUnit: "kg",
  minimumQuantity: 1,
};

export function packGramsFromLabel(value = "") {
  const text = String(value).toLowerCase().replaceAll(" ", "");
  const kg = text.match(/([\d.,]+)kg/);
  if (kg) return Math.max(1, number(kg[1].replace(",", ".")) * 1000);
  const grams = text.match(/([\d.,]+)g/);
  if (grams) return Math.max(1, number(grams[1].replace(",", ".")));
  return DEFAULT_PRICING_INPUTS.packGrams;
}

export function calculatePricing(rawInputs = {}) {
  const inputs = { ...DEFAULT_PRICING_INPUTS, ...rawInputs };
  const yieldRate = clamp(inputs.usableYieldPercent, 1, 100) / 100;
  const packGrams = Math.max(1, number(inputs.packGrams, 100));
  const packKg = packGrams / 1000;
  const packsPerKg = 1 / packKg;
  const orderKg = Math.max(0.01, number(inputs.orderKg, 1));
  const vatRate = clamp(inputs.vatPercent, 0, 100) / 100;
  const channelRate = clamp(inputs.channelFeePercent, 0, 95) / 100;
  const overheadRate = clamp(inputs.overheadPercent, 0, 300) / 100;
  const partnerDiscountRate = clamp(inputs.partnerDiscountPercent, 0, 95) / 100;
  const teaCostPerSellableKg = number(inputs.teaCostPerKg) / yieldRate;
  const packingPerKg = (number(inputs.packagingPerPack) + number(inputs.labelPerPack)) * packsPerKg;
  const variableCostPerKg = teaCostPerSellableKg
    + number(inputs.processingPerKg)
    + number(inputs.labourPerKg)
    + packingPerKg;
  const deliveryPerKg = number(inputs.deliveryPerOrder) / orderKg;
  const overheadPerKg = (variableCostPerKg + deliveryPerKg) * overheadRate;
  const trueCostPerKg = variableCostPerKg + deliveryPerKg + overheadPerKg;
  const trueCostPerPack = trueCostPerKg * packKg;
  const costPerServing = trueCostPerKg * (Math.max(0, number(inputs.brewGrams)) / 1000);

  const recommended = (targetMarginPercent, discountRate = 0) => {
    const targetMarginRate = clamp(targetMarginPercent, 0, 90) / 100;
    const retainedRevenueRate = Math.max(0.01, 1 - channelRate - targetMarginRate);
    const chargedExVatPerKg = trueCostPerKg / retainedRevenueRate;
    const listExVatPerKg = chargedExVatPerKg / Math.max(0.01, 1 - discountRate);
    const listInclVatPerKg = roundUp(listExVatPerKg * (1 + vatRate));
    const chargedInclVatPerKg = roundUp(listInclVatPerKg * (1 - discountRate));
    return {
      listInclVatPerKg,
      chargedInclVatPerKg,
      listInclVatPerPack: roundUp(listInclVatPerKg * packKg, 1000),
      chargedInclVatPerPack: roundUp(chargedInclVatPerKg * packKg, 1000),
      targetMarginRate,
    };
  };

  const b2b = recommended(inputs.b2bMarginPercent, partnerDiscountRate);
  const retail = recommended(inputs.retailMarginPercent);
  const safeChargedExVatPerKg = trueCostPerKg / Math.max(0.01, 1 - channelRate);
  const safeListInclVatPerKg = roundUp(
    (safeChargedExVatPerKg / Math.max(0.01, 1 - partnerDiscountRate)) * (1 + vatRate),
  );
  const safePartnerInclVatPerKg = roundUp(safeListInclVatPerKg * (1 - partnerDiscountRate));
  const currentPrice = Math.max(0, number(inputs.currentPrice));
  const currentPriceInclVatPerKg = inputs.currentPriceUnit === "kg" ? currentPrice : currentPrice / packKg;
  const currentRevenueExVatPerKg = currentPriceInclVatPerKg / (1 + vatRate);
  const currentMarginPercent = currentRevenueExVatPerKg > 0
    ? ((currentRevenueExVatPerKg * (1 - channelRate) - trueCostPerKg) / currentRevenueExVatPerKg) * 100
    : null;
  const partnerRevenueExVatPerKg = b2b.chargedInclVatPerKg / (1 + vatRate);
  const profitPerKg = partnerRevenueExVatPerKg * (1 - channelRate) - trueCostPerKg;
  const profitPerOrder = profitPerKg * orderKg;
  const contributionPerPack = Math.max(
    0,
    partnerRevenueExVatPerKg * (1 - channelRate) * packKg
      - (variableCostPerKg * (1 + overheadRate) * packKg),
  );
  const breakEvenPacks = contributionPerPack > 0
    ? Math.ceil((number(inputs.deliveryPerOrder) * (1 + overheadRate)) / contributionPerPack)
    : null;

  const warnings = [];
  if (number(inputs.teaCostPerKg) <= 0) warnings.push("tea_cost_missing");
  if (clamp(inputs.b2bMarginPercent, 0, 100) + clamp(inputs.channelFeePercent, 0, 100) >= 95) {
    warnings.push("b2b_margin_unworkable");
  }
  if (currentPrice > 0 && currentPriceInclVatPerKg < safePartnerInclVatPerKg) {
    warnings.push("current_price_below_floor");
  }
  if (number(inputs.orderKg) <= 0) warnings.push("order_volume_missing");

  return {
    teaCostPerSellableKg: roundMoney(teaCostPerSellableKg),
    packagingPerKg: roundMoney(packingPerKg),
    variableCostPerKg: roundMoney(variableCostPerKg),
    deliveryPerKg: roundMoney(deliveryPerKg),
    overheadPerKg: roundMoney(overheadPerKg),
    trueCostPerKg: roundMoney(trueCostPerKg),
    trueCostPerPack: roundMoney(trueCostPerPack),
    costPerServing: roundMoney(costPerServing),
    minimumSafePricePerKg: safeListInclVatPerKg,
    minimumSafePartnerPricePerKg: safePartnerInclVatPerKg,
    minimumSafePricePerPack: roundUp(safeListInclVatPerKg * packKg, 1000),
    b2bListPricePerKg: b2b.listInclVatPerKg,
    b2bPartnerPricePerKg: b2b.chargedInclVatPerKg,
    b2bListPricePerPack: b2b.listInclVatPerPack,
    b2bPartnerPricePerPack: b2b.chargedInclVatPerPack,
    retailPricePerKg: retail.listInclVatPerKg,
    retailPricePerPack: retail.listInclVatPerPack,
    currentMarginPercent: currentMarginPercent == null ? null : Math.round(currentMarginPercent * 10) / 10,
    profitPerKg: roundMoney(profitPerKg),
    profitPerOrder: roundMoney(profitPerOrder),
    breakEvenPacks,
    warnings,
  };
}

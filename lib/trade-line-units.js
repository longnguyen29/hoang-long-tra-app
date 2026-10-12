import { catalogSellingUnit, SUPPORTED_SELLING_UNITS, validSaleQuantity } from './selling-units.js';

export const tradeMassUnit = unit => ['kg', 'g', 't', 'ton', 'tons'].includes(unit);

export function tradeProductOptions(products) {
  return products.flatMap(product => product.variants?.length
    ? product.variants.map(variant => ({ key: `${product.id}__${variant.weight}`, productId: product.id, weight: variant.weight, name: product.name, price: variant.price ?? '', unit: catalogSellingUnit(product, variant.weight) }))
    : [{ key: product.id, productId: product.id, weight: null, name: product.name, price: product.price ?? '', unit: catalogSellingUnit(product) }]);
}

// Agreed quantities/prices keep their recorded basis. Selecting a new product
// starts from its actual sale unit; changing that basis must not convert money.
export function selectTradeProduct(line, product, agreedRule = null, agreementId = null, quantityKey = 'qty') {
  return {
    ...line, productKey: product?.key || '',
    unit: SUPPORTED_SELLING_UNITS.includes(agreedRule?.unit) ? agreedRule.unit : product?.unit || '',
    price: agreedRule?.price ?? product?.price ?? '',
    [quantityKey]: agreedRule?.minimum_quantity ?? line[quantityKey],
    priceAgreementId: agreedRule ? agreementId : null,
  };
}

function checkedLine(line, products, quantityKey) {
  const product = products.find(item => item.key === line.productKey);
  if (!product) throw new Error('trade_product_required');
  const unit = line.unit || product.unit;
  const qty = Number(line[quantityKey]);
  if (!SUPPORTED_SELLING_UNITS.includes(unit) || !validSaleQuantity(qty, unit, 'wholesale')) throw new Error('trade_quantity_invalid');
  // A blank price is unknown, while an explicitly entered zero is a real price.
  if (line.price === '' || line.price == null || !Number.isFinite(Number(line.price)) || Number(line.price) < 0) throw new Error('trade_price_required');
  return { product, unit, qty, price: Number(line.price) };
}

const named = product => product.weight
  ? { vi: `${product.name.vi || product.name.en} (${product.weight})`, en: `${product.name.en || product.name.vi} (${product.weight})` }
  : product.name;

export function buildTradeQuoteLines(lines, products) {
  if (!lines.length) throw new Error('trade_product_required');
  return lines.map(line => {
    const { product, unit, qty, price } = checkedLine(line, products, 'qty');
    return { productId: product.productId, weight: product.weight, name: named(product), qty, unit, price,
      ...(line.priceAgreementId ? { priceAgreementId: line.priceAgreementId } : {}) };
  });
}

export function buildTradePriceRules(lines, products) {
  if (!lines.length) throw new Error('trade_product_required');
  return lines.map((line, index) => {
    const { product, unit, qty, price } = checkedLine(line, products, 'minimum_quantity');
    return { product_id: product.productId, variant_weight: product.weight || '', product_name: named(product),
      unit, minimum_quantity: qty, price, sort_order: index };
  });
}

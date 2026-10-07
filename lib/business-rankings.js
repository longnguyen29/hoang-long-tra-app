import { reconcileOrderStage } from "./order-flow.js";
import { normalizePhone } from "./prospect-contacts.js";
import { normalizeContact } from "./trade-pipeline.js";

const localDateFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit",
});
const numberFormatter = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 });
const MAX_AMOUNT = 1_000_000_000_000_000;

function amount(value) {
  if (value === null || value === undefined || (typeof value === "string" && !value.trim())) return null;
  if (typeof value !== "string" && typeof value !== "number") return null;
  if (typeof value === "string" && !/^[+]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(value.trim())) return null;
  const result = Number(value);
  return Number.isFinite(result) && result >= 0 && result <= MAX_AMOUNT ? result : null;
}

function field(row, rawKey, mappedKey) {
  return row?.[rawKey] !== undefined ? row[rawKey] : row?.[mappedKey];
}

function dateInfo(value) {
  if (value === null || value === undefined || value === "") return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  const parts = localDateFormatter.formatToParts(date);
  const get = (type) => parts.find((part) => part.type === type).value;
  return { localDate: `${get("year")}-${get("month")}-${get("day")}`, at: date.toISOString() };
}

function validDateInput(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function parsePeriod(options) {
  const month = options.month ? String(options.month) : null;
  const year = options.year !== null && options.year !== undefined && options.year !== "" ? String(options.year) : null;
  const fromDate = options.fromDate ? String(options.fromDate) : null;
  const toDate = options.toDate ? String(options.toDate) : null;
  const invalid = Boolean(
    (month && !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) ||
    (year && !/^[1-9]\d{3}$/.test(year)) ||
    (fromDate && !validDateInput(fromDate)) ||
    (toDate && !validDateInput(toDate)) ||
    (fromDate && toDate && fromDate > toDate)
  );
  return { month, year, fromDate, toDate, scope: options.scope === "all" ? "all" : "completed", basis: "order_creation_date", timeZone: "Asia/Ho_Chi_Minh", invalid };
}

function unitKey(value) {
  const unit = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (!unit) return "unknown";
  return ({ kgs: "kg", kilogram: "kg", kilograms: "kg", gram: "g", grams: "g", piece: "pcs", pieces: "pcs", pc: "pcs", sp: "pcs", "cái": "pcs", packs: "pack", package: "pack", packages: "pack", "gói": "pack", ton: "t", tons: "t", tonne: "t", tonnes: "t", "tấn": "t" })[unit] || unit.slice(0, 40);
}

export function rankingUnitLabel(unit) {
  return ({ kg: "kg", g: "g", t: "tấn", pcs: "sản phẩm", pack: "gói", items: "đơn vị hàng", unknown: "chưa rõ đơn vị" })[unit] || unit;
}

export function formatRankingQuantities(quantities = {}) {
  return Object.entries(quantities).filter(([, qty]) => Number.isFinite(qty) && qty >= 0)
    .map(([unit, qty]) => `${numberFormatter.format(qty)} ${rankingUnitLabel(unit)}`).join(" · ") || "Chưa ghi số lượng";
}

function displayName(value) {
  if (typeof value === "string") return value.trim();
  if (value && typeof value === "object") return String(value.vi || value.en || "").trim();
  return "";
}

function buyerIdentity(order, orderKey) {
  const contact = String(order.contact || "").trim();
  // Reuse the existing Vietnamese phone validator; don't merge arbitrary labels
  // that happen to contain digits, or customer names with missing contacts.
  const phoneLike = /^[+()\d\s.-]+$/.test(contact);
  const phone = phoneLike ? normalizePhone(contact) : "";
  const internationalPhone = phoneLike && /^\+[1-9]\d{7,14}$/.test(contact.replace(/[()\s.-]/g, "")) ? contact.replace(/[()\s.-]/g, "") : "";
  if (phone || internationalPhone) {
    const normalized = phone || internationalPhone;
    return { key: `phone:${normalized}`, contact, contactKey: normalizeContact(contact), identityKind: "phone", identityIncomplete: false };
  }
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact)) return { key: `email:${normalizeContact(contact)}`, contact, contactKey: normalizeContact(contact), identityKind: "email", identityIncomplete: false };
  const account = field(order, "partner_account_id", "partnerAccountId");
  if (typeof account === "string" && account.trim()) return { key: `account:${account.trim()}`, contact, contactKey: null, identityKind: "account", identityIncomplete: false };
  return { key: `unknown:${orderKey}`, contact, contactKey: null, identityKind: "unknown", identityIncomplete: true };
}

function productIdentity(line, orderKey, index) {
  const id = field(line, "product_id", "productId");
  const name = displayName(line.name) || displayName(field(line, "product_name", "productName"));
  // A tea is one product even when sold in different pack sizes. Units stay
  // separate; variant weights never imply a kg conversion.
  if (typeof id === "string" && id.trim()) return { key: `product:${id.trim()}`, productId: id.trim(), name: name || id.trim(), identityIncomplete: false };
  if (name) return { key: `name:${name.normalize("NFC").toLocaleLowerCase("vi-VN").replace(/\s+/g, " ")}`, productId: null, name, identityIncomplete: true };
  return { key: `unknown:${orderKey}:${index}`, productId: null, name: "Sản phẩm chưa rõ tên", identityIncomplete: true };
}

function linePrice(line) {
  if (line.price !== undefined) return amount(line.price);
  return amount(field(line, "unit_price", "unitPrice"));
}

function addQuantity(quantities, unit, qty) {
  if (qty === null) return;
  quantities[unit] = (quantities[unit] || 0) + qty;
}

function addValue(entry, value) {
  if (value === null) entry.missingValueCount += 1;
  else {
    entry.knownValueCount += 1;
    entry._value += value;
  }
}

function safeValue(entry) {
  return entry.knownValueCount && entry._value <= Number.MAX_SAFE_INTEGER ? entry._value : null;
}

function rank(entries, sort, limit) {
  const valueFirst = sort === "value";
  const compareValue = (left, right) => (right.value ?? -Infinity) - (left.value ?? -Infinity);
  return entries.sort((left, right) => (valueFirst ? compareValue(left, right) || right.orderCount - left.orderCount : right.orderCount - left.orderCount || compareValue(left, right)) || left.name.localeCompare(right.name, "vi") || left.key.localeCompare(right.key)).slice(0, limit);
}

/**
 * Ranking data for completed orders by their creation date. Buyer values use
 * estimated_total; product values use qty × known unit price before order-level
 * VAT/promotions/freight. Neither value is recognized accounting revenue.
 */
export function calculateBusinessRankings(rawOrders = [], options = {}) {
  const period = parsePeriod(options);
  const limit = Number.isInteger(options.limit) && options.limit > 0 ? Math.min(options.limit, 100) : 10;
  const products = new Map();
  const buyers = new Map();
  const seenOrders = new Set();
  const summary = { orderCount: 0, completedOrderCount: 0, openOrderCount: 0, value: null, knownValueCount: 0, missingValueCount: 0, buyerCount: 0, productCount: 0, missingIdentityOrderCount: 0, missingProductIdentityLineCount: 0, missingLinesOrderCount: 0, missingQuantityLineCount: 0, unknownUnitLineCount: 0, excludedInvalidDateOrderCount: 0, quantities: {}, _value: 0 };
  if (!period.invalid) (Array.isArray(rawOrders) ? rawOrders : []).forEach((order, index) => {
    if (!order || typeof order !== "object") return;
    const completed = reconcileOrderStage(order.stage, order.status) === "completed";
    if (period.scope === "completed" && !completed) return;
    const date = dateInfo(order.ts !== undefined ? order.ts : field(order, "created_at", "createdAt"));
    if (!date) { summary.excludedInvalidDateOrderCount += 1; return; }
    if ((period.month && date.localDate.slice(0, 7) !== period.month) || (period.year && date.localDate.slice(0, 4) !== period.year) || (period.fromDate && date.localDate < period.fromDate) || (period.toDate && date.localDate > period.toDate)) return;
    const orderKey = order.id !== undefined && order.id !== null && String(order.id) ? String(order.id) : `row:${index}`;
    if (seenOrders.has(orderKey)) return;
    seenOrders.add(orderKey);
    summary.orderCount += 1;
    summary[completed ? "completedOrderCount" : "openOrderCount"] += 1;
    const orderValue = amount(field(order, "estimated_total", "estimatedTotal"));
    addValue(summary, orderValue);
    const identity = buyerIdentity(order, orderKey);
    if (identity.identityIncomplete) summary.missingIdentityOrderCount += 1;
    const customerName = displayName(field(order, "customer_name", "customerName")) || "Khách chưa rõ tên";
    if (!buyers.has(identity.key)) buyers.set(identity.key, { ...identity, name: customerName, orderCount: 0, _value: 0, knownValueCount: 0, missingValueCount: 0, quantities: {}, missingQuantityCount: 0, unknownUnitLineCount: 0, lastOrderAt: date.at, lastOrderId: order.id || null, orderIds: [] });
    const buyer = buyers.get(identity.key);
    buyer.orderCount += 1;
    buyer.orderIds.push(order.id || null);
    addValue(buyer, orderValue);
    if (date.at >= buyer.lastOrderAt) { buyer.lastOrderAt = date.at; buyer.lastOrderId = order.id || null; buyer.name = customerName; buyer.contact = identity.contact; buyer.contactKey = identity.contactKey; }
    const lines = (Array.isArray(order.lines) ? order.lines : []).filter((line) => line && typeof line === "object");
    if (!lines.length) {
      summary.missingLinesOrderCount += 1;
      const kg = amount(field(order, "total_kg", "totalKg"));
      const items = amount(field(order, "total_items", "totalItems"));
      addQuantity(buyer.quantities, "kg", kg); addQuantity(summary.quantities, "kg", kg);
      addQuantity(buyer.quantities, "items", items); addQuantity(summary.quantities, "items", items);
      if (kg === null && items === null) buyer.missingQuantityCount += 1;
    }
    lines.forEach((line, lineIndex) => {
      const productId = productIdentity(line, orderKey, lineIndex);
      if (productId.identityIncomplete) summary.missingProductIdentityLineCount += 1;
      if (!products.has(productId.key)) products.set(productId.key, { ...productId, lineCount: 0, _orders: new Set(), _value: 0, knownValueCount: 0, missingValueCount: 0, quantities: {}, missingQuantityCount: 0, unknownUnitLineCount: 0, lastOrderAt: date.at, variants: new Set() });
      const product = products.get(productId.key);
      product.lineCount += 1;
      product._orders.add(orderKey);
      if (date.at >= product.lastOrderAt) { product.lastOrderAt = date.at; product.name = productId.name; }
      const variant = field(line, "variant_weight", "weight");
      if (typeof variant === "string" && variant.trim()) product.variants.add(variant.trim());
      const qty = amount(line.qty !== undefined ? line.qty : line.quantity);
      const unit = unitKey(line.unit);
      if (qty === null) { product.missingQuantityCount += 1; buyer.missingQuantityCount += 1; summary.missingQuantityLineCount += 1; }
      if (unit === "unknown") { product.unknownUnitLineCount += 1; buyer.unknownUnitLineCount += 1; summary.unknownUnitLineCount += 1; }
      addQuantity(product.quantities, unit, qty); addQuantity(buyer.quantities, unit, qty); addQuantity(summary.quantities, unit, qty);
      const price = linePrice(line);
      const value = qty !== null && price !== null && qty * price <= Number.MAX_SAFE_INTEGER ? qty * price : null;
      addValue(product, value);
    });
  });
  summary.value = safeValue(summary);
  summary.buyerCount = buyers.size;
  summary.productCount = products.size;
  delete summary._value;
  const productRows = [...products.values()].map(({ _value, _orders, variants, ...entry }) => ({ ...entry, orderCount: _orders.size, value: safeValue({ ...entry, _value }), variants: [...variants] }));
  const buyerRows = [...buyers.values()].map(({ _value, ...entry }) => ({ ...entry, value: safeValue({ ...entry, _value }) }));
  return {
    period, summary,
    products: rank(productRows, options.productSort === "value" ? "value" : "orderCount", limit),
    buyers: rank(buyerRows, options.buyerSort === "orderCount" ? "orderCount" : "value", limit),
  };
}

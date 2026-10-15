import { catalogSellingUnit } from './selling-units.js';
import { catalogText, matchesTradeSearch } from './trade-catalog.js';
import { tradeProductFacts } from './trade-product-details.js';
import { RETAIL_CART_MAX } from './retail-cart.js';

// The same published catalogue powers retail and business enquiries. No price or
// inventory metadata is stored in the customer's persistent cart.
export const RETAIL_PRODUCT_FIELDS = 'id,line,available,limited,name,notes,brew,pack_size,photo_url,photo_position,price,batch,flavors,kind,vendor_id,stock_ha_giang,stock_soc_son';
export const RETAIL_VARIANT_FIELDS = 'product_id,weight,price,stock_ha_giang,stock_soc_son';

export function retailStock(record) {
  const values = [record?.stockHaGiang, record?.stockSocSon];
  const known = values.filter(value => typeof value === 'number' && Number.isFinite(value));
  return known.length ? Math.max(0, Math.floor(known.reduce((sum, value) => sum + Math.max(0, value), 0))) : null;
}

export const RETAIL_LOW_STOCK_THRESHOLD = 5;

// A limited release is an editorial flag; low stock is based on a recorded
// sale-unit count. An unknown balance must never become an invented countdown.
export function retailStockBadge(product, option, locale = 'vi') {
  if (!product?.available || option?.stock === 0) return null;
  const english = locale === 'en';
  if (Number.isFinite(option?.stock) && option.stock > 0 && option.stock <= RETAIL_LOW_STOCK_THRESHOLD) {
    return { kind: 'low', label: english ? 'Low stock' : 'Sắp hết hàng',
      detail: english ? `${option.stock} sale units recorded for this pack. Availability is checked again at checkout.` : `Quy cách này còn ${option.stock} đơn vị bán trong kho đã ghi nhận. Hệ thống kiểm tra lại khi đặt hàng.` };
  }
  return product.limited === true ? { kind: 'limited', label: english ? 'Limited release' : 'Mẻ giới hạn',
    detail: english ? 'The house has marked this tea as a limited release.' : 'Dòng trà này được Nhà đánh dấu là mẻ giới hạn.' } : null;
}

export function retailOptions(product) {
  if (!product?.id) return [];
  const variants = Array.isArray(product.variants) ? product.variants : [];
  return (variants.length ? variants : [null]).map(variant => {
    const weight = variant?.weight || null;
    const rawPrice = variant ? variant.price : product.price;
    const price = typeof rawPrice === 'number' && Number.isFinite(rawPrice) && rawPrice > 0 ? rawPrice : null;
    const stock = retailStock(variant || product);
    return { key: weight ? `${product.id}__${weight}` : product.id, product, weight, price, stock,
      unit: catalogSellingUnit(product, weight), orderable: product.available === true && price !== null && (stock === null || stock > 0) };
  });
}

export function retailProductFacts(product = {}, locale = 'vi') {
  const lang = locale === 'en' ? 'en' : 'vi';
  const trade = tradeProductFacts({ ...product, pack_size: product.packSize }, lang);
  return { ...trade, name: trade.name,
    note: catalogText(product.notes, lang), brew: catalogText(product.brew, lang),
    packing: typeof product.packSize === 'string' ? product.packSize : '' };
}

export function retailProductHref(id, locale = 'vi') {
  return `/shop/${encodeURIComponent(String(id))}${locale === 'en' ? '?lang=en' : ''}`;
}

export function matchesRetailSearch(product, query = '', locale = 'vi') {
  const facts = retailProductFacts(product, locale);
  return matchesTradeSearch({ ...product, pack_size: product.packSize }, query, [facts.name, facts.groupLabel, facts.flavors]);
}

export function retailOrderLines(cart, products) {
  const options = products.flatMap(retailOptions);
  return Object.entries(cart).map(([key, qty]) => {
    const option = options.find(item => item.key === key);
    if (!option?.orderable || !Number.isInteger(qty) || qty < 1 || qty > RETAIL_CART_MAX || (option.stock !== null && qty > option.stock)) throw new Error('cart_changed');
    const { product, weight, price, unit } = option;
    return { productId: product.id, weight, qty, unit, price,
      name: weight ? { vi: `${catalogText(product.name, 'vi')} (${weight})`, en: `${catalogText(product.name, 'en')} (${weight})` } : product.name };
  });
}

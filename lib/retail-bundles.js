import { retailOptions } from './retail-catalog.js';
import { parseRetailCart, RETAIL_CART_MAX } from './retail-cart.js';

export const RETAIL_BUNDLE_PURPOSES = [
  { id: 'everyday', name: { vi: 'Uống hằng ngày', en: 'Everyday tea' } },
  { id: 'discovery', name: { vi: 'Khám phá trà', en: 'Explore tea' } },
  { id: 'gifting', name: { vi: 'Tặng trà', en: 'Give tea' } },
  { id: 'office', name: { vi: 'Dùng ở văn phòng', en: 'Office tea' } },
  { id: 'cafe', name: { vi: 'Thử trà cho quán', en: 'Café trials' } },
  { id: 'travel', name: { vi: 'Mang theo khi đi xa', en: 'Travel tea' } },
];

export const RETAIL_BUNDLE_TIMES = [
  { id: 'workday', name: { vi: 'Ngày làm việc', en: 'Workday' } },
  { id: 'break', name: { vi: 'Lúc nghỉ', en: 'Tea break' } },
  { id: 'weekend', name: { vi: 'Cuối tuần', en: 'Weekend' } },
  { id: 'special', name: { vi: 'Dịp đặc biệt', en: 'Special occasion' } },
];

// These are combinations of exact catalogue packs, not new SKUs or promises
// about packaging. Price, stock and sale units always come from retailOptions.
// Planned small packs remain descriptive until their packing is confirmed.
export const RETAIL_BUNDLES = [
  {
    id: 'home-and-work',
    name: { vi: 'Trà ở nhà và nơi làm việc', en: 'Tea for home and work' },
    description: { vi: 'Hai gói trà xanh dùng hằng ngày, để bạn chia theo nơi thường pha trà.', en: 'Two packs of everyday green tea to divide between the places where you brew.' },
    audience: { vi: 'Người muốn có cùng một trà ở nhà và nơi làm việc.', en: 'For those who want the same tea at home and at work.' },
    occasion: { vi: 'Những ngày làm việc và giờ nghỉ uống trà.', en: 'For workdays and tea breaks.' },
    purposes: ['everyday', 'office'], times: ['workday', 'break'], ready: true,
    components: [{ productId: 'daily-green-tea-iced-tea-mu3w9lr0', weight: '500g', qty: 2 }],
  },
  {
    id: 'weekend',
    name: { vi: 'Trà cuối tuần', en: 'Weekend tea' },
    description: { vi: 'Bạch Mẫu Đơn cùng hai viên Phổ Nhĩ cho những lần pha khác nhau.', en: 'White Peony with two Pu-erh pieces for separate brewing sessions.' },
    audience: { vi: 'Người muốn dành thời gian thử hai dòng trà.', en: 'For those who want time to explore two teas.' },
    occasion: { vi: 'Lúc nghỉ và những buổi cuối tuần.', en: 'For breaks and unhurried weekends.' },
    purposes: ['everyday', 'discovery'], times: ['break', 'weekend'], ready: true,
    components: [{ productId: 'bach-mau-don', weight: '50g', qty: 1 }, { productId: 'pho-nhi-vien-mv2k5p6r', weight: '1 viên', qty: 2 }],
  },
  {
    id: 'first-tea',
    name: { vi: 'Bắt đầu thưởng trà', en: 'A first tea selection' },
    description: { vi: 'Một gói Lục Trà Shan và một gói Bạch Mẫu Đơn để bắt đầu khám phá.', en: 'One pack of Shan green tea and one pack of White Peony to begin exploring.' },
    audience: { vi: 'Người mới chọn trà hoặc muốn thử thêm một dòng trà.', en: 'For new tea drinkers or those exploring another tea.' },
    occasion: { vi: 'Pha thử lúc nghỉ hoặc cuối tuần.', en: 'For a tea break or weekend tasting.' },
    purposes: ['discovery'], times: ['break', 'weekend'], ready: true,
    components: [{ productId: 'luc-tra-shan-mv4nnv9p', weight: '200g', qty: 1 }, { productId: 'bach-mau-don', weight: '50g', qty: 1 }],
  },
  {
    id: 'office',
    name: { vi: 'Góc trà văn phòng', en: 'The office tea corner' },
    description: { vi: 'Ngọc Lan, Lục Trà Shan và Bạch Mẫu Đơn để luân phiên chọn trà tại nơi làm việc.', en: 'Magnolia, Shan green tea and White Peony to rotate through at work.' },
    audience: { vi: 'Nhóm đồng nghiệp muốn có nhiều lựa chọn trà.', en: 'For colleagues who want a choice of teas.' },
    occasion: { vi: 'Ngày làm việc và giờ nghỉ cùng đồng nghiệp.', en: 'For workdays and breaks with colleagues.' },
    purposes: ['office', 'everyday'], times: ['workday', 'break'], ready: true,
    components: [{ productId: 'luc-tra-ngoc-lan', weight: '1kg', qty: 1 }, { productId: 'luc-tra-shan-mv4nnv9p', weight: '200g', qty: 1 }, { productId: 'bach-mau-don', weight: '50g', qty: 1 }],
  },
  {
    id: 'lotus-and-leaf',
    name: { vi: 'Sen và trà lá', en: 'Lotus and leaf' },
    description: { vi: 'Trà Gạo Sen 3 Lần cùng Lục Trà Shan để chọn theo từng lần pha.', en: 'Three-times lotus-scented tea with Shan green tea to choose between for each session.' },
    audience: { vi: 'Người muốn thử trà sen bên cạnh một dòng lục trà.', en: 'For those exploring lotus tea alongside a green tea.' },
    occasion: { vi: 'Cuối tuần thưởng trà hoặc chọn trà tặng.', en: 'For weekend tea or a tea gift.' },
    purposes: ['discovery', 'gifting'], times: ['weekend', 'special'], ready: true,
    components: [{ productId: 'tra-gao-sen-3-lan', weight: '50g', qty: 1 }, { productId: 'luc-tra-shan-mv4nnv9p', weight: '200g', qty: 1 }],
  },
  {
    id: 'lotus-and-white',
    name: { vi: 'Sen và bạch trà', en: 'Lotus and white tea' },
    description: { vi: 'Trà Gạo Sen 3 Lần cùng Bạch Mẫu Đơn trong hai gói riêng.', en: 'Three-times lotus-scented tea and White Peony in two separate packs.' },
    audience: { vi: 'Người muốn thử hoặc tặng hai lựa chọn trà.', en: 'For those exploring or giving two tea choices.' },
    occasion: { vi: 'Một buổi cuối tuần hoặc dịp tặng trà.', en: 'For a weekend session or a tea-giving occasion.' },
    purposes: ['discovery', 'gifting'], times: ['weekend', 'special'], ready: true,
    components: [{ productId: 'tra-gao-sen-3-lan', weight: '50g', qty: 1 }, { productId: 'bach-mau-don', weight: '50g', qty: 1 }],
  },
  {
    id: 'special-gift',
    name: { vi: 'Trà cho dịp đặc biệt', en: 'Tea for a special occasion' },
    description: { vi: 'Trà Gạo Sen 7 Lần cùng Bạch Mẫu Đơn để bạn chọn làm quà trà.', en: 'Seven-times lotus-scented tea with White Peony as a tea gift selection.' },
    audience: { vi: 'Người đang chọn trà cho người nhận quà.', en: 'For those choosing teas for a gift recipient.' },
    occasion: { vi: 'Dịp cảm ơn, gặp gỡ hoặc tặng trà.', en: 'For a thank-you, a gathering or a tea gift.' },
    purposes: ['gifting'], times: ['special'], ready: true,
    components: [{ productId: 'tra-gao-sen-7-lan', weight: '50g', qty: 1 }, { productId: 'bach-mau-don', weight: '50g', qty: 1 }],
  },
  {
    id: 'lotus-comparison',
    name: { vi: 'Hai lựa chọn trà sen', en: 'Two lotus tea selections' },
    description: { vi: 'Trà Gạo Sen 3 Lần và 7 Lần để pha riêng rồi tự đối chiếu cảm nhận.', en: 'Three-times and seven-times lotus-scented teas to brew separately and compare your impressions.' },
    audience: { vi: 'Người muốn tìm hiểu hai lựa chọn trà sen của Nhà.', en: 'For those exploring the house’s two lotus tea selections.' },
    occasion: { vi: 'Buổi thưởng trà cuối tuần hoặc dịp chia sẻ trà.', en: 'For weekend tasting or sharing tea on a special occasion.' },
    purposes: ['discovery', 'gifting'], times: ['weekend', 'special'], ready: true,
    components: [{ productId: 'tra-gao-sen-3-lan', weight: '50g', qty: 1 }, { productId: 'tra-gao-sen-7-lan', weight: '50g', qty: 1 }],
  },
  {
    id: 'find-your-taste',
    name: { vi: 'Tìm vị trà của bạn', en: 'Find your tea taste' },
    description: { vi: 'Ý tưởng bốn phần trà nhỏ để thử trước khi chọn gói lớn.', en: 'A planned selection of four small portions to try before choosing a larger pack.' },
    audience: { vi: 'Người muốn khám phá nhiều lựa chọn trà.', en: 'For those who want to explore several teas.' },
    occasion: { vi: 'Những lần pha thử lúc nghỉ hoặc cuối tuần.', en: 'For tasting during breaks or weekends.' },
    purposes: ['discovery'], times: ['break', 'weekend'], ready: false, components: [],
    plannedContents: { vi: 'Dự kiến: Shan Mộc, Shan Mật, Shan Khói và Ngọc Lan, mỗi loại 20g. Cần xác nhận quy cách đóng gói trước khi mở bán.', en: 'Planned: Shan Mộc, Shan Mật, Shan Khói and Magnolia, 20g each. Packing must be confirmed before sale.' },
  },
  {
    id: 'lotus-discovery',
    name: { vi: 'Bước đầu khám phá trà sen', en: 'A first lotus tea discovery' },
    description: { vi: 'Ý tưởng phần trà sen nhỏ đi cùng bạch trà để bắt đầu khám phá.', en: 'A planned small portion of lotus tea alongside white tea to begin exploring.' },
    audience: { vi: 'Người muốn thử trà sen với lượng nhỏ.', en: 'For those who want a small introduction to lotus tea.' },
    occasion: { vi: 'Một buổi thử trà hoặc chia sẻ trà.', en: 'For a tasting or sharing tea.' },
    purposes: ['discovery', 'gifting'], times: ['break', 'special'], ready: false, components: [],
    plannedContents: { vi: 'Dự kiến: Trà Gạo Sen 3 Lần 10g và Bạch Mẫu Đơn 20g. Cần xác nhận quy cách đóng gói trước khi mở bán.', en: 'Planned: 10g of three-times lotus-scented tea and 20g of White Peony. Packing must be confirmed before sale.' },
  },
  {
    id: 'travel',
    name: { vi: 'Trà mang theo', en: 'Tea to take along' },
    description: { vi: 'Ý tưởng ba phần trà nhỏ để mang theo khi đi xa.', en: 'A planned selection of three small tea portions to take on a trip.' },
    audience: { vi: 'Người muốn mang trà theo chuyến đi.', en: 'For those who want tea with them on a trip.' },
    occasion: { vi: 'Chuyến công tác hoặc đi chơi cuối tuần.', en: 'For a work trip or weekend away.' },
    purposes: ['travel', 'everyday'], times: ['workday', 'weekend'], ready: false, components: [],
    plannedContents: { vi: 'Dự kiến: ba loại trà dạng gói nhỏ. Loại trà, khối lượng và cách đóng gói cần được xác nhận trước khi mở bán.', en: 'Planned: three teas in small packs. The teas, weights and packing must be confirmed before sale.' },
  },
  {
    id: 'cafe-trial',
    name: { vi: 'Thử trà cho quán', en: 'Tea trials for a café' },
    description: { vi: 'Ý tưởng mẫu trà để quán thử theo công thức riêng.', en: 'Planned tea samples for a café to try in its own recipes.' },
    audience: { vi: 'Chủ quán và người phụ trách pha chế.', en: 'For café owners and beverage teams.' },
    occasion: { vi: 'Buổi thử công thức tại quán.', en: 'For a recipe trial at the café.' },
    purposes: ['cafe', 'discovery'], times: ['workday'], ready: false, components: [],
    plannedContents: { vi: 'Dự kiến: mẫu Shan Mộc, Shan Mật và Ngọc Lan. Khối lượng mẫu và cách đóng gói sẽ được xác nhận trước khi mở bán.', en: 'Planned: Shan Mộc, Shan Mật and Magnolia samples. Sample weights and packing will be confirmed before sale.' },
  },
  {
    id: 'familiar-and-new',
    name: { vi: 'Trà quen và một vị mới', en: 'A familiar tea and a new choice' },
    description: { vi: 'Ý tưởng ghép gói trà bạn tự chọn với một phần trà nhỏ để khám phá thêm.', en: 'A planned pairing of a tea pack you choose with a small portion for further exploration.' },
    audience: { vi: 'Người muốn chọn lại trà quen và tự chọn thêm một trà mới.', en: 'For those choosing a familiar tea and another tea to explore.' },
    occasion: { vi: 'Bổ sung trà hằng ngày hoặc thử trà cuối tuần.', en: 'For replenishing everyday tea or weekend tasting.' },
    purposes: ['everyday', 'discovery'], times: ['break', 'weekend'], ready: false, components: [],
    plannedContents: { vi: 'Dự kiến: một gói trà quen do bạn chọn và một phần trà 20g do bạn tự chọn. Trà và quy cách đóng gói cần được xác nhận trước khi mở bán.', en: 'Planned: a familiar tea pack you choose and a 20g portion of another tea you choose. Teas and packing must be confirmed before sale.' },
  },
];

export function resolveRetailBundle(bundle, products, cart = {}) {
  const result = (lines, subtotal, reason) => ({ bundle, lines, subtotal, canAdd: reason === null, reason });
  if (bundle?.ready !== true) return result([], null, 'not_ready');
  if (!Array.isArray(bundle.components) || !bundle.components.length) return result([], null, 'unavailable');

  const currentProducts = new Map();
  const ambiguousProducts = new Set();
  for (const product of Array.isArray(products) ? products : []) {
    if (!product?.id) continue;
    if (currentProducts.has(product.id)) ambiguousProducts.add(product.id);
    else currentProducts.set(product.id, product);
  }
  const byKey = new Map();
  for (const component of bundle.components) {
    if (!component || typeof component.productId !== 'string' || typeof component.weight !== 'string' || !component.weight
      || !Number.isSafeInteger(component.qty) || component.qty < 1) return result([], null, 'unavailable');
    if (ambiguousProducts.has(component.productId)) return result([], null, 'unavailable');
    const product = currentProducts.get(component.productId);
    if (!product || product.kind === 'goods' || product.line === 'sample') return result([], null, 'unavailable');
    // A base product price, another weight or an inferred kg conversion cannot
    // replace the exact saleable variant listed in a bundle.
    const options = retailOptions(product).filter(item => item.weight === component.weight);
    if (options.length !== 1) return result([], null, 'unavailable');
    const option = options[0];
    if (!Object.hasOwn(parseRetailCart({ [option.key]: 1 }), option.key)) return result([], null, 'unavailable');
    const previous = byKey.get(option.key);
    const qty = (previous?.qty || 0) + component.qty;
    if (!Number.isSafeInteger(qty)) return result([], null, 'cart_limit');
    byKey.set(option.key, { ...option, qty });
  }

  const lines = [...byKey.values()];
  const priced = lines.every(line => line.price !== null);
  const subtotal = priced ? lines.reduce((sum, line) => sum + line.price * line.qty, 0) : null;
  if (!priced || !Number.isFinite(subtotal) || lines.some(line => !line.orderable)) return result(lines, Number.isFinite(subtotal) ? subtotal : null, 'unavailable');

  const currentCart = parseRetailCart(cart);
  if (lines.some(line => line.qty + (currentCart[line.key] || 0) > RETAIL_CART_MAX)) return result(lines, subtotal, 'cart_limit');
  if (lines.some(line => line.stock !== null && line.qty + (currentCart[line.key] || 0) > line.stock)) return result(lines, subtotal, 'stock_limit');
  return result(lines, subtotal, null);
}

export function addRetailBundleToCart(current, bundle, products) {
  const resolved = resolveRetailBundle(bundle, products, current);
  if (!resolved.canAdd) return { ok: false, cart: current, reason: resolved.reason };
  const cart = parseRetailCart(current);
  // Validation above covers the combined demand. Do not increment through a
  // clamping helper: either every exact component is added or none of them is.
  for (const line of resolved.lines) cart[line.key] = (cart[line.key] || 0) + line.qty;
  return { ok: true, cart, reason: null };
}

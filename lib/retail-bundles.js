import { retailOptions } from './retail-catalog.js';
import { parseRetailCart, RETAIL_CART_MAX } from './retail-cart.js';

export const RETAIL_BUNDLE_PURPOSES = [
  { id: 'everyday', name: { vi: 'Uống hằng ngày', en: 'Everyday tea' } },
  { id: 'discovery', name: { vi: 'Khám phá trà', en: 'Explore tea' } },
  { id: 'gifting', name: { vi: 'Tặng trà', en: 'Give tea' } },
  { id: 'office', name: { vi: 'Dùng ở văn phòng', en: 'Office tea' } },
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
    id: 'first-tea',
    placement: 'featured',
    name: { vi: 'Lục & Bạch', en: 'Green & White' },
    description: { vi: 'Lục Trà Shan 200g làm trà chính, cùng Bạch Mẫu Đơn 50g để khám phá thêm bạch trà.', en: 'Shan green tea 200g as your main tea, with White Peony 50g to explore white tea.' },
    audience: { vi: 'Người đã uống lục trà và muốn thử thêm bạch trà.', en: 'For green tea drinkers who want to explore white tea.' },
    occasion: { vi: 'Pha trà quen lúc nghỉ và thử bạch trà vào cuối tuần.', en: 'For a familiar tea at break time and white tea discovery at the weekend.' },
    pairingReason: { vi: 'Giữ lục trà làm lựa chọn chính, rồi pha riêng bạch trà khi muốn thử một dòng trà khác.', en: 'Keep green tea as your main choice, then brew the white tea separately when you want to explore another tea.' },
    purposes: ['everyday', 'discovery'], times: ['break', 'weekend'], ready: true,
    components: [{ productId: 'luc-tra-shan-mv4nnv9p', weight: '200g', qty: 1 }, { productId: 'bach-mau-don', weight: '50g', qty: 1 }],
  },
  {
    id: 'home-and-work',
    placement: 'replenishment',
    name: { vi: 'Trà ở nhà và nơi làm việc', en: 'Tea for home and work' },
    description: { vi: 'Hai gói trà xanh 500g để chia giữa nhà và nơi làm việc. Giá bộ là tổng giá hai gói hiện hành.', en: 'Two 500g green tea packs to divide between home and work. The set total is the current price of both packs.' },
    audience: { vi: 'Người muốn có cùng một trà ở nhà và nơi làm việc.', en: 'For those who want the same tea at home and at work.' },
    occasion: { vi: 'Những ngày làm việc và giờ nghỉ uống trà.', en: 'For workdays and tea breaks.' },
    pairingReason: { vi: 'Để nguyên một gói ở mỗi nơi sẽ tiện hơn khi bạn thường pha cùng một trà ở cả hai chỗ.', en: 'Keep one unopened pack at each location when you regularly brew the same tea in both places.' },
    purposes: ['everyday', 'office'], times: ['workday', 'break'], ready: true,
    components: [{ productId: 'daily-green-tea-iced-tea-mu3w9lr0', weight: '500g', qty: 2 }],
    alternative: { productId: 'daily-green-tea-iced-tea-mu3w9lr0', weight: '1kg', qty: 1 },
  },
  {
    id: 'weekend',
    placement: 'featured',
    name: { vi: 'Một buổi thong thả', en: 'An unhurried afternoon' },
    description: { vi: 'Bạch Mẫu Đơn 50g cùng một viên Phổ Nhĩ để pha riêng trong những lúc thong thả.', en: 'White Peony 50g with one Pu-erh piece to brew separately when you have time to slow down.' },
    audience: { vi: 'Người muốn dành thời gian thử hai dòng trà.', en: 'For those who want time to explore two teas.' },
    occasion: { vi: 'Lúc nghỉ và những buổi cuối tuần.', en: 'For breaks and unhurried weekends.' },
    pairingReason: { vi: 'Hai dòng trà cho hai lần chọn khác nhau: pha riêng để biết bạn muốn trở lại với trà nào.', en: 'Two teas for separate choices: brew each on its own and discover which one you want to return to.' },
    equipment: { vi: 'Cần ấm hoặc dụng cụ lọc trà để pha riêng từng loại; dụng cụ không nằm trong bộ.', en: 'Use a teapot or infuser to brew each tea separately; brewing equipment is not included.' },
    purposes: ['everyday', 'discovery'], times: ['break', 'weekend'], ready: true,
    components: [{ productId: 'bach-mau-don', weight: '50g', qty: 1 }, { productId: 'pho-nhi-vien-mv2k5p6r', weight: '1 viên', qty: 1 }],
  },
  {
    id: 'office',
    placement: 'replenishment',
    name: { vi: 'Góc trà văn phòng', en: 'The office tea corner' },
    description: { vi: 'Ngọc Lan 1kg, Lục Trà Shan 200g và Bạch Mẫu Đơn 50g: tổng 1,25kg trà, trong đó 80% là Ngọc Lan.', en: 'Magnolia 1kg, Shan green tea 200g and White Peony 50g: 1.25kg of tea in total, with Magnolia making up 80%.' },
    audience: { vi: 'Nhóm đồng nghiệp đã có nhu cầu dùng Ngọc Lan và muốn thêm hai lựa chọn trà.', en: 'For colleagues who already need Magnolia and want two additional tea choices.' },
    occasion: { vi: 'Ngày làm việc và giờ nghỉ cùng đồng nghiệp.', en: 'For workdays and breaks with colleagues.' },
    pairingReason: { vi: 'Ngọc Lan là phần trà chính để bổ sung cho nhóm; hai gói nhỏ hơn dành cho lúc muốn đổi trà.', en: 'Magnolia is the main replenishment for the group, while the two smaller packs offer a change of tea.' },
    purposes: ['office', 'everyday'], times: ['workday', 'break'], ready: true,
    components: [{ productId: 'luc-tra-ngoc-lan', weight: '1kg', qty: 1 }, { productId: 'luc-tra-shan-mv4nnv9p', weight: '200g', qty: 1 }, { productId: 'bach-mau-don', weight: '50g', qty: 1 }],
  },
  {
    id: 'lotus-and-leaf',
    placement: 'related',
    name: { vi: 'Sen và trà lá', en: 'Lotus and leaf' },
    description: { vi: 'Trà Gạo Sen 3 Lần cùng Lục Trà Shan để chọn theo từng lần pha.', en: 'Three-times lotus-scented tea with Shan green tea to choose between for each session.' },
    audience: { vi: 'Người muốn thử trà sen bên cạnh một dòng lục trà.', en: 'For those exploring lotus tea alongside a green tea.' },
    occasion: { vi: 'Cuối tuần thưởng trà hoặc chọn trà tặng.', en: 'For weekend tea or a tea gift.' },
    pairingReason: { vi: 'Giữ một gói lục trà để dùng quen, cùng gói trà sen để pha riêng khi muốn đổi lựa chọn.', en: 'Keep a green tea pack as a familiar choice, with a lotus tea pack to brew separately when you want a change.' },
    purposes: ['discovery', 'gifting'], times: ['weekend', 'special'], ready: true,
    components: [{ productId: 'tra-gao-sen-3-lan', weight: '50g', qty: 1 }, { productId: 'luc-tra-shan-mv4nnv9p', weight: '200g', qty: 1 }],
  },
  {
    id: 'lotus-and-white',
    placement: 'featured',
    name: { vi: 'Sen & Bạch', en: 'Lotus & White' },
    description: { vi: 'Trà Gạo Sen 3 Lần 50g và Bạch Mẫu Đơn 50g trong hai gói trà riêng. Quà gồm các gói trà, không kèm hộp quà hay dụng cụ.', en: 'Three-times lotus-scented tea 50g and White Peony 50g in separate tea packs. A tea gift of the listed packs, without a gift box or brewing equipment.' },
    audience: { vi: 'Người muốn thử hoặc tặng hai lựa chọn trà.', en: 'For those exploring or giving two tea choices.' },
    occasion: { vi: 'Một buổi cuối tuần hoặc dịp tặng trà.', en: 'For a weekend session or a tea-giving occasion.' },
    pairingReason: { vi: 'Hai gói riêng để người uống tự chọn trà sen hoặc bạch trà cho từng lần pha, cũng tiện chia sẻ cùng người nhận quà.', en: 'Separate packs let the drinker choose lotus tea or white tea for each brew, and make it easy to share with a gift recipient.' },
    purposes: ['discovery', 'gifting'], times: ['weekend', 'special'], ready: true,
    components: [{ productId: 'tra-gao-sen-3-lan', weight: '50g', qty: 1 }, { productId: 'bach-mau-don', weight: '50g', qty: 1 }],
  },
  {
    id: 'special-gift',
    placement: 'upgrade',
    upgradeFor: 'lotus-and-white',
    name: { vi: 'Sen & Bạch · lựa chọn Sen 7 Lần', en: 'Lotus & White · Seven-times lotus option' },
    description: { vi: 'Lựa chọn Trà Gạo Sen 7 Lần 50g thay cho Sen 3 Lần trong bộ Sen & Bạch, cùng Bạch Mẫu Đơn 50g. Quà gồm hai gói trà riêng.', en: 'Choose seven-times lotus-scented tea 50g in place of three-times lotus tea in Lotus & White, alongside White Peony 50g. The gift consists of two separate tea packs.' },
    audience: { vi: 'Người muốn chọn Sen 7 Lần trong bộ Sen & Bạch.', en: 'For those who want the seven-times lotus option in Lotus & White.' },
    occasion: { vi: 'Dịp cảm ơn, gặp gỡ hoặc tặng trà.', en: 'For a thank-you, a gathering or a tea gift.' },
    pairingReason: { vi: 'Giữ gói bạch trà và chọn Sen 7 Lần khi đây là trà sen bạn hoặc người nhận muốn thưởng thức.', en: 'Keep the white tea pack and choose seven-times lotus tea when it is the lotus tea you or the recipient want to enjoy.' },
    purposes: ['gifting'], times: ['special'], ready: true,
    components: [{ productId: 'tra-gao-sen-7-lan', weight: '50g', qty: 1 }, { productId: 'bach-mau-don', weight: '50g', qty: 1 }],
  },
  {
    id: 'lotus-comparison',
    placement: 'specialist',
    name: { vi: 'Đối chiếu hai trà sen', en: 'Compare two lotus teas' },
    description: { vi: 'Hai sản phẩm Trà Gạo Sen 3 Lần 50g và Trà Gạo Sen 7 Lần 50g để pha riêng rồi đối chiếu cảm nhận.', en: 'Two products, three-times lotus-scented tea 50g and seven-times lotus-scented tea 50g, to brew separately and compare your impressions.' },
    audience: { vi: 'Người muốn tìm hiểu hai lựa chọn trà sen của Nhà.', en: 'For those exploring the house’s two lotus tea selections.' },
    occasion: { vi: 'Buổi thưởng trà cuối tuần hoặc dịp chia sẻ trà.', en: 'For weekend tasting or sharing tea on a special occasion.' },
    pairingReason: { vi: 'Đối chiếu để chọn sản phẩm bạn thích. Nền và lô trà có thể khác nhau, nên không thể quy mọi khác biệt chỉ cho số lần ướp sen.', en: 'Compare them to find the product you prefer. The base tea and lots may differ, so differences cannot all be attributed to the number of lotus-scenting rounds.' },
    purposes: ['discovery', 'gifting'], times: ['weekend', 'special'], ready: true,
    components: [{ productId: 'tra-gao-sen-3-lan', weight: '50g', qty: 1 }, { productId: 'tra-gao-sen-7-lan', weight: '50g', qty: 1 }],
  },
  {
    id: 'find-your-taste',
    placement: 'planned',
    name: { vi: 'Tìm gu của Nhà', en: 'Find your house tea taste' },
    description: { vi: 'Ý tưởng ba gói trà lá nhỏ để thử riêng trước khi chọn gói lớn.', en: 'A planned selection of three small loose-leaf packs to try separately before choosing a larger pack.' },
    audience: { vi: 'Người muốn khám phá nhiều lựa chọn trà.', en: 'For those who want to explore several teas.' },
    occasion: { vi: 'Những lần pha thử lúc nghỉ hoặc cuối tuần.', en: 'For tasting during breaks or weekends.' },
    pairingReason: { vi: 'Mỗi trà một gói riêng để bạn lần lượt thử Shan Mộc, Shan Mật và Ngọc Lan rồi tìm lựa chọn muốn uống tiếp.', en: 'A separate pack for each tea lets you try Shan Mộc, Shan Mật and Magnolia in turn and find the one you want to keep drinking.' },
    purposes: ['discovery'], times: ['break', 'weekend'], ready: false, components: [],
    plannedContents: { vi: 'Dự kiến: Shan Mộc 20g, Shan Mật 20g và Ngọc Lan 20g, thành ba gói trà lá riêng. Cần xác nhận quy cách đóng gói trước khi mở bán.', en: 'Planned: Shan Mộc 20g, Shan Mật 20g and Magnolia 20g in three separate loose-leaf packs. Packing must be confirmed before sale.' },
  },
  {
    id: 'lotus-discovery',
    placement: 'planned',
    name: { vi: 'Một hẹn với sen', en: 'A date with lotus' },
    description: { vi: 'Ý tưởng phần trà sen nhỏ đi cùng bạch trà để bắt đầu khám phá.', en: 'A planned small portion of lotus tea alongside white tea to begin exploring.' },
    audience: { vi: 'Người muốn thử trà sen với lượng nhỏ.', en: 'For those who want a small introduction to lotus tea.' },
    occasion: { vi: 'Một buổi thử trà hoặc chia sẻ trà.', en: 'For a tasting or sharing tea.' },
    pairingReason: { vi: 'Một phần sen nhỏ để thử, cùng bạch trà để bạn có thêm một lựa chọn cho lần pha khác.', en: 'A small lotus tea portion to explore, with white tea as another choice for a separate brew.' },
    purposes: ['discovery', 'gifting'], times: ['break', 'special'], ready: false, components: [],
    plannedContents: { vi: 'Dự kiến: Trà Gạo Sen 3 Lần 10g và Bạch Mẫu Đơn 20g. Cần xác nhận quy cách đóng gói trước khi mở bán.', en: 'Planned: 10g of three-times lotus-scented tea and 20g of White Peony. Packing must be confirmed before sale.' },
  },
  {
    id: 'honey-and-smoke',
    placement: 'planned',
    name: { vi: 'Mật & Khói', en: 'Honey & Smoke' },
    description: { vi: 'Ý tưởng hai gói Shan Mật và Shan Khói để pha riêng rồi đối chiếu.', en: 'A planned pairing of Shan Mật and Shan Khói in separate packs to brew and compare.' },
    audience: { vi: 'Người muốn tìm hiểu Shan Mật và Shan Khói bên cạnh nhau.', en: 'For those who want to explore Shan Mật and Shan Khói side by side.' },
    occasion: { vi: 'Buổi thử trà thong thả hoặc chia sẻ cùng người thích khám phá.', en: 'For an unhurried tasting or sharing with someone who enjoys exploring tea.' },
    pairingReason: { vi: 'Thử từng trà riêng giúp bạn tìm lựa chọn muốn uống tiếp trước khi mua gói lớn.', en: 'Trying each tea separately helps you find the one you want to return to before choosing a larger pack.' },
    purposes: ['discovery'], times: ['break', 'weekend'], ready: false, components: [],
    plannedContents: { vi: 'Dự kiến: Shan Mật 30g và Shan Khói 30g trong hai gói trà lá riêng. Cần xác nhận quy cách đóng gói trước khi mở bán.', en: 'Planned: Shan Mật 30g and Shan Khói 30g in two separate loose-leaf packs. Packing must be confirmed before sale.' },
  },
  {
    id: 'personal-office',
    placement: 'planned',
    name: { vi: 'Góc trà cá nhân', en: 'Your personal tea corner' },
    description: { vi: 'Ý tưởng ba gói trà lá để một người luân phiên chọn trà ở nơi làm việc.', en: 'A planned selection of three loose-leaf packs for one person to rotate through at work.' },
    audience: { vi: 'Người muốn có vài lựa chọn trà cho góc làm việc riêng.', en: 'For someone who wants a few tea choices at their own desk.' },
    occasion: { vi: 'Giờ nghỉ uống trà trong ngày làm việc.', en: 'For tea breaks during the workday.' },
    pairingReason: { vi: 'Ba gói riêng giúp bạn chọn một trà theo ý thích mỗi lần pha mà không cần mua ngay các gói lớn.', en: 'Three separate packs let you choose a tea for each brew without starting with larger packs.' },
    equipment: { vi: 'Cần ấm hoặc dụng cụ lọc trà; bộ dự kiến không kèm dụng cụ pha.', en: 'A teapot or tea infuser is required; brewing equipment is not included in the planned set.' },
    purposes: ['office', 'everyday', 'discovery'], times: ['workday', 'break'], ready: false, components: [],
    plannedContents: { vi: 'Dự kiến: Shan Mộc 50g, Shan Mật 50g và Ngọc Lan 50g trong ba gói trà lá riêng. Cần xác nhận quy cách đóng gói trước khi mở bán.', en: 'Planned: Shan Mộc 50g, Shan Mật 50g and Magnolia 50g in three separate loose-leaf packs. Packing must be confirmed before sale.' },
  },
  {
    id: 'travel',
    placement: 'archived',
    name: { vi: 'Trà mang theo', en: 'Tea to take along' },
    description: { vi: 'Ý tưởng ba phần trà nhỏ để mang theo khi đi xa.', en: 'A planned selection of three small tea portions to take on a trip.' },
    audience: { vi: 'Người muốn mang trà theo chuyến đi.', en: 'For those who want tea with them on a trip.' },
    occasion: { vi: 'Chuyến công tác hoặc đi chơi cuối tuần.', en: 'For a work trip or weekend away.' },
    purposes: ['travel', 'everyday'], times: ['workday', 'weekend'], ready: false, components: [],
    plannedContents: { vi: 'Dự kiến: ba loại trà dạng gói nhỏ. Loại trà, khối lượng và cách đóng gói cần được xác nhận trước khi mở bán.', en: 'Planned: three teas in small packs. The teas, weights and packing must be confirmed before sale.' },
  },
  {
    id: 'cafe-trial',
    placement: 'archived',
    name: { vi: 'Thử trà cho quán', en: 'Tea trials for a café' },
    description: { vi: 'Ý tưởng mẫu trà để quán thử theo công thức riêng.', en: 'Planned tea samples for a café to try in its own recipes.' },
    audience: { vi: 'Chủ quán và người phụ trách pha chế.', en: 'For café owners and beverage teams.' },
    occasion: { vi: 'Buổi thử công thức tại quán.', en: 'For a recipe trial at the café.' },
    purposes: ['cafe', 'discovery'], times: ['workday'], ready: false, components: [],
    plannedContents: { vi: 'Dự kiến: mẫu Shan Mộc, Shan Mật và Ngọc Lan. Khối lượng mẫu và cách đóng gói sẽ được xác nhận trước khi mở bán.', en: 'Planned: Shan Mộc, Shan Mật and Magnolia samples. Sample weights and packing will be confirmed before sale.' },
  },
  {
    id: 'familiar-and-new',
    placement: 'archived',
    name: { vi: 'Trà quen và một vị mới', en: 'A familiar tea and a new choice' },
    description: { vi: 'Ý tưởng ghép gói trà bạn tự chọn với một phần trà nhỏ để khám phá thêm.', en: 'A planned pairing of a tea pack you choose with a small portion for further exploration.' },
    audience: { vi: 'Người muốn chọn lại trà quen và tự chọn thêm một trà mới.', en: 'For those choosing a familiar tea and another tea to explore.' },
    occasion: { vi: 'Bổ sung trà hằng ngày hoặc thử trà cuối tuần.', en: 'For replenishing everyday tea or weekend tasting.' },
    purposes: ['everyday', 'discovery'], times: ['break', 'weekend'], ready: false, components: [],
    plannedContents: { vi: 'Dự kiến: một gói trà quen do bạn chọn và một phần trà 20g do bạn tự chọn. Trà và quy cách đóng gói cần được xác nhận trước khi mở bán.', en: 'Planned: a familiar tea pack you choose and a 20g portion of another tea you choose. Teas and packing must be confirmed before sale.' },
  },
];

// One visible card can offer several exact compositions. Filtering and selection
// must choose the same composition that is priced and subsequently added to cart.
export function resolveRetailBundleFamilies(products, cart = {}, {
  productId = null, compact = false, purpose = 'all', budget = 'all', time = 'all', selections = {},
} = {}) {
  const isCompact = compact || Boolean(productId);
  const ready = RETAIL_BUNDLES.filter(bundle => bundle.ready && bundle.placement !== 'archived');
  const order = { featured: 0, specialist: 1, replenishment: 2, related: 3 };
  const matches = bundle => (purpose === 'all' || bundle.purposes.includes(purpose))
    && (time === 'all' || bundle.times.includes(time));
  const matchesBudget = subtotal => budget === 'all' || (Number.isFinite(subtotal)
    && (budget === 'low' ? subtotal < 500000 : budget === 'mid' ? subtotal >= 500000 && subtotal <= 1000000 : budget === 'high' && subtotal > 1000000));
  return ready.filter(family => family.placement !== 'upgrade' && (productId || family.placement !== 'related'))
    .map(family => {
      const variants = [family, ...ready.filter(bundle => bundle.upgradeFor === family.id)];
      const choices = variants.filter(bundle => !productId || bundle.components.some(component => String(component.productId) === String(productId)))
        .map(bundle => {
          const resolved = resolveRetailBundle(bundle, products, cart);
          return { resolved, eligible: isCompact || (matches(bundle) && matchesBudget(resolved.subtotal)),
            alternative: bundle.alternative ? resolveRetailBundle({ ready: true, components: [bundle.alternative] }, products, cart) : null };
        });
      const selected = choices.find(choice => choice.eligible && choice.resolved.bundle.id === selections[family.id])
        || choices.find(choice => choice.eligible);
      return selected ? { family, choices, placement: family.placement, ...selected } : null;
    }).filter(Boolean).sort((a, b) => (order[a.placement] ?? 4) - (order[b.placement] ?? 4));
}

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

import { retailOptions, retailProductFacts, retailProductHref } from './retail-catalog.js';

// Editorial starting points, not equivalence claims or a blind tasting. Each
// recommendation is an explicit catalogue identity; names, flavours and prices
// always come from the current product record, never from the reference tea.
const CATEGORIES = [
  {
    id: 'familiar-green',
    productIds: ['luc-tra-shan-moc'],
    vi: {
      label: 'Trà xanh Thái Nguyên',
      intro: 'Nếu quen trà xanh Thái Nguyên, bạn có thể khám phá lục trà Shan của Nhà. Gợi ý này thuộc dòng Shan, không mang chỉ dẫn xuất xứ Thái Nguyên; xem thông tin riêng của sản phẩm trước khi chọn.',
      compare: ['Độ chát khi pha theo thói quen của bạn', 'Hương trong chén và hậu vị sau khi uống'],
    },
    en: {
      label: 'Thái Nguyên green tea',
      intro: 'If Thái Nguyên green tea is your familiar cup, explore the house’s Shan green tea. This is a Shan tea suggestion, with no Thái Nguyên origin claim; check the individual product information before choosing.',
      compare: ['Astringency with your usual brewing approach', 'Aroma in the cup and the finish after a sip'],
    },
  },
  {
    id: 'breakfast-black',
    productIds: ['hong-tra-shan-mat', 'hong-tra-shan-tuyen-mti6jlyg'],
    vi: {
      label: 'Trà đen túi lọc / English Breakfast',
      intro: 'Nếu thường uống trà đen túi lọc hoặc English Breakfast buổi sáng, thử khám phá hồng trà Shan lá rời. Dùng tách trà bạn quen làm mốc và pha từng trà theo hướng dẫn riêng.',
      compare: ['Độ đậm của tách trà nguyên vị', 'Cảm nhận khi thêm sữa, nếu đó là cách bạn thường uống'],
    },
    en: {
      label: 'Black tea bags / English Breakfast',
      intro: 'If your morning cup is black tea bags or English Breakfast, explore loose-leaf Shan black tea. Use your familiar cup as a reference and follow each tea’s own brewing instructions.',
      compare: ['Strength when drinking the tea plain', 'How it tastes with milk, if that is your usual way to drink it'],
    },
    sources: [{ label: 'Dilmah · English Breakfast', url: 'https://shop.dilmahtea.com.au/products/finest-english-breakfast' }],
  },
  {
    id: 'smoky-black',
    productIds: ['hong-tra-shan-khoi'],
    vi: {
      label: 'Trà đen hương khói',
      intro: 'Nếu thích trà đen có hương khói, bắt đầu khám phá từ Hồng Trà Shan Khói. Tự đối chiếu hương và vị theo cách pha bạn thích.',
      compare: ['Cảm nhận hương khói trong chén', 'Độ đậm và hậu vị khi trà nguội bớt'],
    },
    en: {
      label: 'Smoky black tea',
      intro: 'If you enjoy smoky black tea, begin with the house’s Shan Khói black tea. Compare aroma and taste using the brewing approach you enjoy.',
      compare: ['Your impression of smoke in the cup', 'Strength and finish as the tea cools'],
    },
  },
  {
    id: 'floral',
    productIds: ['luc-tra-lai-tieu-chuan', 'luc-tra-hoa-sen', 'tra-gao-sen-3-lan', 'tra-gao-sen-7-lan'],
    vi: {
      label: 'Trà lài / trà sen',
      intro: 'Nếu thường uống trà lài hoặc trà sen, chọn hương hoa bạn muốn khám phá rồi đối chiếu với tách trà quen thuộc.',
      compare: ['Cân bằng giữa hương hoa và vị trà', 'Hương trong chén ở những lần pha tiếp theo'],
    },
    en: {
      label: 'Jasmine / lotus tea',
      intro: 'If jasmine or lotus is your usual tea, choose the floral scent you want to explore and compare it with your familiar cup.',
      compare: ['The balance of floral aroma and tea flavour', 'Aroma in the cup across further infusions'],
    },
  },
  {
    id: 'oolong',
    productIds: ['oolong-kim-tuyen-nghe-nhan-ai-loan-mti6gt2a'],
    vi: {
      label: 'Oolong',
      intro: 'Nếu đã quen uống oolong, bạn có thể khám phá dòng Kim Tuyên trong danh mục của Nhà và ghi lại cảm nhận qua từng nước pha.',
      compare: ['Hương và vị ở nước pha đầu', 'Sự thay đổi qua những lần pha tiếp theo'],
    },
    en: {
      label: 'Oolong',
      intro: 'If oolong is your usual tea, explore the house’s catalogued Kim Tuyên and note your impressions across infusions.',
      compare: ['Aroma and flavour in the first infusion', 'How your impressions change across further infusions'],
    },
  },
];

const COPY = {
  vi: {
    title: 'Bạn thường uống trà gì?',
    intro: 'Bắt đầu từ tách trà quen thuộc để tìm một dòng trà Nhà đáng khám phá. Đây là gợi ý nếm thử; mỗi trà có xuất xứ, cách làm và cách pha riêng.',
    choose: 'Chọn trà bạn quen',
    compare: 'Tự đối chiếu trong chén',
    explore: 'Khám phá trà Nhà',
    sources: 'Tham khảo phong cách trà',
  },
  en: {
    title: 'What tea do you usually drink?',
    intro: 'Start with your familiar cup to find a house tea to explore. These are tasting suggestions; each tea has its own origin, production and brewing method.',
    choose: 'Choose your familiar tea',
    compare: 'Compare in your cup',
    explore: 'Explore the house tea',
    sources: 'Tea style reference',
  },
};

export function retailTeaComparisonCopy(locale = 'vi') {
  return { ...COPY[locale === 'en' ? 'en' : 'vi'] };
}

export function retailTeaComparisons(products = [], locale = 'vi', { productId } = {}) {
  const lang = locale === 'en' ? 'en' : 'vi';
  const current = new Map((Array.isArray(products) ? products : []).filter(product => product?.id).map(product => [product.id, product]));
  return CATEGORIES.map(category => {
    const matches = category.productIds.flatMap(id => {
      const product = current.get(id);
      if (!product || product.kind === 'goods' || product.line === 'sample' || product.available !== true) return [];
      const options = retailOptions(product).filter(option => option.orderable);
      return options.length ? [{ product, facts: retailProductFacts(product, lang), href: retailProductHref(product.id, lang), options }] : [];
    });
    if (!matches.length || (productId != null && !matches.some(item => item.product.id === productId))) return null;
    return {
      id: category.id,
      label: category[lang].label,
      intro: category[lang].intro,
      compare: [...category[lang].compare],
      sources: (category.sources || []).map(source => ({ ...source })),
      products: matches,
    };
  }).filter(Boolean);
}

import { retailProductFacts } from './retail-catalog.js';

// Editorial ways to enjoy the existing tea groups. Warm/cool describe the
// drinking experience, not effects on the body. Recipes stay in product.brew.
const GROUPS = {
  black: {
    vi: { feeling: 'Ấm áp · đậm đà', moment: 'Buổi sáng hoặc đầu giờ chiều', serving: 'Thưởng thức nóng để cảm nhận hương trà; thử thêm đá nếu thích.' },
    en: { feeling: 'Warm · full-flavoured', moment: 'Morning or early afternoon', serving: 'Enjoy warm to explore the aroma, or try over ice.' },
  },
  green: {
    vi: { feeling: 'Thanh mát · tươi sáng', moment: 'Buổi sáng hoặc một khoảng nghỉ ban ngày', serving: 'Pha nhẹ để thưởng thức nóng; hoặc thử ủ lạnh trong ngăn mát.' },
    en: { feeling: 'Refreshing · bright', moment: 'Morning or a daytime pause', serving: 'Try a light warm infusion, or cold brew in the refrigerator.' },
  },
  white: {
    vi: { feeling: 'Nhẹ nhàng · chậm rãi', moment: 'Một buổi sáng thong thả', serving: 'Thử pha từng nước ngắn và so sánh hương vị qua các lần pha.' },
    en: { feeling: 'Gentle · unhurried', moment: 'A slow morning', serving: 'Try short infusions and compare the flavour across steeps.' },
  },
  oolong: {
    vi: { feeling: 'Thư thả · nhiều lớp hương', moment: 'Giờ trà ban ngày cùng bạn bè', serving: 'Pha từng nước, rót hết nước trà và thưởng thức khi còn ấm.' },
    en: { feeling: 'Leisurely · layered', moment: 'Daytime tea with friends', serving: 'Brew in successive infusions, drain each steep and enjoy warm.' },
  },
  scented: {
    vi: { feeling: 'Hương hoa · thanh nhã', moment: 'Buổi sáng hoặc khi tiếp khách ban ngày', serving: 'Thưởng thức nguyên vị để cảm nhận hương hoa; thử nóng hoặc ủ lạnh.' },
    en: { feeling: 'Floral · graceful', moment: 'Morning or welcoming daytime guests', serving: 'Enjoy plain to explore the floral aroma; try warm or cold brewed.' },
  },
  pressed: {
    vi: { feeling: 'Chậm rãi · dành thời gian thưởng trà', moment: 'Một khoảng nghỉ ban ngày', serving: 'Tách lượng trà theo hướng dẫn riêng và thưởng thức từng nước pha.' },
    en: { feeling: 'Unhurried · time for tea', moment: 'A daytime pause', serving: 'Separate the tea as directed and enjoy successive infusions.' },
  },
};

const COPY = {
  vi: { title: 'Gợi ý thưởng trà', feeling: 'Sắc thái hương vị', moment: 'Khoảnh khắc', serving: 'Cách thưởng thức', signature: 'Hương nổi bật', caffeine: 'Trà có caffeine. Nếu nhạy với caffeine, hãy chọn uống sớm trong ngày.' },
  en: { title: 'A moment for this tea', feeling: 'Cup character', moment: 'When to enjoy', serving: 'How to enjoy', signature: 'Signature notes', caffeine: 'Tea contains caffeine. If you are sensitive to caffeine, choose an earlier time of day.' },
};

// Only these two named SKUs supply a fallback when the current catalogue has
// no localized tasting notes. Never give every black tea smoke or honey notes.
const NAMED_NOTES = {
  'hong-tra-shan-khoi': { match: /khói|smok(?:ed|y)/i, vi: 'Khói', en: 'Smoke' },
  'hong-tra-shan-mat': { match: /mật|honey/i, vi: 'Mật ong', en: 'Honey' },
};

export function retailTeaCharacteristics(product = {}, locale = 'vi') {
  if (product.kind === 'goods' || product.line === 'sample') return null;
  const lang = locale === 'en' ? 'en' : 'vi';
  const facts = retailProductFacts(product, lang);
  const experience = GROUPS[facts.groupId]?.[lang];
  if (!experience) return null;
  const name = typeof product.name === 'string' ? product.name : [product.name?.vi, product.name?.en].filter(value => typeof value === 'string').join(' ');
  const namedNote = NAMED_NOTES[product.id];
  const signatureNotes = facts.flavors.length ? facts.flavors : namedNote?.match.test(name) ? [namedNote[lang]] : [];
  return { ...experience, labels: COPY[lang], signatureNotes };
}

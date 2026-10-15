import { tradeProductFacts } from './trade-product-details.js';

// These are alternative starting methods, not replacements for a product's
// recorded brewing recipe. Compressed tea and new, unclassified products need
// their own guidance rather than inheriting loose-leaf brewing times.
const TASTING_IDS = new Set([
  'bach-mau-don',
  'hong-tra-shan-khoi',
  'hong-tra-shan-mat',
  'hong-tra-shan-tuyen-mti6jlyg',
  'luc-tra-shan-moc',
  'luc-tra-hoa-sen',
  'luc-tra-lai-tieu-chuan',
  'luc-tra-ngoc-lan',
  'oolong-kim-tuyen-nghe-nhan-ai-loan-mti6gt2a',
  'tra-gao-sen-3-lan',
  'tra-gao-sen-7-lan',
]);
const BEVERAGE_GROUPS = new Set(['green', 'black', 'scented']);
const COLD_GROUPS = new Set(['green', 'black', 'white', 'oolong', 'scented']);

const COPY = {
  vi: {
    note: 'Mỗi cách pha có định lượng riêng. Ưu tiên hướng dẫn trên nhãn; thử một mẻ nhỏ rồi chỉnh theo khẩu vị, không dùng cùng thời gian cho mọi cách pha.',
    tasting: { id: 'tasting', label: 'Pha thưởng trà', duration: '10–30 giây', caption: 'Nước đầu · pha nhiều lần', instructions: 'Bắt đầu bằng một nước pha ngắn để vị thanh, nhẹ. Rót hết nước trà sau mỗi lần pha; tăng dần thời gian ở các nước sau. Dùng lượng trà và nhiệt độ theo nhãn hoặc hướng dẫn riêng của trà.' },
    hot: { id: 'hot', label: 'Nền pha chế nóng', duration: 'Khoảng 8 phút', caption: 'Cho công thức đồ uống', instructions: 'Dùng định lượng và nhiệt độ theo công thức nền trà. Ủ nóng rồi lọc sạch bã; nếm với đúng lượng sữa, trái cây hoặc đá dự kiến. Nếu quá chát, giảm thời gian hoặc lượng trà ở mẻ tiếp theo.' },
    cold: { id: 'cold', label: 'Ủ lạnh', duration: '16–24 giờ', caption: 'Trong ngăn mát · tối đa 4°C', instructions: 'Dùng nước uống được ở nhiệt độ thường, bình sạch có nắp và đặt ngay vào ngăn mát. Giữ lạnh trong suốt thời gian ủ, sau đó lọc bã, tiếp tục bảo quản lạnh và dùng sớm. Không để trà ủ qua đêm ở nhiệt độ phòng.' },
  },
  en: {
    note: 'Each method uses its own tea-to-water ratio. Follow the label first, test a small batch and adjust to taste; one steeping time does not suit every method.',
    tasting: { id: 'tasting', label: 'Tea tasting', duration: '10–30 seconds', caption: 'First steep · multiple infusions', instructions: 'Start with a short infusion for a lighter cup. Drain the tea completely after each steep and gradually increase the time for later infusions. Use the tea quantity and water temperature on the label or in the tea-specific instructions.' },
    hot: { id: 'hot', label: 'Hot beverage base', duration: 'About 8 minutes', caption: 'For mixed drinks', instructions: 'Use the quantity and temperature in your tea-base recipe. Steep, then strain out all leaves; taste with the intended milk, fruit or ice. If too astringent, reduce the time or tea quantity in the next batch.' },
    cold: { id: 'cold', label: 'Cold brew', duration: '16–24 hours', caption: 'In the refrigerator · at or below 4°C', instructions: 'Use drinking water at room temperature and a clean, covered container, then refrigerate immediately. Keep refrigerated throughout brewing. Strain, keep chilled and use promptly. Do not leave tea brewing overnight at room temperature.' },
  },
};

export function retailBrewingGuidance(product = {}, locale = 'vi') {
  const copy = COPY[locale === 'en' ? 'en' : 'vi'];
  const group = tradeProductFacts(product).groupId;
  if (product.kind === 'goods' || product.line === 'sample') return { methods: [], note: '' };
  const methods = [];
  if (TASTING_IDS.has(product.id)) methods.push(copy.tasting);
  if (BEVERAGE_GROUPS.has(group)) methods.push(copy.hot);
  if (COLD_GROUPS.has(group)) methods.push(copy.cold);
  return { methods, note: methods.length ? copy.note : '' };
}

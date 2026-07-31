// One-time seed script: populates wiki_articles and catalog_products with the
// starter content from the original prototype. Safe to re-run (upserts by id).
//
// Requires SUPABASE_SERVICE_ROLE_KEY in .env.local (Settings > API > service_role
// in the Supabase dashboard — never commit this key, never expose it to the browser).
//
// Run with: npm run seed

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local.\n" +
    "Add SUPABASE_SERVICE_ROLE_KEY (Supabase dashboard > Settings > API > service_role) and try again."
  );
  process.exit(1);
}

const supabase = createClient(url, serviceKey);

const SEED_ARTICLES = [
  {
    id: "shipping-policy",
    category: "policies",
    title: { en: "Shipping", vi: "Giao hàng" },
    body: {
      en: "Delivery timing depends on order volume and destination. For wholesale orders, our team confirms a shipping schedule when finalizing your quotation. For retail orders, we ship after your order and payment are confirmed.\n\nShipping cost is calculated separately based on distance and package weight.",
      vi: "Thời gian giao hàng phụ thuộc vào sản lượng đơn hàng và điểm đến. Với đơn sỉ, đội ngũ sẽ xác nhận lịch giao hàng khi chốt báo giá. Với đơn lẻ, hàng được gửi sau khi đơn và thanh toán được xác nhận.\n\nPhí vận chuyển tính riêng theo khoảng cách và trọng lượng kiện hàng.",
    },
  },
  {
    id: "returns-policy",
    category: "policies",
    title: { en: "Returns & Exchanges", vi: "Đổi trả" },
    body: {
      en: "If your order arrives damaged or incorrect, contact us with your Order ID and we'll arrange a replacement or refund.\n\nFor quality concerns after opening, reach out to our team directly — we review each case individually rather than applying a fixed rule.",
      vi: "Nếu đơn hàng bị hư hỏng hoặc giao sai, liên hệ kèm mã đơn hàng để được đổi hoặc hoàn tiền.\n\nVới vấn đề về chất lượng sau khi đã mở gói, vui lòng liên hệ trực tiếp đội ngũ — mỗi trường hợp được xem xét riêng thay vì áp dụng quy tắc cứng.",
    },
  },
  {
    id: "quality-policy",
    category: "policies",
    title: { en: "Quality Guarantee", vi: "Cam kết chất lượng" },
    body: {
      en: "Every batch is processed on our Japanese steaming line and checked before packing. Because our tea comes from ancient trees rather than uniform plantations, natural variation in leaf appearance between harvests is normal and not a defect.\n\nQuestions about a specific batch — contact our team with your Order ID.",
      vi: "Mỗi mẻ trà được chế biến trên dây chuyền hấp Nhật Bản và kiểm tra trước khi đóng gói. Vì nguyên liệu từ cây trà cổ thụ thay vì đồn điền đồng nhất, sự khác biệt tự nhiên về hình thức búp trà giữa các đợt thu hái là bình thường, không phải lỗi.\n\nCó thắc mắc về một mẻ trà cụ thể — liên hệ đội ngũ kèm mã đơn hàng.",
    },
  },
  {
    id: "payment-methods-policy",
    category: "policies",
    title: { en: "Payment Methods", vi: "Phương thức thanh toán" },
    body: {
      en: "We accept bank transfer via VietQR — a QR code is generated automatically after you submit an order. In-person payment is also available at the tea room.\n\nFor large wholesale orders, payment terms (deposit, balance on delivery, etc.) are agreed directly with our team when finalizing the quotation.",
      vi: "Chấp nhận chuyển khoản qua VietQR — mã QR tự tạo ngay sau khi gửi đơn. Cũng có thể thanh toán trực tiếp tại phòng trà.\n\nVới đơn sỉ số lượng lớn, điều khoản thanh toán (đặt cọc, thanh toán khi giao...) sẽ thoả thuận trực tiếp với đội ngũ khi chốt báo giá.",
    },
  },
  {
    id: "gioi-thieu",
    category: "legacy",
    title: { en: "The House of Hoàng Long", vi: "Nhà làm Trà Hoàng Long là ai" },
    body: {
      en: "Nhà làm Trà Hoàng Long — or shortened, House of Hoàng Long — is a family tea house rooted back to 1995, by two amazing individuals: Mr. Lai and Mrs. Nhi.\n\nAs the name states, we are a household who has developed a heart for this drink. We live with it, we sleep with it — it's the friend we talk to, the family we cherish. We give it everything we've got, with the best of our abilities, and we do everything we can to let it grow.\n\nAnd a slight difference: we sit deliberately in between two sides of the table — not a small individual tea farmer doing this for fun, and not a distant commercial corporation doing this with all the seriousness in the world. We keep the warmth and craft of a family house, but with the structure, technology, and professionalism to work with partners who care and value that.\n\nOur tea room — where visitors can sample the tea directly, or just need a place to let something out — is in Sóc Sơn, Hà Nội. Our processing factory, where things happen behind the scenes, is in Bắc Quang, Tuyên Quang. Feel free to come — we have accommodation, not a fancy hotel, but we'll keep you warm and fed.",
      vi: "Nhà làm Trà Hoàng Long — hay gọi tắt là House of Hoàng Long — là một ngôi nhà trà gia đình, bén rễ từ năm 1995, bởi hai con người tuyệt vời: Ông Lai và Bà Nhi.\n\nĐúng như cái tên, chúng tôi là một gia đình đã dành trọn trái tim cho thức uống này. Chúng tôi sống cùng nó, ngủ cùng nó — nó là người bạn để tâm sự, là người thân để trân quý. Chúng tôi cho nó tất cả những gì mình có, bằng hết khả năng tốt nhất, và làm mọi thứ có thể để nó lớn lên từng ngày.\n\nVà một chút khác biệt: chúng tôi cố tình ngồi giữa hai phía của chiếc bàn — không phải hộ trồng trà nhỏ lẻ làm cho vui, cũng không phải một tập đoàn thương mại xa cách, làm mọi thứ với sự nghiêm túc đến cực đoan. Chúng tôi giữ lại sự ấm áp và thủ công của một ngôi nhà, nhưng có đủ cấu trúc, công nghệ và chuyên nghiệp để làm việc với những đối tác biết trân trọng điều đó.\n\nPhòng trà của chúng tôi — nơi khách có thể thử trà trực tiếp, hoặc chỉ cần một chỗ để trút bầu tâm sự — nằm ở Sóc Sơn, Hà Nội. Xưởng chế biến, nơi mọi thứ diễn ra phía sau hậu trường, ở Bắc Quang, Tuyên Quang. Cứ ghé qua — chúng tôi có chỗ ở, không sang trọng gì, nhưng đủ ấm và đủ no.",
    },
  },
  {
    id: "our-founders",
    category: "legacy",
    title: { en: "Our Founders", vi: "Người sáng lập" },
    body: {
      en: "Trà Hoàng Long has been run by Mr. Nguyễn Đức Lai and Mrs. Trần Thị Nhi since 1995. Three decades on, the same hands-on approach continues — sourcing, tasting, and shipping every batch is still a family responsibility, not something handed off to a faceless supply chain.\n\nIt's a transitioning period now — the next generation is on the learning curve, and will soon join the house in important roles, applying what they've been learning along the way. It's going to happen fast, so stay tuned :)",
      vi: "Trà Hoàng Long do Ông Nguyễn Đức Lai và Bà Trần Thị Nhi điều hành từ năm 1995. Ba mươi năm sau, cách làm vẫn không đổi — thu mua, nếm thử, đóng gói từng mẻ trà vẫn là việc của gia đình, không giao phó cho một chuỗi cung ứng vô danh.\n\nĐây là giai đoạn chuyển giao — thế hệ tiếp theo đang trong quá trình học hỏi, sẽ sớm gia nhập ngôi nhà này ở những vị trí quan trọng, mang theo những gì đã học được áp dụng vào Nhà Hoàng Long. Mọi thứ sẽ diễn ra nhanh thôi, nên cứ đón chờ nhé :)",
    },
  },
  {
    id: "not-farm-not-corp",
    category: "legacy",
    title: { en: "Not a Farm, Not a Corporation", vi: "Không phải hộ trồng, cũng không phải tập đoàn" },
    body: {
      en: "We don't grow every leaf ourselves, and we don't buy off a trading floor either. We work directly with local farmers — people who've lived in the Hoàng Su Phì highlands for hundreds of years — season after season, so the tea in your cup can be traced back to a mountainside, not just a purchase order.\n\nEvery leaf is different from the next, and every mountain has its own slight tweak in ecosystem, but together they live under the guidance of mother nature — and it seems like whatever she's doing is working better than ever. The people, the trees, and the animals here are all alive, fed, and happy. The smile you see on the living beings here is genuinely full of magnetism.\n\nWe do have our own standards, and sometimes the locals have a hard time meeting them — for reasons ranging from a lack of knowledge to insufficient tools. But they simply don't see it the way we do, and just imposing rules wouldn't solve the root cause. We could keep the highest standard by returning under-quality crops, or by applying strict rules onto the farmers — but forcing that onto these local, indigenous people isn't something we have the heart to do. So we always try to work with what we've got. If there are flaws in the picking, it's our job to make it better with our own knowledge, skills, and technology. It's easy to make great things from great ingredients — but to make great things from the ordinary, that's something else :)",
      vi: "Chúng tôi không tự trồng hết mọi búp trà, cũng không mua qua sàn giao dịch trung gian. Chúng tôi làm việc trực tiếp với những người nông dân địa phương — những người đã sống ở vùng cao Hoàng Su Phì hàng trăm năm — mùa này qua mùa khác, để tách trà trong tay khách có thể truy ngược về đúng một ngọn núi, chứ không chỉ là một đơn đặt hàng.\n\nMỗi búp trà mỗi khác, mỗi ngọn núi lại có một hệ sinh thái hơi khác nhau một chút, nhưng tất cả cùng sống dưới sự dẫn dắt của mẹ thiên nhiên — và có vẻ như những gì bà đang làm ngày càng tốt hơn. Con người, cây cối, muông thú ở đây đều sống khoẻ, no đủ và hạnh phúc. Nụ cười của những sinh linh nơi đây có một sức hút thật sự chân thành.\n\nChúng tôi có tiêu chuẩn riêng, và đôi khi bà con gặp khó khi đáp ứng — vì nhiều lý do, từ thiếu kiến thức đến thiếu công cụ. Nhưng họ đơn giản là không nhìn nhận vấn đề giống chúng tôi, và chỉ áp đặt quy tắc thì không giải quyết được gốc rễ. Chúng tôi có thể giữ tiêu chuẩn cao nhất bằng cách trả lại những vụ mùa chưa đạt, hoặc áp luật thật chặt lên nông dân — nhưng ép buộc những người bản địa này là điều chúng tôi không đành lòng làm. Nên chúng tôi luôn cố gắng làm việc với những gì mình có. Nếu khâu hái có sai sót, việc của chúng tôi là làm cho nó tốt hơn bằng kiến thức, kỹ năng và công nghệ của mình. Làm ra thứ tuyệt vời từ nguyên liệu tuyệt vời thì dễ, nhưng làm ra thứ tuyệt vời từ những gì bình thường — đó mới là chuyện khác :)",
    },
  },
  {
    id: "vung-nguyen-lieu",
    category: "origin",
    title: { en: "Ancient Tea Trees of Hoàng Su Phì", vi: "Trà cổ thụ Hoàng Su Phì, Hà Giang" },
    body: {
      en: "Our leaf is Shan Tuyết cổ thụ — ancient, tree-form tea trees, some decades to centuries old — growing wild on the high mountains of Hoàng Su Phì, Hà Giang.\n\nThe altitude and climate give the buds a deeper flavor and a natural sweet aftertaste, distinct from tea grown on industrial lowland farms.",
      vi: "Nguyên liệu là trà Shan Tuyết cổ thụ (cổ thụ = cây trà cổ, thân gỗ lớn, tuổi đời hàng chục đến hàng trăm năm), mọc tự nhiên trên núi cao tại Hoàng Su Phì, Hà Giang.\n\nĐộ cao và khí hậu vùng núi tạo ra búp trà có hương vị đậm, hậu ngọt tự nhiên, khác biệt với trà trồng công nghiệp vùng thấp.",
    },
  },
  {
    id: "why-ancient-trees",
    category: "origin",
    title: { en: "Why Ancient Trees Taste Different", vi: "Vì sao trà cổ thụ có vị khác biệt" },
    body: {
      en: "Cổ thụ tea trees send roots several meters into the mountainside, reaching minerals a shallow-rooted plantation bush never touches. Growth is slower, harvests are smaller, and the leaf's natural compounds end up more concentrated — part of why aged, wild-grown tea sits differently on the tongue than mass-market leaf.",
      vi: "Cây trà cổ thụ đâm rễ sâu vài mét vào lòng núi, chạm tới khoáng chất mà bụi trà trồng công nghiệp rễ nông không bao giờ chạm tới. Cây lớn chậm, sản lượng thu hái ít, các hợp chất tự nhiên trong búp trà vì thế cô đặc hơn — một phần lý do vì sao trà cổ thụ mọc hoang có vị đọng lại khác hẳn trà đại trà.",
    },
  },
  {
    id: "leaf-to-cup",
    category: "origin",
    title: { en: "From Leaf to Cup: Our Process", vi: "Từ búp trà đến tách trà: Quy trình của chúng tôi" },
    body: {
      en: "Hand-picked → steamed within hours of harvest → dried → hand-sorted → packed. Steaming halts oxidation almost instantly, which is what keeps the color green and the character close to the fresh leaf — the whole reason we use a Japanese line instead of a wok.",
      vi: "Hái tay → hấp trong vài giờ sau khi hái → sấy khô → phân loại thủ công → đóng gói. Hấp giúp dừng quá trình oxy hoá gần như ngay lập tức, đó là lý do màu trà vẫn xanh và giữ được đặc tính gần với lá tươi — cũng là lý do chúng tôi dùng dây chuyền Nhật Bản thay vì sao chảo.",
    },
  },
  {
    id: "cong-nghe-nhat",
    category: "origin",
    title: { en: "Japanese Processing Technology", vi: "Công nghệ chế biến Nhật Bản" },
    body: {
      en: "Our tea is processed on a Japanese steaming line, which preserves the leaf's natural green color, nutrients, and original flavor — unlike traditional pan-firing.\n\nOur processing factory sits close to the growing region, so leaves reach the line while still fresh.",
      vi: "Trà được chế biến bằng dây chuyền sản xuất công nghệ Nhật Bản (phương pháp hấp/steaming), giúp giữ trọn màu xanh tự nhiên, dưỡng chất và hương vị nguyên bản của búp trà — khác với cách sao chảo truyền thống.\n\nXưởng chế biến đặt gần vùng nguyên liệu để đảm bảo trà tươi khi đưa vào chế biến.",
    },
  },
  {
    id: "dong-san-pham",
    category: "library",
    title: { en: "Our Two Tea Lines", vi: "Hai dòng sản phẩm chính" },
    body: {
      en: "Two lines, built for two kinds of drinking: everyday café pours and quiet, unhurried cups.",
      vi: "Hai dòng, cho hai cách thưởng trà: pha hàng ngày ở quán, và những tách trà thong thả.",
    },
  },
  {
    id: "everyday-or-reserve",
    category: "library",
    title: { en: "Everyday or Reserve?", vi: "Pha Chế hay Thưởng?" },
    body: {
      en: "Brewing behind a counter for many cups a day? Everyday is built for that — consistent, forgiving, sold by the kilogram. Serving one guest, one pot, at a slower pace? Reserve rewards the extra attention with more complexity per cup.",
      vi: "Pha sau quầy, nhiều tách mỗi ngày? Pha Chế sinh ra cho việc đó — ổn định, dễ pha, bán theo kg. Phục vụ một khách, một ấm, chậm rãi hơn? Thưởng trả lại sự tỉ mỉ đó bằng tầng vị phức tạp hơn trong từng tách.",
    },
  },
  {
    id: "lien-he",
    category: "visit",
    title: { en: "Contact & Locations", vi: "Thông tin liên hệ chính thức" },
    body: {
      en: "Hotline: 0903 333 841\nWebsite: hoanglongtra.com\nEmail: hotro.trahoanglong@gmail.com\n\nTea room (sample tasting): 36B Quốc lộ 2, Xã Sóc Sơn, Hà Nội, Việt Nam\nhttps://maps.google.com/?q=36B+Quốc+lộ+2,+Xã+Sóc+Sơn,+Hà+Nội\n\nProcessing factory: Km117, Tân Lập, Bắc Quang, Tuyên Quang\nhttps://maps.google.com/?q=Km117,+Tân+Lập,+Bắc+Quang,+Tuyên+Quang",
      vi: "Hotline: 0903 333 841\nWebsite: hoanglongtra.com\nEmail: hotro.trahoanglong@gmail.com\n\nPhòng trà (thử mẫu trực tiếp): 36B Quốc lộ 2, Xã Sóc Sơn, Hà Nội, Việt Nam\nhttps://maps.google.com/?q=36B+Quốc+lộ+2,+Xã+Sóc+Sơn,+Hà+Nội\n\nXưởng chế biến: Km117, Tân Lập, Bắc Quang, Tuyên Quang\nhttps://maps.google.com/?q=Km117,+Tân+Lập,+Bắc+Quang,+Tuyên+Quang",
    },
  },
  {
    id: "planning-visit",
    category: "visit",
    title: { en: "Planning a Tasting Visit", vi: "Ghé thử trà tại phòng trà" },
    body: {
      en: "Sampling happens at the tea room in Sóc Sơn. Call or message ahead so someone can walk you through the lineup properly, instead of just handing you a menu.",
      vi: "Thử trà diễn ra tại phòng trà ở Sóc Sơn. Gọi hoặc nhắn trước để có người dẫn a/chị đi qua từng loại trà, thay vì chỉ đưa menu rồi để tự chọn.",
    },
  },
  {
    id: "bang-mau",
    category: "brandkit",
    title: { en: "Colors & Typography", vi: "Bảng màu & Typography" },
    body: {
      en: "Core palette:\n– Rice paper cream: #F7F3EA / #F4EEE1\n– Jade black: #1C2B24 / #2E4A40\n– Brass: #B08D57 / #AD8A4E\n– Lacquer red: accent only, never a background\n\nTypefaces:\n– Noto Serif SC — Chinese character accents\n– Fraunces — English display headlines\n– Inter — body text\n\nBrand seal: circular brass 皇龍 印 mark.",
      vi: "Màu chủ đạo:\n– Giấy dó kem: #F7F3EA / #F4EEE1\n– Ngọc bích đen: #1C2B24 / #2E4A40\n– Brass (đồng thau): #B08D57 / #AD8A4E\n– Đỏ sơn mài: chỉ dùng làm điểm nhấn, không dùng nền\n\nFont chữ:\n– Noto Serif SC — chữ Hán điểm nhấn\n– Fraunces — tiêu đề tiếng Anh\n– Inter — nội dung chính\n\nCon dấu thương hiệu: dấu tròn brass 皇龍 印.",
    },
  },
  {
    id: "voice-tone",
    category: "brandkit",
    title: { en: "Voice & Tone", vi: "Giọng điệu thương hiệu" },
    body: {
      en: "Warm, not folksy. Structured, not corporate. Say \"we source directly from growers,\" not \"farm-to-cup journey.\" Prefer plain sentences over adjectives — let the tea's origin do the selling, not the copy.",
      vi: "Ấm áp, nhưng không quê mùa. Có cấu trúc, nhưng không công ty hoá. Nói \"chúng tôi thu mua trực tiếp từ nông dân\", không nói \"hành trình từ nông trại đến tách trà\". Ưu tiên câu văn đơn giản hơn là tính từ hoa mỹ — để nguồn gốc trà tự nói lên giá trị, không cần lời quảng cáo.",
    },
  },
];

const BREW_BLACK = { en: "95–100°C · steep 3–5 min", vi: "95–100°C · hãm 3–5 phút" };
const BREW_GREEN = { en: "80–85°C · steep 2–3 min", vi: "80–85°C · hãm 2–3 phút" };
const BREW_WHITE = { en: "85–90°C · steep 4–5 min", vi: "85–90°C · hãm 4–5 phút" };

const SEED_CATALOG = [
  { id: "hong-tra-shan-khoi", line: "everyday", available: true, name: { en: "Smoked Black Tea", vi: "Hồng Trà Shan Khói" }, brew: BREW_BLACK, notes: { en: "", vi: "" }, pack_size: "", photo_url: "" },
  { id: "hong-tra-shan-mat", line: "everyday", available: true, name: { en: "Honey Black Tea", vi: "Hồng Trà Shan Mật" }, brew: BREW_BLACK, notes: { en: "", vi: "" }, pack_size: "", photo_url: "" },
  { id: "luc-tra-shan-moc", line: "everyday", available: true, name: { en: "Rustic Green Tea", vi: "Lục Trà Shan Mộc" }, brew: BREW_GREEN, notes: { en: "", vi: "" }, pack_size: "", photo_url: "" },
  { id: "luc-tra-ngoc-lan", line: "everyday", available: true, name: { en: "Magnolia Green Tea", vi: "Lục Trà Hoa Ngọc Lan" }, brew: BREW_GREEN, notes: { en: "", vi: "" }, pack_size: "", photo_url: "" },
  { id: "luc-tra-lai-tieu-chuan", line: "everyday", available: true, name: { en: "Standard Jasmine Green Tea", vi: "Lục Trà Hoa Lài Tiêu Chuẩn" }, brew: BREW_GREEN, notes: { en: "", vi: "" }, pack_size: "", photo_url: "" },
  { id: "luc-tra-lai-tuyen-chon", line: "everyday", available: true, name: { en: "Select Jasmine Green Tea", vi: "Lục Trà Hoa Lài Tuyển Chọn" }, brew: BREW_GREEN, notes: { en: "", vi: "" }, pack_size: "", photo_url: "" },
  { id: "luc-tra-hoa-sen", line: "everyday", available: true, name: { en: "Lotus Green Tea", vi: "Lục Trà Hoa Sen" }, brew: BREW_GREEN, notes: { en: "", vi: "" }, pack_size: "", photo_url: "" },
  { id: "tra-gao-sen-7-lan", line: "reserve", available: true, name: { en: "Seven-Times Lotus-Scented Rice Tea", vi: "Trà Gạo Sen 7 Lần" }, brew: BREW_GREEN, notes: { en: "", vi: "" }, pack_size: "", photo_url: "" },
  { id: "bach-mau-don", line: "reserve", available: true, name: { en: "White Peony (Bạch Mẫu Đơn)", vi: "Bạch Mẫu Đơn" }, brew: BREW_WHITE, notes: { en: "", vi: "" }, pack_size: "", photo_url: "" },
  { id: "hoang-kim-nha", line: "reserve", available: true, name: { en: "Golden Buds (Hoàng Kim Nha)", vi: "Hoàng Kim Nha" }, brew: BREW_BLACK, notes: { en: "", vi: "" }, pack_size: "", photo_url: "" },
];

async function main() {
  console.log(`Seeding ${SEED_ARTICLES.length} wiki articles...`);
  const { error: articlesError } = await supabase.from("wiki_articles").upsert(SEED_ARTICLES);
  if (articlesError) throw articlesError;

  console.log(`Seeding ${SEED_CATALOG.length} catalog products...`);
  const { error: catalogError } = await supabase.from("catalog_products").upsert(SEED_CATALOG);
  if (catalogError) throw catalogError;

  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

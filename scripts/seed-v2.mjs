// v2.0 content update. Safe to run against a database that already has real
// staff-entered data: existing rows are only touched if a field is still empty/null
// or still matches the exact old (v1) text — nothing gets silently overwritten.
// New rows (new products, variants, library articles) are inserted normally.
//
// Requires SUPABASE_SERVICE_ROLE_KEY in .env.local.
// Run with: node --env-file=.env.local scripts/seed-v2.mjs

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

// ---------- Library (new module — always safe, table is brand new) ----------

const LIBRARY_ARTICLES = [
  {
    id: "six-tea-types",
    category: "types",
    title: { en: "The Six Tea Types", vi: "Sáu Loại Trà Cơ Bản" },
    body: {
      en: "All tea — white, green, oolong, black, dark (post-fermented), and yellow — comes from the same plant, Camellia sinensis. What separates them is oxidation and processing, not the leaf itself.\n\nWhite tea is the least processed, simply withered and dried. Green tea is heated early to stop oxidation entirely. Oolong is partially oxidized, sitting between green and black. Black tea is fully oxidized, giving it a darker liquor and bolder character. Dark tea (like pu-erh) is fermented, often aged for years. Yellow tea is close to green, but with an extra slow-piling step that mellows its edge.",
      vi: "Mọi loại trà — bạch trà, lục trà, ô long, hồng trà, hắc trà (hậu lên men), và hoàng trà — đều đến từ cùng một cây, Camellia sinensis. Điều phân biệt chúng là mức độ oxy hoá và cách chế biến, không phải bản thân búp trà.\n\nBạch trà ít chế biến nhất, chỉ làm héo và sấy khô. Lục trà được xử lý nhiệt sớm để dừng oxy hoá hoàn toàn. Ô long oxy hoá một phần, nằm giữa lục trà và hồng trà. Hồng trà oxy hoá hoàn toàn, cho nước trà đậm màu và vị mạnh hơn. Hắc trà (như phổ nhĩ) được lên men, thường ủ nhiều năm. Hoàng trà gần giống lục trà, nhưng có thêm công đoạn ủ chậm giúp vị dịu hơn.",
    },
  },
  {
    id: "ancient-trees-vn",
    category: "vietnam",
    title: { en: "A Tea Tradition Older Than Most Realize", vi: "Một Truyền Thống Lâu Đời Hơn Nhiều Người Nghĩ" },
    body: {
      en: "Vietnam is home to some of the world's oldest living tea trees — wild, tree-form Shan Tuyết varieties found across the northern highlands, some believed to be centuries old. Long before tea became a commercial crop, these mountains were already growing it wild.\n\nThis is different from the low-growing plantation bushes seen in most tea-producing countries — a distinct, older lineage of the same plant.",
      vi: "Việt Nam là nơi có một trong những quần thể cây trà cổ thụ lâu đời nhất thế giới — giống Shan Tuyết mọc hoang, thân gỗ, tìm thấy khắp vùng núi phía Bắc, có cây được cho là đã hàng trăm năm tuổi. Từ rất lâu trước khi trà trở thành cây trồng thương mại, những ngọn núi này đã tự nhiên mọc trà.\n\nĐiều này khác hẳn với các bụi trà trồng thấp ở hầu hết các nước sản xuất trà khác — một dòng giống cổ hơn của cùng một loài cây.",
    },
  },
  {
    id: "everyday-ritual-vn",
    category: "vietnam",
    title: { en: "Trà Đá, Trà Nóng, and Everyday Ritual", vi: "Trà Đá, Trà Nóng, và Nghi Thức Đời Thường" },
    body: {
      en: "In Vietnam, tea is rarely a special occasion — it's a constant. Trà đá (iced tea) is poured freely at street-side stalls, often before you even ask. Trà nóng (hot tea) opens a conversation, a meeting, a visit to someone's home.\n\nThis everyday familiarity is part of why tea in Vietnam feels less like a luxury ritual and more like hospitality itself — the first thing offered, not the last.",
      vi: "Ở Việt Nam, trà hiếm khi là dịp đặc biệt — nó là một hằng số. Trà đá được rót miễn phí ở quán vỉa hè, thường trước cả khi khách kịp hỏi. Trà nóng mở đầu một cuộc trò chuyện, một buổi họp, một lần ghé thăm nhà ai đó.\n\nSự quen thuộc đời thường này là một phần lý do vì sao trà ở Việt Nam không giống nghi thức xa hoa, mà giống chính sự hiếu khách — điều đầu tiên được mời, không phải điều cuối cùng.",
    },
  },
  {
    id: "why-temperature-matters",
    category: "brewing",
    title: { en: "Why Water Temperature Matters", vi: "Vì Sao Nhiệt Độ Nước Quan Trọng" },
    body: {
      en: "Hotter water extracts faster and pulls out more — including compounds that taste bitter if over-extracted. Delicate teas (white, green) use cooler water and shorter time to avoid scorching the leaf. Fuller-bodied teas (black, dark) can handle near-boiling water and longer steeps without turning harsh.\n\nThis is why the same leaf can taste completely different depending on how it's brewed — temperature and time are doing as much work as the tea itself.",
      vi: "Nước càng nóng chiết xuất càng nhanh và càng nhiều — kể cả những hợp chất gây đắng nếu chiết xuất quá mức. Trà tinh tế (bạch trà, lục trà) dùng nước mát hơn và thời gian ngắn hơn để tránh làm cháy búp trà. Trà đậm vị hơn (hồng trà, hắc trà) chịu được nước gần sôi và thời gian hãm lâu hơn mà không bị gắt.\n\nĐó là lý do cùng một loại trà có thể có vị hoàn toàn khác nhau tuỳ cách pha — nhiệt độ và thời gian góp phần không kém gì bản thân lá trà.",
    },
  },
  {
    id: "tasting-vocabulary",
    category: "brewing",
    title: { en: "Reading a Tea's Character", vi: "Đọc Vị Một Ấm Trà" },
    body: {
      en: "A few words worth knowing: body (how the liquor feels — light or full), astringency (a dry, puckering sensation, common in stronger black teas), aroma (the scent before and while drinking), and finish (what lingers after you swallow).\n\nNone of these require a trained palate — just paying attention to what's already there.",
      vi: "Vài từ đáng biết: thể trà (cảm giác nước trà — nhẹ hay đậm), vị chát (cảm giác se, khô miệng, thường gặp ở hồng trà đậm), hương (mùi thơm trước và trong khi uống), và hậu vị (dư vị còn lại sau khi nuốt).\n\nKhông cần vị giác được huấn luyện gì cả — chỉ cần để ý những gì đã có sẵn.",
    },
  },
  {
    id: "whats-in-the-leaf",
    category: "wellbeing",
    title: { en: "What's Actually in the Leaf", vi: "Thực Sự Có Gì Trong Búp Trà" },
    body: {
      en: "Tea naturally contains caffeine (less than coffee, more in stronger black teas) and L-theanine, an amino acid often associated with calm, steady alertness — part of why tea's energy tends to feel different from coffee's.\n\nThis is general, well-known information about tea — not medical advice. For specific health questions, a doctor is always the better source.",
      vi: "Trà tự nhiên chứa caffeine (ít hơn cà phê, nhiều hơn ở hồng trà đậm) và L-theanine, một axit amin thường được cho là mang lại cảm giác tỉnh táo nhưng điềm tĩnh — một phần lý do vì sao năng lượng từ trà thường cảm thấy khác với cà phê.\n\nĐây là thông tin phổ thông về trà — không phải lời khuyên y tế. Với câu hỏi sức khoẻ cụ thể, bác sĩ luôn là nguồn đáng tin hơn.",
    },
  },
];

// ---------- New catalog products (didn't exist before v2 — always safe to insert) ----------

const BREW_GREEN = { en: "80–85°C · steep 2–3 min", vi: "80–85°C · hãm 2–3 phút" };

const NEW_CATALOG_PRODUCTS = [
  {
    id: "tra-gao-sen-3-lan", line: "reserve", available: true, limited: false,
    name: { en: "Three-Times Lotus-Scented Rice Tea", vi: "Trà Gạo Sen 3 Lần" },
    brew: BREW_GREEN,
    notes: { en: "Lighter lotus fragrance from three rounds of scenting; sweet and clean, a gentler take on the seven-times version.", vi: "Hương sen nhẹ nhàng hơn qua 3 lần ướp; ngọt thanh, dịu hơn bản 7 lần." },
    pack_size: "", photo_url: "", photo_position: "50% 50%",
  },
  {
    id: "sample-pack-50g", line: "sample", available: true, price: 149000,
    name: { en: "Sample Pack — 4 Teas (50g each)", vi: "Gói Dùng Thử — 4 Loại Trà (50g/loại)" },
    notes: {
      en: "Try our four everyday teas in one pack: Shan Black (Smoky), Shan Black (Honey), Shan Mộc Green, and Orchid Green — 50g of each.",
      vi: "Thử cả 4 loại trà cơ bản trong một gói: Hồng Trà Shan Khói, Hồng Trà Shan Mật, Lục Trà Shan Mộc, Lục Trà Hoa Ngọc Lan — mỗi loại 50g.",
    },
    brew: { en: "", vi: "" }, pack_size: "4 × 50g", photo_url: "", photo_position: "50% 50%",
  },
  {
    id: "sample-pack-100g", line: "sample", available: true, price: 199000,
    name: { en: "Sample Pack — 4 Teas (100g each)", vi: "Gói Dùng Thử — 4 Loại Trà (100g/loại)" },
    notes: {
      en: "Try our four everyday teas in one pack: Shan Black (Smoky), Shan Black (Honey), Shan Mộc Green, and Orchid Green — 100g of each.",
      vi: "Thử cả 4 loại trà cơ bản trong một gói: Hồng Trà Shan Khói, Hồng Trà Shan Mật, Lục Trà Shan Mộc, Lục Trà Hoa Ngọc Lan — mỗi loại 100g.",
    },
    brew: { en: "", vi: "" }, pack_size: "4 × 100g", photo_url: "", photo_position: "50% 50%",
  },
  {
    id: "sample-pack-250g", line: "sample", available: true, price: 299000,
    name: { en: "Sample Pack — 4 Teas (250g each)", vi: "Gói Dùng Thử — 4 Loại Trà (250g/loại)" },
    notes: {
      en: "Our biggest sample pack: Shan Black (Smoky), Shan Black (Honey), Shan Mộc Green, and Orchid Green — 250g of each (1kg total), great for cafés wanting to test before a full wholesale order.",
      vi: "Gói dùng thử lớn nhất: Hồng Trà Shan Khói, Hồng Trà Shan Mật, Lục Trà Shan Mộc, Lục Trà Hoa Ngọc Lan — mỗi loại 250g (tổng 1kg), phù hợp cho quán muốn thử trước khi đặt sỉ.",
    },
    brew: { en: "", vi: "" }, pack_size: "4 × 250g", photo_url: "", photo_position: "50% 50%",
  },
];

// ---------- Reference prices for existing products (only applied if price is still null) ----------

const REFERENCE_PRICES = {
  "hong-tra-shan-khoi": 265000,
  "hong-tra-shan-mat": 245000,
  "luc-tra-shan-moc": 225000,
  "luc-tra-ngoc-lan": 250000,
  "luc-tra-lai-tieu-chuan": 450000,
  "luc-tra-hoa-sen": 150000,
};

// ---------- Variants for reserve-line products with size options ----------
// Only inserted for products that exist and don't already have variant rows.

const VARIANTS_BY_PRODUCT = {
  "tra-gao-sen-7-lan": [
    { weight: "50g", price: 1500000 },
    { weight: "100g", price: 3000000 },
  ],
  "tra-gao-sen-3-lan": [
    { weight: "50g", price: 750000 },
    { weight: "100g", price: 1500000 },
  ],
  "bach-mau-don": [
    { weight: "50g", price: 175000 },
    { weight: "100g", price: 350000 },
  ],
  "hoang-kim-nha": [
    { weight: "50g", price: 225000 },
    { weight: "100g", price: 450000 },
  ],
};

// ---------- Wiki articles whose copy changed in v2 — only updated if still exactly the old text ----------

const WIKI_UPDATES = [
  {
    id: "shipping-policy",
    oldBodyEn: "Delivery timing depends on order volume and destination. For wholesale orders, our team confirms a shipping schedule when finalizing your quotation. For retail orders, we ship after your order and payment are confirmed.\n\nShipping cost is calculated separately based on distance and package weight.",
    newBody: {
      en: "Prices shown do not include shipping.\n\nFor wholesale and export orders, our shipping term is EXW (Ex Works) — pickup is arranged and paid for by the buyer directly from our factory or warehouse.\n\nSample Packs ship free.\n\nFor regular retail orders, shipping cost is calculated by our delivery provider based on destination and package weight, and confirmed with you before the order is finalized.",
      vi: "Giá niêm yết chưa bao gồm phí vận chuyển.\n\nVới đơn sỉ và đơn xuất khẩu, phương thức giao hàng là EXW (giao tại xưởng) — bên mua tự sắp xếp và chịu phí vận chuyển từ xưởng/kho của chúng tôi.\n\nGói Dùng Thử được miễn phí vận chuyển.\n\nVới đơn lẻ thông thường, phí vận chuyển tính theo đơn vị vận chuyển dựa trên điểm đến và trọng lượng kiện hàng, sẽ được xác nhận với khách trước khi chốt đơn.",
    },
  },
  {
    id: "planning-visit",
    oldBodyEn: "Sampling happens at the tea room in Sóc Sơn. Call or message ahead so someone can walk you through the lineup properly, instead of just handing you a menu.",
    newBody: {
      en: "It's a homey environment, not like anywhere else — you'll be taken care of one on one. Feel free to make an appointment, just like visiting a friend's house.\n\nSampling happens at the tea room in Sóc Sơn. Call or message ahead so someone can walk you through the lineup properly, instead of just handing you a menu.",
      vi: "Đây là một không gian ấm cúng như nhà, không giống những nơi khác — a/chị sẽ được đón tiếp riêng, một-một. Cứ thoải mái đặt lịch hẹn, như ghé nhà một người bạn vậy.\n\nThử trà diễn ra tại phòng trà ở Sóc Sơn. Gọi hoặc nhắn trước để có người dẫn a/chị đi qua từng loại trà, thay vì chỉ đưa menu rồi để tự chọn.",
    },
  },
];

async function main() {
  console.log(`Inserting ${LIBRARY_ARTICLES.length} library articles...`);
  const { error: libErr } = await supabase.from("library_articles").upsert(LIBRARY_ARTICLES);
  if (libErr) throw libErr;

  console.log("Inserting new catalog products (skipping any that already exist)...");
  for (const p of NEW_CATALOG_PRODUCTS) {
    const { error } = await supabase.from("catalog_products").insert(p);
    if (error) {
      if (error.code === "23505") console.log(`  - ${p.id} already exists, skipped`);
      else throw error;
    } else {
      console.log(`  - ${p.id} inserted`);
    }
  }

  console.log("Filling in reference prices where still empty...");
  for (const [id, price] of Object.entries(REFERENCE_PRICES)) {
    const { data: existing } = await supabase.from("catalog_products").select("id, price").eq("id", id).maybeSingle();
    if (!existing) { console.log(`  - ${id} not found, skipped`); continue; }
    if (existing.price !== null) { console.log(`  - ${id} already has a price, left unchanged`); continue; }
    const { error } = await supabase.from("catalog_products").update({ price }).eq("id", id);
    if (error) throw error;
    console.log(`  - ${id} price set to ${price}`);
  }

  console.log("Inserting size variants where missing...");
  for (const [productId, variants] of Object.entries(VARIANTS_BY_PRODUCT)) {
    const { data: product } = await supabase.from("catalog_products").select("id").eq("id", productId).maybeSingle();
    if (!product) { console.log(`  - ${productId} not found, skipped`); continue; }
    const { data: existingVariants } = await supabase.from("catalog_variants").select("weight").eq("product_id", productId);
    if (existingVariants && existingVariants.length > 0) { console.log(`  - ${productId} already has variants, left unchanged`); continue; }
    const rows = variants.map((v) => ({ product_id: productId, weight: v.weight, price: v.price }));
    const { error } = await supabase.from("catalog_variants").insert(rows);
    if (error) throw error;
    console.log(`  - ${productId}: added ${variants.map((v) => v.weight).join(", ")}`);
  }

  console.log("Updating wiki articles whose copy changed in v2 (only if untouched since v1)...");
  for (const u of WIKI_UPDATES) {
    const { data: existing } = await supabase.from("wiki_articles").select("id, body").eq("id", u.id).maybeSingle();
    if (!existing) { console.log(`  - ${u.id} not found, skipped`); continue; }
    if (existing.body?.en !== u.oldBodyEn) { console.log(`  - ${u.id} has been edited since v1, left unchanged`); continue; }
    const { error } = await supabase.from("wiki_articles").update({ body: u.newBody }).eq("id", u.id);
    if (error) throw error;
    console.log(`  - ${u.id} updated to v2 copy`);
  }

  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

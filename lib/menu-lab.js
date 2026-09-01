import { HOUSE_RECIPE_STARTERS } from "./house-recipes.js";

export const MENU_LAB_USES = [
  { id: "milk", label: { vi: "Trà sữa / latte", en: "Milk tea / latte" } },
  { id: "fruit", label: { vi: "Trà trái cây", en: "Fruit tea" } },
  { id: "sparkling", label: { vi: "Sparkling / mocktail", en: "Sparkling / mocktail" } },
  { id: "cold", label: { vi: "Cold brew / món nhẹ", en: "Cold brew / lighter drink" } },
];

export const MENU_LAB_CHARACTERS = [
  { id: "strong", label: { vi: "Vị trà đậm", en: "Strong tea" } },
  { id: "floral", label: { vi: "Hương hoa", en: "Floral" } },
  { id: "honey", label: { vi: "Hậu mật", en: "Honeyed finish" } },
  { id: "smoky", label: { vi: "Khói / rang nhẹ", en: "Light smoke / roast" } },
  { id: "light", label: { vi: "Thanh, ít gắt", en: "Light, low astringency" } },
];

export const MENU_LAB_TRIALS = [
  { id: "compare", pack: "50g", label: { vi: "So vị lần đầu", en: "First comparison" } },
  { id: "refine", pack: "100g", label: { vi: "Chỉnh công thức", en: "Recipe calibration" } },
  { id: "service", pack: "250g", label: { vi: "Chạy thử tại quán", en: "Small service trial" } },
];

const TEA_NAMES = {
  "hong-tra-shan-khoi": { vi: "Hồng Trà Shan Khói", en: "Smoked Shan Black Tea" },
  "hong-tra-shan-mat": { vi: "Hồng Trà Shan Mật", en: "Honey Shan Black Tea" },
  "luc-tra-shan-moc": { vi: "Lục Trà Shan Mộc", en: "Shan Mộc Green Tea" },
  "luc-tra-ngoc-lan": { vi: "Lục Trà Hoa Ngọc Lan", en: "Magnolia Green Tea" },
  "luc-tra-lai-tieu-chuan": { vi: "Lục Trà Hoa Lài Tiêu Chuẩn", en: "Jasmine Green Tea" },
  "luc-tra-hoa-sen": { vi: "Lục Trà Hoa Sen", en: "Lotus Green Tea" },
  "bach-mau-don": { vi: "Bạch Mẫu Đơn", en: "White Peony Tea" },
};

const TEA_SHORT_NAMES = {
  "hong-tra-shan-khoi": { vi: "Shan Khói", en: "Smoked Shan" },
  "hong-tra-shan-mat": { vi: "Shan Mật", en: "Honey Shan" },
  "luc-tra-shan-moc": { vi: "Shan Mộc", en: "Shan Mộc" },
  "luc-tra-ngoc-lan": { vi: "Ngọc Lan", en: "Magnolia" },
  "luc-tra-lai-tieu-chuan": { vi: "Hoa Lài", en: "Jasmine" },
  "luc-tra-hoa-sen": { vi: "Hoa Sen", en: "Lotus" },
  "bach-mau-don": { vi: "Bạch Mẫu Đơn", en: "White Peony" },
};

const RECIPE_TITLES = {
  "shan-moc-pistachio-cloud": { vi: ["Shan Mộc Hạt Dẻ Cười Cloud", "Hạt Dẻ Cười Cloud"], en: ["Shan Mộc Pistachio Cloud", "Pistachio Cloud"] },
  "shan-khoi-black-sesame": { vi: ["Shan Khói Mè Đen Kem Muối", "Mè Đen Kem Muối"], en: ["Smoked Shan Black Sesame Cream", "Black Sesame Cream"] },
  "ngoc-lan-citrus-sparkling": { vi: ["Ngọc Lan Chanh Vàng Sparkling", "Chanh Vàng Sparkling"], en: ["Magnolia Citrus Sparkling", "Citrus Sparkling"] },
  "shan-mat-peach": { vi: ["Shan Mật Đào Lạnh", "Đào Lạnh"], en: ["Honey Shan Peach Iced Tea", "Peach Iced Tea"] },
  "jasmine-coconut-cloud": { vi: ["Hoa Lài Dừa Cloud", "Dừa Cloud"], en: ["Jasmine Coconut Cloud", "Coconut Cloud"] },
  "white-tea-lychee-cold-brew": { vi: ["Bạch Mẫu Đơn Vải Cold Brew", "Vải Cold Brew"], en: ["White Peony Lychee Cold Brew", "Lychee Cold Brew"] },
};

const STARTER_TRAITS = {
  "shan-moc-pistachio-cloud": { uses: ["milk"], characters: ["strong", "light"], baseScore: 1 },
  "shan-khoi-black-sesame": { uses: ["milk"], characters: ["strong", "smoky"], baseScore: 2 },
  "ngoc-lan-citrus-sparkling": { uses: ["sparkling", "fruit"], characters: ["floral", "light"], baseScore: 2 },
  "shan-mat-peach": { uses: ["fruit"], characters: ["honey", "strong"], baseScore: 2 },
  "jasmine-coconut-cloud": { uses: ["milk"], characters: ["floral", "light"], baseScore: 1 },
  "white-tea-lychee-cold-brew": { uses: ["cold", "fruit"], characters: ["light", "floral", "honey"], baseScore: 2 },
};

const REASONS = {
  "shan-moc-pistachio-cloud": {
    vi: "Shan Mộc giữ vị xanh rõ khi đi cùng sữa và nguyên liệu béo; phù hợp để thử một nền latte không cần giả màu matcha.",
    en: "Shan Mộc keeps a clear green-tea structure beside milk and richer ingredients, without pretending to be matcha.",
  },
  "shan-khoi-black-sesame": {
    vi: "Shan Khói có cấu trúc đậm và nét rang–khói nhẹ, nên vị trà vẫn còn sau sữa, kem hoặc mè đen.",
    en: "Shan Khói has enough structure and light roast-smoke character to stay present through milk, cream or black sesame.",
  },
  "ngoc-lan-citrus-sparkling": {
    vi: "Ngọc Lan giữ hương tốt khi pha loãng với soda, đồng thời để lại kết thúc sạch cho citrus và trái cây sáng.",
    en: "Magnolia holds its aroma when diluted with soda and leaves a clean finish for citrus and bright fruit.",
  },
  "shan-mat-peach": {
    vi: "Shan Mật có hậu ngọt và thân trà tròn, đủ đỡ trái cây chín mà không để syrup che mất vị trà.",
    en: "Shan Mật has a rounded body and honeyed finish that supports ripe fruit without disappearing behind syrup.",
  },
  "jasmine-coconut-cloud": {
    vi: "Hoa Lài tạo hương rõ cho nền sữa nhẹ và dừa; có thể bắt đầu với ít syrup hơn rồi tăng dần sau khi nếm.",
    en: "Jasmine gives a clear aromatic lift to lighter milk and coconut drinks, allowing a lower-syrup starting point.",
  },
  "white-tea-lychee-cold-brew": {
    vi: "Bạch Mẫu Đơn hợp chiết xuất lạnh, ít đường và cấu trúc nhẹ; đây là hướng thử cho món premium cần hậu vị thanh.",
    en: "White Peony suits cold extraction, lower sugar and a lighter structure for a premium drink with a clean finish.",
  },
};

function localizedProductName(product, productId, locale) {
  const name = product?.name;
  if (typeof name === "string" && name.trim()) return name.trim();
  if (name && typeof name === "object") return name[locale] || name.vi || name.en || TEA_NAMES[productId]?.[locale] || productId;
  return TEA_NAMES[productId]?.[locale] || TEA_NAMES[productId]?.vi || productId;
}

function pickStarter(useCase, character) {
  return HOUSE_RECIPE_STARTERS
    .map((starter, index) => {
      const traits = STARTER_TRAITS[starter.id] || { uses: [], characters: [], baseScore: 0 };
      const score = traits.baseScore
        + (traits.uses.includes(useCase) ? 8 : 0)
        + (traits.characters.includes(character) ? 5 : 0)
        + (starter.category === "fruit-tea" && useCase === "cold" ? 2 : 0);
      return { starter, score, index };
    })
    .sort((a, b) => b.score - a.score || a.index - b.index)[0]?.starter || HOUSE_RECIPE_STARTERS[0];
}

function pickProduct(starter, products) {
  const available = new Map((products || [])
    .filter((product) => product?.available !== false && (!product.kind || product.kind === "tea"))
    .map((product) => [product.id, product]));
  const productId = starter.productIds.find((id) => available.has(id)) || starter.productIds[0];
  return { productId, product: available.get(productId) || null };
}

function localizedRecipeName(starter, productId, locale) {
  const [primaryTitle, neutralTitle] = RECIPE_TITLES[starter.id]?.[locale] || RECIPE_TITLES[starter.id]?.vi || [starter.name, starter.name];
  if (starter.productIds[0] === productId) return primaryTitle;
  const tea = TEA_SHORT_NAMES[productId]?.[locale] || TEA_SHORT_NAMES[productId]?.vi || productId;
  return `${tea} · ${neutralTitle}`;
}

const roundToTenth = (value) => Math.round(value * 10) / 10;

export function recommendMenuLab(input = {}, products = [], locale = "vi") {
  const useCase = MENU_LAB_USES.some((item) => item.id === input.useCase) ? input.useCase : "milk";
  const character = MENU_LAB_CHARACTERS.some((item) => item.id === input.character) ? input.character : "strong";
  const trial = MENU_LAB_TRIALS.find((item) => item.id === input.trial) || MENU_LAB_TRIALS[1];
  const cupMl = [350, 500, 700].includes(Number(input.cupMl)) ? Number(input.cupMl) : 500;
  const starter = pickStarter(useCase, character);
  const { productId, product } = pickProduct(starter, products);
  const scale = cupMl / starter.brew.servingMl;
  const teaDoseG = roundToTenth(starter.brew.teaDoseG * scale);
  const waterMl = Math.round(starter.brew.waterMl * scale);
  const pricePerKg = Number(product?.price) > 0 ? Number(product.price) : null;
  const teaCost = pricePerKg ? Math.round((teaDoseG / 1000) * pricePerKg) : null;

  return {
    useCase,
    character,
    trial: trial.id,
    pack: trial.pack,
    cupMl,
    starterId: starter.id,
    recipeName: localizedRecipeName(starter, productId, locale),
    productId,
    teaName: localizedProductName(product, productId, locale),
    teaDoseG,
    waterMl,
    temperatureC: starter.brew.temperatureC,
    brewSeconds: starter.brew.brewSeconds,
    pricePerKg,
    teaCost,
    estimatedCupsPerKg: Math.floor(1000 / teaDoseG),
    reason: REASONS[starter.id]?.[locale] || REASONS[starter.id]?.vi || "",
    untested: true,
  };
}

export function menuLabRequestNote(result) {
  if (!result) return "";
  const duration = result.brewSeconds >= 3600
    ? `${Math.round(result.brewSeconds / 3600)} giờ`
    : `${Math.round(result.brewSeconds / 60)} phút`;
  const liveCost = result.teaCost ? `; trà khô ước tính ${result.teaCost.toLocaleString("vi-VN")}đ/ly` : "";
  return [
    "Gợi ý từ Menu Lab — cần nếm và hiệu chỉnh tại quán.",
    `Ưu tiên thử: ${result.teaName}.`,
    `Món tham chiếu: ${result.recipeName}.`,
    `Điểm bắt đầu cho ly ${result.cupMl} ml: ${result.teaDoseG} g trà / ${result.waterMl} ml nước / ${result.temperatureC}°C / ${duration}${liveCost}.`,
  ].join("\n");
}

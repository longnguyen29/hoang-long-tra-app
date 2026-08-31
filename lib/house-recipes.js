const TEA_PREFERENCES = [
  { id: "hong-tra-shan-khoi", aliases: [], name: "Hồng Trà Shan Khói", profile: "đậm, khói nhẹ, chịu sữa và nguyên liệu rang" },
  { id: "hong-tra-shan-mat", aliases: [], name: "Hồng Trà Shan Mật", profile: "mật ngọt, tròn vị, hợp trái cây chín" },
  { id: "luc-tra-shan-moc", aliases: [], name: "Lục Trà Shan Mộc", profile: "xanh rõ, sạch vị, thay gần cho nền matcha/sencha" },
  { id: "luc-tra-ngoc-lan", aliases: [], name: "Lục Trà Hoa Ngọc Lan", profile: "hương hoa mềm, hợp citrus và đồ uống trong" },
  { id: "luc-tra-lai-tieu-chuan", aliases: [], name: "Lục Trà Hoa Lài Tiêu Chuẩn", profile: "hoa lài rõ, hợp dừa, vải và nền sữa nhẹ" },
  { id: "luc-tra-hoa-sen", aliases: [], name: "Lục Trà Hoa Sen", profile: "hương sen dài, dùng cho món premium ít nguyên liệu che phủ" },
  { id: "bach-mau-don", aliases: [], name: "Bạch Mẫu Đơn", profile: "nhẹ, ngọt thanh, hợp cold brew và trái cây sáng" },
];

const byId = Object.fromEntries(TEA_PREFERENCES.map((tea) => [tea.id, tea]));

function availableTea(products, preferredIds) {
  const available = new Map((products || []).filter((item) => item?.available !== false).map((item) => [item.id, item]));
  const id = preferredIds.find((candidate) => available.has(candidate)) || TEA_PREFERENCES.find((tea) => available.has(tea.id))?.id || "";
  const product = available.get(id) || null;
  return { id, product, ...byId[id] };
}

export function recommendHouseTea(input = {}, products = []) {
  const text = `${input.name || ""} ${input.category || ""}`.toLocaleLowerCase("en");
  let ids = ["luc-tra-shan-moc", "hong-tra-shan-mat"];
  let match = "gần";
  let reason = "Nền trà đủ rõ để dựng bản thử đầu tiên.";

  if (/lotus|hoa sen|\bsen\b/.test(text)) {
    ids = ["luc-tra-hoa-sen", "luc-tra-ngoc-lan", "luc-tra-shan-moc"]; match = "đúng nhóm hương";
    reason = "Hương sen đã có sẵn trong trà, nên giảm syrup và hương liệu bổ sung.";
  } else if (/hojicha|roast|smok|black sesame|mè đen|tiramisu|coffee|cacao|chocolate/.test(text)) {
    ids = ["hong-tra-shan-khoi", "hong-tra-shan-mat", "luc-tra-shan-moc"]; match = "thay gần";
    reason = "Shan Khói thay vai trò nền rang/đậm; không sao chép hojicha nhưng giữ được cấu trúc khi đi với sữa.";
  } else if (/matcha|sencha|ube|pistachio|hạt dẻ cười|green tea/.test(text)) {
    ids = ["luc-tra-shan-moc", "luc-tra-ngoc-lan", "luc-tra-lai-tieu-chuan"]; match = "thay gần";
    reason = "Shan Mộc cho vị xanh rõ; cần hiệu chỉnh tỷ lệ vì trà lá không tạo độ sánh như matcha bột.";
  } else if (/jasmine|hoa lài|lychee|vải|coconut|dừa|cloud/.test(text)) {
    ids = ["luc-tra-lai-tieu-chuan", "luc-tra-ngoc-lan", "luc-tra-shan-moc"]; match = "rất hợp";
    reason = "Hương hoa nâng trái cây và sữa nhẹ mà không cần tăng nhiều hương liệu.";
  } else if (/sparkling|tonic|soda|mocktail|yuzu|citrus|lemon|chanh/.test(text) || input.category === "sparkling" || input.category === "tea-mixology") {
    ids = ["luc-tra-ngoc-lan", "luc-tra-shan-moc", "bach-mau-don"]; match = "rất hợp";
    reason = "Ngọc Lan giữ hương khi pha loãng với soda và tạo kết thúc sạch.";
  } else if (/peach|đào|grape|nho|plum|mận|apple|táo|fruit|caramel|honey/.test(text) || input.category === "fruit-tea") {
    ids = ["hong-tra-shan-mat", "luc-tra-ngoc-lan", "luc-tra-shan-moc"]; match = "rất hợp";
    reason = "Shan Mật có độ tròn và hậu ngọt để đỡ trái cây chín mà vẫn còn vị trà.";
  } else if (/white tea|pear|lê|delicate|cold brew/.test(text)) {
    ids = ["bach-mau-don", "luc-tra-ngoc-lan", "luc-tra-shan-moc"]; match = "rất hợp";
    reason = "Bạch Mẫu Đơn hợp cách chiết xuất nhẹ, ít đường và trái cây sáng.";
  } else if (/latte|milk|cream|foam|cheese|dessert/.test(text) || input.category === "tea-latte" || input.category === "texture-dessert") {
    ids = ["hong-tra-shan-khoi", "hong-tra-shan-mat", "luc-tra-shan-moc"]; match = "rất hợp";
    reason = "Nền Shan đậm giữ được vị trà sau sữa, kem và đường.";
  }

  const tea = availableTea(products, ids);
  return { ...tea, match, reason, profile: tea.profile || "" };
}

const ingredient = (name, amount, unit, cost) => ({ name, amount, unit, cost });

export const HOUSE_RECIPE_STARTERS = [
  {
    id: "shan-moc-pistachio-cloud", name: "Shan Mộc Hạt Dẻ Cười Cloud", category: "tea-latte",
    productIds: ["luc-tra-shan-moc", "luc-tra-ngoc-lan"], targetSellPrice: 52000,
    purpose: "Bản Hoàng Long của xu hướng pistachio matcha: giữ cảm giác xanh–hạt nhưng dùng trà lá Shan Mộc.",
    brew: { teaDoseG: 9, waterMl: 190, temperatureC: 82, brewSeconds: 210, servingMl: 500 },
    ingredients: [ingredient("Sữa tươi", 120, "ml", 4200), ingredient("Sốt hạt dẻ cười", 24, "g", 3600), ingredient("Syrup đường", 8, "ml", 300), ingredient("Kem mặn nhẹ", 35, "ml", 3200), ingredient("Đá", 170, "g", 300)],
    steps: ["Ủ trà 82°C trong 210 giây, lọc kỹ rồi làm nguội nhanh.", "Khuấy trà với sốt hạt dẻ cười và syrup đến đồng nhất.", "Thêm sữa tươi và đá, đảo 6–8 vòng.", "Phủ kem mặn; nếm lại độ chát trước khi tăng ngọt."],
    note: "Thay gần matcha bằng trà lá: màu và độ sánh sẽ khác. Mục tiêu là vị xanh rõ, không giả màu matcha.",
  },
  {
    id: "shan-khoi-black-sesame", name: "Shan Khói Mè Đen Kem Muối", category: "texture-dessert",
    productIds: ["hong-tra-shan-khoi", "hong-tra-shan-mat"], targetSellPrice: 49000,
    purpose: "Thay gần hojicha mè đen bằng nền Hồng Trà Shan Khói có cấu trúc rang–khói và chịu sữa.",
    brew: { teaDoseG: 9, waterMl: 210, temperatureC: 96, brewSeconds: 240, servingMl: 500 },
    ingredients: [ingredient("Sữa tươi", 120, "ml", 4200), ingredient("Sốt mè đen", 25, "g", 2600), ingredient("Sữa đặc", 16, "ml", 900), ingredient("Kem muối", 30, "ml", 2800), ingredient("Đá", 170, "g", 300)],
    steps: ["Ủ Shan Khói 96°C trong 240 giây và lọc sạch bã.", "Hoà sốt mè đen và sữa đặc vào trà khi còn ấm.", "Thêm sữa, làm lạnh với đá rồi rót ra ly.", "Phủ kem muối mỏng; không để kem che mất hậu trà."],
    note: "Không gọi là hojicha. Đây là bản chuyển ngữ bằng Hồng Trà Shan Khói.",
  },
  {
    id: "ngoc-lan-citrus-sparkling", name: "Ngọc Lan Chanh Vàng Sparkling", category: "sparkling",
    productIds: ["luc-tra-ngoc-lan", "luc-tra-shan-moc", "bach-mau-don"], targetSellPrice: 45000,
    purpose: "Món sparkling dễ bán cho quán: hương hoa rõ, vị chanh sáng và ít nguyên liệu.",
    brew: { teaDoseG: 8, waterMl: 180, temperatureC: 82, brewSeconds: 180, servingMl: 500 },
    ingredients: [ingredient("Nước chanh vàng", 18, "ml", 1600), ingredient("Syrup mật ong", 18, "ml", 1400), ingredient("Soda lạnh", 160, "ml", 1800), ingredient("Vỏ chanh", 1, "portion", 500), ingredient("Đá", 180, "g", 300)],
    steps: ["Ủ trà 82°C trong 180 giây, lọc và làm lạnh hoàn toàn.", "Khuấy nước chanh với syrup mật ong, sau đó thêm trà.", "Cho đá vào ly, rót hỗn hợp trà rồi châm soda sau cùng.", "Vắt tinh dầu vỏ chanh trên mặt; không lắc sau khi thêm soda."],
    note: "Có thể thay chanh vàng bằng quất hoặc yuzu theo nguồn hàng; giữ tổng acid quanh 18 ml trước khi hiệu chỉnh.",
  },
  {
    id: "shan-mat-peach", name: "Shan Mật Đào Lạnh", category: "fruit-tea",
    productIds: ["hong-tra-shan-mat", "luc-tra-ngoc-lan"], targetSellPrice: 43000,
    purpose: "Thay gần peach oolong bằng Hồng Trà Shan Mật: dễ vận hành, vị trà còn rõ sau đào.",
    brew: { teaDoseG: 9, waterMl: 220, temperatureC: 94, brewSeconds: 225, servingMl: 500 },
    ingredients: [ingredient("Đào nghiền", 35, "g", 3000), ingredient("Syrup đào", 12, "ml", 900), ingredient("Nước chanh", 8, "ml", 500), ingredient("Miếng đào", 25, "g", 1800), ingredient("Đá", 180, "g", 300)],
    steps: ["Ủ Shan Mật 94°C trong 225 giây, lọc rồi làm nguội.", "Dằm nhẹ đào nghiền với syrup và nước chanh.", "Thêm trà và đá, lắc 8–10 giây.", "Rót ra ly, thêm miếng đào; kiểm tra vị trà trước khi tăng syrup."],
    note: "Nếu đào rất ngọt, bỏ syrup trước rồi nếm. Không dùng hương đào để che chất lượng trái cây.",
  },
  {
    id: "jasmine-coconut-cloud", name: "Hoa Lài Dừa Cloud", category: "tea-latte",
    productIds: ["luc-tra-lai-tieu-chuan", "luc-tra-ngoc-lan", "luc-tra-shan-moc"], targetSellPrice: 48000,
    purpose: "Bản coconut cloud dùng hương hoa lài tự nhiên thay cho nền matcha thường gặp.",
    brew: { teaDoseG: 8, waterMl: 180, temperatureC: 82, brewSeconds: 180, servingMl: 500 },
    ingredients: [ingredient("Nước dừa", 90, "ml", 2500), ingredient("Sữa dừa", 70, "ml", 2400), ingredient("Syrup đường", 10, "ml", 400), ingredient("Kem dừa mặn", 35, "ml", 3200), ingredient("Đá", 170, "g", 300)],
    steps: ["Ủ trà 82°C trong 180 giây và làm lạnh nhanh.", "Khuấy trà với nước dừa, sữa dừa và syrup.", "Thêm đá và đảo nhẹ để tránh tách béo.", "Phủ kem dừa mặn; giảm syrup nếu nước dừa đã ngọt."],
    note: "Nếu Lục Trà Hoa Lài hết hàng, dùng Ngọc Lan và giảm kem dừa 5 ml để giữ hương trà.",
  },
  {
    id: "white-tea-lychee-cold-brew", name: "Bạch Mẫu Đơn Vải Cold Brew", category: "fruit-tea",
    productIds: ["bach-mau-don", "luc-tra-ngoc-lan"], targetSellPrice: 56000,
    purpose: "Món trà trắng nhẹ và khác biệt cho menu premium; ưu tiên hương tự nhiên, ít ngọt.",
    brew: { teaDoseG: 10, waterMl: 320, temperatureC: 25, brewSeconds: 21600, servingMl: 500 },
    ingredients: [ingredient("Nước vải", 35, "ml", 1800), ingredient("Quả vải", 35, "g", 2600), ingredient("Nước chanh", 6, "ml", 400), ingredient("Syrup đường", 5, "ml", 200), ingredient("Đá", 130, "g", 250)],
    steps: ["Ngâm lạnh Bạch Mẫu Đơn với 320 ml nước trong 6 giờ, sau đó lọc.", "Khuấy nước vải, nước chanh và syrup vào trà lạnh.", "Thêm đá và quả vải, đảo nhẹ.", "Nếm ở nhiệt độ phục vụ; chỉ tăng đường từng 2 ml."],
    note: "Bản thử premium. Không thay bằng trà đậm nếu muốn giữ cấu trúc nhẹ và hậu ngọt.",
  },
];

export function buildStarterRecords(products = [], actor = "") {
  return HOUSE_RECIPE_STARTERS.map((starter) => {
    const tea = availableTea(products, starter.productIds);
    if (!tea.product) return null;
    const recipeId = `recipe-house-${starter.id}`;
    const teaCost = Math.round((starter.brew.teaDoseG / 1000) * (Number(tea.product.price) || 0));
    const additionsCost = starter.ingredients.reduce((sum, item) => sum + item.cost, 0);
    const cost = teaCost + additionsCost;
    return {
      recipe: {
        id: recipeId, name: starter.name, purpose: starter.purpose, status: "testing",
        product_id: tea.id, source_type: "radar", source_reference: "house-starter-v1",
        target_serving_ml: starter.brew.servingMl, target_cost_per_serving: cost,
        target_sell_price: starter.targetSellPrice, notes: `${starter.note}\n\nGiá nguyên liệu phụ là ước tính; thay bằng giá mua thực tế sau lần pha đầu.`,
        created_by: actor, updated_at: new Date().toISOString(),
      },
      version: {
        id: `recipe-version-house-${starter.id}-v1`, recipe_id: recipeId, version_number: 1,
        tested_at: new Date().toISOString().slice(0, 10), product_id: tea.id,
        tea_dose_g: starter.brew.teaDoseG, tea_cost_per_kg: Number(tea.product.price) || null,
        water_ml: starter.brew.waterMl, temperature_c: starter.brew.temperatureC,
        brew_seconds: starter.brew.brewSeconds, serving_ml: starter.brew.servingMl,
        ingredients: starter.ingredients, steps: starter.steps, cost_per_serving: cost,
        sensory: {}, sensory_average: null, result: "retest",
        notes: `Bản V1 do hệ thống đề xuất — CHƯA NẾM. ${starter.note}`,
        created_by: actor,
      },
      tea,
    };
  }).filter(Boolean);
}

export function buildRadarRecipeRecords(concept, products = [], actor = "", sourceUrl = "") {
  const recommendation = recommendHouseTea(concept, products);
  if (!recommendation.product) throw new Error("no_house_tea_available");
  const category = concept.category || "menu-launch";
  const template = category === "sparkling" || category === "tea-mixology"
    ? HOUSE_RECIPE_STARTERS.find((item) => item.id === "ngoc-lan-citrus-sparkling")
    : category === "fruit-tea"
      ? HOUSE_RECIPE_STARTERS.find((item) => item.id === "shan-mat-peach")
      : category === "texture-dessert"
        ? HOUSE_RECIPE_STARTERS.find((item) => item.id === "shan-khoi-black-sesame")
        : HOUSE_RECIPE_STARTERS.find((item) => item.id === "shan-moc-pistachio-cloud");
  const recipeId = concept.promoted_recipe_id || `recipe-${concept.id}`;
  const teaCost = Math.round((template.brew.teaDoseG / 1000) * (Number(recommendation.product.price) || 0));
  const additionsCost = template.ingredients.reduce((sum, item) => sum + item.cost, 0);
  return {
    recommendation,
    recipe: {
      id: recipeId, name: `Bản Hoàng Long · ${concept.name}`, purpose: `Chuyển tín hiệu Radar thành bản thử bằng ${recommendation.name}. ${concept.summary || ""}`,
      status: "testing", product_id: recommendation.id, source_type: "radar", source_reference: concept.id,
      source_url: sourceUrl, target_serving_ml: template.brew.servingMl,
      target_cost_per_serving: teaCost + additionsCost, target_sell_price: template.targetSellPrice,
      notes: `${recommendation.match}: ${recommendation.reason}\n\nCông thức V1 lấy cấu trúc gần nhất; cần nếm và đổi nguyên liệu theo đúng tín hiệu gốc.`,
      created_by: actor, updated_at: new Date().toISOString(),
    },
    version: {
      id: `recipe-version-${concept.id}-v1`, recipe_id: recipeId, version_number: 1,
      tested_at: new Date().toISOString().slice(0, 10), product_id: recommendation.id,
      tea_dose_g: template.brew.teaDoseG, tea_cost_per_kg: Number(recommendation.product.price) || null,
      water_ml: template.brew.waterMl, temperature_c: template.brew.temperatureC,
      brew_seconds: template.brew.brewSeconds, serving_ml: template.brew.servingMl,
      ingredients: template.ingredients, steps: template.steps, cost_per_serving: teaCost + additionsCost,
      sensory: {}, sensory_average: null, result: "retest",
      notes: `Bản V1 tự chuyển từ Radar — CHƯA NẾM. ${recommendation.reason}`,
      created_by: actor,
    },
  };
}

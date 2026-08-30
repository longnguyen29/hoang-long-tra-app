export const RECIPE_STATUSES = [
  { id: "draft", label: "Đang soạn" },
  { id: "testing", label: "Đang thử" },
  { id: "customer_test", label: "Khách đang thử" },
  { id: "approved", label: "Đã chốt" },
  { id: "archived", label: "Lưu trữ" },
];

export const SENSORY_FIELDS = [
  ["teaClarity", "Vị trà rõ"],
  ["aroma", "Hương"],
  ["balance", "Cân bằng"],
  ["texture", "Cấu trúc"],
  ["repeatability", "Dễ lặp lại"],
];

export const uid = (prefix = "recipe") =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

export const newIngredient = () => ({ id: uid("ingredient"), name: "", amount: "", unit: "g", cost: "" });

export function sensoryAverage(sensory = {}) {
  const values = SENSORY_FIELDS.map(([key]) => Number(sensory[key]))
    .filter((value) => Number.isFinite(value) && value >= 0 && value <= 10);
  if (!values.length) return null;
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10;
}

export function recipeEconomics({ teaDoseG = 0, teaCostPerKg = 0, ingredients = [], sellPrice = 0 } = {}) {
  const teaCost = Math.max(0, Number(teaDoseG) || 0) / 1000 * Math.max(0, Number(teaCostPerKg) || 0);
  const additionsCost = ingredients.reduce((sum, item) => sum + Math.max(0, Number(item.cost) || 0), 0);
  const cost = Math.round(teaCost + additionsCost);
  const price = Math.max(0, Number(sellPrice) || 0);
  const grossProfit = price ? price - cost : null;
  const marginPercent = price ? Math.round((grossProfit / price) * 1000) / 10 : null;
  return { teaCost: Math.round(teaCost), additionsCost: Math.round(additionsCost), cost, grossProfit, marginPercent };
}

export function versionSeed(recipe = {}, latest = null, batch = null) {
  const sensory = Object.fromEntries(SENSORY_FIELDS.map(([key]) => [key, 5]));
  return {
    tested_at: new Date().toISOString().slice(0, 10),
    product_id: latest?.product_id || recipe.product_id || "",
    batch_id: latest?.batch_id || recipe.batch_id || "",
    tea_dose_g: latest?.tea_dose_g ?? "",
    tea_cost_per_kg: latest?.tea_cost_per_kg ?? batch?.cost_per_kg ?? "",
    water_ml: latest?.water_ml ?? "",
    temperature_c: latest?.temperature_c ?? 90,
    brew_seconds: latest?.brew_seconds ?? 180,
    serving_ml: latest?.serving_ml ?? recipe.target_serving_ml ?? 500,
    ingredients: latest?.ingredients?.length ? latest.ingredients.map((item) => ({ ...item, id: uid("ingredient") })) : [newIngredient()],
    steps: latest?.steps?.length ? [...latest.steps] : [],
    sensory: latest?.sensory && Object.keys(latest.sensory).length ? { ...latest.sensory } : sensory,
    result: "retest",
    customer_feedback: "",
    notes: "",
    photo_url: "",
  };
}

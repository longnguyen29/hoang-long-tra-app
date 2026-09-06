export const CAFE_DRINKS = [
  { id: "milk", character: "strong", vi: "Trà sữa / latte", en: "Milk tea / latte", detailVi: "Tìm thân trà cho nền sữa", detailEn: "Find structure for milk" },
  { id: "fruit", character: "honey", vi: "Trà trái cây", en: "Fruit tea", detailVi: "Ghép trà với vị trái cây", detailEn: "Pair tea with fruit" },
  { id: "sparkling", character: "floral", vi: "Soda / mocktail", en: "Sparkling", detailVi: "Thử một hướng hương hoa", detailEn: "Explore floral character" },
  { id: "cold", character: "light", vi: "Cold brew", en: "Cold brew", detailVi: "Khám phá nền trà thanh", detailEn: "Explore a lighter tea" },
];

export function cafeDrink(id) {
  return CAFE_DRINKS.find((drink) => drink.id === id) || CAFE_DRINKS[0];
}

// Only campaign identifiers cross the handoff, never arbitrary URL fields or form data.
export function cafeSampleHref(id, search = "") {
  const drink = cafeDrink(id);
  const input = new URLSearchParams(search);
  const output = new URLSearchParams();
  for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"]) {
    const value = input.get(key)?.trim().replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 80);
    if (value) output.set(key, value);
  }
  if (!output.has("utm_source")) output.set("utm_source", "website");
  if (!output.has("utm_medium")) output.set("utm_medium", "owned");
  if (!output.has("utm_campaign")) output.set("utm_campaign", "cafe_entry_v1");
  output.set("use", drink.id);
  output.set("character", drink.character);
  return `/sample/menu-lab?${output}`;
}

export function availableCafePrice(result, products) {
  const product = products.find((item) => item.id === result.productId && item.available === true && item.kind === "tea");
  const price = Number(product?.price);
  return Number.isFinite(price) && price > 0 ? Math.round(price * result.teaDoseG / 1000) : null;
}

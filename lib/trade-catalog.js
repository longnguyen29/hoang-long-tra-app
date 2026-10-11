export const TRADE_CATALOG_FIELDS = "id,name,notes,flavors,brew,pack_size,photo_url,photo_position,kind,line,available";
export const isTradeTea = (product) => product.available === true && product.kind === "tea" && product.line !== "sample";
export const catalogText = (value, locale = "vi") => typeof value === "string" ? value : value?.[locale] || value?.vi || value?.en || "";

const searchText = (value) => {
  if (Array.isArray(value)) return value.map(searchText).join(" ");
  if (value && typeof value === "object") return Object.values(value).map(searchText).join(" ");
  return typeof value === "string" ? value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d") : "";
};

export function matchesTradeSearch(product, query = "", displayedText = []) {
  const words = searchText(query).trim().split(/\s+/).filter(Boolean);
  const text = searchText([product.name, product.notes, product.flavors, product.brew, product.pack_size, displayedText]);
  return words.every((word) => text.includes(word));
}

export function tradeEnquiryHref(id, intent = "quote", search = "", locale) {
  const source = new URLSearchParams(search);
  const query = new URLSearchParams();
  for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"]) {
    const value = source.get(key);
    if (value) query.set(key, value.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 80));
  }
  const incomingLocales = source.getAll("lang");
  const language = locale === undefined && incomingLocales.length === 1 ? incomingLocales[0] : locale;
  if (language === "vi" || language === "en") query.set("lang", language);
  if (id) query.set("tea", id);
  query.set("intent", intent === "sample" ? "sample" : "quote");
  return `/wholesale?${query}#trade-brief`;
}

export function selectedTradeTea(products, search) {
  const id = new URLSearchParams(search).get("tea");
  return products.find((product) => isTradeTea(product) && product.id === id) || null;
}

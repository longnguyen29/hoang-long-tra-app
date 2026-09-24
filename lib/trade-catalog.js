export const TRADE_CATALOG_FIELDS = "id,name,notes,pack_size,photo_url,photo_position,kind,line,available";
export const isTradeTea = (product) => product.available === true && product.kind === "tea" && product.line !== "sample";
export const catalogText = (value, locale = "vi") => typeof value === "string" ? value : value?.[locale] || value?.vi || value?.en || "";

export function tradeEnquiryHref(id, intent = "quote", search = "") {
  const source = new URLSearchParams(search);
  const query = new URLSearchParams();
  for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"]) {
    const value = source.get(key);
    if (value) query.set(key, value.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 80));
  }
  if (id) query.set("tea", id);
  query.set("intent", intent === "sample" ? "sample" : "quote");
  return `/wholesale?${query}#trade-brief`;
}

export function selectedTradeTea(products, search) {
  const id = new URLSearchParams(search).get("tea");
  return products.find((product) => isTradeTea(product) && product.id === id) || null;
}

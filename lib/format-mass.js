// Presentation only: callers keep quantities, prices and arithmetic in kg.
export function formatMassKg(value, locale = "vi") {
  if (value == null || (typeof value === "string" && !value.trim())) return "—";
  if (typeof value !== "number" && typeof value !== "string") return "—";
  const kg = Number(value);
  if (!Number.isFinite(kg) || kg < 0) return "—";
  const tonnes = kg >= 1000;
  const amount = tonnes ? kg / 1000 : kg;
  const vi = locale.startsWith("vi");
  const number = new Intl.NumberFormat(vi ? "vi-VN" : "en-GB", { maximumFractionDigits: tonnes ? 6 : 3 }).format(amount);
  return `${number} ${tonnes ? (vi ? "tấn" : amount === 1 ? "tonne" : "tonnes") : "kg"}`;
}

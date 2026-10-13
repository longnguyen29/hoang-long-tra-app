import { EXPORT_TEAS } from "./export-teas.js";

const CURRENCIES = ["VND", "USD", "TWD", "CNY"];
const MAX_AGE_MS = 48 * 60 * 60 * 1000;
const FUTURE_TOLERANCE_MS = 5 * 60 * 1000;
const SOURCE = { name: "ExchangeRate-API", url: "https://www.exchangerate-api.com" };

const unavailable = () => { throw new Error("rates_unavailable"); };
const positiveFinite = (value) => typeof value === "number" && Number.isFinite(value) && value > 0;

// The open feed is daily, not a live trading price. Never publish its raw rates:
// its terms allow product conversion and caching, but not feed redistribution.
export function buildExportPriceSnapshot(providerPayload, { nowMs = Date.now() } = {}) {
  if (!positiveFinite(nowMs) || !providerPayload || providerPayload.result !== "success"
      || providerPayload.base_code !== "VND" || providerPayload.rates?.VND !== 1) unavailable();

  const lastUnix = providerPayload.time_last_update_unix;
  const nextUnix = providerPayload.time_next_update_unix;
  if (!Number.isSafeInteger(lastUnix) || !Number.isSafeInteger(nextUnix)
      || lastUnix <= 0 || nextUnix <= lastUnix) unavailable();
  const updatedMs = lastUnix * 1000;
  const nextUpdateMs = nextUnix * 1000;
  if (!Number.isSafeInteger(updatedMs) || !Number.isSafeInteger(nextUpdateMs)
      || updatedMs > nowMs + FUTURE_TOLERANCE_MS
      || nextUpdateMs - updatedMs > MAX_AGE_MS) unavailable();

  // Reject invalid foreign rates even when the valid feed timestamps are stale.
  // A provider failure must never be disguised as a stale usable response.
  if (CURRENCIES.some((currency) => !positiveFinite(providerPayload.rates[currency]))) unavailable();
  const stale = nowMs - updatedMs > MAX_AGE_MS;
  const prices = EXPORT_TEAS.map(({ id, priceVndPerKg }) => {
    if (!id || !positiveFinite(priceVndPerKg)) unavailable();
    const convertedPerKg = Object.fromEntries(CURRENCIES.map((currency) => {
      if (currency !== "VND" && stale) return [currency, null];
      const value = priceVndPerKg * providerPayload.rates[currency];
      if (!positiveFinite(value)) unavailable();
      return [currency, value];
    }));
    return { id, vndPerKg: priceVndPerKg, convertedPerKg };
  });
  return {
    status: stale ? "stale" : "fresh",
    updatedAt: new Date(updatedMs).toISOString(),
    nextUpdateAt: new Date(nextUpdateMs).toISOString(),
    source: { ...SOURCE },
    prices,
  };
}

// Keep calculations unrounded; presentation chooses each currency's precision.
// Unknown/stale foreign values remain unavailable instead of becoming zero.
export function convertQuantityPrice(unitValue, kg) {
  if (!positiveFinite(unitValue) || typeof kg !== "number" || !Number.isFinite(kg) || kg < 0) return null;
  const total = unitValue * kg;
  return Number.isFinite(total) ? total : null;
}

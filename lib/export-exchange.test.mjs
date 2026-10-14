import test from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { buildExportPriceSnapshot, convertQuantityPrice } from "./export-exchange.js";

registerHooks({ resolve(specifier, context, next) {
  if (specifier === "@/lib/export-exchange") {
    return { url: new URL("./export-exchange.js", import.meta.url).href, shortCircuit: true };
  }
  return next(specifier, context);
} });
const { GET } = await import("../app/api/export-prices/route.js");

const UPDATED_SECONDS = Date.parse("2026-10-13T00:00:00Z") / 1000;
const nowMs = (UPDATED_SECONDS + 3600) * 1000;
// Synthetic fixtures for arithmetic validation; never fallback market rates.
const payload = (overrides = {}) => ({
  result: "success", base_code: "VND",
  time_last_update_unix: UPDATED_SECONDS,
  time_next_update_unix: UPDATED_SECONDS + 86400,
  rates: { VND: 1, USD: 0.00004, TWD: 0.0013, CNY: 0.00028 },
  ...overrides,
});
const build = (value) => buildExportPriceSnapshot(value, { nowMs });
const rejects = (value) => assert.throws(() => build(value), /rates_unavailable/);

test("converts only the four quoted tea SKUs, preserving the VND source and attribution", () => {
  const snapshot = build(payload());
  assert.equal(snapshot.status, "fresh");
  assert.equal(snapshot.updatedAt, "2026-10-13T00:00:00.000Z");
  assert.equal(snapshot.nextUpdateAt, "2026-10-14T00:00:00.000Z");
  assert.deepEqual(snapshot.source, { name: "ExchangeRate-API", url: "https://www.exchangerate-api.com" });
  assert.deepEqual(snapshot.prices.map(({ id, vndPerKg }) => [id, vndPerKg]), [
    ["steamed-green", 80000], ["smoked-black", 90000], ["black-op1", 85000], ["magnolia-green", 105000],
  ]);
  assert.equal(snapshot.prices[0].convertedPerKg.VND, 80000);
  assert.ok(Math.abs(snapshot.prices[0].convertedPerKg.USD - 3.2) < 1e-12);
  assert.equal(snapshot.prices[0].convertedPerKg.TWD, 104);
  assert.ok(Math.abs(snapshot.prices[0].convertedPerKg.CNY - 22.4) < 1e-12);
  assert.equal("rates" in snapshot, false);
});

test("an actual feed more than 48 hours old retains VND and disables foreign estimates", () => {
  const old = payload({
    time_last_update_unix: UPDATED_SECONDS - 2 * 86400,
    time_next_update_unix: UPDATED_SECONDS - 86400,
  });
  const snapshot = build(old);
  assert.equal(snapshot.status, "stale");
  for (const price of snapshot.prices) {
    assert.deepEqual(price.convertedPerKg, { VND: price.vndPerKg, USD: null, TWD: null, CNY: null });
  }
  assert.equal(buildExportPriceSnapshot(payload(), { nowMs: (UPDATED_SECONDS + 2 * 86400) * 1000 }).status, "fresh");
  assert.equal(buildExportPriceSnapshot(payload(), { nowMs: (UPDATED_SECONDS + 2 * 86400) * 1000 + 1 }).status, "stale");
});

test("rejects provider errors, wrong bases, and missing, zero, negative or nonnumeric rates", () => {
  for (const value of [null, {}, payload({ result: "error" }), payload({ base_code: "USD" }), payload({ rates: undefined })]) rejects(value);
  for (const currency of ["VND", "USD", "TWD", "CNY"]) {
    for (const value of [undefined, 0, -1, Infinity, NaN, "0.001", null]) {
      rejects(payload({ rates: { ...payload().rates, [currency]: value } }));
    }
  }
  rejects(payload({ rates: { ...payload().rates, VND: 0.999 } }));
  rejects(payload({ rates: { ...payload().rates, USD: Number.MAX_VALUE } }));
});

test("rejects malformed, reversed, excessively distant and future update timestamps", () => {
  for (const value of [undefined, null, 0, -1, Infinity, "1791849600", 1.5]) {
    rejects(payload({ time_last_update_unix: value }));
    rejects(payload({ time_next_update_unix: value }));
  }
  rejects(payload({ time_next_update_unix: UPDATED_SECONDS }));
  rejects(payload({ time_next_update_unix: UPDATED_SECONDS - 1 }));
  rejects(payload({ time_next_update_unix: UPDATED_SECONDS + 2 * 86400 + 1 }));
  rejects(payload({ time_last_update_unix: UPDATED_SECONDS + 3901, time_next_update_unix: UPDATED_SECONDS + 90000 }));
  assert.equal(build(payload({ time_last_update_unix: UPDATED_SECONDS + 3900, time_next_update_unix: UPDATED_SECONDS + 90000 })).status, "fresh");
  for (const value of [NaN, Infinity, 0, "now"]) {
    assert.throws(() => buildExportPriceSnapshot(payload(), { nowMs: value }), /rates_unavailable/);
  }
});

test("quantity arithmetic uses kg and keeps unavailable foreign estimates unavailable", () => {
  assert.equal(convertQuantityPrice(75000, 1000), 75000000);
  assert.equal(convertQuantityPrice(3, 250), 750);
  assert.equal(convertQuantityPrice(3.14159265, 50), 157.0796325);
  assert.equal(convertQuantityPrice(75000, 0), 0);
  for (const value of [null, undefined, 0, -1, "3", NaN, Infinity]) assert.equal(convertQuantityPrice(value, 10), null);
  for (const kg of [null, undefined, -1, "1000", NaN, Infinity]) assert.equal(convertQuantityPrice(75000, kg), null);
  assert.equal(convertQuantityPrice(Number.MAX_VALUE, 2), null);
});

test("the public route uses a fixed cached source and returns only product conversions", async (t) => {
  const unixNow = Math.floor(Date.now() / 1000);
  t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.equal(url, "https://open.er-api.com/v6/latest/VND");
    assert.deepEqual(options.next, { revalidate: 3600 });
    assert.ok(options.signal instanceof AbortSignal);
    assert.equal("authorization" in options.headers, false);
    return Response.json(payload({ time_last_update_unix: unixNow - 3600, time_next_update_unix: unixNow + 82800 }));
  });
  const response = await GET(new Request("https://www.hoanglongtra.com/api/export-prices?url=https://bad.invalid&currency=EUR"));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  const body = await response.json();
  assert.equal(body.status, "fresh");
  assert.equal(body.prices.length, 4);
  assert.equal("rates" in body, false);
  assert.equal("EUR" in body.prices[0].convertedPerKg, false);
});

test("upstream errors, timeout, non-JSON and malformed feeds return 503 without fallback rates or error details", async (t) => {
  let scenario;
  t.mock.method(globalThis, "fetch", async () => {
    if (scenario === "network") throw new Error("PRIVATE_UPSTREAM_DETAILS");
    if (scenario === "timeout") throw new DOMException("PRIVATE_TIMEOUT_DETAILS", "TimeoutError");
    if (scenario === "http") return new Response("rate limited", { status: 429 });
    if (scenario === "non-json") return new Response("not JSON", { status: 200 });
    return Response.json({ result: "success", base_code: "USD" });
  });
  for (scenario of ["network", "timeout", "http", "non-json", "malformed"]) {
    const response = await GET();
    assert.equal(response.status, 503);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.equal(response.headers.get("retry-after"), "3600");
    assert.deepEqual(await response.json(), { error: "rates_unavailable" });
  }
});

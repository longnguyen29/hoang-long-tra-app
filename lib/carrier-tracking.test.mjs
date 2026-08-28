import assert from "node:assert/strict";
import { generateKeyPairSync, sign } from "node:crypto";
import test from "node:test";
import {
  carrierStatusEffect,
  makeCarrierEventKey,
  normalizeTrackingCode,
  parseCarrierDate,
} from "./carrier-tracking.js";
import { secretsMatch, verifyVietnamPostSignature } from "./carrier-security.js";

test("tracking codes are normalized before matching carrier updates", () => {
  assert.equal(normalizeTrackingCode("  ee123vn  "), "EE123VN");
});

test("only the carriers' explicit delivered codes complete an order", () => {
  assert.equal(carrierStatusEffect("viettel_post", 501), "delivered");
  assert.equal(carrierStatusEffect("viettel_post", 504), "blocked");
  assert.equal(carrierStatusEffect("vietnam_post", "14"), "delivered");
  assert.equal(carrierStatusEffect("vietnam_post", "109"), "delivered");
  assert.equal(carrierStatusEffect("vietnam_post", "23"), "waiting");
  assert.equal(carrierStatusEffect("vietnam_post", "12"), "progress");
});

test("carrier dates without a timezone are interpreted in Vietnam time", () => {
  assert.equal(parseCarrierDate("28/08/2026 16:30:00"), "2026-08-28T09:30:00.000Z");
});

test("carrier event keys are stable across tracking code casing", () => {
  const base = { carrier: "vietnam_post", statusCode: "14", statusAt: "2026-08-28T09:30:00.000Z" };
  assert.equal(
    makeCarrierEventKey({ ...base, trackingCode: "ee123vn" }),
    makeCarrierEventKey({ ...base, trackingCode: "EE123VN" }),
  );
});

test("Viettel webhook secrets use an exact comparison", () => {
  assert.equal(secretsMatch("house-secret", "house-secret"), true);
  assert.equal(secretsMatch("house-secret-2", "house-secret"), false);
  assert.equal(secretsMatch("", "house-secret"), false);
});

test("Vietnam Post webhook signatures are verified against their documented signed value", () => {
  const { publicKey, privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const payload = {
    data: [{ itemCode: "EE123VN", status: "14" }],
    sendDate: "2026-08-28T16:30:00",
  };
  const signedValue = `MYVNP${payload.sendDate}${payload.data[0].itemCode}${payload.data[0].status}`;
  payload.signature = sign("RSA-SHA256", Buffer.from(signedValue), privateKey).toString("base64");

  assert.equal(verifyVietnamPostSignature(payload, publicKey), true);
  assert.equal(verifyVietnamPostSignature({ ...payload, sendDate: "2026-08-28T16:31:00" }, publicKey), false);
});

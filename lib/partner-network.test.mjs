import test from "node:test";
import assert from "node:assert/strict";
import { normalizePartnerApplication, normalizePartnerLead, calculatePartnerCommission, partnerErrorMessage, partnerRegistrationAllowed } from "./partner-network.js";
const application = { business_name: "Tư vấn đồ uống", contact_name: "Người kiểm thử", phone: "0900000000", region: "Hà Nội", partner_type: "consultant", notes: "", consent: true };
const lead = { request_id: "10000000-0000-4000-8000-000000000001", business_name: "Quán kiểm thử", contact_name: "Người liên hệ", contact: "0900000001", location: "Hà Nội", product_interest: "Trà nền", expected_volume_kg: "50.25", notes: "", contact_authorized: true };
test("internal registration permission does not survive logout, account switch or loss of verified identity", () => {
  const manager = { id: "staff-a", email: "staff@example.test", email_confirmed_at: "2026-10-12" };
  assert.equal(partnerRegistrationAllowed(true, "staff-a", manager), true);
  for (const user of [null, { ...manager, id: "other" }, { ...manager, email_confirmed_at: null }, { ...manager, email: "" }]) assert.equal(partnerRegistrationAllowed(true, "staff-a", user), false);
  assert.equal(partnerRegistrationAllowed(false, null, manager), false);
  assert.equal(partnerRegistrationAllowed(true, null, null), true); // Reviewed public intake supports email verification before applying.
});
test("application and lead normalize only approved form fields, retaining unknown volume", () => {
  assert.equal(normalizePartnerApplication(application).data.partner_type, "consultant");
  assert.equal(normalizePartnerLead(lead).data.expected_volume_kg, 50.25);
  const data = normalizePartnerLead({ ...lead, contact: "TEST@example.test", expected_volume_kg: "" }).data;
  assert.equal(data.contact, "test@example.test"); assert.equal(data.expected_volume_kg, null);
  assert.equal(Object.hasOwn(data, "partner_id"), false);
});
test("self application cannot request identity, approval or rates", () => {
  for (const key of ["user_id", "partner_id", "code", "status", "default_rate_percent", "rate_percent"]) {
    assert.equal(normalizePartnerApplication({ ...application, [key]: "forged" }).data, null);
    assert.equal(normalizePartnerLead({ ...lead, [key]: "forged" }).data, null);
  }
});
test("application requires a real contact, partner category and explicit consent", () => {
  for (const patch of [{ consent: false }, { consent: "true" }, { phone: "phone" }, { partner_type: "admin" }, { business_name: " " }, { notes: "x".repeat(1501) }]) assert.equal(normalizePartnerApplication({ ...application, ...patch }).data, null);
});
test("referrals require contact permission, valid request identity and bounded numeric input", () => {
  for (const patch of [{ contact_authorized: false }, { contact: "not a contact" }, { request_id: "id" }, { expected_volume_kg: Infinity }, { expected_volume_kg: -1 }, { expected_volume_kg: true }, { expected_volume_kg: "1e4" }, { expected_volume_kg: "12kg" }, { expected_volume_kg: "1.001" }]) assert.equal(normalizePartnerLead({ ...lead, ...patch }).data, null);
});
test("normalization strips hidden controls before rendering customer text", () => {
  assert.equal(normalizePartnerApplication({ ...application, business_name: " Hoàng\u200b Long\u202e " }).data.business_name, "Hoàng Long");
});
test("commission uses cash collected and deducts reviewed VAT, billed shipping and refunds", () => {
  const result = calculatePartnerCommission({ collected: 10000000, vatAmount: 800000, billedShippingAmount: 200000, refundedAmount: 1000000, ratePercent: 3, internalCostTotal: 6500000, minimumRetainedProfit: 1000000 });
  assert.deepEqual(result, { basis: "revenue", base: 8000000, revenueBase: 8000000, commissionBase: 8000000, profitBeforeCommission: 1500000, calculated: 240000, eligible: 240000, commissionCap: 500000, withinCap: true });
});
test("profit-share rates apply after all order costs and before commission, preserving legacy revenue agreements", () => {
  const input = { collected: 10000000, vatAmount: 800000, billedShippingAmount: 200000, refundedAmount: 1000000, ratePercent: 3, internalCostTotal: 6500000, minimumRetainedProfit: 1000000 };
  const profit = calculatePartnerCommission({ ...input, basis: "profit" });
  assert.deepEqual(profit, { basis: "profit", base: 8000000, revenueBase: 8000000, commissionBase: 1500000, profitBeforeCommission: 1500000, calculated: 45000, eligible: 45000, commissionCap: 500000, withinCap: true });
  assert.equal(calculatePartnerCommission({ ...input, basis: "profit", ratePercent: 5 }).eligible, 75000);
  assert.equal(calculatePartnerCommission(input).eligible, 240000); // Omitting basis cannot silently migrate an existing contract.
});
test("unknown costs never create a zero-cost profit estimate or an approvable commission", () => {
  const input = { collected: 1000000, vatAmount: 0, billedShippingAmount: 0, refundedAmount: 0, ratePercent: 5, basis: "profit", minimumRetainedProfit: 0 };
  for (const internalCostTotal of [null, undefined, ""]) {
    for (const cancelled of [false, true]) {
      const result = calculatePartnerCommission({ ...input, internalCostTotal, cancelled });
      assert.equal(result.commissionBase, null); assert.equal(result.calculated, null); assert.equal(result.eligible, null); assert.equal(result.withinCap, null);
    }
  }
  const knownZero = calculatePartnerCommission({ ...input, internalCostTotal: 0 });
  assert.equal(knownZero.eligible, 50000); assert.equal(knownZero.withinCap, true);
  const noTarget = calculatePartnerCommission({ ...input, internalCostTotal: 900000, minimumRetainedProfit: null });
  assert.equal(noTarget.eligible, 5000); assert.equal(noTarget.commissionCap, null); assert.equal(noTarget.withinCap, null);
});
test("loss-making or break-even profit-share orders cannot gain commission through an adjustment", () => {
  const input = { collected: 1000000, vatAmount: 0, billedShippingAmount: 0, refundedAmount: 0, ratePercent: 5, basis: "profit", minimumRetainedProfit: 0 };
  for (const internalCostTotal of [1000000, 1100000]) {
    const result = calculatePartnerCommission({ ...input, internalCostTotal });
    assert.equal(result.commissionBase, 0); assert.equal(result.eligible, 0); assert.equal(result.commissionCap, 0);
    assert.throws(() => calculatePartnerCommission({ ...input, internalCostTotal, adjustmentAmount: 1 }), /invalid_adjustment/);
  }
  assert.equal(calculatePartnerCommission({ ...input, internalCostTotal: 1100000 }).profitBeforeCommission, -100000);
  assert.throws(() => calculatePartnerCommission({ ...input, internalCostTotal: 900000, adjustmentAmount: 100001 }), /invalid_adjustment/);
});
test("profit-share still respects retained-profit caps and validates costs without inventing missing values", () => {
  const input = { collected: 80000, vatAmount: 0, billedShippingAmount: 0, refundedAmount: 0, ratePercent: 5, basis: "profit", internalCostTotal: 71000, minimumRetainedProfit: 8900 };
  const result = calculatePartnerCommission(input);
  assert.equal(result.eligible, 450); assert.equal(result.commissionCap, 100); assert.equal(result.withinCap, false);
  for (const internalCostTotal of [-1, true, [], {}, Infinity, "1e3"]) assert.throws(() => calculatePartnerCommission({ ...input, internalCostTotal }), /invalid_amount/);
  assert.throws(() => calculatePartnerCommission({ ...input, basis: "after-tax" }), /invalid_commission_basis/);
  assert.equal(calculatePartnerCommission({ ...input, collected: 1000000, internalCostTotal: 0, minimumRetainedProfit: 0, ratePercent: 3.3333 }).eligible, 33333);
});
test("partial payment waits for the full reviewed exclusions and does not imply costs are known", () => {
  const result = calculatePartnerCommission({ collected: 500000, vatAmount: 800000, billedShippingAmount: 200000, refundedAmount: 0, ratePercent: 3 });
  assert.equal(result.base, 0); assert.equal(result.eligible, 0); assert.equal(result.withinCap, null);
});
test("cancelled and fully refunded orders cannot acquire commission via adjustment", () => {
  assert.equal(calculatePartnerCommission({ collected: 1000000, vatAmount: 0, billedShippingAmount: 0, refundedAmount: 0, ratePercent: 5, cancelled: true, adjustmentAmount: 10000 }).eligible, 0);
  assert.throws(() => calculatePartnerCommission({ collected: 1000000, vatAmount: 0, billedShippingAmount: 0, refundedAmount: 1000000, ratePercent: 5, adjustmentAmount: 1 }), /invalid_adjustment/);
});
test("a low margin order fails the retained-profit guardrail without inventing a new selling price", () => {
  const result = calculatePartnerCommission({ collected: 80000, vatAmount: 0, billedShippingAmount: 0, refundedAmount: 0, ratePercent: 3, internalCostTotal: 71000, minimumRetainedProfit: 8000 });
  assert.equal(result.eligible, 2400); assert.equal(result.commissionCap, 1000); assert.equal(result.withinCap, false);
});
test("percentage arithmetic settles whole VND and adjustments cannot exceed cash basis", () => {
  const result = calculatePartnerCommission({ collected: 100.15, vatAmount: 0, billedShippingAmount: 0, refundedAmount: 0, ratePercent: 8.33, adjustmentAmount: -1 });
  assert.equal(result.calculated, 8); assert.equal(result.eligible, 7);
  assert.throws(() => calculatePartnerCommission({ collected: 100, vatAmount: 0, billedShippingAmount: 0, refundedAmount: 0, ratePercent: 101 }), /invalid_rate/);
  assert.throws(() => calculatePartnerCommission({ collected: 100, vatAmount: 0, billedShippingAmount: 0, refundedAmount: 0, ratePercent: 100, adjustmentAmount: 1 }), /invalid_adjustment/);
});
test("irregular invoice totals produce a payable whole-dong fee and reject fractional adjustments", () => {
  const input = { collected: 987654, vatAmount: 0, billedShippingAmount: 0, refundedAmount: 0, ratePercent: 3 };
  assert.equal(calculatePartnerCommission(input).eligible, 29630);
  assert.throws(() => calculatePartnerCommission({ ...input, adjustmentAmount: 0.5 }), /invalid_adjustment/);
  assert.equal(calculatePartnerCommission({ ...input, collected: 0.5, ratePercent: 100 }).eligible, 0);
});
test("partner errors never disclose backend data or other customers", () => {
  assert.match(partnerErrorMessage({ message: "private customer phone + secret" }), /Chưa thực hiện/);
  assert.match(partnerErrorMessage({ message: "function missing from schema cache" }), /chưa được thiết lập/);
  assert.match(partnerErrorMessage({ message: "commission_cap_exceeded" }), /vượt ngân sách/);
});

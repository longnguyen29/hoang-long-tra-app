import assert from "node:assert/strict";
import test from "node:test";
import { withPaymentBankOverride } from "./payment-settings.js";

test("applies the temporary MB account to client-shaped payment settings", () => {
  assert.deepEqual(withPaymentBankOverride({ accountName: "HOANG LONG" }), {
    bin: "970422",
    bankShortName: "MB Bank",
    accountNumber: "1138133138",
    accountName: "HOANG LONG",
  });
});

test("applies the same account to database-shaped payment settings", () => {
  assert.deepEqual(withPaymentBankOverride({ account_name: "HOANG LONG" }), {
    bin: "970422",
    bank_short_name: "MB Bank",
    account_number: "1138133138",
    account_name: "HOANG LONG",
  });
});

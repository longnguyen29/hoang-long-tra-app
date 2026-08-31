// Temporary receiving account requested by the House. Keep this override in one place so
// every payment surface (checkout, staff settings and public order page) generates the same QR.
export const PAYMENT_BANK_OVERRIDE = Object.freeze({
  bin: "970422",
  bankShortName: "MB Bank",
  accountNumber: "1138133138",
  accountName: "NGUYỄN ĐỨC LONG",
});

export function withPaymentBankOverride(payment = {}) {
  if ("bank_short_name" in payment || "account_number" in payment || "account_name" in payment) {
    return {
      ...payment,
      bin: PAYMENT_BANK_OVERRIDE.bin,
      bank_short_name: PAYMENT_BANK_OVERRIDE.bankShortName,
      account_number: PAYMENT_BANK_OVERRIDE.accountNumber,
      account_name: PAYMENT_BANK_OVERRIDE.accountName,
    };
  }
  return { ...payment, ...PAYMENT_BANK_OVERRIDE };
}

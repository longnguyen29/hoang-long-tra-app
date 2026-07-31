"use client";

import { Printer } from "lucide-react";

export default function PaymentBlock({ order, payment, qrUrl, onPrint, t, TOKENS }) {
  return (
    <div style={{ marginTop: 20, textAlign: "left", background: TOKENS.paperDeep, border: `1px solid ${TOKENS.brassDeep}44`, borderRadius: 12, padding: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ fontSize: 11.5, fontWeight: 700, color: TOKENS.brassDeep, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>
          {t.yourOrderId}
        </div>
        <button onClick={() => onPrint(order)} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11.5, color: TOKENS.jade, background: "none", border: `1px solid ${TOKENS.brassDeep}55`, borderRadius: 6, padding: "5px 9px", cursor: "pointer", flexShrink: 0 }}>
          <Printer size={12} /> {t.printInvoice}
        </button>
      </div>
      <div style={{ fontFamily: "monospace", fontSize: 15, fontWeight: 700, marginBottom: 4, overflowWrap: "anywhere" }}>{order.id}</div>
      <div style={{ fontSize: 12, color: TOKENS.jadeSoft, marginBottom: 16 }}>{t.orderIdSaveNote}</div>

      <div style={{ fontSize: 11.5, fontWeight: 700, color: TOKENS.brassDeep, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>
        {t.paymentTitle}
      </div>
      {qrUrl ? (
        <div>
          <p style={{ fontSize: 13, color: TOKENS.jadeSoft, marginBottom: 12 }}>{t.paymentHint}</p>
          <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
            <img src={qrUrl} alt="VietQR" style={{ width: 140, height: 140, borderRadius: 8, border: `1px solid ${TOKENS.brassDeep}33` }} />
            <div style={{ fontSize: 13, lineHeight: 1.9 }}>
              <div><strong>{payment.bankShortName}</strong></div>
              <div>{t.accountNumberLabel}: {payment.accountNumber}</div>
              <div>{t.accountNameLabel}: {payment.accountName}</div>
              <div>{t.transferContent}: {order.id}</div>
            </div>
          </div>
        </div>
      ) : (
        <p style={{ fontSize: 13, color: TOKENS.jadeSoft, fontStyle: "italic" }}>{t.paymentPending}</p>
      )}
    </div>
  );
}

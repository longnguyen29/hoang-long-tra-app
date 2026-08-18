"use client";

import { useMemo, useState } from "react";
import { X, Printer } from "lucide-react";
import { buildInvoiceHtml, buildPackingSlipHtml, printHtml } from "@/lib/documents";

// Live preview before printing, for Order Flow's Documents tab. Same underlying HTML/print
// mechanism as the quick "Print invoice" button elsewhere in Orders (see lib/documents.js) —
// this just lets staff see it before committing to the print dialog, and adds a packing-slip
// template alongside the invoice. No PDF library, no stored file: "Print / Save as PDF" is
// still the browser's own print dialog, same as today.
export default function DocumentModal({ order, initialKind = "invoice", onClose, t, TOKENS }) {
  const [kind, setKind] = useState(initialKind);
  const html = useMemo(() => (kind === "invoice" ? buildInvoiceHtml(order) : buildPackingSlipHtml(order)), [kind, order]);

  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(28,43,36,0.78)", zIndex: 65,
        display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
      }}
      // Stops here rather than just calling onClose: this backdrop is a DOM descendant of
      // OrderStepDetail's own backdrop (which closes the whole drawer on outside-click), so an
      // un-stopped click would bubble up and close both at once instead of just this modal.
      onClick={(e) => { e.stopPropagation(); onClose(); }}
    >
      <div
        style={{
          background: TOKENS.paper, borderRadius: 16, width: "min(680px, 100%)", maxHeight: "88vh",
          display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: `1px solid ${TOKENS.brassDeep}33` }}>
          <div style={{ display: "flex", gap: 6 }}>
            {[
              { id: "invoice", label: t.generateInvoice },
              { id: "packing-slip", label: t.generatePackingSlip },
            ].map((opt) => (
              <button
                key={opt.id}
                onClick={() => setKind(opt.id)}
                style={{
                  fontSize: 12.5, fontWeight: 600, padding: "7px 12px", borderRadius: 8, cursor: "pointer",
                  border: `1px solid ${TOKENS.brassDeep}55`,
                  background: kind === opt.id ? TOKENS.jade : "transparent",
                  color: kind === opt.id ? TOKENS.paper : TOKENS.jadeSoft,
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <button onClick={onClose} aria-label={t.close} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
            <X size={18} color={TOKENS.jadeSoft} />
          </button>
        </div>

        <p style={{ fontSize: 12, color: TOKENS.jadeSoft, margin: "10px 18px 0" }}>{t.documentsHint}</p>

        <div style={{ flex: 1, overflow: "hidden", margin: "12px 18px", borderRadius: 10, border: `1px solid ${TOKENS.brassDeep}33`, background: "#fff" }}>
          <iframe title={t.documentPreviewTitle} srcDoc={html} style={{ width: "100%", height: "100%", minHeight: 360, border: "none" }} />
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: "0 18px 18px" }}>
          <button
            onClick={() => printHtml(html)}
            style={{
              display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, cursor: "pointer",
              background: TOKENS.jade, color: TOKENS.paper, border: "none", borderRadius: 8, padding: "9px 16px",
            }}
          >
            <Printer size={14} /> {t.printOrSavePdf}
          </button>
        </div>
      </div>
    </div>
  );
}

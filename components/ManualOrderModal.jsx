"use client";

import { useState } from "react";
import { X, Plus, Trash2, Loader2 } from "lucide-react";
import { getStockTotal } from "@/lib/constants";

// Staff creating an order on a customer's behalf — a phone call, a walk-in, or a lead that
// just turned into a real sale. Line items are picked from the real catalog rather than typed
// free-text, so the order this produces is a real order: same shape, same stock deduction
// (retail goes through submit_retail_order, same as the customer-facing checkout), same
// invoice/CSV/Order Flow board as anything a customer submitted themselves.
export default function ManualOrderModal({
  retailOrderableItems, wholesaleProducts, lang, t, TOKENS, formatVND,
  initial, onClose, onCreate,
}) {
  const [type, setType] = useState(initial?.type || "retail");
  const [customerName, setCustomerName] = useState(initial?.customerName || "");
  const [contact, setContact] = useState(initial?.contact || "");
  const [address, setAddress] = useState(initial?.address || "");
  const [taxNumber, setTaxNumber] = useState("");
  const [note, setNote] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash"); // a staff-taken order is usually cash/COD or already agreed by phone
  const [lineItemId, setLineItemId] = useState("");
  const [lineQty, setLineQty] = useState("");
  const [lines, setLines] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const pickList = type === "retail" ? retailOrderableItems : wholesaleProducts;
  const unit = (item) => (type === "wholesale" || item.line === "everyday" ? "kg" : "pcs");

  const addLine = () => {
    const item = pickList.find((p) => (p.cartKey || p.id) === lineItemId);
    const qty = Number(lineQty);
    if (!item || !qty || qty <= 0) return;
    setLines((ls) => [...ls, {
      key: `${item.cartKey || item.id}-${Date.now()}`,
      productId: item.productId || item.id,
      weight: item.weight || null,
      name: item.weight ? { en: `${item.name.en} (${item.weight})`, vi: `${item.name.vi} (${item.weight})` } : item.name,
      qty, unit: unit(item), price: item.price || null,
      stockTotal: getStockTotal(item),
    }]);
    setLineItemId(""); setLineQty("");
  };
  const removeLine = (key) => setLines((ls) => ls.filter((l) => l.key !== key));

  const total = lines.reduce((s, l) => s + (l.price ? l.price * l.qty : 0), 0);

  // In priority order, so only one reason ever shows at a time — a wall of "this is missing,
  // that is missing" is worse than being told the next single thing to fix.
  const missingReason = !customerName.trim() ? t.manualOrderMissingName
    : !contact.trim() ? t.manualOrderMissingContact
    : lines.length === 0 ? t.manualOrderMissingItems
    : "";

  const submit = async () => {
    if (!customerName.trim() || !contact.trim() || lines.length === 0) return;
    setSaving(true);
    setError("");
    try {
      await onCreate({
        type,
        customerName: customerName.trim(),
        contact: contact.trim(),
        address: address.trim(),
        taxNumber: taxNumber.trim(),
        note: note.trim(),
        paymentMethod,
        lines: lines.map(({ key, stockTotal, ...l }) => l),
        initialStage: initial?.initialStage,
      });
      onClose();
    } catch (e) {
      console.error("Manual order failed:", e);
      setError(e?.message || t.manualOrderFailed);
    } finally {
      setSaving(false);
    }
  };

  const field = { width: "100%", boxSizing: "border-box", padding: "9px 12px", borderRadius: 8, border: `1px solid ${TOKENS.brassDeep}55`, fontSize: 13.5, fontFamily: "inherit", background: TOKENS.paper, color: TOKENS.jade };

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(28,43,36,0.72)", zIndex: 70, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
      onClick={onClose}
    >
      <div
        style={{ background: TOKENS.paper, borderRadius: 16, width: "min(520px, 100%)", maxHeight: "88vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.35)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 18px 12px" }}>
          <h3 style={{ fontFamily: "Lora, Georgia, serif", fontSize: 19, margin: 0, color: TOKENS.jade }}>{t.manualOrderTitle}</h3>
          <button onClick={onClose} aria-label={t.close} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
            <X size={18} color={TOKENS.jadeSoft} />
          </button>
        </div>

        <div style={{ padding: "0 18px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", border: `1px solid ${TOKENS.brassDeep}55`, borderRadius: 8, overflow: "hidden", alignSelf: "flex-start" }}>
            {["retail", "wholesale"].map((ty) => (
              <button
                key={ty}
                onClick={() => { setType(ty); setLines([]); setLineItemId(""); }}
                style={{
                  padding: "7px 14px", fontSize: 12.5, fontWeight: 600, cursor: "pointer", border: "none",
                  background: type === ty ? TOKENS.jade : "transparent", color: type === ty ? TOKENS.paper : TOKENS.jadeSoft,
                }}
              >
                {ty === "retail" ? t.shopTitle : t.orderTitle}
              </button>
            ))}
          </div>

          <input style={field} value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder={t.manualOrderNamePh} />
          <input style={field} value={contact} onChange={(e) => setContact(e.target.value)} placeholder={t.yourContact} />
          <input style={field} value={address} onChange={(e) => setAddress(e.target.value)} placeholder={t.yourAddress} />
          <input style={field} value={taxNumber} onChange={(e) => setTaxNumber(e.target.value)} placeholder={t.taxNumber} />

          <div>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: TOKENS.brassOnPaper, marginBottom: 6 }}>{t.manualOrderItems}</div>
            {lines.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 8 }}>
                {lines.map((l) => (
                  <div key={l.key} style={{ display: "flex", alignItems: "center", gap: 8, background: TOKENS.paperDeep, borderRadius: 8, padding: "7px 10px" }}>
                    <span style={{ fontSize: 13, color: TOKENS.jade, flex: 1, minWidth: 0, overflowWrap: "anywhere" }}>
                      {l.name[lang] || l.name.vi} — {l.qty} {l.unit === "kg" ? t.kg : t.pcs}
                      {l.price ? ` (${formatVND(l.price * l.qty)})` : ""}
                    </span>
                    <button onClick={() => removeLine(l.key)} style={{ background: "none", border: "none", cursor: "pointer", padding: 2, flexShrink: 0 }}>
                      <Trash2 size={13} color={TOKENS.lacquer} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: "flex", gap: 6 }}>
              <select value={lineItemId} onChange={(e) => setLineItemId(e.target.value)} style={{ ...field, flex: 1 }}>
                <option value="">{t.manualOrderPickItem}</option>
                {pickList.map((p) => (
                  <option key={p.cartKey || p.id} value={p.cartKey || p.id}>
                    {(p.name.en || p.name.vi)}{p.weight ? ` (${p.weight})` : ""}
                  </option>
                ))}
              </select>
              <input
                type="number" min="0" inputMode="numeric" value={lineQty}
                onChange={(e) => setLineQty(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addLine(); } }}
                placeholder={type === "wholesale" ? t.kg : t.pcs}
                style={{ ...field, width: 70 }}
              />
              <button onClick={addLine} style={{ background: TOKENS.paperDeep, border: `1px solid ${TOKENS.brassDeep}55`, borderRadius: 8, width: 36, flexShrink: 0, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Plus size={15} color={TOKENS.jade} />
              </button>
            </div>
          </div>

          {total > 0 && (
            <div style={{ fontSize: 14, fontWeight: 700, color: TOKENS.jade, textAlign: "right" }}>{formatVND(total)}</div>
          )}

          <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder={t.manualOrderNotePh} rows={2} style={{ ...field, resize: "vertical" }} />

          <div style={{ display: "flex", border: `1px solid ${TOKENS.brassDeep}55`, borderRadius: 8, overflow: "hidden", alignSelf: "flex-start" }}>
            {["cash", "qr"].map((pm) => (
              <button
                key={pm}
                onClick={() => setPaymentMethod(pm)}
                style={{
                  padding: "7px 14px", fontSize: 12.5, fontWeight: 600, cursor: "pointer", border: "none",
                  background: paymentMethod === pm ? TOKENS.jade : "transparent", color: paymentMethod === pm ? TOKENS.paper : TOKENS.jadeSoft,
                }}
              >
                {pm === "cash" ? t.payByCash : t.payByQR}
              </button>
            ))}
          </div>

          {error && <p style={{ fontSize: 12.5, color: TOKENS.lacquer, margin: 0 }}>{error}</p>}

          {/* Named explicitly rather than just greying the button out — a disabled button
              with no reason attached reads as broken, not as "you're missing something". */}
          {!saving && missingReason && (
            <p style={{ fontSize: 12.5, color: TOKENS.brassOnPaper, margin: 0 }}>{missingReason}</p>
          )}

          <button
            onClick={submit}
            disabled={saving || !!missingReason}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 4,
              background: TOKENS.jade, color: TOKENS.paper, border: "none", borderRadius: 10, padding: "11px",
              fontSize: 14, fontWeight: 700, fontFamily: "inherit",
              cursor: (saving || missingReason) ? "default" : "pointer",
              opacity: (saving || missingReason) ? 0.55 : 1,
            }}
          >
            {saving ? <Loader2 size={15} className="spin" /> : null}
            {t.manualOrderCreate}
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { X, Check, Plus } from "lucide-react";

export default function TeaDetailModal({ product, unit, lang, t, TOKENS, onConfirm, onClose }) {
  const [qty, setQty] = useState("");
  const [added, setAdded] = useState(false);

  const confirm = () => {
    const n = Math.max(0, Number(qty) || 0);
    onConfirm(n);
    setAdded(true);
    setTimeout(() => setAdded(false), 1200);
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(28,43,36,0.72)", zIndex: 55,
        display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: TOKENS.paper, borderRadius: 16, width: "min(420px, 100%)", maxHeight: "85vh",
          overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ position: "relative" }}>
          {product.photoUrl ? (
            <img src={product.photoUrl} alt={product.name[lang]} style={{ width: "100%", height: 180, objectFit: "cover", borderRadius: "16px 16px 0 0" }} />
          ) : (
            <div style={{ width: "100%", height: 90, background: TOKENS.jade }} />
          )}
          <button
            onClick={onClose}
            style={{
              position: "absolute", top: 12, right: 12, background: "rgba(0,0,0,0.35)", border: "none",
              borderRadius: "50%", width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
            }}
          >
            <X size={16} color="#fff" />
          </button>
        </div>

        <div style={{ padding: 20 }}>
          <h3 style={{ fontFamily: "Fraunces, Georgia, serif", fontWeight: 500, fontSize: 20, margin: "0 0 8px", overflowWrap: "anywhere" }}>
            {product.name[lang]}
          </h3>
          {product.available === false && (
            <span style={{ fontSize: 11.5, fontWeight: 700, color: TOKENS.lacquer }}>{t.outOfStock}</span>
          )}
          {product.notes?.[lang] && (
            <p style={{ fontSize: 14, color: TOKENS.jadeSoft, fontStyle: "italic", lineHeight: 1.6, margin: "8px 0" }}>{product.notes[lang]}</p>
          )}
          {(product.brew?.[lang] || product.packSize) && (
            <div style={{ fontSize: 13, color: TOKENS.brassDeep, marginBottom: 14 }}>
              {product.brew?.[lang]}
              {product.packSize ? ` · ${product.packSize}` : ""}
            </div>
          )}

          {product.available !== false && (
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 10 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11.5, color: TOKENS.jadeSoft, marginBottom: 4 }}>{t.quantityLabel}</div>
                <input
                  type="number"
                  min="0"
                  inputMode="numeric"
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  placeholder="0"
                  style={{ width: "100%", boxSizing: "border-box", padding: "9px 12px", borderRadius: 8, border: `1px solid ${TOKENS.brassDeep}55`, fontSize: 14 }}
                />
              </div>
              <span style={{ fontSize: 13, color: TOKENS.jadeSoft, flexShrink: 0, marginTop: 16 }}>{unit}</span>
            </div>
          )}

          {product.available !== false && (
            <button
              onClick={confirm}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 7, width: "100%", marginTop: 16,
                background: added ? TOKENS.brass : TOKENS.jade, color: added ? TOKENS.jade : TOKENS.paper,
                border: "none", borderRadius: 8, padding: "12px", fontSize: 14, fontWeight: 600, cursor: "pointer",
              }}
            >
              {added ? <Check size={15} /> : <Plus size={15} />}
              {added ? t.addedToOrder : t.addToOrder}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

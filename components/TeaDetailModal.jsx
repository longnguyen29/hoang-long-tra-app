"use client";

import { useState } from "react";
import { X, Check, Plus, Sparkles } from "lucide-react";
import { getStockTotal, YIELD_GUIDE } from "@/lib/constants";

export default function TeaDetailModal({ product, unit, showYield, lang, t, TOKENS, onConfirm, onClose }) {
  const hasVariants = product.variants && product.variants.length > 0;
  const [selectedWeight, setSelectedWeight] = useState(hasVariants ? product.variants[0].weight : null);
  const variant = hasVariants ? (product.variants.find((v) => v.weight === selectedWeight) || product.variants[0]) : null;
  const effectivePrice = hasVariants ? variant.price : product.price;
  const effectiveStock = hasVariants ? getStockTotal(variant) : getStockTotal(product);
  const soldOut = product.available === false || effectiveStock === 0;

  const [qty, setQty] = useState("");
  const [added, setAdded] = useState(false);

  const confirm = () => {
    const n = Math.max(0, Number(qty) || 0);
    onConfirm(n, hasVariants ? variant.weight : null);
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
            <img src={product.photoUrl} alt={product.name[lang]} decoding="async" style={{ width: "100%", height: 180, objectFit: "cover", objectPosition: product.photoPosition || "50% 50%", borderRadius: "16px 16px 0 0" }} />
          ) : (
            <div style={{ width: "100%", height: 90, background: TOKENS.jade }} />
          )}
          {product.limited && (
            <div style={{
              position: "absolute", top: 12, left: 12,
              background: TOKENS.jade, color: TOKENS.brass, borderRadius: 20,
              padding: "4px 10px", display: "flex", alignItems: "center", gap: 5,
              fontSize: 11, fontWeight: 700,
            }}>
              <Sparkles size={12} /> {t.limitedBadge}
            </div>
          )}
          <button
            onClick={onClose}
            aria-label={t.close}
            style={{
              position: "absolute", top: 8, right: 8, background: "rgba(0,0,0,0.35)", border: "none",
              borderRadius: "50%", width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
            }}
          >
            <X size={16} color="#fff" />
          </button>
        </div>

        <div style={{ padding: 20 }}>
          <h3 style={{ fontFamily: "Lora, Georgia, serif", fontWeight: 500, fontSize: 20, margin: "0 0 4px", overflowWrap: "anywhere" }}>
            {product.name[lang]}
          </h3>
          {lang === "en" && product.name.vi && (
            <div style={{ fontSize: 12.5, color: TOKENS.jadeSoft, marginBottom: 6 }}>{product.name.vi}</div>
          )}
          {product.available === false && (
            <span style={{ fontSize: 11.5, fontWeight: 700, color: TOKENS.lacquer }}>{t.outOfStock}</span>
          )}

          {hasVariants && (
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              {product.variants.map((v) => (
                <button
                  key={v.weight}
                  onClick={() => { setSelectedWeight(v.weight); setQty(""); }}
                  style={{
                    flex: 1, padding: "10px 8px", borderRadius: 10, cursor: "pointer",
                    border: `1px solid ${v.weight === selectedWeight ? TOKENS.brass : TOKENS.brassDeep}55`,
                    background: v.weight === selectedWeight ? TOKENS.jade : TOKENS.paperDeep,
                    color: v.weight === selectedWeight ? TOKENS.brass : TOKENS.jade,
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
                  }}
                >
                  <span style={{ fontSize: 13.5, fontWeight: 700 }}>{v.weight}</span>
                  {v.price ? <span style={{ fontSize: 11 }}>{v.price.toLocaleString("vi-VN")}đ</span> : null}
                </button>
              ))}
            </div>
          )}

          {effectivePrice ? (
            <div style={{ fontSize: 17, fontWeight: 700, color: TOKENS.brassDeep, marginTop: 4 }}>
              {effectivePrice.toLocaleString("vi-VN")}đ <span style={{ fontSize: 11, fontWeight: 600, color: TOKENS.jadeSoft }}>/ {unit}</span>
            </div>
          ) : null}
          {showYield && effectivePrice ? (
            <div style={{ fontSize: 11.5, color: TOKENS.jadeSoft, marginTop: 2 }}>
              {t.costPerLiterFrom(`${Math.round(effectivePrice / YIELD_GUIDE[1].maxL).toLocaleString("vi-VN")}đ`)}
            </div>
          ) : null}
          {typeof effectiveStock === "number" && product.available !== false && (
            <div style={{ fontSize: 12.5, fontWeight: 700, color: effectiveStock <= 5 ? TOKENS.lacquer : TOKENS.jadeSoft, marginTop: 4 }}>
              {t.stockLeft(effectiveStock)}{effectiveStock <= 5 ? ` · ${t.lastFew}` : ""}
            </div>
          )}
          {product.batch && (
            <div style={{ fontSize: 11.5, color: TOKENS.jadeSoft, marginTop: 2 }}>{t.batchLabel}: {product.batch}</div>
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

          {!soldOut && (
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 10 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11.5, color: TOKENS.jadeSoft, marginBottom: 4 }}>{t.quantityLabel}</div>
                <input
                  type="number"
                  min="0"
                  max={typeof effectiveStock === "number" ? effectiveStock : undefined}
                  inputMode="numeric"
                  value={qty}
                  onChange={(e) => {
                    const n = Number(e.target.value) || 0;
                    const capped = typeof effectiveStock === "number" ? Math.min(n, effectiveStock) : n;
                    setQty(String(capped));
                  }}
                  placeholder="0"
                  style={{ width: "100%", boxSizing: "border-box", padding: "9px 12px", borderRadius: 8, border: `1px solid ${TOKENS.brassDeep}55`, fontSize: 14 }}
                />
              </div>
              <span style={{ fontSize: 13, color: TOKENS.jadeSoft, flexShrink: 0, marginTop: 16 }}>{unit}</span>
            </div>
          )}

          {!soldOut && (
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

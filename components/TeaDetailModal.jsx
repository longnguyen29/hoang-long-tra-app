"use client";

import { useState } from "react";
import { X, Check, Plus, Sparkles, Star } from "lucide-react";
import { getStockTotal, YIELD_GUIDE } from "@/lib/constants";

// Row of 1-5 stars. Interactive when onPick is given, read-only otherwise.
function Stars({ value, size = 14, onPick, TOKENS }) {
  return (
    <span style={{ display: "inline-flex", gap: 1, verticalAlign: "middle" }}>
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= value;
        const star = (
          <Star
            size={size}
            color={TOKENS.brassDeep}
            fill={filled ? TOKENS.brassDeep : "none"}
            strokeWidth={1.6}
          />
        );
        if (!onPick) return <span key={n} style={{ display: "flex" }}>{star}</span>;
        return (
          <button
            key={n}
            type="button"
            onClick={() => onPick(n)}
            aria-label={`${n}`}
            style={{ background: "none", border: "none", padding: 1, cursor: "pointer", display: "flex", color: TOKENS.jade }}
          >
            {star}
          </button>
        );
      })}
    </span>
  );
}

export default function TeaDetailModal({ product, unit, showYield, lang, t, TOKENS, onConfirm, onClose, supabase, reviews = [], stats, onReviewSubmitted }) {
  const hasVariants = product.variants && product.variants.length > 0;
  const [selectedWeight, setSelectedWeight] = useState(hasVariants ? product.variants[0].weight : null);
  const variant = hasVariants ? (product.variants.find((v) => v.weight === selectedWeight) || product.variants[0]) : null;
  const effectivePrice = hasVariants ? variant.price : product.price;
  const effectiveStock = hasVariants ? getStockTotal(variant) : getStockTotal(product);
  const soldOut = product.available === false || effectiveStock === 0;

  const [qty, setQty] = useState("");
  const [added, setAdded] = useState(false);

  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewDraft, setReviewDraft] = useState({ rating: 0, name: "", contact: "", body: "" });
  const [reviewError, setReviewError] = useState("");
  const [reviewSending, setReviewSending] = useState(false);
  const [reviewSent, setReviewSent] = useState(false);

  const confirm = () => {
    const n = Math.max(0, Number(qty) || 0);
    onConfirm(n, hasVariants ? variant.weight : null);
    setAdded(true);
    setTimeout(() => setAdded(false), 1200);
  };

  const submitReview = async () => {
    if (!reviewDraft.rating || !reviewDraft.name.trim() || !reviewDraft.contact.trim()) return;
    setReviewSending(true);
    setReviewError("");
    const { error } = await supabase.rpc("submit_product_review", {
      p_product_id: product.id,
      p_contact: reviewDraft.contact.trim(),
      p_reviewer_name: reviewDraft.name.trim(),
      p_rating: reviewDraft.rating,
      p_body: reviewDraft.body.trim(),
    });
    setReviewSending(false);
    if (error) {
      const msg = error.message || "";
      setReviewError(
        msg.includes("not_purchased") ? t.reviewErrorNotPurchased
          : msg.includes("already_reviewed") ? t.reviewErrorAlready
          : t.authError
      );
      return;
    }
    setReviewDraft({ rating: 0, name: "", contact: "", body: "" });
    setReviewOpen(false);
    setReviewSent(true);
    if (onReviewSubmitted) onReviewSubmitted();
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
          {stats && stats.count > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
              <Stars value={Math.round(stats.avg)} TOKENS={TOKENS} />
              <span style={{ fontSize: 12.5, color: TOKENS.jadeSoft }}>{t.ratingSummary(stats.avg, stats.count)}</span>
            </div>
          )}
          {product.soldCount > 0 && (
            <div style={{ fontSize: 12, fontWeight: 600, color: TOKENS.brassOnPaper, marginBottom: 6 }}>
              {t.soldBadge(product.soldCount)}
            </div>
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

          {/* ---------- Reviews ---------- */}
          <div style={{ marginTop: 22, borderTop: `1px solid ${TOKENS.hairline}`, paddingTop: 16 }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: TOKENS.brassOnPaper, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>
              {t.reviewsHeading}
            </div>

            {reviews.length === 0 && (
              <p style={{ fontSize: 12.5, color: TOKENS.jadeSoft, fontStyle: "italic", margin: "0 0 12px" }}>{t.noProductReviewsYet}</p>
            )}
            {reviews.map((r) => (
              <div key={r.id} style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <Stars value={r.rating} size={12} TOKENS={TOKENS} />
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: TOKENS.jade }}>{r.reviewerName}</span>
                  <span style={{ fontSize: 11, color: TOKENS.jadeSoft }}>{String(r.createdAt).slice(0, 10)}</span>
                </div>
                {r.body && <p style={{ fontSize: 13, color: TOKENS.jadeSoft, lineHeight: 1.5, margin: "3px 0 0" }}>{r.body}</p>}
              </div>
            ))}

            {reviewSent ? (
              <p style={{ fontSize: 12.5, color: TOKENS.brassOnPaper, margin: "10px 0 0" }}>{t.reviewSubmittedNote}</p>
            ) : reviewOpen ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 12, color: TOKENS.jadeSoft }}>{t.yourRating}</span>
                  <Stars value={reviewDraft.rating} size={20} TOKENS={TOKENS} onPick={(n) => setReviewDraft({ ...reviewDraft, rating: n })} />
                </div>
                <input
                  value={reviewDraft.name}
                  onChange={(e) => setReviewDraft({ ...reviewDraft, name: e.target.value })}
                  placeholder={t.yourReviewNamePh}
                  style={{ padding: "9px 12px", borderRadius: 8, border: `1px solid ${TOKENS.brassDeep}55`, fontSize: 13.5 }}
                />
                <input
                  value={reviewDraft.contact}
                  onChange={(e) => setReviewDraft({ ...reviewDraft, contact: e.target.value })}
                  placeholder={t.reviewContactPh}
                  style={{ padding: "9px 12px", borderRadius: 8, border: `1px solid ${TOKENS.brassDeep}55`, fontSize: 13.5 }}
                />
                <textarea
                  value={reviewDraft.body}
                  onChange={(e) => setReviewDraft({ ...reviewDraft, body: e.target.value })}
                  placeholder={t.reviewBodyPh}
                  rows={2}
                  style={{ padding: "9px 12px", borderRadius: 8, border: `1px solid ${TOKENS.brassDeep}55`, fontSize: 13.5, resize: "vertical", fontFamily: "inherit" }}
                />
                {reviewError && <p style={{ fontSize: 12.5, color: TOKENS.lacquer, margin: 0 }}>{reviewError}</p>}
                <button
                  onClick={submitReview}
                  disabled={reviewSending || !reviewDraft.rating || !reviewDraft.name.trim() || !reviewDraft.contact.trim()}
                  style={{
                    background: TOKENS.jade, color: TOKENS.paper, border: "none", borderRadius: 8, padding: "10px",
                    fontSize: 13, fontWeight: 600, cursor: "pointer",
                    opacity: (reviewSending || !reviewDraft.rating || !reviewDraft.name.trim() || !reviewDraft.contact.trim()) ? 0.5 : 1,
                  }}
                >
                  {t.submitReview}
                </button>
              </div>
            ) : (
              <button
                onClick={() => setReviewOpen(true)}
                style={{
                  background: "none", border: `1px dashed ${TOKENS.brassDeep}88`, borderRadius: 8, padding: "9px 12px",
                  fontSize: 12.5, fontWeight: 600, color: TOKENS.brassOnPaper, cursor: "pointer", width: "100%", marginTop: 6,
                }}
              >
                {t.writeReview}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

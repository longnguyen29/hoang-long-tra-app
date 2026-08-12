"use client";

import { useState } from "react";
import { MapPin, Sprout, ChevronRight } from "lucide-react";
import { TOKENS, getStockTotal } from "@/lib/constants";

// Farm goods from the North-West, sold by the House for the people who grow them.
//
// The vendor leads and the produce follows, which is the opposite of a shop page and is the
// point: the House already sells tea perfectly well without this section. It exists so a
// farmer in Sơn La has somewhere their name, their face and their valley are written down.
//
// So a vendor with no products still appears. A shop would hide them; here an empty shelf
// under a farmer's name is honest, and their story is the thing worth reading anyway.

function Story({ text, lang }) {
  const [open, setOpen] = useState(false);
  if (!text) return null;
  // Long stories are the good ones, and a wall of text at the top of a card stops the next
  // farmer being seen at all. Two lines, then it's the reader's choice.
  const long = text.length > 180;
  return (
    <div style={{ marginTop: 8 }}>
      <p style={{
        fontSize: 13.5, lineHeight: 1.65, color: TOKENS.jade, margin: 0, whiteSpace: "pre-wrap",
        ...(long && !open ? { display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } : null),
      }}>
        {text}
      </p>
      {long && (
        <button
          onClick={() => setOpen((v) => !v)}
          style={{
            background: "none", border: "none", padding: "4px 0 0", cursor: "pointer",
            color: TOKENS.brassOnPaper, fontSize: 12.5, fontWeight: 700, fontFamily: "inherit",
          }}
        >
          {open ? (lang === "en" ? "Show less" : "Thu gọn") : (lang === "en" ? "Read their story" : "Đọc câu chuyện")}
        </button>
      )}
    </div>
  );
}

function GoodsCard({ p, t, lang, retailCart, setRetailQty, formatVND }) {
  const stockTotal = getStockTotal(p);
  const soldOut = p.available === false || stockTotal === 0;
  return (
    <div style={{
      background: TOKENS.paper, borderRadius: 12, overflow: "hidden",
      border: `1px solid ${TOKENS.brassDeep}2E`, display: "flex", flexDirection: "column",
    }}>
      {p.photoUrl ? (
        <div style={{ height: 108, overflow: "hidden", background: TOKENS.paperDeep }}>
          <img
            src={p.photoUrl}
            alt={p.name?.[lang] || p.name?.vi || ""}
            style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: p.photoPosition || "center" }}
          />
        </div>
      ) : (
        <div style={{ height: 108, background: TOKENS.paperDeep, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Sprout size={22} color={`${TOKENS.brassOnPaper}66`} />
        </div>
      )}
      <div style={{ padding: "10px 12px 12px", display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
        <div style={{ fontFamily: "Lora, Georgia, serif", fontSize: 15.5, color: TOKENS.jade, lineHeight: 1.25 }}>
          {p.name?.[lang] || p.name?.vi}
        </div>
        {(p.notes?.[lang] || p.notes?.vi) && (
          <div style={{ fontSize: 12, color: TOKENS.jadeSoft, lineHeight: 1.5 }}>
            {p.notes[lang] || p.notes.vi}
          </div>
        )}
        <div style={{ marginTop: "auto", paddingTop: 8 }}>
          {p.price ? (
            <div style={{ fontSize: 14, fontWeight: 700, color: TOKENS.jade, marginBottom: 6 }}>
              {formatVND(p.price)}{p.packSize ? ` · ${p.packSize}` : ""}
            </div>
          ) : null}
          {soldOut ? (
            <div style={{ fontSize: 11.5, fontWeight: 700, color: TOKENS.lacquer, textAlign: "center", padding: "6px 0" }}>
              {t.outOfStock}
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <input
                type="number"
                min="0"
                inputMode="numeric"
                value={retailCart[p.id] || ""}
                onChange={(e) => setRetailQty(p.id, e.target.value, stockTotal)}
                placeholder="0"
                style={{
                  width: "100%", boxSizing: "border-box", padding: "7px 8px", borderRadius: 6,
                  border: `1px solid ${TOKENS.brassDeep}55`, background: TOKENS.paper,
                  color: TOKENS.jade, fontSize: 13, textAlign: "center",
                }}
              />
              <span style={{ fontSize: 11.5, color: TOKENS.jadeSoft, flexShrink: 0 }}>{t.pcs}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function GoodsSection({
  vendors, goods, t, lang, retailCart, setRetailQty, formatVND, retailTotalItems, onGoToShop,
}) {
  // Products whose vendor was removed, or that the House sourced itself, still have to be
  // reachable — otherwise deleting a vendor profile quietly hides stock that is still in
  // the storeroom and still being paid for.
  const orphans = goods.filter((p) => !p.vendorId || !vendors.some((v) => v.id === p.vendorId));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: TOKENS.brassOnPaper, textTransform: "uppercase", letterSpacing: 0.8 }}>
          {t.goodsEyebrow}
        </div>
        <h2 style={{ fontFamily: "Lora, Georgia, serif", fontSize: "clamp(26px, 6vw, 34px)", color: TOKENS.jade, margin: "6px 0 0", lineHeight: 1.2 }}>
          {t.goodsTitle}
        </h2>
        <p style={{ fontSize: 14, lineHeight: 1.7, color: TOKENS.jadeSoft, margin: "10px 0 0", maxWidth: "60ch" }}>
          {t.goodsIntro}
        </p>
      </div>

      {vendors.length === 0 && goods.length === 0 && (
        <p style={{ fontSize: 13.5, color: TOKENS.jadeSoft, fontStyle: "italic" }}>{t.goodsEmpty}</p>
      )}

      {vendors.map((v) => {
        const theirs = goods.filter((p) => p.vendorId === v.id);
        return (
          <div key={v.id} style={{ background: TOKENS.paperDeep, borderRadius: 16, padding: "16px 16px 18px", boxShadow: TOKENS.shadowSm }}>
            <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
              {v.photo ? (
                <img
                  src={v.photo}
                  alt={v.name}
                  style={{ width: 68, height: 68, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: `2px solid ${TOKENS.brass}55` }}
                />
              ) : (
                <div style={{
                  width: 68, height: 68, borderRadius: "50%", flexShrink: 0,
                  background: `${TOKENS.brass}1F`, display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Sprout size={26} color={TOKENS.brassOnPaper} />
                </div>
              )}
              {/* min-width:0 or a long name refuses to wrap and pushes the card wider than the page. */}
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontFamily: "Lora, Georgia, serif", fontSize: 20, color: TOKENS.jade, lineHeight: 1.25, overflowWrap: "anywhere" }}>
                  {v.name}
                </div>
                {v.region && (
                  <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12.5, color: TOKENS.brassOnPaper, fontWeight: 600, marginTop: 3 }}>
                    <MapPin size={12} /> {v.region}
                  </div>
                )}
                {v.crops && (
                  <div style={{ fontSize: 12.5, color: TOKENS.jadeSoft, marginTop: 3, overflowWrap: "anywhere" }}>{v.crops}</div>
                )}
              </div>
            </div>

            <Story text={v.story?.[lang] || v.story?.vi || ""} lang={lang} />

            {theirs.length > 0 ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10, marginTop: 14 }}>
                {theirs.map((p) => (
                  <GoodsCard key={p.id} p={p} t={t} lang={lang} retailCart={retailCart} setRetailQty={setRetailQty} formatVND={formatVND} />
                ))}
              </div>
            ) : (
              <p style={{ fontSize: 12.5, color: TOKENS.jadeSoft, fontStyle: "italic", margin: "12px 0 0" }}>{t.goodsNoneFromVendor}</p>
            )}
          </div>
        );
      })}

      {orphans.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: TOKENS.brassOnPaper, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>
            {t.goodsOther}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10 }}>
            {orphans.map((p) => (
              <GoodsCard key={p.id} p={p} t={t} lang={lang} retailCart={retailCart} setRetailQty={setRetailQty} formatVND={formatVND} />
            ))}
          </div>
        </div>
      )}

      {/* Goods share the Shop's basket, so the way out of this page has to say where the
          basket lives — otherwise adding something here looks like it did nothing. */}
      {retailTotalItems > 0 && (
        <button
          onClick={onGoToShop}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            background: TOKENS.jade, color: TOKENS.paper, border: "none", borderRadius: 12,
            padding: "13px 18px", fontSize: 14.5, fontWeight: 600, fontFamily: "inherit", cursor: "pointer",
          }}
        >
          {t.goodsToCheckout(retailTotalItems)} <ChevronRight size={16} color={TOKENS.brass} />
        </button>
      )}
    </div>
  );
}

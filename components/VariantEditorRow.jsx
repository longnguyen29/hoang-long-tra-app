"use client";

import { useState } from "react";
import { Check, Save } from "lucide-react";
import FormattedNumberInput from "@/components/FormattedNumberInput";

export default function VariantEditorRow({ variant, onSave, t, TOKENS }) {
  const [price, setPrice] = useState(variant.price ? String(variant.price) : "");
  const [hg, setHg] = useState(variant.stockHaGiang !== undefined && variant.stockHaGiang !== null ? String(variant.stockHaGiang) : "");
  const [ss, setSs] = useState(variant.stockSocSon !== undefined && variant.stockSocSon !== null ? String(variant.stockSocSon) : "");
  const [saved, setSaved] = useState(false);

  const save = () => {
    onSave({
      price: price.trim() !== "" ? Number(price) : undefined,
      stockHaGiang: hg.trim() !== "" ? Math.max(0, Number(hg)) : undefined,
      stockSocSon: ss.trim() !== "" ? Math.max(0, Number(ss)) : undefined,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 1200);
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: TOKENS.jade, width: 36, flexShrink: 0 }}>{variant.weight}</span>
      <FormattedNumberInput
        value={price} onChange={(e) => setPrice(e.target.value)} placeholder={t.pricePh}
        style={{ flex: 1, minWidth: 0, padding: "6px 8px", borderRadius: 6, border: `1px solid ${TOKENS.brassDeep}55`, fontSize: 12 }}
      />
      <FormattedNumberInput
        value={hg} onChange={(e) => setHg(e.target.value)} placeholder={t.warehouseHaGiang}
        style={{ width: 56, padding: "6px 8px", borderRadius: 6, border: `1px solid ${TOKENS.brassDeep}55`, fontSize: 12 }}
      />
      <FormattedNumberInput
        value={ss} onChange={(e) => setSs(e.target.value)} placeholder={t.warehouseSocSon}
        style={{ width: 56, padding: "6px 8px", borderRadius: 6, border: `1px solid ${TOKENS.brassDeep}55`, fontSize: 12 }}
      />
      <button
        onClick={save}
        style={{ background: saved ? TOKENS.brass : "transparent", border: `1px solid ${TOKENS.brassDeep}55`, borderRadius: 6, padding: "6px 8px", cursor: "pointer", flexShrink: 0 }}
      >
        {saved ? <Check size={12} color={TOKENS.jade} /> : <Save size={12} color={TOKENS.jade} />}
      </button>
    </div>
  );
}

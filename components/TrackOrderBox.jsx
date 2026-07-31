"use client";

import { useState } from "react";
import { STATUS_STEPS } from "@/lib/constants";

export default function TrackOrderBox({ supabase, lang, t, TOKENS }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [result, setResult] = useState(undefined); // undefined = not searched, null = not found, object = found
  const [loading, setLoading] = useState(false);

  const lookup = async () => {
    if (!query.trim()) return;
    setLoading(true);
    const { data, error } = await supabase.rpc("track_order", { p_order_id: query.trim() });
    setLoading(false);
    if (error || !data || data.length === 0) {
      setResult(null);
      return;
    }
    setResult(data[0]);
  };

  return (
    <div style={{ marginTop: 28, borderTop: `1px solid ${TOKENS.brassDeep}33`, paddingTop: 18 }}>
      <button
        onClick={() => setOpen((s) => !s)}
        style={{ background: "none", border: "none", color: TOKENS.brassDeep, fontSize: 13.5, fontWeight: 600, cursor: "pointer", padding: 0 }}
      >
        {t.trackOrder}
      </button>
      {open && (
        <div style={{ marginTop: 12 }}>
          <p style={{ fontSize: 12.5, color: TOKENS.jadeSoft, marginBottom: 8 }}>{t.trackOrderHint}</p>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.orderIdPh}
              style={{ flex: 1, padding: "9px 12px", borderRadius: 8, border: `1px solid ${TOKENS.brassDeep}55`, fontSize: 13.5, minWidth: 0 }}
            />
            <button
              onClick={lookup}
              disabled={loading}
              style={{ background: TOKENS.jade, color: TOKENS.paper, border: "none", borderRadius: 8, padding: "9px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer", flexShrink: 0, opacity: loading ? 0.6 : 1 }}
            >
              {t.lookupBtn}
            </button>
          </div>

          {result === null && <p style={{ fontSize: 13, color: TOKENS.lacquer, marginTop: 10 }}>{t.orderNotFound}</p>}

          {result && (
            <div style={{ marginTop: 14, display: "flex", gap: 6 }}>
              {STATUS_STEPS.map((s, i) => {
                const currentIdx = STATUS_STEPS.findIndex((x) => x.id === (result.status || "pending"));
                const active = i <= currentIdx;
                return (
                  <div key={s.id} style={{ flex: 1, textAlign: "center" }}>
                    <div style={{
                      height: 6, borderRadius: 3, background: active ? TOKENS.brass : `${TOKENS.brassDeep}33`, marginBottom: 6,
                    }} />
                    <div style={{ fontSize: 10.5, color: active ? TOKENS.jade : TOKENS.jadeSoft, fontWeight: active ? 700 : 400 }}>
                      {s.label[lang]}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

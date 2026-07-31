"use client";

import { useState } from "react";

export default function ReorderBox({ supabase, type, onApply, t, TOKENS }) {
  const [contact, setContact] = useState("");
  const [status, setStatus] = useState(null); // null | "notfound" | "applied"
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (!contact.trim()) return;
    setLoading(true);
    const { data, error } = await supabase.rpc("reorder_lookup", {
      p_type: type,
      p_contact: contact.trim(),
    });
    setLoading(false);
    if (error || !data || data.length === 0) {
      setStatus("notfound");
      return;
    }
    const row = data[0];
    onApply({
      type,
      lines: row.lines,
      customerName: row.customer_name,
      contact: row.contact,
      address: row.address || "",
      taxNumber: row.tax_number || "",
    });
    setStatus("applied");
  };

  return (
    <div style={{ marginBottom: 20, background: "transparent", border: `1px dashed ${TOKENS.brassDeep}66`, borderRadius: 12, padding: 14 }}>
      <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 4 }}>{t.reorderTitle}</div>
      <p style={{ fontSize: 12, color: TOKENS.jadeSoft, margin: "0 0 10px" }}>{t.reorderHint}</p>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={contact}
          onChange={(e) => { setContact(e.target.value); setStatus(null); }}
          placeholder={t.reorderContactPh}
          style={{ flex: 1, padding: "9px 12px", borderRadius: 8, border: `1px solid ${TOKENS.brassDeep}55`, fontSize: 13.5, minWidth: 0 }}
        />
        <button
          onClick={load}
          disabled={loading}
          style={{ background: TOKENS.brass, color: TOKENS.jade, border: "none", borderRadius: 8, padding: "9px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer", flexShrink: 0, opacity: loading ? 0.6 : 1 }}
        >
          {t.reorderBtn}
        </button>
      </div>
      {status === "notfound" && <p style={{ fontSize: 12.5, color: TOKENS.lacquer, marginTop: 8 }}>{t.reorderNotFound}</p>}
      {status === "applied" && <p style={{ fontSize: 12.5, color: TOKENS.brassDeep, marginTop: 8 }}>{t.reorderApplied}</p>}
    </div>
  );
}

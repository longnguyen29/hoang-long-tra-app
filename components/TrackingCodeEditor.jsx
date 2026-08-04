"use client";

import { useState } from "react";

export default function TrackingCodeEditor({ value, onSave, t, TOKENS }) {
  const [draft, setDraft] = useState(value || "");
  const [saved, setSaved] = useState(false);
  const save = () => {
    onSave(draft.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 1200);
  };
  return (
    <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder={t.trackingCodePh}
        style={{ flex: 1, padding: "7px 10px", borderRadius: 6, border: `1px solid ${TOKENS.brassDeep}55`, fontSize: 12.5, minWidth: 0 }}
      />
      <button
        onClick={save}
        style={{
          background: saved ? TOKENS.brass : "transparent", color: TOKENS.jade,
          border: `1px solid ${TOKENS.brassDeep}55`, borderRadius: 6, padding: "7px 10px", fontSize: 12, fontWeight: 600, cursor: "pointer", flexShrink: 0,
        }}
      >
        {saved ? t.copied : t.saveTracking}
      </button>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";

// A delete control that will not fire on a single tap.
//
// These buttons sit beside real orders and real customers, on a phone, next to other
// controls. One press arms it and shows what is about to happen; a second press does it.
// The armed state expires on its own after a few seconds, so a button left armed by a
// mis-tap cannot be triggered later by an unrelated one.
//
// Deliberately not window.confirm(): it cannot say anything useful about consequences, it
// is suppressed in some embedded browsers, and it looks like a scam prompt.
export default function ConfirmDelete({
  onConfirm,
  label,
  confirmLabel,
  note,
  TOKENS,
  compact = false,
}) {
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 5000);
    return () => clearTimeout(t);
  }, [armed]);

  const run = async () => {
    if (!armed) { setArmed(true); return; }
    setBusy(true);
    try { await onConfirm(); } finally { setBusy(false); setArmed(false); }
  };

  return (
    <span style={{ display: "inline-flex", flexDirection: "column", alignItems: "flex-start", gap: 4 }}>
      <button
        onClick={run}
        disabled={busy}
        style={{
          display: "inline-flex", alignItems: "center", gap: 6, cursor: busy ? "default" : "pointer",
          padding: compact ? "6px 10px" : "8px 12px", borderRadius: 8, fontSize: 12.5, fontWeight: 600,
          border: `1px solid ${TOKENS.lacquer}${armed ? "" : "55"}`,
          background: armed ? TOKENS.lacquer : "none",
          color: armed ? TOKENS.paper : TOKENS.lacquer,
          opacity: busy ? 0.6 : 1,
        }}
      >
        <Trash2 size={13} />
        {armed ? (confirmLabel || "Confirm?") : (label || "Delete")}
      </button>
      {armed && note && (
        <span style={{ fontSize: 11, color: TOKENS.lacquer, lineHeight: 1.4, maxWidth: 260 }}>
          {note}
        </span>
      )}
    </span>
  );
}

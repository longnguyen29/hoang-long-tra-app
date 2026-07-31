"use client";

import { useState } from "react";
import { ChevronLeft, Send } from "lucide-react";

export default function ChatThreadPanel({ thread, onBack, onSend, meLabel, themLabel, replyPh, backLabel, compact }) {
  const [draft, setDraft] = useState("");
  const submit = () => {
    if (!draft.trim()) return;
    onSend(draft.trim());
    setDraft("");
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", ...(compact ? { maxHeight: 360 } : {}) }}>
      {onBack && (
        <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "#2E4A40", cursor: "pointer", fontSize: 13, padding: "12px 14px 0" }}>
          <ChevronLeft size={15} /> {backLabel}
        </button>
      )}
      <div style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 8, minHeight: 120 }}>
        {thread.messages.length === 0 && <p style={{ color: "#2E4A40", fontSize: 13, fontStyle: "italic" }}>—</p>}
        {thread.messages.map((m, i) => (
          <div key={i} style={{ alignSelf: m.from === "customer" ? (compact ? "flex-end" : "flex-start") : (compact ? "flex-start" : "flex-end"), maxWidth: "80%" }}>
            {m.from === "ai" && (
              <div style={{ fontSize: 10.5, color: "#AD8A4E", fontWeight: 700, marginBottom: 3, textTransform: "uppercase", letterSpacing: 0.4 }}>
                Auto-reply
              </div>
            )}
            <div
              style={{
                background: m.from === "admin" ? "#1C2B24" : m.from === "ai" ? "#EFE7D6" : "#F4EEE1",
                color: m.from === "admin" ? "#F7F3EA" : "#1C2B24",
                border: m.from === "ai" ? "1px solid rgba(173,138,78,0.4)" : "none",
                borderRadius: 12,
                padding: "8px 12px",
                fontSize: 13.5,
                lineHeight: 1.5,
              }}
            >
              {m.text}
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, padding: 14, borderTop: "1px solid rgba(173,138,78,0.3)" }}>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={replyPh}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          style={{ flex: 1, padding: "9px 12px", borderRadius: 8, border: "1px solid rgba(173,138,78,0.4)", fontSize: 13.5, minWidth: 0 }}
        />
        <button onClick={submit} style={{ background: "#AD8A4E", border: "none", borderRadius: 8, padding: "9px 12px", cursor: "pointer", flexShrink: 0 }}>
          <Send size={15} color="#1C2B24" />
        </button>
      </div>
    </div>
  );
}

"use client";

// House hero load animation. Uses Lora for the calligraphy line until a real
// TMC-Ong_Do.TTF font file is supplied (see README — brief §8 for details on why
// the calligraphy text is intentionally unaccented "House of Hoang Long").
export default function BrandSeal({ TOKENS }) {
  return (
    <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
      <style>{`
        @keyframes hlDrawRing { to { stroke-dashoffset: 0; } }
        @keyframes hlFadeChar { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
        @keyframes hlRiseIn { to { opacity: 1; transform: translateY(0); } }
        @keyframes hlDrawLine { to { stroke-dashoffset: 0; } }
      `}</style>

      <svg viewBox="0 0 120 120" width="72" height="72" style={{ display: "block", marginBottom: 18 }}>
        <circle
          cx="60" cy="60" r="54" fill="none" stroke={TOKENS.brass} strokeWidth="2"
          style={{ strokeDasharray: 340, strokeDashoffset: 340, animation: "hlDrawRing 1.2s cubic-bezier(0.22,1,0.36,1) forwards" }}
        />
        <text
          x="60" y="76" textAnchor="middle" fontFamily="'Noto Serif SC', serif" fontSize="40" fill={TOKENS.brass}
          style={{ opacity: 0, animation: "hlFadeChar 0.8s cubic-bezier(0.22,1,0.36,1) forwards", animationDelay: "0.9s" }}
        >
          皇龍
        </text>
      </svg>

      <h1
        style={{
          fontFamily: "TMCOngDo, Lora, Georgia, serif", fontWeight: 400, fontSize: "clamp(32px, 9vw, 50px)", lineHeight: 1.15,
          margin: "0 0 14px", overflowWrap: "anywhere", color: TOKENS.paper,
          opacity: 0, transform: "translateY(8px)", animation: "hlRiseIn 0.7s cubic-bezier(0.22,1,0.36,1) forwards", animationDelay: "1.3s",
        }}
      >
        House of Hoang Long
      </h1>

      <svg viewBox="0 0 200 4" width="160" height="4" style={{ display: "block", marginBottom: 14 }}>
        <line
          x1="2" y1="2" x2="198" y2="2"
          stroke={TOKENS.brass} strokeWidth="1.5"
          style={{ strokeDasharray: 196, strokeDashoffset: 196, animation: "hlDrawLine 0.7s cubic-bezier(0.22,1,0.36,1) forwards", animationDelay: "1.9s" }}
        />
      </svg>

      <div
        style={{
          fontSize: 11.5, letterSpacing: 1.5, textTransform: "uppercase", color: `${TOKENS.paper}cc`, fontWeight: 600,
          marginBottom: 14,
          opacity: 0, transform: "translateY(8px)", animation: "hlRiseIn 0.7s cubic-bezier(0.22,1,0.36,1) forwards", animationDelay: "2.2s",
        }}
      >
        Ancient Ha Giang Tea · Japanese Technology
      </div>

      <div
        style={{
          fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: `${TOKENS.paper}77`, fontWeight: 600,
          opacity: 0, transform: "translateY(8px)", animation: "hlRiseIn 0.7s cubic-bezier(0.22,1,0.36,1) forwards", animationDelay: "2.5s",
        }}
      >
        Est. 1995
      </div>
    </div>
  );
}

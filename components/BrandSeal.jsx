"use client";

// House hero load animation. Uses Lora for the calligraphy line until a real
// TMC-Ong_Do.TTF font file is supplied (see README — brief §8 for details on why
// the calligraphy text is intentionally unaccented "House of Hoang Long").
//
// Timing: the ring and underline are hand-drawn strokes, not entering objects, so they
// use ease-in-out (a natural draw has a gentle start and settle, not an instant snap).
// Everything else (seal glyph, heading, tagline, date) is an entrance and uses ease-out,
// which reads as more responsive than ease-in. Each step starts slightly before the
// previous one finishes so the reveal cascades instead of stepping rigidly.
export default function BrandSeal({ TOKENS }) {
  return (
    <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
      <style>{`
        @keyframes hlDrawRing { to { stroke-dashoffset: 0; } }
        @keyframes hlFadeChar { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
        @keyframes hlRiseIn { to { opacity: 1; transform: translateY(0); } }
        @keyframes hlDrawLine { to { stroke-dashoffset: 0; } }

        /* Reduced motion: keep the fade (it aids comprehension of what's appearing),
           drop the staggered delays and the translateY/scale movement. */
        @media (prefers-reduced-motion: reduce) {
          .hl-seal-ring, .hl-seal-line { animation-duration: 400ms !important; }
          .hl-seal-char { animation: hlFadeChar 300ms ease forwards !important; }
          .hl-seal-rise { animation: hlRiseIn 300ms ease forwards !important; transform: none !important; }
        }
      `}</style>

      <svg viewBox="0 0 120 120" width="72" height="72" style={{ display: "block", marginBottom: 18 }}>
        <circle
          className="hl-seal-ring"
          cx="60" cy="60" r="54" fill="none" stroke={TOKENS.brass} strokeWidth="2"
          style={{ strokeDasharray: 340, strokeDashoffset: 340, animation: "hlDrawRing 1500ms cubic-bezier(0.77,0,0.175,1) forwards", animationDelay: "400ms" }}
        />
        <text
          className="hl-seal-char"
          x="60" y="76" textAnchor="middle" fontFamily="'Noto Serif SC', serif" fontSize="40" fill={TOKENS.brass}
          style={{ opacity: 0, animation: "hlFadeChar 880ms cubic-bezier(0.22,1,0.36,1) forwards", animationDelay: "1450ms" }}
        >
          皇龍
        </text>
      </svg>

      <h1
        className="hl-seal-rise"
        style={{
          fontFamily: "TMCOngDo, Lora, Georgia, serif", fontWeight: 400, fontSize: "clamp(32px, 9vw, 50px)", lineHeight: 1.15,
          margin: "0 0 14px", overflowWrap: "anywhere", color: TOKENS.paper,
          opacity: 0, transform: "translateY(8px)", animation: "hlRiseIn 960ms cubic-bezier(0.22,1,0.36,1) forwards", animationDelay: "2100ms",
        }}
      >
        House of Hoang Long
      </h1>

      <svg viewBox="0 0 200 4" width="160" height="4" style={{ display: "block", marginBottom: 14 }}>
        <line
          className="hl-seal-line"
          x1="2" y1="2" x2="198" y2="2"
          stroke={TOKENS.brass} strokeWidth="1.5"
          style={{ strokeDasharray: 196, strokeDashoffset: 196, animation: "hlDrawLine 720ms cubic-bezier(0.77,0,0.175,1) forwards", animationDelay: "3000ms" }}
        />
      </svg>

      <div
        className="hl-seal-rise"
        style={{
          fontSize: 11.5, letterSpacing: 1.5, textTransform: "uppercase", color: `${TOKENS.paper}cc`, fontWeight: 600,
          marginBottom: 14,
          opacity: 0, transform: "translateY(8px)", animation: "hlRiseIn 880ms cubic-bezier(0.22,1,0.36,1) forwards", animationDelay: "3400ms",
        }}
      >
        Ancient Ha Giang Tea · Japanese Technology
      </div>

      <div
        className="hl-seal-rise"
        style={{
          fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: `${TOKENS.paper}88`, fontWeight: 600,
          opacity: 0, transform: "translateY(8px)", animation: "hlRiseIn 880ms cubic-bezier(0.22,1,0.36,1) forwards", animationDelay: "3800ms",
        }}
      >
        Est. 1995
      </div>
    </div>
  );
}

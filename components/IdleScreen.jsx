"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { artworkForDay, fetchArtwork } from "@/lib/artworks";
import { TOKENS } from "@/lib/constants";

const DEFAULT_IDLE_MS = 120000; // two minutes untouched
const REVEAL_MS = 18000;        // dots gather for eighteen seconds, then the picture holds

// Kiosk-only by design. Left on for everyone, this would cover the screen of anyone who
// paused two minutes to read an article, which is hostile on a normal website. The tablet in
// the tea room is opened once at /?kiosk=1 and remembers it; /?kiosk=0 turns it back off.
// ?idle=<seconds> tunes the wait and is remembered too, so the room can be adjusted without
// a deploy — two minutes is only a starting guess.
function useKioskMode() {
  const [state, setState] = useState({ kiosk: false, idleMs: DEFAULT_IDLE_MS });
  useEffect(() => {
    try {
      const q = new URLSearchParams(window.location.search);
      const k = q.get("kiosk");
      if (k === "1") localStorage.setItem("hl_kiosk", "1");
      if (k === "0") localStorage.removeItem("hl_kiosk");

      const secs = Number(q.get("idle"));
      if (Number.isFinite(secs) && secs > 0) localStorage.setItem("hl_kiosk_idle", String(secs));

      const stored = Number(localStorage.getItem("hl_kiosk_idle"));
      setState({
        kiosk: localStorage.getItem("hl_kiosk") === "1",
        idleMs: Number.isFinite(stored) && stored > 0 ? stored * 1000 : DEFAULT_IDLE_MS,
      });
    } catch {
      setState({ kiosk: false, idleMs: DEFAULT_IDLE_MS }); // storage blocked — never trap anyone
    }
  }, []);
  return state;
}

export default function IdleScreen() {
  const { kiosk, idleMs } = useKioskMode();
  const [idle, setIdle] = useState(false);
  const [art, setArt] = useState(null);
  const [failed, setFailed] = useState(false);

  const baseRef = useRef(null);   // accumulates dots; never cleared during a reveal
  const fxRef = useRef(null);     // halos of just-arrived dots; cleared every frame
  const bitmapRef = useRef(null); // the decoded painting, kept for re-sampling on resize
  const rafRef = useRef(0);
  const timerRef = useRef(0);

  // ---- idle timer -------------------------------------------------------------------
  const resetTimer = useCallback(() => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setIdle(true), idleMs);
  }, [idleMs]);

  useEffect(() => {
    if (!kiosk) return;
    const wake = () => { setIdle((was) => { if (was) return false; return was; }); resetTimer(); };
    const events = ["pointerdown", "pointermove", "keydown", "wheel", "touchstart", "scroll"];
    events.forEach((e) => window.addEventListener(e, wake, { passive: true }));
    resetTimer();
    return () => {
      events.forEach((e) => window.removeEventListener(e, wake));
      clearTimeout(timerRef.current);
    };
  }, [kiosk, resetTimer]);

  // Hold the page still underneath. Without this the scrollbar sits on top of the artwork
  // and a stray swipe scrolls a page nobody can see.
  useEffect(() => {
    if (!idle) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [idle]);

  // ---- fetch the day's painting ------------------------------------------------------
  // Loaded on mount, not when the screen goes idle: the reveal should start the instant the
  // room falls quiet, not after a round-trip to New York.
  useEffect(() => {
    if (!kiosk) return;
    const ctrl = new AbortController();
    (async () => {
      try {
        const meta = await fetchArtwork(artworkForDay(), ctrl.signal);
        const img = new Image();
        img.crossOrigin = "anonymous"; // required, or getImageData throws on a tainted canvas
        img.decoding = "async";
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = () => reject(new Error("image load failed"));
          img.src = meta.imageUrl;
        });
        bitmapRef.current = img;
        setArt(meta);
      } catch (e) {
        if (e.name !== "AbortError") {
          console.error("Idle screen artwork unavailable:", e?.message);
          setFailed(true); // fall back to the plain seal rather than a broken screen
        }
      }
    })();
    return () => ctrl.abort();
  }, [kiosk]);

  // ---- the reveal --------------------------------------------------------------------
  useEffect(() => {
    if (!idle || !art || !bitmapRef.current) return;
    const base = baseRef.current, fx = fxRef.current;
    if (!base || !fx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const vw = window.innerWidth, vh = window.innerHeight;
    [base, fx].forEach((c) => {
      c.width = Math.round(vw * dpr);
      c.height = Math.round(vh * dpr);
    });
    const bctx = base.getContext("2d");
    const fctx = fx.getContext("2d");

    // Fit the painting inside the screen with a generous margin — a handscroll is far wider
    // than a hanging scroll, so this has to be contain, never cover.
    const img = bitmapRef.current;
    const margin = Math.min(vw, vh) * 0.09;
    const availW = (vw - margin * 2) * dpr, availH = (vh - margin * 2) * dpr;
    const scale = Math.min(availW / img.naturalWidth, availH / img.naturalHeight);
    const dw = Math.round(img.naturalWidth * scale), dh = Math.round(img.naturalHeight * scale);
    const dx = Math.round((base.width - dw) / 2), dy = Math.round((base.height - dh) / 2);

    // Sample in screen space so dot density is the same whatever the painting's own size.
    const off = document.createElement("canvas");
    off.width = dw; off.height = dh;
    const octx = off.getContext("2d", { willReadFrequently: true });
    octx.drawImage(img, 0, 0, dw, dh);

    let pixels;
    try {
      pixels = octx.getImageData(0, 0, dw, dh).data;
    } catch (e) {
      // Only reachable if a museum drops its CORS header; better a quiet seal than a crash.
      console.error("Canvas tainted, cannot build particles:", e?.message);
      setFailed(true);
      return;
    }

    // Sample every ~3 CSS pixels, so dot size looks the same on a retina tablet and a cheap
    // one. Typed arrays rather than an array of objects: a full-screen retina painting is
    // north of 200,000 dots, which as JS arrays would be tens of megabytes on a device that
    // has none to spare. Packed like this it is a couple of megabytes.
    const grid = Math.max(2, Math.round(3 * dpr));
    const cols = Math.ceil(dw / grid), rows = Math.ceil(dh / grid);
    const max = cols * rows;
    const px16 = new Int16Array(max), py16 = new Int16Array(max);
    const cr = new Uint8Array(max), cg = new Uint8Array(max), cb = new Uint8Array(max);

    let total = 0;
    for (let y = 0; y < dh; y += grid) {
      for (let x = 0; x < dw; x += grid) {
        const i = (y * dw + x) * 4;
        if (pixels[i + 3] < 8) continue; // skip fully transparent margins
        px16[total] = dx + x; py16[total] = dy + y;
        cr[total] = pixels[i]; cg[total] = pixels[i + 1]; cb[total] = pixels[i + 2];
        total++;
      }
    }

    // Draw in a shuffled order. Without this the dots would fill in raster order and read as
    // a wipe; scattered arrival is what makes it look like the picture is condensing out of
    // the dark. Shuffling an index array keeps the pixel data itself untouched.
    const order = new Int32Array(total);
    for (let i = 0; i < total; i++) order[i] = i;
    for (let i = total - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      const tmp = order[i]; order[i] = order[j]; order[j] = tmp;
    }

    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    if (reduced) {
      // No swarm — just place the picture. Same result, no motion.
      bctx.drawImage(img, dx, dy, dw, dh);
      return;
    }

    const radius = grid * 0.62; // slight overlap, so the dots knit into a whole
    let drawn = 0;
    let start = 0;
    let recent = []; // last arrivals, drawn as fading halos on the fx layer

    const tick = (now) => {
      if (!start) start = now;
      const t = Math.min((now - start) / REVEAL_MS, 1);
      // ease-in-out: hesitant at first, decisive in the middle, settling at the end
      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      const target = Math.floor(eased * total);

      for (; drawn < target; drawn++) {
        const k = order[drawn];
        bctx.fillStyle = `rgb(${cr[k]},${cg[k]},${cb[k]})`;
        bctx.beginPath();
        bctx.arc(px16[k], py16[k], radius * (0.75 + Math.random() * 0.5), 0, Math.PI * 2);
        bctx.fill();
        if (recent.length < 900) recent.push(k, now);
      }

      // The halo layer gives arriving dots a moment of brightness before they settle. Kept
      // flat (index, timestamp, index, timestamp…) to avoid allocating per dot.
      fctx.clearRect(0, 0, fx.width, fx.height);
      const next = [];
      for (let i = 0; i < recent.length; i += 2) {
        const k = recent[i];
        const age = (now - recent[i + 1]) / 700;
        if (age >= 1) continue;
        fctx.globalAlpha = (1 - age) * 0.5;
        fctx.fillStyle = `rgb(${cr[k]},${cg[k]},${cb[k]})`;
        fctx.beginPath();
        fctx.arc(px16[k], py16[k], radius * (1 + age * 2.4), 0, Math.PI * 2);
        fctx.fill();
        next.push(k, recent[i + 1]);
      }
      fctx.globalAlpha = 1;
      recent = next;

      if (t < 1 || recent.length) rafRef.current = requestAnimationFrame(tick);
      else fctx.clearRect(0, 0, fx.width, fx.height);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [idle, art]);

  if (!kiosk || !idle) return null;

  return (
    <div
      // Not a dialog and not focus-trapped: it must yield to the very first touch, so it
      // only needs to be invisible to assistive tech and dismissible by any input.
      aria-hidden="true"
      style={{
        position: "fixed", inset: 0, zIndex: 200, background: TOKENS.ink,
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "none", overflow: "hidden",
      }}
    >
      {!failed && (
        <>
          <canvas ref={baseRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
          <canvas ref={fxRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
        </>
      )}

      {/* Credit. Not legally required for public-domain work — kept because naming the hand
          that made it is the decent thing, and it is the same courtesy the museums extend. */}
      {art && !failed && (
        <div style={{
          position: "absolute", left: 26, bottom: 22, maxWidth: "72vw",
          color: `${TOKENS.paper}99`, lineHeight: 1.5, pointerEvents: "none",
        }}>
          <div style={{ fontFamily: "Lora, Georgia, serif", fontSize: 15, fontStyle: "italic", color: `${TOKENS.paper}CC` }}>
            {art.title}
          </div>
          <div style={{ fontSize: 11.5, letterSpacing: 0.3 }}>
            {[art.artist, art.date].filter(Boolean).join(" · ")}
          </div>
          <div style={{ fontSize: 10.5, color: `${TOKENS.brass}AA`, marginTop: 2 }}>
            {art.museum} · Public domain
          </div>
        </div>
      )}

      {/* Shown while the painting is still loading, and if it never arrives. */}
      {(failed || !art) && (
        <div style={{
          fontFamily: "'Noto Serif SC', serif", fontSize: 30, letterSpacing: 8,
          color: `${TOKENS.brass}66`,
        }}>
          皇龍
        </div>
      )}
    </div>
  );
}

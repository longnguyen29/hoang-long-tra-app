"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { artworkForDay, fetchArtwork } from "@/lib/artworks";
import { TOKENS } from "@/lib/constants";

const DEFAULT_IDLE_MS = 30000; // half a minute untouched
const REVEAL_MS = 20000;       // dots gather for twenty seconds, then the picture holds

// On for every visitor, everywhere on the public site. ?kiosk=0 switches it off for a given
// device and is remembered; ?kiosk=1 switches it back on. ?idle=<seconds> tunes the wait,
// also remembered, so it can be changed without a deploy.
function useIdleSettings() {
  const [state, setState] = useState({ enabled: false, idleMs: DEFAULT_IDLE_MS });
  useEffect(() => {
    try {
      const q = new URLSearchParams(window.location.search);
      const k = q.get("kiosk");
      if (k === "0") localStorage.setItem("hl_idle_off", "1");
      if (k === "1") localStorage.removeItem("hl_idle_off");

      const secs = Number(q.get("idle"));
      if (Number.isFinite(secs) && secs > 0) localStorage.setItem("hl_idle_secs", String(secs));

      const stored = Number(localStorage.getItem("hl_idle_secs"));
      setState({
        enabled: localStorage.getItem("hl_idle_off") !== "1",
        idleMs: Number.isFinite(stored) && stored > 0 ? stored * 1000 : DEFAULT_IDLE_MS,
      });
    } catch {
      // Storage blocked (private mode). Still run — just without the remembered preference.
      setState({ enabled: true, idleMs: DEFAULT_IDLE_MS });
    }
  }, []);
  return state;
}

// Never cover the screen while someone is mid-sentence in a form, or has the cart, a product
// or the chat open. Thirty seconds is short enough that this matters: typing an address or
// reading a tea's description involves long pauses with no pointer movement at all.
function isBusy() {
  const el = document.activeElement;
  if (el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return true;
  if (el && el.isContentEditable) return true;
  return false;
}

export default function IdleScreen() {
  const { enabled, idleMs } = useIdleSettings();
  const [idle, setIdle] = useState(false);
  const [lit, setLit] = useState(false); // drives the slow fade-in of the whole overlay
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
    if (!enabled) return;
    const wake = () => { setIdle((was) => (was ? false : was)); setLit(false); resetTimer(); };
    const events = ["pointerdown", "pointermove", "keydown", "wheel", "touchstart", "scroll"];
    events.forEach((e) => window.addEventListener(e, wake, { passive: true }));
    resetTimer();
    return () => {
      events.forEach((e) => window.removeEventListener(e, wake));
      clearTimeout(timerRef.current);
    };
  }, [enabled, resetTimer]);

  // Re-arm rather than appear if the visitor is mid-form. Checked at the moment of firing,
  // not when the timer is set, because focus can change during the wait.
  useEffect(() => {
    if (idle && isBusy()) { setIdle(false); resetTimer(); }
  }, [idle, resetTimer]);

  // Two frames after mounting, raise the opacity — the overlay eases in rather than snapping.
  useEffect(() => {
    if (!idle) return;
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setLit(true)));
    return () => cancelAnimationFrame(id);
  }, [idle]);

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
    if (!enabled) return;
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
  }, [enabled]);

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
    const margin = Math.min(vw, vh) * 0.05;
    const availW = (vw - margin * 2) * dpr, availH = (vh - margin * 2) * dpr;
    const scale = Math.min(availW / img.naturalWidth, availH / img.naturalHeight);
    const dw = Math.round(img.naturalWidth * scale), dh = Math.round(img.naturalHeight * scale);
    // Optically centred, not mathematically: a picture placed dead centre reads as sitting
    // low, and the label needs the room beneath it more than the ceiling does.
    const dx = Math.round((base.width - dw) / 2);
    const dy = Math.round((base.height - dh) * 0.42);

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
    const grid = Math.max(3, Math.round(4 * dpr));
    const cols = Math.ceil(dw / grid), rows = Math.ceil(dh / grid);
    const max = cols * rows;
    const px16 = new Int16Array(max), py16 = new Int16Array(max);
    const cr = new Uint8Array(max), cg = new Uint8Array(max), cb = new Uint8Array(max);

    let total = 0;
    for (let y = 0; y < dh; y += grid) {
      for (let x = 0; x < dw; x += grid) {
        // Nudge each dot off its grid point by a quarter cell, and read its colour from
        // where it actually lands. An exact lattice reads as a screen door laid over the
        // painting; too much scatter and colours from unrelated areas sit side by side and
        // the whole thing turns to speckle. A quarter cell breaks the grid without that.
        const jx = ((Math.random() - 0.5) * grid * 0.5) | 0;
        const jy = ((Math.random() - 0.5) * grid * 0.5) | 0;
        const sx = Math.min(dw - 1, Math.max(0, x + jx));
        const sy = Math.min(dh - 1, Math.max(0, y + jy));
        const i = (sy * dw + sx) * 4;
        if (pixels[i + 3] < 8) continue; // skip fully transparent margins
        px16[total] = dx + sx; py16[total] = dy + sy;
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

    // Sized so even the smallest dot reaches the corner of its own cell (half a cell
    // diagonal is grid * 0.707; the minimum here is 0.80 * 0.92 = 0.74). Measured against
    // the same painting drawn plainly, the finished dot canvas matches it closely — median
    // luminance identical, deciles within three points — so the texture reads as the
    // artwork rather than as a screen laid over it.
    const radius = grid * 0.8;

    // One round brush, drawn once and stamped thousands of times. The core is fully opaque
    // and only the outer third feathers: a brush that is soft all the way through never
    // covers the dark ground, so every dot dilutes toward black and the picture ends up
    // grey and grainy. Solid centre, soft rim — colour stays true, edges still blend.
    // Stamping a cached bitmap is also cheaper than filling a path per dot.
    const brushR = Math.ceil(radius * 1.6);
    const brush = document.createElement("canvas");
    brush.width = brush.height = brushR * 2;
    const brx = brush.getContext("2d");
    const grad = brx.createRadialGradient(brushR, brushR, 0, brushR, brushR, brushR);
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(0.62, "rgba(255,255,255,1)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    brx.fillStyle = grad;
    brx.fillRect(0, 0, brushR * 2, brushR * 2);

    // Tinting: draw the brush into a small scratch canvas, then multiply the dot's colour
    // through it. Done per colour would be slow, so instead the brush is stamped onto the
    // base with globalCompositeOperation and a solid fill on top.
    const stamp = document.createElement("canvas");
    stamp.width = stamp.height = brushR * 2;
    const sx2 = stamp.getContext("2d");

    const drawDot = (ctx, k, r, alpha) => {
      const size = r * 2;
      sx2.clearRect(0, 0, brushR * 2, brushR * 2);
      sx2.globalCompositeOperation = "source-over";
      sx2.drawImage(brush, 0, 0);
      sx2.globalCompositeOperation = "source-in";
      sx2.fillStyle = `rgb(${cr[k]},${cg[k]},${cb[k]})`;
      sx2.fillRect(0, 0, brushR * 2, brushR * 2);
      ctx.globalAlpha = alpha;
      ctx.drawImage(stamp, px16[k] - r, py16[k] - r, size, size);
      ctx.globalAlpha = 1;
    };

    let drawn = 0;
    let start = 0;
    let recent = []; // last arrivals, drawn as fading halos on the fx layer

    const tick = (now) => {
      if (!start) start = now;
      const t = Math.min((now - start) / REVEAL_MS, 1);
      // Slow in, slow out, and slowest at the very end — the picture should arrive rather
      // than finish. A plain linear fill felt like a progress bar.
      const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      const target = Math.floor(eased * total);

      for (; drawn < target; drawn++) {
        const k = order[drawn];
        // Near-opaque. Size varies for texture, opacity barely does — translucent dots let
        // the black ground through and wash the colour out.
        drawDot(bctx, k, radius * (0.92 + Math.random() * 0.26), 0.93 + Math.random() * 0.07);
        if (recent.length < 600) recent.push(k, now);
      }

      // Arriving dots hold a soft bloom for a moment, like ink spreading before it dries.
      // Flat array (index, timestamp, …) so nothing is allocated per dot.
      fctx.clearRect(0, 0, fx.width, fx.height);
      const next = [];
      for (let i = 0; i < recent.length; i += 2) {
        const k = recent[i];
        const age = (now - recent[i + 1]) / 900;
        if (age >= 1) continue;
        drawDot(fctx, k, radius * (1 + age * 1.8), (1 - age) * (1 - age) * 0.18);
        next.push(k, recent[i + 1]);
      }
      recent = next;

      if (t < 1 || recent.length) rafRef.current = requestAnimationFrame(tick);
      else fctx.clearRect(0, 0, fx.width, fx.height);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [idle, art]);

  if (!enabled || !idle) return null;

  return (
    <div
      // Not a dialog and not focus-trapped: it must yield to the very first touch, so it
      // only needs to be invisible to assistive tech and dismissible by any input.
      aria-hidden="true"
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        // Warm near-black lifted very slightly behind the painting rather than a flat
        // rectangle of pure black. Ink has a temperature; a cold #000 field made the scroll
        // look pinned to a lightbox instead of resting in a dim room.
        background: `radial-gradient(ellipse at 50% 44%, #241E19 0%, ${TOKENS.ink} 58%, #100D0B 100%)`,
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "none", overflow: "hidden",
        opacity: lit ? 1 : 0,
        transition: "opacity 1400ms cubic-bezier(0.23, 1, 0.32, 1)",
      }}
    >
      {!failed && (
        <>
          <canvas ref={baseRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
          <canvas ref={fxRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
        </>
      )}

      {/* A breath of shadow at the edges so the picture sits in the dark rather than being
          cut out of it. */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: "radial-gradient(ellipse at 50% 46%, rgba(0,0,0,0) 42%, rgba(0,0,0,0.55) 100%)",
      }} />

      {/* Credit. Not legally required for public-domain work — kept because naming the hand
          that made it is the decent thing, and it is the same courtesy the museums extend.
          Quiet and widely letterspaced: it should read as a gallery label, not a caption. */}
      {art && !failed && (
        <div style={{
          position: "absolute", left: "clamp(22px, 5vw, 56px)", bottom: "clamp(20px, 5vh, 48px)",
          maxWidth: "68vw", pointerEvents: "none",
        }}>
          <div aria-hidden="true" style={{
            width: 22, height: 1, background: `${TOKENS.brass}55`, marginBottom: 12,
          }} />
          <div style={{
            fontFamily: "Lora, Georgia, serif", fontSize: "clamp(13px, 1.5vw, 16px)",
            fontStyle: "italic", color: `${TOKENS.paper}B0`, lineHeight: 1.45,
          }}>
            {art.title}
          </div>
          <div style={{
            fontSize: "clamp(10px, 1.1vw, 11.5px)", letterSpacing: 1.6, textTransform: "uppercase",
            color: `${TOKENS.brass}88`, marginTop: 7,
          }}>
            {[art.artist, art.date].filter(Boolean).join(" · ")}
          </div>
          <div style={{ fontSize: 10, letterSpacing: 0.6, color: `${TOKENS.paper}44`, marginTop: 4 }}>
            {art.museum}
          </div>
        </div>
      )}

      {/* The house seal, opposite the label — the room's own quiet mark. */}
      {art && !failed && (
        <div aria-hidden="true" style={{
          position: "absolute", right: "clamp(22px, 5vw, 56px)", bottom: "clamp(20px, 5vh, 48px)",
          fontFamily: "'Noto Serif SC', serif", fontSize: 15, letterSpacing: 3,
          color: `${TOKENS.brass}3A`,
        }}>
          皇龍
        </div>
      )}

      {/* Shown while the painting is still loading, and if it never arrives. */}
      {(failed || !art) && (
        <div style={{
          fontFamily: "'Noto Serif SC', serif", fontSize: 30, letterSpacing: 8,
          color: `${TOKENS.brass}55`,
        }}>
          皇龍
        </div>
      )}
    </div>
  );
}

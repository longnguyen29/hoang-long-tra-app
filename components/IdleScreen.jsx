"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { artworkForDay, fetchArtwork } from "@/lib/artworks";
import { TOKENS } from "@/lib/constants";

const DEFAULT_IDLE_MS = 30000; // half a minute untouched
const REVEAL_MS = 34000;       // colour is brushed in over half a minute, then it holds

// Warm paper, the colour these paintings actually sit on. An earlier version put them on
// near-black like a gallery wall and it read as cold — and because the reveal added colour
// onto that dark ground, the picture appeared to be built out of dark specks rather than
// painted. Ink and watercolour belong on paper.
const PAPER = "#EFE6D6";

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

// Never cover the screen while someone is mid-sentence in a form. Thirty seconds is short
// enough that this matters: typing an address involves long pauses with no pointer movement.
function isBusy() {
  const el = document.activeElement;
  if (!el) return false;
  if (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return true;
  return !!el.isContentEditable;
}

export default function IdleScreen() {
  const { enabled, idleMs } = useIdleSettings();
  const [idle, setIdle] = useState(false);
  const [lit, setLit] = useState(false); // drives the slow fade-in of the whole overlay
  const [art, setArt] = useState(null);
  const [failed, setFailed] = useState(false);

  const canvasRef = useRef(null);
  const bitmapRef = useRef(null);
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

  useEffect(() => {
    if (!idle) return;
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setLit(true)));
    return () => cancelAnimationFrame(id);
  }, [idle]);

  // Hold the page still underneath, so the scrollbar doesn't sit over the artwork.
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
        img.crossOrigin = "anonymous";
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

  // ---- the reveal: colour brushed onto paper -----------------------------------------
  //
  // The painting is never drawn dot by dot. It is drawn whole, then shown only where a
  // growing mask of brush strokes has already been laid down — so what appears is the
  // artist's own colour arriving under a brush, not specks being stacked up.
  useEffect(() => {
    if (!idle || !art || !bitmapRef.current) return;
    const view = canvasRef.current;
    if (!view) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const vw = window.innerWidth, vh = window.innerHeight;
    view.width = Math.round(vw * dpr);
    view.height = Math.round(vh * dpr);
    const ctx = view.getContext("2d");

    const img = bitmapRef.current;
    const margin = Math.min(vw, vh) * 0.05;
    const availW = (vw - margin * 2) * dpr, availH = (vh - margin * 2) * dpr;
    const scale = Math.min(availW / img.naturalWidth, availH / img.naturalHeight);
    const dw = Math.round(img.naturalWidth * scale), dh = Math.round(img.naturalHeight * scale);
    const dx = Math.round((view.width - dw) / 2);
    // Optically centred, not mathematically — dead centre reads as sitting low.
    const dy = Math.round((view.height - dh) * 0.42);

    // The painting, drawn once at full quality.
    const artLayer = document.createElement("canvas");
    artLayer.width = view.width; artLayer.height = view.height;
    artLayer.getContext("2d").drawImage(img, dx, dy, dw, dh);

    // Where colour has been laid down so far.
    const mask = document.createElement("canvas");
    mask.width = view.width; mask.height = view.height;
    const mctx = mask.getContext("2d");

    const brushR = Math.max(6, Math.round(Math.min(dw, dh) * 0.03));

    // A brush head is not a blob — it is a row of hairs, and some carry more pigment than
    // others. Each head here is a stack of thin horizontal bands of differing alpha, with a
    // few left out where the hairs part. Stamped repeatedly along a stroke, those bands line
    // up into continuous streaks: the drag of bristles through wet colour.
    //
    // Which means the stamp size must stay fixed for the length of a stroke. Jittering the
    // scale per stamp — as an earlier version did — slides the bands over each other and
    // grinds the hairs back into a smooth smear.
    const makeBristleHead = () => {
      const c = document.createElement("canvas");
      c.width = c.height = brushR * 2;
      const x = c.getContext("2d");
      const hairs = 6 + Math.floor(Math.random() * 5);
      for (let i = 0; i < hairs; i++) {
        if (Math.random() < 0.18) continue; // a gap where the hairs have parted
        const t = (i + 0.5) / hairs;
        const cy = t * brushR * 2;
        const half = (brushR / hairs) * (0.55 + Math.random() * 0.75);
        // Hairs at the edge of the head press less, so the stroke edge stays soft.
        const press = 1 - Math.pow(Math.abs(t * 2 - 1), 1.7);
        const a = (0.30 + Math.random() * 0.55) * press;
        const lg = x.createLinearGradient(0, cy - half, 0, cy + half);
        lg.addColorStop(0, "rgba(0,0,0,0)");
        lg.addColorStop(0.5, `rgba(0,0,0,${a.toFixed(3)})`);
        lg.addColorStop(1, "rgba(0,0,0,0)");
        x.fillStyle = lg;
        x.fillRect(0, cy - half, brushR * 2, half * 2);
      }
      return c;
    };
    // A handful of heads, so different strokes carry different hair signatures.
    const heads = Array.from({ length: 6 }, makeBristleHead);

    // Strokes sweep across the picture, alternating direction like a hand going back and
    // forth, each wandering on a slow sine so no two edges line up.
    const strokes = [];
    const step = brushR * 0.55; // rows overlap heavily; a sparser pitch left gaps between them
    const rows = Math.ceil(dh / step) + 2;
    for (let r = 0; r < rows; r++) {
      strokes.push({
        y: dy - brushR + r * step,
        dir: r % 2 === 0 ? 1 : -1,
        amp: brushR * (0.5 + Math.random()),
        freq: (Math.PI * 2) / (dw * (0.35 + Math.random() * 0.5)),
        phase: Math.random() * Math.PI * 2,
        head: heads[(Math.random() * heads.length) | 0],
        // Fixed for the whole stroke, so the hairs stay registered.
        rr: brushR * (0.85 + Math.random() * 0.35),
        done: 0,
      });
    }
    // Painted top to bottom, but with neighbours overlapping in time so it never reads as a
    // tidy raster. Each stroke gets a slice of the run, three or so alive at any moment.
    const slice = 1 / rows;
    strokes.forEach((s, i) => {
      s.t0 = Math.max(0, i * slice - slice * 0.9);
      s.t1 = Math.min(1, s.t0 + slice * 3.2);
    });

    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

    const compose = () => {
      ctx.clearRect(0, 0, view.width, view.height);
      ctx.drawImage(artLayer, 0, 0);
      ctx.globalCompositeOperation = "destination-in";
      ctx.drawImage(mask, 0, 0);
      ctx.globalCompositeOperation = "source-over";
    };

    if (reduced) {
      mctx.fillStyle = "#000";
      mctx.fillRect(dx, dy, dw, dh);
      compose();
      return;
    }

    // Fade the mask out towards the picture's edge so the colour dissolves into the paper
    // instead of stopping at a rectangle — the loose, blotchy border in the reference.
    const edge = Math.min(dw, dh) * 0.07;
    const edgeFade = (x, y) => {
      const d = Math.min(x - dx, dx + dw - x, y - dy, dy + dh - y);
      if (d >= edge) return 1;
      if (d <= 0) return 0;
      const k = d / edge;
      return k * k * (0.55 + Math.random() * 0.45); // ragged, not a clean gradient
    };

    const stampAlong = (s, from, to) => {
      const len = dw + brushR * 2;
      const gap = brushR * 0.12;
      for (let d = from * len; d < to * len; d += gap) {
        const x = s.dir > 0 ? dx - brushR + d : dx + dw + brushR - d;
        const y = s.y + Math.sin(x * s.freq + s.phase) * s.amp;
        const a = edgeFade(x, y);
        if (a <= 0) continue;
        mctx.globalAlpha = a;
        mctx.drawImage(s.head, x - s.rr, y - s.rr, s.rr * 2, s.rr * 2);
      }
      mctx.globalAlpha = 1;
    };

    let start = 0;
    const tick = (now) => {
      if (!start) start = now;
      const t = Math.min((now - start) / REVEAL_MS, 1);
      // Slow in, slow out — the colour should arrive rather than finish.
      const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

      for (const s of strokes) {
        if (eased <= s.t0 || s.done >= 1) continue;
        const p = Math.min(1, (eased - s.t0) / (s.t1 - s.t0));
        if (p > s.done) { stampAlong(s, s.done, p); s.done = p; }
      }
      compose();

      if (t < 1) rafRef.current = requestAnimationFrame(tick);
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
        background: `radial-gradient(ellipse at 50% 42%, #F6EFE1 0%, ${PAPER} 55%, #E4D9C4 100%)`,
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "none", overflow: "hidden",
        opacity: lit ? 1 : 0,
        transition: "opacity 1400ms cubic-bezier(0.23, 1, 0.32, 1)",
      }}
    >
      {!failed && (
        <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
      )}

      {/* Credit, as a gallery card would carry it — dark on paper now, not light on black. */}
      {art && !failed && (
        <div style={{
          position: "absolute", left: "clamp(22px, 5vw, 56px)", bottom: "clamp(20px, 5vh, 48px)",
          maxWidth: "68vw", pointerEvents: "none",
        }}>
          <div aria-hidden="true" style={{ width: 22, height: 1, background: `${TOKENS.brass}88`, marginBottom: 12 }} />
          <div style={{
            fontFamily: "Lora, Georgia, serif", fontSize: "clamp(13px, 1.5vw, 16px)",
            fontStyle: "italic", color: `${TOKENS.jade}D0`, lineHeight: 1.45,
          }}>
            {art.title}
          </div>
          <div style={{
            fontSize: "clamp(10px, 1.1vw, 11.5px)", letterSpacing: 1.6, textTransform: "uppercase",
            color: TOKENS.brassOnPaper, marginTop: 7,
          }}>
            {[art.artist, art.date].filter(Boolean).join(" · ")}
          </div>
          <div style={{ fontSize: 10, letterSpacing: 0.6, color: `${TOKENS.jadeSoft}99`, marginTop: 4 }}>
            {art.museum}
          </div>
        </div>
      )}

      {/* The house seal, opposite the label — the room's own quiet mark. */}
      {art && !failed && (
        <div aria-hidden="true" style={{
          position: "absolute", right: "clamp(22px, 5vw, 56px)", bottom: "clamp(20px, 5vh, 48px)",
          fontFamily: "'Noto Serif SC', serif", fontSize: 15, letterSpacing: 3,
          color: `${TOKENS.brass}70`,
        }}>
          皇龍
        </div>
      )}

      {/* Shown while the painting is still loading, and if it never arrives. */}
      {(failed || !art) && (
        <div style={{
          fontFamily: "'Noto Serif SC', serif", fontSize: 30, letterSpacing: 8,
          color: `${TOKENS.brass}88`,
        }}>
          皇龍
        </div>
      )}
    </div>
  );
}

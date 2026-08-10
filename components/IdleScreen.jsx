"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { artworkForDay, fetchArtwork } from "@/lib/artworks";
import { TOKENS } from "@/lib/constants";

const DEFAULT_IDLE_MS = 30000; // half a minute untouched
const REVEAL_MS = 80000;       // colour is brushed in over eighty seconds, then it holds

// Warm paper, the colour these paintings actually sit on. An earlier version put them on
// near-black like a gallery wall and it read as cold — and because the reveal added colour
// onto that dark ground, the picture appeared to be built out of dark specks rather than
// painted. Ink and watercolour belong on paper.
const PAPER = "#EFE6D6";

// On for every visitor, everywhere on the public site. ?kiosk=0 switches it off for a given
// device and is remembered; ?kiosk=1 switches it back on. ?idle=<seconds> tunes the wait,
// also remembered, so it can be changed without a deploy.
//
// ?paint=<seconds> shortens the painting itself. Deliberately NOT remembered — it exists so
// the effect can be watched end to end in a few seconds instead of eighty while judging it,
// and a fast paint left switched on by accident would be worse than no preview at all.
function useIdleSettings() {
  const [state, setState] = useState({ enabled: false, idleMs: DEFAULT_IDLE_MS, revealMs: REVEAL_MS });
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const paint = Number(q.get("paint"));
    const revealMs = Number.isFinite(paint) && paint > 0 ? paint * 1000 : REVEAL_MS;
    try {
      const k = q.get("kiosk");
      if (k === "0") localStorage.setItem("hl_idle_off", "1");
      if (k === "1") localStorage.removeItem("hl_idle_off");

      const secs = Number(q.get("idle"));
      if (Number.isFinite(secs) && secs > 0) localStorage.setItem("hl_idle_secs", String(secs));

      const stored = Number(localStorage.getItem("hl_idle_secs"));
      setState({
        enabled: localStorage.getItem("hl_idle_off") !== "1",
        idleMs: Number.isFinite(stored) && stored > 0 ? stored * 1000 : DEFAULT_IDLE_MS,
        revealMs,
      });
    } catch {
      // Storage blocked (private mode). Still run — just without the remembered preference.
      setState({ enabled: true, idleMs: DEFAULT_IDLE_MS, revealMs });
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
  const { enabled, idleMs, revealMs } = useIdleSettings();
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

  // ---- the reveal: mist lifting off the painting --------------------------------------
  //
  // Nothing travels across the screen. An earlier version painted the picture in with brush
  // strokes sweeping from several directions, and however soft they were made, strokes that
  // cross at angles and move read as legs — a hand crawling over the paper. The motion was
  // the problem, not its styling.
  //
  // So the painting never moves and is never assembled. It is already there, sunk in mist,
  // and the mist thins: the whole image resolves from a soft pale haze into focus where it
  // has been sitting all along. Which is also what these landscapes are full of.
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

    // A ladder of ever-smaller copies. Drawing a tiny one back up to full size is a blur the
    // graphics card gives away for free — far cheaper than filtering a megapixel every frame,
    // which is what would make a cheap tablet stutter.
    // Spaced densely towards the sharp end. Evenly-ratioed levels double in sharpness at the
    // top — measured, the last rung was twice as crisp as the one below it — so focus snapped
    // in at the finish instead of settling. Crowding the upper rungs makes the final approach
    // the slowest part.
    const LEVELS = 9;
    const mips = [];
    for (let i = 0; i < LEVELS; i++) {
      const f = Math.pow((i + 1) / LEVELS, 1.9); // smallest first, bunched near full size
      const w = Math.max(2, Math.round(dw * f)), h = Math.max(2, Math.round(dh * f));
      const c = document.createElement("canvas");
      c.width = w; c.height = h;
      const cx2 = c.getContext("2d");
      cx2.imageSmoothingEnabled = true;
      cx2.imageSmoothingQuality = "high";
      cx2.drawImage(img, 0, 0, w, h);
      mips.push(c);
    }

    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

    const draw = (level, opacity, breath) => {
      ctx.clearRect(0, 0, view.width, view.height);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      // The mist settles inward by a hair as it clears. Far too slight to notice as movement
      // — it just stops the picture feeling pinned to the glass.
      const g = dw * 0.012 * breath;
      const rx = dx - g, ry = dy - g * (dh / dw), rw = dw + g * 2, rh = dh + g * 2 * (dh / dw);

      const i = Math.min(LEVELS - 1, Math.floor(level));
      const frac = level - i;
      ctx.globalAlpha = opacity;
      ctx.drawImage(mips[i], rx, ry, rw, rh);
      if (i + 1 < LEVELS && frac > 0) {
        // Cross-fade to the next sharpness so focus creeps in continuously rather than
        // stepping between blur levels.
        ctx.globalAlpha = opacity * frac;
        ctx.drawImage(mips[i + 1], rx, ry, rw, rh);
      }
      ctx.globalAlpha = 1;
    };

    if (reduced) { draw(LEVELS - 1, 1, 0); return; }

    let start = 0;
    const tick = (now) => {
      if (!start) start = now;
      const t = Math.min((now - start) / revealMs, 1);

      // Opacity arrives early and slowly — the haze is faintly visible almost at once, so the
      // screen is never simply blank. Focus is held back, so most of the run is the picture
      // quietly sharpening rather than fading up.
      const opacity = Math.min(1, Math.pow(t, 0.55) * 1.05);
      const focus = Math.pow(t, 1.6);
      draw(focus * (LEVELS - 1), opacity, 1 - focus);

      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [idle, art, revealMs]);


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

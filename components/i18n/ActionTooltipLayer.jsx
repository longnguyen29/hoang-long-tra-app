"use client";

import { useEffect, useId, useState } from "react";

const empty = { text: "", left: 0, top: 0, placement: "above" };

export default function ActionTooltipLayer() {
  const tooltipId = useId();
  const [note, setNote] = useState(empty);

  useEffect(() => {
    let activeControl = null;

    const show = (control) => {
      const text = control?.getAttribute("data-action-tooltip");
      if (!text) return;
      const rect = control.getBoundingClientRect();
      const maxWidth = Math.min(304, Math.max(180, window.innerWidth - 24));
      const half = maxWidth / 2;
      const center = rect.left + rect.width / 2;
      activeControl = control;
      control.setAttribute("aria-describedby", tooltipId);
      setNote({
        text,
        left: Math.max(half + 12, Math.min(window.innerWidth - half - 12, center)),
        top: rect.top < 112 ? rect.bottom + 10 : rect.top - 10,
        placement: rect.top < 112 ? "below" : "above",
      });
    };

    const hide = () => {
      if (activeControl?.getAttribute("aria-describedby") === tooltipId) activeControl.removeAttribute("aria-describedby");
      activeControl = null;
      setNote(empty);
    };

    const controlFrom = (target) => target instanceof Element ? target.closest("[data-action-tooltip]") : null;
    const onPointerOver = (event) => show(controlFrom(event.target));
    const onPointerOut = (event) => {
      const control = controlFrom(event.target);
      if (!control || (event.relatedTarget instanceof Node && control.contains(event.relatedTarget))) return;
      hide();
    };
    const onFocusIn = (event) => show(controlFrom(event.target));
    const onFocusOut = (event) => {
      const control = controlFrom(event.target);
      if (!control || (event.relatedTarget instanceof Node && control.contains(event.relatedTarget))) return;
      hide();
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") hide();
    };

    document.addEventListener("pointerover", onPointerOver, true);
    document.addEventListener("pointerout", onPointerOut, true);
    document.addEventListener("focusin", onFocusIn, true);
    document.addEventListener("focusout", onFocusOut, true);
    document.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("scroll", hide, true);
    window.addEventListener("resize", hide);
    return () => {
      document.removeEventListener("pointerover", onPointerOver, true);
      document.removeEventListener("pointerout", onPointerOut, true);
      document.removeEventListener("focusin", onFocusIn, true);
      document.removeEventListener("focusout", onFocusOut, true);
      document.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("scroll", hide, true);
      window.removeEventListener("resize", hide);
    };
  }, [tooltipId]);

  if (!note.text) return null;
  return (
    <div
      id={tooltipId}
      role="tooltip"
      className="hl-action-tooltip"
      data-placement={note.placement}
      data-no-translate
      style={{ left: note.left, top: note.top }}
    >
      {note.text}
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { useRetailCart } from "@/components/public/RetailCartProvider";
import { canTrackMeta, canShowCookiePreferences, META_CONSENT_KEY, META_PIXEL_ID } from "@/lib/meta-pixel";
import styles from "./MetaPixel.module.css";

function loadPixel() {
  if (window.fbq) return;
  const fbq = function () {
    if (fbq.callMethod) fbq.callMethod.apply(fbq, arguments);
    else fbq.queue.push(arguments);
  };
  window.fbq = fbq;
  window._fbq = fbq;
  fbq.push = fbq;
  fbq.loaded = true;
  fbq.version = "2.0";
  fbq.queue = [];
  // Send only the events defined here; do not scrape forms or auto-detect events.
  fbq("set", "autoConfig", false, META_PIXEL_ID);
  fbq("init", META_PIXEL_ID);
  const script = document.createElement("script");
  script.async = true;
  script.src = "https://connect.facebook.net/en_US/fbevents.js";
  document.head.appendChild(script);
}

export default function MetaPixel() {
  const pathname = usePathname();
  const { locale } = useLocale();
  const cartOpen = useRetailCart()?.cartOpen;
  const [choice, setChoice] = useState(null);
  const [ready, setReady] = useState(false);
  const [editing, setEditing] = useState(false);
  const [eligible, setEligible] = useState(false);
  const [footerTarget, setFooterTarget] = useState(null);
  const lastPage = useRef(null);
  const vi = locale === "vi";

  useEffect(() => {
    try { setChoice(localStorage.getItem(META_CONSENT_KEY)); } catch { /* Ask again. */ }
    setReady(true);
    const sync = (event) => {
      if (event.key === META_CONSENT_KEY) {
        if (event.newValue !== "granted") window.fbq?.("consent", "revoke");
        setChoice(event.newValue);
      }
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  useEffect(() => {
    const allowed = canTrackMeta(window.location);
    setEligible(canShowCookiePreferences(window.location));
    if (!ready || !allowed || choice !== "granted") {
      window.fbq?.("consent", "revoke");
      lastPage.current = null;
      return;
    }
    loadPixel();
    window.fbq("consent", "grant");
    if (lastPage.current !== pathname) {
      window.fbq("trackSingle", META_PIXEL_ID, "PageView");
      lastPage.current = pathname;
    }
  }, [pathname, choice, ready]);

  useEffect(() => {
    const retail = pathname === "/goods" || pathname === "/shop" || pathname.startsWith("/shop/");
    const id = retail ? "shop-cookie-preferences" : pathname === "/" ? "home-cookie-preferences" : null;
    if (!id) { setFooterTarget(null); return; }
    let previous = undefined;
    const update = () => {
      const target = document.getElementById(id);
      if (previous === target) return;
      previous = target;
      setFooterTarget(target);
    };
    update();
    // A successful order swaps the receipt into the same URL.
    const observer = new MutationObserver(update);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [pathname]);

  function choose(value) {
    try { localStorage.setItem(META_CONSENT_KEY, value); } catch { /* Session choice still works. */ }
    if (value !== "granted") window.fbq?.("consent", "revoke");
    setChoice(value);
    setEditing(false);
  }

  if (!ready || !eligible || (cartOpen && (pathname === "/goods" || pathname === "/shop" || pathname.startsWith("/shop/")))) return null;
  if (choice && !editing) {
    const inline = footerTarget?.isConnected;
    const button = <button type="button" className={inline ? styles.inlinePreferences : styles.preferences} onClick={() => setEditing(true)}>{vi ? "Tuỳ chọn cookie" : "Cookie preferences"}</button>;
    return inline ? createPortal(button, footerTarget) : button;
  }
  return (
    <section className={styles.notice} aria-label={vi ? "Tuỳ chọn cookie quảng cáo" : "Advertising cookie preferences"}>
      <p>{vi ? "Cho phép cookie Meta để đo hiệu quả quảng cáo qua lượt xem trang và yêu cầu tư vấn? Bạn vẫn dùng được toàn bộ website khi từ chối." : "Allow Meta cookies to measure ads through page views and enquiries? You can use the whole website if you decline."} <a href="/privacy">{vi ? "Quyền riêng tư" : "Privacy"}</a></p>
      <div><button onClick={() => choose("denied")}>{vi ? "Từ chối" : "Decline"}</button><button onClick={() => choose("granted")}>{vi ? "Cho phép" : "Allow"}</button></div>
    </section>
  );
}

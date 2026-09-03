"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Script from "next/script";
import { usePathname } from "next/navigation";
import { useLocale } from "@/components/i18n/LocaleProvider";
import {
  META_CONSENT_KEY,
  clearMetaQueue,
  flushMetaQueue,
  trackMetaPageView,
} from "@/lib/meta-pixel";

const RAW_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || "";
const PIXEL_ID = /^\d+$/.test(RAW_PIXEL_ID) ? RAW_PIXEL_ID : "";

const COPY = {
  vi: {
    title: "Đo lường hiệu quả quảng cáo",
    body: "Nếu bạn đồng ý, Meta Pixel sẽ ghi nhận lượt xem và các bước xin mẫu. Hoàng Long không gửi tên, số điện thoại, địa chỉ hay nội dung biểu mẫu cho Meta.",
    accept: "Cho phép",
    decline: "Từ chối",
    privacy: "Quyền riêng tư",
  },
  en: {
    title: "Advertising measurement",
    body: "If you agree, Meta Pixel will record page views and sample-request steps. Hoàng Long does not send names, phone numbers, addresses, or form contents to Meta.",
    accept: "Allow",
    decline: "Decline",
    privacy: "Privacy",
  },
};

export default function MetaPixel() {
  const { locale } = useLocale();
  const pathname = usePathname();
  const previousPath = useRef(pathname);
  const [consent, setConsent] = useState("loading");
  const t = COPY[locale] || COPY.vi;

  useEffect(() => {
    if (!PIXEL_ID) return;
    try {
      const saved = window.localStorage.getItem(META_CONSENT_KEY);
      setConsent(saved === "accepted" || saved === "declined" ? saved : "unknown");
    } catch {
      setConsent("unknown");
    }
  }, []);

  useEffect(() => {
    if (consent !== "accepted" || previousPath.current === pathname) return;
    previousPath.current = pathname;
    trackMetaPageView();
  }, [consent, pathname]);

  if (!PIXEL_ID) return null;

  const choose = (choice) => {
    try { window.localStorage.setItem(META_CONSENT_KEY, choice); } catch { /* keep session choice */ }
    if (choice === "declined") clearMetaQueue();
    setConsent(choice);
  };

  return (
    <>
      {consent === "accepted" && (
        <Script id="meta-pixel" strategy="afterInteractive" onReady={flushMetaQueue}>
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init',${JSON.stringify(PIXEL_ID)});fbq('track','PageView');`}
        </Script>
      )}
      {consent === "unknown" && (
        <aside aria-label={t.title} style={{
          position: "fixed", zIndex: 1000, left: 16, right: 16, bottom: 16,
          maxWidth: 560, margin: "0 auto", padding: "16px 18px", borderRadius: 14,
          background: "#153b33", color: "#f8f1df", boxShadow: "0 12px 36px rgba(0,0,0,.28)",
          fontFamily: "Inter Tight, Inter, sans-serif",
        }}>
          <strong style={{ display: "block", fontSize: 15, marginBottom: 5 }}>{t.title}</strong>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: "#efe4c8" }}>{t.body}</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 9, marginTop: 12, alignItems: "center" }}>
            <button type="button" onClick={() => choose("accepted")} style={{
              border: 0, borderRadius: 999, padding: "8px 14px", background: "#d4a94f",
              color: "#153b33", fontWeight: 700, cursor: "pointer",
            }}>{t.accept}</button>
            <button type="button" onClick={() => choose("declined")} style={{
              border: "1px solid #d7c9a7", borderRadius: 999, padding: "7px 13px",
              background: "transparent", color: "#f8f1df", fontWeight: 600, cursor: "pointer",
            }}>{t.decline}</button>
            <Link href="/privacy" style={{ color: "#efe4c8", fontSize: 12 }}>{t.privacy}</Link>
          </div>
        </aside>
      )}
    </>
  );
}

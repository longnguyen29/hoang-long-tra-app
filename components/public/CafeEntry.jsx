"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import Link from "next/link";

import { ArrowRight, Check, RotateCcw, Share2, Printer } from "lucide-react";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { createClient } from "@/lib/supabase/client";
import { recommendMenuLab } from "@/lib/menu-lab";
import { cafeShareHref, CAFE_DRINKS, cafeDrink, cafeSampleHref, availableCafePrice } from "@/lib/cafe-entry";
import { recordPublicConversion } from "@/lib/public-attribution";
import styles from "./CafeEntry.module.css";

const COPY = {
  vi: {
    house: "Nhà Hoàng Long", nav: "Xem trà", audience: "Dành cho chủ quán & đội ngũ pha chế",
    title: "Món của quán.\nNền trà nào cho hợp?",
    intro: "Chọn món. Xem nền trà và chi phí mỗi ly. Thử tại quầy của bạn.",
    legend: "Quán đang phát triển món gì?", result: "Gợi ý để bắt đầu thử", recipe: "Hướng món tham chiếu",
    cost: "Trà khô / ly 500 ml", dose: "Lượng trà khô", cups: "Ly ước tính / kg",
    loading: "Đang đọc giá…", missing: "Cần xác nhận giá", unavailable: "Chưa tải được danh mục. Bạn vẫn có thể xem hướng món; Nhà sẽ xác nhận trà và giá khi nhận yêu cầu.",
    retry: "Thử tải lại", note: "Giá tham chiếu từ danh mục. Chỉ tính trà khô; chưa gồm sữa, trái cây, syrup, đá và hao hụt. Giá sỉ được xác nhận theo lượng đặt và lô trà.",
    disclaimer: "Gợi ý để nếm và hiệu chỉnh tại quán, chưa phải công thức thành phẩm đã được kiểm chứng.",
    cta: "Chọn bộ mẫu cho món này", noGate: "Xem gợi ý không cần số điện thoại.",
    photo: "Ảnh ứng dụng trà từ thư viện của Nhà; không phải ảnh của mọi món gợi ý.",
    proofTitle: "Thử tại quầy của bạn.",
    proofBody: "Trà Shan Tuyết Hà Giang, kinh nghiệm làm trà gia đình từ năm 1995. Bộ thử giúp bạn đánh giá trà bằng nguồn nước, thiết bị và nguyên liệu đang dùng tại quán.",
    step1: "Chọn hướng món", body1: "Điều chỉnh vị trà và cỡ ly trong Menu Lab.",
    step2: "Chọn lượng mẫu", body2: "Xem giá và điều kiện từng bộ trước khi gửi yêu cầu.",
    step3: "Nếm rồi quyết định", body3: "Nhà xác nhận bộ mẫu. Bạn thử tại quán và phản hồi trước khi trao đổi đơn sỉ.",
    shop: "Xem danh mục trà", privacy: "Quyền riêng tư", closing: "Từ lá trà Hà Giang đến món của quán.",
  },
  en: {
    house: "House of Hoang Long", nav: "Teas", audience: "For café owners & drinks teams",
    title: "Your drink.\nWhich tea belongs in it?",
    intro: "Choose a drink. See its tea base and tea cost per cup. Test it at your own bar.",
    legend: "What is your café developing?", result: "A starting point to test", recipe: "Reference drink direction",
    cost: "Dry tea / 500 ml cup", dose: "Dry tea dose", cups: "Estimated cups / kg",
    loading: "Reading price…", missing: "Confirm price with us", unavailable: "The catalogue could not load. You can still explore a drink direction; we will confirm tea and price with your request.",
    retry: "Load again", note: "Catalogue reference price. Dry tea only; milk, fruit, syrup, ice and waste are excluded. Wholesale prices depend on quantity and tea lot.",
    disclaimer: "A starting point for tasting and calibration at your bar, not a validated finished recipe.",
    cta: "Choose samples for this drink", noGate: "No phone number needed to explore.",
    photo: "Tea application from the House archive; not a photograph of every suggested drink.",
    proofTitle: "Test at your own bar.",
    proofBody: "Shan Tuyết tea from Hà Giang, with a family tea-making practice since 1995. Judge it with your own water, equipment and ingredients.",
    step1: "Choose a direction", body1: "Adjust tea character and cup size in Menu Lab.",
    step2: "Choose sample size", body2: "See each set’s price and conditions before requesting it.",
    step3: "Taste, then decide", body3: "We confirm the sample set. You test it at your bar and share feedback before discussing a wholesale order.",
    shop: "Browse the teas", privacy: "Privacy", closing: "From Hà Giang tea to your café’s drink.",
  },
};

function track(event, placement) {
  // Local review must not inflate the production experiment ledger.
  if (typeof window === "undefined" || ["localhost", "127.0.0.1", "[::1]"].includes(window.location.hostname)) return;
  try { recordPublicConversion(createClient(), event, { placement, once: true }).catch(() => {}); } catch { /* Non-blocking */ }
}

export default function CafeEntry() {
  const brewDetailsRef = useRef(null);
  const printSelection = () => {
    const details = brewDetailsRef.current;
    if (details) details.open = true;
    window.print();
  };
  const { locale, toggleLocale } = useLocale();
  const t = COPY[locale] || COPY.vi;
  const [drinkId, setDrinkId] = useState("milk");
  const [shareMessage, setShareMessage] = useState("");
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState([]);
  const [status, setStatus] = useState("loading");
  const [attempt, setAttempt] = useState(0);
  const drink = cafeDrink(drinkId);
  const result = useMemo(() => recommendMenuLab({ useCase: drink.id, character: drink.character, cupMl: 500 }, products, locale), [drink, products, locale]);
  const price = availableCafePrice(result, products);
  const href = cafeSampleHref(drinkId, search);

  useEffect(() => {
    setSearch(window.location.search);
    setDrinkId(cafeDrink(new URLSearchParams(window.location.search).get("drink")).id);
    track("home_view", "cafe_entry_v1");
  }, []);

  useEffect(() => {
    let active = true;
    const abort = new AbortController();
    const timeout = setTimeout(() => { abort.abort(); if (active) setStatus("error"); }, 10000);
    setStatus("loading");
    (async () => {
      try {
        const { data, error } = await createClient().from("catalog_products")
          .select("id,name,available,price,kind").eq("available", true).eq("kind", "tea").abortSignal(abort.signal);
        if (!active || abort.signal.aborted) return;
        if (error) throw error;
        setProducts(data || []);
        setStatus("ready");
      } catch { if (active) setStatus("error"); }
      finally { clearTimeout(timeout); }
    })();
    return () => { active = false; abort.abort(); clearTimeout(timeout); };
  }, [attempt]);

  async function shareSelection() {
    const url = new URL(cafeShareHref(drinkId), window.location.origin).href;
    try { await navigator.clipboard.writeText(url); setShareMessage(locale === "vi" ? "Đã sao chép đường dẫn món đã chọn." : "Selected drink link copied."); }
    catch { setShareMessage(locale === "vi" ? "Chạm đường dẫn bên dưới để mở và sao chép." : "Open the link below to copy it."); }
  }

  return (
    <main className={styles.page} data-experiment="cafe-entry-v1">
      <header className={styles.header}>
        <Link href="/" className={styles.brand}><span className={styles.seal} aria-hidden="true">皇龍</span>{t.house}</Link>
        <nav aria-label={locale === "vi" ? "Điều hướng" : "Navigation"}>
          <Link href="/shop">{t.nav}</Link>
          <button onClick={toggleLocale} aria-label={locale === "vi" ? "Switch to English" : "Chuyển sang tiếng Việt"}>{locale === "vi" ? "EN" : "VI"}</button>
        </nav>
      </header>

      <section className={styles.hero}>
        <div className={styles.intro}>
          <h1>{t.title.split("\n").map((line) => <span key={line}>{line}</span>)}</h1>
          <p className={styles.audience}>{t.audience}</p>
          <p className={styles.description}>{t.intro}</p>
        </div>

        <fieldset className={styles.choices}>
          <legend>{t.legend}</legend>
          <div>{CAFE_DRINKS.map((item) => (
            <label key={item.id} data-selected={drinkId === item.id}>
              <input type="radio" name="cafe-drink" value={item.id} checked={drinkId === item.id} onChange={() => { setDrinkId(item.id); setShareMessage(""); track("trade_brief_started", `cafe_entry_${item.id}`); }} />
              <span><strong>{item[locale] || item.vi}</strong><small>{locale === "en" ? item.detailEn : item.detailVi}</small></span>
              {drinkId === item.id && <Check size={18} aria-hidden="true" />}
            </label>
          ))}</div>
        </fieldset>

        <figure className={styles.photo}>
          <div className={styles.drinkArt} data-drink={drinkId} role="img" aria-label={locale === "vi" ? `Minh họa AI: ${drink.vi}` : `AI illustration: ${drink.en}`}/>
          <figcaption>{locale === "vi" ? "Minh họa AI về hướng món · Hãy pha thử để đánh giá thực tế." : "AI drink concept · Brew and taste to evaluate the result."}</figcaption>
        </figure>

        <div className={styles.result}>
          <div aria-live="polite" aria-atomic="true" aria-busy={status === "loading"}>
            <p className={styles.label}>{t.result}</p>
            <h2>{result.teaName}</h2>
            <p className={styles.recipe}>{t.recipe}: <strong>{result.recipeName}</strong></p>
            <dl className={styles.metrics}>
              <div className={styles.mainMetric}><dt>{t.cost}</dt><dd>{status === "loading" ? t.loading : status === "ready" && price !== null ? `${price.toLocaleString("vi-VN")}₫` : t.missing}</dd></div>
              <div><dt>{t.dose}</dt><dd>{result.teaDoseG} g</dd></div>
              <div><dt>{t.cups}</dt><dd>≈ {result.estimatedCupsPerKg}</dd></div>
            </dl>
          </div>
          {status === "error" && <div className={styles.error} role="status"><p>{t.unavailable}</p><button onClick={() => setAttempt((value) => value + 1)}><RotateCcw size={15} aria-hidden="true" />{t.retry}</button></div>}
          <p className={styles.note}>{locale === "vi" ? "Chỉ tính trà khô; chưa gồm sữa, trái cây, đá và hao hụt." : "Dry tea only; excludes milk, fruit, ice and waste."}</p>
          <details ref={brewDetailsRef} className={styles.brewDetails}><summary>{locale === "vi" ? "Xem cách pha tham khảo & cơ sở tính giá" : "Reference brew & price details"}</summary><p>{result.teaDoseG} g · {result.waterMl} ml · {result.temperatureC}°C · {result.brewSeconds} {locale === "vi" ? "giây" : "seconds"}</p><p>{t.note}</p><p>{t.disclaimer}</p></details>
          <Link href={href} className={styles.cta} onClick={() => track("home_sample_clicked", "cafe_entry_handoff")}>{t.cta}<ArrowRight size={19} aria-hidden="true" /></Link>
          <p className={styles.noGate}>{t.noGate}</p>
          <div className={styles.shareActions}><button onClick={shareSelection}><Share2 size={16}/>{locale === "vi" ? "Chia sẻ lựa chọn" : "Share selection"}</button><button onClick={printSelection}><Printer size={16}/>{locale === "vi" ? "Lưu bản in" : "Print / save"}</button></div>
          {shareMessage && <p className={styles.note} role="status">{shareMessage} <Link href={cafeShareHref(drinkId)}>{locale === "vi" ? "Mở lựa chọn" : "Open selection"}</Link></p>}
        </div>
      </section>

      <section className={styles.proof}>
        <div><h2>{t.proofTitle}</h2><p>{t.proofBody}</p><Link href="/shop">{t.shop}<ArrowRight size={17} aria-hidden="true" /></Link></div>
        <ol>{[1, 2, 3].map((step) => <li key={step}><h3>{t[`step${step}`]}</h3><p>{t[`body${step}`]}</p></li>)}</ol>
      </section>
      <footer className={styles.footer}><p>{t.closing}</p><span>House of Hoang Long · Hà Giang</span><Link href="/privacy">{t.privacy}</Link></footer>
    </main>
  );
}

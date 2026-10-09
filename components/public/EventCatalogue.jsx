"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Leaf, Phone } from "lucide-react";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { createClient } from "@/lib/supabase/client";
import { catalogText, isTradeTea, TRADE_CATALOG_FIELDS } from "@/lib/trade-catalog";
import { EVENT_CONTACT, eventLink } from "@/lib/event-contact";
import { eventEnquiryHref, selectedEventTeas } from "@/lib/event-catalog";
import styles from "./EventCatalogue.module.css";

const COPY = {
  vi: {
    back: "Trang liên hệ", eyebrow: "Trà Hoàng Long · Sau cuộc gặp", title: "Chọn trà cho lần thử tiếp theo.",
    intro: "Xem các dòng trà Hoàng Long. Chọn tối đa ba dòng để cùng trao đổi mẫu hoặc báo giá.",
    loading: "Đang tải danh mục trà…", error: "Chưa tải được danh mục trà. Bạn có thể thử lại hoặc trao đổi trực tiếp với Hoàng Long.", retry: "Thử lại",
    empty: "Danh mục đang được cập nhật. Bạn vẫn có thể gửi nhu cầu để Hoàng Long gợi ý trà phù hợp.", continue: "Trao đổi với Hoàng Long",
    teas: "Các dòng trà", choose: "Chọn trà", selected: "Đã chọn", limit: "Đã chọn đủ ba dòng. Bỏ chọn một dòng nếu muốn đổi.",
    packing: "Quy cách", confirmed: "Quy cách và giá được xác nhận khi trao đổi.",
    photo: "Ảnh đang được cập nhật", count: "dòng trà đã chọn", sample: "Trao đổi mẫu", quote: "Nhận báo giá", hint: "Chọn tối đa 3 dòng, hoặc tiếp tục trao đổi nhu cầu chung.",
  },
  en: {
    back: "Contact page", eyebrow: "Hoàng Long tea · After our meeting", title: "Choose teas for your next trial.",
    intro: "Browse Hoàng Long teas. Choose up to three to discuss samples or pricing with us.",
    loading: "Loading the tea catalogue…", error: "The catalogue could not load. Try again or contact Hoàng Long directly.", retry: "Retry",
    empty: "The catalogue is being updated. You can still send your requirements and ask Hoàng Long to suggest suitable teas.", continue: "Discuss with Hoàng Long",
    teas: "Tea range", choose: "Choose tea", selected: "Selected", limit: "Three teas selected. Deselect one to choose a different tea.",
    packing: "Packing", confirmed: "Packing and pricing are confirmed during your enquiry.",
    photo: "Photo being updated", count: "teas selected", sample: "Discuss samples", quote: "Request a quote", hint: "Choose up to 3 teas, or continue with a general enquiry.",
  },
};

function TeaPhoto({ product, locale, fallback }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => { setFailed(false); }, [product.photo_url]);
  return <div className={styles.photo}>
    {product.photo_url && !failed
      ? <img src={product.photo_url} alt={catalogText(product.name, locale)} loading="lazy" onError={() => setFailed(true)} style={{ objectPosition: product.photo_position || "center" }} />
      : <div className={styles.photoFallback}><Leaf size={28} aria-hidden="true"/><span>{fallback}</span></div>}
  </div>;
}

export default function EventCatalogue() {
  const { locale, toggleLocale } = useLocale();
  const t = COPY[locale] || COPY.vi;
  const [products, setProducts] = useState([]);
  const [selected, setSelected] = useState([]);
  const [status, setStatus] = useState("loading");
  const [attempt, setAttempt] = useState(0);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let live = true;
    const controller = new AbortController();
    const incoming = window.location.search;
    const timeout = window.setTimeout(() => { controller.abort(); if (live) setStatus("error"); }, 15000);
    setSearch(incoming);
    setStatus("loading");
    const load = async () => {
      try {
        const { data, error } = await createClient().from("catalog_products").select(TRADE_CATALOG_FIELDS)
          .eq("available", true).order("id").abortSignal(controller.signal);
        if (!live || controller.signal.aborted) return;
        if (error) { setStatus("error"); return; }
        const teas = (data || []).filter(isTradeTea);
        setProducts(teas);
        setSelected((current) => selectedEventTeas(teas, current.length ? current : incoming).map((product) => product.id));
        setStatus("ready");
      } catch { if (live && !controller.signal.aborted) setStatus("error"); }
      finally { window.clearTimeout(timeout); }
    };
    load();
    return () => { live = false; window.clearTimeout(timeout); };
  }, [attempt]);

  const toggle = (id) => setSelected((current) => current.includes(id)
    ? current.filter((value) => value !== id)
    : current.length < 3 ? [...current, id] : current);
  const selectedProducts = selectedEventTeas(products, selected);
  const enquiry = (intent) => eventEnquiryHref(products, selected, intent, search);

  return <main className={styles.page} data-no-translate>
    <header className={styles.header}>
      <Link href={eventLink("/meet", search)} className={styles.back}><ArrowLeft size={17} aria-hidden="true"/>{t.back}</Link>
      <span className={styles.brand}><span aria-hidden="true">皇龍</span>Hoàng Long</span>
      <button type="button" onClick={toggleLocale} aria-label={locale === "vi" ? "Switch to English" : "Chuyển sang tiếng Việt"}>{locale === "vi" ? "EN" : "VI"}</button>
    </header>
    <section className={styles.intro} aria-labelledby="catalogue-title"><p className={styles.eyebrow}>{t.eyebrow}</p><h1 id="catalogue-title">{t.title}</h1><p>{t.intro}</p></section>
    <section className={styles.catalogue} aria-label={t.teas} aria-busy={status === "loading"}>
      {status === "loading" && <p className={styles.state} role="status">{t.loading}</p>}
      {status === "error" && <div className={styles.state} role="alert"><p>{t.error}</p><button type="button" onClick={() => setAttempt((value) => value + 1)}>{t.retry}</button><Link href={eventLink("/meet", search)}>{t.continue}<ArrowRight size={16} aria-hidden="true"/></Link></div>}
      {status === "ready" && !products.length && <div className={styles.state}><p>{t.empty}</p><Link href={eventLink("/meet", search)}>{t.continue}<ArrowRight size={16} aria-hidden="true"/></Link></div>}
      {status === "ready" && products.map((product) => {
        const chosen = selected.includes(product.id);
        return <article className={styles.product} key={product.id} data-selected={chosen}>
          <TeaPhoto product={product} locale={locale} fallback={t.photo}/>
          <div className={styles.details}><h2>{catalogText(product.name, locale) || product.id}</h2>{catalogText(product.notes, locale).trim() && <p className={styles.notes}>{catalogText(product.notes, locale)}</p>}
            {product.pack_size && <p className={styles.packing}>{t.packing}: {product.pack_size}</p>}
            <label className={styles.choose}><input type="checkbox" checked={chosen} disabled={!chosen && selected.length >= 3} onChange={() => toggle(product.id)} aria-label={`${chosen ? t.selected : t.choose}: ${catalogText(product.name, locale) || product.id}`}/><span>{chosen ? <Check size={15} aria-hidden="true"/> : null}{chosen ? t.selected : t.choose}</span></label>
          </div>
        </article>;
      })}
    </section>
    <footer className={styles.footer}><p>{t.confirmed}</p><a href={`tel:${EVENT_CONTACT.phone}`}><Phone size={16} aria-hidden="true"/>{EVENT_CONTACT.phoneLabel}</a></footer>
    <aside className={styles.selection} aria-label={t.teas}>
      <div className={styles.selectionCopy}><strong>{selectedProducts.length} / 3 <span>{t.count}</span></strong><p role="status">{selectedProducts.length === 3 ? t.limit : t.hint}</p></div>
      <div className={styles.selectionActions}><Link href={enquiry("sample")}>{t.sample}<ArrowRight size={17} aria-hidden="true"/></Link><Link href={enquiry("quote")}>{t.quote}<ArrowRight size={17} aria-hidden="true"/></Link></div>
    </aside>
  </main>;
}

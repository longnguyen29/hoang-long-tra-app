"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowRight, Globe2, Menu, ShoppingBag, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { recordPublicConversion } from "@/lib/public-attribution";
import { useLocale } from "@/components/i18n/LocaleProvider";
import styles from "./HouseHome.module.css";

const COPY = {
  en: {
    nav: [["Teas", "/shop"], ["Wholesale", "/wholesale"], ["The house", "/story"], ["Journal", "/gallery"]],
    book: "Book tea",
    place: "Hà Giang · Việt Nam",
    hero: "Shan Tuyết tea for your café’s own drinks.",
    heroBody: "Choose your drink, explore a matching tea and see the tea cost per cup. Test it at your bar before choosing a tea for your menu.",
    explore: "Explore this season",
    trade: "Shop tea for home",
    sampleCta: "Find a tea for your café",
    season: "Current leaves",
    seasonBody: "Small harvests change. The catalogue follows what is actually available, not an imaginary permanent shelf.",
    viewTea: "View tea",
    noTea: "The current catalogue is being prepared.",
    origin: "The house behind the leaf",
    originBody: "Not a farm story polished into a campaign. A working tea house: mountain relationships, careful processing, and the long work of making Vietnamese origin legible abroad.",
    readStory: "Read our story",
    twoWays: "Two ways into the house",
    retailTitle: "Tea for your table",
    retailBody: "Small packs, seasonal releases, and a direct line back to the people who made them.",
    wholesaleTitle: "Tea for your work",
    wholesaleBody: "Samples, café recipes, bulk formats, and export conversations for serious partners.",
    shopNow: "Visit the shop",
    wholesaleNow: "Enter wholesale",
    closing: "Good tea does not need a louder story. It needs a clearer one.",
    contact: "Speak with the house",
    language: "Tiếng Việt",
  },
  vi: {
    nav: [["Trà", "/shop"], ["Đối tác", "/wholesale"], ["Nhà Hoàng Long", "/story"], ["Thư viện", "/gallery"]],
    book: "Hẹn ghé uống trà",
    place: "Hà Giang · Việt Nam",
    hero: "Trà Shan Tuyết Hà Giang cho quán của bạn.",
    heroBody: "Chọn trà cho trà sữa, trà trái cây và các món quán đang phục vụ. Tham khảo chi phí trà khô mỗi ly, rồi chọn mẫu để pha thử trước khi đặt sỉ.",
    explore: "Xem trà mùa này",
    trade: "Mua trà thưởng thức",
    sampleCta: "Chọn trà cho quán",
    season: "Các dòng trà đang có",
    seasonBody: "Trà thay đổi theo mùa và sản lượng thực tế. Vì vậy, danh mục cũng được cập nhật theo từng vụ.",
    viewTea: "Xem trà",
    noTea: "Danh mục trà mùa này đang được chuẩn bị.",
    origin: "Người làm trà Hoàng Long",
    originBody: "Tìm hiểu nguồn trà, người làm trà và những ghi chép của Hoàng Long.",
    readStory: "Đọc câu chuyện",
    twoWays: "Chọn cách bạn muốn bắt đầu",
    retailTitle: "Trà cho bàn trà của bạn",
    retailBody: "Chọn trà theo hương vị, xem quy cách và đặt mua trực tiếp từ Hoàng Long.",
    wholesaleTitle: "Trà cho quán và doanh nghiệp",
    wholesaleBody: "Chọn mẫu để thử tại quán, trao đổi quy cách và nhận báo giá theo nhu cầu đặt hàng.",
    shopNow: "Vào cửa hàng",
    wholesaleNow: "Dành cho đối tác",
    closing: "Tìm hiểu nguồn trà. Nếm thử và chọn vị bạn thích.",
    contact: "Nói chuyện với Nhà",
    language: "English",
  },
};

const FALLBACK_PHOTOS = ["/landing/1.jpg", "/landing/2.jpg", "/landing/3.jpg"];

export default function HouseHome() {
  const { locale: lang, toggleLocale } = useLocale();
  const [menuOpen, setMenuOpen] = useState(false);
  const [catalog, setCatalog] = useState([]);
  const [catalogState, setCatalogState] = useState("loading");
  const [attempt, setAttempt] = useState(0);
  const [entryHref, setEntryHref] = useState("/cho-quan");
  const [home, setHome] = useState(null);
  const supabase = useMemo(() => createClient(), []);
  const t = COPY[lang];

  useEffect(() => {
    let live = true;
    setCatalogState("loading");
    Promise.all([
      supabase.from("catalog_products").select("id,name,notes,photo_url,photo_position,available,kind,line,price").eq("available", true).order("sort_order").limit(6),
      supabase.from("settings_home").select("featured_photos,producer_name,producer_photo,producer_role,producer_quote").eq("id", 1).maybeSingle(),
    ]).then(([products, settings]) => {
      if (!live) return;
      if (!products.error) setCatalog(products.data || []);
      setCatalogState(products.error ? "error" : "ready");
      if (!settings.error) setHome(settings.data || null);
    }).catch(() => { if (live) setCatalogState("error"); });
    return () => { live = false; };
  }, [supabase, attempt]);

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const attribution = new URLSearchParams();
    for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"]) { const value = query.get(key); if(value) attribution.set(key, value.replace(/[^a-zA-Z0-9._-]/g,"-").slice(0,80)); }
    setEntryHref(`/cho-quan${attribution.size ? `?${attribution}` : ""}`);
    recordPublicConversion(supabase, "home_view", { once: true, placement: "home" }).catch(() => {});
  }, [supabase]);

  const photos = home?.featured_photos?.length ? home.featured_photos : FALLBACK_PHOTOS;
  const teas = catalog.filter((item) => item.kind !== "goods").slice(0, 3);
  const local = (value) => value?.[lang] || value?.en || value?.vi || "";

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/" className={styles.wordmark} aria-label="House of Hoang Long home" translate="no">
          <span className={styles.seal} aria-hidden="true">皇龍</span>
          <span className="notranslate" translate="no">House of Hoang Long</span>
        </Link>

        <nav className={styles.desktopNav} aria-label="Primary navigation">
          {t.nav.map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}
        </nav>

        <div className={styles.headerActions}>
          <button className={styles.language} onClick={toggleLocale} aria-label={`Switch to ${t.language}`}>
            <Globe2 size={15} aria-hidden="true" /> <span>{lang.toUpperCase()}</span>
          </button>
          <Link href="/sessions" className={styles.book}>{t.book}</Link>
          <button className={styles.menuButton} onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen} aria-controls="mobile-navigation" aria-label={menuOpen ? "Close menu" : "Open menu"}>
            {menuOpen ? <X size={21}/> : <Menu size={21}/>} 
          </button>
        </div>
      </header>

      {menuOpen && (
        <nav id="mobile-navigation" className={styles.mobileNav} aria-label="Mobile navigation">
          {t.nav.map(([label, href]) => <Link key={href} href={href} onClick={() => setMenuOpen(false)}>{label}<ArrowRight size={18}/></Link>)}
          <Link href="/sessions" onClick={() => setMenuOpen(false)}>{t.book}<ArrowRight size={18}/></Link>
        </nav>
      )}

      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.place}>{t.place}</p>
          <h1>{t.hero}</h1>
          <p className={styles.heroBody}>{t.heroBody}</p>
          <div className={styles.heroLinks}>
            <Link href={entryHref}>
              {t.sampleCta}<ArrowRight size={16}/>
            </Link>
            <Link href="/shop">{t.trade}</Link>
          </div>
          <a href="#season" className={styles.scrollCue} aria-label="Scroll to current teas"><ArrowDown size={17}/></a>
        </div>
        <figure className={styles.heroImage}>
          <img src="/landing/4.jpg" alt={lang === "vi" ? "Ly trà phủ kem trong thư viện ảnh Hoàng Long" : "A cream-topped tea from the Hoàng Long archive"} fetchPriority="high" />
          <figcaption>{lang === "vi" ? "Ảnh ứng dụng trà · Nhà Hoàng Long" : "Tea application · House of Hoang Long"}</figcaption>
        </figure>
      </section>

      <section id="season" className={styles.season}>
        <header className={styles.sectionHead}>
          <h2>{t.season}</h2>
          <p>{t.seasonBody}</p>
        </header>

        <div className={styles.teaIndex}>
          {teas.length ? teas.map((tea, index) => (
            <Link href="/shop" className={styles.teaRow} key={tea.id}>
              <span className={styles.teaNumber}>{String(index + 1).padStart(2, "0")}</span>
              <span className={styles.teaName}>{local(tea.name)}</span>
              <span className={styles.teaNote}>{local(tea.notes) || t.viewTea}</span>
              {tea.photo_url ? <img src={tea.photo_url} alt="" loading="lazy" style={{objectPosition: tea.photo_position || "50% 50%"}} /> : <span className={styles.teaBlank} aria-hidden="true" />}
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
          )) : <div className={styles.empty} role="status">{catalogState === "loading" ? (lang === "vi" ? "Đang tải danh mục trà…" : "Loading the tea catalogue…") : catalogState === "error" ? <><p>{lang === "vi" ? "Chưa tải được danh mục trà." : "The tea catalogue could not load."}</p><button onClick={() => setAttempt(value => value + 1)}>{lang === "vi" ? "Thử tải lại" : "Try again"}</button></> : t.noTea}</div>}
        </div>
      </section>

      <section className={styles.origin}>
        <figure>
          <img src={home?.producer_photo || photos[1]} alt="The people and landscape behind Hoàng Long tea" loading="lazy" />
          {home?.producer_name && <figcaption>{home.producer_name} · {local(home.producer_role)}</figcaption>}
        </figure>
        <div>
          <h2>{t.origin}</h2>
          <p>{local(home?.producer_quote) || t.originBody}</p>
          <Link href="/story">{t.readStory}<ArrowRight size={16}/></Link>
        </div>
      </section>

      <section className={styles.paths}>
        <h2>{t.twoWays}</h2>
        <div className={styles.pathGrid}>
          <article>
            <ShoppingBag size={20} aria-hidden="true" />
            <h3>{t.retailTitle}</h3>
            <p>{t.retailBody}</p>
            <Link href="/shop">{t.shopNow}<ArrowRight size={16}/></Link>
          </article>
          <article>
            <span className={styles.tradeMark} aria-hidden="true">kg</span>
            <h3>{t.wholesaleTitle}</h3>
            <p>{t.wholesaleBody}</p>
            <Link href="/wholesale">{t.wholesaleNow}<ArrowRight size={16}/></Link>
          </article>
        </div>
      </section>

      <footer className={styles.footer}>
        <p>{t.closing}</p>
        <div>
          <span>House of Hoang Long · Hà Giang / Hà Nội</span>
          <a href="https://zalo.me/0903333841" target="_blank" rel="noreferrer">{t.contact} · 0903 333 841</a>
          <Link href="/privacy">Privacy</Link>
        </div>
      </footer>
    </main>
  );
}

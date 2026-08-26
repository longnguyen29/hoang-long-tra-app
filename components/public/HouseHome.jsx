"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowRight, Globe2, Menu, ShoppingBag, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import styles from "./HouseHome.module.css";

const COPY = {
  en: {
    nav: [["Teas", "/shop"], ["Wholesale", "/wholesale"], ["The house", "/story"], ["Journal", "/gallery"]],
    book: "Book tea",
    place: "Hà Giang · Việt Nam",
    hero: "Tea from old trees, made for the world beyond them.",
    heroBody: "House of Hoàng Long works with ancient Shan Tuyết tea from Hà Giang and a precise Japanese processing discipline. Family-made since 1995.",
    explore: "Explore this season",
    trade: "For tea houses & kitchens",
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
    book: "Đặt lịch trà",
    place: "Hà Giang · Việt Nam",
    hero: "Hương vị trà Shan tuyết cổ thụ: Tuyệt tác từ non cao gửi trao thế giới.",
    heroBody: "Từ năm 1995, nhà Hoàng Long làm bạn cùng cây trà Shan Tuyết cổ thụ Hà Giang, kết hợp kinh nghiệm làm trà truyền thống với công nghệ chế biến hiện đại của Nhật Bản.",
    explore: "Xem trà mùa này",
    trade: "Dành cho quán & nhà hàng",
    season: "Những lá trà hiện có",
    seasonBody: "Trà thay đổi theo mùa và sản lượng thực tế. Vì vậy, danh mục cũng được cập nhật theo từng vụ.",
    viewTea: "Xem trà",
    noTea: "Danh mục trà mùa này đang được chuẩn bị.",
    origin: "Ngôi nhà phía sau búp trà",
    originBody: "Đây là câu chuyện về một nhà làm trà đang hoạt động mỗi ngày.",
    readStory: "Đọc câu chuyện",
    twoWays: "Chọn cách bạn muốn bắt đầu",
    retailTitle: "Trà cho bàn trà của bạn",
    retailBody: "Gói nhỏ, trà theo mùa, và một đường nối trực tiếp về người làm ra chúng.",
    wholesaleTitle: "Trà cho quán và doanh nghiệp",
    wholesaleBody: "Mẫu thử, công thức cho quán, quy cách số lượng lớn và trao đổi xuất khẩu cho đối tác cần nguồn trà ổn định.",
    shopNow: "Vào cửa hàng",
    wholesaleNow: "Dành cho đối tác",
    closing: "Trà ngon không cần lời kể ồn ào. Chỉ cần nguồn gốc rõ ràng.",
    contact: "Nói chuyện với Nhà",
    language: "English",
  },
};

const FALLBACK_PHOTOS = ["/landing/1.jpg", "/landing/2.jpg", "/landing/3.jpg"];

export default function HouseHome() {
  const [lang, setLang] = useState("vi");
  const [menuOpen, setMenuOpen] = useState(false);
  const [catalog, setCatalog] = useState([]);
  const [home, setHome] = useState(null);
  const supabase = useMemo(() => createClient(), []);
  const t = COPY[lang];

  useEffect(() => {
    let live = true;
    Promise.all([
      supabase.from("catalog_products").select("id,name,notes,photo_url,photo_position,available,kind,line,price").eq("available", true).order("sort_order").limit(6),
      supabase.from("settings_home").select("featured_photos,producer_name,producer_photo,producer_role,producer_quote").eq("id", 1).maybeSingle(),
    ]).then(([products, settings]) => {
      if (!live) return;
      if (!products.error) setCatalog(products.data || []);
      if (!settings.error) setHome(settings.data || null);
    });
    return () => { live = false; };
  }, [supabase]);

  const photos = home?.featured_photos?.length ? home.featured_photos : FALLBACK_PHOTOS;
  const teas = catalog.filter((item) => item.kind !== "goods").slice(0, 3);
  const local = (value) => value?.[lang] || value?.en || value?.vi || "";

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/" className={styles.wordmark} aria-label="House of Hoàng Long home">
          <span className={styles.seal} aria-hidden="true">皇龍</span>
          <span>House of Hoàng Long</span>
        </Link>

        <nav className={styles.desktopNav} aria-label="Primary navigation">
          {t.nav.map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}
        </nav>

        <div className={styles.headerActions}>
          <button className={styles.language} onClick={() => setLang(lang === "vi" ? "en" : "vi")} aria-label={`Switch to ${t.language}`}>
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
            <Link href="/shop">{t.explore}<ArrowRight size={16}/></Link>
            <Link href="/wholesale">{t.trade}</Link>
          </div>
          <a href="#season" className={styles.scrollCue} aria-label="Scroll to current teas"><ArrowDown size={17}/></a>
        </div>
        <figure className={styles.heroImage}>
          <img src={photos[0]} alt="Hoàng Long tea landscape and craft" fetchPriority="high" />
          <figcaption>House of Hoàng Long · Est. 1995</figcaption>
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
          )) : <p className={styles.empty}>{t.noTea}</p>}
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
          <span>House of Hoàng Long · Hà Giang / Hà Nội</span>
          <a href="https://zalo.me/0903333841" target="_blank" rel="noreferrer">{t.contact} · 0903 333 841</a>
          <Link href="/privacy">Privacy</Link>
        </div>
      </footer>
    </main>
  );
}

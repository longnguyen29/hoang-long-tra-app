"use client";
import PolicyLinks from "@/components/PolicyLinks";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowRight, Globe2, Menu, ShoppingBag, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { recordPublicConversion } from "@/lib/public-attribution";
import { useLocale } from "@/components/i18n/LocaleProvider";
import styles from "./HouseHome.module.css";

const COPY = {
  "vi": {
    "nav": [
      [
        "Năng lực",
        "#capacity"
      ],
      [
        "Danh mục trà",
        "/catalog"
      ],
      [
        "Hợp tác",
        "/wholesale"
      ],
      [
        "Nguồn trà",
        "/story"
      ]
    ],
    "book": "Trao đổi hợp tác",
    "hero": "Nguồn trà Việt cho phân phối & xuất khẩu.",
    "heroBody": "Năng lực sản xuất 1.000 tấn/năm. Hoàng Long cung cấp trà tại xưởng cho nhà phân phối và doanh nghiệp xuất khẩu quy mô lớn, với chất lượng tinh chỉnh theo nhu cầu.",
    "sampleCta": "Trao đổi nhu cầu cung ứng",
    "trade": "Xem năng lực sản xuất",
    "season": "Danh mục để bắt đầu trao đổi",
    "seasonBody": "Chọn dòng trà làm cơ sở thử mẫu. Chất lượng, quy cách, khối lượng và giá tại xưởng được thống nhất theo từng đơn hàng.",
    "viewTea": "Xem trà",
    "noTea": "Danh mục trà đang được cập nhật.",
    "origin": "Từ vùng trà cao đến đối tác dài hạn.",
    "originBody": "Nguyên liệu từ Tây Bắc, Hà Giang và trà cổ thụ vùng cao. Kết hợp nguồn trà với công nghệ Nhật Bản, chế biến hấp hơi và khả năng tinh chỉnh chất lượng theo yêu cầu đối tác.",
    "readStory": "Tìm hiểu nguồn trà",
    "twoWays": "Hợp tác theo thị trường của bạn",
    "retailTitle": "Nhà phân phối",
    "retailBody": "Trao đổi dòng trà, phân khúc giá và kế hoạch đặt hàng. Thống nhất mẫu, quy cách và lịch cung ứng phù hợp với mạng lưới phân phối.",
    "shopNow": "Trao đổi phân phối",
    "wholesaleTitle": "Doanh nghiệp xuất khẩu lớn",
    "wholesaleBody": "Làm việc trực tiếp về yêu cầu chất lượng, thị trường đích và khối lượng dự kiến. Đối chiếu mẫu cùng các yêu cầu của từng đơn hàng trước khi chốt.",
    "wholesaleNow": "Trao đổi nguồn hàng xuất khẩu",
    "closing": "Cùng xây dựng nguồn cung trà lâu dài.",
    "contact": "Liên hệ hợp tác",
    "capacityTitle": "Năng lực sản xuất. Điều kiện hợp tác rõ ràng.",
    "capabilities": [
      [
        "1.000 tấn/năm",
        "Năng lực sản xuất phục vụ kế hoạch cung ứng quy mô lớn. Khối lượng và lịch giao được xác nhận theo đơn hàng."
      ],
      [
        "Nguyên liệu vùng cao",
        "Trà Tây Bắc, Hà Giang và trà cổ thụ vùng cao — lựa chọn nguồn nguyên liệu theo dòng sản phẩm."
      ],
      [
        "Công nghệ Nhật Bản",
        "Chế biến hấp hơi, kết hợp tinh chỉnh chất lượng theo mẫu và yêu cầu đã thống nhất."
      ],
      [
        "Giá tại xưởng",
        "Trao đổi trực tiếp về chất lượng, quy cách và khối lượng để xây dựng báo giá phù hợp."
      ],
      [
        "Thanh toán linh hoạt",
        "Điều khoản thanh toán được thỏa thuận theo đơn hàng và quá trình hợp tác."
      ],
      [
        "Đồng hành lâu dài",
        "Hỗ trợ đối tác thử mẫu, phản hồi chất lượng và lên kế hoạch cung ứng cho các đơn hàng tiếp theo."
      ]
    ]
  },
  "en": {
    "nav": [
      [
        "Capabilities",
        "#capacity"
      ],
      [
        "Tea range",
        "/catalog"
      ],
      [
        "Partnerships",
        "/wholesale"
      ],
      [
        "Origins",
        "/story"
      ]
    ],
    "book": "Discuss supply",
    "hero": "Vietnamese tea for distribution & export.",
    "heroBody": "Production capacity of 1,000 tonnes per year. Hoàng Long supplies distributors and large-scale exporters directly from the factory, with quality tailored to partner requirements.",
    "sampleCta": "Discuss your supply requirements",
    "trade": "Explore production capabilities",
    "season": "A tea range to build on",
    "seasonBody": "Choose a starting point for sampling. Quality specifications, packing, volume and factory pricing are agreed for each order.",
    "viewTea": "View tea",
    "noTea": "The tea catalogue is being updated.",
    "origin": "From highland tea to lasting partnerships.",
    "originBody": "Raw materials from Northwest Vietnam, Hà Giang and ancient highland tea trees. Japanese technology and steam processing support quality adjustments to agreed partner requirements.",
    "readStory": "Explore our origins",
    "twoWays": "Supply shaped around your market",
    "retailTitle": "Distributors",
    "retailBody": "Discuss tea ranges, price positioning and purchasing plans. Agree on samples, packing and delivery schedules for your distribution network.",
    "shopNow": "Discuss distribution",
    "wholesaleTitle": "Large-scale exporters",
    "wholesaleBody": "Work directly with us on quality requirements, destination markets and planned volumes. Review samples and order-specific requirements before confirming supply.",
    "wholesaleNow": "Discuss export supply",
    "closing": "Build a long-term tea supply partnership.",
    "contact": "Talk to our team",
    "capacityTitle": "Production capacity. Clear partnership terms.",
    "capabilities": [
      [
        "1,000 tonnes/year",
        "Production capacity for large-scale supply planning. Volumes and delivery schedules are confirmed per order."
      ],
      [
        "Highland raw materials",
        "Tea from Northwest Vietnam, Hà Giang and ancient highland trees, selected for each product range."
      ],
      [
        "Japanese technology",
        "Steam processing and quality adjustments against agreed samples and specifications."
      ],
      [
        "Factory-direct pricing",
        "Discuss quality, packing and volume directly to establish a suitable quotation."
      ],
      [
        "Flexible payment",
        "Payment terms agreed according to each order and the partnership."
      ],
      [
        "Long-term support",
        "Support with samples, quality feedback and supply planning for repeat orders."
      ]
    ]
  }
};

const FALLBACK_PHOTOS = ["/landing/1.jpg", "/landing/2.jpg", "/landing/3.jpg"];

export default function HouseHome() {
  const { locale: lang, toggleLocale } = useLocale();
  const [menuOpen, setMenuOpen] = useState(false);
  const [catalog, setCatalog] = useState([]);
  const [catalogState, setCatalogState] = useState("loading");
  const [attempt, setAttempt] = useState(0);
  const [entryHref, setEntryHref] = useState("/wholesale");
  const [home, setHome] = useState(null);
  const supabase = useMemo(() => createClient(), []);
  const t = COPY[lang];

  useEffect(() => {
    let live = true;
    setCatalogState("loading");
    Promise.all([
      supabase.from("catalog_products").select("id,name,notes,photo_url,photo_position,available,kind,line,price").eq("available", true).order("id").limit(6),
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
    setEntryHref(`/wholesale${attribution.size ? `?${attribution}` : ""}`);
    recordPublicConversion(supabase, "home_view", { once: true, placement: "home" }).catch(() => {});
  }, [supabase]);

  const catalogHref = `/catalog${entryHref.includes("?") ? entryHref.slice(entryHref.indexOf("?")) : ""}`;
  const photos = home?.featured_photos?.length ? home.featured_photos : FALLBACK_PHOTOS;
  const teas = catalog.filter((item) => item.kind === "tea" && item.line !== "sample").slice(0, 3);
  const local = (value) => value?.[lang] || value?.en || value?.vi || "";

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/" className={styles.wordmark} aria-label="House of Hoang Long home" translate="no">
          <span className={styles.seal} aria-hidden="true">皇龍</span>
          <span className="notranslate" translate="no">House of Hoang Long</span>
        </Link>

        <nav className={styles.desktopNav} aria-label="Primary navigation">
          {t.nav.map(([label, href]) => <Link key={href} href={href === "/catalog" ? catalogHref : href}>{label}</Link>)}
        </nav>

        <div className={styles.headerActions}>
          <button className={styles.language} onClick={toggleLocale} aria-label={lang === "vi" ? "Chuyển sang tiếng Anh" : "Switch to Vietnamese"}>
            <Globe2 size={15} aria-hidden="true" /> <span>{lang.toUpperCase()}</span>
          </button>
          <Link href="/wholesale" className={styles.book}>{t.book}</Link>
          <button className={styles.menuButton} onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen} aria-controls="mobile-navigation" aria-label={lang === "vi" ? (menuOpen ? "Đóng trình đơn" : "Mở trình đơn") : (menuOpen ? "Close menu" : "Open menu")}>
            {menuOpen ? <X size={21}/> : <Menu size={21}/>} 
          </button>
        </div>
      </header>

      {menuOpen && (
        <nav id="mobile-navigation" className={styles.mobileNav} aria-label="Mobile navigation">
          {t.nav.map(([label, href]) => <Link key={href} href={href === "/catalog" ? catalogHref : href} onClick={() => setMenuOpen(false)}>{label}<ArrowRight size={18}/></Link>)}
          <Link href="/wholesale" onClick={() => setMenuOpen(false)}>{t.book}<ArrowRight size={18}/></Link>
        </nav>
      )}

      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <h1>{t.hero}</h1>
          <p className={styles.heroBody}>{t.heroBody}</p>
          <div className={styles.heroLinks}>
            <Link href={entryHref}>
              {t.sampleCta}<ArrowRight size={16}/>
            </Link>
            <a href="#capacity">{t.trade}</a>
          </div>
          <a href={catalogHref} className={styles.scrollCue} aria-label={lang === "vi" ? "Xem danh mục trà" : "View tea catalogue"}><ArrowDown size={17}/></a>
        </div>
        <figure className={styles.heroImage}>
          <img src="/landing/1.jpg" alt={lang === "vi" ? "Cây trà trong thư viện ảnh Hoàng Long" : "Tea tree from the Hoàng Long archive"} fetchPriority="high" />
          <figcaption>{lang === "vi" ? "Nguồn trà · Nhà Hoàng Long" : "Tea origins · House of Hoang Long"}</figcaption>
        </figure>
      </section>

      <section id="capacity" className={styles.capacity}>
        <h2>{t.capacityTitle}</h2>
        <dl>{t.capabilities.map(([title,body])=><div key={title}><dt>{title}</dt><dd>{body}</dd></div>)}</dl>
      </section>

      <section id="season" className={styles.season}>
        <header className={styles.sectionHead}>
          <h2>{t.season}</h2>
          <p>{t.seasonBody}</p>
        </header>

        <div className={styles.teaIndex}>
          {teas.length ? teas.map((tea, index) => (
            <Link href={`${catalogHref}#${tea.id}`} className={styles.teaRow} key={tea.id}>
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
          <img src={home?.producer_photo || photos[1]} alt={home?.producer_photo ? (home.producer_name || (lang === "vi" ? "Người làm trà Hoàng Long" : "Hoàng Long tea maker")) : (lang === "vi" ? "Ảnh trong thư viện Hoàng Long" : "From the Hoàng Long archive")} loading="lazy" />
          {home?.producer_name && <figcaption>{home.producer_name} · {local(home.producer_role)}</figcaption>}
        </figure>
        <div>
          <h2>{t.origin}</h2>
          <p>{t.originBody}</p>
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
            <Link href="/wholesale">{t.shopNow}<ArrowRight size={16}/></Link>
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
          <Link href="/privacy">{lang === "vi" ? "Quyền riêng tư & cookie" : "Privacy & cookies"}</Link>
        </div>
        <Link href="/cho-quan">{lang === "vi" ? "Trà dành cho quán" : "Tea for cafés"}</Link>
        <PolicyLinks/>
      </footer>
    </main>
  );
}

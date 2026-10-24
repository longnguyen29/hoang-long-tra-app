"use client";
import PolicyLinks from "@/components/PolicyLinks";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowRight, ShoppingBag } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { recordPublicConversion } from "@/lib/public-attribution";
import { useLocale } from "@/components/i18n/LocaleProvider";
import styles from "./HouseHome.module.css";
import PublicSiteHeader from "./PublicSiteHeader";
import { EXPORT_DEVELOPMENT_CONTACT } from "@/lib/export-sales-profiles";
import { PROFILE_LEGAL } from "@/lib/company-profile";
import { CORE_EXPORT_PRODUCTS } from "@/lib/export-product-profile";

const COPY = {
  "vi": {
    "hero": "Trà Việt Nam. Sản phẩm xuất khẩu Hoàng Long.",
    "heroBody": "Hồng Trà Mật, Hồng Trà Khói, Xanh Mộc và Trà Xanh Hoa Ngọc Lan. Bốn dòng trà chủ lực dành cho nhà nhập khẩu, nhà phân phối và doanh nghiệp kinh doanh trà.",
    "profileCta": "Sản phẩm & hồ sơ xuất khẩu",
    "cooperationCta": "Mẫu & báo giá",
    "season": "Bốn dòng trà chủ lực.",
    "seasonBody": "Hai dòng hồng trà, một dòng lục trà Shan và trà xanh hương hoa ngọc lan. Xem hồ sơ từng sản phẩm, quy cách cung ứng và yêu cầu kỹ thuật cho đơn hàng xuất khẩu.",
    "viewTea": "Xem đặc tính sản phẩm",
    "noTea": "Danh mục trà đang được cập nhật.",
    "origin": "Nguồn trà và chế biến tại Hà Giang.",
    "originBody": "Hoàng Long phát triển từ nền tảng gia đình làm trà từ năm 1995. Nhà máy tại Tân Lập, Hà Giang là nơi chế biến và chuẩn bị nguồn hàng cho các đơn hàng thương mại.",
    "originDetail": "Năng lực sản xuất công bố 50–100 tấn/tháng. Danh mục xuất khẩu tập trung bốn dòng trà chủ lực; phẩm cấp, mẫu sản phẩm và lịch cung ứng được lựa chọn theo yêu cầu từng đơn hàng.",
    "readStory": "Xem hồ sơ doanh nghiệp",
    "twoWays": "Từ người thưởng trà đến đối tác thương mại",
    "retailTitle": "Thưởng trà & quà tặng",
    "retailBody": "Khám phá từng loại trà qua hương vị, xuất xứ và quy cách. Cửa hàng dành cho người dùng cá nhân, gia đình và nhu cầu quà tặng, với giá và lựa chọn đặt hàng riêng.",
    "shopNow": "Khám phá cửa hàng trà",
    "wholesaleTitle": "Nhập khẩu & phân phối",
    "wholesaleBody": "Trao đổi trực tiếp về mẫu trà, phẩm cấp, quy cách PP/PE 20–30–35 kg, thông số sản phẩm và lịch hàng. Chào giá theo điều kiện EXW tại nhà máy Tân Lập, Hà Giang.",
    "wholesaleNow": "Yêu cầu mẫu hoặc báo giá",
    "closing": "Hoàng Long · Trà Việt Nam.",
    "contact": "Văn phòng Hoàng Long",
    "capacityTitle": "Thông tin cung ứng.",
    "capabilities": [
      [
        "Danh mục xuất khẩu",
        "Hồng Trà Mật, Hồng Trà Khói, Xanh Mộc và Trà Xanh Hoa Ngọc Lan. Trà khô rời, lựa chọn phẩm cấp theo mẫu chào hàng."
      ],
      [
        "Nhà máy & năng lực",
        "Tân Lập, Hà Giang. Năng lực sản xuất công bố 50–100 tấn/tháng; lịch hàng và sản lượng từng loại được xác nhận theo đơn."
      ],
      [
        "Bao bì lô lớn",
        "Bao PP/PE 20, 30 hoặc 35 kg. Khối lượng mỗi bao có thể điều chỉnh theo ngoại hình trà và nhu cầu sử dụng."
      ],
      [
        "Điều kiện thương mại",
        "EXW tại Nhà máy Trà Hoàng Long. Bao bì, vận tải, chứng từ và kiểm nghiệm được xác nhận trong báo giá theo sản phẩm và thị trường nhập khẩu."
      ]
    ]
  },
  "en": {
    "hero": "Vietnamese tea. Hoàng Long export selection.",
    "heroBody": "Honey-Note Black Tea, Smoky Black Tea, Shan Green Tea — Mộc and Magnolia-Scented Green Tea. Four core selections for importers, distributors and tea businesses.",
    "profileCta": "Export products & company profile",
    "cooperationCta": "Samples & quotations",
    "season": "Four core tea selections.",
    "seasonBody": "Two black teas, one Shan green tea and a magnolia-scented green tea. Explore product profiles, supply formats and technical requirements for export orders.",
    "viewTea": "View product characteristics",
    "noTea": "The tea catalogue is being updated.",
    "origin": "Tea origins and processing in Hà Giang.",
    "originBody": "Hoàng Long builds on family tea-making experience since 1995. Our factory in Tân Lập, Hà Giang processes tea and prepares goods for commercial orders.",
    "originDetail": "Declared production capacity is 50–100 tonnes per month. The export selection centres on four core teas; grades, samples and supply schedules are selected to meet each order’s requirements.",
    "readStory": "Explore our company profile",
    "twoWays": "For tea drinkers and trade partners",
    "retailTitle": "Tea for home & gifting",
    "retailBody": "Discover teas through their flavour, origins and formats. Our retail shop serves individual tea drinkers, families and gifting, with its own prices and ordering options.",
    "shopNow": "Explore the tea shop",
    "wholesaleTitle": "Import & distribution",
    "wholesaleBody": "Discuss samples, grades, 20–30–35 kg PP/PE sacks, product specifications and supply dates. Quotations are on an EXW basis at our factory in Tân Lập, Hà Giang.",
    "wholesaleNow": "Request samples or a quotation",
    "closing": "Hoàng Long · Vietnamese tea.",
    "contact": "Hoàng Long office",
    "capacityTitle": "Supply information.",
    "capabilities": [
      [
        "Export selection",
        "Honey-Note Black Tea, Smoky Black Tea, Shan Green Tea — Mộc and Magnolia-Scented Green Tea. Loose-leaf teas, with grades selected against offered samples."
      ],
      [
        "Factory & capacity",
        "Tân Lập, Hà Giang. Declared production capacity of 50–100 tonnes per month; product volumes and availability are confirmed per order."
      ],
      [
        "Bulk packing",
        "20, 30 or 35 kg PP/PE sacks. Sack weight may be adjusted to leaf form and buyer requirements."
      ],
      [
        "Commercial terms",
        "EXW at Hoàng Long Tea Factory. Packing, freight, documentation and testing are confirmed in the quotation for the selected product and destination market."
      ]
    ]
  }
};

const FALLBACK_PHOTOS = ["/landing/1.jpg", "/landing/2.jpg", "/landing/3.jpg"];

export default function HouseHome() {
  const { locale: lang } = useLocale();
  const [entryHref, setEntryHref] = useState("/wholesale");
  const [home, setHome] = useState(null);
  const supabase = useMemo(() => createClient(), []);
  const t = COPY[lang];

  useEffect(() => {
    let live = true;
    supabase.from("settings_home").select("featured_photos,producer_name,producer_photo,producer_role,producer_quote").eq("id", 1).maybeSingle()
      .then(({ data, error }) => { if (live && !error) setHome(data || null); }).catch(() => {});
    return () => { live = false; };
  }, [supabase]);

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const attribution = new URLSearchParams();
    for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"]) { const value = query.get(key); if(value) attribution.set(key, value.replace(/[^a-zA-Z0-9._-]/g,"-").slice(0,80)); }
    attribution.set("lang", lang);
    setEntryHref(`/wholesale?${attribution}`);
    recordPublicConversion(supabase, "home_view", { once: true, placement: "home" }).catch(() => {});
  }, [supabase, lang]);

  const catalogHref = `/catalog${entryHref.includes("?") ? entryHref.slice(entryHref.indexOf("?")) : ""}`;
  const companyQuery = new URLSearchParams(entryHref.includes("?") ? entryHref.slice(entryHref.indexOf("?") + 1) : "");
  companyQuery.set("lang", lang);
  const companyHref = `/company?${companyQuery}`;
  const photos = home?.featured_photos?.length ? home.featured_photos : FALLBACK_PHOTOS;
  const teas = CORE_EXPORT_PRODUCTS;
  const local = (value) => value?.[lang] || value?.en || value?.vi || "";

  return (
    <main className={styles.page}>
      <PublicSiteHeader/>

      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <h1>{t.hero}</h1>
          <p className={styles.heroBody}>{t.heroBody}</p>
          <div className={styles.heroLinks}>
            <Link href={`${companyHref}#products`}>
              {t.profileCta}<ArrowRight size={16}/>
            </Link>
            <Link href={entryHref}>{t.cooperationCta}</Link>
          </div>
          <a href={catalogHref} className={styles.scrollCue} aria-label={lang === "vi" ? "Xem danh mục trà" : "View tea catalogue"}><ArrowDown size={17}/></a>
        </div>
        <figure className={styles.heroImage}>
          <img src="/landing/1.jpg" alt={lang === "vi" ? "Cây trà trong thư viện ảnh Hoàng Long" : "Tea tree from the Hoàng Long archive"} fetchPriority="high" />
          <figcaption>{lang === "vi" ? "Nguồn trà · Nhà Hoàng Long" : "Tea origins · House of Hoang Long"}</figcaption>
        </figure>
      </section>

      <section id="season" className={styles.season}>
        <header className={styles.sectionHead}>
          <h2>{t.season}</h2>
          <p>{t.seasonBody}</p>
        </header>

        <div className={styles.teaIndex}>
          {teas.map((tea, index) => (
            <Link href={`${companyHref}#product-${tea.id}`} className={styles.teaRow} key={tea.id}>
              <span className={styles.teaNumber}>{String(index + 1).padStart(2, "0")}</span>
              <span className={styles.teaName}>{local(tea.name)}</span>
              <span className={styles.teaNote}>{local(tea.subtitle)}</span>
              <img src={tea.photoUrl} alt="" loading="lazy" style={{objectPosition: tea.photoPosition}} />
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
          ))}
        </div>
      </section>

      <section id="capacity" className={styles.capacity}>
        <h2>{t.capacityTitle}</h2>
        <dl>{t.capabilities.map(([title,body])=><div key={title}><dt>{title}</dt><dd>{body}</dd></div>)}</dl>
      </section>

      <section className={styles.origin}>
        <figure>
          <img src={home?.producer_photo || photos[1]} alt={home?.producer_photo ? (home.producer_name || (lang === "vi" ? "Người làm trà Hoàng Long" : "Hoàng Long tea maker")) : (lang === "vi" ? "Ảnh trong thư viện Hoàng Long" : "From the Hoàng Long archive")} loading="lazy" />
          {home?.producer_name && <figcaption>{home.producer_name} · {local(home.producer_role)}</figcaption>}
        </figure>
        <div>
          <h2>{t.origin}</h2>
          <p>{t.originBody}</p>
          <p>{t.originDetail}</p>
          <Link href={companyHref}>{t.readStory}<ArrowRight size={16}/></Link>
        </div>
      </section>

      <section className={styles.paths}>
        <h2>{t.twoWays}</h2>
        <div className={styles.pathGrid}>
          <article>
            <ShoppingBag size={20} aria-hidden="true" />
            <h3>{t.retailTitle}</h3>
            <p>{t.retailBody}</p>
            <Link href={`/shop?lang=${lang}`}>{t.shopNow}<ArrowRight size={16}/></Link>
          </article>
          <article>
            <span className={styles.tradeMark} aria-hidden="true">kg</span>
            <h3>{t.wholesaleTitle}</h3>
            <p>{t.wholesaleBody}</p>
            <Link href={entryHref}>{t.wholesaleNow}<ArrowRight size={16}/></Link>
          </article>
        </div>
      </section>

      <footer className={styles.footer}>
        <p>{t.closing}</p>
        <div>
          <span>{PROFILE_LEGAL.name}<br/>{lang === "vi" ? "Mã số thuế" : "Tax ID"}: {PROFILE_LEGAL.taxNumber}<br/>Hà Giang / Hà Nội · Việt Nam</span>
          <a href={`tel:${EXPORT_DEVELOPMENT_CONTACT.phone}`}>{EXPORT_DEVELOPMENT_CONTACT.name} · {lang === "vi" ? EXPORT_DEVELOPMENT_CONTACT.role : EXPORT_DEVELOPMENT_CONTACT.roleEn} · {EXPORT_DEVELOPMENT_CONTACT.phoneLabel}</a><a href="https://zalo.me/0903333841" target="_blank" rel="noreferrer">{t.contact} · 0903 333 841</a>
          <Link href="/meet">{lang === "vi" ? "Trang liên hệ" : "Contact card"}</Link>
          <Link href="/privacy">{lang === "vi" ? "Quyền riêng tư & cookie" : "Privacy & cookies"}</Link>
        </div>
        <Link href="/cho-quan">{lang === "vi" ? "Trà dành cho quán" : "Tea for cafés"}</Link>
        <PolicyLinks/>
      </footer>
    </main>
  );
}

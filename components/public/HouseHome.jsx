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

const COPY = {
  "vi": {
    "hero": "Từ vùng trà Việt đến thị trường quốc tế.",
    "heroBody": "Hoàng Long kết nối nguồn trà vùng cao với năng lực chế biến tại Tân Lập, Hà Giang. Cùng đối tác xây dựng chương trình cung ứng cho phân phối và xuất khẩu, từ mẫu trà đến kế hoạch giao hàng.",
    "sampleCta": "Trao đổi kế hoạch hợp tác",
    "trade": "Xem năng lực cung ứng",
    "season": "Danh mục cho từng thị trường",
    "seasonBody": "Bắt đầu bằng dòng trà và mục đích sử dụng. Mẫu đối chiếu, tiêu chuẩn chất lượng, quy cách và kế hoạch mua hàng là cơ sở để xây dựng báo giá.",
    "viewTea": "Xem thông tin trà",
    "noTea": "Danh mục trà đang được cập nhật.",
    "origin": "Nguồn gốc là điểm bắt đầu. Cách hợp tác tạo giá trị lâu dài.",
    "originBody": "Từ nguyên liệu đến chế biến, đóng gói và giao nhận, mỗi chương trình cung ứng cần một yêu cầu rõ ràng. Hoàng Long hướng đến hợp tác trong đó nguồn trà, mẫu đối chiếu và trách nhiệm của các bên được thống nhất trước khi triển khai.",
    "readStory": "Xem hồ sơ & hướng hợp tác",
    "twoWays": "Lựa chọn hình thức làm việc",
    "retailTitle": "Trà cho cá nhân & quà tặng",
    "retailBody": "Xem hương vị, quy cách và giá bán lẻ. Chọn trà cho bàn trà gia đình hoặc nhu cầu quà tặng trong cửa hàng trực tuyến.",
    "shopNow": "Vào cửa hàng trà",
    "wholesaleTitle": "Phân phối & xuất khẩu",
    "wholesaleBody": "Làm việc về thị trường đích, tiêu chuẩn mẫu, kế hoạch mua và điều kiện giao dịch. Tổ chức thử mẫu và thăm nhà máy theo lịch hẹn.",
    "wholesaleNow": "Gửi đề bài hợp tác",
    "closing": "Cùng phát triển đầu ra bền vững cho trà Việt.",
    "contact": "Liên hệ Hoàng Long",
    "capacityTitle": "Nền tảng sản xuất. Kế hoạch cung ứng rõ ràng.",
    "capabilities": [
      [
        "50–100 tấn/tháng",
        "Năng lực sản xuất phục vụ lập kế hoạch. Sản lượng khả dụng, mùa nguyên liệu và lịch giao được xác nhận cho từng chương trình."
      ],
      [
        "Tân Lập, Hà Giang",
        "Nhà máy Trà Hoàng Long là điểm làm việc về sản xuất và nhận hàng EXW. Văn phòng & kho giao dịch đặt tại Sóc Sơn, Hà Nội."
      ],
      [
        "Mẫu làm cơ sở",
        "Thống nhất dòng trà, cấp chất lượng và mẫu đối chiếu trước khi xác nhận sản xuất hoặc giao hàng."
      ],
      [
        "Quy cách cho đơn lớn",
        "Bao PP/PE 20, 30 hoặc 35 kg; điều chỉnh theo ngoại hình trà và yêu cầu sử dụng. Quy cách được chốt trong báo giá."
      ],
      [
        "EXW tại nhà máy",
        "Phân định rõ giá hàng, bao bì, vận chuyển và hồ sơ cần thiết. Điều kiện thanh toán và trách nhiệm mỗi bên được xác nhận trong hợp đồng."
      ],
      [
        "Hợp tác theo chương trình",
        "Trao đổi kế hoạch mua, yêu cầu thị trường và các đợt giao để kết nối sản xuất với nhu cầu đầu ra dài hạn."
      ]
    ]
  },
  "en": {
    "hero": "From Vietnamese tea origins to international markets.",
    "heroBody": "Hoàng Long brings highland tea sourcing together with processing in Tân Lập, Hà Giang. We work with partners on distribution and export supply programmes, from the reference sample to delivery planning.",
    "sampleCta": "Discuss a supply programme",
    "trade": "Explore supply capabilities",
    "season": "A range for different markets",
    "seasonBody": "Start with the tea and its intended application. Reference samples, specifications, packing and purchasing plans form the basis of a quotation.",
    "viewTea": "View tea details",
    "noTea": "The tea catalogue is being updated.",
    "origin": "Origin sets the foundation. Cooperation builds lasting value.",
    "originBody": "From raw material to processing, packing and handover, each supply programme needs a clear brief. Our approach is to agree on tea origin, reference samples and each party’s responsibilities before proceeding.",
    "readStory": "View profile & cooperation areas",
    "twoWays": "Choose how to work with us",
    "retailTitle": "Tea for home & gifting",
    "retailBody": "Explore tasting notes, pack sizes and retail prices. Choose tea for your own tea table or gifting through our online shop.",
    "shopNow": "Visit the tea shop",
    "wholesaleTitle": "Distribution & export",
    "wholesaleBody": "Discuss destination markets, reference specifications, purchasing plans and commercial terms. Arrange sampling and a factory visit by appointment.",
    "wholesaleNow": "Send a cooperation brief",
    "closing": "Develop lasting market opportunities for Vietnamese tea.",
    "contact": "Contact Hoàng Long",
    "capacityTitle": "A production base. A clear supply plan.",
    "capabilities": [
      [
        "50–100 tonnes/month",
        "Production capacity for planning. Available volumes, raw-material seasonality and delivery schedules are confirmed for each programme."
      ],
      [
        "Tân Lập, Hà Giang",
        "Hoàng Long Tea Factory is the production base and EXW collection point. Our commercial office & warehouse are in Sóc Sơn, Hanoi."
      ],
      [
        "Sample-led specification",
        "Agree on the tea, grade and reference sample before confirming production or handover."
      ],
      [
        "Bulk packing",
        "20, 30 or 35 kg PP/PE bags, adjusted to leaf form and intended use. Final packing is confirmed in the quotation."
      ],
      [
        "EXW at the factory",
        "Identify product, packing, transport and document requirements. Payment terms and the parties’ responsibilities are confirmed in the contract."
      ],
      [
        "Programme-based cooperation",
        "Align purchasing plans, market requirements and delivery phases to connect production with sustained demand."
      ]
    ]
  }
};

const FALLBACK_PHOTOS = ["/landing/1.jpg", "/landing/2.jpg", "/landing/3.jpg"];

export default function HouseHome() {
  const { locale: lang } = useLocale();
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
      <PublicSiteHeader/>

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
          <Link href={`/company?lang=${lang}#cooperation`}>{t.readStory}<ArrowRight size={16}/></Link>
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
          <span>House of Hoang Long · Hà Giang / Hà Nội</span>
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

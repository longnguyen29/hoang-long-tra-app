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

const COPY = {
  "vi": {
    "hero": "Nguồn trà Việt cho chuỗi cung ứng quốc tế.",
    "heroBody": "Hoàng Long phát triển sản phẩm trà từ nguyên liệu vùng cao và nền tảng chế biến tại Tân Lập, Hà Giang. Chúng tôi kết nối đặc tính của nguồn trà với yêu cầu của nhà nhập khẩu, nhà phân phối và doanh nghiệp đồ uống — để đi từ một mẫu trà phù hợp đến chương trình cung ứng có thể triển khai.",
    "sampleCta": "Trao đổi hợp tác",
    "trade": "Tìm hiểu năng lực sản xuất",
    "season": "Một nguồn trà. Nhiều hướng phát triển sản phẩm.",
    "seasonBody": "Trà nền cho đồ uống cần hiệu quả chiết xuất và chi phí sử dụng phù hợp. Trà nguyên lá và dòng đặc sản cần bản sắc hương vị, câu chuyện xuất xứ và cấp chất lượng rõ ràng. Danh mục Hoàng Long mở ra các hướng lựa chọn để đối tác thử mẫu theo chính thị trường của mình.",
    "viewTea": "Xem đặc tính sản phẩm",
    "noTea": "Danh mục trà đang được cập nhật.",
    "origin": "Giá trị của vùng trà cần được tiếp nối ở thị trường.",
    "originBody": "Kinh nghiệm làm trà của gia đình từ năm 1995 là nền tảng để Hoàng Long hiểu nguyên liệu, mùa vụ và chuyển biến của lá qua chế biến. Tại Hà Giang, câu chuyện ấy tiếp tục bằng công việc lựa chọn dòng trà, phát triển mẫu và chuẩn bị sản phẩm cho những cách sử dụng khác nhau.",
    "originDetail": "Định hướng của Hoàng Long là kết nối chặt hơn giữa vùng nguyên liệu, nhà máy và đối tác thương mại. Khi nhu cầu thị trường được chuyển thành một đề bài sản phẩm rõ ràng, các bên có cơ sở để cùng cải thiện chất lượng, kế hoạch mua và giá trị của trà Việt qua từng đợt hợp tác.",
    "readStory": "Đọc định hướng & hồ sơ doanh nghiệp",
    "twoWays": "Từ người thưởng trà đến đối tác thương mại",
    "retailTitle": "Thưởng trà & quà tặng",
    "retailBody": "Khám phá từng loại trà qua hương vị, xuất xứ và quy cách. Cửa hàng dành cho người dùng cá nhân, gia đình và nhu cầu quà tặng, với giá và lựa chọn đặt hàng riêng.",
    "shopNow": "Khám phá cửa hàng trà",
    "wholesaleTitle": "Nguồn cung & phát triển thị trường",
    "wholesaleBody": "Dành cho nhà nhập khẩu, phân phối và doanh nghiệp đồ uống. Làm việc trực tiếp về danh mục, thử mẫu, quy cách lô lớn và kế hoạch giao dịch; có thể sắp xếp khảo sát nhà máy và trao đổi hồ sơ theo phạm vi hợp tác.",
    "wholesaleNow": "Làm việc với Hoàng Long",
    "closing": "Phát triển thị trường từ giá trị thật của trà Việt.",
    "contact": "Văn phòng Hoàng Long",
    "capacityTitle": "Từ nguồn nguyên liệu đến một đề bài thương mại hoàn chỉnh.",
    "capabilities": [
      [
        "Nguồn trà vùng cao",
        "Nguyên liệu từ Hà Giang và Tây Bắc tạo nền tảng cho các dòng Shan, trà xanh, hồng trà và trà hương. Mỗi lựa chọn thương mại cần gắn với nguồn thực tế, mùa vụ và cấp chất lượng của sản phẩm."
      ],
      [
        "Chế biến tại Hà Giang",
        "Nhà máy Trà Hoàng Long tại Tân Lập là điểm kết nối nguyên liệu với chế biến, hoàn thiện và chuẩn bị hàng. Năng lực sản xuất 50–100 tấn/tháng là cơ sở lập kế hoạch theo từng dòng trà và thời điểm."
      ],
      [
        "Danh mục theo ứng dụng",
        "Từ trà nền F&B đến trà nguyên lá cho phân phối và dòng đặc sản cho thưởng trà. Việc chọn mẫu dựa trên hương vị, cách dùng, hiệu quả pha và phân khúc giá — không chỉ tên gọi của trà."
      ],
      [
        "Mẫu & tiêu chuẩn sản phẩm",
        "Mẫu đối chiếu là điểm bắt đầu để xác định ngoại hình, cảm quan và cách đánh giá sản phẩm. Yêu cầu về chỉ tiêu kiểm nghiệm, bao bì và thị trường được làm rõ trước khi chốt đơn."
      ],
      [
        "Tổ chức đơn hàng lớn",
        "Bao PP/PE 20, 30 hoặc 35 kg, điều chỉnh theo ngoại hình trà và mục đích sử dụng. Giá EXW tại nhà máy; số lượng, lịch hàng và phân công giao nhận được thể hiện trong báo giá và hợp đồng."
      ],
      [
        "Hợp tác phát triển đầu ra",
        "Tiếp nhận đề bài từ nhà nhập khẩu, doanh nghiệp phân phối và tổ chức xúc tiến thương mại. Bắt đầu bằng danh mục phù hợp, thử nghiệm quy mô nhỏ và đánh giá điều kiện để xây dựng kế hoạch mua tiếp theo."
      ]
    ]
  },
  "en": {
    "hero": "Vietnamese tea for international supply chains.",
    "heroBody": "Hoàng Long develops tea products from highland raw materials and a processing base in Tân Lập, Hà Giang. We connect the character of Vietnamese tea with the requirements of importers, distributors and beverage businesses, turning product evaluation into a practical supply programme.",
    "sampleCta": "Discuss cooperation",
    "trade": "Explore our production base",
    "season": "One tea origin. Different product opportunities.",
    "seasonBody": "Beverage teas need suitable extraction performance and cost in use. Loose-leaf and speciality ranges need a distinctive flavour, a clear origin story and the right grade. Our catalogue provides starting points for partners to test against their own market and application.",
    "viewTea": "View product characteristics",
    "noTea": "The tea catalogue is being updated.",
    "origin": "The value of a tea origin develops through its market.",
    "originBody": "The family’s tea-making experience since 1995 underpins our understanding of raw materials, seasons and how processing changes the leaf. In Hà Giang, that experience informs tea selection, sample development and preparation for different uses.",
    "originDetail": "Hoàng Long’s direction is to strengthen the connection between raw-material origins, the factory and commercial partners. Translating market demand into a clear product brief gives each party a basis for improving quality, purchasing plans and the value of Vietnamese tea over successive supply cycles.",
    "readStory": "Explore our direction & company profile",
    "twoWays": "For tea drinkers and trade partners",
    "retailTitle": "Tea for home & gifting",
    "retailBody": "Discover teas through their flavour, origins and formats. Our retail shop serves individual tea drinkers, families and gifting, with its own prices and ordering options.",
    "shopNow": "Explore the tea shop",
    "wholesaleTitle": "Supply & market development",
    "wholesaleBody": "For importers, distributors and beverage businesses. Discuss the range, sampling, bulk packing and your supply plan directly with Hoàng Long. Factory assessments and document reviews can be arranged to suit the cooperation brief.",
    "wholesaleNow": "Work with Hoàng Long",
    "closing": "Build market opportunities on the real value of Vietnamese tea.",
    "contact": "Hoàng Long office",
    "capacityTitle": "From a tea origin to a commercial product brief.",
    "capabilities": [
      [
        "Highland tea origins",
        "Raw materials from Hà Giang and Northwest Vietnam underpin our Shan, green, black and scented tea ranges. Commercial selection takes account of each product’s actual origin, season and grade."
      ],
      [
        "Processing in Hà Giang",
        "Hoàng Long Tea Factory in Tân Lập connects raw material with processing, finishing and order preparation. Production capacity of 50–100 tonnes per month supports planning by product and season."
      ],
      [
        "A range defined by use",
        "From beverage bases to loose-leaf distribution and speciality tea. Selection considers flavour, application, brewing performance and price positioning, alongside the tea’s name."
      ],
      [
        "Samples & specifications",
        "Reference samples establish the starting point for leaf appearance, sensory characteristics and product evaluation. Testing, packing and market requirements are clarified before order confirmation."
      ],
      [
        "Bulk-order preparation",
        "20, 30 or 35 kg PP/PE bags, adjusted to leaf form and application. EXW pricing at the factory; quantities, schedules and handover responsibilities are recorded in the quotation and contract."
      ],
      [
        "Market-development cooperation",
        "We welcome briefs from importers, distributors and trade-facilitation organisations. Begin with a relevant product range, a small-scale trial and an assessment of the conditions needed for subsequent purchasing."
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
          <p>{t.originDetail}</p>
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

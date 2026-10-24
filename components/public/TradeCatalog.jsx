"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronDown, Download, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { isTradeTea, matchesTradeSearch, TRADE_CATALOG_FIELDS, tradeEnquiryHref } from "@/lib/trade-catalog";
import { tradeProductFacts } from "@/lib/trade-product-details";
import { PROFILE_LEGAL } from "@/lib/company-profile";
import { PACK_DOCUMENTS } from "@/lib/institutional-pack";
import { B2B_BULK_PACKING } from "@/lib/b2b-packing";
import { CORE_EXPORT_PRODUCTS, EXPORT_PRODUCT_COPY } from "@/lib/export-product-profile";
import PolicyLinks from "@/components/PolicyLinks";
import styles from "./TradeCatalog.module.css";
import PublicSiteHeader from "./PublicSiteHeader";

function ProductPhoto({ product, facts, vi }) {
  const [failed, setFailed] = useState(false);
  return <div className={styles.photo}>
    {product.photo_url && !failed
      ? <img src={product.photo_url} alt={facts.name} loading="lazy" onError={() => setFailed(true)} style={{ objectPosition: product.photo_position || "center" }}/>
      : <div className={styles.teaSheet}>
        <span>{facts.groupLabel}</span>
        <strong>{facts.name}</strong>
        <div><span>Hoàng Long</span><small>{failed ? (vi ? "Ảnh sản phẩm chưa tải được" : "Product photo unavailable") : (vi ? "Ảnh sản phẩm chưa được đăng" : "Product photo not yet published")}</small></div>
      </div>}
  </div>;
}

export default function TradeCatalog() {
  const { locale } = useLocale();
  const vi = locale === "vi";
  const bulkPacking = B2B_BULK_PACKING[vi ? "vi" : "en"];
  const exportCopy = EXPORT_PRODUCT_COPY[vi ? "vi" : "en"];
  const [products, setProducts] = useState([]);
  const [status, setStatus] = useState("loading");
  const [attempt, setAttempt] = useState(0);
  const [enquirySearch, setEnquirySearch] = useState("");
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState("all");
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    let live = true;
    setEnquirySearch(window.location.search);
    setStatus("loading");
    supabase.from("catalog_products").select(TRADE_CATALOG_FIELDS).eq("available", true).order("id")
      .then(({ data, error }) => {
        if (!live) return;
        setStatus(error ? "error" : "ready");
        if (!error) setProducts((data || []).filter(isTradeTea));
      }).catch(() => { if (live) setStatus("error"); });
    return () => { live = false; };
  }, [supabase, attempt]);

  useEffect(() => {
    if (status !== "ready") return;
    let id;
    try { id = decodeURIComponent(window.location.hash.slice(1)); } catch { return; }
    if (products.some(product => product.id === id)) document.getElementById(id)?.scrollIntoView({ block: "start" });
  }, [products, status]);

  const teas = useMemo(() => products.map(product => ({ product, facts: tradeProductFacts(product, locale) })), [products, locale]);
  const groups = useMemo(() => {
    const entries = new Map();
    for (const { facts } of teas) {
      const current = entries.get(facts.groupId);
      entries.set(facts.groupId, { id: facts.groupId, label: facts.groupLabel, count: (current?.count || 0) + 1 });
    }
    return [...entries.values()];
  }, [teas]);
  const filtered = useMemo(() => teas.filter(({ product, facts }) => (group === "all" || facts.groupId === group) && matchesTradeSearch(product, query, [facts.name, facts.groupLabel])), [teas, group, query]);
  const resetFilters = () => { setQuery(""); setGroup("all"); };

  return <main className={styles.page} data-no-translate>
    <PublicSiteHeader/>

    <section className={styles.intro}>
      <div><p className={styles.eyebrow}>{vi ? "Trà Hoàng Long · Danh mục xuất khẩu & B2B" : "Hoàng Long Tea · Export & B2B selection"}</p><h1>{vi ? "Danh mục trà xuất khẩu" : "Export tea selection"}</h1></div>
      <div className={styles.introCopy}><p>{vi ? "Hồng Trà Mật · Hồng Trà Khói · Xanh Mộc · Hoa Ngọc Lan." : "Honey-Note Black · Smoky Black · Shan Green — Mộc · Magnolia Green."}</p><p>{vi ? "Bốn dòng trà chủ lực dành cho nhập khẩu và phân phối. Hồ sơ sản phẩm trình bày nhóm trà, đặc trưng hương, dạng cung ứng và yêu cầu kỹ thuật. Danh mục mở rộng nằm bên dưới để lựa chọn thêm sản phẩm." : "Four core teas for import and distribution. Product profiles cover tea category, aromatic identity, supply format and technical requirements. Explore the wider range below for additional selections."}</p><span>{vi ? "Hồ sơ sản phẩm · Mẫu chào hàng · Báo giá EXW" : "Product profiles · Offered samples · EXW quotations"}</span></div>
    </section>

    <section className={styles.coreRange} aria-labelledby="core-export-title">
      <header><h2 id="core-export-title">{exportCopy.title}</h2><Link href={`/company?lang=${locale}#products`}>{vi ? "Xem hồ sơ sản phẩm" : "View product profiles"}<ArrowRight size={16}/></Link></header>
      <div className={styles.coreGrid}>{CORE_EXPORT_PRODUCTS.map(profile => {
        const availableProduct = products.find(product => product.id === profile.catalogId);
        return <article key={profile.id}>
          <Link href={`/company?lang=${locale}#product-${profile.id}`} className={styles.corePhoto}><img src={profile.photoUrl} alt={profile.name[locale]} loading="lazy" style={{objectPosition: profile.photoPosition}}/></Link>
          <div className={styles.coreInfo}><p>{profile.category[locale]}</p><h3>{profile.name[locale]}</h3><span>{profile.subtitle[locale]}</span>
            <dl><div><dt>{exportCopy.labels.form}</dt><dd>{profile.form[locale]}</dd></div>{profile.aroma && <div><dt>{exportCopy.labels.aroma}</dt><dd>{profile.aroma[locale]}</dd></div>}{profile.taste && <div><dt>{exportCopy.labels.taste}</dt><dd>{profile.taste[locale]}</dd></div>}</dl>
            {availableProduct && <div className={styles.coreActions}><Link href={tradeEnquiryHref(profile.catalogId, "sample", enquirySearch, locale)}>{exportCopy.sample}</Link><Link href={tradeEnquiryHref(profile.catalogId, "quote", enquirySearch, locale)}>{exportCopy.quote}<ArrowRight size={16}/></Link></div>}
          </div>
        </article>;
      })}</div>
    </section>

    <section className={styles.resources} aria-label={vi ? "Hồ sơ & tài liệu" : "Profile & documents"}>
      <div><strong>{vi ? "Hồ sơ sản phẩm & doanh nghiệp" : "Product & company profiles"}</strong><p>{vi ? "Tải hồ sơ bốn sản phẩm xuất khẩu chủ lực và hồ sơ doanh nghiệp. Gửi yêu cầu về thông số kỹ thuật, kiểm nghiệm và chứng từ nhập khẩu cùng đề nghị mẫu hoặc báo giá." : "Download profiles of the four core export teas and the company. Include specifications, testing or destination-market document requirements with your sample and quotation enquiry."}</p></div>
      <div className={styles.resourceLinks}>
        <Link href={`/company?lang=${locale}`}>{vi ? "Hồ sơ doanh nghiệp trên website" : "Company profile online"}<ArrowRight size={16} aria-hidden="true"/></Link>
        <a href={PACK_DOCUMENTS[locale].brief} download><Download size={16} aria-hidden="true"/>{vi ? "Giới thiệu chào hàng · PDF" : "Export sales brief · PDF"}</a>
        <a href={PACK_DOCUMENTS[locale].profile} download><Download size={16} aria-hidden="true"/>{vi ? "Hồ sơ doanh nghiệp · PDF" : "Company profile · PDF"}</a>
        <a href={PACK_DOCUMENTS[locale].appendix} download><Download size={16} aria-hidden="true"/>{vi ? "Hồ sơ sản phẩm xuất khẩu · PDF" : "Export product profiles · PDF"}</a>
      </div>
    </section>

    <section className={styles.catalogue} aria-labelledby="trade-range-title">
      <div className={styles.rangeHeading}><h2 id="trade-range-title">{vi ? "Danh mục mở rộng" : "Explore the wider range"}</h2><span>{vi ? "Đặc tính theo danh mục hiện tại" : "Characteristics from the current catalogue"}</span></div>
      <p className={styles.note}><strong>{bulkPacking.title}: </strong>{bulkPacking.text}</p>
      <p className={styles.note}>{vi ? "Danh mục hiện hành có thêm các dòng trà ngoài bốn sản phẩm chủ lực. Giá, phẩm cấp, MOQ, lịch hàng và hồ sơ kỹ thuật được chào theo yêu cầu đơn hàng." : "The current catalogue includes additional teas beyond the four core selections. Prices, grades, MOQ, supply dates and technical documentation are quoted for each order."}</p>
      <div className={styles.toolbar}>
        <div className={styles.filters} role="group" aria-label={vi ? "Lọc nhóm trà" : "Filter tea groups"}>
          <button type="button" aria-pressed={group === "all"} onClick={() => setGroup("all")}>{vi ? "Tất cả" : "All teas"}{status === "ready" && <span>{teas.length}</span>}</button>
          {groups.map(entry => <button type="button" key={entry.id} aria-pressed={group === entry.id} onClick={() => setGroup(entry.id)}>{entry.label}<span>{entry.count}</span></button>)}
        </div>
        <label className={styles.search}><Search size={18} aria-hidden="true"/><span className={styles.srOnly}>{vi ? "Tìm trà theo tên hoặc đặc tính" : "Search teas by name or characteristics"}</span><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder={vi ? "Tìm tên trà, hương vị…" : "Search teas, tasting notes…"}/></label>
      </div>
      {status === "ready" && <div className={styles.resultCount}><p role="status">{vi ? `${filtered.length} / ${teas.length} dòng trà` : `${filtered.length} of ${teas.length} teas`}</p>{(query || group !== "all") && <button type="button" onClick={resetFilters}>{vi ? "Xóa bộ lọc" : "Clear filters"}</button>}</div>}

      <div className={styles.products} aria-busy={status === "loading"}>
        {status === "loading" && <div className={styles.state} role="status"><p>{vi ? "Đang tải danh mục trà…" : "Loading teas…"}</p></div>}
        {status === "error" && <div className={styles.state} role="alert"><h3>{vi ? "Chưa tải được danh mục" : "The catalogue could not load"}</h3><p>{vi ? "Vui lòng thử lại để xem các dòng trà hiện có." : "Please try again to see the current tea range."}</p><button type="button" onClick={() => setAttempt(value => value + 1)}>{vi ? "Thử lại" : "Retry"}</button></div>}
        {status === "ready" && !teas.length && <div className={styles.state}><h3>{vi ? "Danh mục đang được cập nhật" : "The catalogue is being updated"}</h3><p>{vi ? "Bạn vẫn có thể gửi nhu cầu về trà và kế hoạch cung ứng." : "You can still send your tea requirements and supply plans."}</p><Link href={tradeEnquiryHref(null, "quote", enquirySearch, locale)}>{vi ? "Trao đổi nhu cầu" : "Discuss your brief"}<ArrowRight size={17} aria-hidden="true"/></Link></div>}
        {status === "ready" && !!teas.length && !filtered.length && <div className={styles.state}><h3>{vi ? "Chưa tìm thấy dòng trà phù hợp" : "No teas match your search"}</h3><p>{vi ? "Thử tên trà hoặc hương vị khác, hoặc xem lại toàn bộ danh mục." : "Try another tea name or tasting note, or explore the full catalogue."}</p><button type="button" onClick={resetFilters}>{vi ? "Xem tất cả dòng trà" : "View all teas"}</button></div>}

        {status === "ready" && filtered.map(({ product, facts }) => <article key={product.id} id={product.id} aria-labelledby={`tea-name-${product.id}`}>
          <ProductPhoto key={product.photo_url || product.id} product={product} facts={facts} vi={vi}/>
          <div className={styles.productInfo}>
            <p className={styles.groupLabel}>{facts.groupLabel}</p>
            <h3 id={`tea-name-${product.id}`}>{facts.name}</h3>
            {facts.note && <p className={styles.note}>{facts.note}</p>}
            {!!facts.flavors.length && <ul className={styles.flavors} aria-label={vi ? "Hương vị đang công bố" : "Listed tasting notes"}>{facts.flavors.map((flavor, index) => <li key={`${flavor}-${index}`}>{flavor}</li>)}</ul>}
            <div className={styles.packing}><span>{vi ? "Quy cách cung ứng" : "Supply format"}</span><strong>{facts.groupId === "pressed" ? (facts.packing || (vi ? "Bánh / viên theo sản phẩm" : "Cakes / pieces by product")) : bulkPacking.value}</strong><p>{facts.groupId === "pressed" ? (vi ? "Khối lượng mỗi bánh/viên và số đơn vị xác nhận theo sản phẩm." : "Weight per cake/piece and unit quantities are confirmed per product.") : (vi ? "Bao PP/PE, khối lượng tịnh và nhãn theo đơn hàng; tách biệt quy cách bán lẻ." : "PP/PE sacks, net weight and labels agreed per order; separate from retail formats.")}</p></div>

            <details className={styles.more}>
              <summary>{vi ? "Thông số & điều kiện mua hàng" : "Specifications & purchasing terms"}<ChevronDown size={18} aria-hidden="true"/></summary>
              <div className={styles.expanded}>
                <div><h4>{vi ? "Hồ sơ sản phẩm" : "Product documentation"}</h4><p>{vi ? "Phẩm cấp, ngoại hình và tiêu chí cảm quan theo mẫu chào hàng. Yêu cầu kỹ thuật và kiểm nghiệm được xác lập cho sản phẩm và thị trường nhập khẩu." : "Grade, leaf appearance and sensory criteria follow the offered sample. Technical and testing requirements are established for the selected product and destination market."}</p></div>
                <div><h4>{vi ? "Điều kiện thương mại" : "Commercial terms"}</h4><p>{vi ? "MOQ, giá EXW, thời gian hàng sẵn, hạn sử dụng, thanh toán và chứng từ được ghi trong báo giá/hợp đồng. Hồ sơ kiểm nghiệm hoặc chứng nhận được cung cấp theo phạm vi áp dụng của sản phẩm/lô hàng." : "MOQ, EXW prices, goods-readiness dates, shelf life, payment and documents are recorded in the quotation/contract. Testing or certification documents are supplied within their applicable product/lot scope."}</p></div>
              </div>
            </details>
            <div className={styles.actions}><Link href={tradeEnquiryHref(product.id, "sample", enquirySearch, locale)}>{vi ? "Trao đổi mẫu trà" : "Enquire about samples"}</Link><Link href={tradeEnquiryHref(product.id, "quote", enquirySearch, locale)}>{vi ? "Yêu cầu báo giá" : "Request a quote"}<ArrowRight size={17} aria-hidden="true"/></Link></div>
          </div>
        </article>)}
      </div>
    </section>

    <footer className={styles.footer}><Link href={`/company?lang=${locale}`}>{vi ? "Hồ sơ công ty" : "Company profile"}</Link><Link href={`/company?lang=${locale}#contact`}>{vi ? "Đầu mối phát triển xuất khẩu" : "Export development contact"}</Link><Link href="/cho-quan">{vi ? "Trà dành cho quán" : "Tea for cafés"}</Link><Link href="/shop">{vi ? "Mua trà dùng tại nhà" : "Shop tea for home"}</Link><span>{PROFILE_LEGAL.name} · {vi ? "MST" : "Tax ID"} {PROFILE_LEGAL.taxNumber}</span><PolicyLinks/></footer>
  </main>;
}

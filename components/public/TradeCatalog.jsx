"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronDown, Download, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { isTradeTea, matchesTradeSearch, TRADE_CATALOG_FIELDS, tradeEnquiryHref } from "@/lib/trade-catalog";
import { tradeProductFacts } from "@/lib/trade-product-details";
import { PROFILE_PDF } from "@/lib/company-profile";
import { B2B_BULK_PACKING } from "@/lib/b2b-packing";
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
      <div><p className={styles.eyebrow}>{vi ? "Nguồn cung · Đặc tính · Điều kiện giao dịch" : "Supply · Specifications · Commercial terms"}</p><h1>{vi ? "Danh mục trà thương mại" : "Trade tea catalogue"}</h1></div>
      <div className={styles.introCopy}><p>{vi ? "Cơ sở lựa chọn sản phẩm cho phân phối và xuất khẩu." : "A basis for product selection in distribution and export."}</p><p>{vi ? "Đối chiếu dòng trà với ứng dụng, phân khúc giá và yêu cầu thị trường. Sau bước thử mẫu, hai bên thống nhất tiêu chuẩn, khối lượng, quy cách và báo giá EXW tại Nhà máy Trà Hoàng Long, Tân Lập, Hà Giang." : "Match the tea to its application, price positioning and market requirements. After sampling, agree on specifications, volume, packing and an EXW quotation at Hoàng Long Tea Factory, Tân Lập, Hà Giang."}</p><span>{vi ? "Chọn sản phẩm · Đối chiếu mẫu · Thống nhất chương trình cung ứng" : "Select products · Review samples · Agree on supply"}</span></div>
    </section>

    <section className={styles.resources} aria-label={vi ? "Hồ sơ & tài liệu" : "Profile & documents"}>
      <div><strong>{vi ? "Hồ sơ năng lực & hợp tác" : "Capabilities & cooperation"}</strong><p>{vi ? "Tổng quan nguồn nguyên liệu, năng lực sản xuất và cách làm việc để chuẩn bị cuộc trao đổi với doanh nghiệp, nhà nhập khẩu hoặc tổ chức kết nối thương mại." : "Review tea sourcing, production capacity and our working process to prepare discussions with businesses, importers or trade-facilitation organisations."}</p></div>
      <div className={styles.resourceLinks}>
        <Link href={`/company?lang=${locale}`}>{vi ? "Xem hồ sơ năng lực" : "View company profile"}<ArrowRight size={16} aria-hidden="true"/></Link>
        <Link href={`/company?lang=${locale}#cooperation`}>{vi ? "Trao đổi chương trình hợp tác" : "Discuss a cooperation programme"}<ArrowRight size={16} aria-hidden="true"/></Link>
        <a href={PROFILE_PDF.vi} download><Download size={16} aria-hidden="true"/>PDF · Tiếng Việt</a>
        <a href={PROFILE_PDF.en} download><Download size={16} aria-hidden="true"/>PDF · English</a>
      </div>
    </section>

    <section className={styles.catalogue} aria-labelledby="trade-range-title">
      <div className={styles.rangeHeading}><h2 id="trade-range-title">{vi ? "Chọn dòng trà" : "Explore the range"}</h2><span>{vi ? "Đặc tính theo danh mục hiện tại" : "Characteristics from the current catalogue"}</span></div>
      <p className={styles.note}><strong>{bulkPacking.title}: </strong>{bulkPacking.text}</p>
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
            {facts.summary && <p className={styles.summary}><span>{vi ? "Khi thử mẫu" : "When sampling"}</span>{facts.summary}</p>}
            {facts.note && <p className={styles.note}>{facts.note}</p>}
            {!!facts.flavors.length && <ul className={styles.flavors} aria-label={vi ? "Hương vị đang công bố" : "Listed tasting notes"}>{facts.flavors.map((flavor, index) => <li key={`${flavor}-${index}`}>{flavor}</li>)}</ul>}
            <div className={styles.packing}><span>{vi ? "Quy cách sản phẩm / mẫu" : "Product / sample format"}</span><strong>{facts.packing || (vi ? "Trao đổi theo nhu cầu" : "Discuss your requirements")}</strong><p>{vi ? "Quy cách trên để tham khảo sản phẩm / mẫu, không phải quy cách bao xuất khẩu. MOQ và bao PP/PE cho đơn lớn được xác nhận trong báo giá." : "The format above describes the product / sample, not export bag sizes. MOQ and bulk PP/PE packing are confirmed in your quotation."}</p></div>

            <details className={styles.more}>
              <summary>{vi ? "Thử mẫu & điều kiện cung ứng" : "Sampling & supply requirements"}<ChevronDown size={18} aria-hidden="true"/></summary>
              <div className={styles.expanded}>
                <div><h4>{vi ? "Điểm bắt đầu thử mẫu" : "A starting point for sampling"}</h4>{facts.brew ? <><p className={styles.brew}>{facts.brew}</p><p className={styles.context}>{vi ? "Dùng gợi ý pha hiện có để bắt đầu thử mẫu, rồi hiệu chỉnh theo cách dùng của bạn. Công thức sản xuất sẽ được thống nhất riêng." : "Use the listed brew guidance to begin sampling, then adjust it for your application. A production recipe is agreed separately."}</p></> : <p>{vi ? "Cho biết cách dùng và điều kiện pha dự kiến để cùng trao đổi hướng thử mẫu." : "Share your intended application and brewing conditions to discuss how to trial the sample."}</p>}</div>
                <div><h4>{vi ? "Xác nhận trong báo giá" : "Confirmed in your quotation"}</h4><p>{vi ? "Cấp chất lượng, MOQ, lịch cung ứng, hạn sử dụng, điều kiện thanh toán và trách nhiệm giao nhận được chốt theo mẫu và yêu cầu. Hồ sơ kiểm nghiệm, chứng nhận hoặc yêu cầu nhập khẩu cụ thể cần được rà soát trước khi cam kết." : "Grade, MOQ, schedules, shelf life, payment and handover responsibilities are agreed against the sample and brief. Specific testing, certification or import-document requirements must be reviewed before commitment."}</p></div>
              </div>
            </details>
            <div className={styles.actions}><Link href={tradeEnquiryHref(product.id, "sample", enquirySearch, locale)}>{vi ? "Trao đổi mẫu trà" : "Enquire about samples"}</Link><Link href={tradeEnquiryHref(product.id, "quote", enquirySearch, locale)}>{vi ? "Yêu cầu báo giá" : "Request a quote"}<ArrowRight size={17} aria-hidden="true"/></Link></div>
          </div>
        </article>)}
      </div>
    </section>

    <footer className={styles.footer}><Link href={`/company?lang=${locale}`}>{vi ? "Hồ sơ công ty" : "Company profile"}</Link><Link href={`/company?lang=${locale}#contact`}>{vi ? "Đầu mối phát triển xuất khẩu" : "Export development contact"}</Link><Link href="/cho-quan">{vi ? "Trà dành cho quán" : "Tea for cafés"}</Link><Link href="/shop">{vi ? "Mua trà dùng tại nhà" : "Shop tea for home"}</Link><PolicyLinks/></footer>
  </main>;
}

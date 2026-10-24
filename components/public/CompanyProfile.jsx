"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Download, MapPin, Phone } from "lucide-react";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { PROFILE_CONTACT, PROFILE_EXPORT_CONTACT, PROFILE_LEGAL } from "@/lib/company-profile";
import { INSTITUTIONAL_PACK, PACK_DOCUMENTS } from "@/lib/institutional-pack";
import { CORE_EXPORT_PRODUCTS, EXPORT_PRODUCT_COPY } from "@/lib/export-product-profile";
import { COMPANY_MEDIA } from "@/lib/company-media";
import { tradeEnquiryHref } from "@/lib/trade-catalog";
import PolicyLinks from "@/components/PolicyLinks";
import PublicSiteHeader from "./PublicSiteHeader";
import styles from "./CompanyProfile.module.css";

const LABELS = {
  vi: {
    download: "Tải hồ sơ sản phẩm", explore: "Khám phá bốn dòng trà", contents: "Nội dung hồ sơ xuất khẩu",
    products: "Sản phẩm", supply: "Quy cách & cung ứng", specifications: "Thông số & hồ sơ", company: "Doanh nghiệp", documents: "Tài liệu PDF", contact: "Liên hệ xuất khẩu",
    productTitle: "Bốn dòng trà chủ lực.", productIntro: "Hai dòng hồng trà Shan, một dòng lục trà Shan và một dòng trà xanh hương hoa. Mỗi sản phẩm được chào theo mẫu, phẩm cấp và lượng đặt cụ thể.",
    fullCatalog: "Xem toàn bộ danh mục trà", sampleReference: "Mẫu & phẩm cấp", sampleNote: "Yêu cầu mẫu và bảng thông số theo phẩm cấp, khối lượng và thị trường nhập khẩu.",
    documentIntro: "Hồ sơ sản phẩm để trao đổi với người mua; hồ sơ doanh nghiệp và bản giới thiệu chào hàng để chuẩn bị cuộc gặp.",
    documentTypes: [
      { key: "appendix", title: "Hồ sơ sản phẩm xuất khẩu", note: "Bốn sản phẩm chủ lực, ảnh trà, đặc trưng hương, dạng hàng, quy cách và cơ sở kỹ thuật.", pages: "6 trang", tag: "Sản phẩm" },
      { key: "profile", title: "Hồ sơ doanh nghiệp", note: "Pháp nhân, nguồn trà, năng lực sản xuất và điều kiện cung ứng.", pages: "8 trang", tag: "Doanh nghiệp" },
      { key: "brief", title: "Giới thiệu chào hàng xuất khẩu", note: "Tóm tắt sản phẩm, quy cách và thông tin cần chuẩn bị cho một yêu cầu báo giá.", pages: "2 trang", tag: "Tổng quan" },
    ],
    edition: "Ấn bản · 24 tháng 10, 2026", legal: "Pháp nhân giao dịch", tax: "Mã số thuế", family: "Nền tảng gia đình làm trà", since: "Từ năm 1995", factory: "Nhà máy & điểm nhận EXW", factoryPlace: "Tân Lập · Hà Giang",
    operatingModel: "Từ mẫu đến đơn hàng", quote: "Gửi yêu cầu báo giá", exportContact: "Phát triển xuất khẩu", office: "Văn phòng giao dịch & kho", officeNote: "Thăm nhà máy Tân Lập, Hà Giang được sắp xếp riêng theo lịch hẹn.", map: "Đường đến văn phòng", housePhone: "Liên hệ Hoàng Long", home: "Trang chủ",
    realPhoto: "Ảnh thực tế sẽ bổ sung", photos: "Hình ảnh sản xuất & chuẩn bị hàng", photoNote: "Ảnh nhà máy, kiểm tra chất lượng và đóng hàng sẽ được bổ sung tại các vị trí ghi rõ bên dưới.",
  },
  en: {
    download: "Download product portfolio", explore: "Explore the four teas", contents: "Export portfolio contents",
    products: "Products", supply: "Packing & supply", specifications: "Specifications", company: "Company", documents: "PDF documents", contact: "Export enquiries",
    productTitle: "Four core tea selections.", productIntro: "Two Shan black teas, a Shan green tea and a floral green tea. Each product is offered against a specific sample, grade and order volume.",
    fullCatalog: "Explore the full tea catalogue", sampleReference: "Sample & grade", sampleNote: "Request samples and specifications for your grade, volume and destination market.",
    documentIntro: "Product profiles for procurement discussions, supported by a corporate profile and a concise export sales brief.",
    documentTypes: [
      { key: "appendix", title: "Export product portfolio", note: "Four core teas, product photographs, aromatic identity, product form, packing and specification framework.", pages: "6 pages", tag: "Products" },
      { key: "profile", title: "Corporate profile", note: "Company identity, tea origins, production capabilities and supply terms.", pages: "8 pages", tag: "Company" },
      { key: "brief", title: "Export sales brief", note: "An overview of products, packing and the information required for a quotation.", pages: "2 pages", tag: "Overview" },
    ],
    edition: "Edition · 24 October 2026", legal: "Trading entity", tax: "Vietnam tax ID", family: "Family tea-making experience", since: "Since 1995", factory: "Factory & EXW collection", factoryPlace: "Tân Lập · Hà Giang",
    operatingModel: "From sample to order", quote: "Send a quotation enquiry", exportContact: "Export development", office: "Commercial office & warehouse", officeNote: "Visits to the Tân Lập, Hà Giang factory are arranged separately by appointment.", map: "Directions to the office", housePhone: "Contact Hoàng Long", home: "Home",
    realPhoto: "Real photograph to be added", photos: "Production & goods-preparation photographs", photoNote: "Factory, quality-review and packing photographs will be added in the labelled spaces below.",
  },
};

function MediaFigure({ mediaKey, language, label }) {
  const media = COMPANY_MEDIA[mediaKey];
  return <figure className={styles.mediaFigure}>
    <div className={media.src ? styles.mediaImage : styles.mediaPlaceholder}>
      {media.src ? <Image src={media.src} alt={media.alt[language]} fill sizes="(min-width: 768px) 40vw, 100vw"/> : <>
        <span className={styles.placeholderLabel}>{label}</span><h3>{media.placeholderTitle[language]}</h3><p>{media.placeholderBody[language]}</p>
      </>}
    </div>
    <figcaption>{media.caption[language]}</figcaption>
  </figure>;
}

export default function CompanyProfile() {
  const { locale } = useLocale();
  const language = locale === "en" ? "en" : "vi";
  const t = INSTITUTIONAL_PACK[language];
  const u = LABELS[language];
  const p = EXPORT_PRODUCT_COPY[language];
  const company = t.company;
  const documents = PACK_DOCUMENTS[language];
  const [search, setSearch] = useState("");
  useEffect(() => { setSearch(window.location.search); }, []);
  const quoteHref = tradeEnquiryHref(null, "quote", search, language);
  const catalogQuery = new URLSearchParams(quoteHref.split("?")[1]?.split("#")[0]);
  catalogQuery.delete("intent");
  const catalogHref = `/catalog?${catalogQuery}`;
  const directionsHref = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${PROFILE_CONTACT.name}, ${PROFILE_CONTACT.address}`)}`;
  const phoneRole = language === "en" ? PROFILE_EXPORT_CONTACT.roleEn : PROFILE_EXPORT_CONTACT.role;

  return <main className={styles.page} data-no-translate lang={language}>
    <PublicSiteHeader/>
    <section className={styles.hero} aria-labelledby="company-title">
      <div className={styles.heroCopy}>
        <p className={styles.eyebrow}>{t.eyebrow}</p>
        <h1 id="company-title">{t.title}</h1>
        <p className={styles.heroIntro}>{t.intro}</p>
        <div className={styles.actions}>
          <a className={`${styles.button} ${styles.lightButton}`} href={documents.appendix} download>{u.download}<Download size={17} aria-hidden="true"/></a>
          <a className={styles.heroLink} href="#products">{u.explore}<ArrowRight size={17} aria-hidden="true"/></a>
        </div>
        <div className={styles.heroIdentity}><span>EXW · Tân Lập, Hà Giang</span><span>{language === "vi" ? "Hồ sơ sản phẩm · VI / EN" : "Product portfolio · VI / EN"}</span></div>
      </div>
      <div className={styles.coverGrid}>
        {CORE_EXPORT_PRODUCTS.map((product, index) => <a href={`#product-${product.id}`} className={styles.coverTea} key={product.id}>
          <div><Image src={product.photoUrl} alt={product.name[language]} fill sizes="(min-width: 768px) 25vw, 50vw" style={{ objectPosition: product.photoPosition }} priority={index < 2}/></div>
          <span><small>{String(index + 1).padStart(2,"0")}</small>{product.name[language]}<ArrowRight size={15} aria-hidden="true"/></span>
        </a>)}
      </div>
    </section>

    <nav className={styles.index} aria-label={u.contents}>
      {[["products",u.products],["capability",u.supply],["quality",u.specifications],["overview",u.company],["documents",u.documents],["contact",u.contact]].map(([id,label]) => <a key={id} href={`#${id}`}>{label}</a>)}
    </nav>

    <section id="products" className={`${styles.section} ${styles.products}`} aria-labelledby="products-title">
      <span id="core-export-products" className={styles.anchor}/><span id="portfolio" className={styles.anchor}/>
      <div className={styles.sectionHead}><div><p className={styles.eyebrow}>{p.eyebrow}</p><h2 id="products-title">{u.productTitle}</h2></div><p>{u.productIntro}</p></div>
      <div className={styles.productList}>
        {CORE_EXPORT_PRODUCTS.map((product,index) => <article id={`product-${product.id}`} className={styles.product} key={product.id} aria-labelledby={`name-${product.id}`}>
          <figure className={styles.productImage}><Image src={product.photoUrl} alt={product.name[language]} fill sizes="(min-width: 768px) 44vw, 100vw"/><figcaption>{String(index + 1).padStart(2,"0")} / 04</figcaption></figure>
          <div className={styles.productBody}>
            <p className={styles.eyebrow}>{product.subtitle[language]}</p><h3 id={`name-${product.id}`}>{product.name[language]}</h3><p className={styles.productDescription}>{product.description[language]}</p>
            <dl className={styles.productFacts}>
              {[['category',product.category],['form',product.form],['aroma',product.aroma],['taste',product.taste]].filter(([,value])=>value).map(([key,value]) => <div key={key}><dt>{p.labels[key]}</dt><dd>{value[language]}</dd></div>)}
            </dl>
            <p className={styles.sampleNote}>{u.sampleNote}</p>
            <div className={styles.actions}>
              <Link className={`${styles.button} ${styles.primary}`} href={tradeEnquiryHref(product.catalogId,"sample",search,language)}>{p.sample}<ArrowRight size={16} aria-hidden="true"/></Link>
              <Link className={styles.textLink} href={tradeEnquiryHref(product.catalogId,"quote",search,language)}>{p.quote}<ArrowRight size={16} aria-hidden="true"/></Link>
            </div>
          </div>
        </article>)}
      </div>
      <div className={styles.catalogFooter}><p>{p.evidenceNote}</p><Link className={styles.textLink} href={catalogHref}>{u.fullCatalog}<ArrowRight size={17} aria-hidden="true"/></Link></div>
    </section>

    <section id="capability" className={`${styles.section} ${styles.supply}`} aria-labelledby="capability-title">
      <div className={styles.sectionHead}><div><p className={styles.eyebrow}>EXW · VIETNAM</p><h2 id="capability-title">{company.capability.title}</h2></div><p>{company.capability.body}</p></div>
      <dl className={styles.capacityFacts}>{p.commercialFacts.map(fact => <div key={fact.label}><dt>{fact.label}</dt><dd><strong>{fact.value}</strong><p>{fact.note}</p></dd></div>)}</dl>
    </section>

    <section id="quality" className={styles.section} aria-labelledby="quality-title">
      <div className={styles.sectionHead}><div><p className={styles.eyebrow}>{u.specifications}</p><h2 id="quality-title">{p.technicalTitle}</h2></div><p>{p.technicalIntro}</p></div>
      <div className={styles.technicalRows}>{p.technicalChecks.map((item,index) => <article key={item.title}><span aria-hidden="true">{String(index+1).padStart(2,"0")}</span><h3>{item.title}</h3><p>{item.body}</p></article>)}</div>
    </section>

    <section id="overview" className={`${styles.section} ${styles.company}`} aria-labelledby="overview-title">
      <div className={styles.sectionHead}><div><p className={styles.eyebrow}>{u.company}</p><h2 id="overview-title">{company.mandate.title}</h2></div><p>{company.origin.body}</p></div>
      <dl className={styles.identityFacts}>
        <div><dt>{u.legal}</dt><dd>{PROFILE_LEGAL.name}<span>{u.tax} · {PROFILE_LEGAL.taxNumber}</span></dd></div>
        <div><dt>{u.factory}</dt><dd>{u.factoryPlace}<span>{u.family} · {u.since}</span></dd></div>
        <div><dt>{u.exportContact}</dt><dd>{PROFILE_EXPORT_CONTACT.name}<span>{phoneRole}</span><a href={`tel:${PROFILE_EXPORT_CONTACT.phone}`}>{PROFILE_EXPORT_CONTACT.phoneLabel}</a></dd></div>
      </dl>
      <details className={styles.evidencePhotos}><summary>{u.photos}<span>+</span></summary><div className={styles.productionPhotos}>{["process","factorypanorama","qc","bulkload"].map(key=><MediaFigure key={key} mediaKey={key} language={language} label={u.realPhoto}/>)}</div><p className={styles.quietNote}>{u.photoNote}</p></details>
    </section>

    <section id="operating-model" className={styles.section} aria-labelledby="delivery-title">
      <span id="cooperation" className={styles.anchor}/>
      <div className={styles.sectionHead}><div><p className={styles.eyebrow}>{u.operatingModel}</p><h2 id="delivery-title">{company.delivery.title}</h2></div><p>{company.delivery.body}</p></div>
      <ol className={styles.deliverySteps}>{company.delivery.steps.map((step,index) => <li key={step.title}><span aria-hidden="true">{String(index+1).padStart(2,"0")}</span><h3>{step.title}</h3><p>{step.body}</p></li>)}</ol>
      <Link className={styles.textLink} href={quoteHref}>{u.quote}<ArrowRight size={17} aria-hidden="true"/></Link>
    </section>

    <section id="documents" className={`${styles.section} ${styles.documents}`} aria-labelledby="documents-title">
      <div className={styles.sectionHead}><div><p className={styles.eyebrow}>{u.edition}</p><h2 id="documents-title">{u.documents}</h2></div><p>{u.documentIntro}</p></div>
      <div className={styles.documentRows}>{u.documentTypes.map(doc => <article key={doc.key}><div><span className={styles.documentTag}>{doc.tag}</span><h3>{doc.title}</h3><p>{doc.note}</p></div><div className={styles.fileLinks}><span>{doc.pages} · PDF</span><a href={PACK_DOCUMENTS.vi[doc.key]} download hrefLang="vi"><Download size={16} aria-hidden="true"/>Tiếng Việt</a><a href={PACK_DOCUMENTS.en[doc.key]} download hrefLang="en"><Download size={16} aria-hidden="true"/>English</a></div></article>)}</div>
    </section>

    <section id="contact" className={`${styles.section} ${styles.contact}`} aria-labelledby="contact-title">
      <div><p className={styles.eyebrow}>{u.contact}</p><h2 id="contact-title">{company.contact.title}</h2><p className={styles.sectionIntro}>{company.contact.body}</p><Link className={`${styles.button} ${styles.primary}`} href={quoteHref}>{u.quote}<ArrowRight size={17} aria-hidden="true"/></Link></div>
      <div className={styles.contactCard}><span>{u.exportContact}</span><h3>{PROFILE_EXPORT_CONTACT.name}</h3><p>{phoneRole}</p><a className={styles.contactPhone} href={`tel:${PROFILE_EXPORT_CONTACT.phone}`}><Phone size={19} aria-hidden="true"/>{PROFILE_EXPORT_CONTACT.phoneLabel}</a><hr/><h4>{u.office}</h4><address>{PROFILE_CONTACT.address}</address><p className={styles.contactNote}>{u.officeNote}</p><a href={`tel:${PROFILE_CONTACT.phone}`}>{u.housePhone} · {PROFILE_CONTACT.phoneLabel}</a><a href="mailto:hotro.trahoanglong@gmail.com">hotro.trahoanglong@gmail.com</a><a href={directionsHref} target="_blank" rel="noreferrer"><MapPin size={16} aria-hidden="true"/>{u.map}</a></div>
    </section>

    <footer className={styles.footer}><div><strong>{PROFILE_LEGAL.name}</strong><p>{u.tax} · {PROFILE_LEGAL.taxNumber}</p></div><nav aria-label={language === "vi" ? "Liên kết cuối trang" : "Footer links"}><Link href={`/?lang=${language}`}>{u.home}</Link><Link href={catalogHref}>{u.fullCatalog}</Link><PolicyLinks/></nav></footer>
  </main>;
}

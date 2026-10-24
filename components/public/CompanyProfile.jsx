"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Download, MapPin, Phone } from "lucide-react";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { PROFILE_CONTACT, PROFILE_EXPORT_CONTACT, PROFILE_LEGAL } from "@/lib/company-profile";
import { INSTITUTIONAL_PACK, PACK_DOCUMENTS } from "@/lib/institutional-pack";
import { COMPANY_MEDIA } from "@/lib/company-media";
import { tradeEnquiryHref } from "@/lib/trade-catalog";
import PolicyLinks from "@/components/PolicyLinks";
import PublicSiteHeader from "./PublicSiteHeader";
import styles from "./CompanyProfile.module.css";

const LABELS = {
  vi: {
    profile: "Hồ sơ doanh nghiệp", proposal: "Đề xuất khung hợp tác", documents: "Tài liệu giao thương", edition: "Ấn bản · 24 tháng 10, 2026",
    download: "Tải hồ sơ doanh nghiệp", discuss: "Trao đổi hợp tác", catalog: "Xem danh mục trà", sample: "Làm việc về mẫu & báo giá",
    contents: "Nội dung hồ sơ", identity: "Doanh nghiệp", origin: "Nguồn trà", capability: "Sản xuất & cung ứng", portfolio: "Danh mục & ứng dụng", quality: "Chất lượng", contact: "Đầu mối hợp tác",
    documentsIntro: "Chọn tài liệu theo mục đích làm việc: giới thiệu đề xuất, tìm hiểu doanh nghiệp hoặc đi sâu vào sản phẩm và điều kiện cung ứng.",
    documentTypes: [
      { key: "brief", title: "Đề xuất khung hợp tác", note: "Mục tiêu, đóng góp và nội dung phối hợp với đối tác thương mại hoặc đơn vị xúc tiến.", pages: "2 trang", tag: "Dành cho cuộc gặp đầu tiên" },
      { key: "profile", title: "Hồ sơ doanh nghiệp", note: "Pháp nhân, nền tảng nghề trà, năng lực cung ứng, danh mục và hướng phát triển.", pages: "8 trang", tag: "Tìm hiểu năng lực & định hướng" },
      { key: "appendix", title: "Phụ lục sản phẩm & kỹ thuật", note: "Danh mục trà, quy cách, nội dung đánh giá chất lượng và lộ trình giao dịch.", pages: "7 trang", tag: "Dành cho trao đổi chuyên môn" },
    ],
    factsNote: "Thông tin vận hành do Hoàng Long cung cấp. Năng lực khả dụng, hồ sơ sản phẩm và điều kiện giao dịch được đối chiếu theo từng đề bài hợp tác.",
    family: "Nền tảng gia đình làm trà", since: "Từ năm 1995", factory: "Chế biến & điểm nhận EXW", location: "Tân Lập · Hà Giang", legal: "Pháp nhân giao dịch", tax: "Mã số thuế",
    manufacturing: "Tại nguồn · Tân Lập, Hà Giang", realPhoto: "Ảnh thực tế sẽ bổ sung", mediaSummary: "Ảnh sản phẩm, chất lượng & giao nhận", mediaNote: "Các ô chờ ảnh được ghi rõ và sẽ thay bằng ảnh thực tế do Hoàng Long cung cấp.",
    contribute: "Hoàng Long đóng góp", request: "Nội dung đề nghị phối hợp", objective: "Mục tiêu làm việc", pathway: "Lộ trình đề xuất", outcome: "Đầu ra hướng tới",
    briefNote: "Đề xuất khung cho trao đổi ban đầu. Thị trường, đơn vị tham gia, lịch và phạm vi triển khai sẽ được cụ thể hóa cho từng chương trình.",
    readBrief: "Tải đề xuất hợp tác", development: "Định hướng phát triển", office: "Văn phòng giao dịch & kho · Hà Nội", officeNote: "Tham quan nhà máy Tân Lập, Hà Giang được sắp xếp riêng theo lịch làm việc.", map: "Đường đến văn phòng", housePhone: "Liên hệ Hoàng Long", exportContact: "Phát triển xuất khẩu", home: "Trang chủ", email: "Email giao dịch",
  },
  en: {
    profile: "Corporate profile", proposal: "Cooperation framework brief", documents: "Trade documents", edition: "Edition · 24 October 2026",
    download: "Download corporate profile", discuss: "Discuss cooperation", catalog: "Explore the tea catalogue", sample: "Discuss samples & quotations",
    contents: "Profile contents", identity: "Company", origin: "Tea origins", capability: "Production & supply", portfolio: "Portfolio & applications", quality: "Quality", contact: "Cooperation contact",
    documentsIntro: "Choose the document for your discussion: introduce a cooperation proposal, understand the business or review products and supply requirements in detail.",
    documentTypes: [
      { key: "brief", title: "Cooperation framework brief", note: "Objectives, contributions and proposed coordination with trade partners or promotion bodies.", pages: "2 pages", tag: "For an introductory meeting" },
      { key: "profile", title: "Corporate profile", note: "Company identity, tea-making foundation, supply capabilities, portfolio and direction.", pages: "8 pages", tag: "Business capabilities & direction" },
      { key: "appendix", title: "Product & technical annex", note: "The tea range, formats, quality-assessment topics and commercial working pathway.", pages: "7 pages", tag: "For detailed product discussions" },
    ],
    factsNote: "Operating information supplied by Hoàng Long. Available capacity, product records and commercial terms are reviewed for the specific cooperation brief.",
    family: "Family tea-making foundation", since: "Since 1995", factory: "Processing & EXW collection", location: "Tân Lập · Hà Giang", legal: "Trading entity", tax: "Vietnam tax ID",
    manufacturing: "At origin · Tân Lập, Hà Giang", realPhoto: "Real photograph to be added", mediaSummary: "Product, quality & handover photographs", mediaNote: "Photo spaces are explicitly labelled and will be replaced with real photographs supplied by Hoàng Long.",
    contribute: "Hoàng Long's contribution", request: "Proposed coordination", objective: "Discussion objective", pathway: "Proposed pathway", outcome: "Intended outcome",
    briefNote: "A framework for initial discussion. Market, participants, timing and implementation scope will be developed for each programme.",
    readBrief: "Download cooperation brief", development: "Development direction", office: "Commercial office & warehouse · Hanoi", officeNote: "Visits to the Tân Lập, Hà Giang factory are arranged separately against an agreed agenda.", map: "Directions to the office", housePhone: "Contact Hoàng Long", exportContact: "Export development", home: "Home", email: "Business email",
  },
};

function MediaFigure({ mediaKey, language, label, className = "" }) {
  const media = COMPANY_MEDIA[mediaKey];
  return <figure className={`${styles.mediaFigure} ${className}`}>
    <div className={media.src ? styles.mediaImage : styles.mediaPlaceholder}>
      {media.src ? <Image src={media.src} alt={media.alt[language]} fill sizes="(min-width: 768px) 45vw, 100vw"/> : <>
        <div className={styles.placeholderFrame} aria-hidden="true"><span/><span/></div>
        <span className={styles.placeholderLabel}>{label}</span>
        <h3>{media.placeholderTitle[language]}</h3>
        <p>{media.placeholderBody[language]}</p>
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
          <a className={`${styles.button} ${styles.lightButton}`} href={documents.profile} download>{u.download}<Download size={17} aria-hidden="true"/></a>
          <a className={styles.heroLink} href="#cooperation">{u.proposal}<ArrowRight size={17} aria-hidden="true"/></a>
        </div>
        <div className={styles.heroIdentity}><span>{u.profile} · VI / EN</span><span>{PROFILE_LEGAL.name}</span></div>
      </div>
      <figure className={styles.coverImage}>
        <Image src="/landing/1.jpg" alt={language === "vi" ? "Nguồn trà trong hồ sơ Hoàng Long" : "Tea origins from the Hoàng Long profile"} fill sizes="(min-width: 768px) 42vw, 100vw" priority/>
        <figcaption>{language === "vi" ? "Nguồn trà · Hồ sơ Hoàng Long" : "Tea origins · Hoàng Long profile"}</figcaption>
      </figure>
    </section>

    <nav className={styles.index} aria-label={u.contents}>
      {[["overview",u.identity],["capability",u.capability],["portfolio",u.portfolio],["quality",u.quality],["cooperation",u.proposal],["documents",u.documents]].map(([id,label]) => <a key={id} href={`#${id}`}>{label}</a>)}
    </nav>

    <section id="overview" className={styles.section} aria-labelledby="overview-title">
      <div className={styles.sectionHeading}><p className={styles.eyebrow}>{u.identity}</p><h2 id="overview-title">{company.mandate.title}</h2></div>
      <p className={styles.lead}>{company.mandate.body}</p>
      <dl className={styles.identityFacts}>
        <div><dt>{u.legal}</dt><dd>{PROFILE_LEGAL.name}<span>{u.tax} · {PROFILE_LEGAL.taxNumber}</span></dd></div>
        <div><dt>{u.family}</dt><dd>{u.since}<span>{u.location}</span></dd></div>
        <div><dt>{u.exportContact}</dt><dd>{PROFILE_EXPORT_CONTACT.name}<span>{phoneRole}</span><a href={`tel:${PROFILE_EXPORT_CONTACT.phone}`}>{PROFILE_EXPORT_CONTACT.phoneLabel}</a></dd></div>
      </dl>
    </section>

    <section className={`${styles.section} ${styles.origin}`} aria-labelledby="origin-title">
      <div><p className={styles.eyebrow}>{u.origin}</p><h2 id="origin-title">{company.origin.title}</h2><p className={styles.sectionIntro}>{company.origin.body}</p></div>
      <div className={styles.originNotes}>{company.origin.items.map(item => <article key={item.title}><h3>{item.title}</h3><p>{item.body}</p></article>)}</div>
    </section>

    <section id="capability" className={styles.section} aria-labelledby="capability-title">
      <div className={styles.sectionHead}><div><p className={styles.eyebrow}>{u.manufacturing}</p><h2 id="capability-title">{company.capability.title}</h2></div><p>{company.capability.body}</p></div>
      <dl className={styles.capacityFacts}>{company.capability.facts.map(fact => <div key={fact.label}><dt>{fact.label}</dt><dd><strong>{fact.value}</strong><p>{fact.note}</p></dd></div>)}</dl>
      <div className={styles.productionPhotos}><MediaFigure mediaKey="process" language={language} label={u.realPhoto}/><MediaFigure mediaKey="factorypanorama" language={language} label={u.realPhoto}/></div>
    </section>

    <section id="portfolio" className={`${styles.section} ${styles.portfolio}`} aria-labelledby="portfolio-title">
      <div className={styles.sectionHead}><div><p className={styles.eyebrow}>{u.portfolio}</p><h2 id="portfolio-title">{company.portfolio.title}</h2></div><p>{company.portfolio.body}</p></div>
      <div className={styles.portfolioRows}>{company.portfolio.segments.map(segment => <article key={segment.title}><h3>{segment.title}</h3><p>{segment.body}</p></article>)}</div>
      <Link className={styles.textLink} href={catalogHref}>{u.catalog}<ArrowRight size={17} aria-hidden="true"/></Link>
    </section>

    <section id="operating-model" className={styles.section} aria-labelledby="delivery-title">
      <div className={styles.sectionHead}><h2 id="delivery-title">{company.delivery.title}</h2><p>{company.delivery.body}</p></div>
      <ol className={styles.deliverySteps}>{company.delivery.steps.map((step,index) => <li key={step.title}><span aria-hidden="true">{String(index+1).padStart(2,"0")}</span><h3>{step.title}</h3><p>{step.body}</p></li>)}</ol>
      <Link className={styles.textLink} href={quoteHref}>{u.sample}<ArrowRight size={17} aria-hidden="true"/></Link>
    </section>

    <section id="quality" className={`${styles.section} ${styles.quality}`} aria-labelledby="quality-title">
      <div className={styles.sectionHead}><div><p className={styles.eyebrow}>{u.quality}</p><h2 id="quality-title">{company.quality.title}</h2></div><p>{company.quality.body}</p></div>
      <div className={styles.qualityRows}>{company.quality.items.map(item => <article key={item.title}><h3>{item.title}</h3><p>{item.body}</p></article>)}</div>
      <details className={styles.evidencePhotos}><summary>{u.mediaSummary}<span>+</span></summary><div className={styles.productionPhotos}><MediaFigure mediaKey="qc" language={language} label={u.realPhoto}/><MediaFigure mediaKey="bulkload" language={language} label={u.realPhoto}/></div><p className={styles.quietNote}>{u.mediaNote}</p></details>
    </section>

    <section id="cooperation" className={`${styles.section} ${styles.cooperation}`} aria-labelledby="cooperation-title">
      <div className={styles.proposalHead}><p className={styles.eyebrow}>{u.proposal}</p><h2 id="cooperation-title">{t.brief.title}</h2><p>{t.brief.summary}</p></div>
      <div className={styles.objective}><p>{u.objective}</p><strong>{t.brief.objective}</strong></div>
      <div className={styles.proposalColumns}>
        <div><h3>{u.contribute}</h3>{t.brief.contribution.map(item => <article key={item.title}><h4>{item.title}</h4><p>{item.body}</p></article>)}</div>
        <div><h3>{u.request}</h3>{t.brief.request.map(item => <article key={item.title}><h4>{item.title}</h4><p>{item.body}</p></article>)}</div>
      </div>
      <div className={styles.pathway}><h3>{u.pathway}</h3><ol>{t.brief.path.map((step,index) => <li key={step.title}><span aria-hidden="true">{String(index+1).padStart(2,"0")}</span><h4>{step.title}</h4><p>{step.body}</p></li>)}</ol></div>
      <div className={styles.outcome}><span>{u.outcome}</span><p>{t.brief.outcome}</p></div>
      <p className={styles.quietNote}>{u.briefNote}</p>
      <div className={styles.actions}><a className={`${styles.button} ${styles.primary}`} href={documents.brief} download>{u.readBrief}<Download size={17} aria-hidden="true"/></a><a className={styles.textLink} href={`tel:${PROFILE_EXPORT_CONTACT.phone}`}>{u.discuss}<ArrowRight size={17} aria-hidden="true"/></a></div>
    </section>

    <section className={styles.section} aria-labelledby="direction-title"><div className={styles.sectionHead}><div><p className={styles.eyebrow}>{u.development}</p><h2 id="direction-title">{company.development.title}</h2></div><p>{company.development.body}</p></div><div className={styles.directionRows}>{company.development.priorities.map(item => <article key={item.title}><h3>{item.title}</h3><p>{item.body}</p></article>)}</div></section>

    <section id="documents" className={`${styles.section} ${styles.documents}`} aria-labelledby="documents-title">
      <div className={styles.sectionHead}><div><p className={styles.eyebrow}>{u.edition}</p><h2 id="documents-title">{u.documents}</h2></div><p>{u.documentsIntro}</p></div>
      <div className={styles.documentRows}>{u.documentTypes.map(doc => <article key={doc.key}><div><span className={styles.documentTag}>{doc.tag}</span><h3>{doc.title}</h3><p>{doc.note}</p></div><div className={styles.fileLinks}><span>{doc.pages} · PDF</span><a href={PACK_DOCUMENTS.vi[doc.key]} download hrefLang="vi"><Download size={16} aria-hidden="true"/>Tiếng Việt</a><a href={PACK_DOCUMENTS.en[doc.key]} download hrefLang="en"><Download size={16} aria-hidden="true"/>English</a></div></article>)}</div>
      <p className={styles.quietNote}>{u.factsNote}</p>
    </section>

    <section id="contact" className={`${styles.section} ${styles.contact}`} aria-labelledby="contact-title">
      <div><p className={styles.eyebrow}>{u.contact}</p><h2 id="contact-title">{company.contact.title}</h2><p className={styles.sectionIntro}>{company.contact.body}</p></div>
      <div className={styles.contactCard}><span>{u.exportContact}</span><h3>{PROFILE_EXPORT_CONTACT.name}</h3><p>{phoneRole}</p><a className={styles.contactPhone} href={`tel:${PROFILE_EXPORT_CONTACT.phone}`}><Phone size={19} aria-hidden="true"/>{PROFILE_EXPORT_CONTACT.phoneLabel}</a><hr/><h4>{u.office}</h4><address>{PROFILE_CONTACT.address}</address><p className={styles.contactNote}>{u.officeNote}</p><a href={`tel:${PROFILE_CONTACT.phone}`}>{u.housePhone} · {PROFILE_CONTACT.phoneLabel}</a><a href="mailto:hotro.trahoanglong@gmail.com">hotro.trahoanglong@gmail.com</a><a href={directionsHref} target="_blank" rel="noreferrer"><MapPin size={16} aria-hidden="true"/>{u.map}</a></div>
    </section>

    <footer className={styles.footer}><div><strong>{PROFILE_LEGAL.name}</strong><p>{u.tax} · {PROFILE_LEGAL.taxNumber}</p></div><nav aria-label={language === "vi" ? "Liên kết cuối trang" : "Footer links"}><Link href={`/?lang=${language}`}>{u.home}</Link><Link href={catalogHref}>{u.catalog}</Link><PolicyLinks/></nav></footer>
  </main>;
}

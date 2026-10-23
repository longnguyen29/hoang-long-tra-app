"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Download, FileText, MapPin, MessageCircle, Phone } from "lucide-react";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { COMPANY_PROFILE, PROFILE_CONTACT, PROFILE_EXPORT_CONTACT, PROFILE_LEGAL, PROFILE_PDF } from "@/lib/company-profile";
import { tradeEnquiryHref } from "@/lib/trade-catalog";
import PolicyLinks from "@/components/PolicyLinks";
import styles from "./CompanyProfile.module.css";
import PublicSiteHeader from "./PublicSiteHeader";

export default function CompanyProfile() {
  const { locale } = useLocale();
  const language = locale === "en" ? "en" : "vi";
  const t = COMPANY_PROFILE[language];
  const [search, setSearch] = useState("");
  useEffect(() => { setSearch(window.location.search); }, []);
  const quoteHref = tradeEnquiryHref(null, "quote", search, language);
  const sampleHref = tradeEnquiryHref(null, "sample", search, language);
  const catalogQuery = new URLSearchParams(quoteHref.split("?")[1]?.split("#")[0]);
  catalogQuery.delete("intent");
  const catalogHref = `/catalog?${catalogQuery}`;
  const directionsHref = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${PROFILE_CONTACT.name}, ${PROFILE_CONTACT.address}`)}`;
  const pdfLanguages = language === "vi" ? ["vi", "en"] : ["en", "vi"];

  return (
    <main className={styles.page} data-no-translate lang={language}>
      <PublicSiteHeader/>

      <section className={styles.hero} aria-labelledby="company-title">
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>{t.eyebrow}</p>
          <h1 id="company-title">{t.title}</h1>
          <p className={styles.intro}>{t.intro}</p>
          <div className={styles.actions}>
            <Link className={`${styles.button} ${styles.primary}`} href={catalogHref}>{t.actions.catalog}<ArrowRight size={17} aria-hidden="true" /></Link>
            <a className={styles.button} href="#cooperation">{t.cooperation.cta}</a>
          </div>
        </div>
        <figure className={styles.heroImage}>
          <Image src="/landing/3.jpg" alt={t.images.production} fill sizes="(min-width: 768px) 49vw, 100vw" fetchPriority="high" loading="eager" />
          <figcaption>{t.images.productionCaption}</figcaption>
        </figure>
      </section>

      <aside className={styles.folio} aria-label={t.actions.pdf}>
        <div>
          <p className={styles.folioTitle}>{t.actions.pdf}</p>
          <p><span className={styles.edition}>{t.edition}</span> · {t.editionNote}</p>
        </div>
        <div className={styles.downloads}>
          {pdfLanguages.map((pdfLanguage) => (
            <a className={pdfLanguage === language ? styles.downloadPrimary : undefined} href={PROFILE_PDF[pdfLanguage]} download key={pdfLanguage} hrefLang={pdfLanguage}>
              <Download size={17} aria-hidden="true" />
              {pdfLanguage === "vi" ? "Tiếng Việt" : "English"}<span className={styles.fileType}>PDF</span>
            </a>
          ))}
        </div>
      </aside>

      <section className={styles.section} aria-labelledby="overview-title">
        <div className={styles.sectionHead}>
          <h2 id="overview-title">{t.overview.title}</h2>
          <p>{t.overview.body}</p>
        </div>
        <dl className={styles.facts}>
          {t.overview.facts.map((fact) => (
            <div key={fact.label}>
              <dt>{fact.label}</dt>
              <dd><strong>{fact.value}</strong><p>{fact.note}</p></dd>
            </div>
          ))}
        </dl>
      </section>

      <section className={styles.origin} aria-labelledby="origins-title">
        <figure className={styles.originImage}>
          <Image src="/landing/1.jpg" alt={t.images.origin} fill sizes="(min-width: 768px) 43vw, 100vw" />
          <figcaption>{t.images.origin}</figcaption>
        </figure>
        <div className={styles.originCopy}>
          <h2 id="origins-title">{t.origins.title}</h2>
          <p className={styles.originBody}>{t.origins.body}</p>
          <div className={styles.originArticles}>
            {t.origins.entries.map((entry) => (
              <article key={entry.title}><h3>{entry.title}</h3><p>{entry.body}</p></article>
            ))}
          </div>
          <Link className={styles.textLink} href={`/story?lang=${language}`}>{t.actions.story}<ArrowRight size={17} aria-hidden="true" /></Link>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="supply-title">
        <div className={styles.sectionHead}>
          <h2 id="supply-title">{t.supply.title}</h2>
          <p>{t.supply.intro}</p>
        </div>
        <ol className={styles.steps}>
          {t.supply.steps.map((step, index) => (
            <li key={step.title}>
              <span className={styles.stepNumber} aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
              <div><h3>{step.title}</h3><p>{step.body}</p></div>
            </li>
          ))}
        </ol>
        <div className={styles.actions}>
          <Link className={`${styles.button} ${styles.primary}`} href={quoteHref}>{t.actions.quote}<ArrowRight size={17} aria-hidden="true" /></Link>
          <Link className={styles.textLink} href={sampleHref}>{t.actions.sample}</Link>
        </div>
      </section>

      <section className={`${styles.section} ${styles.quality}`} aria-labelledby="quality-title">
        <div className={styles.sectionHead}>
          <h2 id="quality-title">{t.quality.title}</h2>
          <p>{t.quality.body}</p>
        </div>
        <ul className={styles.checklist}>
          {t.quality.items.map((item) => <li key={item}><FileText size={18} aria-hidden="true" /><p>{item}</p></li>)}
        </ul>
      </section>

      <section id="cooperation" className={`${styles.section} ${styles.cooperation}`} aria-labelledby="cooperation-title">
        <div className={styles.sectionHead}>
          <h2 id="cooperation-title">{t.cooperation.title}</h2>
          <p>{t.cooperation.body}</p>
        </div>
        <div className={styles.cooperationGrid}>
          {t.cooperation.tracks.map(track => <article key={track.title}><h3>{track.title}</h3><p>{track.body}</p></article>)}
        </div>
        <details className={styles.meetingBrief}>
          <summary>{language === "vi" ? "Đề cương buổi làm việc đầu tiên" : "An agenda for the first meeting"}</summary>
          <ul>{t.cooperation.brief.map(item => <li key={item}>{item}</li>)}</ul>
        </details>
        <div className={styles.actions}><a className={`${styles.button} ${styles.primary}`} href={`tel:${PROFILE_EXPORT_CONTACT.phone}`}>{t.cooperation.cta}<Phone size={17} aria-hidden="true"/></a><Link className={styles.textLink} href={quoteHref}>{t.actions.quote}<ArrowRight size={17} aria-hidden="true"/></Link></div>
      </section>

      <section id="partner-review" className={styles.section} aria-labelledby="evidence-title">
        <div className={styles.sectionHead}><h2 id="evidence-title">{t.evidence.title}</h2><p>{t.evidence.body}</p></div>
        <div className={styles.evidenceGrid}>{t.evidence.items.map(item => <article key={item.title}><h3>{item.title}</h3><p>{item.body}</p></article>)}</div>
      </section>

      <section id="contact" className={styles.contact} aria-labelledby="contact-title">
        <div className={styles.contactLead}>
          <h2 id="contact-title">{t.contact.title}</h2>
          <p>{t.contact.legalNote}</p>
          <article className={styles.exportContact}>
            <p className={styles.eyebrow}>{t.exportContact.title}</p>
            <h3>{PROFILE_EXPORT_CONTACT.name}</h3>
            <strong>{language === "en" ? PROFILE_EXPORT_CONTACT.roleEn : PROFILE_EXPORT_CONTACT.role}</strong>
            <p>{t.exportContact.scope}</p>
            <a href={`tel:${PROFILE_EXPORT_CONTACT.phone}`}><Phone size={17} aria-hidden="true"/>{PROFILE_EXPORT_CONTACT.phoneLabel}</a>
          </article>
        </div>
        <div className={styles.contactDetails}>
          <h3>{t.contact.officeLabel}</h3>
          <address className={styles.address}>{PROFILE_CONTACT.address}</address>
          <p className={styles.contactNote}>{t.contact.visitNote}</p>
          <div className={styles.contactLinks}>
            <a href={`tel:${PROFILE_CONTACT.phone}`} aria-label={`${t.actions.call}: ${PROFILE_CONTACT.phoneLabel}`}><Phone size={17} aria-hidden="true" />{PROFILE_CONTACT.phoneLabel}</a>
            <a href={PROFILE_CONTACT.zaloUrl} target="_blank" rel="noreferrer"><MessageCircle size={17} aria-hidden="true" />{t.actions.zalo}</a>
            <a href={directionsHref} target="_blank" rel="noreferrer"><MapPin size={17} aria-hidden="true" />{t.contact.map}</a>
          </div>
          <Link className={`${styles.button} ${styles.primary} ${styles.contactQuote}`} href={quoteHref}>{t.actions.quote}<ArrowRight size={17} aria-hidden="true" /></Link>
        </div>
      </section>

      <footer className={styles.footer}>
        <div><p>{PROFILE_CONTACT.name}</p><p className={styles.legalIdentity}>{PROFILE_LEGAL.name}<br/>{language === "vi" ? "Mã số thuế" : "Vietnam tax ID"}: {PROFILE_LEGAL.taxNumber}</p></div>
        <div className={styles.footerLinks}>
          <nav aria-label={language === "vi" ? "Liên kết cuối trang" : "Footer links"}>
            <Link href="/">{t.actions.home}</Link>
            <Link href={catalogHref}>{t.actions.catalog}</Link>
          </nav>
          <PolicyLinks />
        </div>
      </footer>
    </main>
  );
}

import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EVENT_CONTACT } from "@/lib/event-contact";
import { INTERNATIONAL_LOCALES, INTERNATIONAL_SECTIONS, internationalCopy, internationalProducts, localPath } from "@/lib/international-site";
import ExportEnquiry from "@/components/public/ExportEnquiry";
import InternationalPrint from "./InternationalPrint";
import styles from "./page.module.css";

export const dynamicParams = false;
const base = "https://www.hoanglongtra.com";
const localeTags = { en: "en", ja: "ja", zh: "zh-Hans" };
const originalDocs = ["corporate-profile", "product-annex", "cooperation-brief"];
const pdfPath = language => `/downloads/hoang-long-export-brief-${language}.pdf`;

export function generateStaticParams() {
  return Object.keys(INTERNATIONAL_LOCALES).flatMap(siteLocale =>
    INTERNATIONAL_SECTIONS.map(section => ({ siteLocale, section: section ? [section] : [] })));
}

function resolve({ siteLocale, section: segments }) {
  const section = segments?.[0] || "";
  if (!Object.hasOwn(INTERNATIONAL_LOCALES, siteLocale) || (segments?.length || 0) > 1 || !INTERNATIONAL_SECTIONS.includes(section)) notFound();
  return { language: siteLocale, section, copy: internationalCopy[siteLocale] };
}

export async function generateMetadata({ params }) {
  const { language, section, copy } = resolve(await params);
  const title = ({ company: copy.nav[1], catalog: copy.catalogue, wholesale: copy.supply, documents: copy.docTitle })[section] || copy.heading;
  const description = ({ catalog: copy.catalogIntro, documents: copy.docsIntro, wholesale: copy.steps[0][1] })[section] || copy.intro;
  const canonical = base + localPath(language, section);
  const languages = Object.fromEntries(["vi", ...Object.keys(INTERNATIONAL_LOCALES)].map(lang => [localeTags[lang] || lang, base + localPath(lang, section)]));
  return { title: `${title} | Hoàng Long`, description,
    alternates: { canonical, languages: { ...languages, "x-default": languages.vi } },
    openGraph: { title: `${title} | Hoàng Long`, description, url: canonical, images: [`${base}/export/core-hong-tra-shan-mat.jpeg`] } };
}

function Company({ copy }) {
  return <section className={styles.band}>
    <h2>{copy.story}</h2><p>{copy.storyText}</p>
    <dl className={styles.facts}>{copy.proof.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
  </section>;
}

function Catalog({ copy, language }) {
  return <section className={styles.band}>
    <h2>{copy.catalogue}</h2><p>{copy.catalogIntro}</p>
    <div className={styles.products}>{internationalProducts(language).map(product => <article key={product.id}>
      <div className={styles.productImage}><Image src={product.photoUrl} alt={product.title} fill
        sizes="(max-width: 620px) 100vw, (max-width: 920px) 50vw, 24vw" style={{ objectPosition: product.photoPosition }} /></div>
      <h3>{product.title}</h3><p>{product.summary}</p>
    </article>)}</div>
  </section>;
}

function Supply({ copy }) {
  return <section className={styles.band}>
    <h2>{copy.supply}</h2>
    <ol className={styles.steps}>{copy.steps.map(([title, detail]) => <li key={title}><h3>{title}</h3><p>{detail}</p></li>)}</ol>
    <dl className={styles.facts}><div><dt>{copy.bulk}</dt><dd>{copy.bulkText}</dd></div><div><dt>{copy.exw}</dt><dd>{copy.exwText}</dd></div></dl>
  </section>;
}

function Documents({ copy, language }) {
  return <article className={styles.document}>
    <header><p>HOUSE OF HOÀNG LONG</p><h1>{copy.docTitle}</h1><p>{copy.intro}</p></header>
    <Company copy={copy} />
    <section className={styles.band}>
      <h2>{copy.catalogue}</h2><p>{copy.catalogIntro}</p>
      <div className={styles.docTeas}>{internationalProducts(language).map(product => <article key={product.id}>
        <h3>{product.title}</h3><p>{product.summary}</p>
      </article>)}</div>
    </section>
    <Supply copy={copy} />
    <section className={styles.band}><h2>{copy.checklist}</h2><ul className={styles.checks}>{copy.checks.map(item => <li key={item}>{item}</li>)}</ul></section>
    <footer><strong>{copy.contact}</strong><br />{EVENT_CONTACT.phoneLabel} · hoanglongtra.com/{language}</footer>
  </article>;
}

export default async function InternationalPage({ params }) {
  const { language, section, copy } = resolve(await params);
  const href = (page = "") => localPath(language, page);
  const mainTitles = { company: copy.nav[1], catalog: copy.nav[2], wholesale: copy.nav[3] };
  return <div lang={localeTags[language]} className={styles.site} data-no-translate>
    <header className={styles.header}>
      <Link className={styles.wordmark} href={href()}>HOÀNG LONG</Link>
      <nav aria-label={copy.nav[0]}>{INTERNATIONAL_SECTIONS.map((page, i) =>
        <Link key={page} href={href(page)} aria-current={section === page ? "page" : undefined}>{copy.nav[i]}</Link>)}</nav>
      <nav className={styles.languages} aria-label={copy.language}>
        {Object.entries({ vi: "Tiếng Việt", ...INTERNATIONAL_LOCALES }).map(([locale, name]) =>
          <Link key={locale} href={localPath(locale, section)} hrefLang={localeTags[locale] || locale}
            lang={localeTags[locale] || locale} aria-current={locale === language ? "true" : undefined}>{name}</Link>)}
      </nav>
    </header>
    <main className={styles.main}>
      {!section && <>
        <section className={styles.hero}>
          <div><h1>{copy.heading}</h1><p>{copy.intro}</p><div className={styles.actions}>
            <Link className={styles.primary} href={href("catalog")}>{copy.viewRange}</Link>
            <Link href={href("wholesale")}>{copy.discuss}</Link>
          </div></div>
          <div className={styles.heroImage}><Image src="/export/core-hong-tra-shan-mat.jpeg" alt={copy.imageAlt} fill priority sizes="(max-width: 760px) 100vw, 50vw" /></div>
        </section>
        <Company copy={copy} /><Catalog copy={copy} language={language} />
      </>}
      {section in mainTitles && <header className={styles.pageHeading}><h1>{mainTitles[section]}</h1>{section === "company" && <p>{copy.intro}</p>}</header>}
      {section === "company" && <Company copy={copy} />}
      {section === "catalog" && <Catalog copy={copy} language={language} />}
      {section === "wholesale" && <><Supply copy={copy} /><ExportEnquiry locale={language} compact initialCurrency={language === "zh" ? "CNY" : "USD"} /></>}
      {section === "documents" ? <>
        <aside className={styles.docActions}><p>{copy.docsIntro}</p><div className={styles.actions}>
          <a className={styles.primary} href={pdfPath(language)} download>{copy.pdf}</a>
          <InternationalPrint label={copy.print} />
        </div>{copy.existingDocs && <div className={styles.existing}><strong>{copy.existing}</strong>{copy.existingDocs.map((label, index) =>
          <a key={label} href={`/downloads/hoang-long-${originalDocs[index]}-en.pdf`}>{label} · PDF</a>)}</div>}</aside>
        <Documents copy={copy} language={language} />
      </> : <section className={styles.band}>
        <h2>{copy.contact}</h2>
        <div className={styles.actions}>
          <a className={styles.primary} href={`tel:${EVENT_CONTACT.phone}`}>{EVENT_CONTACT.phone}</a>
          <a href={EVENT_CONTACT.zaloUrl}>Zalo</a>
          <Link href={href("documents")}>{copy.documents}</Link>
          <Link href="/shop?lang=en" hrefLang="en">{copy.checkout}</Link>
        </div>
      </section>}
    </main>
    <footer className={styles.footer}>Hoàng Long · {EVENT_CONTACT.address}</footer>
  </div>;
}

"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Copy, Download, Mail, Phone, Printer, RefreshCw } from "lucide-react";
import { EXPORT_TEAS, EXPORT_PRICE_REVISION, EXPORT_CURRENCIES } from "@/lib/export-teas";
import { convertQuantityPrice } from "@/lib/export-exchange";
import { TAIWAN_EXPORT_COPY } from "@/lib/export-taiwan-copy";
import { PROFILE_CONTACT, PROFILE_PDF } from "@/lib/company-profile";
import { exportAttribution, exportLink } from "@/lib/export-enquiry";
import { EXPORT_SALES_KIT_PDF } from "@/lib/export-sales-kit";
import ExportEnquiry from "./ExportEnquiry";
import styles from "./TaiwanExportDesk.module.css";

const NUMBER_LOCALES = { "zh-TW": "zh-TW", en: "en-US", vi: "vi-VN" };
const EMAIL = "hotro.trahoanglong@gmail.com";
const sourceUrl = "https://www.exchangerate-api.com";
function money(value, currency, locale) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat(NUMBER_LOCALES[locale], { style: "currency", currency, currencyDisplay: "code", minimumFractionDigits: currency === "VND" ? 0 : 2, maximumFractionDigits: currency === "VND" ? 0 : 2 }).format(value);
}
function timestamp(value, locale) {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat(NUMBER_LOCALES[locale], { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh" }).format(date) : "—";
}

export default function TaiwanExportDesk({ initialTeaIds = EXPORT_TEAS.map(tea => tea.id), initialCurrency = "VND" }) {
  const language = "vi";
  const teas = EXPORT_TEAS.filter(tea => initialTeaIds.includes(tea.id));
  const [currency, setCurrency] = useState(initialCurrency);
  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading] = useState(false);
  const [rateError, setRateError] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shareFallback, setShareFallback] = useState("");
  const [estimateTea, setEstimateTea] = useState(teas[0].id);
  const [kg, setKg] = useState("1000");
  const [search, setSearch] = useState("");
  const t = TAIWAN_EXPORT_COPY[language];
  const selectionKey = teas.map(tea => tea.id).join(",");
  useEffect(() => {
    setEstimateTea(current => selectionKey.split(",").includes(current) ? current : selectionKey.split(",")[0]);
  }, [selectionKey]);
  const loadPrices = useCallback(async (signal) => {
    setLoading(true);
    try {
      const response = await fetch("/api/export-prices", { signal, cache: "no-store" });
      if (!response.ok) throw new Error("rates_unavailable");
      const data = await response.json();
      if (!["fresh", "stale"].includes(data.status) || !Array.isArray(data.prices)) throw new Error("rates_unavailable");
      setSnapshot(data); setRateError(false);
    } catch (error) {
      if (error.name !== "AbortError") { setSnapshot(null); setRateError(true); }
    } finally { if (!signal?.aborted) setLoading(false); }
  }, []);
  useEffect(() => {
    setSearch(window.location.search);
    const controller = new AbortController();
    loadPrices(controller.signal);
    const refresh = window.setInterval(() => loadPrices(controller.signal), 3600000);
    return () => { controller.abort(); window.clearInterval(refresh); };
  }, [loadPrices]);

  function chooseCurrency(value) {
    setCurrency(value);
    const url = new URL(window.location.href); url.searchParams.set("currency", value);
    window.history.replaceState(null, "", url.pathname + url.search + url.hash);
  }
  function unitPrice(tea) {
    if (currency === "VND") return tea.priceVndPerKg;
    if (snapshot?.status !== "fresh" || rateError) return null;
    return snapshot.prices.find(row => row.id === tea.id)?.convertedPerKg?.[currency] ?? null;
  }
  function enquire(teaId, intent = "quote", quantityKg) {
    window.dispatchEvent(new CustomEvent("hl:export-enquiry", { detail: { teaId, intent, quantityKg, currency } }));
  }
  async function copyLink() {
    const attribution = exportAttribution(window.location.search);
    const query = new URLSearchParams({ teas: teas.map(tea => tea.id).join(","), lang: language, currency,
      utm_source: attribution.source === "website" ? "connector" : attribution.source,
      utm_medium: "referral", utm_campaign: attribution.campaign });
    if (attribution.content) query.set("utm_content", attribution.content);
    const url = `${PROFILE_CONTACT.website}/export/taiwan?${query}`;
    try { await navigator.clipboard.writeText(url); setCopied(true); setShareFallback(""); }
    catch { setShareFallback(url); }
  }
  const selectedTea = teas.find(tea => tea.id === estimateTea) || teas[0];
  const numericKg = kg.trim() ? Number(kg) : NaN;
  const validQuantity = Number.isFinite(numericKg) && numericKg > 0 && numericKg <= 2000000;
  const estimate = validQuantity ? convertQuantityPrice(unitPrice(selectedTea), numericKg) : null;
  const pdfHref = PROFILE_PDF[language === "vi" ? "vi" : "en"];
  const companyHref = exportLink("/company", search, language);
  const catalogHref = exportLink("/catalog", search, language);
  const partnerHref = exportLink("/partners/network", search, language);

  return (
    <main className={styles.page} lang={language} data-no-translate>
      <header className={styles.header}>
        <Link href={companyHref} className={styles.wordmark}><span className={styles.seal} aria-hidden="true">皇龍</span><span>Hoàng Long<span className={styles.wordmarkNote}>Vietnam · Export desk</span></span></Link>
        <div className={styles.headerTools}>
          <a className={styles.toolButton} href={EXPORT_SALES_KIT_PDF} download><Download size={16} aria-hidden="true"/>Tải PDF · 4 dòng trà</a>
          <button type="button" onClick={copyLink} className={styles.toolButton}><Copy size={16} aria-hidden="true"/>{copied ? t.actions.copied : t.actions.copyLink}</button>
          <button type="button" onClick={() => window.print()} className={`${styles.toolButton} ${styles.printButton}`}><Printer size={16} aria-hidden="true"/>{t.actions.print}</button>
        </div>
        {shareFallback && <input className={styles.shareFallback} aria-label={t.actions.copyLink} value={shareFallback} readOnly onFocus={e => e.target.select()} />}
      </header>
      <nav className={styles.nav} aria-label={language === "zh-TW" ? "本頁內容" : language === "vi" ? "Nội dung trang" : "On this page"}>
        <a href="#export-prices">{t.nav.prices}</a><a href="#export-process">{t.nav.process}</a><a href="#factory-visit">{t.nav.visit}</a><a href="#export-enquiry">{t.nav.contact}</a>
      </nav>
      <section className={styles.hero} aria-labelledby="export-title">
        <div><p className={styles.eyebrow}>{t.eyebrow}</p><h1 id="export-title">{t.title}</h1><p className={styles.intro}>{t.intro}</p><div className={styles.actions}><a className={styles.primary} href="#export-enquiry" onClick={() => enquire(null, "sample")}>{t.actions.sample}<ArrowUpRight size={18} aria-hidden="true"/></a><a className={styles.button} href="#export-enquiry" onClick={() => enquire(null, "quote")}>{t.actions.quote}</a></div></div>
        <div className={styles.heroAside}>
          <div className={styles.teaPhotos} aria-label="Ảnh trà trong danh mục Hoàng Long">
            <figure><Image src="/export/hong-tra-shan-khoi.jpeg" alt="Trà nguyên lá Hồng Trà Shan Khói trong đĩa thử mẫu" width={1094} height={872} sizes="(min-width: 768px) 22vw, 45vw" loading="eager"/><figcaption>Hồng Trà Shan Khói · ảnh danh mục</figcaption></figure>
            <figure><Image src="/export/luc-tra-hoa-ngoc-lan.jpeg" alt="Trà nguyên lá Lục Trà Hoa Ngọc Lan trong đĩa thử mẫu" width={1179} height={1060} sizes="(min-width: 768px) 22vw, 45vw" loading="eager"/><figcaption>Lục Trà Hoa Ngọc Lan · ảnh danh mục</figcaption></figure>
          </div>
          <p className={styles.photoNote}>Ảnh trà đang công bố trong danh mục của Nhà. Quy cách và lô chào hàng được đối chiếu với mẫu hai bên xác nhận.</p>
          <dl className={styles.facts}>{t.facts.map(fact => <div key={fact.label}><dt>{fact.label}</dt><dd><strong>{fact.value}</strong><p>{fact.note}</p></dd></div>)}</dl>
        </div>
      </section>

      <section className={`${styles.section} ${styles.roles}`} aria-labelledby="roles-title"><div className={styles.sectionHead}><h2 id="roles-title">{t.roles.title}</h2><p>{t.roles.intro}</p></div><dl className={styles.roleRows}>{t.roles.items.map(role => <div key={role.name}><dt>{role.name}</dt><dd>{role.body}</dd></div>)}</dl></section>

      <section className={styles.pricing} id="export-prices" aria-labelledby="prices-title">
        <div className={styles.sectionHead}><div><p className={styles.eyebrow}>EXW · VND / kg</p><h2 id="prices-title">{t.prices.title}</h2><p>{t.prices.intro}</p></div><div className={styles.currencyControl}><span id="currency-label">{t.prices.currency}</span><div role="group" aria-labelledby="currency-label">{EXPORT_CURRENCIES.map(code => <button type="button" key={code} aria-pressed={code === currency} onClick={() => chooseCurrency(code)}>{code === "TWD" ? "TWD · NT$" : code}</button>)}</div></div></div>
        <div className={styles.rateStatus} aria-live="polite"><p>{snapshot ? <>{t.prices.updated}: {timestamp(snapshot.updatedAt, language)} · Việt Nam (UTC+7). {t.prices.daily}</> : (rateError ? t.prices.unavailable : t.prices.daily)}</p><button className={styles.toolButton} type="button" onClick={() => loadPrices()} disabled={loading}><RefreshCw size={15} aria-hidden="true"/>{t.actions.refresh}</button></div>
        {(rateError || snapshot?.status === "stale") && <p role="status" className={styles.warning}>{snapshot?.status === "stale" ? t.prices.stale : t.prices.unavailable}</p>}
        {teas.length < EXPORT_TEAS.length && <p className={styles.selectionNote}>{t.prices.selectedRange}: {teas.length} dòng trà. <Link href="/export/taiwan">{t.actions.fullRange}</Link></p>}
        <div className={styles.priceRows}>{teas.map(tea => <article key={tea.id} className={styles.priceRow}><div><h3>{tea.name[language]}</h3></div><div className={styles.price}><strong>{money(unitPrice(tea), currency, language)}</strong><span>/ kg</span><small>{money(tea.priceVndPerKg, "VND", language)} / kg · EXW</small></div><a href="#export-enquiry" className={styles.sampleLink} onClick={() => enquire(tea.id, "sample")}>{t.actions.sample}<ArrowUpRight size={15} aria-hidden="true"/></a></article>)}</div>
        <p className={styles.priceNote}>{t.prices.teaNote}</p><p className={styles.priceNote}>{t.prices.note}</p><p className={styles.priceNote}>{t.prices.reference}: {EXPORT_PRICE_REVISION}. <a href={sourceUrl} target="_blank" rel="noopener noreferrer">Rates by ExchangeRate-API</a></p>
        <div className={styles.estimator}><label>{t.prices.estimateTeaLabel}<select value={estimateTea} onChange={e => setEstimateTea(e.target.value)}>{teas.map(tea => <option key={tea.id} value={tea.id}>{tea.name[language]}</option>)}</select></label><label>{t.prices.quantity}<input type="number" min="0.01" step="0.01" max="2000000" value={kg} onChange={e => setKg(e.target.value)} inputMode="decimal"/><span>kg</span></label><div className={styles.subtotal}><span>{t.prices.subtotal}</span><output>{money(estimate, currency, language)}</output><a href="#export-enquiry" onClick={() => enquire(estimateTea, "quote", validQuantity ? numericKg : undefined)}>{t.actions.quote}<ArrowUpRight size={15} aria-hidden="true"/></a></div></div>
      </section>

      <section className={styles.photoSection} aria-labelledby="origins-title">
        <figure className={styles.originPhoto}><Image src="/landing/1.jpg" alt={t.origins.caption} fill sizes="(min-width: 900px) 38vw, 100vw"/><figcaption>{t.origins.caption}</figcaption></figure><div className={styles.originCopy}><p className={styles.eyebrow}>Hoàng Long · Vietnam</p><h2 id="origins-title">{t.origins.title}</h2><p>{t.origins.body}</p><ul>{t.origins.facts.map(item => <li key={item}>{item}</li>)}</ul><div className={styles.actions}><a className={styles.button} href={pdfHref} download><Download size={16} aria-hidden="true"/>{t.actions.pdf}</a><Link className={styles.textLink} href={catalogHref}>{t.actions.catalog}<ArrowUpRight size={16} aria-hidden="true"/></Link></div></div>
      </section>

      <section className={styles.section} id="export-process" aria-labelledby="process-title"><div className={styles.sectionHead}><h2 id="process-title">{t.process.title}</h2><p>{t.process.intro}</p></div><ol className={styles.steps}>{t.process.steps.map((step, i) => <li key={step.title}><span className={styles.stepIndex}>{String(i + 1).padStart(2, "0")}</span><div><h3>{step.title}</h3><p><strong>Hoàng Long</strong> — {step.seller}</p><p><strong>Connector</strong> — {step.connector}</p><p><strong>Khách hàng</strong> — {step.buyer}</p><p className={styles.proof}>{step.proof}</p></div></li>)}</ol></section>

      <section className={`${styles.section} ${styles.visit}`} id="factory-visit" aria-labelledby="visit-title"><div className={styles.sectionHead}><div><p className={styles.eyebrow}>{t.nav.visit}</p><h2 id="visit-title">{t.visit.title}</h2></div><p>{t.visit.intro}</p></div><div className={styles.visitGrid}><figure className={styles.factoryPhoto}><Image src="/landing/3.jpg" alt={t.visit.title} width={1024} height={1024} sizes="(min-width: 900px) 45vw, 100vw"/><figcaption>{t.visit.addressNote}</figcaption></figure><div><ul className={styles.checklist}>{t.visit.checklist.map(item => <li key={item}>{item}</li>)}</ul><div className={styles.tests}><h3>{t.visit.testsTitle}</h3><p>{t.visit.testsBody}</p><ul>{t.visit.tests.map(item => <li key={item}>{item}</li>)}</ul></div><a className={styles.button} href="#export-enquiry" onClick={() => enquire(null, "factory_visit")}>{t.actions.visit}<ArrowUpRight size={16} aria-hidden="true"/></a></div></div></section>

      <section className={`${styles.section} ${styles.buyerBrief}`} aria-labelledby="brief-title"><div><h2 id="brief-title">{t.buyerChecklist.title}</h2><p>{t.buyerChecklist.intro}</p></div><ul className={styles.checklist}>{t.buyerChecklist.items.map(item => <li key={item}>{item}</li>)}</ul></section>

      <section className={styles.contact} id="export-contact" aria-labelledby="contact-title"><div className={styles.contactLead}><p className={styles.eyebrow}>Hoàng Long · B2B</p><h2 id="contact-title">{t.contacts.title}</h2><p>{t.contacts.intro}</p><div className={styles.contactLinks}><a href={`mailto:${EMAIL}`}><Mail size={16} aria-hidden="true"/>{EMAIL}</a><a href={`tel:${PROFILE_CONTACT.phone}`}><Phone size={16} aria-hidden="true"/>{PROFILE_CONTACT.phone}</a><a href={PROFILE_CONTACT.zaloUrl} target="_blank" rel="noopener noreferrer">{t.contacts.zaloLabel}<ArrowUpRight size={16} aria-hidden="true"/></a></div><h3>{t.contacts.officeLabel}</h3><address>{PROFILE_CONTACT.address}</address><p>{t.contacts.officeNote}</p><details className={styles.connector}><summary>{t.contacts.connectorTitle}</summary><p>{t.contacts.connectorBody}</p><Link href={partnerHref}>{t.contacts.partnerAction}<ArrowUpRight size={16} aria-hidden="true"/></Link></details></div><div className={styles.enquiry}><ExportEnquiry locale={language} initialCurrency={currency} availableTeaIds={initialTeaIds} compact/></div></section>
      <footer className={styles.footer}><span>House of Hoàng Long · Vietnam</span><a href={pdfHref} download>{t.actions.pdf}</a><Link href="/privacy">{language === "zh-TW" ? "隱私權政策" : language === "vi" ? "Bảo mật thông tin" : "Privacy policy"}</Link></footer>
    </main>
  );
}

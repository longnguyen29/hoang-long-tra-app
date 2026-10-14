"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Copy, Download, Mail, Phone, Printer, RefreshCw } from "lucide-react";
import { EXPORT_TEAS, EXPORT_PRICE_REVISION, EXPORT_CURRENCIES } from "@/lib/export-teas";
import { convertQuantityPrice } from "@/lib/export-exchange";
import { TAIWAN_EXPORT_COPY } from "@/lib/export-taiwan-copy";
import { PROFILE_CONTACT, PROFILE_PDF } from "@/lib/company-profile";
import { exportAttribution, exportLink } from "@/lib/export-enquiry";
import { EXPORT_DELIVERY_WINDOW, EXPORT_SALES_PROFILES } from "@/lib/export-sales-profiles";
import { buildPartnerSalesPageHref, parsePublicPartnerSalesPage, partnerSalesPageProfile } from "@/lib/partner-sales-page";
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

export default function TaiwanExportDesk({ initialTeaIds = EXPORT_TEAS.map(tea => tea.id), initialCurrency = "VND", profile = EXPORT_SALES_PROFILES[0], salesPage = null }) {
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
  const enquiryRef = useRef(null);
  const page = parsePublicPartnerSalesPage(salesPage);
  const partnerContact = page ? partnerSalesPageProfile(page).contact : profile.contact;
  const t = TAIWAN_EXPORT_COPY[language];
  const selectionKey = teas.map(tea => tea.id).join(",");
  useEffect(() => {
    setEstimateTea(current => selectionKey.split(",").includes(current) ? current : selectionKey.split(",")[0]);
    setCopied(false); setShareFallback("");
  }, [selectionKey, profile.id, page?.slug]);
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
    setCopied(false); setShareFallback("");
    const url = new URL(window.location.href); url.searchParams.set("currency", value);
    window.history.replaceState(null, "", url.pathname + url.search + url.hash);
  }
  function unitPrice(tea) {
    if (currency === "VND") return tea.priceVndPerKg;
    if (snapshot?.status !== "fresh" || rateError) return null;
    return snapshot.prices.find(row => row.id === tea.id)?.convertedPerKg?.[currency] ?? null;
  }
  function enquire(teaId, intent = "quote", quantityKg) {
    if (enquiryRef.current) enquiryRef.current.open = true;
    window.dispatchEvent(new CustomEvent("hl:export-enquiry", { detail: { teaId, intent, quantityKg, currency } }));
  }
  async function copyLink() {
    if (page) {
      const url = `${PROFILE_CONTACT.website}${buildPartnerSalesPageHref({ salesPage: page, teaIds: teas.map(tea => tea.id), currency })}`;
      try { await navigator.clipboard.writeText(url); setCopied(true); setShareFallback(""); }
      catch { setShareFallback(url); }
      return;
    }
    const attribution = exportAttribution(window.location.search);
    const query = new URLSearchParams({ teas: teas.map(tea => tea.id).join(","), lang: language, currency,
      utm_source: attribution.source === "website" ? "connector" : attribution.source,
      utm_medium: "referral", utm_campaign: attribution.campaign });
    if (attribution.content) query.set("utm_content", attribution.content);
    if (profile.id !== "house") query.set("profile", profile.id);
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
  const fullRangeQuery = new URLSearchParams(exportLink("/export/taiwan", search, language).split("?")[1]);
  fullRangeQuery.set("currency", currency);
  if (profile.id !== "house") fullRangeQuery.set("profile", profile.id);
  const fullRangeHref = page ? buildPartnerSalesPageHref({ salesPage: page, teaIds: page.tea_ids, currency }) : `/export/taiwan?${fullRangeQuery}`;

  return (
    <main className={styles.page} lang={language} data-no-translate>
      <header className={styles.header}>
        <Link href={companyHref} className={styles.wordmark}><span className={styles.seal} aria-hidden="true">皇龍</span><span>Hoàng Long<span className={styles.wordmarkNote}>Nguồn trà Việt · B2B</span></span></Link>
        <nav className={styles.nav} aria-label="Nội dung trang"><a href="#export-prices">{t.nav.prices}</a><a href="#export-process">Quy trình</a><a href="#export-contact">{t.nav.contact}</a></nav>
      </header>
      <section className={styles.hero} aria-labelledby="export-title">
        <div className={styles.heroCopy}><p className={styles.eyebrow}>{t.eyebrow}</p><h1 id="export-title">Nguồn trà Việt.<br/>Hợp tác dài lâu.</h1><p className={styles.intro}>{t.intro}</p>{partnerContact && <p className={styles.partnerSignature}><strong>{partnerContact.name}</strong><span>{partnerContact.role}{page && ` · ${page.region}`}</span></p>}<div className={styles.actions}><a className={styles.primary} href="#export-contact">{partnerContact ? `Trao đổi với ${partnerContact.name}` : "Trao đổi với Hoàng Long"}<ArrowUpRight size={18} aria-hidden="true"/></a><a className={styles.textLink} href="#export-prices">Xem trà & giá<ArrowUpRight size={16} aria-hidden="true"/></a></div></div>
        <figure className={styles.heroPhoto}><Image src="/export/hong-tra-shan-khoi.jpeg" alt="Lá trà khô Hồng Trà Shan Khói của Hoàng Long" width={1094} height={872} sizes="(min-width: 768px) 48vw, 100vw" loading="eager"/><figcaption>Hồng Trà Shan Khói · ảnh trà trong danh mục của Nhà</figcaption></figure>
      </section>
      <dl className={styles.facts}><div><dt>Công suất tháng</dt><dd><strong>50–100 tấn</strong><p>Tùy dòng trà, tồn kho và lịch sản xuất.</p></dd></div><div><dt>Thời gian giao dịch</dt><dd><strong>{EXPORT_DELIVERY_WINDOW.value}</strong><p>{EXPORT_DELIVERY_WINDOW.note}</p></dd></div><div><dt>Giá đã gồm bao bì tiêu chuẩn</dt><dd><strong>EXW · tại nhà máy</strong><p>Tân Lập, Hà Giang. Cước vận chuyển tính riêng.</p></dd></div></dl>

      <section className={styles.pricing} id="export-prices" aria-labelledby="prices-title">
        <div className={styles.sectionHead}><div><p className={styles.eyebrow}>EXW · VND / kg</p><h2 id="prices-title">{t.prices.title}</h2><p>{t.prices.intro}</p></div><div className={styles.currencyControl}><span id="currency-label">{t.prices.currency}</span><div role="group" aria-labelledby="currency-label">{EXPORT_CURRENCIES.map(code => <button type="button" key={code} aria-pressed={code === currency} onClick={() => chooseCurrency(code)}>{code === "TWD" ? "TWD · NT$" : code}</button>)}</div></div></div>
        <div className={styles.rateStatus} aria-live="polite"><p>{snapshot ? <>{t.prices.updated}: {timestamp(snapshot.updatedAt, language)} · Việt Nam (UTC+7). {t.prices.daily}</> : (rateError ? t.prices.unavailable : t.prices.daily)}</p><button className={styles.toolButton} type="button" onClick={() => loadPrices()} disabled={loading}><RefreshCw size={15} aria-hidden="true"/>{t.actions.refresh}</button></div>
        {(rateError || snapshot?.status === "stale") && <p role="status" className={styles.warning}>{snapshot?.status === "stale" ? t.prices.stale : t.prices.unavailable}</p>}
        {teas.length < (page?.tea_ids.length || EXPORT_TEAS.length) && <p className={styles.selectionNote}>{t.prices.selectedRange}: {teas.length} dòng trà. <Link href={fullRangeHref}>{page ? "Xem các dòng trà trên trang này" : t.actions.fullRange}</Link></p>}
        <div className={styles.priceRows}>{teas.map(tea => <article key={tea.id} className={styles.priceRow}><div><h3>{tea.name[language]}</h3></div><div className={styles.price}><strong>{money(unitPrice(tea), currency, language)}</strong><span>/ kg</span><small>{money(tea.priceVndPerKg, "VND", language)} / kg · EXW</small></div><a href="#export-enquiry" className={styles.sampleLink} onClick={() => enquire(tea.id, "sample")}>{t.actions.sample}<ArrowUpRight size={15} aria-hidden="true"/></a></article>)}</div>
        <p className={styles.priceNote}>{t.prices.teaNote}</p><p className={styles.priceNote}>{t.prices.note}</p><p className={styles.priceNote}>{t.prices.reference}: {EXPORT_PRICE_REVISION}. <a href={sourceUrl} target="_blank" rel="noopener noreferrer">Rates by ExchangeRate-API</a></p>
        <div className={styles.estimator}><label>{t.prices.estimateTeaLabel}<select value={estimateTea} onChange={e => setEstimateTea(e.target.value)}>{teas.map(tea => <option key={tea.id} value={tea.id}>{tea.name[language]}</option>)}</select></label><label>{t.prices.quantity}<input type="number" min="0.01" step="0.01" max="2000000" value={kg} onChange={e => setKg(e.target.value)} inputMode="decimal"/><span>kg</span></label><div className={styles.subtotal}><span>{t.prices.subtotal}</span><output>{money(estimate, currency, language)}</output><a href="#export-enquiry" onClick={() => enquire(estimateTea, "quote", validQuantity ? numericKg : undefined)}>{t.actions.quote}<ArrowUpRight size={15} aria-hidden="true"/></a></div></div>
      </section>

      <section className={styles.photoSection} aria-labelledby="origins-title">
        <figure className={styles.originPhoto}><Image src="/landing/1.jpg" alt={t.origins.caption} fill sizes="(min-width: 900px) 38vw, 100vw"/><figcaption>{t.origins.caption}</figcaption></figure><div className={styles.originCopy}><p className={styles.eyebrow}>Hoàng Long · Vietnam</p><h2 id="origins-title">{t.origins.title}</h2><p>{t.origins.body}</p><ul>{t.origins.facts.map(item => <li key={item}>{item}</li>)}</ul><div className={styles.actions}><a className={styles.button} href={pdfHref} download><Download size={16} aria-hidden="true"/>{t.actions.pdf}</a><Link className={styles.textLink} href={catalogHref}>{t.actions.catalog}<ArrowUpRight size={16} aria-hidden="true"/></Link></div></div>
      </section>

      <section className={styles.section} id="export-process" aria-labelledby="process-title"><div className={styles.sectionHead}><h2 id="process-title">{t.process.title}</h2><p>{t.process.intro}</p></div><ol className={styles.steps}>{t.process.steps.map((step, i) => <li key={step.title}><span className={styles.stepIndex}>{String(i + 1).padStart(2, "0")}</span><div><h3>{step.title}</h3><p>{step.body}</p></div></li>)}</ol></section>

      <section className={`${styles.section} ${styles.visit}`} id="factory-visit" aria-labelledby="visit-title"><div className={styles.sectionHead}><div><p className={styles.eyebrow}>{t.nav.visit}</p><h2 id="visit-title">{t.visit.title}</h2></div><p>{t.visit.intro}</p></div><div className={styles.visitGrid}><figure className={styles.factoryPhoto}><Image src="/landing/3.jpg" alt={t.visit.title} width={1024} height={1024} sizes="(min-width: 900px) 45vw, 100vw"/><figcaption>{t.visit.addressNote}</figcaption></figure><div><ul className={styles.checklist}>{t.visit.checklist.map(item => <li key={item}>{item}</li>)}</ul><div className={styles.tests}><h3>{t.visit.testsTitle}</h3><p>{t.visit.testsBody}</p><ul>{t.visit.tests.map(item => <li key={item}>{item}</li>)}</ul></div><a className={styles.button} href="#export-enquiry" onClick={() => enquire(null, "factory_visit")}>{t.actions.visit}<ArrowUpRight size={16} aria-hidden="true"/></a></div></div></section>

      <section className={styles.contact} id="export-contact" aria-labelledby="contact-title">
        <div className={styles.contactLead}><p className={styles.eyebrow}>Cùng bàn kế hoạch mua hàng</p><h2 id="contact-title">{t.contacts.title}</h2><p>{t.contacts.intro}</p></div>
        <div className={styles.contactCards}>
          {partnerContact && <article className={styles.contactCard}><p className={styles.eyebrow}>{partnerContact.role}</p><h3>{partnerContact.name}</h3><p>Trao đổi nhu cầu, sắp xếp mẫu và kết nối với Hoàng Long.</p><div className={styles.contactLinks}><a href={`tel:${partnerContact.phone}`}><Phone size={17} aria-hidden="true"/>{partnerContact.phoneLabel}</a></div></article>}
          <article className={styles.contactCard}><p className={styles.eyebrow}>Nguồn cung & báo giá</p><h3>Hoàng Long</h3><div className={styles.contactLinks}><a href={`tel:${PROFILE_CONTACT.phone}`}><Phone size={17} aria-hidden="true"/>{PROFILE_CONTACT.phoneLabel}</a><a href={PROFILE_CONTACT.zaloUrl} target="_blank" rel="noopener noreferrer">{t.contacts.zaloLabel}<ArrowUpRight size={16} aria-hidden="true"/></a><a href={`mailto:${EMAIL}`}><Mail size={16} aria-hidden="true"/>{EMAIL}</a></div><address>{PROFILE_CONTACT.address}</address><p>{t.contacts.officeNote}</p></article>
        </div>
        <details ref={enquiryRef} className={styles.enquiry}><summary>Gửi nhu cầu để Hoàng Long liên hệ</summary><ExportEnquiry key={page ? `${page.slug}-${page.revision}` : profile.id} locale={language} initialCurrency={currency} availableTeaIds={initialTeaIds} partnerPage={page ? { slug: page.slug, revision: page.revision, display_name: page.display_name } : null} presentationProfileId={page ? undefined : profile.id} compact/></details>
        <details className={styles.briefDetails}><summary>Chuẩn bị gì cho buổi trao đổi?</summary><p>{t.buyerChecklist.intro}</p><ul className={styles.checklist}>{t.buyerChecklist.items.map(item => <li key={item}>{item}</li>)}</ul></details>
        <div className={styles.documents}><h3>Tài liệu gửi khách</h3><div className={styles.documentActions}><a className={styles.button} href={page ? EXPORT_SALES_PROFILES[0].pdf : profile.pdf} download><Download size={16} aria-hidden="true"/>{page ? "PDF Hoàng Long · bản chung" : "Tải bộ chào hàng PDF"}</a><button type="button" onClick={copyLink} className={styles.toolButton}><Copy size={16} aria-hidden="true"/>{copied ? t.actions.copied : t.actions.copyLink}</button><button type="button" onClick={() => window.print()} className={styles.toolButton}><Printer size={16} aria-hidden="true"/>{t.actions.print}</button></div><p>{page ? `PDF tải sẵn là bản chung của Hoàng Long, chưa kèm liên hệ ${partnerContact.name}. Để lưu trang có tên, điện thoại và các dòng trà đang chọn, dùng “In / lưu PDF”.` : `PDF tổng quan gồm 4 dòng trà, giá gốc VND${partnerContact ? ` và liên hệ ${partnerContact.name}` : ""}. Để lưu đúng các dòng trà và tiền tệ đang chọn, dùng “In / lưu PDF”.`}</p>{shareFallback && <input className={styles.shareFallback} aria-label={t.actions.copyLink} value={shareFallback} readOnly onFocus={e => e.target.select()} />}</div>
      </section>
      <footer className={styles.footer}><span>House of Hoàng Long · Vietnam</span><a href={pdfHref} download>{t.actions.pdf}</a><Link href="/privacy">{language === "zh-TW" ? "隱私權政策" : language === "vi" ? "Bảo mật thông tin" : "Privacy policy"}</Link></footer>
    </main>
  );
}

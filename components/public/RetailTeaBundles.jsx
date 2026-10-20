"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, ChevronDown, ShoppingBag } from "lucide-react";
import { RETAIL_BUNDLES, RETAIL_BUNDLE_PURPOSES, RETAIL_BUNDLE_TIMES, resolveRetailBundle } from "@/lib/retail-bundles";
import { retailProductFacts, retailProductHref } from "@/lib/retail-catalog";
import { sellingUnitLabel } from "@/lib/selling-units";
import { useRetailCart } from "./RetailCartProvider";
import styles from "./RetailTeaBundles.module.css";

const EMPTY_PRODUCTS = [];
const EMPTY_CART = {};
const NOTE_LIMIT = 300;
const money = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 });
const COPY = {
  vi: {
    eyebrow: "Chọn trà cùng nhau", title: "Một bộ trà, đúng dịp của bạn", detailTitle: "Thử cùng trà bạn đang xem",
    intro: "Nhà ghép các quy cách hiện có thành gợi ý cho từng dịp. Thêm cả bộ, rồi chỉnh số lượng từng món trong giỏ theo ý bạn.",
    detailIntro: "Những bộ dưới đây có trà bạn đang xem. Mỗi món vẫn có thể chỉnh riêng trong giỏ.",
    purpose: "Bạn chọn trà để…", budget: "Ngân sách tiền trà", time: "Lúc nào bạn dùng trà?", allPurposes: "Mọi nhu cầu", allBudgets: "Mọi mức giá", allTimes: "Mọi thời điểm",
    lowBudget: "Dưới 500.000 ₫", midBudget: "500.000–1.000.000 ₫", highBudget: "Trên 1.000.000 ₫",
    filterNote: "Ngân sách tính theo tổng giá các món trà hiện tại.", results: (count) => `${count} bộ trà từ danh mục hiện có`, reset: "Xóa bộ lọc",
    audience: "Hợp với", occasion: "Dịp dùng", contents: "Các món trong bộ", total: "Tổng giá trà", noPrice: "Chưa đủ giá để tính tổng",
    extraCost: "Chưa gồm hộp quà và phí giao hàng.", editable: "Bạn có thể chỉnh từng món trong giỏ.", inCart: "Trong giỏ",
    add: "Thêm cả bộ vào giỏ", adding: "Đang thêm bộ trà…", cannotAdd: "Chưa thể thêm cả bộ", viewCart: "Mở giỏ hàng", added: "Đã thêm các món trong bộ vào giỏ.",
    loading: "Đang kiểm tra giá và quy cách hiện có.", catalogError: "Chưa tải được danh mục. Vui lòng tải lại trang để kiểm tra giá và quy cách.",
    unavailable: "Một quy cách trong bộ hiện chưa đặt được. Bạn có thể xem từng món để chọn quy cách khác.",
    stockLimit: "Một món không còn đủ số lượng để thêm cả bộ. Bạn có thể chỉnh giỏ hoặc chọn từng món.",
    cartLimit: "Một món trong giỏ đã đạt giới hạn số lượng. Mở giỏ để điều chỉnh trước khi thêm bộ.",
    empty: "Chưa có bộ trà hiện tại phù hợp với lựa chọn này.", emptyHint: "Thử mức giá hoặc thời điểm khác; các bộ đang chuẩn bị ở bên dưới có thể phù hợp với bạn.",
    showAll: (count) => `Xem đủ ${count} bộ trà`, showLess: "Thu gọn còn 3 bộ", viewAll: "Xem tất cả bộ trà",
    plannedTitle: "Các bộ đang chuẩn bị", plannedCount: (count) => `${count} gợi ý`,
    plannedIntro: "Những gợi ý này chưa mở bán, chưa có giá và quy cách cuối cùng. Bạn có thể đăng ký để Nhà liên hệ khi có thông tin phù hợp.",
    plannedBudget: "Các bộ đang chuẩn bị chưa có giá xác nhận; bộ lọc ngân sách chỉ áp dụng cho các bộ từ danh mục hiện có.",
    plannedBadge: "Đang chuẩn bị", plannedContents: "Thành phần dự kiến", register: "Đăng ký quan tâm", closeForm: "Đóng đăng ký", interestFor: "Đăng ký quan tâm bộ trà",
    interestNote: "Đây là đăng ký quan tâm, chưa phải đơn đặt hàng hay báo giá đã xác nhận.",
    name: "Tên của bạn", contact: "Số điện thoại hoặc email", note: "Lời nhắn", optional: "không bắt buộc", noteHint: "Ví dụ: dịp dùng trà, số người hoặc cách bạn muốn được liên hệ.",
    consent: "Tôi đồng ý để Nhà dùng thông tin này liên hệ về bộ trà đã chọn.", privacyLink: "Chính sách bảo mật", send: "Gửi đăng ký quan tâm", sending: "Đang gửi đăng ký…", sent: "Đã gửi đăng ký",
    success: "Nhà đã nhận đăng ký quan tâm của bạn.", reference: "Mã đăng ký", invalidName: "Nhập tên để Nhà tiện xưng hô với bạn.",
    invalidContact: "Nhập số điện thoại hoặc địa chỉ email hợp lệ để Nhà có thể phản hồi.", consentRequired: "Vui lòng đồng ý để Nhà liên hệ về bộ trà này trước khi gửi.",
    rateLimited: "Bạn đã gửi nhiều đăng ký trong thời gian ngắn. Vui lòng thử lại sau khoảng 30 phút.", invalidRequest: "Kiểm tra lại thông tin trong biểu mẫu rồi gửi lại.",
    enquiryUnavailable: "Chưa gửi được đăng ký. Giữ nguyên thông tin và thử gửi lại sau.",
  },
  en: {
    eyebrow: "Choose teas together", title: "A tea set for your occasion", detailTitle: "Try alongside this tea",
    intro: "The house brings current packs together for different occasions. Add the set, then adjust each item in your cart.",
    detailIntro: "These sets include the tea you are viewing. Each item can still be adjusted in your cart.",
    purpose: "What is the tea for?", budget: "Tea budget", time: "When will you enjoy it?", allPurposes: "Every purpose", allBudgets: "Every price", allTimes: "Any time",
    lowBudget: "Under 500,000 ₫", midBudget: "500,000–1,000,000 ₫", highBudget: "Over 1,000,000 ₫",
    filterNote: "The budget uses the current total price of the tea items.", results: (count) => `${count} tea ${count === 1 ? "set" : "sets"} from the current catalogue`, reset: "Clear filters",
    audience: "For", occasion: "When", contents: "Items in the set", total: "Tea total", noPrice: "A complete price is not available",
    extraCost: "Gift boxes and delivery are not included.", editable: "You can adjust each item in your cart.", inCart: "In cart",
    add: "Add the set to cart", adding: "Adding the tea set…", cannotAdd: "Set cannot be added yet", viewCart: "Open cart", added: "The items in this set have been added to your cart.",
    loading: "Checking current prices and packs.", catalogError: "The catalogue could not be loaded. Reload the page to check prices and packs.",
    unavailable: "A pack in this set cannot be ordered right now. Explore each tea to choose a different pack.",
    stockLimit: "There is not enough of one item to add the full set. You can adjust your cart or choose individual items.",
    cartLimit: "An item in your cart has reached its quantity limit. Open your cart to adjust it before adding the set.",
    empty: "No current tea sets match these choices.", emptyHint: "Try another budget or occasion, or explore the sets being prepared below.",
    showAll: (count) => `Explore all ${count} tea sets`, showLess: "Show only 3 sets", viewAll: "Explore all tea sets",
    plannedTitle: "Tea sets being prepared", plannedCount: (count) => `${count} ${count === 1 ? "idea" : "ideas"}`,
    plannedIntro: "These ideas are not on sale yet. Prices and final packs are unconfirmed. Register your interest so the house can contact you when relevant details are available.",
    plannedBudget: "Prices for these sets are unconfirmed. The budget filter applies only to sets from the current catalogue.",
    plannedBadge: "Being prepared", plannedContents: "Proposed contents", register: "Register interest", closeForm: "Close registration", interestFor: "Register interest in this tea set",
    interestNote: "This registers your interest. It is not an order or a confirmed quote.",
    name: "Your name", contact: "Phone number or email", note: "Message", optional: "optional", noteHint: "For example: your occasion, number of people or preferred way to be contacted.",
    consent: "I agree that the house may use these details to contact me about the selected tea set.", privacyLink: "Privacy policy", send: "Send interest registration", sending: "Sending registration…", sent: "Registration sent",
    success: "The house has received your interest registration.", reference: "Registration reference", invalidName: "Enter your name so the house knows how to address you.",
    invalidContact: "Enter a valid phone number or email address so the house can respond.", consentRequired: "Please agree to be contacted about this tea set before sending.",
    rateLimited: "Several registrations were sent in a short time. Please try again in about 30 minutes.", invalidRequest: "Check the information in the form, then send it again.",
    enquiryUnavailable: "Your registration could not be sent. Keep your details unchanged and try again later.",
  },
};

function localText(value, locale) {
  return typeof value === "string" ? value : value?.[locale] || value?.vi || "";
}

function reasonMessage(reason, copy) {
  return ({ loading: copy.loading, catalog_error: copy.catalogError, unavailable: copy.unavailable, stock_limit: copy.stockLimit, cart_limit: copy.cartLimit })[reason] || copy.unavailable;
}

function matchesBudget(subtotal, budget) {
  if (budget === "all") return true;
  if (!Number.isFinite(subtotal)) return false;
  if (budget === "low") return subtotal < 500000;
  if (budget === "mid") return subtotal >= 500000 && subtotal <= 1000000;
  return subtotal > 1000000;
}

function BundleLine({ line, cartQty, locale, copy }) {
  const [failedPhoto, setFailedPhoto] = useState("");
  const facts = retailProductFacts(line.product, locale);
  const photoUrl = line.product.photoUrl;
  const unit = sellingUnitLabel(line.unit, locale);
  const weight = line.weight?.trim();
  const showWeight = weight && !["vi", "en"].some((language) => weight === `1 ${sellingUnitLabel(line.unit, language)}`);
  return <li className={styles.item}>
    <Link href={retailProductHref(line.product.id, locale)} className={styles.itemLink}>
      {photoUrl && failedPhoto !== photoUrl
        ? <img className={styles.photo} src={photoUrl} alt="" loading="lazy" style={{ objectPosition: line.product.photoPosition || "center" }} onError={() => setFailedPhoto(photoUrl)}/>
        : <span className={styles.photoFallback} aria-hidden="true">皇龍</span>}
      <span className={styles.itemCopy}>
        <strong>{facts.name}</strong>
        <span>{line.qty} {unit}{showWeight ? ` · ${weight}` : ""}</span>
        {Number.isFinite(line.price) && <small>{money.format(line.price)} / {unit}</small>}
        {cartQty > 0 && <small className={styles.inCart}>{copy.inCart}: {cartQty} {unit}</small>}
      </span>
      <ArrowRight size={15} aria-hidden="true"/>
    </Link>
  </li>;
}

function ReadyBundle({ resolved, cart, locale, catalogStatus, addBundle, openCart, copy }) {
  const { bundle, lines, subtotal } = resolved;
  const id = useId();
  const inFlight = useRef(false);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const ready = catalogStatus === "ready";
  const canAdd = ready && resolved.canAdd && typeof addBundle === "function";
  const reason = catalogStatus === "loading" ? "loading" : catalogStatus === "error" ? "catalog_error" : resolved.reason;
  const message = feedback?.ok ? copy.added : feedback ? reasonMessage(feedback.reason, copy) : !canAdd ? reasonMessage(reason, copy) : "";

  async function add() {
    if (!canAdd || inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setFeedback(null);
    try {
      const result = await addBundle(bundle.id);
      setFeedback({ ok: Boolean(result?.ok), reason: result?.reason || "unavailable" });
    } catch {
      setFeedback({ ok: false, reason: "unavailable" });
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  return <article className={styles.card} aria-labelledby={`${id}-title`}>
    <div className={styles.cardHeading}>
      <p className={styles.occasion}>{localText(bundle.occasion, locale)}</p>
      <h3 id={`${id}-title`}>{localText(bundle.name, locale)}</h3>
      <p className={styles.description}>{localText(bundle.description, locale)}</p>
      <p className={styles.audience}><span>{copy.audience}</span>{localText(bundle.audience, locale)}</p>
    </div>
    {lines.length > 0 && <ul className={styles.items} aria-label={copy.contents}>{lines.map((line) => <BundleLine key={line.key} line={line} cartQty={cart[line.key] || 0} locale={locale} copy={copy}/>)}</ul>}
    <div className={styles.cardFooter}>
      <p className={styles.total}><span>{copy.total}</span>{Number.isFinite(subtotal) ? <strong>{money.format(subtotal)}</strong> : <small>{copy.noPrice}</small>}</p>
      <p className={styles.costNote}>{copy.extraCost}</p>
      <button type="button" className={styles.primary} onClick={add} disabled={!canAdd || busy} aria-describedby={`${id}-message ${id}-editable`}>
        <ShoppingBag size={17} aria-hidden="true"/>{busy ? copy.adding : canAdd ? copy.add : copy.cannotAdd}
      </button>
      <p id={`${id}-editable`} className={styles.editable}>{copy.editable}</p>
      <div className={styles.feedback} id={`${id}-message`} aria-live="polite" aria-atomic="true" data-success={feedback?.ok || undefined}>
        {message && <p>{feedback?.ok && <Check size={15} aria-hidden="true"/>}{message}</p>}
        {typeof openCart === "function" && (feedback?.ok || reason === "stock_limit" || reason === "cart_limit" || feedback?.reason === "stock_limit" || feedback?.reason === "cart_limit") && <button type="button" className={styles.textButton} onClick={openCart}>{copy.viewCart}<ArrowRight size={15} aria-hidden="true"/></button>}
      </div>
    </div>
  </article>;
}

function validContact(value) {
  const contact = value.trim();
  if (contact.includes("@")) return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact);
  return /^\+?[\d\s().-]+$/.test(contact) && contact.replace(/\D/g, "").length >= 8 && contact.replace(/\D/g, "").length <= 15;
}

function InterestForm({ bundle, locale, copy }) {
  const id = useId();
  const requestId = useRef(null);
  const inFlight = useRef(false);
  const nameInput = useRef(null);
  const contactInput = useRef(null);
  const consentInput = useRef(null);
  const [form, setForm] = useState({ name: "", contact: "", note: "", consent: false });
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const sent = Boolean(feedback?.ok);

  function update(field, value) {
    requestId.current = null;
    setFeedback(null);
    setForm((current) => ({ ...current, [field]: value }));
  }

  function fail(message, field) {
    setFeedback({ ok: false, message, field });
    ({ name: nameInput, contact: contactInput, consent: consentInput })[field]?.current?.focus();
  }

  async function submit(event) {
    event.preventDefault();
    if (inFlight.current || sent) return;
    if (!form.name.trim()) return fail(copy.invalidName, "name");
    if (!validContact(form.contact)) return fail(copy.invalidContact, "contact");
    if (!form.consent) return fail(copy.consentRequired, "consent");
    if (!requestId.current) {
      if (typeof globalThis.crypto?.randomUUID !== "function") return fail(copy.enquiryUnavailable);
      requestId.current = globalThis.crypto.randomUUID();
    }
    inFlight.current = true;
    setBusy(true);
    setFeedback(null);
    try {
      const response = await fetch("/api/retail-bundle-enquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: requestId.current, bundleId: bundle.id, name: form.name.trim(), contact: form.contact.trim(), note: form.note.trim(), consent: true }),
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok && data.ok === true) {
        setFeedback({ ok: true, reference: data.reference || "" });
      } else {
        const code = data.error || data.code || data.reason;
        if (code === "consent_required") fail(copy.consentRequired, "consent");
        else if (code === "invalid_contact") fail(copy.invalidContact, "contact");
        else if (code === "rate_limited" || response.status === 429) fail(copy.rateLimited);
        else if (code === "invalid_request") fail(copy.invalidRequest);
        else fail(copy.enquiryUnavailable);
      }
    } catch {
      fail(copy.enquiryUnavailable);
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  return <form className={styles.interestForm} onSubmit={submit} noValidate aria-label={`${copy.interestFor}: ${localText(bundle.name, locale)}`}>
    <p className={styles.interestNote}>{copy.interestNote}</p>
    <div className={styles.field}>
      <label htmlFor={`${id}-name`}>{copy.name}</label>
      <input ref={nameInput} id={`${id}-name`} name="name" autoComplete="name" value={form.name} onChange={(event) => update("name", event.target.value)} required maxLength={80} disabled={busy || sent} aria-invalid={feedback?.field === "name" || undefined} aria-describedby={feedback?.field === "name" ? `${id}-feedback` : undefined}/>
    </div>
    <div className={styles.field}>
      <label htmlFor={`${id}-contact`}>{copy.contact}</label>
      <input ref={contactInput} id={`${id}-contact`} name="contact" type="text" autoComplete="off" value={form.contact} onChange={(event) => update("contact", event.target.value)} required maxLength={120} disabled={busy || sent} aria-invalid={feedback?.field === "contact" || undefined} aria-describedby={feedback?.field === "contact" ? `${id}-feedback` : undefined}/>
    </div>
    <div className={styles.field}>
      <label htmlFor={`${id}-note`}>{copy.note} <small>({copy.optional})</small></label>
      <textarea id={`${id}-note`} name="note" rows={3} value={form.note} onChange={(event) => update("note", event.target.value)} maxLength={NOTE_LIMIT} disabled={busy || sent} aria-describedby={`${id}-note-hint`}/>
      <p id={`${id}-note-hint`} className={styles.fieldHint}>{copy.noteHint} <span>{form.note.length}/{NOTE_LIMIT}</span></p>
    </div>
    <label className={styles.consent} htmlFor={`${id}-consent`}>
      <input ref={consentInput} id={`${id}-consent`} name="consent" type="checkbox" checked={form.consent} onChange={(event) => update("consent", event.target.checked)} required disabled={busy || sent} aria-invalid={feedback?.field === "consent" || undefined} aria-describedby={feedback?.field === "consent" ? `${id}-feedback` : undefined}/>
      <span>{copy.consent}</span>
    </label>
    <p className={styles.privacy}><Link href="/privacy">{copy.privacyLink}</Link></p>
    <button className={styles.primary} type="submit" disabled={busy || sent}>{sent ? <Check size={17} aria-hidden="true"/> : <ArrowRight size={17} aria-hidden="true"/>}{busy ? copy.sending : sent ? copy.sent : copy.send}</button>
    <div id={`${id}-feedback`} className={styles.formFeedback} role={feedback && !feedback.ok ? "alert" : "status"} aria-live="polite" aria-atomic="true" data-success={sent || undefined}>
      {feedback && (sent ? <><p>{copy.success}</p>{feedback.reference && <p>{copy.reference}: <strong>{feedback.reference}</strong></p>}</> : <p>{feedback.message}</p>)}
    </div>
  </form>;
}

function PlannedBundle({ bundle, locale, copy }) {
  const id = useId();
  const [formOpen, setFormOpen] = useState(false);
  const proposed = localText(bundle.plannedContents, locale);
  return <article className={styles.plannedCard} aria-labelledby={`${id}-title`}>
    <span className={styles.plannedBadge}>{copy.plannedBadge}</span>
    <h3 id={`${id}-title`}>{localText(bundle.name, locale)}</h3>
    <p className={styles.description}>{localText(bundle.description, locale)}</p>
    <p className={styles.audience}><span>{copy.audience}</span>{localText(bundle.audience, locale)}</p>
    {proposed && <div className={styles.proposed}><strong>{copy.plannedContents}</strong><p>{proposed}</p></div>}
    <p className={styles.plannedOccasion}><span>{copy.occasion}</span>{localText(bundle.occasion, locale)}</p>
    <button type="button" className={styles.secondary} aria-expanded={formOpen} aria-controls={`${id}-form`} onClick={() => setFormOpen((current) => !current)}>{formOpen ? copy.closeForm : copy.register}<ChevronDown size={17} aria-hidden="true"/></button>
    <div id={`${id}-form`} hidden={!formOpen}><InterestForm bundle={bundle} locale={locale} copy={copy}/></div>
  </article>;
}

export default function RetailTeaBundles({ locale = "vi", productId = null, compact = false }) {
  const language = locale === "en" ? "en" : "vi";
  const copy = COPY[language];
  const id = useId();
  const sectionRef = useRef(null);
  const retail = useRetailCart();
  const products = retail?.products || EMPTY_PRODUCTS;
  const cart = retail?.cart || EMPTY_CART;
  const catalogStatus = retail?.catalogStatus || "loading";
  const isCompact = compact || Boolean(productId);
  useEffect(() => {
    if (!isCompact && window.location.hash === "#tea-bundles") sectionRef.current?.scrollIntoView({ behavior: "auto", block: "start" });
  }, [isCompact]);
  const [purpose, setPurpose] = useState("all");
  const [budget, setBudget] = useState("all");
  const [time, setTime] = useState("all");
  const [expanded, setExpanded] = useState(false);
  const resolved = useMemo(() => RETAIL_BUNDLES.filter((bundle) => bundle.ready && (!productId || bundle.components.some((component) => String(component.productId) === String(productId)))).map((bundle) => resolveRetailBundle(bundle, products, cart)), [products, cart, productId]);
  const matchesOccasion = (bundle) => (purpose === "all" || bundle.purposes.includes(purpose)) && (time === "all" || bundle.times.includes(time));
  const matching = isCompact ? resolved : resolved.filter((entry) => matchesOccasion(entry.bundle) && matchesBudget(entry.subtotal, budget));
  const planned = isCompact ? [] : RETAIL_BUNDLES.filter((bundle) => !bundle.ready && matchesOccasion(bundle));
  const visible = matching.slice(0, expanded && !isCompact ? matching.length : 3);
  const hasFilters = purpose !== "all" || budget !== "all" || time !== "all";
  const reset = () => { setPurpose("all"); setBudget("all"); setTime("all"); setExpanded(false); };
  const filter = (setValue, value) => { setValue(value); setExpanded(false); };
  const shopHref = `/shop${language === "en" ? "?lang=en" : ""}#tea-bundles`;

  if (isCompact && resolved.length === 0) return null;

  return <section ref={sectionRef} className={`${styles.section}${isCompact ? ` ${styles.compact}` : ""}`} id={isCompact ? undefined : "tea-bundles"} aria-labelledby={`${id}-title`}>
    <div className={styles.heading}>
      <div><p className={styles.eyebrow}>{copy.eyebrow}</p><h2 id={`${id}-title`}>{isCompact ? copy.detailTitle : copy.title}</h2></div>
      <p className={styles.intro}>{isCompact ? copy.detailIntro : copy.intro}</p>
    </div>
    {!isCompact && <div className={styles.toolbar}>
      <div className={styles.filters}>
        <label htmlFor={`${id}-purpose`}><span>{copy.purpose}</span><select id={`${id}-purpose`} value={purpose} onChange={(event) => filter(setPurpose, event.target.value)}><option value="all">{copy.allPurposes}</option>{RETAIL_BUNDLE_PURPOSES.map((option) => <option key={option.id} value={option.id}>{localText(option.name, language)}</option>)}</select></label>
        <label htmlFor={`${id}-budget`}><span>{copy.budget}</span><select id={`${id}-budget`} value={budget} onChange={(event) => filter(setBudget, event.target.value)}><option value="all">{copy.allBudgets}</option><option value="low">{copy.lowBudget}</option><option value="mid">{copy.midBudget}</option><option value="high">{copy.highBudget}</option></select></label>
        <label htmlFor={`${id}-time`}><span>{copy.time}</span><select id={`${id}-time`} value={time} onChange={(event) => filter(setTime, event.target.value)}><option value="all">{copy.allTimes}</option>{RETAIL_BUNDLE_TIMES.map((option) => <option key={option.id} value={option.id}>{localText(option.name, language)}</option>)}</select></label>
      </div>
      <div className={styles.filterFooter}><p>{copy.filterNote}</p>{hasFilters && <button className={styles.textButton} type="button" onClick={reset}>{copy.reset}</button>}</div>
      <p className={styles.resultCount} aria-live="polite">{copy.results(matching.length)}</p>
    </div>}
    {matching.length > 0 ? <div className={styles.grid} id={`${id}-sets`}>{visible.map((entry) => <ReadyBundle key={entry.bundle.id} resolved={entry} cart={cart} locale={language} catalogStatus={catalogStatus} addBundle={retail?.addBundle} openCart={retail?.openCart} copy={copy}/>)}</div> : <div className={styles.empty}><h3>{copy.empty}</h3><p>{copy.emptyHint}</p>{hasFilters && <button type="button" className={styles.secondary} onClick={reset}>{copy.reset}<ArrowRight size={16} aria-hidden="true"/></button>}</div>}
    {!isCompact && matching.length > 3 && <button type="button" className={styles.expand} aria-expanded={expanded} aria-controls={`${id}-sets`} onClick={() => setExpanded((current) => !current)}>{expanded ? copy.showLess : copy.showAll(matching.length)}<ChevronDown size={18} aria-hidden="true"/></button>}
    {isCompact && <Link href={shopHref} className={styles.allLink}>{copy.viewAll}<ArrowRight size={17} aria-hidden="true"/></Link>}
    {!isCompact && planned.length > 0 && <details className={styles.planned}>
      <summary><span><strong>{copy.plannedTitle}</strong><small>{copy.plannedCount(planned.length)}</small></span><ChevronDown size={20} aria-hidden="true"/></summary>
      <div className={styles.plannedBody}>
        <p className={styles.plannedIntro}>{copy.plannedIntro}</p>
        {budget !== "all" && <p className={styles.plannedBudget}>{copy.plannedBudget}</p>}
        <div className={styles.plannedGrid}>{planned.map((bundle) => <PlannedBundle key={bundle.id} bundle={bundle} locale={language} copy={copy}/>)}</div>
      </div>
    </details>}
  </section>;
}

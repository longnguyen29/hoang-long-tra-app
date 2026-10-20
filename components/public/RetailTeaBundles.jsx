"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, ChevronDown, ShoppingBag } from "lucide-react";
import { RETAIL_BUNDLES, RETAIL_BUNDLE_PURPOSES, RETAIL_BUNDLE_TIMES, resolveRetailBundleFamilies } from "@/lib/retail-bundles";
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
    intro: "Chọn bộ hợp cách uống của bạn, xem rõ từng gói rồi thêm cả bộ vào giỏ.",
    detailIntro: "Những bộ dưới đây có trà bạn đang xem. Mỗi món vẫn có thể chỉnh riêng trong giỏ.",
    purpose: "Bạn chọn trà để…", budget: "Ngân sách tiền trà", time: "Lúc nào bạn dùng trà?", allPurposes: "Mọi nhu cầu", allBudgets: "Mọi mức giá", allTimes: "Mọi thời điểm",
    lowBudget: "Dưới 500.000 ₫", midBudget: "500.000–1.000.000 ₫", highBudget: "Trên 1.000.000 ₫",
    filterNote: "Ngân sách tính theo tổng giá các món trà hiện tại. Với bộ có lựa chọn, chỉ những lựa chọn trong ngân sách mới chọn được.", results: (main, other) => `${main + other} lựa chọn · ${main} gợi ý chính${other ? ` · ${other} trong các nhóm bên dưới` : ""}`, reset: "Xóa bộ lọc",
    lotusChoice: "Chọn trà sen", lotusThree: "Sen 3 Lần", lotusSeven: "Sen 7 Lần", outsideBudget: "Ngoài bộ lọc đã chọn", equipment: "Dụng cụ cần có",
    specialistTitle: "Đào sâu một dòng trà", specialistIntro: "Pha riêng hai lựa chọn trà sen để tự đối chiếu cảm nhận.", replenishmentTitle: "Bổ sung trà cho nơi quen thuộc", replenishmentIntro: "Các gói lớn dành cho người đã biết nhu cầu uống trà ở nhà hoặc trong nhóm làm việc.", groupCount: (count) => `${count} lựa chọn`, otherMatches: "Các lựa chọn phù hợp nằm trong nhóm bên dưới.",
    comparePacks: "Cùng trà, hai cách chọn gói", viewPacks: "Xem các quy cách", plannedOpen: (count) => `Mở ${count} gợi ý đang chuẩn bị`,
    tradeTitle: "Bạn thử trà cho quán?", tradeIntro: "Trao đổi về mẫu thử theo công thức và dụng cụ của quán.", tradeLink: "Trao đổi nhu cầu thử trà",
    audience: "Hợp với", occasion: "Dịp dùng", contents: "Các món trong bộ", total: "Tổng giá trà", noPrice: "Chưa đủ giá để tính tổng",
    extraCost: "Chỉ gồm các gói trà, không kèm hộp quà. Phí giao tính riêng.", editable: "Bạn có thể chỉnh từng món trong giỏ.", inCart: "Trong giỏ",
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
    intro: "Choose a set for the way you enjoy tea, see the exact packs and add the set to your cart.",
    detailIntro: "These sets include the tea you are viewing. Each item can still be adjusted in your cart.",
    purpose: "What is the tea for?", budget: "Tea budget", time: "When will you enjoy it?", allPurposes: "Every purpose", allBudgets: "Every price", allTimes: "Any time",
    lowBudget: "Under 500,000 ₫", midBudget: "500,000–1,000,000 ₫", highBudget: "Over 1,000,000 ₫",
    filterNote: "The budget uses current tea prices. For sets with a choice, only options within your budget can be selected.", results: (main, other) => `${main + other} ${main + other === 1 ? "choice" : "choices"} · ${main} featured${other ? ` · ${other} in the groups below` : ""}`, reset: "Clear filters",
    lotusChoice: "Choose the lotus tea", lotusThree: "3-times lotus", lotusSeven: "7-times lotus", outsideBudget: "Outside the selected filters", equipment: "Equipment to have",
    specialistTitle: "Explore one tea more closely", specialistIntro: "Brew the two lotus teas separately and compare your impressions.", replenishmentTitle: "Replenish tea for familiar places", replenishmentIntro: "Larger packs for people who already know their tea needs at home or within an established office group.", groupCount: (count) => `${count} ${count === 1 ? "choice" : "choices"}`, otherMatches: "Matching choices are in the groups below.",
    comparePacks: "The same tea, two pack choices", viewPacks: "Explore the packs", plannedOpen: (count) => `Explore ${count} ideas being prepared`,
    tradeTitle: "Trying tea for your café?", tradeIntro: "Discuss tea trials for your café’s recipes and equipment.", tradeLink: "Discuss your tea trial",
    audience: "For", occasion: "When", contents: "Items in the set", total: "Tea total", noPrice: "A complete price is not available",
    extraCost: "Tea packs only, without a gift box. Delivery is calculated separately.", editable: "You can adjust each item in your cart.", inCart: "In cart",
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

function choiceLabel(bundle, locale, copy) {
  if (bundle.components?.some((component) => component.productId === "tra-gao-sen-7-lan") && bundle.id !== "lotus-comparison") return copy.lotusSeven;
  if (bundle.components?.some((component) => component.productId === "tra-gao-sen-3-lan") && bundle.id !== "lotus-comparison") return copy.lotusThree;
  return localText(bundle.name, locale);
}

function ReadyBundle({ family, resolved, choices, onChoose, alternative, cart, locale, catalogStatus, addBundle, openCart, copy }) {
  const { bundle, lines, subtotal } = resolved;
  const id = useId();
  const inFlight = useRef(false);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const ready = catalogStatus === "ready";
  const canAdd = ready && resolved.canAdd && typeof addBundle === "function";
  const reason = catalogStatus === "loading" ? "loading" : catalogStatus === "error" ? "catalog_error" : resolved.reason;
  const choiceFeedback = feedback?.bundleId === bundle.id ? feedback : null;
  const message = choiceFeedback?.ok ? copy.added : choiceFeedback ? reasonMessage(choiceFeedback.reason, copy) : !canAdd ? reasonMessage(reason, copy) : "";
  const pairing = localText(bundle.pairingReason, locale);
  const equipment = localText(bundle.equipment, locale);
  const isLotusFamily = family.id === "lotus-and-white";
  const alternativeLine = Number.isFinite(subtotal) && alternative?.canAdd && alternative.lines[0];

  async function add() {
    if (!canAdd || inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setFeedback(null);
    try {
      const result = await addBundle(bundle.id);
      setFeedback({ bundleId: bundle.id, ok: Boolean(result?.ok), reason: result?.reason || "unavailable" });
    } catch {
      setFeedback({ bundleId: bundle.id, ok: false, reason: "unavailable" });
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  return <article className={styles.card} aria-labelledby={`${id}-title`}>
    <div className={styles.cardHeading}>
      <p className={styles.occasion}>{localText(bundle.occasion, locale)}</p>
      <h3 id={`${id}-title`}>{localText(family.name, locale)}</h3>
      {isLotusFamily && (choices.length > 1 ? <fieldset className={styles.choices} disabled={busy}>
        <legend>{copy.lotusChoice}</legend>
        <div>{choices.map((choice) => <label key={choice.resolved.bundle.id} className={styles.choice} data-selected={bundle.id === choice.resolved.bundle.id || undefined} data-disabled={!choice.eligible || undefined}>
          <input type="radio" name={`${id}-choice`} value={choice.resolved.bundle.id} checked={bundle.id === choice.resolved.bundle.id} disabled={!choice.eligible} onChange={() => { setFeedback(null); onChoose(choice.resolved.bundle.id); }}/>
          <span><strong>{choiceLabel(choice.resolved.bundle, locale, copy)}</strong><small>{Number.isFinite(choice.resolved.subtotal) ? money.format(choice.resolved.subtotal) : copy.noPrice}</small>{!choice.eligible && <small>{copy.outsideBudget}</small>}</span>
        </label>)}</div>
      </fieldset> : <p className={styles.selectedChoice}>{choiceLabel(bundle, locale, copy)}</p>)}
      <p className={styles.description}>{pairing || localText(bundle.description, locale)}</p>
      <p className={styles.audience}><span>{copy.audience}</span>{localText(bundle.audience, locale)}</p>
      {equipment && <p className={styles.equipment}><span>{copy.equipment}</span>{equipment}</p>}
    </div>
    {lines.length > 0 && <ul className={styles.items} aria-label={copy.contents}>{lines.map((line) => <BundleLine key={line.key} line={line} cartQty={cart[line.key] || 0} locale={locale} copy={copy}/>)}</ul>}
    {ready && alternativeLine && <aside className={styles.packComparison} aria-label={copy.comparePacks}>
      <strong>{copy.comparePacks}</strong>
      <p><span>{lines.map((line) => `${line.qty} × ${line.weight}`).join(" + ")}</span><span>{money.format(subtotal)}</span></p>
      <Link href={retailProductHref(alternativeLine.product.id, locale)}><span>{alternativeLine.qty} × {alternativeLine.weight}</span><span>{money.format(alternative.subtotal)}</span><small>{copy.viewPacks}<ArrowRight size={14} aria-hidden="true"/></small></Link>
    </aside>}
    <div className={styles.cardFooter}>
      <p className={styles.total}><span>{copy.total}</span>{Number.isFinite(subtotal) ? <strong>{money.format(subtotal)}</strong> : <small>{copy.noPrice}</small>}</p>
      <p className={styles.costNote}>{copy.extraCost}</p>
      <button type="button" className={styles.primary} onClick={add} disabled={!canAdd || busy} aria-describedby={`${id}-message ${id}-editable`}>
        <ShoppingBag size={17} aria-hidden="true"/>{busy ? copy.adding : canAdd ? copy.add : copy.cannotAdd}
      </button>
      <p id={`${id}-editable`} className={styles.editable}>{copy.editable}</p>
      <div className={styles.feedback} id={`${id}-message`} aria-live="polite" aria-atomic="true" data-success={choiceFeedback?.ok || undefined}>
        {message && <p>{choiceFeedback?.ok && <Check size={15} aria-hidden="true"/>}{message}</p>}
        {typeof openCart === "function" && (choiceFeedback?.ok || reason === "stock_limit" || reason === "cart_limit" || choiceFeedback?.reason === "stock_limit" || choiceFeedback?.reason === "cart_limit") && <button type="button" className={styles.textButton} onClick={openCart}>{copy.viewCart}<ArrowRight size={15} aria-hidden="true"/></button>}
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
  const pairing = localText(bundle.pairingReason, locale);
  const equipment = localText(bundle.equipment, locale);
  return <article className={styles.plannedCard} aria-labelledby={`${id}-title`}>
    <span className={styles.plannedBadge}>{copy.plannedBadge}</span>
    <h3 id={`${id}-title`}>{localText(bundle.name, locale)}</h3>
    <p className={styles.description}>{pairing || localText(bundle.description, locale)}</p>
    <p className={styles.audience}><span>{copy.audience}</span>{localText(bundle.audience, locale)}</p>
    {equipment && <p className={styles.equipment}><span>{copy.equipment}</span>{equipment}</p>}
    {proposed && <div className={styles.proposed}><strong>{copy.plannedContents}</strong><p>{proposed}</p></div>}
    <p className={styles.plannedOccasion}><span>{copy.occasion}</span>{localText(bundle.occasion, locale)}</p>
    <button type="button" className={styles.secondary} aria-expanded={formOpen} aria-controls={`${id}-form`} onClick={() => setFormOpen((current) => !current)}>{formOpen ? copy.closeForm : copy.register}<ChevronDown size={17} aria-hidden="true"/></button>
    <div id={`${id}-form`} hidden={!formOpen}><InterestForm bundle={bundle} locale={locale} copy={copy}/></div>
  </article>;
}

function bundlePlacement(bundle) {
  return bundle.placement || "archived";
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
  const [selections, setSelections] = useState({});
  const matching = useMemo(() => resolveRetailBundleFamilies(products, cart, {
    productId, compact, purpose, budget, time, selections,
  }), [products, cart, productId, compact, purpose, budget, time, selections]);
  const matchesOccasion = (bundle) => (purpose === "all" || bundle.purposes.includes(purpose)) && (time === "all" || bundle.times.includes(time));
  const featured = matching.filter((entry) => entry.placement === "featured");
  const specialist = matching.filter((entry) => entry.placement === "specialist");
  const replenishment = matching.filter((entry) => entry.placement === "replenishment");
  const planned = isCompact ? [] : RETAIL_BUNDLES.filter((bundle) => !bundle.ready && bundlePlacement(bundle) === "planned" && matchesOccasion(bundle));
  const priorityPlanned = planned.find((bundle) => bundle.id === "find-your-taste") || planned[0];
  const hasFilters = purpose !== "all" || budget !== "all" || time !== "all";
  const reset = () => { setPurpose("all"); setBudget("all"); setTime("all"); };
  const shopHref = `/shop${language === "en" ? "?lang=en" : ""}#tea-bundles`;
  const tradeHref = `/wholesale?intent=sample${language === "en" ? "&lang=en" : ""}#trade-brief`;
  const renderCard = (entry) => <ReadyBundle key={entry.family.id} family={entry.family} resolved={entry.resolved} choices={entry.choices} onChoose={(bundleId) => setSelections((current) => ({ ...current, [entry.family.id]: bundleId }))} alternative={entry.alternative} cart={cart} locale={language} catalogStatus={catalogStatus} addBundle={retail?.addBundle} openCart={retail?.openCart} copy={copy}/>;
  const renderGroup = (entries, title, intro) => entries.length > 0 && <details className={styles.group} open={hasFilters || undefined}>
    <summary><span><strong>{title}</strong><small>{copy.groupCount(entries.length)}</small></span><ChevronDown size={20} aria-hidden="true"/></summary>
    <div className={styles.groupBody}><p className={styles.groupIntro}>{intro}</p><div className={`${styles.grid} ${styles.groupGrid}${entries.length === 1 ? ` ${styles.singleGrid}` : ""}`}>{entries.map(renderCard)}</div></div>
  </details>;

  if (isCompact && matching.length === 0) return null;

  return <section ref={sectionRef} className={`${styles.section}${isCompact ? ` ${styles.compact}` : ""}`} id={isCompact ? undefined : "tea-bundles"} aria-labelledby={`${id}-title`}>
    <div className={styles.heading}>
      <div><p className={styles.eyebrow}>{copy.eyebrow}</p><h2 id={`${id}-title`}>{isCompact ? copy.detailTitle : copy.title}</h2></div>
      <p className={styles.intro}>{isCompact ? copy.detailIntro : copy.intro}</p>
    </div>
    {!isCompact && <div className={styles.toolbar}>
      <div className={styles.filters}>
        <label htmlFor={`${id}-purpose`}><span>{copy.purpose}</span><select id={`${id}-purpose`} value={purpose} onChange={(event) => setPurpose(event.target.value)}><option value="all">{copy.allPurposes}</option>{RETAIL_BUNDLE_PURPOSES.filter((option) => !["cafe", "travel"].includes(option.id)).map((option) => <option key={option.id} value={option.id}>{localText(option.name, language)}</option>)}</select></label>
        <label htmlFor={`${id}-budget`}><span>{copy.budget}</span><select id={`${id}-budget`} value={budget} onChange={(event) => setBudget(event.target.value)}><option value="all">{copy.allBudgets}</option><option value="low">{copy.lowBudget}</option><option value="mid">{copy.midBudget}</option><option value="high">{copy.highBudget}</option></select></label>
        <label htmlFor={`${id}-time`}><span>{copy.time}</span><select id={`${id}-time`} value={time} onChange={(event) => setTime(event.target.value)}><option value="all">{copy.allTimes}</option>{RETAIL_BUNDLE_TIMES.map((option) => <option key={option.id} value={option.id}>{localText(option.name, language)}</option>)}</select></label>
      </div>
      <div className={styles.filterFooter}><p>{copy.filterNote}</p>{hasFilters && <button className={styles.textButton} type="button" onClick={reset}>{copy.reset}</button>}</div>
      <p className={styles.resultCount} aria-live="polite">{copy.results(featured.length, specialist.length + replenishment.length)}</p>
    </div>}
    {isCompact ? <><div className={styles.grid}>{matching.slice(0, 3).map(renderCard)}</div><Link href={shopHref} className={styles.allLink}>{copy.viewAll}<ArrowRight size={17} aria-hidden="true"/></Link></> : <>
      {featured.length > 0 ? <div className={styles.grid}>{featured.map(renderCard)}</div> : matching.length > 0 ? <p className={styles.filteredHint}>{copy.otherMatches}</p> : <div className={styles.empty}><h3>{copy.empty}</h3><p>{copy.emptyHint}</p>{hasFilters && <button type="button" className={styles.secondary} onClick={reset}>{copy.reset}<ArrowRight size={16} aria-hidden="true"/></button>}</div>}
      {renderGroup(specialist, copy.specialistTitle, copy.specialistIntro)}
      {renderGroup(replenishment, copy.replenishmentTitle, copy.replenishmentIntro)}
      {planned.length > 0 && <details className={`${styles.group} ${styles.planned}`}>
        <summary><span><small>{copy.plannedTitle}</small><strong>{localText(priorityPlanned.name, language)}</strong><small>{copy.plannedOpen(planned.length)}</small></span><ChevronDown size={20} aria-hidden="true"/></summary>
        <div className={styles.plannedBody}>
          <p className={styles.plannedIntro}>{copy.plannedIntro}</p>
          {budget !== "all" && <p className={styles.plannedBudget}>{copy.plannedBudget}</p>}
          <div className={styles.plannedGrid}>{planned.map((bundle) => <PlannedBundle key={bundle.id} bundle={bundle} locale={language} copy={copy}/>)}</div>
        </div>
      </details>}
      <div className={styles.tradePrompt}><div><strong>{copy.tradeTitle}</strong><p>{copy.tradeIntro}</p></div><Link href={tradeHref}>{copy.tradeLink}<ArrowRight size={17} aria-hidden="true"/></Link></div>
    </>}
  </section>;
}

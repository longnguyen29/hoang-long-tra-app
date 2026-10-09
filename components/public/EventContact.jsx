"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowRight, Check, Copy, Download, MapPin, MessageCircle, Phone, QrCode } from "lucide-react";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { composeEventMessage, EVENT_CONTACT, eventAttribution, eventLink } from "@/lib/event-contact";
import styles from "./EventContact.module.css";

const COPY = {
  vi: {
    home: "Nhà Hoàng Long", eyebrow: "Hội chợ · Gặp gỡ đối tác", title: "Rất vui được", titleEnd: "gặp bạn.",
    intro: "Trà Việt cho quán, nhà phân phối và doanh nghiệp. Giữ liên hệ để tiếp tục thử trà, trao đổi công thức và nhu cầu cung ứng.",
    zalo: "Nhắn Zalo", save: "Lưu danh bạ", details: "Liên hệ trực tiếp", office: "Văn phòng & kho",
    visit: "Bạn có thể ghé uống trà và trao đổi nhu cầu. Vui lòng gọi trước để sắp xếp.", directions: "Chỉ đường",
    next: "Từ cuộc gặp đến lần thử tiếp theo", catalogue: "Xem danh mục trà", sample: "Đăng ký bộ mẫu cho quán",
    catalogueBody: "Chọn dòng trà phù hợp với sản phẩm của bạn.", sampleBody: "Pha thử trong công thức thực tế trước khi nhập sỉ.",
    formTitle: "Tiếp tục trao đổi", formBody: "Chọn nhu cầu và để lại thông tin để Hoàng Long liên hệ, cùng bạn trao đổi bước tiếp theo.",
    intent: "Bạn muốn trao đổi về", intents: { sample: "Thử mẫu", quote: "Báo giá", cooperation: "Hợp tác" },
    name: "Tên của bạn", business: "Quán / doanh nghiệp", contact: "Số điện thoại hoặc email", note: "Nhu cầu của bạn",
    optional: "Không bắt buộc", noteHint: "Loại trà, đồ uống, lượng dự kiến hoặc điều muốn hỏi…", prepare: "Soạn lời nhắn Zalo · tuỳ chọn",
    submit: "Gửi nhu cầu cho Hoàng Long", sending: "Đang gửi nhu cầu…", sent: "Đã gửi nhu cầu",
    consent: "Tôi đồng ý để Hoàng Long lưu thông tin trên và liên hệ trả lời nhu cầu này.",
    privacy: "Thông tin được dùng để lưu yêu cầu và trả lời bạn. Bạn cũng có thể chỉ nhắn Zalo qua nút ở trên.",
    savedTitle: "Hoàng Long đã nhận nhu cầu của bạn.", reference: "Mã yêu cầu", savedBody: "Yêu cầu đã được lưu. Hoàng Long sẽ liên hệ qua thông tin bạn để lại. Nhắn Zalo là tuỳ chọn.", savedHelp: "Sửa thông tin bên dưới để gửi một yêu cầu khác.",
    draftTitle: "Lời nhắn Zalo của bạn", edit: "Sửa thông tin / gửi nhu cầu khác", copy: "Sao chép tin nhắn", copied: "Đã sao chép. Mở Zalo, dán nội dung và bấm Gửi.",
    copyFailed: "Chưa sao chép được. Chọn nội dung bên dưới và sao chép thủ công, rồi dán vào Zalo.",
    open: "Mở Zalo để gửi · tuỳ chọn", draftHelp: "Bạn kiểm tra, sao chép rồi dán và gửi trong Zalo. Soạn lời nhắn này không lưu yêu cầu hoặc tự gửi tin nhắn.", savedDraftHelp: "Yêu cầu đã được lưu. Nếu muốn nhắn thêm qua Zalo, bạn kiểm tra, sao chép rồi dán và gửi trong cuộc trò chuyện.",
    qr: "QR cho gian hàng", qrBody: "Một mã để mở trang liên hệ này, lưu danh bạ và trao đổi sau cuộc gặp.", qrOpen: "Mở thẻ QR để in",
    privacyLink: "Quyền riêng tư", jump: "Gửi nhu cầu", vcardHelp: "Danh thiếp gồm số điện thoại, website và địa chỉ văn phòng.", required: "Điền tên và số điện thoại hoặc email để tiếp tục.",
    errors: { invalid_contact: "Kiểm tra lại số điện thoại hoặc email để Hoàng Long có thể liên hệ với bạn.", invalid_request: "Kiểm tra thông tin trong biểu mẫu rồi thử gửi lại.", consent_required: "Vui lòng đồng ý lưu thông tin để gửi nhu cầu. Bạn vẫn có thể chỉ nhắn Zalo.", rate_limited: "Bạn đã gửi nhiều yêu cầu trong thời gian ngắn. Vui lòng chờ một lúc rồi thử lại.", unavailable: "Chưa xác nhận được yêu cầu đã lưu. Thông tin vẫn ở đây; bạn có thể thử gửi lại hoặc liên hệ trực tiếp." },
  },
  en: {
    home: "House of Hoàng Long", eyebrow: "Tea shows · Trade connections", title: "A pleasure to", titleEnd: "meet you.",
    intro: "Vietnamese tea for cafés, distributors and businesses. Keep in touch to explore teas, recipes and supply requirements.",
    zalo: "Chat on Zalo", save: "Save contact", details: "Direct contact", office: "Office & warehouse",
    visit: "Visit for tea and a conversation about your requirements. Please call ahead to arrange your visit.", directions: "Directions",
    next: "From our meeting to your next tea trial", catalogue: "Browse the tea catalogue", sample: "Request a café sample set",
    catalogueBody: "Find a tea suited to the products you make.", sampleBody: "Test in your actual recipe before ordering wholesale.",
    formTitle: "Continue the conversation", formBody: "Tell us what you need and leave your details so Hoàng Long can contact you about the next step.",
    intent: "What would you like to discuss?", intents: { sample: "Samples", quote: "Pricing", cooperation: "Partnership" },
    name: "Your name", business: "Café / company", contact: "Phone or email", note: "Your requirements",
    optional: "Optional", noteHint: "Tea, drinks, expected volume or a question…", prepare: "Prepare a Zalo message · optional",
    submit: "Send your enquiry to Hoàng Long", sending: "Sending your enquiry…", sent: "Enquiry sent",
    consent: "I agree that Hoàng Long may save these details and contact me about this enquiry.",
    privacy: "Your details are used to save and respond to your enquiry. You can also contact us only on Zalo using the button above.",
    savedTitle: "Hoàng Long has received your enquiry.", reference: "Enquiry reference", savedBody: "Your enquiry has been saved. Hoàng Long will contact you using the details you provided. Messaging on Zalo is optional.", savedHelp: "Edit the details below to send another enquiry.",
    draftTitle: "Your Zalo message", edit: "Edit details / send another enquiry", copy: "Copy message", copied: "Copied. Open Zalo, paste the message and tap Send.",
    copyFailed: "Could not copy. Select and copy the text below manually, then paste it into Zalo.",
    open: "Open Zalo to send · optional", draftHelp: "Review and copy the message, then paste and send it in Zalo. Preparing this message does not save an enquiry or send it automatically.", savedDraftHelp: "Your enquiry has been saved. If you would like to follow up on Zalo, review and copy this message, then paste and send it in the conversation.",
    qr: "QR for your stand", qrBody: "One code to open this contact page, save our details and reconnect after a meeting.", qrOpen: "Open printable QR card",
    privacyLink: "Privacy", jump: "Send an enquiry", vcardHelp: "The contact card contains our phone, website and office address.", required: "Add your name and phone or email to continue.",
    errors: { invalid_contact: "Check your phone number or email so Hoàng Long can contact you.", invalid_request: "Check the form details and try sending again.", consent_required: "Please agree to save your details before submitting. You can still contact us only on Zalo.", rate_limited: "You have sent several enquiries in a short time. Please wait a little and try again.", unavailable: "We could not confirm that your enquiry was saved. Your details are still here; you can try again or contact us directly." },
  },
};

const initial = { name: "", business: "", contact: "", intent: "sample", note: "", website: "" };
const mapUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent("Trà Hoàng Long, 36B QL2A, Sóc Sơn, Hà Nội, Việt Nam")}`;

export default function EventContact() {
  const { locale, toggleLocale } = useLocale();
  const t = COPY[locale] || COPY.vi;
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(initial);
  const [draft, setDraft] = useState("");
  const [prepared, setPrepared] = useState(false);
  const [copyStatus, setCopyStatus] = useState("");
  const [error, setError] = useState("");
  const [consent, setConsent] = useState(false);
  const [sending, setSending] = useState(false);
  const [saved, setSaved] = useState(null);
  const requestId = useRef("");
  const inFlight = useRef(false);
  const formElement = useRef(null);
  const draftHeading = useRef(null);
  const savedHeading = useRef(null);
  const wasPrepared = useRef(false);
  useEffect(() => { setSearch(window.location.search); }, []);
  useEffect(() => {
    if (prepared || wasPrepared.current) {
      draftHeading.current?.focus({ preventScroll: true });
      draftHeading.current?.scrollIntoView({ block: "nearest" });
    }
    wasPrepared.current = prepared;
  }, [prepared]);
  useEffect(() => {
    if (saved) {
      savedHeading.current?.focus({ preventScroll: true });
      savedHeading.current?.scrollIntoView({ block: "nearest" });
    }
  }, [saved]);
  useEffect(() => {
    const field = error === "consent_required" ? "consent"
      : error === "invalid_contact" ? "contact"
      : error === "required" ? (!form.name.trim() ? "name" : "contact") : "";
    if (field) formElement.current?.elements.namedItem(field)?.focus();
  }, [error, form.name, form.contact]);

  const resetSubmission = () => { requestId.current = ""; setError(""); setSaved(null); };
  const update = (field, value) => {
    if (inFlight.current) return;
    setForm((current) => ({ ...current, [field]: value }));
    resetSubmission();
  };
  const submit = async (event) => {
    event.preventDefault();
    if (inFlight.current || saved) return;
    if (!form.name.trim() || !form.contact.trim()) { setError("required"); return; }
    if (!consent) { setError("consent_required"); return; }
    inFlight.current = true;
    setSending(true);
    setError("");
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 20000);
    try {
      if (!requestId.current) requestId.current = crypto.randomUUID();
      const response = await fetch("/api/event-enquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({ ...form, requestId: requestId.current, consent: true, website: form.website, attribution: eventAttribution(search) }),
      });
      const result = await response.json();
      if (response.ok && result.ok === true && result.requestId === requestId.current && /^HL-E-[a-f0-9]{8}$/i.test(result.reference || "")) {
        setSaved({ reference: result.reference, requestId: result.requestId });
        setCopyStatus("");
      } else {
        setError(Object.hasOwn(t.errors, result.error) ? result.error : "unavailable");
      }
    } catch { setError("unavailable"); }
    finally { window.clearTimeout(timeout); inFlight.current = false; setSending(false); }
  };
  const prepare = (event) => {
    event.preventDefault();
    if (inFlight.current) return;
    if (!form.name.trim() || !form.contact.trim()) { setError("required"); return; }
    setError("");
    setDraft(composeEventMessage(form, locale));
    setPrepared(true);
    setCopyStatus("");
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(draft);
      setCopyStatus("copied");
    } catch { setCopyStatus("failed"); }
  };

  return <main className={styles.page} data-no-translate>
    <header className={styles.header}>
      <Link href="/" className={styles.brand}><span aria-hidden="true">皇龍</span><span>Hoàng Long<small>{t.home}</small></span></Link>
      <button type="button" onClick={toggleLocale} aria-label={locale === "vi" ? "Switch to English" : "Chuyển sang tiếng Việt"}>{locale === "vi" ? "EN" : "VI"}</button>
    </header>

    <div className={styles.workspace}>
      <section className={styles.identity} aria-labelledby="meet-title">
        <p className={styles.eyebrow}>{t.eyebrow}</p>
        <h1 id="meet-title">{t.title}<br/><em>{t.titleEnd}</em></h1>
        <p className={styles.intro}>{t.intro}</p>
        <div className={styles.actions}>
          <a className={styles.zalo} href={EVENT_CONTACT.zaloUrl} target="_blank" rel="noreferrer"><MessageCircle aria-hidden="true"/>{t.zalo}<ArrowRight aria-hidden="true"/></a>
          <a className={styles.save} href="/events/hoang-long.vcf" download="hoang-long.vcf"><Download aria-hidden="true"/>{t.save}</a>
        </div>
        <p className={styles.vcardHint}>{t.vcardHelp}</p>
        <a href="#message" className={styles.jump}>{t.jump}<ArrowDown size={16} aria-hidden="true"/></a>
        <div className={styles.contactDetails}>
          <h2>{t.details}</h2>
          <a className={styles.phone} href={`tel:${EVENT_CONTACT.phone}`}><Phone size={18} aria-hidden="true"/>{EVENT_CONTACT.phoneLabel}</a>
          <div className={styles.address}><MapPin size={18} aria-hidden="true"/><div><strong>{t.office}</strong><p>{EVENT_CONTACT.address}</p><p>{t.visit}</p><a href={mapUrl} target="_blank" rel="noreferrer">{t.directions}<ArrowRight size={15} aria-hidden="true"/></a></div></div>
        </div>
      </section>

      <section className={styles.message} id="message" aria-labelledby="message-title">
        <p className={styles.eyebrow}>Hoàng Long · {EVENT_CONTACT.phoneLabel}</p>
        {saved && <div className={styles.saved} role="status">
          <h3 tabIndex={-1} ref={savedHeading}><Check size={18} aria-hidden="true"/>{t.savedTitle}</h3>
          <p>{t.savedBody}</p><p className={styles.reference}>{t.reference}: <strong>{saved.reference}</strong></p>
          {!prepared && <p>{t.savedHelp}</p>}
        </div>}
        {!prepared ? <>
          <h2 id="message-title" tabIndex={-1} ref={draftHeading}>{t.formTitle}</h2><p className={styles.formIntro}>{t.formBody}</p>
          <form ref={formElement} onSubmit={submit} noValidate aria-busy={sending}>
            <label className={styles.honeypot} aria-hidden="true">Website<input type="text" name="website" tabIndex={-1} autoComplete="off" disabled={sending} value={form.website} onChange={(event) => update("website", event.target.value)}/></label>
            <fieldset className={styles.intents} disabled={sending}><legend>{t.intent}</legend><div>{Object.entries(t.intents).map(([key, label]) => <label key={key} data-selected={form.intent === key}><input type="radio" name="event-intent" value={key} checked={form.intent === key} onChange={() => update("intent", key)}/><span>{label}</span></label>)}</div></fieldset>
            <label className={styles.field}><span>{t.name}</span><input name="name" required autoComplete="name" maxLength={80} disabled={sending} aria-invalid={error === "required" && !form.name.trim()} aria-describedby={error === "required" ? "enquiry-error" : undefined} value={form.name} onChange={(e) => update("name", e.target.value)}/></label>
            <label className={styles.field}><span>{t.business}<small>{t.optional}</small></span><input name="organization" autoComplete="organization" maxLength={120} disabled={sending} value={form.business} onChange={(e) => update("business", e.target.value)}/></label>
            <label className={styles.field}><span>{t.contact}</span><input name="contact" required maxLength={120} disabled={sending} aria-invalid={error === "invalid_contact" || (error === "required" && !form.contact.trim())} aria-describedby={error === "invalid_contact" || error === "required" ? "enquiry-error" : undefined} value={form.contact} onChange={(e) => update("contact", e.target.value)}/></label>
            <label className={styles.field}><span>{t.note}<small>{t.optional}</small></span><textarea name="note" maxLength={700} rows={3} placeholder={t.noteHint} disabled={sending} value={form.note} onChange={(e) => update("note", e.target.value)}/></label>
            <label className={styles.consent}><input type="checkbox" name="consent" required checked={consent} disabled={sending} aria-invalid={error === "consent_required"} aria-describedby={error === "consent_required" ? "enquiry-error" : undefined} onChange={(event) => { if (inFlight.current) return; setConsent(event.target.checked); resetSubmission(); }}/><span>{t.consent}</span></label>
            <button className={styles.primary} type="submit" disabled={sending || Boolean(saved)}>{sending ? t.sending : saved ? t.sent : t.submit}{saved ? <Check size={18} aria-hidden="true"/> : !sending && <ArrowRight size={18} aria-hidden="true"/>}</button>
            {sending && <p className={styles.pending} role="status">{t.sending}</p>}
            {error && <p className={styles.error} id="enquiry-error" role="alert">{error === "required" ? t.required : t.errors[error]}</p>}
            <p className={styles.privacy}>{t.privacy} <Link href="/privacy">{t.privacyLink}</Link></p>
            <button className={styles.optionalZalo} type="button" disabled={sending} onClick={prepare}><MessageCircle size={17} aria-hidden="true"/>{t.prepare}</button>
          </form>
        </> : <div className={styles.draft}>
          <h2 id="message-title" tabIndex={-1} ref={draftHeading}>{t.draftTitle}</h2><p>{saved ? t.savedDraftHelp : t.draftHelp}</p>
          <label className={styles.field}><span>{t.draftTitle}</span><textarea rows={10} maxLength={1600} value={draft} onChange={(event) => { setDraft(event.target.value); setCopyStatus(""); }}/></label>
          <button type="button" className={styles.primary} onClick={copy} disabled={!draft.trim()}>{copyStatus === "copied" ? <Check size={18} aria-hidden="true"/> : <Copy size={18} aria-hidden="true"/>}{t.copy}</button>
          {copyStatus && <p className={styles.copyStatus} role="status" data-error={copyStatus === "failed"}>{copyStatus === "copied" ? t.copied : t.copyFailed}</p>}
          <a className={styles.openZalo} href={EVENT_CONTACT.zaloUrl} target="_blank" rel="noreferrer"><MessageCircle size={18} aria-hidden="true"/>{t.open}<ArrowRight size={18} aria-hidden="true"/></a>
          <button className={styles.edit} type="button" onClick={() => { setPrepared(false); setCopyStatus(""); }}>{t.edit}</button>
        </div>}
      </section>
    </div>

    <section className={styles.next} aria-labelledby="next-title"><h2 id="next-title">{t.next}</h2><div>
      <Link href={eventLink("/catalog", search)}><span>{t.catalogue}<ArrowRight size={19} aria-hidden="true"/></span><p>{t.catalogueBody}</p></Link>
      <Link href={eventLink("/sample", search)}><span>{t.sample}<ArrowRight size={19} aria-hidden="true"/></span><p>{t.sampleBody}</p></Link>
    </div></section>
    <footer className={styles.footer}><div><QrCode aria-hidden="true"/><div><strong>{t.qr}</strong><p>{t.qrBody}</p></div></div><Link href="/meet/qr">{t.qrOpen}<ArrowRight size={16} aria-hidden="true"/></Link></footer>
  </main>;
}

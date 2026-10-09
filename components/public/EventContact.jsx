"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowRight, Check, Copy, Download, MapPin, MessageCircle, Phone, QrCode } from "lucide-react";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { composeEventMessage, EVENT_CONTACT, eventLink } from "@/lib/event-contact";
import styles from "./EventContact.module.css";

const COPY = {
  vi: {
    home: "Nhà Hoàng Long", eyebrow: "Hội chợ · Gặp gỡ đối tác", title: "Rất vui được", titleEnd: "gặp bạn.",
    intro: "Trà Việt cho quán, nhà phân phối và doanh nghiệp. Giữ liên hệ để tiếp tục thử trà, trao đổi công thức và nhu cầu cung ứng.",
    zalo: "Nhắn Zalo", save: "Lưu danh bạ", details: "Liên hệ trực tiếp", office: "Văn phòng & kho",
    visit: "Bạn có thể ghé uống trà và trao đổi nhu cầu. Vui lòng gọi trước để sắp xếp.", directions: "Chỉ đường",
    next: "Từ cuộc gặp đến lần thử tiếp theo", catalogue: "Xem danh mục trà", sample: "Đăng ký bộ mẫu cho quán",
    catalogueBody: "Chọn dòng trà phù hợp với sản phẩm của bạn.", sampleBody: "Pha thử trong công thức thực tế trước khi nhập sỉ.",
    formTitle: "Tiếp tục trao đổi", formBody: "Chọn nhu cầu và soạn một lời nhắn ngắn để gửi cho Hoàng Long qua Zalo.",
    intent: "Bạn muốn trao đổi về", intents: { sample: "Thử mẫu", quote: "Báo giá", cooperation: "Hợp tác" },
    name: "Tên của bạn", business: "Quán / doanh nghiệp", contact: "Số điện thoại hoặc email", note: "Nhu cầu của bạn",
    optional: "Không bắt buộc", noteHint: "Loại trà, đồ uống, lượng dự kiến hoặc điều muốn hỏi…", prepare: "Soạn tin nhắn",
    privacy: "Bạn kiểm tra nội dung, sao chép rồi dán vào Zalo. Trang này không tự gửi tin nhắn hoặc lưu thông tin thành yêu cầu trong hệ thống.",
    draftTitle: "Lời nhắn của bạn", edit: "Sửa thông tin", copy: "Sao chép tin nhắn", copied: "Đã sao chép. Mở Zalo, dán nội dung và bấm Gửi.",
    copyFailed: "Chưa sao chép được. Chọn nội dung bên dưới và sao chép thủ công, rồi dán vào Zalo.",
    open: "Mở Zalo để gửi", draftHelp: "Zalo chưa nhận nội dung này. Bạn cần dán và gửi trong cuộc trò chuyện.",
    qr: "QR cho gian hàng", qrBody: "Một mã để mở trang liên hệ này, lưu danh bạ và trao đổi sau cuộc gặp.", qrOpen: "Mở thẻ QR để in",
    privacyLink: "Quyền riêng tư", jump: "Soạn lời nhắn", vcardHelp: "Danh thiếp gồm số điện thoại, website và địa chỉ văn phòng.", required: "Điền tên và số điện thoại hoặc email trước khi soạn tin nhắn.",
  },
  en: {
    home: "House of Hoàng Long", eyebrow: "Tea shows · Trade connections", title: "A pleasure to", titleEnd: "meet you.",
    intro: "Vietnamese tea for cafés, distributors and businesses. Keep in touch to explore teas, recipes and supply requirements.",
    zalo: "Chat on Zalo", save: "Save contact", details: "Direct contact", office: "Office & warehouse",
    visit: "Visit for tea and a conversation about your requirements. Please call ahead to arrange your visit.", directions: "Directions",
    next: "From our meeting to your next tea trial", catalogue: "Browse the tea catalogue", sample: "Request a café sample set",
    catalogueBody: "Find a tea suited to the products you make.", sampleBody: "Test in your actual recipe before ordering wholesale.",
    formTitle: "Continue the conversation", formBody: "Choose what you need and prepare a short message for Hoàng Long on Zalo.",
    intent: "What would you like to discuss?", intents: { sample: "Samples", quote: "Pricing", cooperation: "Partnership" },
    name: "Your name", business: "Café / company", contact: "Phone or email", note: "Your requirements",
    optional: "Optional", noteHint: "Tea, drinks, expected volume or a question…", prepare: "Prepare message",
    privacy: "Review the message, copy it and paste it into Zalo. This page does not send it or save it as an enquiry in our system.",
    draftTitle: "Your message", edit: "Edit details", copy: "Copy message", copied: "Copied. Open Zalo, paste the message and tap Send.",
    copyFailed: "Could not copy. Select and copy the text below manually, then paste it into Zalo.",
    open: "Open Zalo to send", draftHelp: "Zalo has not received this message. Paste and send it in the conversation.",
    qr: "QR for your stand", qrBody: "One code to open this contact page, save our details and reconnect after a meeting.", qrOpen: "Open printable QR card",
    privacyLink: "Privacy", jump: "Prepare a message", vcardHelp: "The contact card contains our phone, website and office address.", required: "Add your name and phone or email before preparing the message.",
  },
};

const initial = { name: "", business: "", contact: "", intent: "sample", note: "" };
const mapUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent("Trà Hoàng Long, 36B QL2A, Sóc Sơn, Hà Nội, Việt Nam")}`;

export default function EventContact() {
  const { locale, toggleLocale } = useLocale();
  const t = COPY[locale] || COPY.vi;
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(initial);
  const [draft, setDraft] = useState("");
  const [prepared, setPrepared] = useState(false);
  const [copyStatus, setCopyStatus] = useState("");
  const [error, setError] = useState(false);
  const draftHeading = useRef(null);
  const wasPrepared = useRef(false);
  useEffect(() => { setSearch(window.location.search); }, []);
  useEffect(() => {
    if (prepared || wasPrepared.current) {
      draftHeading.current?.focus({ preventScroll: true });
      draftHeading.current?.scrollIntoView({ block: "nearest" });
    }
    wasPrepared.current = prepared;
  }, [prepared]);

  const update = (field, value) => { setForm((current) => ({ ...current, [field]: value })); setError(false); };
  const prepare = (event) => {
    event.preventDefault();
    if (!form.name.trim() || !form.contact.trim()) { setError(true); return; }
    setError(false);
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
        <p className={styles.eyebrow}>Zalo · {EVENT_CONTACT.phoneLabel}</p>
        {!prepared ? <>
          <h2 id="message-title" tabIndex={-1} ref={draftHeading}>{t.formTitle}</h2><p className={styles.formIntro}>{t.formBody}</p>
          <form onSubmit={prepare}>
            <fieldset className={styles.intents}><legend>{t.intent}</legend><div>{Object.entries(t.intents).map(([key, label]) => <label key={key} data-selected={form.intent === key}><input type="radio" name="event-intent" value={key} checked={form.intent === key} onChange={() => update("intent", key)}/><span>{label}</span></label>)}</div></fieldset>
            <label className={styles.field}><span>{t.name}</span><input name="name" required autoComplete="name" maxLength={80} value={form.name} onChange={(e) => update("name", e.target.value)}/></label>
            <label className={styles.field}><span>{t.business}<small>{t.optional}</small></span><input name="organization" autoComplete="organization" maxLength={120} value={form.business} onChange={(e) => update("business", e.target.value)}/></label>
            <label className={styles.field}><span>{t.contact}</span><input name="contact" required maxLength={120} value={form.contact} onChange={(e) => update("contact", e.target.value)}/></label>
            <label className={styles.field}><span>{t.note}<small>{t.optional}</small></span><textarea name="note" maxLength={700} rows={3} placeholder={t.noteHint} value={form.note} onChange={(e) => update("note", e.target.value)}/></label>
            <button className={styles.primary} type="submit">{t.prepare}<ArrowRight size={18} aria-hidden="true"/></button>
            {error && <p className={styles.error} role="alert">{t.required}</p>}
            <p className={styles.privacy}>{t.privacy} <Link href="/privacy">{t.privacyLink}</Link></p>
          </form>
        </> : <div className={styles.draft}>
          <h2 id="message-title" tabIndex={-1} ref={draftHeading}>{t.draftTitle}</h2><p>{t.draftHelp}</p>
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

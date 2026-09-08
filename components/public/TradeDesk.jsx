"use client";
import PolicyLinks from "@/components/PolicyLinks";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, FlaskConical, Globe2, Phone } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { notifyHouse } from "@/lib/notify";
import { fromCatalogRow } from "@/lib/mappers";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { trackMetaLead } from "@/lib/meta-pixel";
import { recordPublicConversion } from "@/lib/public-attribution";
import styles from "./TradeDesk.module.css";

const COPY = {
  vi: {
    switcher: "EN",
    portal: "Cổng đối tác",
    back: "Nhà Hoàng Long",
    eyebrow: "Trà dành cho quán và đối tác",
    title: "Chọn nguồn trà cho quán, bắt đầu từ mẫu thử.",
    intro: "Hoàng Long cung cấp trà Shan Tuyết cho quán cà phê, trà thất và nhà hàng. Trao đổi món đang bán và lượng trà dự kiến để chọn mẫu, thử tại quán và nhận báo giá phù hợp.",
    sample: "Xem bộ mẫu thử",
    discuss: "Trao đổi nhu cầu",
    statement: "Thử trà với nước, thiết bị và nguyên liệu của quán. Ghi lại cảm nhận để trao đổi với Nhà trước khi chọn trà và chốt lượng đặt.",
    principles: [
      ["01", "Nguồn trà", "Trao đổi với Nhà về nguồn trà và mùa vụ của lô bạn đang cân nhắc."],
      ["02", "Chế biến", "Kỹ thuật hấp và kiểm soát nhiệt theo công nghệ Nhật Bản, hướng đến hương vị tự nhiên và ít gắt."],
      ["03", "Ứng dụng", "Pha thử với công thức của quán, rồi điều chỉnh lượng trà, nhiệt độ và thời gian để tìm vị phù hợp."],
      ["04", "Cung ứng", "Trao đổi rõ về quy cách, lượng đặt và thời gian cung ứng trước khi chốt đơn."],
    ],
    available: "Trà đang có cho đối tác",
    availableBody: "Xem các dòng trà đang có, rồi cho Nhà biết món bạn muốn pha và lượng trà dự kiến sử dụng.",
    catalogueEmpty: "Danh mục đối tác đang được cập nhật.",
    requestTitle: "Quán bạn đang cần loại trà nào?",
    requestBody: "Cho Nhà biết món đang bán, vị trà muốn tìm và lượng dùng dự kiến. Nếu chưa biết cần bao nhiêu, bạn có thể ghi “chưa xác định”.",
    name: "Tên của bạn",
    business: "Quán / doanh nghiệp",
    contact: "Số điện thoại hoặc email",
    need: "Món muốn pha, vị trà muốn tìm và lượng dùng dự kiến",
    consent: "Tôi đồng ý để Nhà Hoàng Long dùng thông tin này để liên hệ về yêu cầu trên.",
    send: "Gửi yêu cầu",
    sending: "Đang gửi…",
    required: "Vui lòng điền tên, thông tin liên hệ, nhu cầu và xác nhận đồng ý.",
    failed: "Chưa gửi được yêu cầu. Vui lòng thử lại hoặc gọi trực tiếp.",
    sent: "Hoàng Long đã nhận yêu cầu của bạn.",
    sentBody: "Nhà sẽ liên hệ lại bằng thông tin bạn vừa cung cấp.",
    call: "Gọi Nhà · 0903 333 841",
    footer: "Trà Việt cho những công thức cần vị trà rõ ràng.",
  },
  en: {
    switcher: "VI",
    portal: "Partner portal",
    back: "House of Hoàng Long",
    eyebrow: "The trade tea desk",
    title: "Choose a base tea by taste, not only by price per kilo.",
    intro: "For cafés, tea rooms, restaurants, R&D teams and importers who want to work directly with a Vietnamese tea maker.",
    sample: "Request the sample set",
    discuss: "Discuss your brief",
    statement: "We do not promise that tea alone will rescue a recipe. We put it on your bar, rework the brew, and let the result decide.",
    principles: [
      ["01", "Origin", "Ancient-tree Shan Tuyết from Hà Giang, with an identifiable batch and season."],
      ["02", "Making", "Japanese steaming discipline, developed for a clean finish with less harshness."],
      ["03", "Application", "Test in the real recipe: leaf ratio, temperature, time, milk and sugar all return to the table."],
      ["04", "Supply", "Formats from trials to volume, with direct conversations about capacity, lead time and seasonal change."],
    ],
    available: "Tea currently open to trade",
    availableBody: "This list comes directly from the working catalogue. Every conversation still begins with your application and required volume.",
    catalogueEmpty: "The trade catalogue is being prepared.",
    requestTitle: "Tell us what you are making.",
    requestBody: "A short call often saves several rounds of samples. Give us enough context to prepare the right leaf and the right questions.",
    name: "Your name",
    business: "Café / business",
    contact: "Phone or email",
    need: "What are you making, and what volume do you expect?",
    consent: "I agree that House of Hoàng Long may use these details to respond to this enquiry.",
    send: "Send enquiry",
    sending: "Sending…",
    required: "Please add your name, contact, brief, and consent.",
    failed: "The enquiry did not go through. Please try again or call us directly.",
    sent: "Your brief is at the trade desk.",
    sentBody: "The house will reply using the details you supplied.",
    call: "Call the house · 0903 333 841",
    footer: "Vietnamese tea for serious recipes.",
  },
};

export default function TradeDesk() {
  const { locale: lang, toggleLocale } = useLocale();
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({ name: "", business: "", contact: "", need: "", consent: false });
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const briefStarted = useRef(false);
  const supabase = useMemo(() => createClient(), []);
  const t = COPY[lang];

  useEffect(() => {
    let live = true;
    supabase.from("catalog_products").select("*").eq("available", true).order("sort_order").then(({ data, error: catalogError }) => {
      if (live && !catalogError) setProducts((data || []).map(fromCatalogRow).filter((item) => item.kind !== "goods" && item.line === "everyday").slice(0, 6));
    });
    return () => { live = false; };
  }, [supabase]);

  useEffect(() => {
    recordPublicConversion(supabase, "wholesale_view", { once: true, placement: "wholesale" }).catch(() => {});
  }, [supabase]);

  const local = (value) => value?.[lang] || value?.en || value?.vi || "";

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    if (!form.name.trim() || !form.contact.trim() || !form.need.trim() || !form.consent) {
      setError(t.required);
      return;
    }
    setSending(true);
    const leadId = `lead-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const { error: submitError } = await supabase.from("leads").insert({
      id: leadId,
      name: form.name.trim(),
      contact: form.contact.trim(),
      business_name: form.business.trim(),
      address: "",
      interest: `wholesale: ${form.need.trim()}`,
      unread: true,
    });
    setSending(false);
    if (submitError) {
      setError(t.failed);
      return;
    }
    notifyHouse("leads", leadId);
    trackMetaLead("wholesale_enquiry");
    recordPublicConversion(supabase, "trade_lead_submitted", { placement: "wholesale_brief" }).catch(() => {});
    setSent(true);
  };

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/" className={styles.back}><ArrowLeft size={17}/>{t.back}</Link>
        <div className={styles.headerActions}><Link href="/partners">{t.portal}<ArrowRight size={15}/></Link><button onClick={toggleLocale}><Globe2 size={15}/>{t.switcher}</button></div>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p>{t.eyebrow}</p>
          <h1>{t.title}</h1>
          <p className={styles.intro}>{t.intro}</p>
          <div className={styles.actions}>
            <Link href="/sample?utm_source=website&utm_medium=owned&utm_campaign=wholesale_b2b">
              <FlaskConical size={17}/>{t.sample}
            </Link>
            <a href="#trade-brief">{t.discuss}<ArrowRight size={16}/></a>
          </div>
        </div>
        <figure><img src="/landing/3.jpg" alt="Hoàng Long tea processing line"/><figcaption>Hà Giang · công nghệ chế biến</figcaption></figure>
      </section>

      <section className={styles.statement}><p>{t.statement}</p></section>

      <section className={styles.principles} aria-label="How the house works with trade partners">
        {t.principles.map(([number, title, body]) => <article key={number}><span>{number}</span><h2>{title}</h2><p>{body}</p></article>)}
      </section>

      <section className={styles.catalogue}>
        <header><h2>{t.available}</h2><p>{t.availableBody}</p></header>
        <div>
          {products.length ? products.map((product, index) => <article key={product.id}>
            <span>{String(index + 1).padStart(2, "0")}</span><h3>{local(product.name)}</h3><p>{local(product.notes)}</p><b>{product.packSize || "Bulk / kg"}</b>
          </article>) : <p className={styles.empty}>{t.catalogueEmpty}</p>}
        </div>
      </section>

      <section className={styles.brief} id="trade-brief">
        <div className={styles.briefIntro}><p>Trade brief</p><h2>{t.requestTitle}</h2><p>{t.requestBody}</p><a href="tel:+84903333841"><Phone size={16}/>{t.call}</a><p>{lang === "vi" ? "Văn phòng & kho: 36B QL2A, Sóc Sơn, Hà Nội. Bạn có thể ghé uống trà và trao đổi nhu cầu; vui lòng gọi trước để sắp xếp." : "Office & warehouse: 36B QL2A, Soc Son, Hanoi. You can visit for tea and discuss your requirements; please call ahead to arrange your visit."}</p><a href="https://maps.app.goo.gl/2CeRFCCd2eXo9E6p6" target="_blank" rel="noreferrer">{lang === "vi" ? "Xem đường đến văn phòng" : "Directions to the office"}<ArrowRight size={16}/></a></div>
        {sent ? <div className={styles.success}><span><Check size={19}/></span><h3>{t.sent}</h3><p>{t.sentBody}</p><Link href="/">{t.back}<ArrowRight size={16}/></Link></div> :
          <form onSubmit={submit} onFocusCapture={() => {
            if (briefStarted.current) return;
            briefStarted.current = true;
            recordPublicConversion(supabase, "trade_brief_started", { placement: "wholesale_brief" }).catch(() => {});
          }}>
            <label>{t.name}<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required/></label>
            <label>{t.business}<input value={form.business} onChange={(e) => setForm({ ...form, business: e.target.value })}/></label>
            <label>{t.contact}<input value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} required/></label>
            <label>{t.need}<textarea value={form.need} onChange={(e) => setForm({ ...form, need: e.target.value })} required/></label>
            <label className={styles.consent}><input type="checkbox" checked={form.consent} onChange={(e) => setForm({ ...form, consent: e.target.checked })}/>{t.consent}</label>
            {error && <p className={styles.error} role="alert">{error}</p>}
            <button disabled={sending || !form.name.trim() || !form.contact.trim() || !form.need.trim() || !form.consent}>{sending ? t.sending : t.send}<ArrowRight size={16}/></button>
          </form>}
      </section>

      <footer className={styles.footer}><p>{t.footer}</p><span>House of Hoàng Long · Since 1995</span><PolicyLinks/></footer>
    </main>
  );
}

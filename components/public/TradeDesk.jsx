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
    eyebrow: "Nguồn cung cho phân phối & xuất khẩu",
    title: "Nguồn trà tại xưởng. Hợp tác dài hạn.",
    intro: "Năng lực sản xuất 1.000 tấn/năm, phục vụ nhà phân phối và doanh nghiệp xuất khẩu lớn. Trao đổi chất lượng, quy cách và kế hoạch cung ứng để nhận mẫu và báo giá tại xưởng.",
    sample: "Xem bộ mẫu thử",
    discuss: "Trao đổi nhu cầu",
    statement: "Thống nhất mẫu và yêu cầu chất lượng trước khi đặt hàng. Điều khoản thanh toán, khối lượng và lịch giao được thỏa thuận theo từng đơn hàng, hướng đến hợp tác lâu dài.",
    principles: [
      ["01", "Nguồn trà", "Nguyên liệu Tây Bắc, Hà Giang và trà cổ thụ vùng cao, lựa chọn theo dòng sản phẩm."],
      ["02", "Chế biến", "Công nghệ Nhật Bản, chế biến hấp hơi và tinh chỉnh chất lượng theo yêu cầu đã thống nhất."],
      ["03", "Chất lượng", "Tinh chỉnh chất lượng theo nhu cầu và mẫu đã thống nhất với đối tác."],
      ["04", "Cung ứng", "Trao đổi rõ về quy cách, lượng đặt và thời gian cung ứng trước khi chốt đơn."],
    ],
    available: "Trà đang có cho đối tác",
    availableBody: "Chọn dòng trà để bắt đầu thử mẫu, rồi trao đổi yêu cầu chất lượng và khối lượng dự kiến.",
    catalogueEmpty: "Danh mục đối tác đang được cập nhật.",
    requestTitle: "Trao đổi nhu cầu cung ứng của bạn",
    requestBody: "Cho biết bạn là nhà phân phối hay doanh nghiệp xuất khẩu, thị trường, chất lượng và khối lượng dự kiến. Nội dung chưa rõ có thể ghi “chưa xác định”.",
    name: "Tên của bạn",
    business: "Doanh nghiệp / tổ chức",
    contact: "Số điện thoại hoặc email",
    need: "Thị trường, yêu cầu chất lượng, khối lượng và lịch cung ứng",
    consent: "Tôi đồng ý để Nhà Hoàng Long dùng thông tin này để liên hệ về yêu cầu trên.",
    send: "Gửi yêu cầu",
    sending: "Đang gửi…",
    required: "Vui lòng điền tên, thông tin liên hệ, nhu cầu và xác nhận đồng ý.",
    failed: "Chưa gửi được yêu cầu. Vui lòng thử lại hoặc gọi trực tiếp.",
    sent: "Hoàng Long đã nhận yêu cầu của bạn.",
    sentBody: "Nhà sẽ liên hệ lại bằng thông tin bạn vừa cung cấp.",
    call: "Gọi Nhà · 0903 333 841",
    footer: "Nguồn trà Việt cho đối tác phân phối và xuất khẩu.",
  },
  en: {
    switcher: "VI",
    portal: "Partner portal",
    back: "House of Hoàng Long",
    eyebrow: "The trade tea desk",
    title: "Factory-direct tea. Long-term partnerships.",
    intro: "Production capacity of 1,000 tonnes per year for distributors and large-scale exporters. Discuss specifications, packing and supply plans for samples and factory-direct pricing.",
    sample: "Request the sample set",
    discuss: "Discuss your brief",
    statement: "Agree on samples and quality requirements before ordering. Payment terms, volumes and delivery schedules are agreed for each order, with long-term cooperation in mind.",
    principles: [
      ["01", "Origin", "Raw materials from Northwest Vietnam, Hà Giang and ancient highland tea trees, selected for each product range."],
      ["02", "Making", "Japanese technology, steam processing and quality adjustments to agreed requirements."],
      ["03", "Quality", "Quality tailored to partner requirements and agreed samples."],
      ["04", "Supply", "Formats from trials to volume, with direct conversations about capacity, lead time and seasonal change."],
    ],
    available: "Tea currently open to trade",
    availableBody: "This list comes directly from the working catalogue. Every conversation still begins with your application and required volume.",
    catalogueEmpty: "The trade catalogue is being prepared.",
    requestTitle: "Discuss your supply requirements.",
    requestBody: "Tell us whether you distribute or export, your market, quality requirements and expected volume. Details still undecided can be marked unknown.",
    name: "Your name",
    business: "Company / organisation",
    contact: "Phone or email",
    need: "Market, quality requirements, volume and delivery plans",
    consent: "I agree that House of Hoàng Long may use these details to respond to this enquiry.",
    send: "Send enquiry",
    sending: "Sending…",
    required: "Please add your name, contact, brief, and consent.",
    failed: "The enquiry did not go through. Please try again or call us directly.",
    sent: "Your brief is at the trade desk.",
    sentBody: "The house will reply using the details you supplied.",
    call: "Call the house · 0903 333 841",
    footer: "Vietnamese tea for distribution and export.",
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

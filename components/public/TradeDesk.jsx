"use client";
import PolicyLinks from "@/components/PolicyLinks";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, FlaskConical, Phone } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { notifyHouse } from "@/lib/notify";
import { isTradeTea, selectedTradeTea, TRADE_CATALOG_FIELDS } from "@/lib/trade-catalog";
import { tradeProductFacts } from "@/lib/trade-product-details";
import { COMPANY_PROFILE, PROFILE_PDF } from "@/lib/company-profile";
import { B2B_BULK_PACKING } from "@/lib/b2b-packing";
import { EXPORT_DEVELOPMENT_CONTACT } from "@/lib/export-sales-profiles";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { trackMetaLead } from "@/lib/meta-pixel";
import { recordPublicConversion } from "@/lib/public-attribution";
import styles from "./TradeDesk.module.css";
import PublicSiteHeader from "./PublicSiteHeader";

const COPY = {
  "vi": {
    "switcher": "EN",
    "portal": "Cổng đối tác",
    "back": "Hoàng Long",
    "eyebrow": "Hợp tác thương mại · Phân phối · Xuất khẩu",
    "title": "Xây dựng nguồn cung. Phát triển thị trường.",
    "intro": "Từ nhà máy tại Tân Lập, Hà Giang, Hoàng Long cùng đối tác xây dựng chương trình cung ứng trà cho từng thị trường. Năng lực 50–100 tấn/tháng phục vụ lập kế hoạch; sản lượng khả dụng và lịch giao được xác nhận theo yêu cầu.",
    "sample": "Trao đổi mẫu trà",
    "discuss": "Gửi đề bài hợp tác",
    "statement": "Từ mẫu đối chiếu đến điều kiện giao hàng: một cơ sở rõ ràng cho hợp tác dài hạn.",
    "principles": [
      [
        "01",
        "Xác định nhu cầu",
        "Thị trường đích, kênh phân phối, ứng dụng và sản lượng dự kiến là cơ sở để lựa chọn dòng trà."
      ],
      [
        "02",
        "Thử mẫu & thống nhất",
        "Đối chiếu mẫu, cấp chất lượng, yêu cầu kiểm tra và quy cách trước khi xác nhận đơn hàng. Yêu cầu hồ sơ theo thị trường được rà soát riêng."
      ],
      [
        "03",
        "Kế hoạch sản xuất",
        "Thống nhất khối lượng, mùa nguyên liệu, bao bì, tiến độ và điều kiện thanh toán. Thăm nhà máy được sắp xếp theo lịch hẹn."
      ],
      [
        "04",
        "Giao nhận & tiếp nối",
        "Xác nhận trách nhiệm giao nhận, kiểm tra hồ sơ và phản hồi chất lượng để chuẩn bị những đợt cung ứng tiếp theo."
      ]
    ],
    "available": "Dòng trà cho kế hoạch cung ứng",
    "availableBody": "Danh mục là điểm bắt đầu để chọn mẫu. Sản phẩm phù hợp được xác định theo ứng dụng, phân khúc giá và yêu cầu của thị trường đích.",
    "catalogueEmpty": "Danh mục đối tác đang được cập nhật.",
    "requestTitle": "Đề bài hợp tác",
    "requestBody": "Dành cho nhà nhập khẩu, nhà phân phối, doanh nghiệp và tổ chức kết nối thương mại. Cho biết mục tiêu hợp tác, thị trường, sản phẩm và tiến độ dự kiến; nội dung chưa chốt có thể ghi “chưa xác định”.",
    "name": "Họ tên / chức danh",
    "business": "Doanh nghiệp / tổ chức",
    "contact": "Số điện thoại hoặc email",
    "need": "Mục tiêu hợp tác, thị trường, sản lượng và thời gian dự kiến",
    "consent": "Tôi đồng ý để Hoàng Long dùng thông tin này để liên hệ về yêu cầu trên.",
    "send": "Gửi đề bài hợp tác",
    "sending": "Đang gửi…",
    "required": "Vui lòng điền tên, thông tin liên hệ, nhu cầu và xác nhận đồng ý.",
    "failed": "Chưa gửi được yêu cầu. Vui lòng thử lại hoặc gọi trực tiếp.",
    "sent": "Hoàng Long đã nhận đề bài hợp tác.",
    "sentBody": "Đội ngũ sẽ liên hệ theo thông tin đã cung cấp để làm rõ yêu cầu và thống nhất bước tiếp theo.",
    "call": "Văn phòng Hoàng Long · 0903 333 841",
    "footer": "Kết nối nguồn trà Việt với cơ hội hợp tác quốc tế."
  },
  "en": {
    "switcher": "VI",
    "portal": "Partner portal",
    "back": "Hoàng Long",
    "eyebrow": "Trade cooperation · Distribution · Export",
    "title": "Build supply. Develop markets.",
    "intro": "From our factory in Tân Lập, Hà Giang, Hoàng Long works with partners on tea supply programmes for specific markets. Capacity of 50–100 tonnes per month supports planning; available volumes and delivery schedules are confirmed against the brief.",
    "sample": "Discuss tea samples",
    "discuss": "Send a cooperation brief",
    "statement": "From reference sample to delivery terms: a clear foundation for long-term cooperation.",
    "principles": [
      [
        "01",
        "Define the brief",
        "Destination market, distribution channel, application and planned volume guide tea selection."
      ],
      [
        "02",
        "Sample & specification",
        "Agree on reference samples, grades, testing requirements and packing before confirming an order. Market-specific document requirements are reviewed separately."
      ],
      [
        "03",
        "Production planning",
        "Agree on volume, raw-material seasonality, packing, schedules and payment terms. Factory visits can be arranged by appointment."
      ],
      [
        "04",
        "Handover & follow-through",
        "Confirm handover responsibilities, check documents and review quality feedback to plan subsequent supply."
      ]
    ],
    "available": "Tea ranges for a supply programme",
    "availableBody": "The catalogue is a starting point for sampling. Selection depends on application, price positioning and destination-market requirements.",
    "catalogueEmpty": "The trade catalogue is being updated.",
    "requestTitle": "Cooperation brief",
    "requestBody": "For importers, distributors, businesses and trade-facilitation organisations. Share your cooperation objectives, market, products and intended timeline. Mark undecided details as “to be confirmed”.",
    "name": "Name / role",
    "business": "Company / organisation",
    "contact": "Phone or email",
    "need": "Cooperation objectives, market, volume and intended timeline",
    "consent": "I agree that Hoàng Long may use these details to respond to this enquiry.",
    "send": "Send cooperation brief",
    "sending": "Sending…",
    "required": "Please add your name, contact, brief and consent.",
    "failed": "The enquiry did not go through. Please try again or call us directly.",
    "sent": "Hoàng Long has received your brief.",
    "sentBody": "Our team will use your contact details to clarify requirements and agree on the next step.",
    "call": "Hoàng Long office · 0903 333 841",
    "footer": "Connecting Vietnamese tea with international cooperation opportunities."
  }
};

export default function TradeDesk() {
  const { locale: lang } = useLocale();
  const [products, setProducts] = useState([]);
  const [selectedTea, setSelectedTea] = useState(null);
  const [intent, setIntent] = useState("quote");
  const [selectionStatus, setSelectionStatus] = useState("loading");
  const [form, setForm] = useState({ name: "", business: "", contact: "", need: "", consent: false });
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const briefStarted = useRef(false);
  const supabase = useMemo(() => createClient(), []);
  const t = COPY[lang];
  const bulkPacking = B2B_BULK_PACKING[lang === "en" ? "en" : "vi"];

  useEffect(() => {
    let live = true;
    supabase.from("catalog_products").select(TRADE_CATALOG_FIELDS).eq("available", true).order("id").then(({ data, error: catalogError }) => {
      if (live && !catalogError) {
        const teas = (data || []).filter(isTradeTea);
        setProducts(teas.slice(0, 6));
        const selected = selectedTradeTea(teas, window.location.search);
        setSelectedTea(selected);
        setSelectionStatus(new URLSearchParams(window.location.search).has("tea") && !selected ? "unavailable" : "ready");
        setIntent(new URLSearchParams(window.location.search).get("intent") === "sample" ? "sample" : "quote");
      } else if (live) setSelectionStatus(new URLSearchParams(window.location.search).has("tea") ? "error" : "ready");
    }).catch(() => { if (live) setSelectionStatus(new URLSearchParams(window.location.search).has("tea") ? "error" : "ready"); });
    return () => { live = false; };
  }, [supabase]);

  useEffect(() => {
    recordPublicConversion(supabase, "wholesale_view", { once: true, placement: "wholesale" }).catch(() => {});
  }, [supabase]);

  const local = (value) => value?.[lang] || value?.en || value?.vi || "";

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    if (selectionStatus !== "ready") return;
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
      interest: `wholesale: ${selectedTea ? `[${intent}] ${tradeProductFacts(selectedTea, lang).name} (${selectedTea.id})\n` : ""}${form.need.trim()}`,
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
      <PublicSiteHeader/>

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
        <figure><img src="/landing/3.jpg" alt={lang === "vi" ? "Dây chuyền chế biến trà Hoàng Long" : "Hoàng Long tea processing line"}/><figcaption>{lang === "vi" ? "Nhà máy Trà Hoàng Long · Tân Lập, Hà Giang" : "Hoàng Long Tea Factory · Tân Lập, Hà Giang"}</figcaption></figure>
      </section>

      <section className={styles.statement}><p>{t.statement}</p></section>

      <section className={styles.principles} aria-label={lang === "vi" ? "Quy trình làm việc với đối tác" : "How we work with trade partners"}>
        {t.principles.map(([number, title, body]) => <article key={number}><span>{number}</span><h2>{title}</h2><p>{body}</p></article>)}
      </section>

      <section className={styles.catalogue}>
        <header><h2>{t.available}</h2><p>{t.availableBody}</p><Link href={`/catalog?lang=${lang}`}>{lang === "vi" ? "Xem toàn bộ danh mục trà" : "Explore the full tea range"}<ArrowRight size={16}/></Link><Link href={`/company?lang=${lang}#cooperation`}>{lang === "vi" ? "Hồ sơ năng lực & hướng hợp tác" : "Capabilities & cooperation areas"}<ArrowRight size={16}/></Link><p><strong>{bulkPacking.title}: </strong>{bulkPacking.text}</p></header>
        <div>
          {products.length ? products.map((product, index) => <article key={product.id}>
            <span>{String(index + 1).padStart(2, "0")}</span><h3>{tradeProductFacts(product, lang).name}</h3><p>{local(product.notes)}</p><b>{lang === "vi" ? "Quy cách theo thỏa thuận" : "Packing agreed on enquiry"}</b>
          </article>) : <p className={styles.empty}>{t.catalogueEmpty}</p>}
        </div>
      </section>

      <section className={styles.brief} id="trade-brief">
        <div className={styles.briefIntro}><p>{lang === "vi" ? "Đầu mối làm việc" : "Contact & next steps"}</p><h2>{t.requestTitle}</h2><p>{t.requestBody}</p><p><strong>{EXPORT_DEVELOPMENT_CONTACT.name}</strong><br/>{lang === "vi" ? EXPORT_DEVELOPMENT_CONTACT.role : EXPORT_DEVELOPMENT_CONTACT.roleEn}</p><a href={`tel:${EXPORT_DEVELOPMENT_CONTACT.phone}`}><Phone size={16}/>{EXPORT_DEVELOPMENT_CONTACT.phoneLabel}</a><br/><a href="tel:+84903333841"><Phone size={16}/>{t.call}</a><p>{lang === "vi" ? "Văn phòng & kho giao dịch: 36B QL2A, Sóc Sơn, Hà Nội. Nhà máy & điểm nhận hàng EXW: Tân Lập, Hà Giang. Vui lòng hẹn trước khi đến làm việc hoặc thăm nhà máy." : "Commercial office & warehouse: 36B QL2A, Sóc Sơn, Hanoi. Factory & EXW collection: Tân Lập, Hà Giang. Please arrange an appointment for meetings or factory visits."}</p><a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent("Trà Hoàng Long, 36B QL2A, Sóc Sơn, Hà Nội, Việt Nam")}`} target="_blank" rel="noreferrer">{lang === "vi" ? "Xem đường đến văn phòng" : "Directions to the office"}<ArrowRight size={16}/></a></div>
        {sent ? <div className={styles.success}><span><Check size={19}/></span><h3>{t.sent}</h3><p>{t.sentBody}</p><Link href="/">{t.back}<ArrowRight size={16}/></Link></div> :
          <form onSubmit={submit} onFocusCapture={() => {
            if (briefStarted.current) return;
            briefStarted.current = true;
            recordPublicConversion(supabase, "trade_brief_started", { placement: "wholesale_brief" }).catch(() => {});
          }}>
            <div aria-live="polite">{selectionStatus === "loading" && <p>{lang === "vi" ? "Đang tải thông tin trà…" : "Loading tea details…"}</p>}{["error", "unavailable"].includes(selectionStatus) && <p>{lang === "vi" ? "Chưa xác nhận được trà đã chọn. Bạn có thể quay lại danh mục hoặc gửi yêu cầu chung." : "The selected tea could not be confirmed. Return to the catalogue or send a general enquiry."} <Link href="/catalog">{lang === "vi" ? "Danh mục" : "Catalogue"}</Link> · <button type="button" onClick={() => setSelectionStatus("ready")}>{lang === "vi" ? "Gửi yêu cầu chung" : "Continue without a tea"}</button></p>}{selectedTea && <p>{lang === "vi" ? (intent === "sample" ? "Trao đổi mẫu trà" : "Yêu cầu báo giá") : (intent === "sample" ? "Sample enquiry" : "Quote enquiry")}: <strong>{tradeProductFacts(selectedTea, lang).name}</strong> · <button type="button" onClick={() => setSelectedTea(null)}>{lang === "vi" ? "Bỏ chọn" : "Clear selection"}</button></p>}</div>
            <label>{t.name}<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required/></label>
            <label>{t.business}<input value={form.business} onChange={(e) => setForm({ ...form, business: e.target.value })}/></label>
            <label>{t.contact}<input value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} required/></label>
            <label>{t.need}<textarea value={form.need} onChange={(e) => setForm({ ...form, need: e.target.value })} required/></label>
            <label className={styles.consent}><input type="checkbox" checked={form.consent} onChange={(e) => setForm({ ...form, consent: e.target.checked })}/>{t.consent}</label>
            {error && <p className={styles.error} role="alert">{error}</p>}
            <button disabled={selectionStatus !== "ready" || sending || !form.name.trim() || !form.contact.trim() || !form.need.trim() || !form.consent}>{sending ? t.sending : t.send}<ArrowRight size={16}/></button>
          </form>}
      </section>

      <footer className={styles.footer}><p>{t.footer}</p><span>House of Hoàng Long · Since 1995</span><Link href={`/company?lang=${lang}`}>{lang === "vi" ? "Hồ sơ công ty" : "Company profile"}</Link><a href={PROFILE_PDF[lang]} download>{COMPANY_PROFILE[lang].actions.pdf}</a><PolicyLinks/></footer>
    </main>
  );
}

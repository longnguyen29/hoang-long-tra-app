"use client";
import PolicyLinks from "@/components/PolicyLinks";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, FlaskConical, Phone } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { notifyHouse } from "@/lib/notify";
import { isTradeTea, selectedTradeTea, TRADE_CATALOG_FIELDS } from "@/lib/trade-catalog";
import { tradeProductFacts } from "@/lib/trade-product-details";
import { PROFILE_LEGAL } from "@/lib/company-profile";
import { PACK_DOCUMENTS } from "@/lib/institutional-pack";
import { B2B_BULK_PACKING } from "@/lib/b2b-packing";
import { EXPORT_DEVELOPMENT_CONTACT } from "@/lib/export-sales-profiles";
import { CORE_EXPORT_PRODUCTS } from "@/lib/export-product-profile";
import { tradeEnquiryHref } from "@/lib/trade-catalog";
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
    "eyebrow": "Trà Hoàng Long · Cung ứng B2B & xuất khẩu",
    "title": "Mẫu sản phẩm & báo giá xuất khẩu.",
    "intro": "Danh mục chủ lực gồm Hồng Trà Mật, Hồng Trà Khói, Xanh Mộc và Trà Xanh Hoa Ngọc Lan. Tiếp nhận yêu cầu về sản phẩm, phẩm cấp, khối lượng và thị trường nhập khẩu.",
    "sample": "Xem bốn sản phẩm chủ lực",
    "discuss": "Yêu cầu mẫu & báo giá",
    "statement": "Điều kiện cung ứng & quy trình đặt hàng.",
    "principles": [
      [
        "01",
        "Mẫu & phẩm cấp",
        "Chọn dòng trà và mẫu chào hàng. Ghi nhận phẩm cấp, ngoại hình, đặc trưng cảm quan và yêu cầu kỹ thuật.",
        "Đầu ra: mẫu được chọn và yêu cầu sản phẩm."
      ],
      [
        "02",
        "Báo giá & xác nhận đơn",
        "Chốt lượng đặt, quy cách, giá, thanh toán, lịch hàng và chứng từ áp dụng. Điều kiện EXW tại Tân Lập, Hà Giang.",
        "Đầu ra: báo giá và PO/hợp đồng."
      ],
      [
        "03",
        "Chuẩn bị & kiểm tra hàng",
        "Xác nhận lịch sản xuất hoặc hàng sẵn, đóng bao, nhãn lô và nội dung kiểm tra theo đơn. Khối lượng khả dụng được xác nhận theo dòng trà và thời điểm.",
        "Đầu ra: hàng sẵn và hồ sơ đối chiếu."
      ],
      [
        "04",
        "Bàn giao & giao nhận",
        "Bàn giao hàng và chứng từ theo thỏa thuận. Bốc hàng, vận chuyển và thủ tục xuất nhập khẩu được phân định trong hồ sơ giao dịch.",
        "Đầu ra: xác nhận bàn giao và hồ sơ lô hàng."
      ]
    ],
    "available": "Sản phẩm xuất khẩu chủ lực.",
    "availableBody": "Bốn dòng trà khô rời cho nhập khẩu và phân phối. Mỗi sản phẩm có hồ sơ riêng; mẫu chào hàng là cơ sở lựa chọn phẩm cấp và xác lập yêu cầu kỹ thuật.",
    "catalogueEmpty": "Danh mục đối tác đang được cập nhật.",
    "requestTitle": "Yêu cầu mẫu & báo giá.",
    "requestBody": "Cho biết sản phẩm quan tâm, khối lượng dự kiến, nơi nhận hàng và thời điểm cần hàng. Có thể gửi thêm yêu cầu về phẩm cấp, bao bì, kiểm nghiệm hoặc chứng từ nhập khẩu.",
    "name": "Họ tên / chức danh",
    "business": "Doanh nghiệp / tổ chức",
    "contact": "Số điện thoại hoặc email",
    "need": "Sản phẩm, khối lượng, nơi nhận hàng, lịch hàng và yêu cầu kỹ thuật",
    "consent": "Tôi đồng ý để Hoàng Long dùng thông tin này để liên hệ về yêu cầu trên.",
    "send": "Gửi yêu cầu",
    "sending": "Đang gửi…",
    "required": "Vui lòng điền tên, thông tin liên hệ, nhu cầu và xác nhận đồng ý.",
    "failed": "Chưa gửi được yêu cầu. Vui lòng thử lại hoặc gọi trực tiếp.",
    "sent": "Hoàng Long đã nhận yêu cầu.",
    "sentBody": "Đội ngũ sẽ liên hệ theo thông tin đã cung cấp để làm rõ yêu cầu và thống nhất bước tiếp theo.",
    "call": "Văn phòng Hoàng Long · 0903 333 841",
    "footer": "Hoàng Long · Cung ứng trà Việt Nam."
  },
  "en": {
    "switcher": "VI",
    "portal": "Partner portal",
    "back": "Hoàng Long",
    "eyebrow": "Hoàng Long Tea · B2B & export supply",
    "title": "Export samples & quotations.",
    "intro": "Our core selection comprises Honey-Note Black Tea, Smoky Black Tea, Shan Green Tea — Mộc and Magnolia-Scented Green Tea. Send your product, grade, volume and destination-market requirements.",
    "sample": "Explore the four core selections",
    "discuss": "Request samples & a quotation",
    "statement": "Supply terms & ordering.",
    "principles": [
      [
        "01",
        "Samples & grades",
        "Select the tea and offered sample. Record grade, leaf appearance, sensory character and technical requirements.",
        "Output: selected sample and product requirements."
      ],
      [
        "02",
        "Quotation & confirmation",
        "Agree quantities, packing, price, payment, dates and applicable documents. EXW collection at Tân Lập, Hà Giang.",
        "Output: quotation and PO/contract."
      ],
      [
        "03",
        "Goods preparation & inspection",
        "Confirm production or stock dates, sacks, lot labels and inspection scope. Available quantities depend on the tea and schedule.",
        "Output: goods ready and supporting records."
      ],
      [
        "04",
        "Handover & logistics",
        "Hand over goods and documents as agreed. Loading, transport and export/import formalities are allocated in the transaction file.",
        "Output: handover confirmation and lot documentation."
      ]
    ],
    "available": "Core export selection.",
    "availableBody": "Four loose-leaf teas for import and distribution. Each has a separate product profile; offered samples provide the basis for grade selection and technical requirements.",
    "catalogueEmpty": "The trade catalogue is being updated.",
    "requestTitle": "Request samples & a quotation.",
    "requestBody": "Share products of interest, approximate volume, destination and required date. Include any grade, packing, testing or import-document requirements.",
    "name": "Name / role",
    "business": "Company / organisation",
    "contact": "Phone or email",
    "need": "Products, volume, destination, required dates and technical requirements",
    "consent": "I agree that Hoàng Long may use these details to respond to this enquiry.",
    "send": "Send enquiry",
    "sending": "Sending…",
    "required": "Please add your name, contact, brief and consent.",
    "failed": "The enquiry did not go through. Please try again or call us directly.",
    "sent": "Hoàng Long has received your enquiry.",
    "sentBody": "Our team will use your contact details to clarify requirements and agree on the next step.",
    "call": "Hoàng Long office · 0903 333 841",
    "footer": "Hoàng Long · Vietnamese tea supply."
  }
};

export default function TradeDesk() {
  const { locale: lang } = useLocale();
  const [products, setProducts] = useState([]);
  const [enquirySearch, setEnquirySearch] = useState("");
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
    setEnquirySearch(window.location.search);
    supabase.from("catalog_products").select(TRADE_CATALOG_FIELDS).eq("available", true).order("id").then(({ data, error: catalogError }) => {
      if (live && !catalogError) {
        const teas = (data || []).filter(isTradeTea);
        setProducts(CORE_EXPORT_PRODUCTS.map(profile => teas.find(tea => tea.id === profile.catalogId)).filter(Boolean));
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
            <Link href={`/company?lang=${lang}#products`}>
              <FlaskConical size={17}/>{t.sample}
            </Link>
            <a href="#trade-brief">{t.discuss}<ArrowRight size={16}/></a>
          </div>
        </div>
        <figure><img src="/landing/3.jpg" alt={lang === "vi" ? "Dây chuyền chế biến trà Hoàng Long" : "Hoàng Long tea processing line"}/><figcaption>{lang === "vi" ? "Nhà máy Trà Hoàng Long · Tân Lập, Hà Giang" : "Hoàng Long Tea Factory · Tân Lập, Hà Giang"}</figcaption></figure>
      </section>

      <section className={styles.catalogue}>
        <header><h2>{t.available}</h2><p>{t.availableBody}</p><Link href={`/catalog?lang=${lang}`}>{lang === "vi" ? "Xem toàn bộ danh mục trà" : "Explore the full tea range"}<ArrowRight size={16}/></Link><Link href={`/company?lang=${lang}#products`}>{lang === "vi" ? "Hồ sơ bốn sản phẩm xuất khẩu" : "Four export product profiles"}<ArrowRight size={16}/></Link><p><strong>{bulkPacking.title}: </strong>{bulkPacking.text}</p></header>
        <div>
          {products.length ? products.map((product, index) => <article key={product.id}>
            <span>{String(index + 1).padStart(2, "0")}</span><h3>{local(CORE_EXPORT_PRODUCTS.find(profile => profile.catalogId === product.id)?.name) || tradeProductFacts(product, lang).name}</h3><p>{local(product.notes) || local(CORE_EXPORT_PRODUCTS.find(profile => profile.catalogId === product.id)?.subtitle)}</p><div className={styles.productActions}><Link href={tradeEnquiryHref(product.id, "sample", enquirySearch, lang)} onClick={() => { setSelectedTea(product); setIntent("sample"); setSelectionStatus("ready"); }}>{lang === "vi" ? "Yêu cầu mẫu" : "Request samples"}</Link><Link href={tradeEnquiryHref(product.id, "quote", enquirySearch, lang)} onClick={() => { setSelectedTea(product); setIntent("quote"); setSelectionStatus("ready"); }}>{lang === "vi" ? "Báo giá" : "Quotation"}</Link></div>
          </article>) : <p className={styles.empty}>{t.catalogueEmpty}</p>}
        </div>
      </section>

      <section className={styles.statement}><p>{t.statement}</p></section>

      <section className={styles.principles} aria-label={lang === "vi" ? "Quy trình làm việc với đối tác" : "How we work with trade partners"}>
        {t.principles.map(([number, title, body, output]) => <article key={number}><span>{number}</span><h2>{title}</h2><p>{body}</p><p className={styles.stepOutput}>{output}</p></article>)}
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

      <footer className={styles.footer}><p>{t.footer}</p><span>{lang === "vi" ? "Hoàng Long · Nền tảng gia đình làm trà từ 1995" : "Hoàng Long · Family tea-making roots since 1995"}</span><Link href={`/company?lang=${lang}`}>{lang === "vi" ? "Hồ sơ doanh nghiệp" : "Company profile"}</Link><a href={PACK_DOCUMENTS[lang].brief} download>{lang === "vi" ? "Giới thiệu chào hàng (PDF)" : "Export sales brief (PDF)"}</a><a href={PACK_DOCUMENTS[lang].profile} download>{lang === "vi" ? "Hồ sơ doanh nghiệp (PDF)" : "Company profile (PDF)"}</a><a href={PACK_DOCUMENTS[lang].appendix} download>{lang === "vi" ? "Hồ sơ sản phẩm xuất khẩu (PDF)" : "Export product profiles (PDF)"}</a><p className={styles.legalIdentity}>{PROFILE_LEGAL.name} · {lang === "vi" ? "MST" : "Tax ID"} {PROFILE_LEGAL.taxNumber}</p><PolicyLinks/></footer>
    </main>
  );
}

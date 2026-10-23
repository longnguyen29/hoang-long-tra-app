"use client";
import PolicyLinks from "@/components/PolicyLinks";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, FlaskConical, Phone } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { notifyHouse } from "@/lib/notify";
import { isTradeTea, selectedTradeTea, TRADE_CATALOG_FIELDS } from "@/lib/trade-catalog";
import { tradeProductFacts } from "@/lib/trade-product-details";
import { COMPANY_PROFILE, PROFILE_LEGAL, PROFILE_PDF } from "@/lib/company-profile";
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
    "eyebrow": "Nguồn cung B2B · Phân phối · Phát triển xuất khẩu",
    "title": "Từ lựa chọn sản phẩm đến kế hoạch cung ứng.",
    "intro": "Một nguồn trà chỉ trở thành giải pháp thương mại khi phù hợp với cách dùng, mức giá và điều kiện triển khai của người mua. Hoàng Long làm việc từ đề bài ấy: lựa chọn dòng trà, đánh giá mẫu, xác định quy cách và chuẩn bị cơ sở cho đơn hàng đầu tiên cũng như những lần mua tiếp theo.",
    "sample": "Bắt đầu từ mẫu trà",
    "discuss": "Trao đổi đề bài của bạn",
    "statement": "Chuyển yêu cầu thị trường thành một hồ sơ sản phẩm và kế hoạch thực hiện.",
    "principles": [
      [
        "01",
        "Lựa chọn & đánh giá mẫu",
        "Làm rõ ứng dụng, phẩm cấp, giá mục tiêu và số lượng. Thử mẫu theo điều kiện sử dụng của bên mua, ghi nhận ngoại hình, hương vị và điểm cần điều chỉnh.",
        "Cơ sở chuyển bước: mẫu được lựa chọn và phản hồi thử nghiệm."
      ],
      [
        "02",
        "Thông số & điều kiện thương mại",
        "Cụ thể hóa yêu cầu về sản phẩm, bao bì và chỉ tiêu kiểm tra. Với xuất khẩu, nhà nhập khẩu cung cấp yêu cầu thị trường để rà soát phương án hồ sơ, kiểm nghiệm, chi phí và thời gian.",
        "Cơ sở chuyển bước: quy cách, báo giá, PO/hợp đồng và trách nhiệm mỗi bên."
      ],
      [
        "03",
        "Chuẩn bị nguồn hàng",
        "Với dòng Hoàng Long sản xuất, đối chiếu nguyên liệu, tồn kho và lịch tại Tân Lập; năng lực 50–100 tấn/tháng phục vụ lập kế hoạch. Với trà tuyển chọn, đánh giá nguồn cung và lịch chuẩn bị tương ứng. Tiến độ theo dòng trà, khối lượng và yêu cầu kiểm tra.",
        "Cơ sở chuyển bước: lịch hàng, số lượng, quy cách đóng và phương án kiểm tra."
      ],
      [
        "04",
        "Giao nhận & đánh giá tiếp nối",
        "Chuẩn bị hàng và chứng từ trong phạm vi đã thỏa thuận. Với giá EXW, bên mua tổ chức nhận hàng tại nhà máy và các khâu vận chuyển, thủ tục thuộc trách nhiệm của mình. Phản hồi sau nhận hàng làm cơ sở cho lần cung ứng tiếp theo.",
        "Cơ sở theo dõi: bàn giao số lượng, tình trạng hàng, phản hồi và kế hoạch mua tiếp."
      ]
    ],
    "available": "Danh mục để bắt đầu đánh giá",
    "availableBody": "Danh mục cung ứng gồm các dòng trà với nguồn gốc và đặc tính riêng. Chọn sản phẩm để trao đổi mẫu hoặc báo giá; khả năng đáp ứng của từng dòng được xem xét theo lượng mua, yêu cầu và thời điểm. Hồ sơ doanh nghiệp trình bày nền tảng sản xuất và hướng hợp tác rộng hơn.",
    "catalogueEmpty": "Danh mục đối tác đang được cập nhật.",
    "requestTitle": "Bắt đầu một cuộc trao đổi có cơ sở.",
    "requestBody": "Gửi mục tiêu kinh doanh, sản phẩm quan tâm và khoảng sản lượng dự kiến. Nếu chưa có quy cách hoàn chỉnh, hãy mô tả cách dùng và khách hàng mục tiêu. Đầu mối phát triển xuất khẩu tiếp nhận đề bài, kết nối đánh giá sản phẩm và sắp xếp bước làm việc phù hợp.",
    "name": "Họ tên / chức danh",
    "business": "Doanh nghiệp / tổ chức",
    "contact": "Số điện thoại hoặc email",
    "need": "Cách dùng, thị trường, dòng trà, sản lượng và thời điểm cần hàng",
    "consent": "Tôi đồng ý để Hoàng Long dùng thông tin này để liên hệ về yêu cầu trên.",
    "send": "Gửi đề bài hợp tác",
    "sending": "Đang gửi…",
    "required": "Vui lòng điền tên, thông tin liên hệ, nhu cầu và xác nhận đồng ý.",
    "failed": "Chưa gửi được yêu cầu. Vui lòng thử lại hoặc gọi trực tiếp.",
    "sent": "Hoàng Long đã nhận đề bài hợp tác.",
    "sentBody": "Đội ngũ sẽ liên hệ theo thông tin đã cung cấp để làm rõ yêu cầu và thống nhất bước tiếp theo.",
    "call": "Văn phòng Hoàng Long · 0903 333 841",
    "footer": "Kết nối năng lực sản xuất với kế hoạch phát triển thị trường.",
    "programmesTitle": "Đề bài khác nhau. Cách lựa chọn khác nhau.",
    "programmesIntro": "Chọn hướng hợp tác gần nhất với nhu cầu. Hoàng Long tiếp nhận yêu cầu sản phẩm và phối hợp đánh giá điều kiện thực hiện; đối tác mang hiểu biết về thị trường, kênh bán và người sử dụng cuối.",
    "programmes": [
      [
        "01",
        "Nguyên liệu cho đồ uống",
        "Trà xanh, hồng trà và trà hương được xem xét theo công thức dự kiến. Thử trà trong điều kiện sử dụng thực tế giúp đối chiếu hương vị, độ đậm, hiệu quả chiết xuất và chi phí trà trên một phần đồ uống.",
        "Đề bài cần có: cách pha, sản phẩm cuối, phân khúc giá và sản lượng dự kiến."
      ],
      [
        "02",
        "Danh mục cho phân phối",
        "Dành cho nhà nhập khẩu, nhà phân phối và đơn vị kinh doanh trà. Cấu trúc danh mục có thể đi từ dòng dùng thường xuyên đến dòng chuyên trà, cân đối đặc tính sản phẩm, cấp chất lượng và vị trí giá trong kênh bán.",
        "Đề bài cần có: thị trường, khách hàng mục tiêu, dòng trà, quy cách và lịch mua."
      ],
      [
        "03",
        "Kết nối & phát triển thị trường",
        "Dành cho đối tác thương mại và tổ chức xúc tiến muốn tìm hiểu nguồn cung trà Việt. Buổi làm việc tập trung vào danh mục có khả năng triển khai, khảo sát nhà máy và lộ trình đưa sản phẩm đến thử nghiệm với bên mua.",
        "Đề bài cần có: mục tiêu kết nối, bên mua liên quan và kế hoạch làm việc."
      ]
    ]
  },
  "en": {
    "switcher": "VI",
    "portal": "Partner portal",
    "back": "Hoàng Long",
    "eyebrow": "B2B supply · Distribution · Export development",
    "title": "From product selection to a supply plan.",
    "intro": "A tea source becomes a commercial solution when it suits the buyer’s application, price positioning and practical requirements. Hoàng Long starts with that brief: selecting teas, evaluating samples, defining packing and preparing for the first order and subsequent purchases.",
    "sample": "Begin with tea samples",
    "discuss": "Discuss your brief",
    "statement": "Translate market requirements into a product brief and an execution plan.",
    "principles": [
      [
        "01",
        "Selection & sample evaluation",
        "Clarify the application, grade, target price and quantity. Trial samples under the buyer’s preparation conditions, recording appearance, flavour and any changes required.",
        "Basis for the next step: selected samples and trial feedback."
      ],
      [
        "02",
        "Specification & commercial terms",
        "Define product, packing and inspection requirements. For export, the importer provides destination-market requirements so documents, testing, cost and timing can be assessed.",
        "Basis for the next step: specifications, quotation, PO/contract and responsibilities."
      ],
      [
        "03",
        "Supply preparation",
        "For Hoàng Long-manufactured lines, review materials, stock and the Tân Lập schedule; capacity of 50–100 tonnes per month supports planning. For selected traded teas, assess the relevant source and preparation schedule. Timing depends on the tea, volume and inspection requirements.",
        "Basis for the next step: schedule, quantities, packing and inspection arrangements."
      ],
      [
        "04",
        "Handover & follow-through",
        "Prepare goods and documents within the agreed scope. Under EXW terms, the buyer organises factory collection and the transport and formalities for which it is responsible. Receipt feedback informs subsequent supply.",
        "Follow-through: quantity handover, condition on receipt, feedback and the next purchasing plan."
      ]
    ],
    "available": "A range to begin evaluating",
    "availableBody": "The supply catalogue includes teas with their own origins and characteristics. Select a tea for sampling or quotation; availability is assessed against volume, requirements and timing. The company profile explains our production foundation and broader cooperation direction.",
    "catalogueEmpty": "The trade catalogue is being updated.",
    "requestTitle": "Start a well-informed discussion.",
    "requestBody": "Share your commercial objective, products of interest and approximate volume. If specifications are still open, describe the intended use and target customer. Our export-development contact receives the brief, coordinates product assessment and arranges a relevant next step.",
    "name": "Name / role",
    "business": "Company / organisation",
    "contact": "Phone or email",
    "need": "Application, market, teas, volume and required date",
    "consent": "I agree that Hoàng Long may use these details to respond to this enquiry.",
    "send": "Send cooperation brief",
    "sending": "Sending…",
    "required": "Please add your name, contact, brief and consent.",
    "failed": "The enquiry did not go through. Please try again or call us directly.",
    "sent": "Hoàng Long has received your brief.",
    "sentBody": "Our team will use your contact details to clarify requirements and agree on the next step.",
    "call": "Hoàng Long office · 0903 333 841",
    "footer": "Connect production capabilities with a market-development plan.",
    "programmesTitle": "Different briefs. Different selection criteria.",
    "programmesIntro": "Choose the route closest to your requirements. Hoàng Long handles the product brief and assesses practical supply conditions; partners contribute knowledge of their market, channel and end users.",
    "programmes": [
      [
        "01",
        "Tea ingredients for beverages",
        "Green, black and scented teas are considered against the intended recipe. Testing under actual preparation conditions helps compare flavour, strength, extraction performance and tea cost per serving.",
        "Bring: preparation method, finished beverage, price positioning and planned volume."
      ],
      [
        "02",
        "A range for distribution",
        "For importers, distributors and tea businesses. A range can extend from everyday products to specialist teas, balancing product character, grade and price positioning within the sales channel.",
        "Bring: market, target customer, tea range, packing and purchasing schedule."
      ],
      [
        "03",
        "Trade connections & market development",
        "For commercial partners and trade-facilitation organisations exploring Vietnamese tea supply. Discussions focus on a viable product range, factory assessment and a practical route to buyer trials.",
        "Bring: cooperation objective, relevant buyers and the proposed work plan."
      ]
    ]
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

      <section className={styles.programmes} aria-labelledby="cooperation-models">
        <header><h2 id="cooperation-models">{t.programmesTitle}</h2><p>{t.programmesIntro}</p></header>
        <div>{t.programmes.map(([number, title, body, brief]) => <article key={number}><span>{number}</span><div><h3>{title}</h3><p>{body}</p><p>{brief}</p></div></article>)}</div>
      </section>

      <section className={styles.statement}><p>{t.statement}</p></section>

      <section className={styles.principles} aria-label={lang === "vi" ? "Quy trình làm việc với đối tác" : "How we work with trade partners"}>
        {t.principles.map(([number, title, body, output]) => <article key={number}><span>{number}</span><h2>{title}</h2><p>{body}</p><p className={styles.stepOutput}>{output}</p></article>)}
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

      <footer className={styles.footer}><p>{t.footer}</p><span>{lang === "vi" ? "Hoàng Long · Nền tảng gia đình làm trà từ 1995" : "Hoàng Long · Family tea-making roots since 1995"}</span><Link href={`/company?lang=${lang}`}>{lang === "vi" ? "Hồ sơ công ty" : "Company profile"}</Link><a href={PROFILE_PDF[lang]} download>{COMPANY_PROFILE[lang].actions.pdf}</a><p className={styles.legalIdentity}>{PROFILE_LEGAL.name} · {lang === "vi" ? "MST" : "Tax ID"} {PROFILE_LEGAL.taxNumber}</p><PolicyLinks/></footer>
    </main>
  );
}

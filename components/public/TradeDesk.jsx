"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, FlaskConical, Globe2, Phone } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { notifyHouse } from "@/lib/notify";
import { fromCatalogRow } from "@/lib/mappers";
import styles from "./TradeDesk.module.css";

const COPY = {
  vi: {
    switcher: "EN",
    back: "Nhà Hoàng Long",
    eyebrow: "Bàn trà dành cho đối tác",
    title: "Chọn trà nền theo hương vị và công thức, không chỉ theo giá mỗi ký.",
    intro: "Dành cho quán cà phê, trà thất, nhà hàng, đội ngũ R&D và nhà nhập khẩu muốn làm việc trực tiếp với một nhà chế biến trà Việt Nam.",
    sample: "Nhận bộ mẫu thử",
    discuss: "Trao đổi nhu cầu",
    statement: "Chúng tôi thử trà trực tiếp trong công thức của bạn, cùng điều chỉnh tỷ lệ pha và để kết quả thực tế quyết định.",
    principles: [
      ["01", "Nguồn trà", "Mỗi mẻ trà có hồ sơ nguồn gốc và mùa vụ rõ ràng."],
      ["02", "Chế biến", "Kỹ thuật hấp và kiểm soát nhiệt theo công nghệ Nhật Bản, hướng đến hương vị tự nhiên và ít gắt."],
      ["03", "Ứng dụng", "Thử bằng công thức thật của quán: tỷ lệ lá, nhiệt độ, thời gian, sữa và đường đều được tính lại."],
      ["04", "Cung ứng", "Quy cách từ mẫu thử đến số lượng lớn; trao đổi thẳng về năng lực, thời gian và biến động mùa vụ."],
    ],
    available: "Trà đang có cho đối tác",
    availableBody: "Danh sách này lấy trực tiếp từ danh mục đang vận hành. Mỗi cuộc trao đổi vẫn bắt đầu bằng ứng dụng và sản lượng bạn cần.",
    catalogueEmpty: "Danh mục đối tác đang được cập nhật.",
    requestTitle: "Cho chúng tôi biết nhu cầu của quán.",
    requestBody: "Một cuộc gọi ngắn thường tiết kiệm nhiều vòng gửi mẫu. Hãy để lại bối cảnh đủ để chúng tôi chuẩn bị đúng loại trà và đúng câu hỏi.",
    name: "Tên của bạn",
    business: "Quán / doanh nghiệp",
    contact: "Số điện thoại hoặc email",
    need: "Bạn cần trà cho sản phẩm nào, sản lượng dự kiến ra sao?",
    consent: "Tôi đồng ý để Nhà Hoàng Long dùng thông tin này để liên hệ về yêu cầu trên.",
    send: "Gửi yêu cầu",
    sending: "Đang gửi…",
    required: "Vui lòng điền tên, thông tin liên hệ, nhu cầu và xác nhận đồng ý.",
    failed: "Chưa gửi được yêu cầu. Vui lòng thử lại hoặc gọi trực tiếp.",
    sent: "Đã chuyển đến bàn đối tác.",
    sentBody: "Nhà sẽ liên hệ lại bằng thông tin bạn vừa cung cấp.",
    call: "Gọi Nhà · 0903 333 841",
    footer: "Trà Việt cho những công thức cần vị trà rõ ràng.",
  },
  en: {
    switcher: "VI",
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
  const [lang, setLang] = useState("vi");
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({ name: "", business: "", contact: "", need: "", consent: false });
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const supabase = useMemo(() => createClient(), []);
  const t = COPY[lang];

  useEffect(() => {
    let live = true;
    supabase.from("catalog_products").select("*").eq("available", true).order("sort_order").then(({ data, error: catalogError }) => {
      if (live && !catalogError) setProducts((data || []).map(fromCatalogRow).filter((item) => item.kind !== "goods" && item.line === "everyday").slice(0, 6));
    });
    return () => { live = false; };
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
    setSent(true);
  };

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/" className={styles.back}><ArrowLeft size={17}/>{t.back}</Link>
        <button onClick={() => setLang(lang === "vi" ? "en" : "vi")}><Globe2 size={15}/>{t.switcher}</button>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p>{t.eyebrow}</p>
          <h1>{t.title}</h1>
          <p className={styles.intro}>{t.intro}</p>
          <div className={styles.actions}>
            <Link href="/sample"><FlaskConical size={17}/>{t.sample}</Link>
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
        <div className={styles.briefIntro}><p>Trade brief</p><h2>{t.requestTitle}</h2><p>{t.requestBody}</p><a href="tel:+84903333841"><Phone size={16}/>{t.call}</a></div>
        {sent ? <div className={styles.success}><span><Check size={19}/></span><h3>{t.sent}</h3><p>{t.sentBody}</p><Link href="/">{t.back}<ArrowRight size={16}/></Link></div> :
          <form onSubmit={submit}>
            <label>{t.name}<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required/></label>
            <label>{t.business}<input value={form.business} onChange={(e) => setForm({ ...form, business: e.target.value })}/></label>
            <label>{t.contact}<input value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} required/></label>
            <label>{t.need}<textarea value={form.need} onChange={(e) => setForm({ ...form, need: e.target.value })} required/></label>
            <label className={styles.consent}><input type="checkbox" checked={form.consent} onChange={(e) => setForm({ ...form, consent: e.target.checked })}/>{t.consent}</label>
            {error && <p className={styles.error} role="alert">{error}</p>}
            <button disabled={sending || !form.name.trim() || !form.contact.trim() || !form.need.trim() || !form.consent}>{sending ? t.sending : t.send}<ArrowRight size={16}/></button>
          </form>}
      </section>

      <footer className={styles.footer}><p>{t.footer}</p><span>House of Hoàng Long · Since 1995</span></footer>
    </main>
  );
}

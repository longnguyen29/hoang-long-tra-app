"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Leaf, Loader2, Phone } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { notifyHouse } from "@/lib/notify";
import Atmosphere from "@/components/Atmosphere";
import styles from "./SampleRequest.module.css";

const PACKS = [
  {
    id: "50g", free: true,
    weight: { en: "4 × 50g · 200g total", vi: "4 × 50g · tổng 200g" },
    purpose: { en: "First compatibility test", vi: "Kiểm tra độ hợp vị" },
    detail: {
      en: "For the first brews: compare the four teas and decide which ones deserve a full recipe test.",
      vi: "Dành cho lần pha đầu: so sánh bốn mẫu và chọn loại đáng để phát triển thành công thức hoàn chỉnh.",
    },
  },
  {
    id: "100g", price: 199000,
    weight: { en: "4 × 100g · 400g total", vi: "4 × 100g · tổng 400g" },
    purpose: { en: "Recipe calibration", vi: "Điều chỉnh công thức" },
    detail: {
      en: "Enough room to adjust tea, milk, sugar, temperature and steep time across several brews.",
      vi: "Có đủ lượng trà để điều chỉnh tỷ lệ trà, sữa, đường, nhiệt độ và thời gian ủ qua nhiều lần pha.",
    },
  },
  {
    id: "250g", price: 299000,
    weight: { en: "4 × 250g · 1kg total", vi: "4 × 250g · tổng 1kg" },
    purpose: { en: "Small service trial", vi: "Chạy thử tại quán" },
    detail: {
      en: "For testing a finished drink with your team or customers before committing to a wholesale order.",
      vi: "Dành cho công thức đã tương đối hoàn chỉnh, cần thử với đội ngũ hoặc khách trước khi nhập sỉ.",
    },
  },
];

const HEARD_OPTIONS = [
  { id: "threads", label: { en: "Threads", vi: "Threads" } },
  { id: "tiktok", label: { en: "TikTok", vi: "TikTok" } },
  { id: "facebook_instagram", label: { en: "Facebook / Instagram", vi: "Facebook / Instagram" } },
  { id: "word_of_mouth", label: { en: "Recommendation", vi: "Người quen giới thiệu" } },
];

const QUALIFY = [
  { key: "hasShop", en: "I run a shop or I am currently developing a drinks menu.", vi: "Tôi đang vận hành quán hoặc phát triển menu đồ uống." },
  { key: "canReformulate", en: "I can test the tea in a real recipe and adjust the formula around it.", vi: "Tôi có thể thử trà trong công thức thực tế và điều chỉnh công thức quanh loại trà." },
  { key: "canFeedback", en: "I can share the brewing result within seven days of receiving it.", vi: "Tôi có thể phản hồi kết quả trong vòng 7 ngày sau khi nhận mẫu." },
];

const STR = {
  en: {
    eyebrow: "Trade sample · cafés and drinks teams",
    title: "Test four tea bases in the drinks you already serve.",
    intro: "Brew at your own bar, adjust the recipe and judge the result before committing to a wholesale order. The set is prepared from ancient-tree Shan Tuyết tea from Hà Giang, processed with Japanese technology.",
    imageAlt: "A finished tea drink being tested at a café bar",
    imageCaption: "The point of a sample is not another tasting cup. It is a recipe your shop can actually serve.",
    setTitle: "Inside the test",
    facts: [["4", "tea samples selected from the batches currently available"], ["At your bar", "tested with your water, equipment and actual recipe"], ["A decision", "identify what fits before discussing a wholesale order"]],
    stepPack: "Choose the test", stepDetails: "Delivery details",
    pickPack: "Choose the amount that matches the decision you need to make",
    packHelp: "All three options contain four tea samples. Only the working quantity changes.",
    free: "Free", paidCredit: "Credited to the first wholesale order",
    creditNote: "The amount paid for this set is deducted from your first wholesale order.",
    qualifyTitle: "Free-set eligibility",
    qualifyIntro: "The free 50g set is reserved for shops able to complete a useful working test.",
    qualifyFail: "Complete all three points to request the free set, or choose a paid set without these conditions.",
    continue: "Continue to delivery", selected: "Your selected test", change: "Change",
    detailsTitle: "Where should we send it?",
    detailsIntro: "We use these details only to confirm the request and arrange delivery.",
    storeLabel: "Shop or business name", storePh: "For example: Mây Tea Lab",
    nameLabel: "Contact name", namePh: "Your name",
    phoneLabel: "Phone number", phonePh: "The number we should call to confirm",
    addressLabel: "Delivery address", addressPh: "Street, ward, district and province",
    optional: "Optional context", noteLabel: "What are you trying to make?", notePh: "A milk tea, fruit tea, cold brew, signature drink…",
    heardTitle: "Where did you hear about Hoàng Long?",
    nextTitle: "What happens after you submit",
    next: ["Hoàng Long calls to confirm the shop, address and suitable set.", "The four samples are prepared and sent to your shop.", "You test them in your recipe and share the result.", "We use the result to recommend the next tea or discuss wholesale pricing."],
    back: "Back to pack", send: "Request the test set", sending: "Submitting…",
    privacyLead: "By submitting, you agree that we may contact you about this sample request.",
    sentTitle: "Request received",
    sentBody: "We will call to confirm the request and delivery details before preparing the set.",
    sentNext: "Next: keep an eye on the phone number you provided. No payment is taken on this page.",
    errRequired: "Add the shop name, phone number and delivery address before submitting.",
    errDuplicate: "There is already an open sample request for this number. Call us if you need an update.",
    errGeneric: "The request was not submitted. Try again, or call 0903 333 841.",
    callUs: "0903 333 841", backHome: "House of Hoàng Long", seeTheTeas: "See the current teas",
    privacy: "Privacy policy", required: "Required", optionalShort: "Optional",
  },
  vi: {
    eyebrow: "Bộ mẫu cho quán · pha chế và R&D",
    title: "Thử 4 nền trà trong công thức đang bán tại quán.",
    intro: "Pha ngay tại quầy, điều chỉnh công thức và đánh giá kết quả trước khi quyết định nhập sỉ. Bộ mẫu được chuẩn bị từ trà Shan Tuyết cổ thụ Hà Giang, chế biến theo quy trình ứng dụng công nghệ Nhật Bản.",
    imageAlt: "Một ly trà hoàn thiện đang được thử tại quầy pha chế",
    imageCaption: "Đích đến của bộ mẫu không phải thêm một ly trà thử. Mà là một công thức quán có thể phục vụ thật.",
    setTitle: "Bộ thử giúp quán làm gì?",
    facts: [["4", "mẫu trà được chọn theo những mẻ đang có"], ["Tại quầy", "thử bằng nguồn nước, thiết bị và công thức thực tế của quán"], ["Ra quyết định", "chọn loại phù hợp trước khi trao đổi đơn sỉ"]],
    stepPack: "Chọn bộ thử", stepDetails: "Thông tin nhận mẫu",
    pickPack: "Chọn lượng trà phù hợp với điều quán cần kiểm chứng",
    packHelp: "Cả ba lựa chọn đều có bốn mẫu trà. Khác nhau ở lượng trà để quán thử sâu đến đâu.",
    free: "Miễn phí", paidCredit: "Trừ vào đơn sỉ đầu tiên",
    creditNote: "Số tiền thanh toán cho bộ mẫu sẽ được trừ vào đơn sỉ đầu tiên.",
    qualifyTitle: "Điều kiện nhận bộ miễn phí",
    qualifyIntro: "Bộ 50g miễn phí dành cho quán có thể thực hiện một lần thử thực tế và phản hồi kết quả.",
    qualifyFail: "Xác nhận đủ ba điều kiện để nhận bộ miễn phí, hoặc chọn bộ trả phí không cần điều kiện này.",
    continue: "Tiếp tục nhận mẫu", selected: "Bộ thử đã chọn", change: "Đổi",
    detailsTitle: "Gửi mẫu về đâu?", detailsIntro: "Thông tin chỉ được dùng để xác nhận yêu cầu và sắp xếp giao mẫu.",
    storeLabel: "Tên quán hoặc doanh nghiệp", storePh: "Ví dụ: Mây Tea Lab",
    nameLabel: "Người liên hệ", namePh: "Tên của bạn",
    phoneLabel: "Số điện thoại", phonePh: "Số dùng để xác nhận yêu cầu",
    addressLabel: "Địa chỉ nhận mẫu", addressPh: "Số nhà, phường/xã, quận/huyện, tỉnh/thành",
    optional: "Thông tin thêm — không bắt buộc", noteLabel: "Quán đang muốn làm món gì?", notePh: "Trà sữa, trà trái cây, cold brew, món đặc trưng…",
    heardTitle: "Bạn biết đến Hoàng Long từ đâu?",
    nextTitle: "Sau khi gửi yêu cầu",
    next: ["Hoàng Long gọi xác nhận quán, địa chỉ và bộ thử phù hợp.", "Bốn mẫu trà được chuẩn bị và gửi về quán.", "Quán thử trong công thức thực tế và phản hồi kết quả.", "Từ kết quả đó, chúng tôi đề xuất bước thử tiếp theo hoặc trao đổi giá sỉ."],
    back: "Quay lại chọn bộ", send: "Gửi yêu cầu nhận mẫu", sending: "Đang gửi…",
    privacyLead: "Khi gửi yêu cầu, bạn đồng ý để chúng tôi liên hệ về bộ mẫu này.",
    sentTitle: "Đã nhận yêu cầu", sentBody: "Chúng tôi sẽ gọi xác nhận yêu cầu và địa chỉ trước khi chuẩn bị bộ mẫu.",
    sentNext: "Bước tiếp theo: để ý số điện thoại đã cung cấp. Trang này không tự thu tiền.",
    errRequired: "Vui lòng thêm tên quán, số điện thoại và địa chỉ nhận mẫu.",
    errDuplicate: "Số này đang có một yêu cầu mẫu chưa xử lý. Gọi cho chúng tôi nếu cần kiểm tra tiến độ.",
    errGeneric: "Chưa gửi được yêu cầu. Vui lòng thử lại, hoặc gọi 0903 333 841.",
    callUs: "0903 333 841", backHome: "Nhà Hoàng Long", seeTheTeas: "Xem trà đang có",
    privacy: "Chính sách quyền riêng tư", required: "Bắt buộc", optionalShort: "Không bắt buộc",
  },
};

const money = (amount) => `${amount.toLocaleString("vi-VN")}đ`;

export default function SampleRequest() {
  const [supabase] = useState(() => createClient());
  const { locale: lang, toggleLocale } = useLocale();
  const [step, setStep] = useState(1);
  const [pack, setPack] = useState("50g");
  const [checks, setChecks] = useState({ hasShop: false, canReformulate: false, canFeedback: false });
  const [form, setForm] = useState({ store: "", name: "", phone: "", address: "", note: "", heardFrom: "" });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [growthCode, setGrowthCode] = useState("");

  useEffect(() => {
    const code = (new URLSearchParams(window.location.search).get("exp") || "").trim().toLowerCase();
    setGrowthCode(code);
    if (code) setForm((current) => ({ ...current, heardFrom: current.heardFrom || "threads" }));

    let session = "";
    try {
      session = window.localStorage.getItem("hl-visitor-session") || crypto.randomUUID();
      window.localStorage.setItem("hl-visitor-session", session);
      const viewKey = `hl-growth-view:${code || "direct"}`;
      if (window.sessionStorage.getItem(viewKey)) return;
      window.sessionStorage.setItem(viewKey, "1");
    } catch {
      session = crypto.randomUUID();
    }
    supabase.rpc("record_growth_page_view", {
      p_path: code ? `/sample?exp=${code}` : "/sample",
      p_session: session,
      p_referrer: document.referrer || "",
      p_lang: document.documentElement.lang || "vi",
      p_growth_code: code,
    }).then(({ error: viewError }) => {
      // Attribution must never interrupt a shop's sample request. Older deployments may
      // briefly serve the page before migration 0045 is applied.
      if (viewError) console.debug("Growth attribution unavailable", viewError.message);
    });
  }, [supabase]);

  const t = STR[lang];
  const selectedPack = PACKS.find((item) => item.id === pack) || PACKS[0];
  const needsQualifying = pack === "50g";
  const qualified = QUALIFY.every((item) => checks[item.key]);
  const canContinue = !needsQualifying || qualified;
  const canSend = Boolean(form.store.trim() && form.phone.trim() && form.address.trim() && canContinue);
  const updateForm = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const scrollToTop = () => window.scrollTo({
    top: 0,
    behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
  });

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    if (!form.store.trim() || !form.phone.trim() || !form.address.trim()) {
      setError(t.errRequired);
      return;
    }
    setSending(true);
    try {
      const { data, error: requestError } = await supabase.rpc("submit_sample_request", {
        p_store_name: form.store.trim(), p_contact_name: form.name.trim(), p_phone: form.phone.trim(),
        p_address: form.address.trim(), p_pack: pack, p_has_shop: checks.hasShop,
        p_can_reformulate: checks.canReformulate, p_can_feedback: checks.canFeedback,
        p_note: form.note.trim(), p_heard_from: form.heardFrom, p_growth_code: growthCode,
      });
      if (requestError) throw requestError;
      notifyHouse("sample_requests", data);
      setSent(true);
      scrollToTop();
    } catch (requestError) {
      console.error("Sample request failed:", requestError);
      const message = requestError?.message || "";
      setError(message.includes("already_requested") ? t.errDuplicate
        : message.includes("not_qualified") ? t.qualifyFail
        : message.includes("_required") ? t.errRequired : t.errGeneric);
    } finally {
      setSending(false);
    }
  };

  const renderField = ({ key, label, placeholder, required = false, type = "text", autoComplete }) => (
    <label className={styles.field} htmlFor={`sample-${key}`}>
      <span>{label}<small>{required ? t.required : t.optionalShort}</small></span>
      <input id={`sample-${key}`} type={type} inputMode={type === "tel" ? "tel" : undefined}
        autoComplete={autoComplete} value={form[key]} onChange={(event) => updateForm(key, event.target.value)}
        placeholder={placeholder} required={required} />
    </label>
  );

  return (
    <main className={styles.page} data-sample-page>
      <header className={styles.header}>
        <a className={styles.wordmark} href="/" aria-label={t.backHome}>
          <span className={styles.seal}>皇龍</span><span className={styles.brandName}>{t.backHome}</span>
        </a>
        <button className={styles.language} type="button" onClick={toggleLocale}
          aria-label={lang === "vi" ? "Switch to English" : "Chuyển sang tiếng Việt"}>{lang === "vi" ? "EN" : "VI"}</button>
      </header>

      {sent ? (
        <section className={styles.success} aria-live="polite">
          <div className={styles.successMark}><Check aria-hidden="true" /></div>
          <p className={styles.eyebrow}>{t.eyebrow}</p><h1>{t.sentTitle}</h1><p>{t.sentBody}</p>
          <div className={styles.successNext}>{t.sentNext}</div>
          <div className={styles.successActions}>
            <a className={styles.primaryLink} href="tel:+84903333841"><Phone aria-hidden="true" />{t.callUs}</a>
            <a className={styles.textLink} href="/">{t.seeTheTeas}<ArrowRight aria-hidden="true" /></a>
          </div>
        </section>
      ) : (
        <div className={styles.studio}>
          <section className={styles.story}>
            <Atmosphere className={styles.storyCopy} family="honey-shan" strength="quiet">
              <p className={styles.eyebrow}>{t.eyebrow}</p><h1>{t.title}</h1><p className={styles.intro}>{t.intro}</p>
            </Atmosphere>
            <figure className={styles.evidence}><img src="/landing/4.jpg" alt={t.imageAlt} /><figcaption>{t.imageCaption}</figcaption></figure>
            <section className={styles.facts} aria-labelledby="sample-set-title">
              <h2 id="sample-set-title">{t.setTitle}</h2><div>{t.facts.map(([lead, body]) => <article key={lead}><strong>{lead}</strong><p>{body}</p></article>)}</div>
            </section>
          </section>

          <section className={styles.request} aria-label={step === 1 ? t.stepPack : t.stepDetails}>
            <ol className={styles.steps} aria-label={lang === "vi" ? "Tiến trình đăng ký" : "Request progress"}>
              <li data-active={step === 1} data-complete={step > 1}><span>1</span>{t.stepPack}</li>
              <li data-active={step === 2}><span>2</span>{t.stepDetails}</li>
            </ol>

            {step === 1 ? (
              <div className={styles.stepPanel}>
                <div className={styles.panelHeading}><h2>{t.pickPack}</h2><p>{t.packHelp}</p></div>
                <div className={styles.packList} role="radiogroup" aria-label={t.pickPack}>
                  {PACKS.map((item) => {
                    const selected = pack === item.id;
                    return <button className={styles.pack} data-selected={selected} key={item.id} type="button" role="radio" aria-checked={selected}
                      onClick={() => { setPack(item.id); setError(""); }}>
                      <span className={styles.radioMark} aria-hidden="true">{selected && <Check />}</span>
                      <span className={styles.packCopy}>
                        <span className={styles.packTop}><strong>{item.purpose[lang]}</strong><b>{item.free ? t.free : money(item.price)}</b></span>
                        <span className={styles.packWeight}>{item.weight[lang]}</span><span className={styles.packDetail}>{item.detail[lang]}</span>
                        {!item.free && <span className={styles.creditTag}>{t.paidCredit}</span>}
                      </span>
                    </button>;
                  })}
                </div>
                {!needsQualifying && <p className={styles.creditNote}>{t.creditNote}</p>}
                {needsQualifying && <fieldset className={styles.qualification}>
                  <legend>{t.qualifyTitle}</legend><p>{t.qualifyIntro}</p><div>
                    {QUALIFY.map((item) => <label key={item.key} data-checked={checks[item.key]}>
                      <input type="checkbox" checked={checks[item.key]} onChange={(event) => {
                        setChecks((current) => ({ ...current, [item.key]: event.target.checked })); setError("");
                      }} /><span>{item[lang]}</span>
                    </label>)}
                  </div>
                  {!qualified && Object.values(checks).some(Boolean) && <p className={styles.qualificationHint}>{t.qualifyFail}</p>}
                </fieldset>}
                <button className={styles.primaryButton} type="button" disabled={!canContinue}
                  onClick={() => { setStep(2); setError(""); scrollToTop(); }}>
                  {t.continue}<ArrowRight aria-hidden="true" />
                </button>
              </div>
            ) : (
              <form className={styles.stepPanel} onSubmit={submit}>
                <div className={styles.selectionSummary}><div><span>{t.selected}</span><strong>{selectedPack.purpose[lang]}</strong>
                  <small>{selectedPack.weight[lang]} · {selectedPack.free ? t.free : money(selectedPack.price)}</small></div>
                  <button type="button" onClick={() => { setStep(1); setError(""); }}>{t.change}</button></div>
                <div className={styles.panelHeading}><h2>{t.detailsTitle}</h2><p>{t.detailsIntro}</p></div>
                <div className={styles.fields}>
                  {renderField({ key: "store", label: t.storeLabel, placeholder: t.storePh, required: true, autoComplete: "organization" })}
                  {renderField({ key: "name", label: t.nameLabel, placeholder: t.namePh, autoComplete: "name" })}
                  {renderField({ key: "phone", label: t.phoneLabel, placeholder: t.phonePh, required: true, type: "tel", autoComplete: "tel" })}
                  {renderField({ key: "address", label: t.addressLabel, placeholder: t.addressPh, required: true, autoComplete: "street-address" })}
                </div>
                <details className={styles.optional}><summary>{t.optional}<span>+</span></summary><div>
                  <label className={styles.field} htmlFor="sample-note"><span>{t.noteLabel}<small>{t.optionalShort}</small></span>
                    <textarea id="sample-note" rows={3} value={form.note} onChange={(event) => updateForm("note", event.target.value)} placeholder={t.notePh} /></label>
                  <fieldset className={styles.heardFrom}><legend>{t.heardTitle}</legend><div>{HEARD_OPTIONS.map((item) => {
                    const selected = form.heardFrom === item.id;
                    return <button type="button" data-selected={selected} aria-pressed={selected} key={item.id}
                      onClick={() => updateForm("heardFrom", selected ? "" : item.id)}>{item.label[lang] || item.label.vi}</button>;
                  })}</div></fieldset>
                </div></details>
                <section className={styles.nextSteps} aria-labelledby="sample-next-title"><h3 id="sample-next-title">{t.nextTitle}</h3><ol>
                  {t.next.map((item, index) => <li key={item}><span>{index + 1}</span><p>{item}</p></li>)}
                </ol></section>
                {error && <p className={styles.error} role="alert">{error}</p>}
                <p className={styles.privacyLead}>{t.privacyLead} <a href="/privacy">{t.privacy}</a></p>
                <div className={styles.formActions}>
                  <button className={styles.secondaryButton} type="button" onClick={() => { setStep(1); setError(""); }}><ArrowLeft aria-hidden="true" />{t.back}</button>
                  <button className={styles.primaryButton} type="submit" disabled={sending || !canSend}>
                    {sending ? <Loader2 className={styles.spinner} aria-hidden="true" /> : <Leaf aria-hidden="true" />}{sending ? t.sending : t.send}
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>
      )}
      <footer className={styles.footer}><span>House of Hoàng Long · Hà Giang</span><a href="/privacy">{t.privacy}</a></footer>
    </main>
  );
}

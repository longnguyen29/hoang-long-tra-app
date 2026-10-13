"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { EXPORT_TEAS } from "@/lib/export-teas";
import { exportAttribution, exportLink, exportRequirementsLimit, normalizeExportConnectorContact } from "@/lib/export-enquiry";
import styles from "./ExportEnquiry.module.css";

const COPY = {
  vi: {
    sender: "Bạn gửi nhu cầu với vai trò nào?", senderRoles: { buyer: "Khách mua", connector: "Đối tác giới thiệu" }, customerSection: "Khách hàng cần trà", customerHint: "Điền thông tin bên mua trà. Nếu bạn là đối tác giới thiệu, hãy ghi người liên hệ của khách tại đây.", connectorSection: "Thông tin của đối tác giới thiệu", connectorSenderName: "Tên của bạn", connectorSenderContact: "Email hoặc số điện thoại của bạn", connectorSenderHint: "Đây là liên hệ của bạn để Hoàng Long phối hợp, khác với khách mua trà.", connectorConsent: "Tôi là người giới thiệu, được khách cho phép chia sẻ thông tin trên và đồng ý để Hoàng Long lưu, liên hệ khách và tôi về nhu cầu này.",
    eyebrow: "Bước tiếp theo", title: "Gửi nhu cầu mua trà", intro: "Một yêu cầu cho mẫu, báo giá EXW hoặc lịch thăm nhà máy. Hoàng Long sẽ xác nhận quy cách, kiểm nghiệm và thời gian phù hợp trước khi chốt đơn.",
    company: "Công ty / đơn vị mua", name: "Người liên hệ của khách", contact: "Email hoặc số điện thoại của khách", contactHint: "Ví dụ: buyer@company.tw hoặc +886…", tea: "Dòng trà quan tâm", purpose: "Bạn muốn bắt đầu bằng", intents: { sample: "Thử mẫu", quote: "Báo giá EXW", factory_visit: "Thăm nhà máy" },
    quantity: "Khối lượng dự kiến (kg)", optional: "Không bắt buộc", date: "Ngày mong muốn", dateHint: "Ngày nhận hàng hoặc ngày thăm nhà máy; sẽ được xác nhận lại.",
    method: "Ưu tiên trao đổi qua", detail: "ID / số liên hệ cho kênh đã chọn", requirements: "Quy cách, kiểm nghiệm và yêu cầu khác", requirementsHint: "Bao bì, chỉ tiêu kiểm nghiệm, mẫu cần thử, cảng đến hoặc mục đích sử dụng…", details: "Thêm lịch giao, kênh liên hệ hoặc yêu cầu", consent: "Tôi là bên mua hoặc được phép chia sẻ liên hệ công việc này, và đồng ý để Hoàng Long lưu thông tin, liên hệ về yêu cầu trên.", currency: "Tiền tệ báo giá mong muốn", connectorName: "Người giới thiệu (nếu có)", connectorContact: "Liên hệ người giới thiệu (nếu được phép)", noteTooLong: "Rút gọn ghi chú theo giới hạn để giữ đủ thông tin trao đổi.",
    send: "Gửi nhu cầu", sending: "Đang gửi…", sent: "Hoàng Long đã nhận yêu cầu", sentBody: "Thông tin đã được lưu để tiếp tục trao đổi mẫu, báo giá hoặc thăm nhà máy. Đây chưa phải xác nhận đơn hàng hay đặt chỗ.", reference: "Mã yêu cầu", another: "Gửi yêu cầu khác", privacy: "Thông tin chỉ phục vụ trao đổi nhu cầu này.", privacyLink: "Chính sách bảo mật", connector: "Bạn là đối tác đã được duyệt?", partner: "Đăng ký khách giới thiệu tại bàn đối tác", partnerHint: "Quyền giới thiệu và hoa hồng được xác nhận trong tài khoản đối tác.",
    errors: { required: "Điền công ty, người liên hệ và email hoặc số điện thoại.", tea_required: "Chọn ít nhất một dòng trà.", invalid_contact: "Kiểm tra email hoặc số điện thoại quốc tế.", invalid_quantity: "Khối lượng phải là số kg lớn hơn 0.", invalid_date: "Kiểm tra lại ngày mong muốn.", contact_detail_required: "Thêm ID hoặc số liên hệ cho kênh đã chọn.", consent_required: "Vui lòng xác nhận quyền chia sẻ và đồng ý liên hệ.", authorization_required: "Vui lòng xác nhận quyền chia sẻ và đồng ý liên hệ.", invalid_request: "Kiểm tra lại thông tin rồi gửi lại.", rate_limited: "Có nhiều yêu cầu trong thời gian ngắn. Vui lòng chờ rồi thử lại.", unavailable: "Chưa xác nhận được yêu cầu đã lưu. Nội dung vẫn được giữ; thử lại sẽ không tạo yêu cầu trùng." },
  },
  en: {
    sender: "Who is submitting this enquiry?", senderRoles: { buyer: "Buyer", connector: "Referral partner" }, customerSection: "Customer buying tea", customerHint: "Enter the buying company and its contact person. Referral partners should not use their own details in this section.", connectorSection: "Referral partner's details", connectorSenderName: "Your name", connectorSenderContact: "Your email or phone number", connectorSenderHint: "This is Hoàng Long's coordination contact, distinct from the customer buying tea.", connectorConsent: "I am responsible for the connection, have the customer's permission to share this business information, and agree that Hoàng Long may save it and contact the customer and me about this enquiry.",
    eyebrow: "Next step", title: "Discuss your tea requirements", intro: "One brief for samples, an EXW quotation or a factory visit. Hoàng Long will confirm specifications, testing and timing before an order is agreed.",
    company: "Buying company / business", name: "Customer contact person", contact: "Customer email or international phone number", contactHint: "For example: buyer@company.tw or +886…", tea: "Teas of interest", purpose: "Start with", intents: { sample: "Samples", quote: "EXW quotation", factory_visit: "Factory visit" },
    quantity: "Expected volume (kg)", optional: "Optional", date: "Preferred date", dateHint: "Desired receipt or factory visit date; subject to confirmation.",
    method: "Preferred contact channel", detail: "ID / number for your preferred channel", requirements: "Packing, tests and other requirements", requirementsHint: "Packing format, test specifications, samples, destination port or intended application…", details: "Add timing, contact channel or specifications", consent: "I am the buyer or am authorized to share this business contact, and agree that Hoàng Long may save these details and contact us about this enquiry.", currency: "Preferred quote currency", connectorName: "Introduced by (optional)", connectorContact: "Introducer contact (if authorized)", noteTooLong: "Shorten the note to the limit shown so all requirements can be kept.",
    send: "Send enquiry", sending: "Sending…", sent: "Hoàng Long has received your enquiry", sentBody: "Your brief has been saved for samples, pricing or a factory visit. This is not an order confirmation or a visit booking.", reference: "Enquiry reference", another: "Send another enquiry", privacy: "Your details are used to respond to this enquiry.", privacyLink: "Privacy policy", connector: "Already an approved referral partner?", partner: "Register a referral in your partner desk", partnerHint: "Referral ownership and commission are confirmed through your partner account.",
    errors: { required: "Add the company, contact person and an email or phone number.", tea_required: "Select at least one tea.", invalid_contact: "Check your email or international phone number.", invalid_quantity: "Enter a volume in kg greater than zero.", invalid_date: "Check the preferred date.", contact_detail_required: "Add the ID or number for your preferred channel.", consent_required: "Confirm authorization and consent to contact.", authorization_required: "Confirm authorization and consent to contact.", invalid_request: "Check your details and try again.", rate_limited: "Several requests arrived recently. Please wait and try again.", unavailable: "We could not confirm that your brief was saved. Your details remain here; a retry will not create a duplicate request." },
  },
  "zh-TW": {
    sender: "您以什麼身分提出需求？", senderRoles: { buyer: "買方", connector: "介紹人" }, customerSection: "採購茶葉的客戶", customerHint: "請填寫採購公司及其聯絡人。介紹人請勿在此填寫自己的資訊。", connectorSection: "負責聯繫的介紹人", connectorSenderName: "您的姓名", connectorSenderContact: "您的電子郵件或電話", connectorSenderHint: "這是與 Hoàng Long 協調的窗口，與採購客戶不同。", connectorConsent: "我是負責聯繫的介紹人，已獲客戶授權分享此業務資訊，並同意 Hoàng Long 儲存資訊及就本次需求與客戶和我聯繫。",
    eyebrow: "下一步", title: "告訴我們您的採購需求", intro: "可申請樣品、EXW 報價或安排工廠參訪。正式下單前，Hoàng Long 將與您確認規格、檢驗需求及時程。",
    company: "採購公司／商號", name: "客戶聯絡人", contact: "客戶電子郵件或國際電話號碼", contactHint: "例如：buyer@company.tw 或 +886…", tea: "有興趣的茶款", purpose: "希望先進行", intents: { sample: "申請樣品", quote: "索取 EXW 報價", factory_visit: "工廠參訪" },
    quantity: "預計採購量（公斤）", optional: "選填", date: "希望日期", dateHint: "希望收貨或參訪的日期，仍需雙方確認。",
    method: "偏好的聯絡方式", detail: "所選聯絡方式的 ID／號碼", requirements: "包裝、檢驗及其他需求", requirementsHint: "包裝規格、檢驗項目、希望測試的樣品、目的港或用途…", details: "補充日期、聯絡方式或規格", consent: "我是買方，或已獲授權提供此業務聯絡資訊，並同意 Hoàng Long 儲存資料及就本次需求與我們聯繫。", currency: "希望報價的幣別", connectorName: "介紹人（選填）", connectorContact: "介紹人聯絡資訊（須經授權）", noteTooLong: "請依顯示的字數限制縮短備註，以保留所有需求資訊。",
    send: "送出需求", sending: "送出中…", sent: "Hoàng Long 已收到您的需求", sentBody: "需求已儲存，後續可討論樣品、報價或工廠參訪。送出需求不代表訂單確認或參訪預約已成立。", reference: "需求編號", another: "送出另一筆需求", privacy: "您的資料僅用於回覆本次需求。", privacyLink: "隱私政策", connector: "您已是核准的介紹合作夥伴嗎？", partner: "前往合作夥伴平台登記介紹客戶", partnerHint: "介紹歸屬與佣金以合作夥伴帳戶的確認紀錄為準。",
    errors: { required: "請填寫公司、聯絡人及電子郵件或電話。", tea_required: "請至少選擇一款茶。", invalid_contact: "請確認電子郵件或國際電話號碼。", invalid_quantity: "請填寫大於 0 的公斤數。", invalid_date: "請確認希望日期。", contact_detail_required: "請填寫所選聯絡方式的 ID 或號碼。", consent_required: "請確認您有權提供聯絡資訊，並同意聯繫。", authorization_required: "請確認您有權提供聯絡資訊，並同意聯繫。", invalid_request: "請確認資料後再送出。", rate_limited: "短時間內收到多筆需求，請稍後再試。", unavailable: "目前無法確認需求是否儲存。資料仍保留在此；重試不會重複建立需求。" },
  },
};
const INITIAL = { submitterRole: "buyer", business: "", name: "", contact: "", teaIds: [], intent: "quote", quantityKg: "", desiredDate: "", contactMethod: "email", contactDetail: "", requirements: "", website: "", currency: "TWD", connectorName: "", connectorContact: "" };
const SENDER_ERRORS = {
  vi: { connector_name_required: "Điền tên người phụ trách giới thiệu.", invalid_connector_contact: "Kiểm tra email hoặc số điện thoại của đối tác giới thiệu; không dùng ID LINE.", invalid_submitter_role: "Chọn Khách mua hoặc Đối tác giới thiệu." },
  en: { connector_name_required: "Add the responsible referral partner's name.", invalid_connector_contact: "Add the referral partner's valid email or phone number, not a LINE ID.", invalid_submitter_role: "Choose Buyer or Referral partner." },
  "zh-TW": { connector_name_required: "請填寫負責介紹人的姓名。", invalid_connector_contact: "請填寫介紹人有效的電子郵件或電話，不可使用 LINE ID。", invalid_submitter_role: "請選擇買方或介紹人。" },
};
const METHODS = { email: "Email", phone: { vi: "Điện thoại", en: "Phone", "zh-TW": "電話" }, line: "LINE", zalo: "Zalo", whatsapp: "WhatsApp" };

export default function ExportEnquiry({ locale = "zh-TW", selectedTeaIds = [], availableTeaIds = EXPORT_TEAS.map((tea) => tea.id), intent = "quote", compact = false, initialCurrency = "TWD" }) {
  const language = Object.hasOwn(COPY, locale) ? locale : "zh-TW";
  const t = COPY[language];
  const availableTeas = EXPORT_TEAS.filter((tea) => Array.isArray(availableTeaIds) && availableTeaIds.includes(tea.id));
  const availabilityKey = availableTeas.map((tea) => tea.id).join(",");
  const [form, setForm] = useState(() => ({ ...INITIAL, teaIds: [...new Set(selectedTeaIds)].filter((id) => availableTeas.some((tea) => tea.id === id)).slice(0, 4), intent: ["sample", "quote", "factory_visit"].includes(intent) ? intent : "quote", currency: ["VND", "USD", "TWD", "CNY"].includes(initialCurrency) ? initialCurrency : "TWD" }));
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [saved, setSaved] = useState(null);
  const [search, setSearch] = useState("");
  const requestId = useRef("");
  const quoteCurrencyEdited = useRef(false);
  useEffect(() => {
    if (!quoteCurrencyEdited.current && !inFlight.current && !saved && ["VND", "USD", "TWD", "CNY"].includes(initialCurrency)) {
      requestId.current = "";
      setForm(current => ({ ...current, currency: initialCurrency }));
    }
  }, [initialCurrency, saved]);
  const inFlight = useRef(false);
  const heading = useRef(null);
  useEffect(() => {
    if (inFlight.current || saved) return;
    setForm((current) => {
      const teaIds = current.teaIds.filter((id) => availabilityKey.split(",").includes(id));
      if (teaIds.length === current.teaIds.length) return current;
      requestId.current = "";
      return { ...current, teaIds };
    });
  }, [availabilityKey, saved]);
  useEffect(() => { setSearch(window.location.search); }, []);
  useEffect(() => {
    const selectTea = (event) => {
      if (inFlight.current || saved) return;
      const { teaId, intent, quantityKg, currency } = event.detail || {};
      if (teaId != null && !availableTeas.some((tea) => tea.id === teaId)) return;
      if (teaId == null && !["sample", "quote", "factory_visit"].includes(intent)) return;
      requestId.current = "";
      setError("");
      setForm((current) => ({ ...current, teaIds: !teaId || current.teaIds.includes(teaId) ? current.teaIds : [...current.teaIds, teaId], intent: ["sample", "quote", "factory_visit"].includes(intent) ? intent : current.intent,
        quantityKg: typeof quantityKg === "number" && Number.isFinite(quantityKg) && quantityKg > 0 && quantityKg <= 2000000 ? String(Math.round(quantityKg * 1000) / 1000) : current.quantityKg,
        currency: ["VND", "USD", "TWD", "CNY"].includes(currency) ? currency : current.currency }));
    };
    window.addEventListener("hl:export-enquiry", selectTea);
    return () => window.removeEventListener("hl:export-enquiry", selectTea);
  }, [saved, availabilityKey]);
  useEffect(() => { if (saved) heading.current?.focus(); }, [saved]);
  const update = (field, value) => {
    if (inFlight.current || saved) return;
    if (field === "currency") quoteCurrencyEdited.current = true;
    if (field === "submitterRole") setConsent(false);
    requestId.current = "";
    setError("");
    setForm((current) => ({ ...current, [field]: value, ...(field === "submitterRole" && value === "buyer" ? { connectorName: "", connectorContact: "" } : {}), ...(field === "contact" && ["email", "phone"].includes(current.contactMethod) ? { contactMethod: value.includes("@") ? "email" : "phone" } : {}) }));
  };
  const submit = async (event) => {
    event.preventDefault();
    if (inFlight.current || saved) return;
    if (!form.business.trim() || !form.name.trim() || !form.contact.trim()) { setError("required"); return; }
    if (!form.teaIds.length) { setError("tea_required"); return; }
    if (!consent) { setError("consent_required"); return; }
    if (form.submitterRole === "connector") {
      if (!form.connectorName.trim()) { setError("connector_name_required"); return; }
      try { normalizeExportConnectorContact(form.connectorContact); }
      catch { setError("invalid_connector_contact"); return; }
    }
    if (["line", "zalo", "whatsapp"].includes(form.contactMethod) && !form.contactDetail.trim()) { setError("contact_detail_required"); return; }
    if (form.requirements.length > exportRequirementsLimit(form, exportAttribution(search))) { setError("note_too_long"); return; }
    inFlight.current = true;
    setSending(true);
    setError("");
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 20000);
    try {
      if (!requestId.current) requestId.current = crypto.randomUUID();
      const response = await fetch("/api/export-enquiries", {
        method: "POST", headers: { "Content-Type": "application/json" }, signal: controller.signal,
        body: JSON.stringify({ ...form, consent: true, authorized: true, requestId: requestId.current, attribution: exportAttribution(search) }),
      });
      const result = await response.json();
      if (response.ok && result.ok === true && result.requestId === requestId.current && /^HL-E-[a-f0-9]{8}$/i.test(result.reference || "")) setSaved(result);
      else setError(result.error === "note_too_long" ? "note_too_long" : Object.hasOwn(t.errors, result.error) || Object.hasOwn(SENDER_ERRORS[language], result.error) ? result.error : "unavailable");
    } catch { setError("unavailable"); }
    finally { window.clearTimeout(timeout); inFlight.current = false; setSending(false); }
  };
  const reset = () => {
    quoteCurrencyEdited.current = false;
    requestId.current = ""; setSaved(null); setError(""); setForm({ ...INITIAL, currency: ["VND", "USD", "TWD", "CNY"].includes(initialCurrency) ? initialCurrency : "TWD" }); setConsent(false);
  };
  const needsChannel = ["line", "zalo", "whatsapp"].includes(form.contactMethod);
  const noteLimit = exportRequirementsLimit(form, exportAttribution(search));
  const noteTooLong = form.requirements.length > noteLimit;
  return <section id="export-enquiry" className={`${styles.section} ${compact ? styles.compact : ""}`} lang={language} aria-labelledby="export-enquiry-title">
    <div className={styles.intro}>
      <p className={styles.eyebrow}>{t.eyebrow}</p><h2 id="export-enquiry-title">{t.title}</h2><p>{t.intro}</p>
      {!compact && <aside className={styles.partner}><strong>{t.connector}</strong><Link href={exportLink("/partners/network", search, language)}>{t.partner}<ArrowRight size={16} aria-hidden="true"/></Link><p>{t.partnerHint}</p></aside>}
    </div>
    {saved ? <div className={styles.saved} role="status"><Check size={24} aria-hidden="true"/><h3 ref={heading} tabIndex={-1}>{t.sent}</h3><p>{t.sentBody}</p><p>{t.reference}: <strong>{saved.reference}</strong></p><button type="button" onClick={reset}>{t.another}</button></div> :
      <form className={styles.form} onSubmit={submit} aria-busy={sending}>
        <fieldset className={styles.fields} disabled={sending}>
          <label className={styles.honeypot} aria-hidden="true">Website<input name="website" tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => update("website", e.target.value)}/></label>
          <fieldset className={styles.selection}><legend>{t.sender}</legend><div>{Object.entries(t.senderRoles).map(([role, label]) => <label key={role}><input type="radio" name="submitterRole" value={role} checked={form.submitterRole === role} onChange={() => update("submitterRole", role)}/><span>{label}</span></label>)}</div></fieldset>
          <div><h3>{t.customerSection}</h3><p className={styles.privacy}>{t.customerHint}</p></div>
          <label className={styles.field}>{t.company}<input name="organization" autoComplete={form.submitterRole === "connector" ? "off" : "organization"} required maxLength={120} value={form.business} onChange={(e) => update("business", e.target.value)}/></label>
          <div className={styles.twoFields}>
            <label className={styles.field}>{t.name}<input name="name" autoComplete={form.submitterRole === "connector" ? "off" : "name"} required maxLength={80} value={form.name} onChange={(e) => update("name", e.target.value)}/></label>
            <label className={styles.field}>{t.contact}<input name="contact" required maxLength={120} placeholder={t.contactHint} aria-invalid={error === "invalid_contact"} value={form.contact} onChange={(e) => update("contact", e.target.value)}/></label>
          </div>
          {form.submitterRole === "connector" && <section className={styles.saved} aria-labelledby="export-connector-title"><h3 id="export-connector-title">{t.connectorSection}</h3><p>{t.connectorSenderHint}</p><div className={styles.twoFields}><label className={styles.field}>{t.connectorSenderName}<input name="connectorName" required maxLength={40} autoComplete="name" aria-invalid={error === "connector_name_required"} value={form.connectorName} onChange={(e) => update("connectorName", e.target.value)}/></label><label className={styles.field}>{t.connectorSenderContact}<input name="connectorContact" required maxLength={60} autoComplete="off" placeholder="Email / +886… / +84…" aria-invalid={error === "invalid_connector_contact"} value={form.connectorContact} onChange={(e) => update("connectorContact", e.target.value)}/></label></div></section>}
          <fieldset className={styles.selection}><legend>{t.tea}</legend><div>{availableTeas.map((tea) => <label key={tea.id}><input type="checkbox" checked={form.teaIds.includes(tea.id)} onChange={(e) => update("teaIds", e.target.checked ? [...form.teaIds, tea.id] : form.teaIds.filter((id) => id !== tea.id))}/><span>{tea.name[language]}</span></label>)}</div></fieldset>
          <div className={styles.twoFields}>
            <label className={styles.field}>{t.purpose}<select name="intent" value={form.intent} onChange={(e) => update("intent", e.target.value)}>{Object.entries(t.intents).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
            <label className={styles.field}>{t.quantity}<input name="quantityKg" type="number" min="0.001" max="10000000" step="0.001" placeholder={t.optional} value={form.quantityKg} onChange={(e) => update("quantityKg", e.target.value)}/></label>
          </div>
          <details className={styles.details}><summary>{t.details}</summary><div>
            <div className={styles.twoFields}>
              <label className={styles.field}>{t.date}<input type="date" name="desiredDate" aria-describedby="export-date-hint" value={form.desiredDate} onChange={(e) => update("desiredDate", e.target.value)}/><small id="export-date-hint">{t.dateHint}</small></label>
              <label className={styles.field}>{t.method}<select name="contactMethod" value={form.contactMethod} onChange={(e) => update("contactMethod", e.target.value)}>{Object.entries(METHODS).map(([key, label]) => <option key={key} value={key}>{typeof label === "string" ? label : label[language]}</option>)}</select></label>
            </div>
            {needsChannel && <label className={styles.field}>{t.detail}<input name="contactDetail" required maxLength={60} value={form.contactDetail} onChange={(e) => update("contactDetail", e.target.value)}/></label>}
            <div className={styles.twoFields}><label className={styles.field}>{t.currency}<select name="currency" value={form.currency} onChange={(e) => update("currency", e.target.value)}>{["USD", "TWD", "VND", "CNY"].map((currency) => <option key={currency} value={currency}>{currency}</option>)}</select></label>{!compact && form.submitterRole === "buyer" && <label className={styles.field}>{t.connectorName}<input name="connectorName" maxLength={40} value={form.connectorName} onChange={(e) => update("connectorName", e.target.value)}/></label>}</div>
            {!compact && form.submitterRole === "buyer" && <label className={styles.field}>{t.connectorContact}<input name="connectorContact" maxLength={60} value={form.connectorContact} onChange={(e) => update("connectorContact", e.target.value)}/></label>}
            <label className={styles.field}>{t.requirements}<textarea name="requirements" rows={3} maxLength={noteLimit} placeholder={t.requirementsHint} aria-invalid={noteTooLong} value={form.requirements} onChange={(e) => update("requirements", e.target.value)}/><small>{form.requirements.length}/{noteLimit}</small></label>
            {noteTooLong && <p className={styles.error} role="alert">{t.noteTooLong}</p>}
          </div></details>
          <label className={styles.consent}><input type="checkbox" checked={consent} required onChange={(e) => { if (inFlight.current) return; requestId.current = ""; setError(""); setConsent(e.target.checked); }}/><span>{form.submitterRole === "connector" ? t.connectorConsent : t.consent}</span></label>
          {error && <p className={styles.error} role="alert">{error === "note_too_long" ? t.noteTooLong : SENDER_ERRORS[language][error] || t.errors[error]}</p>}
          <button className={styles.submit} type="submit" disabled={noteTooLong}>{sending ? t.sending : t.send}<ArrowRight size={17} aria-hidden="true"/></button>
          <p className={styles.privacy}>{t.privacy} <Link href="/privacy">{t.privacyLink}</Link></p>
        </fieldset>
      </form>}
  </section>;
}

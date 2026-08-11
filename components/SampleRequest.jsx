"use client";

import { useState } from "react";
import { Check, Loader2, Leaf, Phone } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { TOKENS } from "@/lib/constants";

// The trade sample page. Reached only by a link the house hands out, so it explains itself
// from scratch — whoever opens it may never have seen the site.
//
// The 50g pack is free, but only for a working shop that will actually put it through their
// bar and say what happened. The larger packs are paid, and what they pay comes off their
// first wholesale order, so the money is a deposit rather than a cost.

const PACKS = [
  {
    id: "50g",
    free: true,
    label: { en: "50g of each — free", vi: "50g mỗi loại — miễn phí" },
    detail: {
      en: "Four teas, 50g each. Enough to pull a dozen test drinks and find out whether our leaf suits your bar.",
      vi: "Bốn loại trà, mỗi loại 50g. Đủ để pha hơn chục ly thử và biết trà của chúng tôi có hợp quán bạn không.",
    },
  },
  {
    id: "100g",
    price: 199000,
    label: { en: "100g of each", vi: "100g mỗi loại" },
    detail: {
      en: "For working a recipe properly — enough to brew a batch the way you actually serve it.",
      vi: "Đủ để làm việc với công thức tử tế — pha nguyên mẻ đúng như cách bạn bán.",
    },
  },
  {
    id: "250g",
    price: 299000,
    label: { en: "250g of each — 1kg total", vi: "250g mỗi loại — tổng 1kg" },
    detail: {
      en: "Enough to run a limited-time item and watch how it sells before committing.",
      vi: "Đủ để chạy thử một món giới hạn và xem bán thế nào trước khi quyết định.",
    },
  },
];

const QUALIFY = [
  {
    key: "hasShop",
    en: "I'm running a café, tea shop or bar right now — not planning one.",
    vi: "Tôi đang vận hành quán cà phê, quán trà hoặc bar — không phải đang dự định mở.",
  },
  {
    key: "canReformulate",
    // Deliberately explicit. A shop that only swaps our tea into an existing recipe will
    // judge it against a leaf it was never built for, and conclude wrongly.
    en: "I can build a drink around this tea — adjust the ratio, the milk, the sugar, the steep — rather than only dropping it into a recipe built for a different leaf.",
    vi: "Tôi có thể xây công thức quanh loại trà này — chỉnh tỉ lệ, sữa, đường, thời gian ủ — chứ không chỉ thay mỗi nguyên liệu trà trong công thức vốn làm cho loại khác.",
  },
  {
    key: "canFeedback",
    en: "I can brew it and tell you what I found within 3–7 days.",
    vi: "Tôi có thể pha thử và phản hồi kết quả trong 3–7 ngày.",
  },
];

const STR = {
  en: {
    eyebrow: "For cafés and tea rooms",
    title: "Try our leaf on your own bar",
    intro:
      "We grow and process ancient Shan tea in Hà Giang. The only way to know whether it works for you is to brew it where you actually serve — so tell us where to send it.",
    pickPack: "Which size?",
    free: "Free",
    creditNote:
      "What you pay for this comes off your first wholesale order. It is a deposit, not a cost.",
    qualifyTitle: "Before we send the free pack",
    qualifyIntro:
      "The free pack is for shops that will genuinely put it through service. Three honest answers:",
    qualifyFail:
      "For the free pack we need all three. If that isn't you yet, the 100g or 250g pack is open to anyone — and what you pay comes off your first wholesale order.",
    detailsTitle: "Where should it go?",
    storePh: "Shop name",
    namePh: "Your name",
    phonePh: "Phone number",
    addressPh: "Delivery address",
    notePh: "Anything we should know? (optional)",
    send: "Send me the sample",
    sending: "Sending",
    sentTitle: "On its way",
    sentBody:
      "We'll call to confirm the address before it ships. If you brew it and tell us what you found, that's all we ask.",
    errRequired: "Shop name, phone and address are needed so we can actually send it.",
    errDuplicate: "There's already a sample request open for this number. Call us if it hasn't arrived.",
    errGeneric: "That didn't go through. Please try again, or call us on 0903 333 841.",
    callUs: "0903 333 841",
    backHome: "House of Hoàng Long",
    seeTheTeas: "See all our teas",
  },
  vi: {
    eyebrow: "Dành cho quán pha chế",
    title: "Thử trà của chúng tôi ngay trên quầy của bạn",
    intro:
      "Chúng tôi trồng và chế biến trà Shan cổ thụ ở Hà Giang. Cách duy nhất để biết trà có hợp hay không là pha ngay tại nơi bạn bán — nên hãy cho chúng tôi biết gửi về đâu.",
    pickPack: "Chọn cỡ gói",
    free: "Miễn phí",
    creditNote:
      "Số tiền bạn trả cho gói này sẽ được trừ vào đơn sỉ đầu tiên. Đây là tiền cọc, không phải chi phí.",
    qualifyTitle: "Trước khi gửi gói miễn phí",
    qualifyIntro:
      "Gói miễn phí dành cho quán thật sự đưa trà vào phục vụ. Ba câu trả lời thành thật:",
    qualifyFail:
      "Gói miễn phí cần đủ cả ba. Nếu chưa phải, gói 100g hoặc 250g mở cho tất cả — và tiền trả sẽ trừ vào đơn sỉ đầu tiên.",
    detailsTitle: "Gửi về đâu?",
    storePh: "Tên quán",
    namePh: "Tên bạn",
    phonePh: "Số điện thoại",
    addressPh: "Địa chỉ nhận hàng",
    notePh: "Điều gì chúng tôi nên biết? (không bắt buộc)",
    send: "Gửi mẫu cho tôi",
    sending: "Đang gửi",
    sentTitle: "Đã nhận yêu cầu",
    sentBody:
      "Chúng tôi sẽ gọi xác nhận địa chỉ trước khi gửi. Pha thử rồi cho chúng tôi biết kết quả — chỉ vậy thôi.",
    errRequired: "Cần tên quán, số điện thoại và địa chỉ để gửi được hàng.",
    errDuplicate: "Số này đang có một yêu cầu mẫu chưa xử lý. Gọi cho chúng tôi nếu chưa nhận được.",
    errGeneric: "Chưa gửi được. Vui lòng thử lại, hoặc gọi 0903 333 841.",
    callUs: "0903 333 841",
    backHome: "Về trang chủ",
    seeTheTeas: "Xem toàn bộ trà của chúng tôi",
  },
};

const money = (n) => n.toLocaleString("vi-VN") + "đ";

export default function SampleRequest() {
  const [supabase] = useState(() => createClient());
  const [lang, setLang] = useState("vi"); // a café owner in Hà Nội opens this, not a tourist
  const [pack, setPack] = useState("50g");
  const [checks, setChecks] = useState({ hasShop: false, canReformulate: false, canFeedback: false });
  const [form, setForm] = useState({ store: "", name: "", phone: "", address: "", note: "" });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const t = STR[lang];
  const needsQualifying = pack === "50g";
  const qualified = QUALIFY.every((q) => checks[q.key]);
  const canSend = form.store.trim() && form.phone.trim() && form.address.trim()
    && (!needsQualifying || qualified);

  const submit = async () => {
    setError("");
    if (!form.store.trim() || !form.phone.trim() || !form.address.trim()) {
      setError(t.errRequired); return;
    }
    setSending(true);
    try {
      const { error: e } = await supabase.rpc("submit_sample_request", {
        p_store_name: form.store.trim(),
        p_contact_name: form.name.trim(),
        p_phone: form.phone.trim(),
        p_address: form.address.trim(),
        p_pack: pack,
        p_has_shop: checks.hasShop,
        p_can_reformulate: checks.canReformulate,
        p_can_feedback: checks.canFeedback,
        p_note: form.note.trim(),
      });
      if (e) throw e;
      setSent(true);
    } catch (e) {
      console.error("Sample request failed:", e);
      const m = e?.message || "";
      setError(m.includes("already_requested") ? t.errDuplicate
        : m.includes("not_qualified") ? t.qualifyFail
        : m.includes("_required") ? t.errRequired
        : t.errGeneric);
    } finally {
      setSending(false);
    }
  };

  const field = (key, placeholder, extra = {}) => (
    <input
      value={form[key]}
      onChange={(e) => setForm({ ...form, [key]: e.target.value })}
      placeholder={placeholder}
      style={{
        width: "100%", padding: "12px 14px", borderRadius: 12, fontSize: 15,
        border: `1px solid ${TOKENS.hairline}`, background: TOKENS.paper, color: TOKENS.jade,
      }}
      {...extra}
    />
  );

  return (
    <div style={{ background: TOKENS.paper, minHeight: "100vh", color: TOKENS.jade, fontFamily: "Inter, sans-serif" }}>
      <div style={{ maxWidth: 620, margin: "0 auto", padding: "0 20px 64px" }}>
        {/* Header. This page is reached by a bare link, so the seal is the way back into the
            rest of the site — without it a café owner who wants to look around is stuck. */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 0" }}>
          <a
            href="/"
            style={{ display: "flex", alignItems: "center", gap: 9, textDecoration: "none", color: TOKENS.brassOnPaper }}
          >
            <span style={{ fontFamily: "'Noto Serif SC', serif", fontSize: 15, letterSpacing: 3 }}>皇龍</span>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: TOKENS.jadeSoft }}>{t.backHome}</span>
          </a>
          <button
            onClick={() => setLang(lang === "vi" ? "en" : "vi")}
            style={{ background: "none", border: `1px solid ${TOKENS.hairline}`, borderRadius: 20, padding: "5px 12px", fontSize: 12, fontWeight: 600, color: TOKENS.jade, cursor: "pointer" }}
          >
            {lang === "vi" ? "EN" : "VI"}
          </button>
        </div>

        {sent ? (
          <div style={{ textAlign: "center", padding: "56px 0" }}>
            <div style={{ display: "inline-flex", padding: 18, borderRadius: "50%", background: TOKENS.paperDeep, marginBottom: 18 }}>
              <Check size={28} color={TOKENS.brassDeep} />
            </div>
            <h1 style={{ fontFamily: "Lora, Georgia, serif", fontWeight: 500, fontSize: 26, margin: "0 0 10px" }}>{t.sentTitle}</h1>
            <p style={{ fontSize: 14.5, color: TOKENS.jadeSoft, lineHeight: 1.6, maxWidth: "38ch", margin: "0 auto" }}>{t.sentBody}</p>
            <a href="tel:+84903333841" style={{ display: "inline-flex", alignItems: "center", gap: 8, marginTop: 22, color: TOKENS.jade, textDecoration: "none", fontFamily: "Lora, Georgia, serif", fontSize: 19 }}>
              <Phone size={17} color={TOKENS.brassOnPaper} /> {t.callUs}
            </a>
            {/* Somewhere to go next — otherwise the page is a dead end once it's submitted. */}
            <div>
              <a href="/" style={{ display: "inline-block", marginTop: 26, color: TOKENS.brassOnPaper, fontSize: 13.5, fontWeight: 600 }}>
                {t.seeTheTeas} →
              </a>
            </div>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 11, fontWeight: 700, color: TOKENS.brassOnPaper, textTransform: "uppercase", letterSpacing: 1.4 }}>
              {t.eyebrow}
            </div>
            <h1 style={{ fontFamily: "Lora, Georgia, serif", fontWeight: 500, fontSize: "clamp(26px, 6vw, 36px)", lineHeight: 1.2, margin: "10px 0 12px" }}>
              {t.title}
            </h1>
            <p style={{ fontSize: 15, color: TOKENS.jadeSoft, lineHeight: 1.65, margin: "0 0 30px" }}>{t.intro}</p>

            {/* Pack choice */}
            <div style={{ fontSize: 11, fontWeight: 700, color: TOKENS.brassOnPaper, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10 }}>
              {t.pickPack}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 12 }}>
              {PACKS.map((p) => {
                const on = pack === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => { setPack(p.id); setError(""); }}
                    style={{
                      textAlign: "left", padding: "14px 16px", borderRadius: 16, cursor: "pointer",
                      border: "none", background: on ? TOKENS.paperDeep : "transparent",
                      boxShadow: on ? `inset 0 0 0 2px ${TOKENS.brass}` : `inset 0 0 0 1px ${TOKENS.hairline}`,
                    }}
                  >
                    <span style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
                      <span style={{ fontFamily: "Lora, Georgia, serif", fontSize: 17, color: TOKENS.jade }}>{p.label[lang]}</span>
                      <span style={{ fontSize: 15, fontWeight: 700, color: TOKENS.brassOnPaper, flexShrink: 0 }}>
                        {p.free ? t.free : money(p.price)}
                      </span>
                    </span>
                    <span style={{ display: "block", fontSize: 13, color: TOKENS.jadeSoft, lineHeight: 1.5, marginTop: 5 }}>
                      {p.detail[lang]}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* The paid packs are a deposit, not a cost — say so where the price is. */}
            {!needsQualifying && (
              <p style={{ fontSize: 13, color: TOKENS.jade, background: `${TOKENS.brass}1A`, borderRadius: 12, padding: "11px 14px", lineHeight: 1.55, margin: "0 0 26px" }}>
                {t.creditNote}
              </p>
            )}

            {/* Qualifying, only for the free pack */}
            {needsQualifying && (
              <div style={{ marginBottom: 26 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: TOKENS.brassOnPaper, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 }}>
                  {t.qualifyTitle}
                </div>
                <p style={{ fontSize: 13.5, color: TOKENS.jadeSoft, lineHeight: 1.55, margin: "0 0 12px" }}>{t.qualifyIntro}</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {QUALIFY.map((q) => (
                    <label
                      key={q.key}
                      style={{
                        display: "flex", gap: 11, alignItems: "flex-start", cursor: "pointer",
                        padding: "12px 14px", borderRadius: 14, background: checks[q.key] ? `${TOKENS.brass}14` : "transparent",
                        boxShadow: `inset 0 0 0 1px ${checks[q.key] ? `${TOKENS.brass}66` : TOKENS.hairline}`,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checks[q.key]}
                        onChange={(e) => { setChecks({ ...checks, [q.key]: e.target.checked }); setError(""); }}
                        style={{ marginTop: 2, width: 18, height: 18, accentColor: TOKENS.jade, flexShrink: 0 }}
                      />
                      <span style={{ fontSize: 13.5, lineHeight: 1.55, color: TOKENS.jade }}>{q[lang]}</span>
                    </label>
                  ))}
                </div>
                {!qualified && Object.values(checks).some(Boolean) && (
                  <p style={{ fontSize: 12.5, color: TOKENS.jadeSoft, lineHeight: 1.55, margin: "10px 0 0" }}>{t.qualifyFail}</p>
                )}
              </div>
            )}

            {/* Where to send it */}
            <div style={{ fontSize: 11, fontWeight: 700, color: TOKENS.brassOnPaper, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10 }}>
              {t.detailsTitle}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {field("store", t.storePh)}
              {field("name", t.namePh)}
              {field("phone", t.phonePh, { type: "tel", inputMode: "tel" })}
              {field("address", t.addressPh)}
              <textarea
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                placeholder={t.notePh}
                rows={2}
                style={{ width: "100%", padding: "12px 14px", borderRadius: 12, fontSize: 15, border: `1px solid ${TOKENS.hairline}`, background: TOKENS.paper, color: TOKENS.jade, resize: "vertical", fontFamily: "inherit" }}
              />
            </div>

            {error && (
              <p style={{ fontSize: 13, color: TOKENS.lacquer, lineHeight: 1.55, margin: "12px 0 0" }}>{error}</p>
            )}

            <button
              onClick={submit}
              disabled={sending || !canSend}
              style={{
                width: "100%", marginTop: 18, padding: "15px 20px", borderRadius: 14, border: "none",
                background: TOKENS.jade, color: TOKENS.paper, fontSize: 15.5, fontWeight: 700,
                cursor: sending || !canSend ? "default" : "pointer", opacity: sending || !canSend ? 0.45 : 1,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 9,
              }}
            >
              {sending ? <Loader2 size={17} className="spin" /> : <Leaf size={17} color={TOKENS.brass} />}
              {sending ? t.sending : t.send}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

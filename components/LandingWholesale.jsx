"use client";

import { useState } from "react";
import { Check, Loader2, Leaf, Phone } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { notifyHouse } from "@/lib/notify";
import { TOKENS } from "@/lib/constants";
import { useLocale } from "@/components/i18n/LocaleProvider";

// Advert landing page for café and milk-tea owners. Deliberately bare: no sidebar, no site
// navigation, nothing to click but the one thing we want them to do. Someone arriving from an
// advert has one question — is this worth my attention — and every other link is a way out.
//
// Vietnamese only. The advertising is aimed at shop owners in Vietnam, so a language toggle
// would be one more control on a page whose whole job is to have almost none.

// ---------------------------------------------------------------------------------------
// ALL COPY LIVES HERE, so it can be replaced wholesale without touching the layout below.
//
// This is a draft written to the brief's structure — Vấn đề → Nguyên nhân → Giải pháp →
// Kết quả — in the voice used elsewhere on the site: concede the honest part, be specific,
// promise nothing that cannot be checked. Replace it with the real translation when the
// English source arrives. "estate-grown" is rendered "trà cổ thụ mọc hoang" throughout, to
// match Our Story.
// ---------------------------------------------------------------------------------------
const COPY_VI = {
  headline:
    "Trà nền trong món signature của bạn đang làm giảm giá trị sản phẩm. Để chúng tôi chứng minh.",
  sub:
    "Bạn đã đầu tư cho topping, syrup, ly, thương hiệu. Thứ duy nhất chưa từng đổi là lá trà nằm dưới tất cả những thứ đó.",

  sections: [
    {
      kicker: "Vấn đề",
      title: "Món đắt nhất trên menu đang dựa trên nguyên liệu rẻ nhất",
      body: [
        "Món signature là thứ bạn dùng để khách nhớ đến quán. Nó mang tên quán, được chụp đẹp nhất, bán giá cao nhất.",
        "Nhưng phần lớn hương vị của nó đến từ lá trà — thứ thường được mua theo giá kg, từ một nhà cung cấp không ai hỏi tên. Khách không gọi tên được vấn đề. Họ chỉ uống một lần rồi không gọi lại.",
      ],
    },
    {
      kicker: "Nguyên nhân",
      title: "Trà nền được chọn theo giá, không theo vị",
      body: [
        "Trà pha chế đại trà được trồng để lấy sản lượng, hái bằng máy, đấu trộn cho đồng đều và rẻ. Vị chát gắt và hậu khô là đặc điểm cố hữu của cách làm đó.",
        "Nên công thức phải bù lại: thêm đường, thêm sữa, thêm hương. Càng bù nhiều, món càng giống mọi món trà sữa khác ngoài kia — và khác biệt bạn xây dựng bị chính nguyên liệu nền xoá đi.",
      ],
    },
    {
      kicker: "Giải pháp",
      title: "Trà cổ thụ mọc hoang Hà Giang, chế biến bằng công nghệ Nhật Bản",
      body: [
        "Chúng tôi làm trà từ cây Shan cổ thụ mọc hoang trên núi Hà Giang — không phải vườn trồng đại trà. Lá được chế biến bằng thiết bị hấp của Nhật, giữ lại vị ngọt hậu thay vì đốt cháy nó.",
        "Trà không đấu trộn. Mỗi mẻ có mã riêng, và chúng tôi nói rõ khi chuyển mẻ. Nước trà đậm hơn, nên phần lớn quán dùng ít lá hơn cho mỗi lít so với dự tính.",
      ],
    },
    {
      kicker: "Kết quả",
      title: "Ít thứ phải che đi hơn",
      body: [
        "Khi trà nền không chát gắt, bạn không cần nhiều đường để giấu nó. Món uống bắt đầu có vị của trà — và đó là thứ khách phân biệt được, kể cả khi họ không gọi tên ra.",
        "Chúng tôi không hứa doanh số. Chúng tôi đề nghị một việc kiểm chứng được: pha thử trên chính quầy của bạn, với công thức của bạn, rồi tự quyết định.",
      ],
    },
  ],

  // Four photographs, one per beat of the argument.
  //
  // Drop the files into public/landing/ with these exact names and they appear. Until then —
  // or if a name is misspelled, or the extension is wrong — each falls back to a loud
  // placeholder saying what belongs there, so the page never shows a broken image and it is
  // obvious at a glance which one is missing.
  //
  // `alt` is what a screen reader and a search crawler get; `label` is only for the
  // placeholder. `ratio` shapes the box before the photo loads, so the page does not jump.
  images: [
    {
      id: 1,
      src: "/landing/1.jpg",
      ratio: "9 / 14",
      label: "Cây trà Shan cổ thụ mọc hoang trên núi Hà Giang",
      alt: "Cây trà Shan cổ thụ thân xù xì phủ địa y, mọc hoang giữa cỏ dại trên núi Hà Giang",
    },
    {
      id: 2,
      src: "/landing/2.jpg",
      ratio: "9 / 14",
      label: "Lá trà sau khi héo, trước khi vào máy hấp",
      alt: "Bàn tay cầm một nắm lá trà đã héo, phía sau là mẻ lá trải trên băng chuyền",
    },
    {
      id: 3,
      src: "/landing/3.jpg",
      ratio: "1 / 1",
      label: "Dây chuyền chế biến theo công nghệ Nhật Bản",
      alt: "Dây chuyền chế biến trà bằng thép không gỉ theo công nghệ Nhật Bản trong xưởng",
    },
    {
      id: 4,
      src: "/landing/4.jpg",
      ratio: "9 / 14",
      label: "Món signature pha từ trà nền của chúng tôi",
      alt: "Ly đồ uống nhiều lớp với lớp kem phía trên, pha từ trà nền của chúng tôi",
    },
  ],

  ctaTitle: "Nhận mẫu thử miễn phí",
  ctaBody:
    "Chúng tôi gửi trà đến quán bạn để pha thử. Không ràng buộc, không hợp đồng — chỉ cần bạn pha thật và nói thật.",
  cta: "Nhận mẫu thử miễn phí",

  formTitle: "Gửi mẫu về đâu?",
  namePh: "Tên bạn",
  storePh: "Tên quán / doanh nghiệp",
  phonePh: "Số điện thoại",
  addressPh: "Địa chỉ nhận mẫu",
  send: "Gửi yêu cầu",
  sending: "Đang gửi",

  sentTitle: "Đã nhận yêu cầu của bạn",
  sentBody:
    "Chúng tôi sẽ gọi lại để xác nhận địa chỉ trước khi gửi mẫu. Thường trong vòng một ngày làm việc.",

  errRequired: "Vui lòng nhập tên, số điện thoại và địa chỉ nhận mẫu.",
  errGeneric: "Chưa gửi được. Vui lòng thử lại, hoặc gọi trực tiếp 0903 333 841.",
  phone: "0903 333 841",
  footer: "Nhà làm Trà Hoàng Long · Trà cổ thụ Hà Giang · Từ 1995",
  privacy: "Chính sách quyền riêng tư",
};

const COPY_EN = {
  headline: "Your signature drink is being held back by its base tea. Let us prove it.",
  sub: "You invested in toppings, syrup, cups, and your brand. The one thing that never changed is the leaf underneath all of it.",
  sections: [
    {
      kicker: "The problem",
      title: "The most expensive drink on the menu relies on its cheapest ingredient",
      body: [
        "A signature drink is how customers remember your shop. It carries your name, gets the best photograph, and commands the highest price.",
        "Yet most of its flavour comes from tea bought by the kilo from a supplier nobody asks about. Customers may not name the problem. They simply drink it once and do not order it again.",
      ],
    },
    {
      kicker: "The cause",
      title: "Base tea is chosen by price, not taste",
      body: [
        "Commodity tea for beverages is grown for yield, machine-picked, and blended for consistency and low cost. Harsh astringency and a dry finish come with that process.",
        "The recipe then has to compensate with more sugar, milk, and flavouring. The more it compensates, the more the drink resembles every other milk tea—and the ingredient underneath erases the difference you built.",
      ],
    },
    {
      kicker: "The solution",
      title: "Wild ancient-tree tea from Hà Giang, processed with Japanese technology",
      body: [
        "We make tea from old Shan trees growing wild in the Hà Giang mountains, not from industrial plantations. Japanese steaming equipment protects the sweet finish instead of burning it away.",
        "The tea is not blended across batches. Every batch has its own code, and we tell you when it changes. The liquor is fuller, so many shops need less leaf per litre than expected.",
      ],
    },
    {
      kicker: "The result",
      title: "Less to hide",
      body: [
        "When the base tea is not aggressively bitter, you need less sugar to conceal it. The drink begins to taste like tea—and customers can tell, even when they cannot explain why.",
        "We do not promise sales. We offer something testable: brew it on your own bar, in your own recipe, and decide from the result.",
      ],
    },
  ],
  images: [
    { id: 1, src: "/landing/1.jpg", ratio: "9 / 14", label: "Wild ancient Shan tea trees in the Hà Giang mountains", alt: "An old lichen-covered Shan tea tree growing among wild mountain plants in Hà Giang" },
    { id: 2, src: "/landing/2.jpg", ratio: "9 / 14", label: "Withered tea leaves before steaming", alt: "A hand holding withered tea leaves beside a fresh batch on the processing line" },
    { id: 3, src: "/landing/3.jpg", ratio: "1 / 1", label: "Japanese-technology processing line", alt: "Stainless-steel Japanese-technology tea processing equipment inside the factory" },
    { id: 4, src: "/landing/4.jpg", ratio: "9 / 14", label: "A signature drink made with our base tea", alt: "A layered signature drink with a cream top, brewed from our base tea" },
  ],
  ctaTitle: "Request a free sample",
  ctaBody: "We send tea to your shop for a real brew test. No obligation and no contract—only a request that you brew honestly and tell us what happened.",
  cta: "Request a free sample",
  formTitle: "Where should we send it?",
  namePh: "Your name",
  storePh: "Café / business name",
  phonePh: "Phone number",
  addressPh: "Sample delivery address",
  send: "Send request",
  sending: "Sending",
  sentTitle: "We received your request",
  sentBody: "We will call to confirm the address before sending the sample, usually within one working day.",
  errRequired: "Please add your name, phone number, and sample delivery address.",
  errGeneric: "The request could not be sent. Please try again or call 0903 333 841.",
  phone: "0903 333 841",
  footer: "House of Hoàng Long · Ancient tea from Hà Giang · Since 1995",
  privacy: "Privacy policy",
};

// Shows the photograph when there is one, and an unmistakable placeholder when there is not.
// A grey box could be mistaken for a design choice; this says what belongs here and that it
// is not the real thing, so an advert cannot be launched with a gap nobody noticed.
//
// The fallback is also the error path: if a file is missing or misnamed, onError swaps back
// to the placeholder rather than leaving a broken-image icon on a page being paid for.
function Illustration({ src, label, alt, ratio, locale }) {
  const [failed, setFailed] = useState(false);

  if (src && !failed) {
    return (
      <img
        src={src}
        alt={alt || label}
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
        style={{
          width: "100%", aspectRatio: ratio, objectFit: "cover", display: "block",
          borderRadius: TOKENS.radius, boxShadow: TOKENS.shadowSm,
        }}
      />
    );
  }

  return (
    <div
      role="img"
      aria-label={locale === "en" ? `Temporary illustration: ${label}` : `Ảnh minh hoạ tạm: ${label}`}
      style={{
        aspectRatio: ratio,
        borderRadius: TOKENS.radius,
        background: `repeating-linear-gradient(45deg, ${TOKENS.paperDeep} 0 14px, #E8DFCC 14px 28px)`,
        border: `2px dashed ${TOKENS.brassDeep}77`,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        gap: 8, padding: 20, textAlign: "center",
      }}
    >
      <Leaf size={22} color={`${TOKENS.brassDeep}99`} strokeWidth={1.5} />
      <span style={{ fontSize: 13, fontWeight: 600, color: TOKENS.jade, lineHeight: 1.4 }}>
        {label}
      </span>
      <span style={{ fontSize: 10.5, letterSpacing: 1, textTransform: "uppercase", color: TOKENS.brassOnPaper }}>
        {locale === "en" ? "Image missing — add the file to public/landing/" : "Chưa có ảnh — đặt file vào public/landing/"}
      </span>
    </div>
  );
}

export default function LandingWholesale() {
  const { locale } = useLocale();
  const COPY = locale === "en" ? COPY_EN : COPY_VI;
  const [supabase] = useState(() => createClient());
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", store: "", phone: "", address: "" });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const canSend = form.name.trim() && form.phone.trim() && form.address.trim();

  const submit = async () => {
    setError("");
    if (!canSend) { setError(COPY.errRequired); return; }
    setSending(true);
    try {
      const leadId = "lead-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 6);
      const { error: e } = await supabase.from("leads").insert({
        id: leadId,
        name: form.name.trim(),
        contact: form.phone.trim(),
        business_name: form.store.trim(),
        address: form.address.trim(),
        // Tags this lead as coming from the advert, so Front Desk can tell it apart from an
        // ordinary enquiry and staff know a sample is owed.
        interest: "mau-thu-doanh-nghiep",
        unread: true,
      });
      if (e) throw e;
      // The advert's whole point is a fast reply, and nobody watches a dashboard all day.
      notifyHouse("leads", leadId);
      setSent(true);
    } catch (e) {
      console.error("Landing lead failed:", e);
      setError(COPY.errGeneric);
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
        width: "100%", padding: "13px 15px", borderRadius: 12, fontSize: 15.5,
        border: `1px solid ${TOKENS.hairline}`, background: TOKENS.paper, color: TOKENS.jade,
      }}
      {...extra}
    />
  );

  // Centred here rather than at each call site, so the two CTAs — the one under the headline
  // and the one closing the page — cannot drift apart.
  const ctaButton = (big) => (
    <div style={{ textAlign: "center" }}>
    <button
      onClick={() => { setOpen(true); setTimeout(() => document.getElementById("lp-form")?.scrollIntoView({ behavior: "smooth", block: "center" }), 60); }}
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 9,
        padding: big ? "16px 30px" : "13px 24px", borderRadius: 14, border: "none",
        background: TOKENS.jade, color: TOKENS.paper, cursor: "pointer",
        fontSize: big ? 16.5 : 15, fontWeight: 700, boxShadow: TOKENS.shadowMd,
      }}
    >
      <Leaf size={18} color={TOKENS.brass} /> {COPY.cta}
    </button>
    </div>
  );

  return (
    <div style={{ background: TOKENS.paper, minHeight: "100vh", color: TOKENS.jade, fontFamily: "Inter, sans-serif" }}>
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "0 20px 70px" }}>

        {/* Mark only. No navigation: the page has one job. */}
        <div style={{ padding: "26px 0 8px", textAlign: "center" }}>
          <span style={{ fontFamily: "'Noto Serif SC', serif", fontSize: 17, letterSpacing: 4, color: TOKENS.brassOnPaper }}>皇龍</span>
        </div>

        {/* Headline */}
        <h1 style={{
          fontFamily: "Lora, Georgia, serif", fontWeight: 500,
          fontSize: "clamp(27px, 6.6vw, 42px)", lineHeight: 1.22, letterSpacing: -0.3,
          margin: "18px 0 16px",
        }}>
          {COPY.headline}
        </h1>
        <p style={{ fontSize: "clamp(15px, 2.2vw, 17px)", color: TOKENS.jadeSoft, lineHeight: 1.65, margin: "0 0 26px" }}>
          {COPY.sub}
        </p>

        <div style={{ marginBottom: 8 }}>{ctaButton(true)}</div>

        {/* Problem → Cause → Solution → Result. One illustration each, so the four pictures
            line up with the four beats of the argument rather than trailing off. */}
        {COPY.sections.map((s, i) => (
          <section key={s.kicker} style={{ marginTop: 44 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: TOKENS.brassOnPaper, textTransform: "uppercase", letterSpacing: 1.6 }}>
              {s.kicker}
            </div>
            <h2 style={{
              fontFamily: "Lora, Georgia, serif", fontWeight: 500,
              fontSize: "clamp(21px, 4.2vw, 27px)", lineHeight: 1.3, margin: "9px 0 14px",
            }}>
              {s.title}
            </h2>
            {s.body.map((p, j) => (
              <p key={j} style={{ fontSize: "clamp(14.5px, 2vw, 16px)", color: TOKENS.jadeSoft, lineHeight: 1.72, margin: "0 0 13px" }}>
                {p}
              </p>
            ))}
            {COPY.images[i] && (
              <div style={{ marginTop: 22 }}><Illustration {...COPY.images[i]} locale={locale} /></div>
            )}
          </section>
        ))}

        {/* The ask */}
        <div id="lp-form" style={{
          marginTop: 52, padding: "26px 22px", borderRadius: TOKENS.radiusLg,
          background: TOKENS.paperDeep, boxShadow: TOKENS.shadowSm, scrollMarginTop: 24,
        }}>
          {sent ? (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div style={{ display: "inline-flex", padding: 16, borderRadius: "50%", background: TOKENS.paper, marginBottom: 14 }}>
                <Check size={26} color={TOKENS.brassDeep} />
              </div>
              <h2 style={{ fontFamily: "Lora, Georgia, serif", fontWeight: 500, fontSize: 23, margin: "0 0 9px" }}>
                {COPY.sentTitle}
              </h2>
              <p style={{ fontSize: 14.5, color: TOKENS.jadeSoft, lineHeight: 1.65, maxWidth: "36ch", margin: "0 auto" }}>
                {COPY.sentBody}
              </p>
            </div>
          ) : (
            <>
              <h2 style={{ fontFamily: "Lora, Georgia, serif", fontWeight: 500, fontSize: "clamp(22px, 4.4vw, 28px)", lineHeight: 1.28, margin: "0 0 10px" }}>
                {COPY.ctaTitle}
              </h2>
              <p style={{ fontSize: 14.5, color: TOKENS.jadeSoft, lineHeight: 1.65, margin: "0 0 20px" }}>
                {COPY.ctaBody}
              </p>

              {!open ? (
                ctaButton(false)
              ) : (
                <>
                  <div style={{ fontSize: 11, fontWeight: 700, color: TOKENS.brassOnPaper, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>
                    {COPY.formTitle}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {field("name", COPY.namePh)}
                    {field("store", COPY.storePh)}
                    {field("phone", COPY.phonePh, { type: "tel", inputMode: "tel" })}
                    {field("address", COPY.addressPh)}
                  </div>
                  {error && <p style={{ fontSize: 13, color: TOKENS.lacquer, margin: "12px 0 0", lineHeight: 1.5 }}>{error}</p>}
                  <button
                    onClick={submit}
                    disabled={sending || !canSend}
                    style={{
                      width: "100%", marginTop: 16, padding: "15px 20px", borderRadius: 14, border: "none",
                      background: TOKENS.jade, color: TOKENS.paper, fontSize: 15.5, fontWeight: 700,
                      cursor: sending || !canSend ? "default" : "pointer",
                      opacity: sending || !canSend ? 0.45 : 1,
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 9,
                    }}
                  >
                    {sending ? <Loader2 size={17} className="spin" /> : <Leaf size={17} color={TOKENS.brass} />}
                    {sending ? COPY.sending : COPY.send}
                  </button>
                </>
              )}
            </>
          )}
        </div>

        {/* Someone who would rather just ring. */}
        <div style={{ textAlign: "center", marginTop: 30 }}>
          <a href="tel:+84903333841" style={{ display: "inline-flex", alignItems: "center", gap: 9, color: TOKENS.jade, textDecoration: "none", fontFamily: "Lora, Georgia, serif", fontSize: 20 }}>
            <Phone size={17} color={TOKENS.brassOnPaper} /> {COPY.phone}
          </a>
          <div style={{ fontSize: 11.5, color: `${TOKENS.jadeSoft}AA`, marginTop: 16, letterSpacing: 0.3 }}>
            {COPY.footer}
          </div>
          {/* Advertising platforms require a reachable privacy policy before approving a
              lead campaign, and anyone handing over a phone number deserves to see one. */}
          <div style={{ marginTop: 10 }}>
            <a href="/privacy" style={{ fontSize: 12, color: TOKENS.brassOnPaper, fontWeight: 600 }}>
              {COPY.privacy}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

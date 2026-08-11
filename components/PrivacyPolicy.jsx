"use client";

import { useState } from "react";
import { TOKENS } from "@/lib/constants";

// Privacy policy. Written against what this application actually stores — every item below
// corresponds to a real table or a real third party in this codebase, not to a template.
// If a feature here changes what it collects, this page has to change with it.
//
// Publicly indexable on purpose: advertising platforms fetch it, and a policy nobody can
// read is not a policy.

const UPDATED = "11 tháng 8, 2026";

const S = {
  vi: {
    title: "Chính sách quyền riêng tư",
    updated: `Cập nhật lần cuối: ${UPDATED}`,
    intro:
      "Trang này giải thích Nhà làm Trà Hoàng Long thu thập thông tin gì của bạn, vì sao, và bạn có thể yêu cầu gì. Chúng tôi chỉ thu thập những gì cần để bán trà và giao hàng — không mua bán dữ liệu, không đổi dữ liệu lấy bất cứ thứ gì.",
    sections: [
      {
        h: "Chúng tôi thu thập gì",
        p: ["Tuỳ theo việc bạn làm trên trang, chúng tôi lưu:"],
        list: [
          "**Khi đặt hàng:** tên, số điện thoại hoặc email, địa chỉ giao hàng, mã số thuế (nếu bạn nhập), ghi chú đơn, các sản phẩm và số lượng bạn đặt.",
          "**Khi xin mẫu thử hoặc để lại thông tin từ quảng cáo:** tên, tên quán hoặc doanh nghiệp, số điện thoại, địa chỉ nhận mẫu, và câu trả lời cho các câu hỏi sàng lọc.",
          "**Khi đặt lịch buổi trà:** tên, số điện thoại hoặc email, ngày giờ bạn chọn và ghi chú.",
          "**Khi viết đánh giá sản phẩm:** tên hiển thị, đánh giá sao, nội dung, và số điện thoại/email bạn đã dùng để mua — dùng để xác minh bạn thực sự đã mua. Số điện thoại/email này không bao giờ hiển thị công khai.",
          "**Khi nhắn tin cho chúng tôi:** tên và nội dung tin nhắn.",
          "**Khi tạo tài khoản đối tác sỉ:** email, mật khẩu (được mã hoá, chúng tôi không đọc được), tên doanh nghiệp và thông tin liên hệ.",
          "**Thống kê truy cập:** trang bạn xem, nguồn dẫn đến trang, ngôn ngữ, và một mã ngẫu nhiên lưu trong trình duyệt để phân biệt lượt xem lặp lại với người xem mới. Mã này không gắn với tên, email hay số điện thoại của bạn.",
        ],
      },
      {
        h: "Ghi chú nội bộ",
        p: [
          "Nhân viên có thể ghi chú riêng về khách hàng — ví dụ gu uống trà, giờ tiện gọi, lưu ý khi giao hàng. Ghi chú này chỉ nội bộ đọc được, không hiển thị cho khách. Bạn có quyền yêu cầu xem hoặc xoá phần ghi chú về mình.",
        ],
      },
      {
        h: "Chúng tôi dùng thông tin đó để làm gì",
        p: ["Chỉ để:"],
        list: [
          "Xử lý, đóng gói và giao đơn hàng của bạn.",
          "Gọi hoặc nhắn xác nhận địa chỉ trước khi gửi hàng hoặc mẫu thử.",
          "Xuất hoá đơn và lưu sổ sách theo quy định.",
          "Trả lời tin nhắn và câu hỏi của bạn.",
          "Hiểu trang nào được xem nhiều, để cải thiện nội dung.",
        ],
        after:
          "Chúng tôi không bán, không cho thuê, không trao đổi thông tin của bạn với bên thứ ba vì mục đích quảng cáo.",
      },
      {
        h: "Ai khác có thể chạm tới dữ liệu",
        p: [
          "Chúng tôi dùng một vài dịch vụ kỹ thuật để vận hành trang. Họ xử lý dữ liệu thay chúng tôi, không được dùng cho mục đích riêng:",
        ],
        list: [
          "**Supabase** — lưu trữ cơ sở dữ liệu, tài khoản đăng nhập và hình ảnh.",
          "**Vercel** — máy chủ chạy trang web.",
          "**Telegram** — nếu bật, hệ thống gửi thông báo đơn hàng mới vào nhóm nội bộ của chúng tôi (tên, số điện thoại, địa chỉ, giá trị đơn).",
          "**Đơn vị vận chuyển** — nhận tên, số điện thoại và địa chỉ để giao hàng.",
          "**Nền tảng quảng cáo (Facebook/Meta)** — nếu bạn để lại thông tin qua biểu mẫu quảng cáo trên nền tảng của họ, chúng tôi nhận thông tin đó từ họ. Việc họ thu thập dữ liệu tuân theo chính sách riêng của họ.",
        ],
        after:
          "Ngoài ra, chúng tôi chỉ cung cấp thông tin khi pháp luật yêu cầu.",
      },
      {
        h: "Cookie và theo dõi",
        p: [
          "Chúng tôi không dùng cookie quảng cáo và hiện không cài mã theo dõi của bên thứ ba trên trang này. Trình duyệt của bạn lưu một vài thiết lập cục bộ: mã phiên ngẫu nhiên để đếm lượt truy cập, giỏ hàng, ngôn ngữ, và việc bạn đã tắt thanh giới thiệu mẫu thử hay chưa. Xoá dữ liệu trình duyệt sẽ xoá hết những thứ này.",
        ],
      },
      {
        h: "Chúng tôi giữ dữ liệu bao lâu",
        p: [
          "Đơn hàng và hoá đơn được giữ theo thời hạn kế toán và thuế yêu cầu. Thông tin khách tiềm năng, yêu cầu mẫu thử và tin nhắn được giữ chừng nào còn hữu ích cho việc liên hệ, và sẽ xoá khi bạn yêu cầu. Thống kê truy cập không gắn với danh tính nên được giữ ở dạng tổng hợp.",
        ],
      },
      {
        h: "Quyền của bạn",
        p: [
          "Bạn có quyền yêu cầu xem thông tin chúng tôi đang giữ về mình, yêu cầu sửa nếu sai, và yêu cầu xoá. Gọi hoặc email theo thông tin bên dưới — chúng tôi xử lý trong vòng 7 ngày làm việc. Với đơn hàng đã xuất hoá đơn, chúng tôi có thể phải giữ lại bản ghi tối thiểu theo quy định kế toán, và sẽ nói rõ nếu rơi vào trường hợp đó.",
          "Việc xử lý dữ liệu cá nhân tại đây tuân theo pháp luật Việt Nam, bao gồm Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân.",
        ],
      },
      {
        h: "Trẻ em",
        p: [
          "Trang này dành cho người mua trà, không hướng đến trẻ em, và chúng tôi không cố ý thu thập thông tin của trẻ em. Nếu bạn cho rằng con bạn đã gửi thông tin cho chúng tôi, hãy liên hệ để chúng tôi xoá.",
        ],
      },
      {
        h: "Khi chính sách thay đổi",
        p: [
          "Nếu chúng tôi thay đổi cách thu thập hoặc sử dụng dữ liệu, trang này sẽ được cập nhật cùng ngày tháng ở đầu trang.",
        ],
      },
      {
        h: "Liên hệ",
        p: [
          "Nhà làm Trà Hoàng Long\nĐiện thoại: 0903 333 841\nEmail: hotro.trahoanglong@gmail.com",
        ],
      },
    ],
  },

  en: {
    title: "Privacy policy",
    updated: `Last updated: ${UPDATED}`,
    intro:
      "This page explains what House of Hoàng Long collects about you, why, and what you can ask us to do about it. We collect only what it takes to sell tea and deliver it — we do not sell data and we do not trade it for anything.",
    sections: [
      {
        h: "What we collect",
        p: ["Depending on what you do on the site, we store:"],
        list: [
          "**When you order:** name, phone or email, delivery address, tax number if you enter one, order notes, and the products and quantities you ordered.",
          "**When you request a sample or leave your details from an advert:** name, shop or business name, phone number, delivery address, and your answers to the qualifying questions.",
          "**When you book a tea session:** name, phone or email, the date and time you chose, and any note.",
          "**When you review a product:** display name, star rating, the review itself, and the phone or email you ordered with — used to check you actually bought it. That contact is never shown publicly.",
          "**When you message us:** your name and the messages.",
          "**When you open a wholesale account:** email, password (hashed — we cannot read it), business name and contact details.",
          "**Visit statistics:** which pages you view, where you arrived from, language, and a random identifier kept in your browser so repeat views can be told from new visitors. It is not linked to your name, email or phone.",
        ],
      },
      {
        h: "Internal notes",
        p: [
          "Our staff may keep private notes about a customer — how they take their tea, when to call, delivery quirks. These are visible only to us, never to the customer. You may ask to see or delete the notes we hold about you.",
        ],
      },
      {
        h: "What we use it for",
        p: ["Only to:"],
        list: [
          "Process, pack and deliver your order.",
          "Call or message to confirm an address before shipping an order or a sample.",
          "Issue invoices and keep the accounts the law requires.",
          "Answer your messages and questions.",
          "Understand which pages get read, so we can improve them.",
        ],
        after:
          "We do not sell, rent or trade your details to anyone for advertising.",
      },
      {
        h: "Who else can touch the data",
        p: [
          "A few technical services keep the site running. They process data on our behalf and may not use it for their own purposes:",
        ],
        list: [
          "**Supabase** — database, logins and image storage.",
          "**Vercel** — the servers this website runs on.",
          "**Telegram** — when enabled, new-order alerts are sent to our own internal chat (name, phone, address, order value).",
          "**Delivery companies** — given the name, phone and address needed to deliver.",
          "**Advertising platforms (Facebook/Meta)** — if you submit your details through a form on their platform, we receive them from Meta. Their own collection is governed by their policy, not ours.",
        ],
        after: "Beyond that, we disclose information only where the law requires it.",
      },
      {
        h: "Cookies and tracking",
        p: [
          "We use no advertising cookies and currently run no third-party tracking scripts on this site. Your browser holds a few local settings: a random session identifier for counting visits, your basket, your language, and whether you dismissed the sample bar. Clearing your browser data removes all of them.",
        ],
      },
      {
        h: "How long we keep it",
        p: [
          "Orders and invoices are kept for as long as accounting and tax rules require. Enquiries, sample requests and messages are kept while they are useful for contacting you, and deleted on request. Visit statistics are not tied to an identity and are kept in aggregate.",
        ],
      },
      {
        h: "Your rights",
        p: [
          "You may ask to see what we hold about you, ask us to correct it, and ask us to delete it. Call or email using the details below and we will deal with it within 7 working days. Where an order has been invoiced we may have to keep a minimum record for accounting purposes, and we will tell you plainly if that applies.",
          "Personal data here is handled under Vietnamese law, including Decree 13/2023/ND-CP on personal data protection.",
        ],
      },
      {
        h: "Children",
        p: [
          "This site is for people buying tea. It is not aimed at children and we do not knowingly collect their details. If you believe your child has sent us information, contact us and we will remove it.",
        ],
      },
      {
        h: "When this changes",
        p: [
          "If we change what we collect or how we use it, this page is updated along with the date at the top.",
        ],
      },
      {
        h: "Contact",
        p: [
          "Nhà làm Trà Hoàng Long\nPhone: 0903 333 841\nEmail: hotro.trahoanglong@gmail.com",
        ],
      },
    ],
  },
};

// Renders **bold** spans without pulling in a markdown parser for one piece of emphasis.
function withBold(text) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**")
      ? <strong key={i} style={{ color: TOKENS.jade, fontWeight: 600 }}>{part.slice(2, -2)}</strong>
      : <span key={i}>{part}</span>,
  );
}

export default function PrivacyPolicy() {
  const [lang, setLang] = useState("vi");
  const t = S[lang];

  return (
    <div style={{ background: TOKENS.paper, minHeight: "100vh", color: TOKENS.jade, fontFamily: "Inter, sans-serif" }}>
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "0 20px 70px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 0" }}>
          <a href="/" style={{ display: "flex", alignItems: "center", gap: 9, textDecoration: "none" }}>
            <span style={{ fontFamily: "'Noto Serif SC', serif", fontSize: 15, letterSpacing: 3, color: TOKENS.brassOnPaper }}>皇龍</span>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: TOKENS.jadeSoft }}>
              {lang === "vi" ? "Về trang chủ" : "House of Hoàng Long"}
            </span>
          </a>
          <button
            onClick={() => setLang(lang === "vi" ? "en" : "vi")}
            style={{ background: "none", border: `1px solid ${TOKENS.hairline}`, borderRadius: 20, padding: "5px 12px", fontSize: 12, fontWeight: 600, color: TOKENS.jade, cursor: "pointer" }}
          >
            {lang === "vi" ? "EN" : "VI"}
          </button>
        </div>

        <h1 style={{ fontFamily: "Lora, Georgia, serif", fontWeight: 500, fontSize: "clamp(26px, 5.5vw, 34px)", lineHeight: 1.25, margin: "14px 0 6px" }}>
          {t.title}
        </h1>
        <div style={{ fontSize: 12, color: `${TOKENS.jadeSoft}AA`, marginBottom: 22 }}>{t.updated}</div>
        <p style={{ fontSize: 15, color: TOKENS.jadeSoft, lineHeight: 1.7, margin: "0 0 10px" }}>{t.intro}</p>

        {t.sections.map((s) => (
          <section key={s.h} style={{ marginTop: 34 }}>
            <h2 style={{ fontFamily: "Lora, Georgia, serif", fontWeight: 500, fontSize: "clamp(19px, 3.4vw, 23px)", lineHeight: 1.3, margin: "0 0 10px" }}>
              {s.h}
            </h2>
            {s.p?.map((p, i) => (
              <p key={i} style={{ fontSize: 14.5, color: TOKENS.jadeSoft, lineHeight: 1.72, margin: "0 0 11px", whiteSpace: "pre-line" }}>
                {p}
              </p>
            ))}
            {s.list && (
              <ul style={{ margin: "0 0 11px", paddingLeft: 20, display: "flex", flexDirection: "column", gap: 8 }}>
                {s.list.map((li, i) => (
                  <li key={i} style={{ fontSize: 14.5, color: TOKENS.jadeSoft, lineHeight: 1.65 }}>
                    {withBold(li)}
                  </li>
                ))}
              </ul>
            )}
            {s.after && (
              <p style={{ fontSize: 14.5, color: TOKENS.jade, lineHeight: 1.7, margin: 0 }}>{s.after}</p>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}

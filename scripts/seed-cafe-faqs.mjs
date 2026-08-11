// Adds the objection FAQs for café and bar owners to the Policies & FAQ section.
//
// Upserts by id and touches nothing else — it will not remove or overwrite any article the
// house has written itself. Safe to run more than once; running it again restores these
// eight to the wording below, so edit them in Front Desk rather than here if you want your
// own words to stick.
//
//   node scripts/seed-cafe-faqs.mjs

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
);

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// Written to answer the objection honestly rather than talk around it. A café owner has
// heard every supplier promise; the ones that land are the ones that concede something.
const FAQS = [
  {
    id: "faq-cafe-price",
    title: {
      en: "Your tea costs more than what I use now",
      vi: "Trà của bên bạn đắt hơn trà tôi đang dùng",
    },
    body: {
      en: "It usually does, per kilo. That is the wrong unit to compare on.\n\nWhat matters is cost per cup, and ancient Shan leaf brews stronger than plantation tea — most shops end up using less leaf per litre than they expected. Work out your cost per serving with our leaf before deciding, not the price on the sack.\n\nIf it is still more expensive per cup, it is more expensive. We would rather you knew that than found out three months in.",
      vi: "Thường là đắt hơn, tính theo kg. Nhưng đó là đơn vị so sánh sai.\n\nĐiều đáng quan tâm là giá vốn trên mỗi ly. Trà Shan cổ thụ cho nước đậm hơn trà trồng đại trà — phần lớn quán dùng ít lá hơn dự tính cho mỗi lít. Hãy tính giá vốn một ly với trà của chúng tôi trước khi quyết định, đừng nhìn giá trên bao.\n\nNếu tính ra mỗi ly vẫn đắt hơn, thì nó đắt hơn thật. Chúng tôi muốn bạn biết điều đó ngay từ đầu hơn là ba tháng sau mới nhận ra.",
    },
  },
  {
    id: "faq-cafe-current-supplier",
    title: {
      en: "My current tea is fine and nobody complains",
      vi: "Trà tôi đang dùng vẫn ổn, khách không phàn nàn gì",
    },
    body: {
      en: "Nobody complains about tea that is merely fine. They also do not come back for it.\n\nThe question worth asking is not whether anyone objects to your tea, but whether anyone orders it twice. If your tea drinks are steady but never grow, the leaf is one of the few things you have not changed.\n\nIf your tea menu is already your strongest line, there is no reason to touch it. Keep what works.",
      vi: "Không ai phàn nàn về một ly trà tạm ổn. Họ cũng không quay lại vì nó.\n\nCâu hỏi đáng đặt ra không phải là có ai chê trà của bạn không, mà là có ai gọi lại lần hai không. Nếu doanh số trà đều đều nhưng không lớn lên, lá trà là một trong số ít thứ bạn chưa từng thay.\n\nCòn nếu menu trà vốn đã là mảng mạnh nhất của quán, thì không có lý do gì phải đụng vào. Giữ nguyên thứ đang hiệu quả.",
    },
  },
  {
    id: "faq-cafe-recipe-work",
    title: {
      en: "Changing tea means redoing all my recipes",
      vi: "Đổi trà là phải làm lại toàn bộ công thức",
    },
    body: {
      en: "Yes. That is the honest answer, and it is why we ask before sending a sample whether you can actually do that work.\n\nSwapping our leaf into a recipe built around a different tea will taste wrong, and you will blame the leaf. Ratio, steep time, sugar and milk all shift. Usually it is one or two afternoons of proper testing.\n\nIf you do not have those afternoons right now, wait until you do. A rushed trial tells you nothing.",
      vi: "Đúng vậy. Đó là câu trả lời thành thật, và cũng là lý do chúng tôi hỏi trước khi gửi mẫu rằng bạn có làm được phần việc đó không.\n\nNếu chỉ thay lá trà của chúng tôi vào một công thức vốn được dựng quanh loại trà khác, vị sẽ lệch — và bạn sẽ đổ lỗi cho lá trà. Tỉ lệ, thời gian ủ, đường và sữa đều phải chỉnh theo. Thường mất một hai buổi chiều thử nghiệm tử tế.\n\nNếu lúc này chưa có những buổi chiều đó, hãy đợi đến khi có. Thử vội thì không kết luận được gì.",
    },
  },
  {
    id: "faq-cafe-too-small",
    title: {
      en: "My shop is too small to order wholesale",
      vi: "Quán tôi nhỏ, không đủ lượng để đặt sỉ",
    },
    body: {
      en: "Our first pricing tier starts below 200kg, and there is no minimum to begin.\n\nMost shops start with a sample pack, then a single small order to run one drink for a month. Volume discounts come later if they come at all — they are not a condition of buying from us.\n\nA one-location shop is a perfectly normal customer here.",
      vi: "Bậc giá đầu tiên của chúng tôi bắt đầu từ dưới 200kg, và không có mức tối thiểu để bắt đầu.\n\nPhần lớn quán bắt đầu bằng gói mẫu, rồi một đơn nhỏ để chạy thử một món trong một tháng. Chiết khấu theo sản lượng đến sau — và không phải điều kiện để mua hàng.\n\nMột quán một chi nhánh là khách hàng hoàn toàn bình thường ở đây.",
    },
  },
  {
    id: "faq-cafe-consistency",
    title: {
      en: "How do I know each batch tastes the same?",
      vi: "Làm sao biết các mẻ trà giống nhau?",
    },
    body: {
      en: "You do not, entirely, and any supplier who promises otherwise is selling something blended to be identical.\n\nThese are single-origin ancient trees processed in seasonal batches. Spring differs from autumn. What we can promise is that every batch is labelled, that we tell you when we move to a new one, and that we will send you the new batch to taste before you are committed to it.\n\nIf your drinks need a fixed, unvarying profile all year, an industrial blend serves you better than we do.",
      vi: "Bạn không thể chắc chắn tuyệt đối — và nhà cung cấp nào hứa điều ngược lại thì đang bán trà đấu trộn để luôn giống nhau.\n\nĐây là trà cổ thụ một vùng, chế biến theo mẻ mùa. Mẻ xuân khác mẻ thu. Điều chúng tôi cam kết được: mỗi mẻ đều có mã, chúng tôi báo trước khi chuyển mẻ, và gửi bạn nếm mẻ mới trước khi bạn phải cam kết lấy hàng.\n\nNếu đồ uống của bạn cần một profile cố định quanh năm, trà đấu công nghiệp phục vụ bạn tốt hơn chúng tôi.",
    },
  },
  {
    id: "faq-cafe-customers-notice",
    title: {
      en: "My customers cannot tell good tea from ordinary tea",
      vi: "Khách của tôi không phân biệt được trà ngon hay trà thường",
    },
    body: {
      en: "Most cannot name what changed. Nearly all of them notice something.\n\nThey will not say \"this is single-origin Shan leaf\". They say the drink is less bitter, or that it does not leave a dry, dusty finish, or simply that they want another. That is the whole of it.\n\nWhere it shows most is in tea served without much milk or sugar to hide behind. If everything on your menu is heavily sweetened, the difference will be smaller — and we would rather tell you that now.",
      vi: "Phần lớn không gọi tên được thứ đã thay đổi. Nhưng gần như ai cũng cảm nhận được.\n\nHọ không nói \"đây là trà Shan một vùng\". Họ nói đỡ chát hơn, hoặc không còn hậu vị khô khốc, hoặc đơn giản là gọi thêm ly nữa. Chỉ vậy thôi.\n\nKhác biệt rõ nhất ở những món ít sữa ít đường để che. Nếu cả menu của bạn đều rất ngọt, khác biệt sẽ nhỏ hơn — và chúng tôi nói trước điều đó.",
    },
  },
  {
    id: "faq-cafe-supply",
    title: {
      en: "What if you run out mid-season?",
      vi: "Nếu giữa mùa bên bạn hết hàng thì sao?",
    },
    body: {
      en: "It can happen, and it is the fair thing to ask a small producer.\n\nWe hold stock across two warehouses, Hà Giang and Sóc Sơn, and the shop shows live stock so you are not guessing. For partners ordering regularly we set aside the volume you told us you would need, so a good month elsewhere does not empty your shelf.\n\nIf a batch is genuinely finished, we say so rather than substituting quietly.",
      vi: "Chuyện đó có thể xảy ra, và đây là câu hỏi công bằng khi làm việc với một nhà sản xuất nhỏ.\n\nChúng tôi giữ tồn kho ở hai kho, Hà Giang và Sóc Sơn, và trang bán hàng hiển thị tồn kho trực tiếp để bạn không phải đoán. Với đối tác đặt đều, chúng tôi giữ sẵn phần sản lượng bạn đã báo, để một tháng bán tốt ở nơi khác không làm trống kệ của bạn.\n\nNếu một mẻ thực sự hết, chúng tôi nói thẳng chứ không lặng lẽ thay bằng loại khác.",
    },
  },
  {
    id: "faq-cafe-paperwork",
    title: {
      en: "Can you invoice properly for my accounts?",
      vi: "Bên bạn xuất hoá đơn được không?",
    },
    body: {
      en: "Yes. Enter your tax number at checkout and it appears on the order; VAT is applied and shown on the invoice you can print from your order confirmation.\n\nIf your accountant needs anything beyond that — a signed contract for a recurring order, documentation of origin — ask and we will put it together.",
      vi: "Được. Nhập mã số thuế khi đặt hàng, mã sẽ nằm trên đơn; VAT được tính và thể hiện trên hoá đơn bạn in ra từ màn hình xác nhận đơn.\n\nNếu kế toán của bạn cần thêm gì — hợp đồng ký cho đơn định kỳ, giấy tờ chứng minh nguồn gốc — cứ nói, chúng tôi chuẩn bị.",
    },
  },
];

let added = 0, updated = 0;
for (const f of FAQS) {
  const { data: existing } = await supabase
    .from("wiki_articles").select("id").eq("id", f.id).maybeSingle();
  const { error } = await supabase.from("wiki_articles").upsert({
    id: f.id, category: "policies", title: f.title, body: f.body,
  });
  if (error) { console.error(`  ${f.id}: ${error.message}`); continue; }
  existing ? updated++ : added++;
  console.log(`  ${existing ? "updated" : "added  "}  ${f.id}`);
}

console.log(`\nDone. ${added} added, ${updated} updated. No other article was touched.`);
process.exit(0);

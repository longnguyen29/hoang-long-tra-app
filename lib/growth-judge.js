const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, value));

const clean = (value) => String(value || "").trim();
const lower = (value) => clean(value).toLocaleLowerCase("vi-VN");
const hasAny = (text, terms) => terms.filter(Boolean).some((term) => text.includes(term));
const asPhrase = (value) => {
  const text = clean(value);
  return text ? `${text.charAt(0).toLocaleLowerCase("vi-VN")}${text.slice(1)}` : text;
};

export const DEFAULT_GROWTH_RUBRIC = [
  { key: "audience", label: "Đúng người đọc", hint: "Chủ quán hoặc người làm menu nhận ra bài này dành cho mình." },
  { key: "hook", label: "Mở bài", hint: "Hai dòng đầu nêu một tình huống hoặc quyết định thật." },
  { key: "menu", label: "Liên quan công thức", hint: "Nội dung nói đến cách trà hoạt động trong món, không chỉ kể về trà." },
  { key: "proof", label: "Bằng chứng", hint: "Có chi tiết cụ thể, kiểm chứng được và không phóng đại." },
  { key: "cta", label: "Bước tiếp theo", hint: "Người đọc hiểu rõ bấm link để thử bộ mẫu cho menu." },
  { key: "voice", label: "Giọng Hoàng Long", hint: "Điềm tĩnh, rõ nguồn gốc, không giật tít hoặc ép mua." },
];

export function judgeThreadsDraft(draft, brief = {}) {
  const text = clean(draft);
  const normalized = lower(text);
  const lines = text.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const first = lower(lines.slice(0, 2).join(" "));
  const length = text.length;
  const audienceTerms = ["quán", "menu", "pha chế", "bar", "công thức", "chủ quán", "đồ uống"];
  const menuTerms = ["công thức", "nền trà", "pha", "ủ", "sữa", "trái cây", "định lượng", "menu", "quầy"];
  const proofTerms = ["shan tuyết", "hà giang", "mẻ", "mùa", "1995", "thử", "4 mẫu", "bốn mẫu", "tại quán"];
  const ctaTerms = ["nhận mẫu", "thử mẫu", "bộ mẫu", "bấm", "đăng ký", "hoanglongtra.com/sample", "/sample"];
  const hypeTerms = ["tốt nhất", "số 1", "đỉnh cao", "hoàn hảo", "duy nhất", "cam kết tăng", "bùng nổ", "không thể bỏ lỡ"];

  const audience = clamp(25 + (hasAny(normalized, audienceTerms) ? 45 : 0) + (hasAny(normalized, [lower(brief.audience)]) ? 20 : 0) + (length > 120 ? 10 : 0));
  const hook = clamp(20 + (first.length >= 35 && first.length <= 180 ? 35 : 0) + (/[?？]/.test(lines[0] || "") ? 20 : 0) + (hasAny(first, ["nếu", "khi", "vì sao", "đang", "khó", "chọn"]) ? 25 : 0));
  const menu = clamp(15 + (hasAny(normalized, menuTerms) ? 55 : 0) + (hasAny(normalized, ["thử trực tiếp", "công thức thực tế", "tại quầy"]) ? 30 : 0));
  const proof = clamp(15 + (hasAny(normalized, proofTerms) ? 45 : 0) + (/\d/.test(text) ? 20 : 0) + (clean(brief.proof) && normalized.includes(lower(brief.proof).slice(0, 18)) ? 20 : 0));
  const cta = clamp(10 + (hasAny(normalized, ctaTerms) ? 55 : 0) + (hasAny(normalized, ["link", "bên dưới", "bio"]) ? 15 : 0) + (/[/:]/.test(text) ? 20 : 0));
  const voice = clamp(85 - (hasAny(normalized, hypeTerms) ? 45 : 0) - ((text.match(/!/g) || []).length > 1 ? 20 : 0) - (length > 500 ? 15 : 0) + (hasAny(normalized, ["nguồn gốc", "thử", "phù hợp", "thực tế"]) ? 15 : 0));

  const scores = { audience, hook, menu, proof, cta, voice };
  const overall = Math.round(Object.values(scores).reduce((sum, value) => sum + value, 0) / Object.keys(scores).length);
  const notes = [];
  if (audience < 70) notes.push("Gọi đúng chủ quán hoặc người đang phát triển menu ngay trong hai dòng đầu.");
  if (hook < 70) notes.push("Mở bằng một tình huống hoặc câu hỏi mà quán đang thực sự phải quyết định.");
  if (menu < 70) notes.push("Nói rõ trà sẽ được thử trong công thức, bằng nước và thiết bị tại quán.");
  if (proof < 70) notes.push("Thêm một chi tiết có thể kiểm chứng: vùng trà, số mẫu hoặc cách thử.");
  if (cta < 70) notes.push("Nêu rõ bấm link để yêu cầu bộ mẫu và thử trước khi nhập sỉ.");
  if (voice < 70) notes.push("Bỏ từ tuyệt đối và dấu chấm than; giữ giọng điềm tĩnh, có căn cứ.");

  return { overall, scores, notes, characterCount: length };
}

export function buildGrowthPrompt(brief = {}) {
  return [
    "Bạn đang viết một bài Threads cho Nhà làm Trà Hoàng Long.",
    "Mục tiêu kinh doanh: đưa đúng chủ quán hoặc người làm menu đến trang nhận bộ mẫu trà để thử trong công thức thực tế.",
    "Không tối ưu cho tương tác chung chung. Không bịa số liệu, không dùng từ tuyệt đối và không ép mua.",
    "",
    `Người đọc: ${clean(brief.audience) || "Chủ quán và người phát triển menu đồ uống"}`,
    `Vấn đề họ đang gặp: ${clean(brief.customerProblem) || "Chưa biết nền trà nào hợp công thức và vận hành tại quán"}`,
    `Góc tiếp cận: ${clean(brief.angle) || "Thử trong công thức trước khi quyết định nhập sỉ"}`,
    `Bằng chứng được phép dùng: ${clean(brief.proof) || "Bốn mẫu từ các mẻ đang có; Shan Tuyết cổ thụ Hà Giang; thử tại quầy"}`,
    `Đề nghị: ${clean(brief.offer) || "Bộ bốn mẫu trà dành cho quán"}`,
    `Hành động mong muốn: ${clean(brief.cta) || "Bấm link để gửi yêu cầu nhận mẫu"}`,
    `Giả thuyết cần kiểm chứng: ${clean(brief.hypothesis) || "Thông điệp thử trong công thức sẽ thu hút lead phù hợp hơn thông điệp kể về nguồn gốc"}`,
    "",
    "Viết 3 phiên bản, mỗi phiên bản thay đổi duy nhất cách mở bài. Mỗi bài 280–450 ký tự, có xuống dòng tự nhiên, một CTA rõ và chừa [LINK_SAMPLE] ở cuối. Sau mỗi phiên bản, ghi một câu giải thích điều đang được thử. Chỉ trả về nội dung bài và câu giải thích.",
  ].join("\n");
}

export function starterVariants(brief = {}) {
  const problem = asPhrase(brief.customerProblem) || "chọn trà nền cho một công thức mới";
  const offer = asPhrase(brief.offer) || "bộ bốn mẫu trà";
  const proof = asPhrase(brief.proof) || "các mẻ Shan Tuyết cổ thụ Hà Giang đang có";
  const cta = clean(brief.cta) || "Xem bộ thử và gửi nhu cầu của quán tại";
  return [
    {
      label: "A · Nỗi khó của quán",
      text: `Khó nhất khi ${problem} không phải là tìm loại trà “ngon nhất”. Mà là biết loại nào giữ được vị khi đi cùng sữa, trái cây và cách pha tại quầy.\n\nHoàng Long chuẩn bị ${offer} từ ${proof} để quán thử trực tiếp trong công thức trước khi trao đổi đơn sỉ.\n\n${cta}: [LINK_SAMPLE]`,
    },
    {
      label: "B · Quyết định thực tế",
      text: `Một bảng mô tả hương vị không thể thay quán quyết định nền trà cho menu. Nguồn nước, thiết bị và tỷ lệ pha thực tế mới cho câu trả lời.\n\nVì vậy ${offer} được làm để quán chạy thử ngay tại quầy, so sánh kết quả rồi mới chọn trà nhập sỉ. Các mẫu đến từ ${proof}.\n\n${cta}: [LINK_SAMPLE]`,
    },
    {
      label: "C · Lời mời thử",
      text: `Nếu quán đang ${problem}, hãy thử trà trong chính món định bán trước.\n\n${offer} gồm những nền trà được chọn từ ${proof}. Quán pha, điều chỉnh tỷ lệ và phản hồi kết quả; Hoàng Long dựa vào đó để đề xuất bước tiếp theo, không dựa vào một bảng chào giá chung.\n\n${cta}: [LINK_SAMPLE]`,
    },
  ];
}

export function trackingUrl(code, origin = "https://www.hoanglongtra.com") {
  const safeCode = encodeURIComponent(clean(code));
  return `${origin}/sample?utm_source=threads&utm_medium=organic&utm_campaign=sample_lab&utm_content=${safeCode}&exp=${safeCode}`;
}

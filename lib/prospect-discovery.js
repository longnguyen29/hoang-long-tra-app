// Discovery signals are research cues, never purchase probabilities.
export const PROSPECT_STATES = { research: "Cần kiểm tra", qualified: "Phù hợp để tiếp cận", not_fit: "Không phù hợp", do_not_contact: "Không liên hệ" };
export const SEGMENTS = { all: "Café & quán trà", milk: "Quán có trà sữa", fruit: "Quán có trà trái cây" };
export function plain(value, max = 1500) {
  return String(value ?? "").replace(/<[^>]*>/g, "").replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, max);
}
export function sourceUrl(value) {
  try {
    const u = new URL(String(value));
    if (!["https:", "http:"].includes(u.protocol) || u.username || u.password || !u.hostname.includes(".") || /^(localhost|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/.test(u.hostname) || u.hostname.endsWith(".local")) return "";
    u.hash = "";
    for (const key of [...u.searchParams.keys()]) if (/^(utm_|fbclid$|gclid$|twclid$)/i.test(key)) u.searchParams.delete(key);
    return u.toString().slice(0, 2000);
  } catch { return ""; }
}
// Exact source-page identity: do not merge distinct shops on Facebook/Wix/delivery platforms.
export function sourceKey(value) {
  const safe = sourceUrl(value);
  if (!safe) return "";
  const u = new URL(safe);
  return `${u.host.toLowerCase().replace(/^www\./, "")}${u.pathname.replace(/\/+$/, "")}${u.search}`;
}
export function normalizeProspect(input) {
  const name = plain(input?.name, 160), url = sourceUrl(input?.source_url);
  if (!name || !url) throw new Error("Nhập tên quán và đường dẫn nguồn hợp lệ.");
  return { name, source_url: url, source_key: sourceKey(url), region: plain(input.region, 120), evidence: plain(input.evidence, 1500), evidence_kind: input.evidence_kind === "page_review" ? "page_review" : "search_snippet", contact: plain(input.contact, 240), notes: plain(input.notes, 2000) };
}
export function teaSignals(text) {
  const t = plain(text).normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
  const signals = [];
  if (/tra sua|milk tea/.test(t)) signals.push({ label: "Có nhắc trà sữa", suggestion: "Có thể thử nền trà Shan Mật trong công thức trà sữa; cần pha đối chiếu trước khi đề xuất thay trà." });
  if (/tra trai cay|fruit tea|jasmine tea|tra lai|tra hoa lai/.test(t)) signals.push({ label: "Có nhắc trà trái cây / lài", suggestion: "Có thể thử Ngọc Lan cho nhóm trà trái cây; cần xác nhận vị trà và giá vốn quán mong muốn." });
  return signals;
}
export function discoveryQuery(region = "", segment = "all") {
  if (!Object.hasOwn(SEGMENTS, segment)) throw new Error("Nhóm quán không hợp lệ.");
  const area = plain(region, 100).replace(/["<>]/g, "") || "Việt Nam";
  const product = segment === "milk" ? '"trà sữa"' : segment === "fruit" ? '"trà trái cây"' : '("trà sữa" OR "trà trái cây")';
  return `${area} (cafe OR coffee OR "quán trà") menu ${product} -site:hoanglongtra.com`;
}
export function searchCandidates(payload, region = "", now = new Date().toISOString()) {
  const seen = new Set();
  return (Array.isArray(payload?.web?.results) ? payload.web.results : []).slice(0, 20).flatMap(result => {
    try {
      const p = normalizeProspect({ name: result.title, source_url: result.url, region: "", evidence: result.description, evidence_kind: "search_snippet" });
      if (seen.has(p.source_key)) return [];
      seen.add(p.source_key);
      return [{ ...p, id: p.source_key, searched_region: region || "Toàn quốc", observed_at: now, status: "research" }];
    } catch { return []; }
  });
}
export function outreachDraft(p) {
  if (p.status !== "qualified") return "";
  return `Chào anh/chị ${plain(p.name, 160)}, mình là Long từ Trà Hoàng Long. Bên mình cung cấp trà cho quán café và quán trà. Anh/chị có đang cân nhắc thử thêm nền trà cho menu không? Nếu phù hợp, mình xin gửi thông tin bộ mẫu để quán xem trước. Anh/chị chưa có nhu cầu thì mình xin phép không làm phiền thêm.`;
}

export const MISSIONS = [
  { id: "posts", label: "Đăng bài Threads", target: 3, weight: 20, detail: "Bài hữu ích đã đăng; không tính bản nháp.", action: "Mở thử nghiệm" },
  { id: "replies", label: "Phản hồi có giá trị", target: 15, weight: 10, detail: "Góp ý thực chất vào hội thoại liên quan ngành trà." },
  { id: "prospects", label: "Tìm khách phù hợp", target: 15, weight: 15, detail: "Có lý do phù hợp và nguồn công khai.", href: "/admin/discovery", module: "discovery" },
  { id: "outreach", label: "Tiếp cận cá nhân hóa", target: 5, weight: 15, detail: "Một doanh nghiệp, một lời mở đầu phù hợp.", href: "/admin/discovery", module: "discovery" },
  { id: "followups", label: "Chăm lại khách cũ", target: 10, weight: 25, detail: "Theo dõi mẫu, báo giá hoặc nhu cầu nhập lại.", href: "/admin/pipeline", module: "pipeline" },
  { id: "referrals", label: "Xin lời giới thiệu", target: 2, weight: 15, detail: "Hỏi khách hài lòng, không gây áp lực.", href: "/admin/customer-memory", module: "customerMemory" },
];
export const OUTCOMES = [
  { id: "inquiries", label: "Khách hỏi đủ điều kiện" },
  { id: "samples", label: "Mẫu đã gửi" },
  { id: "firstOrders", label: "Khách mua lần đầu" },
  { id: "repeatOrders", label: "Đơn mua lại" },
];
export function weekKey(value = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(value)).map(p => [p.type, p.value]));
  const date = new Date(Date.UTC(+parts.year, +parts.month - 1, +parts.day));
  date.setUTCDate(date.getUTCDate() - (date.getUTCDay() + 6) % 7);
  return date.toISOString().slice(0, 10);
}
export function shiftWeek(key, amount) {
  const d = new Date(key + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + 7 * amount);
  return d.toISOString().slice(0, 10);
}
export function count(value) {
  return Number.isSafeInteger(value) ? Math.max(0, Math.min(9999, value)) : 0;
}
export function missionScore(counts = {}) {
  return Math.round(MISSIONS.reduce((sum, m) => sum + m.weight * Math.min(1, count(counts[m.id]) / m.target), 0));
}
export function missionRank(score) {
  return score >= 100 ? "Vườn trà vững mạnh" : score >= 70 ? "Tán xanh" : score >= 40 ? "Bén rễ" : "Gieo hạt";
}
export function trackedPosts(experiments = [], week) {
  const ids = new Set();
  for (const experiment of experiments) for (const variant of experiment.variants || []) {
    if (!variant.id || !variant.published_at || !variant.threads_post_url || !Number.isFinite(Date.parse(variant.published_at))) continue;
    if (weekKey(variant.published_at) === week) ids.add(variant.id);
  }
  return ids.size;
}
export function normalizeWeek(raw) {
  const entry = raw && typeof raw === "object" ? raw : {};
  return { counts: Object.fromEntries(MISSIONS.map(m => [m.id, count(entry.counts?.[m.id])])), outcomes: Object.fromEntries(OUTCOMES.map(m => [m.id, count(entry.outcomes?.[m.id])])), focus: typeof entry.focus === "string" ? entry.focus.slice(0, 1000) : "" };
}

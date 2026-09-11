import { authenticateManagerRequest } from "@/lib/staff-api-auth";
import { discoveryQuery, searchCandidates } from "@/lib/prospect-discovery";

export const maxDuration = 40;
const reply = (body, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
const enabled = () => process.env.DISCOVERY_SEARCH_ENABLED === "true" && Boolean(process.env.BRAVE_SEARCH_API_KEY);
async function manager(request) {
  try { return await authenticateManagerRequest(request); } catch { return null; }
}
export async function GET(request) {
  if (!await manager(request)) return reply({ error: "Cần đăng nhập bằng tài khoản quản lý." }, 403);
  return reply({ enabled: enabled() });
}
export async function POST(request) {
  const staff = await manager(request);
  if (!staff) return reply({ error: "Cần đăng nhập bằng tài khoản quản lý." }, 403);
  if (!enabled()) return reply({ error: "Nguồn tìm kiếm chưa được bật. Bạn vẫn có thể thêm quán từ đường dẫn công khai." }, 503);
  let query, region;
  try {
    const raw = await request.text();
    if (raw.length > 2000) return reply({ error: "Nội dung tìm kiếm quá dài." }, 400);
    const body = JSON.parse(raw);
    region = String(body.region || "").slice(0, 100);
    query = discoveryQuery(region, body.segment || "all");
  } catch { return reply({ error: "Kiểm tra khu vực và nhóm quán cần tìm." }, 400); }
  const limit = Math.max(1, Math.min(20, Number.parseInt(process.env.DISCOVERY_DAILY_SEARCH_LIMIT || "5", 10) || 5));
  const { data: runId, error: reserveError } = await staff.admin.rpc("reserve_discovery_search", { p_user: staff.user.id, p_query: query, p_limit: limit });
  if (reserveError || !runId) return reply({ error: reserveError?.message?.includes("daily_limit") ? "Đã hết lượt tìm hôm nay. Danh sách đã lưu vẫn dùng được." : "Chưa thể ghi nhận lượt tìm. Kiểm tra thiết lập dữ liệu trước khi thử lại." }, reserveError?.message?.includes("daily_limit") ? 429 : 503);
  try {
    const url = new URL("https://api.search.brave.com/res/v1/web/search");
    url.search = new URLSearchParams({ q: query, count: "20", search_lang: "vi", result_filter: "web", text_decorations: "false" }).toString();
    const response = await fetch(url, { headers: { Accept: "application/json", "X-Subscription-Token": process.env.BRAVE_SEARCH_API_KEY }, signal: AbortSignal.timeout(25000), cache: "no-store" });
    if (!response.ok) throw new Error("provider_failed");
    const candidates = searchCandidates(await response.json(), region);
    const { error } = await staff.admin.from("discovery_search_runs").update({ status: "completed", result_count: candidates.length }).eq("id", runId);
    return reply({ candidates, query, warning: error ? "Có kết quả nhưng chưa cập nhật được lịch sử lượt tìm." : "Đây là kết quả tìm trên web; cần mở nguồn để xác minh quán, khu vực và menu." });
  } catch {
    await staff.admin.from("discovery_search_runs").update({ status: "failed" }).eq("id", runId);
    return reply({ error: "Nguồn tìm kiếm chưa trả kết quả. Lượt thử đã được tính để giới hạn chi phí; không có quán nào được lưu tự động." }, 502);
  }
}

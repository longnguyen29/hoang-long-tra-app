import { houseDateKey, isCalendarDateKey } from "./dashboard-calendar.js";

export function followupDayAfter(day, count) {
  const date = new Date(day + "T00:00:00Z");
  date.setUTCDate(date.getUTCDate() + count);
  return date.toISOString().slice(0, 10);
}

export function followupPatch(customer, { result, action, day, reschedule }, clock = new Date()) {
  const note = result.trim();
  if (!note || note.length > 1000) throw new Error("Nhập kết quả chăm sóc, tối đa 1.000 ký tự.");
  const stamp = houseDateKey(clock).split("-").reverse().join("/");
  const patch = {
    notes: [customer.notes, `[${stamp}] ${note}`].filter(Boolean).join("\n"),
    updated_at: clock.toISOString(),
  };
  if (reschedule) {
    if (!action.trim() || action.trim().length > 250) throw new Error("Nhập bước tiếp theo, tối đa 250 ký tự.");
    if (!isCalendarDateKey(day) || day < houseDateKey(clock)) throw new Error("Chọn ngày hẹn từ hôm nay trở đi.");
    patch.next_action = action.trim();
    patch.next_action_at = new Date(day + "T09:00:00+07:00").toISOString();
  }
  return patch;
}

// Use the version captured when the sheet opened. One conditional update writes
// both fields, and a replay after a lost response cannot append the note twice.
export async function persistFollowup(supabase, customer, patch) {
  if (customer.discovery_prospect_id) {
    const check = await supabase.rpc("pipeline_prospect_suppressed", { p_opportunity_id: customer.id });
    if (check.error || check.data !== false) throw new Error("Không thể xác nhận quyền chăm sóc khách này. Kiểm tra lại hồ sơ.");
  }
  const table = supabase.from("trade_opportunities");
  const { data, error } = await table.update(patch).eq("id", customer.id)
    .eq("updated_at", customer.updated_at).neq("stage", "lost").select().maybeSingle();
  if (error) throw new Error("Chưa xác nhận được kết quả lưu. Có thể thử lại với nội dung đang nhập.");
  if (data) return { saved: data };
  const latest = await table.select("*").eq("id", customer.id).maybeSingle();
  if (latest.error || !latest.data || latest.data.stage === "lost") throw new Error("Hồ sơ đã tạm dừng hoặc không đọc được. Kiểm tra lại hồ sơ.");
  const current = latest.data;
  if (Date.parse(current.updated_at) === Date.parse(patch.updated_at) && current.notes === patch.notes &&
    (!patch.next_action_at || (current.next_action === patch.next_action && Date.parse(current.next_action_at) === Date.parse(patch.next_action_at)))) {
    return { saved: current };
  }
  return { conflict: current };
}

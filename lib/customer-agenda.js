import { houseDateKey, isCalendarDateKey } from "./dashboard-calendar.js";

export const agendaLabels = {
  overdue: "Quá hẹn", today: "Hôm nay", upcoming: "Sắp tới", unplanned: "Chưa lên lịch",
};

export function groupCustomerAgenda(customers, today = houseDateKey()) {
  const groups = { overdue: [], today: [], upcoming: [], unplanned: [] };
  for (const customer of customers) {
    if (customer.stage === "lost" || customer.prospect_suppressed) continue;
    const raw = customer.next_action_at;
    const timestamp = Date.parse(raw);
    const day = isCalendarDateKey(raw) ? raw : Number.isFinite(timestamp) ? houseDateKey(new Date(timestamp)) : "";
    let bucket = "unplanned";
    if (day && customer.next_action?.trim()) {
      bucket = day < today ? "overdue" : day === today ? "today" : "upcoming";
    }
    groups[bucket].push({ customer, day });
  }
  for (const rows of Object.values(groups)) {
    rows.sort((a, b) => a.day.localeCompare(b.day) || (a.customer.business_name || "").localeCompare(b.customer.business_name || "", "vi"));
  }
  return groups;
}

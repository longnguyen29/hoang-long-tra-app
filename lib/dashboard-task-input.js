// Keep these bounds aligned with 0089_dashboard_quick_task.sql.
export const FOCUS_TITLE_LIMIT = 1000;
export const PLAN_TITLE_LIMIT = 500;
export const PLAN_NOTES_LIMIT = 6000;

export function dashboardTextError(value, limit, label, required = false) {
  if (typeof value !== 'string' || (required && !value.trim())) return `Nhập ${label.toLowerCase()}.`;
  if (Array.from(value.trim()).length > limit) return `${label} tối đa ${limit.toLocaleString('vi-VN')} ký tự. Nội dung chưa được lưu.`;
  return '';
}

export const HOUSE_TIME_ZONE = 'Asia/Ho_Chi_Minh';

export function houseDateKey(value = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: HOUSE_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(value);
  const part = (type) => parts.find((item) => item.type === type)?.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

export function daysUntilDate(eventOn, today) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(eventOn || '') || !/^\d{4}-\d{2}-\d{2}$/.test(today || '')) return NaN;
  return Math.round((Date.parse(`${eventOn}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86400000);
}

export function reminderDue(plan, today) {
  const days = daysUntilDate(plan.event_on, today);
  return plan.status === 'pending' && plan.notify_telegram && Number.isInteger(days)
    && days >= 0 && days <= Number(plan.remind_days)
    && plan.notified_event_on !== plan.event_on;
}

export function calendarCells(year, monthIndex) {
  const first = new Date(year, monthIndex, 1);
  const days = new Date(year, monthIndex + 1, 0).getDate();
  const offset = (first.getDay() + 6) % 7;
  return [...Array(offset).fill(null), ...Array.from({ length: days }, (_, index) => index + 1)];
}

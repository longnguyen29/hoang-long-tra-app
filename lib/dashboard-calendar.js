export const HOUSE_TIME_ZONE = 'Asia/Ho_Chi_Minh';

function daysInMonth(year, monthIndex) {
  if (monthIndex === 1) return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 29 : 28;
  return [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][monthIndex];
}

export function isCalendarDateKey(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  return year >= 1 && month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth(year, month - 1);
}

export function addCalendarMonths(dateKey, months) {
  if (!isCalendarDateKey(dateKey) || !Number.isSafeInteger(months)) return null;
  const [year, month, day] = dateKey.split('-').map(Number);
  const totalMonths = year * 12 + month - 1 + months;
  const nextYear = Math.floor(totalMonths / 12);
  if (nextYear < 1 || nextYear > 9999) return null;
  const nextMonth = totalMonths - nextYear * 12;
  const nextDay = Math.min(day, daysInMonth(nextYear, nextMonth));
  return `${String(nextYear).padStart(4, '0')}-${String(nextMonth + 1).padStart(2, '0')}-${String(nextDay).padStart(2, '0')}`;
}

export function subtractCalendarMonth(dateKey) {
  return addCalendarMonths(dateKey, -1);
}

export function calendarMonthEnd(dateKey) {
  if (!isCalendarDateKey(dateKey)) return null;
  const [year, month] = dateKey.split('-').map(Number);
  return `${dateKey.slice(0, 7)}-${String(daysInMonth(year, month - 1)).padStart(2, '0')}`;
}

export function governmentObligationDates(config, year) {
  if (config?.active !== true || config.deadline_confirmed !== true || !isCalendarDateKey(config.first_due_on)
    || !Number.isInteger(year) || year < 1 || year > 9999) return [];
  const repeatMonths = Number(config.repeat_months);
  if (![0, 1, 3, 6, 12].includes(repeatMonths)) return [];
  const monthEnd = config.due_rule === 'month_end';
  if (monthEnd && config.first_due_on !== calendarMonthEnd(config.first_due_on)) return [];
  const [firstYear, firstMonth] = config.first_due_on.split('-').map(Number);
  if (repeatMonths === 0) return firstYear === year ? [config.first_due_on] : [];
  const startOffset = (year - firstYear) * 12 - (firstMonth - 1);
  const firstIndex = Math.max(0, Math.ceil(startOffset / repeatMonths));
  const lastIndex = Math.floor((startOffset + 11) / repeatMonths);
  const dates = [];
  // Always calculate from the original deadline so a February clamp does not shift March.
  for (let index = firstIndex; index <= lastIndex; index += 1) {
    const date = addCalendarMonths(config.first_due_on, index * repeatMonths);
    dates.push(monthEnd ? calendarMonthEnd(date) : date);
  }
  return dates;
}

export function houseDateKey(value = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: HOUSE_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(value);
  const part = (type) => parts.find((item) => item.type === type)?.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

export function daysUntilDate(eventOn, today) {
  if (!isCalendarDateKey(eventOn) || !isCalendarDateKey(today)) return NaN;
  return Math.round((Date.parse(`${eventOn}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86400000);
}

export function reminderDue(plan, today) {
  if (plan.reminder_unit === 'month') {
    const start = subtractCalendarMonth(plan.event_on);
    return plan.status === 'pending' && plan.notify_telegram && start !== null && isCalendarDateKey(today)
      && today >= start && today <= plan.event_on && plan.notified_event_on !== plan.event_on;
  }
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

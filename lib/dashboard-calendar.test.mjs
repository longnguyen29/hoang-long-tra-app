import test from 'node:test';
import assert from 'node:assert/strict';
import { houseDateKey, daysUntilDate, reminderDue, calendarCells, isCalendarDateKey, addCalendarMonths, subtractCalendarMonth, calendarMonthEnd, governmentObligationDates } from './dashboard-calendar.js';

test('house date rolls over at midnight in Vietnam', () => {
  assert.equal(houseDateKey(new Date('2026-09-28T16:59:00Z')), '2026-09-28');
  assert.equal(houseDateKey(new Date('2026-09-28T17:01:00Z')), '2026-09-29');
});

test('reminder is due once inside its lead window, including same-day catch-up', () => {
  const plan = { status: 'pending', notify_telegram: true, event_on: '2026-10-02', remind_days: 3, notified_event_on: null };
  assert.equal(reminderDue(plan, '2026-09-28'), false);
  assert.equal(reminderDue(plan, '2026-09-29'), true);
  assert.equal(reminderDue(plan, '2026-10-02'), true);
  assert.equal(reminderDue({ ...plan, notified_event_on: plan.event_on }, '2026-09-29'), false);
  assert.equal(reminderDue(plan, '2026-10-03'), false);
  assert.equal(daysUntilDate('2027-01-01', '2026-12-31'), 1);
});

test('year calendar starts on Monday and covers leap day', () => {
  const february = calendarCells(2028, 1);
  assert.equal(february.filter(Boolean).length, 29);
  assert.equal(february.indexOf(1), 1);
});

test('calendar dates reject impossible days instead of rolling into another month', () => {
  for (const date of ['2026-02-29', '2026-04-31', '2026-13-01', '2026-00-10', '2026-01-00', '2026-1-01', '0000-01-01']) {
    assert.equal(isCalendarDateKey(date), false, date);
    assert.ok(Number.isNaN(daysUntilDate(date, '2026-01-01')), date);
    assert.equal(addCalendarMonths(date, 1), null, date);
  }
  assert.equal(isCalendarDateKey('2028-02-29'), true);
  assert.equal(isCalendarDateKey('1900-02-29'), false);
  assert.equal(isCalendarDateKey('2000-02-29'), true);
  assert.equal(addCalendarMonths('2026-01-31', 1.5), null);
});

test('calendar-month arithmetic clamps short months and crosses years', () => {
  assert.equal(subtractCalendarMonth('2026-03-31'), '2026-02-28');
  assert.equal(subtractCalendarMonth('2028-03-31'), '2028-02-29');
  assert.equal(subtractCalendarMonth('2027-01-31'), '2026-12-31');
  assert.equal(addCalendarMonths('2028-02-29', 12), '2029-02-28');
  assert.equal(addCalendarMonths('2026-01-31', 2), '2026-03-31');
});

test('monthly reminder uses one calendar month, catches up until due date and deduplicates', () => {
  const plan = { status: 'pending', notify_telegram: true, event_on: '2026-03-31', reminder_unit: 'month', notified_event_on: null };
  assert.equal(reminderDue(plan, '2026-02-27'), false);
  assert.equal(reminderDue(plan, '2026-02-28'), true);
  assert.equal(reminderDue(plan, '2026-03-31'), true);
  assert.equal(reminderDue(plan, '2026-04-01'), false);
  assert.equal(reminderDue({ ...plan, event_on: '2027-01-15' }, '2026-12-15'), true);
  assert.equal(reminderDue({ ...plan, event_on: '2028-03-31' }, '2028-02-29'), true);
  assert.equal(reminderDue({ ...plan, notified_event_on: plan.event_on }, '2026-02-28'), false);
  assert.equal(reminderDue({ ...plan, status: 'done' }, '2026-02-28'), false);
  assert.equal(reminderDue({ ...plan, notify_telegram: false }, '2026-02-28'), false);
  assert.equal(reminderDue({ ...plan, event_on: '2026-04-31' }, '2026-03-31'), false);
});

test('monthly obligations stay anchored to the original deadline without February drift', () => {
  const dates = governmentObligationDates({ active: true, deadline_confirmed: true, first_due_on: '2026-01-31', repeat_months: 1 }, 2026);
  assert.equal(dates.length, 12);
  assert.deepEqual(dates.slice(0, 4), ['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30']);
  assert.equal(dates.at(-1), '2026-12-31');
});

test('quarterly and annual obligations project only the selected year from the first deadline', () => {
  const config = { active: true, deadline_confirmed: true, first_due_on: '2025-10-31', repeat_months: 3 };
  assert.deepEqual(governmentObligationDates(config, 2026), ['2026-01-31', '2026-04-30', '2026-07-31', '2026-10-31']);
  assert.deepEqual(governmentObligationDates(config, 2025), ['2025-10-31']);
  assert.deepEqual(governmentObligationDates(config, 2024), []);
  assert.deepEqual(governmentObligationDates({ ...config, first_due_on: '2028-02-29', repeat_months: 12 }, 2032), ['2032-02-29']);
  assert.deepEqual(governmentObligationDates({ ...config, first_due_on: '2026-01-31', repeat_months: 6 }, 2026), ['2026-01-31', '2026-07-31']);
});

test('unconfirmed, inactive and undated obligations do not create calendar deadlines', () => {
  const config = { active: true, deadline_confirmed: true, first_due_on: '2026-11-20', repeat_months: 0 };
  assert.deepEqual(governmentObligationDates(config, 2026), ['2026-11-20']);
  assert.deepEqual(governmentObligationDates(config, 2027), []);
  for (const patch of [{ active: false }, { deadline_confirmed: false }, { first_due_on: null }, { repeat_months: 2 }, { first_due_on: '2026-11-31' }]) {
    assert.deepEqual(governmentObligationDates({ ...config, ...patch }, 2026), []);
  }
});

test('month-end obligations follow the actual last day rather than a fixed day number', () => {
  const config = { active: true, deadline_confirmed: true, first_due_on: '2026-04-30', repeat_months: 3, due_rule: 'month_end' };
  assert.equal(calendarMonthEnd('2028-02-01'), '2028-02-29');
  assert.equal(calendarMonthEnd('2026-02-30'), null);
  assert.deepEqual(governmentObligationDates(config, 2026), ['2026-04-30', '2026-07-31', '2026-10-31']);
  assert.deepEqual(governmentObligationDates({ ...config, due_rule: 'fixed_day' }, 2026), ['2026-04-30', '2026-07-30', '2026-10-30']);
  assert.deepEqual(governmentObligationDates({ ...config, first_due_on: '2026-04-29' }, 2026), []);
});

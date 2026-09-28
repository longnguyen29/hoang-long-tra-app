import test from 'node:test';
import assert from 'node:assert/strict';
import { houseDateKey, daysUntilDate, reminderDue, calendarCells } from './dashboard-calendar.js';

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

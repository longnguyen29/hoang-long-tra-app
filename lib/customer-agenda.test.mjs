import assert from "node:assert/strict";
import test from "node:test";
import { groupCustomerAgenda } from "./customer-agenda.js";
import { searchCustomer } from "./customer-contacts.js";

test("agenda uses Vietnam dates and excludes paused and suppressed contacts", () => {
  const customer = { id: "base", business_name: "Đức Long", next_action: "Hỏi mẫu", next_action_at: "2026-11-24T17:01:00Z" };
  const rows = [
    customer, { ...customer, stage: "lost" }, { ...customer, prospect_suppressed: true },
    { ...customer, id: "later", next_action_at: "2026-11-26" },
    { ...customer, id: "old", next_action_at: "2026-11-24" },
    { ...customer, id: "missing", next_action_at: null },
    { ...customer, id: "blank", next_action: " " },
  ];
  const groups = groupCustomerAgenda(rows, "2026-11-25");
  assert.deepEqual(Object.fromEntries(Object.entries(groups).map(([key, items]) =>
    [key, items.map(({ customer }) => customer.id)])), {
    overdue: ["old"], today: ["base"], upcoming: ["later"], unplanned: ["missing", "blank"],
  });
  assert.equal(searchCustomer(customer, "duc long"), true);
});

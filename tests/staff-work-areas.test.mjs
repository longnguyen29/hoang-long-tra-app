import assert from "node:assert/strict";
import test from "node:test";
import { activeStaffWorkLink, visibleStaffWorkAreas } from "../components/staff/staff-navigation.js";

test("work areas retain existing module and administrator restrictions", () => {
  const employee = visibleStaffWorkAreas(["work"], false, false);
  assert.deepEqual(employee.map(area => area.id), ["operations"]);
  assert.deepEqual(employee[0].links.map(item => item.href), ["/admin/work"]);
  const sales = visibleStaffWorkAreas(["orders", "pipeline", "partnerNetwork"], false, false);
  assert.deepEqual(sales.map(area => area.id), ["sales"]);
  assert.ok(sales[0].links.some(item => item.href === "/admin/orders/private"));
  assert.ok(!sales[0].links.some(item => item.module === "partnerNetwork"));
  assert.ok(!visibleStaffWorkAreas(null, false, false).flatMap(area => area.links).some(item => item.accessAdminOnly));
  assert.ok(visibleStaffWorkAreas(null, true, true).flatMap(area => area.links).some(item => item.accessAdminOnly));
});

test("active work area follows the exact finance or system tab and nested route", () => {
  const areas = visibleStaffWorkAreas(null, true, true);
  const current = (path, query = "") => activeStaffWorkLink(areas, path, new URLSearchParams(query));
  assert.equal(current("/admin/operations", "tab=finance").area, "finance");
  assert.equal(current("/admin/operations", "tab=batches").area, "operations");
  assert.equal(current("/admin/control", "tab=connections").area, "system");
  assert.equal(current("/admin/control", "tab=payment").label, "Thanh toán");
  assert.equal(current("/admin/control").area, "finance");
  assert.equal(current("/admin/orders/private").label, "Trang mua riêng");
});

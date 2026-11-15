import assert from "node:assert/strict";
import test from "node:test";
import { canCallStaffApi, canOpenStaffPage, validWorkspaceSelection, WORKSPACE_PRESETS, workspaceModules } from "../lib/staff-workspace.js";

const admin = { role: "admin", workspace_modules: ["work"] };
const manager = { role: "manager", workspace_modules: null };
const sales = { role: "manager", workspace_modules: WORKSPACE_PRESETS.find(preset => preset.id === "sales").modules };
const employee = { role: "employee", workspace_modules: ["work", "control"] };

test("only admins can open the editor or use its API", () => {
  for (const account of [admin, manager, sales, employee, null]) {
    assert.equal(canOpenStaffPage(account, "/admin/team-access"), account === admin);
    assert.equal(canCallStaffApi(account, "/api/staff/team-access"), account === admin);
  }
});

test("custom profiles cover nested pages and APIs, including direct links", () => {
  assert.equal(canOpenStaffPage(sales, "/admin/orders"), true);
  assert.equal(canOpenStaffPage(sales, "/admin/operations/budget"), false);
  assert.equal(canOpenStaffPage(sales, "/admin/legacy"), false);
  assert.equal(canOpenStaffPage(sales, "/admin"), false);
  assert.equal(canCallStaffApi(sales, "/api/staff/orders/HL-1/costs"), true);
  assert.equal(canCallStaffApi(sales, "/api/staff/integrations/zalo/process"), false);
  assert.equal(canCallStaffApi(sales, "/api/staff/future-tool"), false);
});

test("existing roles keep their defaults, and an employee cannot gain manager screens", () => {
  assert.equal(workspaceModules(manager), null);
  assert.equal(canOpenStaffPage(manager, "/admin/control"), true);
  assert.equal(canOpenStaffPage(admin, "/admin/operations/budget"), true);
  assert.deepEqual(workspaceModules(employee), ["work"]);
  assert.equal(canOpenStaffPage(employee, "/admin/control"), false);
  assert.equal(canOpenStaffPage(employee, "/admin/work"), true);
  assert.equal(canOpenStaffPage(null, "/admin/work"), false);
});

test("presets are valid and editable selections require Work and registered modules", () => {
  for (const preset of WORKSPACE_PRESETS) assert.equal(validWorkspaceSelection(preset.modules), true);
  for (const selection of [undefined, [], ["orders"], ["work", "team-access"], ["work", "work"], ["work", null]]) {
    assert.equal(validWorkspaceSelection(selection), false);
  }
});

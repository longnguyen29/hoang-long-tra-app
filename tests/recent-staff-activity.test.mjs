import assert from "node:assert/strict";
import test from "node:test";
import { recentStaffActivity } from "../lib/recent-staff-activity.js";

const morning = "2026-11-18T01:00:00Z";
const late = "2026-11-18T02:00:00Z";

test("recent activity keeps the latest relevant entry per record", () => {
  const rows = recentStaffActivity({
    orders: [{ id: "o#1", ts: morning, status: "completed" }, { id: "gone", ts: late, deleted_at: late }],
    orderEvents: [{ order_id: "o#1", kind: "stage_change", created_at: late }, { order_id: "o#1", kind: "created", created_at: morning }],
    recipes: [{ id: "r1", name: "Công thức", created_at: morning }],
    recipeVersions: [{ recipe_id: "r1", created_at: late }, { recipe_id: "r1", created_at: morning }],
    privatePages: [{ id: "p1", customer_name: "Quán", created_at: morning, updated_at: late }],
    tasks: [{ id: "t1", title: "Việc", status: "completed", completed_at: late }],
  });
  assert.equal(rows.length, 4);
  assert.equal(rows.find(row => row.type === "Đơn hàng").href, "/admin/orders?order=o%231");
  assert.equal(rows.find(row => row.type === "Đơn hàng").action, "Hoàn tất đơn");
  assert.equal(rows.find(row => row.type === "Công thức").action, "Ghi lần thử");
  assert.equal(rows.find(row => row.type === "Trang mua riêng").href, "/admin/orders/private?page=p1");
  assert.equal(rows.find(row => row.type === "Công việc").href, "/admin/work?task=t1");
});

test("recent activity sorts newest first and skips invalid dates", () => {
  const rows = recentStaffActivity({
    opportunities: [{ id: "c1", business_name: "Quán", created_at: morning }, { id: "bad", business_name: "Invalid", created_at: "invalid" }],
    quotes: [{ id: "q1", opportunity_id: "c1", created_at: morning, updated_at: late }],
  });
  assert.deepEqual(rows.map(row => row.action), ["Cập nhật báo giá", "Thêm hồ sơ"]);
  assert.equal(rows[0].href, "/admin/pipeline?opportunity=c1&quote=q1#customer-quotes");
});

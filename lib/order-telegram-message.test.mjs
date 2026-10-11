import test from "node:test";
import assert from "node:assert/strict";
import { orderTelegramMessage } from "./order-telegram-message.js";

test("new wholesale order includes customer, address, tea and kilograms", () => {
  const message = orderTelegramMessage({
    id: "HL-42", type: "wholesale", customer_name: "Quán Sen", contact: "0901234567",
    address: "12 Phố Huế, Hà Nội", total_kg: 25, estimated_total: 5000000,
    lines: [
      { name: { vi: "Hồng Trà Shan Mật" }, qty: 20, unit: "kg" },
      { name: "Lục Trà Hoa Lài", quantity: 5, unit: "kg" },
    ],
  });
  for (const expected of ["ĐƠN HÀNG MỚI", "Quán Sen", "0901234567", "12 Phố Huế", "Hồng Trà Shan Mật: 20 kg", "Lục Trà Hoa Lài: 5 kg", "Tổng: 25 kg"]) {
    assert.ok(message.includes(expected), expected);
  }
});

test("reorder identifies source and keeps pack quantity", () => {
  const message = orderTelegramMessage({
    id: "HL-43", reorder_of_order_id: "HL-42", type: "wholesale",
    customer_name: "Quán Sen", contact: "0901234567", lines: [
      { name: "Trà gói", qty: 6, unit: "pcs", weight: "500g" },
    ],
  });
  assert.match(message, /ĐƠN ĐẶT LẠI/);
  assert.match(message, /Từ đơn: HL-42/);
  assert.match(message, /Trà gói \(500g\): 6 gói/);
});

test("pressed tea retains its selling units without inventing kilograms", () => {
  const message = orderTelegramMessage({
    id: "HL-44", type: "wholesale", total_kg: 0,
    lines: [
      { name: "Phổ Nhĩ viên", qty: 20, unit: "viên" },
      { name: "Phổ Nhĩ bánh", qty: 3, unit: "bánh", weight: "357g" },
    ],
  });
  assert.match(message, /Phổ Nhĩ viên: 20 viên/);
  assert.match(message, /Phổ Nhĩ bánh \(357g\): 3 bánh/);
  assert.doesNotMatch(message, /kg|\bsp\b/);
});

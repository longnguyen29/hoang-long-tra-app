import test from "node:test";
import assert from "node:assert/strict";
import { menuLabRequestNote, recommendMenuLab } from "./menu-lab.js";

const products = [
  { id: "hong-tra-shan-khoi", available: true, kind: "tea", price: 265000, name: { vi: "Hồng Trà Shan Khói" } },
  { id: "hong-tra-shan-mat", available: true, kind: "tea", price: 245000, name: { vi: "Hồng Trà Shan Mật" } },
  { id: "luc-tra-shan-moc", available: true, kind: "tea", price: 225000, name: { vi: "Lục Trà Shan Mộc" } },
  { id: "luc-tra-ngoc-lan", available: true, kind: "tea", price: 250000, name: { vi: "Lục Trà Hoa Ngọc Lan" } },
  { id: "luc-tra-lai-tieu-chuan", available: true, kind: "tea", price: 450000, name: { vi: "Lục Trà Hoa Lài Tiêu Chuẩn" } },
  { id: "bach-mau-don", available: true, kind: "tea", price: 350000, name: { vi: "Bạch Mẫu Đơn" } },
];

test("recommends a coherent tea and starter for a strong milk drink", () => {
  const result = recommendMenuLab({ useCase: "milk", character: "strong", trial: "refine", cupMl: 500 }, products);
  assert.equal(result.productId, "hong-tra-shan-khoi");
  assert.equal(result.starterId, "shan-khoi-black-sesame");
  assert.equal(result.pack, "100g");
  assert.equal(result.teaCost, 2385);
});

test("scales the starting brew and cost to the selected cup size", () => {
  const result = recommendMenuLab({ useCase: "sparkling", character: "floral", trial: "service", cupMl: 350 }, products);
  assert.equal(result.productId, "luc-tra-ngoc-lan");
  assert.equal(result.teaDoseG, 5.6);
  assert.equal(result.waterMl, 126);
  assert.equal(result.teaCost, 1400);
  assert.equal(result.pack, "250g");
});

test("uses an available alternate tea and never fabricates a missing price", () => {
  const result = recommendMenuLab(
    { useCase: "cold", character: "light", trial: "compare", cupMl: 500 },
    [{ id: "luc-tra-ngoc-lan", available: true, kind: "tea", price: null, name: { vi: "Lục Trà Hoa Ngọc Lan" } }],
  );
  assert.equal(result.productId, "luc-tra-ngoc-lan");
  assert.equal(result.teaCost, null);
  assert.equal(result.pack, "50g");
  assert.equal(result.recipeName, "Ngọc Lan · Vải Cold Brew");
});

test("writes an honest request note with the selected recommendation", () => {
  const note = menuLabRequestNote(recommendMenuLab({ useCase: "fruit", character: "honey", cupMl: 500 }, products));
  assert.match(note, /Hồng Trà Shan Mật/);
  assert.match(note, /cần nếm và hiệu chỉnh/);
  assert.match(note, /ml nước/);
});

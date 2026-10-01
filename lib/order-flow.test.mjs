import assert from "node:assert/strict";
import test from "node:test";
import {
  ORDER_STAGE_IDS,
  orderStageForStatus,
  orderStageIndex,
  orderStagesForType,
  reconcileOrderStage,
  statusForOrderStage,
} from "./order-flow.js";

test("the seven operational stages stay in their controlled order", () => {
  assert.deepEqual(ORDER_STAGE_IDS, [
    "new_order",
    "confirm_details",
    "prepare_materials",
    "production",
    "packing",
    "shipping",
    "completed",
  ]);
});

test("retail skips production stages but keeps an older current stage visible", () => {
  assert.deepEqual(orderStagesForType('retail','confirm_details').map(stage=>stage.id),[
    'new_order','confirm_details','packing','shipping','completed',
  ]);
  assert.deepEqual(orderStagesForType('retail','production').map(stage=>stage.id),[
    'new_order','confirm_details','production','packing','shipping','completed',
  ]);
  assert.deepEqual(orderStagesForType('wholesale','confirm_details').map(stage=>stage.id),ORDER_STAGE_IDS);
});

test("operational stages always synchronize the customer-facing status", () => {
  assert.equal(statusForOrderStage("new_order"), "pending");
  assert.equal(statusForOrderStage("confirm_details"), "confirmed");
  assert.equal(statusForOrderStage("production"), "confirmed");
  assert.equal(statusForOrderStage("packing"), "confirmed");
  assert.equal(statusForOrderStage("shipping"), "shipped");
  assert.equal(statusForOrderStage("completed"), "completed");
});

test("legacy status rows receive a safe operational stage", () => {
  assert.equal(orderStageForStatus("pending"), "new_order");
  assert.equal(orderStageForStatus("confirmed"), "confirm_details");
  assert.equal(orderStageForStatus("shipped"), "shipping");
  assert.equal(orderStageForStatus("completed"), "completed");
  assert.equal(orderStageIndex("unknown"), 0);
});

test("historical split-state orders keep their furthest confirmed progress", () => {
  assert.equal(reconcileOrderStage("new_order", "shipped"), "shipping");
  assert.equal(reconcileOrderStage("production", "confirmed"), "production");
  assert.equal(reconcileOrderStage("completed", "pending"), "completed");
});

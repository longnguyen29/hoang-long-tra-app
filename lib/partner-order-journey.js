import { ORDER_STAGES, orderStageMeta, reconcileOrderStage } from "./order-flow.js";
import { latestOrderUpdate, orderQuantitySummary, publicDeliveryState, publicOrderLines } from "./public-order-journey.js";

const HEALTH = { on_track: "Đúng tiến độ", waiting: "Đang chờ", blocked: "Có vướng mắc" };
const SAMPLE_STATUS = { new: "Đang chuẩn bị mẫu", sent: "Đã gửi mẫu", converted: "Đã chuyển thành khách mua", declined: "Đã dừng yêu cầu mẫu" };
const QUOTE_STATUS = { draft: "Đang soạn báo giá", sent: "Đã gửi báo giá", accepted: "Khách đã đồng ý báo giá", declined: "Khách chưa đồng ý", expired: "Báo giá đã hết hạn", converted: "Đã tạo đơn từ báo giá" };
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const UPDATE_KEYS = new Set(["forecast_amount", "forecast_note", "expected_payment_on", "public_note", "next_action", "reason"]);
const HIDDEN = /[\u0000-\u001f\u007f-\u009f\u061c\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufeff]/gu;

export const partnerSampleStatusLabel = value => SAMPLE_STATUS[value] || "Đang xử lý mẫu";
export const partnerQuoteStatusLabel = value => QUOTE_STATUS[value] || "Đang xử lý báo giá";

export function partnerDateLabel(value, withTime = false) {
  if (!value) return "Chưa xác định";
  const date = new Date(DATE_ONLY.test(String(value)) ? `${value}T00:00:00+07:00` : value);
  return Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short", ...(withTime ? { timeStyle: "short" } : {}), timeZone: "Asia/Ho_Chi_Minh",
  }).format(date) : "Chưa xác định";
}

// These are separate facts: a workflow closeout, a carrier delivery and cash
// collection must not be collapsed into one "successful" state.
export function partnerOrderJourney(order = {}) {
  const stage = reconcileOrderStage(order.stage, order.status);
  const delivery = publicDeliveryState(order, stage);
  const lines = publicOrderLines(order.lines).map(line => ({ ...line, qty: Number.isFinite(line.qty) && line.qty > 0 ? line.qty : null }));
  return {
    stage, stageLabel: orderStageMeta(stage).label,
    steps: ORDER_STAGES.map(item => ({ id: item.id, label: item.shortLabel, state: item.id === stage ? "current" : ORDER_STAGES.findIndex(row => row.id === item.id) < ORDER_STAGES.findIndex(row => row.id === stage) ? "past" : "future" })),
    delivery, health: HEALTH[order.health] || "Chưa cập nhật tiến độ",
    lines, quantity: orderQuantitySummary(lines.filter(line => line.qty !== null && line.qty > 0)),
    lastUpdated: latestOrderUpdate(order, order.updated_at),
    deliveryDueAt: order.delivery_due_at || null,
    expectedPaymentOn: order.expected_payment_on || null,
    collectionComplete: order.collection_complete === true,
    nextAction: typeof order.next_action === "string" && order.next_action.trim() ? order.next_action.trim() : "Hoàng Long chưa cập nhật bước tiếp theo cho đối tác.",
  };
}

function knownMoney(value) {
  if (value === null || value === undefined || value === "") return null;
  return Number.isFinite(Number(value)) && Number(value) >= 0 ? Number(value) : null;
}

export function partnerOrderCommission(order = {}, commission) {
  const currentAmount = commission && Object.hasOwn(commission, "eligible_amount") ? commission.eligible_amount
    : commission && Object.hasOwn(commission, "current_eligible") ? commission.current_eligible : commission?.current_amount;
  const provisional = !commission ? null : commission.stale ? null : commission.status === "void" ? 0
    : knownMoney(currentAmount);
  return {
    forecast: knownMoney(order.forecast_amount),
    provisional,
    approved: commission?.stale ? null : knownMoney(commission?.approved_amount),
    paid: knownMoney(commission?.paid_amount),
    paidAt: commission?.paid_at || null,
    stale: commission?.stale === true,
    status: commission?.status || null,
  };
}

// Client validation improves the editor experience. The manager RPC remains
// responsible for authorization, order ownership, limits and durable history.
export function normalizePartnerOrderUpdate(input) {
  if (!input || typeof input !== "object" || Array.isArray(input) || Object.keys(input).some(key => !UPDATE_KEYS.has(key))) throw new Error("invalid_partner_order_update");
  const result = {};
  const rawAmount = input.forecast_amount;
  result.forecast_amount = rawAmount === undefined || rawAmount === null || rawAmount === "" ? null : Number(rawAmount);
  if (result.forecast_amount !== null && (!['number', 'string'].includes(typeof rawAmount) || !/^\d+$/.test(String(rawAmount)) || !Number.isSafeInteger(result.forecast_amount) || result.forecast_amount < 0 || result.forecast_amount > 999999999999)) throw new Error("invalid_partner_forecast");
  for (const [key, max] of [["forecast_note", 1000], ["public_note", 500], ["next_action", 160], ["reason", 1000]]) {
    const raw = input[key] ?? "";
    if (typeof raw !== "string" || raw.length > max) throw new Error("invalid_partner_order_update");
    result[key] = raw.normalize("NFC").replace(HIDDEN, " ").trim();
  }
  if (!result.reason) throw new Error("partner_order_update_reason_required");
  if (result.forecast_amount !== null && !result.forecast_note) throw new Error("partner_forecast_note_required");
  const rawDate = input.expected_payment_on;
  result.expected_payment_on = rawDate === undefined || rawDate === null || rawDate === "" ? null : rawDate;
  if (result.expected_payment_on !== null && (typeof rawDate !== "string" || !DATE_ONLY.test(rawDate) || rawDate < "1900-01-01" || rawDate > "2100-12-31" || !Number.isFinite(new Date(`${rawDate}T00:00:00Z`).getTime()) || new Date(`${rawDate}T00:00:00Z`).toISOString().slice(0, 10) !== rawDate)) throw new Error("invalid_partner_payment_date");
  return result;
}

import { ORDER_COST_CATEGORY_IDS, ORDER_COST_STATUS_IDS } from "@/lib/order-costs";
import { logOrderEvent } from "@/lib/ops-events";
import { authenticateStaffRequest } from "@/lib/staff-api-auth";

function validNumber(value, { positive = false } = {}) {
  return Number.isFinite(value) && (positive ? value > 0 : value >= 0);
}

export async function POST(request, { params }) {
  const staff = await authenticateStaffRequest(request);
  if (!staff) return Response.json({ ok: false }, { status: 401 });

  const { id: orderId } = await params;
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "invalid_body" }, { status: 400 });
  }

  const category = String(body?.category || "");
  const description = String(body?.description || "").trim();
  const quantity = Number(body?.quantity);
  const unitCost = Number(body?.unitCost);
  const paymentStatus = String(body?.paymentStatus || "planned");
  const incurredOn = String(body?.incurredOn || "");
  const note = String(body?.note || "").trim();
  const recordExpense = Boolean(body?.recordExpense);

  if (
    !ORDER_COST_CATEGORY_IDS.includes(category)
    || !description || description.length > 200
    || !validNumber(quantity, { positive: true })
    || !validNumber(unitCost)
    || !ORDER_COST_STATUS_IDS.includes(paymentStatus)
    || !/^\d{4}-\d{2}-\d{2}$/.test(incurredOn)
  ) {
    return Response.json({ ok: false, error: "invalid_cost" }, { status: 400 });
  }

  const { data: order } = await staff.admin
    .from("orders")
    .select("id")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) return Response.json({ ok: false }, { status: 404 });

  const amount = quantity * unitCost;
  let expenseId = null;
  if (recordExpense) {
    const { data: expense, error: expenseError } = await staff.admin
      .from("expense_inbox")
      .insert({
        description: `${description} · đơn ${orderId}`,
        amount,
        incurred_on: incurredOn,
        payment_status: paymentStatus,
        note,
        created_by: staff.user.id,
      })
      .select("id")
      .single();
    if (expenseError) return Response.json({ ok: false, error: "expense_insert_failed" }, { status: 500 });
    expenseId = expense.id;
  }

  const { data: cost, error } = await staff.admin
    .from("order_costs")
    .insert({
      order_id: orderId,
      category,
      description,
      quantity,
      unit_cost: unitCost,
      payment_status: paymentStatus,
      incurred_on: incurredOn,
      note,
      expense_id: expenseId,
      created_by: staff.user.id,
    })
    .select()
    .single();

  if (error) {
    if (expenseId) await staff.admin.from("expense_inbox").delete().eq("id", expenseId);
    return Response.json({ ok: false, error: "cost_insert_failed" }, { status: 500 });
  }

  await logOrderEvent(staff.admin, {
    orderId,
    kind: "cost_added",
    message: `Thêm chi phí: ${description} · ${new Intl.NumberFormat("vi-VN").format(amount)} ₫${recordExpense ? " · đã đưa vào Hộp chi phí" : ""}.`,
    actor: staff.user.email,
  });

  return Response.json({ ok: true, cost });
}

export async function DELETE(request, { params }) {
  const staff = await authenticateStaffRequest(request);
  if (!staff) return Response.json({ ok: false }, { status: 401 });

  const { id: orderId } = await params;
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "invalid_body" }, { status: 400 });
  }

  const costId = String(body?.costId || "");
  const { data: cost } = await staff.admin
    .from("order_costs")
    .select("id, description, expense_id")
    .eq("id", costId)
    .eq("order_id", orderId)
    .maybeSingle();
  if (!cost) return Response.json({ ok: false }, { status: 404 });

  if (cost.expense_id) {
    const { data: expense } = await staff.admin
      .from("expense_inbox")
      .select("status")
      .eq("id", cost.expense_id)
      .maybeSingle();
    if (expense?.status === "classified") {
      return Response.json({ ok: false, error: "classified_expense" }, { status: 409 });
    }
  }

  const { error } = await staff.admin.from("order_costs").delete().eq("id", cost.id);
  if (error) return Response.json({ ok: false }, { status: 500 });
  if (cost.expense_id) await staff.admin.from("expense_inbox").delete().eq("id", cost.expense_id);

  await logOrderEvent(staff.admin, {
    orderId,
    kind: "cost_removed",
    message: `Đã xóa chi phí: ${cost.description}.`,
    actor: staff.user.email,
  });
  return Response.json({ ok: true });
}

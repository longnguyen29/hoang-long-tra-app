import { applyCarrierUpdate } from "@/lib/carrier-updates";
import { parseCarrierDate } from "@/lib/carrier-tracking";
import { secretsMatch } from "@/lib/carrier-security";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(request) {
  const secret = process.env.VIETTEL_POST_WEBHOOK_SECRET;
  if (!secret) return Response.json({ ok: false, error: "webhook_not_configured" }, { status: 503 });

  let payload;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ ok: false, error: "invalid_body" }, { status: 400 });
  }

  if (!secretsMatch(payload?.TOKEN, secret)) {
    return Response.json({ ok: false, error: "invalid_token" }, { status: 401 });
  }

  const data = payload?.DATA;
  if (!data?.ORDER_NUMBER || data.ORDER_STATUS === undefined) {
    return Response.json({ ok: false, error: "invalid_update" }, { status: 400 });
  }

  try {
    const statusAt = parseCarrierDate(data.ORDER_STATUSDATE);
    const result = await applyCarrierUpdate(createAdminClient(), {
      carrier: "viettel_post",
      trackingCode: data.ORDER_NUMBER,
      statusCode: data.ORDER_STATUS,
      statusName: data.STATUS_NAME,
      statusAt,
      eventFallback: data.NOTE || payload?.sendDate,
    });
    return Response.json({ ok: true, ...result });
  } catch (error) {
    console.error("Viettel Post webhook update failed", error);
    return Response.json({ ok: false }, { status: 500 });
  }
}

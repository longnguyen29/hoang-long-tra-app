import { applyCarrierUpdate } from "@/lib/carrier-updates";
import { defaultCarrierStatusName, parseCarrierDate } from "@/lib/carrier-tracking";
import { verifyVietnamPostSignature } from "@/lib/carrier-security";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(request) {
  let payload;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ ok: false, error: "invalid_body" }, { status: 400 });
  }

  const publicKey = process.env.VIETNAM_POST_WEBHOOK_PUBLIC_KEY || undefined;
  if (!verifyVietnamPostSignature(payload, publicKey)) {
    return Response.json({ ok: false, error: "invalid_signature" }, { status: 401 });
  }

  const admin = createAdminClient();
  const results = [];
  try {
    for (const item of payload.data) {
      if (!item?.itemCode || item.status === undefined) continue;
      const statusAt = parseCarrierDate(item.statusTime || item.updatedDate || payload.sendDate);
      results.push(await applyCarrierUpdate(admin, {
        carrier: "vietnam_post",
        trackingCode: item.itemCode,
        statusCode: item.status,
        statusName: item.statusName || item.note || defaultCarrierStatusName("vietnam_post", item.status),
        statusAt,
        eventFallback: payload.sendDate,
      }));
    }
    return Response.json({ ok: true, received: results.length, matched: results.filter((item) => item.matched).length });
  } catch (error) {
    console.error("Vietnam Post webhook update failed", error);
    return Response.json({ ok: false }, { status: 500 });
  }
}

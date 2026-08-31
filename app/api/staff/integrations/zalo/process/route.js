import { authenticateManagerRequest } from "@/lib/staff-api-auth";
import { retryZaloDeliveryNotifications } from "@/lib/zalo-delivery-notifications";

export async function POST(request) {
  const staff = await authenticateManagerRequest(request);
  if (!staff) return Response.json({ ok: false }, { status: 401 });

  try {
    const results = await retryZaloDeliveryNotifications(staff.admin);
    return Response.json({
      ok: true,
      processed: results.length,
      sent: results.filter((item) => item.status === "sent").length,
      results,
    });
  } catch (error) {
    console.error("Could not process Zalo delivery notifications", error);
    return Response.json({ ok: false }, { status: 500 });
  }
}

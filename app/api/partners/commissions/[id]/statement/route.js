import { partnerNetworkEnabled } from "@/lib/partner-network-server";
import { handleCommissionCostStatement } from "@/lib/commission-cost-statement-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
async function handle(request, { params }) {
  if (!partnerNetworkEnabled()) return Response.json({ ok: false, error: "not_found" }, { status: 404, headers: { "Cache-Control": "no-store" } });
  const { id } = await params;
  return handleCommissionCostStatement(request, id);
}
export const GET = handle;
export const POST = handle;

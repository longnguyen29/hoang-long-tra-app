import { buildExportPriceSnapshot } from "@/lib/export-exchange";

export const runtime = "nodejs";

// Fixed endpoint/currencies/products: this is not an arbitrary currency feed or
// URL proxy. Server cache limits provider requests while each response checks
// the feed's actual age before offering foreign currency estimates.
export async function GET() {
  try {
    const response = await fetch("https://open.er-api.com/v6/latest/VND", {
      headers: { Accept: "application/json" },
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(6000),
    });
    if (!response.ok) throw new Error("rates_unavailable");
    const snapshot = buildExportPriceSnapshot(await response.json());
    return Response.json(snapshot, {
      headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
    });
  } catch {
    return Response.json({ error: "rates_unavailable" }, {
      status: 503,
      headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "Retry-After": "3600" },
    });
  }
}

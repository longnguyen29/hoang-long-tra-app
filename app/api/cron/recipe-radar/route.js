import { createAdminClient } from "@/lib/supabase/admin";
import { runRecipeRadar } from "@/lib/recipe-radar-server";

export const maxDuration = 60;

export async function GET(request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return Response.json({ ok: false, error: "cron_not_configured" }, { status: 503 });
  if (request.headers.get("authorization") !== `Bearer ${secret}`) return Response.json({ ok: false }, { status: 401 });
  try {
    const result = await runRecipeRadar(createAdminClient(), { mode: "scheduled", triggeredBy: "vercel-cron" });
    return Response.json({ ok: true, ...result });
  } catch (error) {
    console.error("Scheduled Recipe Radar run failed", { error: error.message });
    return Response.json({ ok: false, error: "scan_failed" }, { status: 500 });
  }
}

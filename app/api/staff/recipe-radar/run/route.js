import { authenticateManagerRequest } from "@/lib/staff-api-auth";
import { createHouseStarterRecipes, promoteRadarConceptWithFormula } from "@/lib/house-recipes-server";
import { runRecipeRadar, saveManualRadarSignal } from "@/lib/recipe-radar-server";

export const maxDuration = 60;

export async function POST(request) {
  const staff = await authenticateManagerRequest(request);
  if (!staff) return Response.json({ ok: false, error: "not_authenticated" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  try {
    if (body.action === "save-signal") {
      const result = await saveManualRadarSignal(staff.admin, body.signal || {}, { triggeredBy: staff.user.email || staff.user.id });
      return Response.json({ ok: true, ...result });
    }
    if (body.action === "seed-house-recipes") {
      const result = await createHouseStarterRecipes(staff.admin, { triggeredBy: staff.user.email || staff.user.id });
      return Response.json({ ok: true, ...result });
    }
    if (body.action === "promote-concept") {
      const result = await promoteRadarConceptWithFormula(staff.admin, body.conceptId, { triggeredBy: staff.user.email || staff.user.id });
      return Response.json({ ok: true, ...result });
    }
    const result = await runRecipeRadar(staff.admin, { mode: "manual", triggeredBy: staff.user.email || staff.user.id });
    return Response.json({ ok: true, ...result });
  } catch (error) {
    console.error("Recipe Radar run failed", { error: error.message });
    const status = error.message === "invalid_signal" ? 400 : 500;
    return Response.json({ ok: false, error: error.message === "invalid_signal" ? "invalid_signal" : "scan_failed" }, { status });
  }
}

import { authenticateManagerRequest } from "@/lib/staff-api-auth";
import { validateGrowthValues } from "@/lib/business-growth-plan";
import { currentBusinessCycle, validateBusinessCycle, vnToday } from "@/lib/business-cycle";

const planColumns = "targets,assumptions,focus,cycle,version,updated_at";

function periodFor(value) {
  return typeof value === "string" && /^20\d{2}-(0[1-9]|1[0-2])$/.test(value) ? `${value}-01` : null;
}

export async function GET(request) {
  const staff = await authenticateManagerRequest(request);
  if (!staff) return Response.json({ error: "unauthorized" }, { status: 401 });
  const params = new URL(request.url).searchParams;
  if (params.get("view") === "cycle") {
    const today=vnToday();
    const result=await staff.admin.from("business_growth_plans").select("period,focus,cycle")
      .lte("period",`${today.slice(0,7)}-01`).not("cycle","is",null)
      .order("period",{ascending:false}).limit(2);
    if (result.error) return Response.json({error:"business_plan_unavailable"},{status:500});
    return Response.json({active:currentBusinessCycle(result.data??[],today),today},{headers:{"Cache-Control":"no-store"}});
  }
  const period = periodFor(params.get("month"));
  if (!period) return Response.json({ error: "invalid_month" }, { status: 400 });
  const [snapshot, plan] = await Promise.all([
    staff.admin.rpc("business_growth_snapshot", { p_period: period }),
    staff.admin.from("business_growth_plans").select(planColumns).eq("period", period).maybeSingle(),
  ]);
  if (snapshot.error || plan.error) return Response.json({ error: "business_plan_unavailable" }, { status: 500 });
  return Response.json({ months: snapshot.data, plan: plan.data }, { headers: { "Cache-Control": "no-store" } });
}

export async function PUT(request) {
  const staff = await authenticateManagerRequest(request);
  if (!staff) return Response.json({ error: "unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null);
  const period = periodFor(body?.month);
  const targets = validateGrowthValues(body?.targets, "targets");
  const assumptions = validateGrowthValues(body?.assumptions, "assumptions");
  const focus = typeof body?.focus === "string" ? body.focus.trim() : null;
  const version = body?.version;
  if (!period || !targets || !assumptions || focus === null || focus.length > 600
    || (version !== null && (!Number.isInteger(version) || version < 1 || version >= 2147483647))) {
    return Response.json({ error: "invalid_plan" }, { status: 400 });
  }
  const cycle=Object.hasOwn(body,"cycle")?validateBusinessCycle(body.cycle,period):null;
  if (Object.hasOwn(body,"cycle") && cycle===undefined) return Response.json({error:"invalid_cycle"},{status:400});
  const payload = { targets, assumptions, focus, ...(Object.hasOwn(body,"cycle")?{cycle}:{}), updated_by: staff.user.id, updated_at: new Date().toISOString() };
  const plans = staff.admin.from("business_growth_plans");
  const mutation = version === null ? plans.insert({ ...payload, period })
    : plans.update({ ...payload, version: version + 1 }).eq("period", period).eq("version", version);
  const result = await mutation.select(planColumns).maybeSingle();
  if (result.error?.code === "23505" || (!result.error && !result.data)) {
    return Response.json({ error: "plan_changed" }, { status: 409 });
  }
  if (result.error) return Response.json({ error: "save_failed" }, { status: 500 });
  return Response.json({ plan: result.data });
}

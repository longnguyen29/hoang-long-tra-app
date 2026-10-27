import { NextResponse } from "next/server";
import { authenticateManagerRequest } from "@/lib/staff-api-auth";
import { readMetaInsights } from "@/lib/meta-insights";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };

export async function GET(request) {
  const staff = await authenticateManagerRequest(request);
  if (!staff) return NextResponse.json({ status: "unauthorized" }, { status: 401, headers });
  try {
    const result = await readMetaInsights({ token: process.env.META_ADS_ACCESS_TOKEN, appSecret: process.env.META_APP_SECRET || "" });
    return NextResponse.json(result, { headers });
  } catch {
    // Meta errors may contain private account or token details; never return them.
    return NextResponse.json({ status: "unavailable" }, { status: 502, headers });
  }
}

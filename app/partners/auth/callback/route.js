import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { partnerNetworkEnabled, partnerAuthDestination } from "@/lib/partner-network-server";

export async function GET(request) {
  if (!partnerNetworkEnabled()) return new Response(null, { status: 404 });
  const url = new URL(request.url);
  const destination = new URL(partnerAuthDestination(url.searchParams.get("next")), url.origin);
  const code = url.searchParams.get("code");
  if (code && code.length <= 512) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(destination, { headers: { "Cache-Control": "no-store" } });
  }
  destination.searchParams.set("auth_error", "1");
  return NextResponse.redirect(destination, { headers: { "Cache-Control": "no-store" } });
}

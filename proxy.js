import { NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// ops.hoanglongtra.com routes to the internal ops console (public/ops/index.html) — a
// self-contained static file, not a real authenticated route yet, so it's handled here
// before Supabase's session refresh and short-circuits past it entirely.
export default async function proxy(request) {
  const host = request.headers.get("host") || "";
  if (host.startsWith("ops.") && request.nextUrl.pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/ops/index.html";
    return NextResponse.rewrite(url);
  }
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/",
  ],
};

import { NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { OPS_AUTH_COOKIE, isOpsAuthedToken } from "@/lib/ops-auth";

// ops.hoanglongtra.com routes to the internal ops console (public/ops/index.html) — a
// self-contained static file, not a real authenticated route yet, so it's handled here
// before Supabase's session refresh and short-circuits past it entirely.
//
// Gated by a single shared PIN (OPS_PIN) rather than real accounts, same tier as the console
// itself — see public/ops/login.html and app/api/ops-auth/route.js. No OPS_PIN configured
// means no cookie can ever match, so the console fails closed rather than open.
export default async function proxy(request) {
  const host = request.headers.get("host") || "";
  const pathname = request.nextUrl.pathname;
  const isOpsHost = host.startsWith("ops.") && pathname === "/";
  const isOpsPath = pathname === "/ops" || pathname === "/ops/";

  if (isOpsHost || isOpsPath) {
    const cookie = request.cookies.get(OPS_AUTH_COOKIE)?.value;
    if (!(await isOpsAuthedToken(cookie))) {
      if (isOpsHost) {
        const url = request.nextUrl.clone();
        url.pathname = "/ops/login.html";
        return NextResponse.rewrite(url);
      }
      const url = request.nextUrl.clone();
      url.pathname = "/ops/login.html";
      return NextResponse.redirect(url);
    }
    if (isOpsHost) {
      const url = request.nextUrl.clone();
      url.pathname = "/ops/index.html";
      return NextResponse.rewrite(url);
    }
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/",
    "/ops",
    "/ops/",
  ],
};

import { createServerClient } from "@supabase/ssr";
import { canOpenStaffPage } from "@/lib/staff-workspace";
import { NextResponse } from "next/server";

export async function updateSession(request) {
  const path = request.nextUrl.pathname;
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAdminRoute = path === "/admin" || path.startsWith("/admin/");
  if (!isAdminRoute) return supabaseResponse;

  function redirect(pathname) {
    const url = request.nextUrl.clone();
    url.pathname = pathname;
    url.search = "";
    const response = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach(cookie => response.cookies.set(cookie));
    return response;
  }

  if (path === "/admin/login") return user ? redirect("/admin") : supabaseResponse;
  if (!user) return redirect("/admin/login");
  if (path === "/admin/workspace-unavailable") return supabaseResponse;

  const { data: staff, error } = await supabase
    .from("staff_roles").select().eq("user_id", user.id).maybeSingle();
  if (error) return redirect("/admin/workspace-unavailable");
  if (!canOpenStaffPage(staff, path)) {
    return redirect(staff && staff.role !== "admin" ? "/admin/work" : "/admin");
  }

  return supabaseResponse;
}

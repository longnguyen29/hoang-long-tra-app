import { NextResponse } from "next/server";
import { authenticateStaffRequest } from "@/lib/staff-api-auth";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request) {
  const auth = await authenticateStaffRequest(request);
  if (!auth) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  if (!['admin', 'manager'].includes(auth.role)) {
    return NextResponse.json({ error: "not_authorised" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const displayName = String(body.displayName || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const phone = String(body.phone || "").trim();
  if (!displayName || displayName.length > 120 || !emailPattern.test(email)) {
    return NextResponse.json({ error: "invalid_worker" }, { status: 400 });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
  const { data, error: inviteError } = await auth.admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${siteUrl.replace(/\/$/, "")}/admin/work`,
    data: { full_name: displayName },
  });
  if (inviteError || !data.user) {
    return NextResponse.json(
      { error: "invite_failed", detail: inviteError?.message || "Không tạo được tài khoản." },
      { status: 409 },
    );
  }

  const [{ error: roleError }, { error: profileError }] = await Promise.all([
    auth.admin.from("staff_roles").upsert({ user_id: data.user.id, role: "employee" }),
    auth.admin.from("staff_profiles").upsert({
      user_id: data.user.id,
      display_name: displayName,
      phone,
      active: true,
      updated_at: new Date().toISOString(),
    }),
  ]);
  if (roleError || profileError) {
    return NextResponse.json({ error: "profile_failed" }, { status: 500 });
  }

  return NextResponse.json({
    worker: { user_id: data.user.id, display_name: displayName, phone, email },
    message: "Đã gửi email mời nhân viên.",
  });
}

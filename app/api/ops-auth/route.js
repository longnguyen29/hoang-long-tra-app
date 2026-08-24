import { OPS_AUTH_COOKIE, opsAuthToken } from "@/lib/ops-auth";

// Login endpoint for the ops console PIN gate (public/ops/login.html posts here).
export async function POST(request) {
  const opsPin = process.env.OPS_PIN;
  if (!opsPin) {
    return Response.json({ ok: false, error: "not_configured" }, { status: 503 });
  }

  let pin;
  try {
    ({ pin } = await request.json());
  } catch {
    return Response.json({ ok: false }, { status: 400 });
  }

  if (pin !== opsPin) {
    return Response.json({ ok: false }, { status: 401 });
  }

  const response = Response.json({ ok: true });
  response.headers.append(
    "Set-Cookie",
    `${OPS_AUTH_COOKIE}=${await opsAuthToken(opsPin)}; Path=/; Max-Age=${60 * 60 * 24 * 30}; HttpOnly; Secure; SameSite=Lax`
  );
  return response;
}

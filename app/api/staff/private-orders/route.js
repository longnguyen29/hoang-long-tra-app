import { authenticateManagerRequest } from "@/lib/staff-api-auth";
import { PRIVATE_PAGE_FIELDS, privatePageInput, validPrivateId } from "@/lib/private-order";

const reply = (data, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "no-store" } });

export async function GET(request) {
  const staff = await authenticateManagerRequest(request);
  if (!staff) return reply({ error: "forbidden" }, 403);
  const { data, error } = await staff.admin.from("private_order_pages").select(PRIVATE_PAGE_FIELDS).order("created_at", { ascending: false });
  return error ? reply({ error: "read_failed" }, 500) : reply({ pages: data });
}

export async function POST(request) {
  const staff = await authenticateManagerRequest(request);
  if (!staff) return reply({ error: "forbidden" }, 403);
  const body = await request.json().catch(() => null);
  const page = privatePageInput(body);
  if (!page || (body.id && (!validPrivateId(body.id) || !Number.isSafeInteger(body.revision)))) {
    return reply({ error: "invalid_page" }, 400);
  }
  const table = staff.admin.from("private_order_pages");
  const query = body.id
    ? table.update({ ...page, revision: body.revision + 1 }).eq("id", body.id).eq("revision", body.revision)
    : table.insert(page);
  const { data, error } = await query.select(PRIVATE_PAGE_FIELDS).maybeSingle();
  if (error) return reply({ error: "save_failed" }, 500);
  return data ? reply({ page: data }) : reply({ error: "page_changed" }, 409);
}

import { authenticateManagerRequest } from "@/lib/staff-api-auth";
import { fromCatalogRow, fromVariantRow } from "@/lib/mappers";
import { PRIVATE_PAGE_FIELDS, privatePageInput, validPrivateId } from "@/lib/private-order";
import { tradeProductOptions } from "@/lib/trade-line-units";

const reply = (data, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "no-store" } });

async function catalogOptions(admin) {
  const [products, variants] = await Promise.all([
    admin.from("catalog_products").select("id,name,line,kind,pack_size,available").eq("available", true).order("id"),
    admin.from("catalog_variants").select("product_id,weight").order("weight"),
  ]);
  if (products.error || variants.error) throw new Error("catalog_failed");
  const grouped = Map.groupBy(variants.data, row => row.product_id);
  return tradeProductOptions(products.data.map(row => ({
    ...fromCatalogRow(row),
    variants: (grouped.get(row.id) || []).map(fromVariantRow),
  }))).flatMap(({ key, productId, name, weight, unit }) => {
    const label = typeof name === "string" ? name : name?.vi || name?.en;
    return label ? [{ key, productId, name: label, weight: weight || "", unit }] : [];
  }).sort((a, b) => a.name.localeCompare(b.name, "vi") || a.weight.localeCompare(b.weight, "vi"));
}

export async function GET(request) {
  const staff = await authenticateManagerRequest(request);
  if (!staff) return reply({ error: "forbidden" }, 403);
  if (new URL(request.url).searchParams.get("activity") === "recent") {
    const [pages, events] = await Promise.all([
      staff.admin.from("private_order_pages").select("id,customer_name,created_at,updated_at")
        .order("updated_at", { ascending: false }).order("created_at", { ascending: false }).limit(24),
      staff.admin.from("order_events").select("order_id,kind,created_at")
        .in("kind", ["stage_change", "health_change", "price_change", "tracking_change", "type_change"])
        .order("created_at", { ascending: false }).limit(72),
    ]);
    return reply({ pages: pages.data || [], orderEvents: events.data || [], incomplete: Boolean(pages.error || events.error) });
  }
  const [pages, profiles, accounts, catalog] = await Promise.all([
    staff.admin.from("private_order_pages").select(PRIVATE_PAGE_FIELDS).order("created_at", { ascending: false }),
    staff.admin.from("trade_opportunities").select("id,business_name,contact,preferred_contact,delivery_address").order("business_name"),
    staff.admin.from("wholesale_accounts").select("opportunity_id,delivery_address").not("opportunity_id", "is", null),
    catalogOptions(staff.admin).catch(() => null),
  ]);
  if (pages.error || profiles.error || accounts.error || !catalog) return reply({ error: "read_failed" }, 500);
  const byProfile = Map.groupBy(accounts.data, row => row.opportunity_id);
  const customers = profiles.data.map(profile => {
    const addresses = new Set((byProfile.get(profile.id) || []).map(row => row.delivery_address?.trim()).filter(Boolean));
    return {
      id: profile.id, name: profile.business_name,
      contact: profile.preferred_contact?.trim() || profile.contact || "",
      address: profile.delivery_address || (addresses.size === 1 ? [...addresses][0] : ""),
    };
  });
  return reply({ pages: pages.data, customers, catalog });
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
  if (page.items.some(item => item.productKey)) {
    const options = await catalogOptions(staff.admin).catch(() => null);
    if (!options) return reply({ error: "catalog_failed" }, 500);
    const byKey = new Map(options.map(option => [option.key, option]));
    const existing = body.id ? await table.select("items").eq("id", body.id).maybeSingle() : { data: null };
    if (existing.error) return reply({ error: "read_failed" }, 500);
    for (const item of page.items) {
      if (!item.productKey) continue;
      const option = byKey.get(item.productKey);
      if (!option) {
        const previous = existing.data?.items.find(row => row.id === item.id && row.productKey === item.productKey);
        if (page.active || !previous) return reply({ error: "product_unavailable" }, 409);
        Object.assign(item, { name: previous.name, productId: previous.productId, variantWeight: previous.variantWeight });
        continue;
      }
      Object.assign(item, { name: option.name, productId: option.productId, variantWeight: option.weight });
    }
  }
  const query = body.id
    ? table.update({ ...page, revision: body.revision + 1, updated_at: new Date().toISOString() }).eq("id", body.id).eq("revision", body.revision)
    : table.insert(page);
  const { data, error } = await query.select(PRIVATE_PAGE_FIELDS).maybeSingle();
  if (error) return reply({ error: error.code === "23503" ? "profile_unavailable" : "save_failed" }, error.code === "23503" ? 409 : 500);
  return data ? reply({ page: data }) : reply({ error: "page_changed" }, 409);
}

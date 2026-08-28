import { orderStageForStatus, reconcileOrderStage } from "@/lib/order-flow";

// Supabase rows use snake_case columns; the ported UI (kept close to the original
// prototype) expects camelCase fields. These helpers convert both directions.

export function fromOrderRow(r) {
  return {
    id: r.id,
    ts: r.ts,
    type: r.type,
    customerName: r.customer_name,
    contact: r.contact,
    address: r.address,
    taxNumber: r.tax_number,
    vat: r.vat,
    promo: r.promo,
    note: r.note,
    lines: r.lines,
    totalKg: r.total_kg,
    totalItems: r.total_items,
    estimatedTotal: r.estimated_total,
    tier: r.tier,
    paymentMethod: r.payment_method,
    status: r.status,
    stage: reconcileOrderStage(r.stage, r.status),
    health: r.health || "on_track",
    waitingOn: r.waiting_on || null,
    healthNote: r.health_note || "",
    healthChangedAt: r.health_changed_at || null,
    trackingCode: r.tracking_code,
    shippingCarrier: r.shipping_carrier || null,
    carrierStatusCode: r.carrier_status_code || "",
    carrierStatusName: r.carrier_status_name || "",
    carrierStatusAt: r.carrier_status_at || null,
    deliveredAt: r.delivered_at || null,
    parcelPhoto: r.parcel_photo || "",
    unread: r.unread,
  };
}

export function toOrderRow(o) {
  return {
    id: o.id,
    ts: o.ts,
    type: o.type,
    customer_name: o.customerName,
    contact: o.contact,
    address: o.address,
    tax_number: o.taxNumber,
    vat: o.vat,
    promo: o.promo,
    note: o.note,
    lines: o.lines,
    total_kg: o.totalKg,
    total_items: o.totalItems,
    estimated_total: o.estimatedTotal,
    tier: o.tier,
    payment_method: o.paymentMethod,
    status: o.status,
    stage: o.stage || orderStageForStatus(o.status),
    health: o.health || "on_track",
    waiting_on: o.waitingOn || null,
    health_note: o.healthNote || "",
    health_changed_at: o.healthChangedAt || new Date().toISOString(),
    tracking_code: o.trackingCode,
    shipping_carrier: o.shippingCarrier || null,
    carrier_status_code: o.carrierStatusCode || "",
    carrier_status_name: o.carrierStatusName || "",
    carrier_status_at: o.carrierStatusAt || null,
    delivered_at: o.deliveredAt || null,
    parcel_photo: o.parcelPhoto ?? "",
    unread: o.unread,
  };
}

export function fromThreadRow(r) {
  return {
    id: r.id,
    customerId: r.customer_id,
    customerName: r.customer_name,
    role: r.role,
    messages: r.messages || [],
    unreadForAdmin: r.unread_for_admin,
  };
}

export function fromCatalogRow(r) {
  return {
    id: r.id,
    line: r.line,
    available: r.available,
    limited: r.limited,
    name: r.name,
    notes: r.notes,
    brew: r.brew,
    packSize: r.pack_size,
    photoUrl: r.photo_url,
    photoPosition: r.photo_position,
    price: r.price ?? undefined,
    stockHaGiang: r.stock_ha_giang ?? undefined,
    stockSocSon: r.stock_soc_son ?? undefined,
    batch: r.batch,
    soldCount: r.sold_count ?? 0,
    flavors: r.flavors || {},
    kind: r.kind || "tea",
    vendorId: r.vendor_id || "",
  };
}

// The public shape only — list_public_vendors() already drops phone and note, so a vendor's
// own contact details never reach the browser on a customer-facing page.
export function fromVendorRow(r) {
  return {
    id: r.id,
    name: r.name,
    region: r.region || "",
    photo: r.photo || "",
    crops: r.crops || "",
    story: { vi: r.story_vi || "", en: r.story_en || "" },
    sortOrder: r.sort_order ?? 0,
    // Present only when staff read the table directly; absent from the public function.
    phone: r.phone ?? undefined,
    note: r.note ?? undefined,
    active: r.active ?? true,
  };
}

export function toVendorRow(v) {
  return {
    id: v.id,
    name: v.name,
    region: v.region || "",
    photo: v.photo || "",
    crops: v.crops || "",
    story_vi: v.story?.vi || "",
    story_en: v.story?.en || "",
    phone: v.phone || "",
    note: v.note || "",
    active: v.active !== false,
    sort_order: v.sortOrder ?? 0,
  };
}

export function toCatalogRow(p) {
  return {
    id: p.id,
    line: p.line,
    available: p.available,
    limited: p.limited,
    name: p.name,
    notes: p.notes,
    brew: p.brew,
    pack_size: p.packSize,
    photo_url: p.photoUrl,
    photo_position: p.photoPosition,
    price: p.price ?? null,
    stock_ha_giang: p.stockHaGiang ?? null,
    stock_soc_son: p.stockSocSon ?? null,
    batch: p.batch,
    sold_count: p.soldCount ?? 0,
    flavors: p.flavors ?? {},
    kind: p.kind || "tea",
    // Empty string would violate the foreign key; the column means "the House's own" when null.
    vendor_id: p.vendorId || null,
  };
}

export function fromVariantRow(r) {
  return {
    weight: r.weight,
    price: r.price ?? undefined,
    stockHaGiang: r.stock_ha_giang ?? undefined,
    stockSocSon: r.stock_soc_son ?? undefined,
  };
}

export function toVariantRow(productId, v) {
  return {
    product_id: productId,
    weight: v.weight,
    price: v.price ?? null,
    stock_ha_giang: v.stockHaGiang ?? null,
    stock_soc_son: v.stockSocSon ?? null,
  };
}

export function fromPromoRow(r) {
  return {
    id: r.id,
    code: r.code,
    percent: r.percent,
    ownerName: r.owner_name,
    active: r.active,
  };
}

export function toPromoRow(p) {
  return {
    id: p.id,
    code: p.code,
    percent: p.percent,
    owner_name: p.ownerName,
    active: p.active,
  };
}

export function fromPaymentRow(r) {
  if (!r)
    return { bin: "", bankShortName: "", accountNumber: "", accountName: "" };
  return {
    bin: r.bin || "",
    bankShortName: r.bank_short_name || "",
    accountNumber: r.account_number || "",
    accountName: r.account_name || "",
  };
}

export function toPaymentRow(p) {
  return {
    id: 1,
    bin: p.bin,
    bank_short_name: p.bankShortName,
    account_number: p.accountNumber,
    account_name: p.accountName,
  };
}

export function fromGalleryRow(r) {
  return { id: r.id, url: r.url, caption: r.caption || {} };
}

export function fromWholesaleAccountRow(r) {
  return {
    id: r.id,
    code: r.code,
    businessName: r.business_name,
    contact: r.contact || "",
    userId: r.user_id || null,
    wholesaleVerified: !!r.wholesale_verified,
    deliveryAddress: r.delivery_address || "",
    taxNumber: r.tax_number || "",
    reorderCadenceDays: Number(r.reorder_cadence_days) || 30,
    leadTimeDays: Number(r.lead_time_days) || 3,
  };
}

export function toWholesaleAccountRow(a) {
  return {
    id: a.id,
    code: a.code,
    business_name: a.businessName,
    contact: a.contact,
    delivery_address: a.deliveryAddress || "",
    tax_number: a.taxNumber || "",
    reorder_cadence_days: Number(a.reorderCadenceDays) || 30,
    lead_time_days: Number(a.leadTimeDays) || 3,
  };
}

// Handles rows from both read paths: the public list_approved_product_reviews RPC
// (approved rows only, no `contact`) and staff's direct table select (all columns).
export function fromProductReviewRow(r) {
  return {
    id: r.id,
    productId: r.product_id,
    reviewerName: r.reviewer_name,
    contact: r.contact || "",
    rating: r.rating,
    body: r.body || "",
    approved: r.approved ?? true,
    createdAt: r.created_at,
  };
}

export function fromTeaSessionRow(r) {
  return {
    id: r.id,
    date: r.date,
    time: r.session_time ? r.session_time.slice(0, 5) : "",
    customerName: r.customer_name,
    contact: r.contact,
    note: r.note || "",
    status: r.status,
    paymentMethod: r.payment_method,
    createdAt: r.created_at,
  };
}

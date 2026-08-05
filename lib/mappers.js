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
    trackingCode: r.tracking_code,
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
    tracking_code: o.trackingCode,
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
  if (!r) return { bin: "", bankShortName: "", accountNumber: "", accountName: "" };
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
    id: r.id, code: r.code, businessName: r.business_name, contact: r.contact || "",
    userId: r.user_id || null, wholesaleVerified: !!r.wholesale_verified,
  };
}

export function toWholesaleAccountRow(a) {
  return { id: a.id, code: a.code, business_name: a.businessName, contact: a.contact };
}

export function fromTeaSessionRow(r) {
  return {
    id: r.id, date: r.date, customerName: r.customer_name, contact: r.contact,
    note: r.note || "", status: r.status, paymentMethod: r.payment_method, createdAt: r.created_at,
  };
}

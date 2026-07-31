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
    tier: r.tier,
    status: r.status,
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
    tier: o.tier,
    status: o.status,
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
    name: r.name,
    notes: r.notes,
    brew: r.brew,
    packSize: r.pack_size,
    photoUrl: r.photo_url,
  };
}

export function toCatalogRow(p) {
  return {
    id: p.id,
    line: p.line,
    available: p.available,
    name: p.name,
    notes: p.notes,
    brew: p.brew,
    pack_size: p.packSize,
    photo_url: p.photoUrl,
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

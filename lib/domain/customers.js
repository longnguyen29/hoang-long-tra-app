// One contact can arrive through checkout, a sample request, a lead, or a message.
// Normalize only for matching; never replace the customer's original display value.
export function normalizeContact(value = "") {
  const raw = String(value).trim().toLowerCase();
  if (!raw) return "";
  if (raw.includes("@")) return raw;
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("84")) return `0${digits.slice(2)}`;
  return digits;
}

export function relationshipKey(record = {}) {
  return normalizeContact(record.contact || record.phone || record.customer_id || record.contact_key) || record.id || "unknown";
}

export function relationshipName(record = {}) {
  return record.customer_name || record.store_name || record.name || "Unnamed relationship";
}

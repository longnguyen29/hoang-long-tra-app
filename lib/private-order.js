import { ORDER_UNIT_CHOICES } from "./selling-units.js";

export const PRIVATE_PAGE_FIELDS = "id,token,customer_name,items,active,revision,opportunity_id,delivery_contact,delivery_address";
export const PRIVATE_LINK = "/mua-rieng/";
export const validPrivateId = value => typeof value === "string" && /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(value);
export const privateText = (value, limit) => typeof value === "string" && value.trim().length <= limit ? value.trim() : "";

export function privatePageInput(input) {
  const customer_name = privateText(input?.customer_name, 120);
  if (!customer_name || !Array.isArray(input.items) || input.items.length > 30 || typeof input.active !== "boolean") return null;
  const items = [];
  const seen = new Set();
  for (const item of input.items) {
    const name = privateText(item?.name, 160);
    const weight = privateText(item?.weight, 120);
    if (!name || !validPrivateId(item.id) || seen.has(item.id) || !ORDER_UNIT_CHOICES.includes(item.unit)
        || !Number.isInteger(item.price) || item.price < 1 || item.price > 1000000000) return null;
    seen.add(item.id);
    const productKey = privateText(item.productKey, 300);
    items.push({ id: item.id, name, weight, unit: item.unit, price: item.price, ...(productKey && { productKey }) });
  }
  if (input.active && !items.length) return null;
  const opportunity_id = privateText(input.opportunity_id, 160) || null;
  const delivery_contact = privateText(input.delivery_contact, 240);
  const delivery_address = privateText(input.delivery_address, 1000);
  return { customer_name, items, active: input.active, opportunity_id, delivery_contact, delivery_address };
}

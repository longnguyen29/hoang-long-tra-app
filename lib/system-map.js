const orderColumns = "id,customer_name,type,status,stage,health,ts,contact,quote_id,partner_account_id,tracking_code,reorder_of_order_id";
const opportunityColumns = "id,business_name,contact,stage,next_action,next_action_at";
const quoteColumns = "id,opportunity_id,converted_order_id,status";

const rows = async query => {
  const { data, error } = await query;
  if (error) throw error;
  return Array.isArray(data) ? data : [];
};
const one = async query => (await rows(query.limit(1)))[0] || null;
const byIds = (db, table, columns, field, ids) => ids.length
  ? rows(db.from(table).select(columns).in(field, ids)) : Promise.resolve([]);
const unique = values => [...new Set(values.filter(Boolean))];

export async function loadMapIndex(db, canSeeSales) {
  const [orders, customers, acceptedQuotes] = await Promise.all([
    rows(db.from("orders").select("id,customer_name,stage,status,health").order("ts", { ascending: false }).order("id", { ascending: false }).limit(60)),
    canSeeSales ? rows(db.from("trade_opportunities").select("id,business_name").neq("stage", "lost").order("updated_at", { ascending: false }).limit(60)) : [],
    canSeeSales ? rows(db.from("trade_quotes").select("id,opportunity_id").eq("status", "accepted").is("converted_order_id", null).limit(60)) : [],
  ]);
  let converted = [];
  if (acceptedQuotes.length) converted = await byIds(db, "orders", "quote_id", "quote_id", acceptedQuotes.map(quote => quote.id));
  const activeQuoteIds = new Set(converted.map(order => order.quote_id));
  return { orders, customers, acceptedQuotes: acceptedQuotes.filter(quote => !activeQuoteIds.has(quote.id)) };
}

async function customerStory(db, customer) {
  if (!customer) return { customer: null, samples: [], quotes: [], orders: [], partner: null };
  const [samples, quotes, links, partner] = await Promise.all([
    rows(db.from("sample_requests").select("id,status,pack,ts").eq("opportunity_id", customer.id).order("ts", { ascending: false }).limit(25)),
    rows(db.from("trade_quotes").select(quoteColumns).eq("opportunity_id", customer.id).order("created_at", { ascending: false }).limit(25)),
    rows(db.from("customer_directory_order_links").select("order_id").eq("opportunity_id", customer.id).order("linked_at", { ascending: false }).limit(25)),
    one(db.from("wholesale_accounts").select("id,reorder_cadence_days").eq("opportunity_id", customer.id)),
  ]);
  const [direct, throughQuotes, partnerOrders] = await Promise.all([
    byIds(db, "orders", orderColumns, "id", unique([...quotes.map(item => item.converted_order_id), ...links.map(item => item.order_id)])),
    byIds(db, "orders", orderColumns, "quote_id", quotes.map(item => item.id)),
    partner ? rows(db.from("orders").select(orderColumns).eq("partner_account_id", partner.id).order("ts", { ascending: false }).limit(25)) : [],
  ]);
  const candidates = [...new Map([...direct, ...throughQuotes, ...partnerOrders].map(item => [item.id, item])).values()];
  const assignments = await byIds(db, "customer_directory_order_links", "order_id,opportunity_id", "order_id", candidates.map(item => item.id));
  const directory = new Map(assignments.map(item => [item.order_id, item.opportunity_id]));
  const orders = candidates.filter(item => !directory.has(item.id) || directory.get(item.id) === customer.id)
    .sort((a, b) => String(b.ts || "").localeCompare(String(a.ts || "")));
  return { customer, samples, quotes, orders, partner };
}

async function salesForOrder(db, order) {
  const [manual, directQuote, converted, partner] = await Promise.all([
    one(db.from("customer_directory_order_links").select("opportunity_id").eq("order_id", order.id)),
    order.quote_id ? one(db.from("trade_quotes").select(quoteColumns).eq("id", order.quote_id)) : null,
    one(db.from("trade_quotes").select(quoteColumns).eq("converted_order_id", order.id)),
    order.partner_account_id ? one(db.from("wholesale_accounts").select("opportunity_id").eq("id", order.partner_account_id)) : null,
  ]);
  const quote = directQuote || converted;
  const customerId = manual?.opportunity_id || quote?.opportunity_id || partner?.opportunity_id;
  if (customerId) {
    const customer = await one(db.from("trade_opportunities").select(opportunityColumns).eq("id", customerId));
    return { ...await customerStory(db, customer), quote, suggested: false };
  }
  const matches = order.contact?.trim()
    ? await rows(db.from("trade_opportunities").select(opportunityColumns).eq("contact", order.contact.trim()).limit(2)) : [];
  return { ...await customerStory(db, matches.length === 1 ? matches[0] : null), quote, suggested: matches.length === 1 };
}

export async function loadMapStory(db, kind, id, access) {
  if (kind === "customer") {
    if (!access.sales) return null;
    const customer = await one(db.from("trade_opportunities").select(opportunityColumns).eq("id", id));
    return customer ? customerStory(db, customer) : null;
  }
  const order = await one(db.from("orders").select(orderColumns).eq("id", id));
  if (!order) return null;
  const [sales, allocations, procedure, receivable, laterOrders] = await Promise.all([
    access.sales ? salesForOrder(db, order) : null,
    access.operations ? rows(db.from("order_batch_allocations").select("id,quantity_kg,tea_batches(code,status)").eq("order_id", id)) : [],
    access.procedures ? one(db.from("procedure_runs").select("id,status,next_action,delivery_due_at").eq("order_id", id)) : null,
    access.operations ? one(db.from("receivables").select("id,invoice_number,due_at,total,paid,status").eq("order_id", id)) : null,
    rows(db.from("orders").select("id,customer_name,status").eq("reorder_of_order_id", id).order("ts", { ascending: false }).limit(10)),
  ]);
  const payments = receivable ? await rows(db.from("receivable_payments").select("id,amount,paid_at,method").eq("receivable_id", receivable.id).order("paid_at", { ascending: false })) : [];
  return { order, sales, allocations, procedure, receivable, payments, laterOrders };
}

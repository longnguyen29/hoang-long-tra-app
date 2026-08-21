import { relationshipKey, relationshipName } from "./customers";

export function deriveCommercialJourney(data) {
  const rows = [];
  data.leads.forEach(item => rows.push({ id: item.id, relationshipKey: relationshipKey(item), name: relationshipName(item), stage: "Qualified", next: "Turn stated interest into a sample or order", at: item.ts, source: "Lead" }));
  data.samples.forEach(item => rows.push({ id: item.id, relationshipKey: relationshipKey(item), name: relationshipName(item), stage: item.status === "sent" ? "Sample sent" : item.status === "converted" ? "Converted" : "Sample requested", next: item.status === "sent" ? "Capture test feedback" : item.status === "converted" ? "Prepare repeat path" : "Qualify and dispatch", at: item.ts, source: `${item.pack} sample` }));
  data.orders.forEach(item => rows.push({ id: item.id, relationshipKey: relationshipKey(item), name: relationshipName(item), stage: item.status === "completed" ? "Completed" : item.status === "shipped" ? "Shipped" : "Order", next: item.status === "pending" ? "Confirm order" : item.status === "confirmed" ? "Prepare dispatch" : "Set next relationship action", at: item.ts, source: item.type }));
  return rows.sort((a, b) => new Date(b.at) - new Date(a.at));
}

export function deriveAttention(data, limit = 6) {
  return [
    ...data.orders.filter(order => order.status === "pending").map(order => ({ id: order.id, type: "Order", title: `Confirm ${relationshipName(order)}’s order`, date: order.ts })),
    ...data.samples.filter(sample => sample.status === "new").map(sample => ({ id: sample.id, type: "Sample", title: `Qualify ${sample.store_name}`, date: sample.ts })),
    ...data.threads.filter(thread => thread.unread_for_admin).map(thread => ({ id: thread.id, type: "Message", title: `Reply to ${thread.customer_name || "customer"}`, date: thread.created_at })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, limit);
}

export function summarizeCommercialSignals(data) {
  return {
    pendingOrders: data.orders.filter(order => order.status === "pending"),
    newSamples: data.samples.filter(sample => sample.status === "new"),
    unreadThreads: data.threads.filter(thread => thread.unread_for_admin),
    unreadLeads: data.leads.filter(lead => lead.unread),
  };
}

export function answerCommercialQuestion(data, question) {
  const { pendingOrders, newSamples, unreadThreads, unreadLeads } = summarizeCommercialSignals(data);
  const query = question.toLowerCase();
  if (query.includes("sample") || query.includes("convert")) return {
    summary: `${newSamples.length} sample request${newSamples.length === 1 ? " is" : "s are"} waiting for a decision. Start with requests that meet all three trade qualifications, then give every dispatched pack a named feedback date.`,
    actions: [["Qualify new sample requests", "Confirm shop status, reformulation ability, and willingness to give feedback.", "sample_requests"],["Attach the next action before dispatch", "A sent sample without an owner and follow-up date becomes invisible work.", "sample_requests.status"],["Connect converted samples to the first order", "This is required to measure sample-to-order conversion accurately.", "orders + sample_requests"]],
  };
  if (query.includes("customer") || query.includes("message") || query.includes("relationship")) return {
    summary: `${unreadThreads.length} conversation${unreadThreads.length === 1 ? " needs" : "s need"} a reply and ${unreadLeads.length} lead${unreadLeads.length === 1 ? " is" : "s are"} still unread. Resolve direct customer intent before lower-confidence opportunities.`,
    actions: [["Answer unread conversations", "These contain explicit customer intent and should outrank inferred work.", "support_threads"],["Review unread leads", "Give each viable lead a next action, owner, and date.", "leads"],["Capture durable notes", "Move reusable preferences out of one-off messages into customer memory.", "customer_notes"]],
  };
  return {
    summary: `${pendingOrders.length} pending order${pendingOrders.length === 1 ? "" : "s"}, ${newSamples.length} new sample request${newSamples.length === 1 ? "" : "s"}, and ${unreadThreads.length} unread conversation${unreadThreads.length === 1 ? "" : "s"} currently need attention.`,
    actions: [["Protect active revenue", "Confirm pending orders before starting speculative work.", "orders.status = pending"],["Move samples into learning", "Qualify, send, and schedule feedback so sampling produces evidence.", "sample_requests"],["Close the communication loop", "Unread customer messages are the most direct source of objections and demand.", "support_threads"]],
  };
}

export function orderSmsHistory(trackingRows = [], paymentRows = []) {
  const shipping = trackingRows.map((row) => ({
    id: `shipping:${row.id}`,
    kind: 'shipping',
    status: row.status,
    attempts: row.attempts || 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    queuedAt: row.queued_at,
    providerState: row.provider_state || '',
    lastError: row.last_error || '',
    carrier: row.shipping_carrier,
    trackingCode: row.tracking_code,
  }));
  const payments = paymentRows.map((row) => ({
    id: `payment:${row.id}`,
    kind: 'payment',
    status: row.status,
    attempts: row.attempts || 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    queuedAt: row.queued_at,
    sentAt: row.sent_at,
    providerState: row.provider_state || '',
    lastError: row.last_error || '',
    skipReason: row.skip_reason || '',
    amountDue: row.amount_due,
  }));
  return [...shipping, ...payments].sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

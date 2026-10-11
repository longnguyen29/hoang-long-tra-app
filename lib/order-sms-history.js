const receipt = (row) => ({
  providerState: row.provider_state || '',
  providerStates: row.provider_states || {},
  providerSentAt: row.provider_sent_at || null,
  providerDeliveredAt: row.provider_delivered_at || null,
  providerCheckedAt: row.provider_checked_at || null,
  providerCheckError: row.provider_check_error || '',
});

export function orderSmsHistory(trackingRows = [], paymentRows = [], sampleRows = []) {
  const shipping = trackingRows.map((row) => ({
    id: `shipping:${row.id}`,
    kind: 'shipping',
    status: row.status,
    attempts: row.attempts || 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    queuedAt: row.queued_at,
    ...receipt(row),
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
    ...receipt(row),
    lastError: row.last_error || '',
    skipReason: row.skip_reason || '',
    amountDue: row.amount_due,
  }));
  const samples = sampleRows.map((row) => ({
    id: `sample:${row.id}`, kind: 'sample', status: row.status,
    attempts: row.attempts || 0, createdAt: row.created_at, updatedAt: row.updated_at,
    queuedAt: row.sms_queued_at, smsQueuedAt: row.sms_queued_at,
    dueAt: row.due_at, lastError: row.last_error || '', ...receipt(row),
  }));
  return [...shipping, ...payments, ...samples].sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

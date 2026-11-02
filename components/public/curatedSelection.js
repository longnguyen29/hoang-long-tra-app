// Public RPC is intentionally separate from the purchase catalogue: if the
// optional module is absent or unavailable, shopping must continue normally.
export function normalizeCuratedSelections(rows) {
  if (!Array.isArray(rows)) return [];
  const counts = new Map();
  const candidates = [];
  const text = (value, limit) => typeof value === 'string' ? value.trim().slice(0, limit) : '';
  for (const row of rows) {
    const productId = text(row?.product_id, 200);
    const batchCode = text(row?.batch_code, 120);
    const producerName = text(row?.producer_name, 160);
    const supplierName = text(row?.supplier_name, 160);
    const tastedOn = typeof row?.tasted_on === 'string' ? row.tasted_on.trim() : '';
    const publicNote = text(row?.public_note, 600);
    if (!productId || !batchCode || !producerName || !supplierName || !/^\d{4}-\d{2}-\d{2}$/.test(tastedOn)) continue;
    const date = new Date(`${tastedOn}T00:00:00.000Z`);
    if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== tastedOn) continue;
    counts.set(productId, (counts.get(productId) || 0) + 1);
    candidates.push({productId, batchCode, producerName, supplierName, tastedOn, publicNote});
  }
  // Ambiguous batches never receive a badge until the data is corrected.
  return candidates.filter(row => counts.get(row.productId) === 1);
}

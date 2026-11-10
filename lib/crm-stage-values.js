// One latest open quote per opportunity; these are estimates, never collected revenue.
export function latestOpenQuoteValues(quotes) {
  const result = new Map();
  const sorted = [...quotes].sort((a, b) => (Date.parse(b.created_at) || 0) - (Date.parse(a.created_at) || 0));
  for (const quote of sorted) {
    if (!quote.opportunity_id || !['draft', 'sent', 'accepted'].includes(quote.status) || result.has(quote.opportunity_id)) continue;
    if (quote.total === null || quote.total === undefined || quote.total === '') continue;
    const value = Number(quote.total);
    if (Number.isFinite(value) && value >= 0) result.set(quote.opportunity_id, value);
  }
  return result;
}
export function stageQuoteTotal(items, quoteValues) {
  const values = items.map(item => quoteValues.get(item.id)).filter(value => value !== undefined);
  return values.length ? { total: values.reduce((sum, value) => sum + value, 0), count: values.length } : null;
}

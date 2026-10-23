function recordedPrice(value) {
  if (value == null || typeof value === 'boolean' || String(value).trim() === '') return null;
  const price = Number(value);
  return Number.isFinite(price) && price >= 0 ? price : null;
}

// The caller supplies validated prices and indexes. Keep the first actual
// pre-edit sale price, including an explicit unknown or zero, on the saved line.
// listPrice is a separate catalogue/discount snapshot and is never a substitute.
export function applyOrderLinePriceChanges(lines, changes) {
  const next = lines.map(line => ({ ...line }));
  for (const { index, price } of changes) {
    const line = next[index];
    const previous = recordedPrice(line.price);
    if (price !== previous && !Object.hasOwn(line, 'priceBeforeEdit')) {
      line.priceBeforeEdit = previous;
    }
    line.price = price;
  }
  return next;
}

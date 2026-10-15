import { loadRetailProducts, retailPublicClient } from '@/lib/retail-catalog-server';
import { prepareRetailCheckout, validateRetailCheckout } from '@/lib/retail-checkout';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request) {
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) return Response.json({ error: 'invalid_origin' }, { status: 403 });
  try {
    const body = await request.text();
    if (body.length > 20000) return Response.json({ error: 'invalid_checkout' }, { status: 400 });
    const payload = JSON.parse(body);
    validateRetailCheckout(payload);
    // Resolve by real product identity; client prices, units and names are ignored.
    const client = retailPublicClient();
    const products = await loadRetailProducts(client);
    const { lines, total, customer, count } = prepareRetailCheckout(payload, products);
    // The service-only transaction rechecks locked catalogue prices, sale units
    // and volume benefits. No browser-supplied discount/shipping flag is trusted.
    const { data, error } = await createAdminClient().rpc('submit_retail_volume_order', {
      p_customer_name: customer.name, p_contact: customer.contact, p_address: customer.address,
      p_tax_number: customer.tax, p_note: customer.note, p_lines: lines, p_total_items: count,
      p_estimated_total: total, p_payment_method: customer.payment,
    });
    if (error || !data?.[0]?.id) {
      const message = error?.message || '';
      const code = message.includes('out_of_stock') ? 'out_of_stock' : message.includes('price_changed') ? 'price_changed' : message.includes('cart_changed') ? 'cart_changed' : 'order_unavailable';
      return Response.json({ error: code }, { status: code === 'order_unavailable' ? 503 : 409 });
    }
    return Response.json({ orderId: data[0].id, total }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const code = ['invalid_checkout', 'cart_changed', 'price_changed'].includes(error.message) ? error.message : error instanceof SyntaxError ? 'invalid_checkout' : 'order_unavailable';
    return Response.json({ error: code }, { status: code === 'invalid_checkout' ? 400 : code === 'order_unavailable' ? 503 : 409 });
  }
}

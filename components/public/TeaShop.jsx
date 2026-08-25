"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Minus, Plus, ShoppingBag, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { fromCatalogRow, fromVariantRow } from "@/lib/mappers";
import styles from "./TeaShop.module.css";

const money = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 });

export default function TeaShop() {
  const supabase = useMemo(() => createClient(), []);
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState({});
  const [cartOpen, setCartOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [complete, setComplete] = useState(null);
  const [customer, setCustomer] = useState({ name: "", contact: "", address: "", tax: "", note: "", payment: "qr", consent: false });

  useEffect(() => {
    let live = true;
    Promise.all([
      supabase.from("catalog_products").select("*").eq("available", true),
      supabase.from("catalog_variants").select("*")
    ]).then(([catalogResult, variantResult]) => {
      if (!live) return;
      if (catalogResult.error || variantResult.error) {
        setError("The seasonal catalogue could not be loaded. Please try again.");
      } else {
        const variants = variantResult.data || [];
        setProducts((catalogResult.data || []).map((row) => ({
          ...fromCatalogRow(row),
          variants: variants.filter((v) => v.product_id === row.id).map(fromVariantRow),
        })).filter((item) => item.kind !== "goods"));
      }
      setLoading(false);
    });
    return () => { live = false; };
  }, [supabase]);

  const options = products.flatMap((product) => product.variants.length
    ? product.variants.map((variant) => ({ product, weight: variant.weight, price: variant.price, key: `${product.id}__${variant.weight}` }))
    : [{ product, weight: null, price: product.price, key: product.id }]);
  const lines = options.filter((option) => cart[option.key] > 0).map((option) => ({ ...option, qty: cart[option.key] }));
  const count = lines.reduce((sum, line) => sum + line.qty, 0);
  const total = lines.reduce((sum, line) => sum + (line.price || 0) * line.qty, 0);

  const quantity = (key, delta) => setCart((current) => {
    const next = Math.max(0, (current[key] || 0) + delta);
    const updated = { ...current, [key]: next };
    if (!next) delete updated[key];
    return updated;
  });

  const submit = async (event) => {
    event.preventDefault();
    if (!lines.length || !customer.name.trim() || !customer.contact.trim() || !customer.consent) return;
    setSending(true); setError("");
    const orderLines = lines.map(({ product, weight, price, qty }) => ({
      name: weight ? { en: `${product.name.en} (${weight})`, vi: `${product.name.vi} (${weight})` } : product.name,
      qty, unit: product.line === "everyday" ? "kg" : "pcs", price: price || null, productId: product.id, weight,
    }));
    const { data, error: submitError } = await supabase.rpc("submit_retail_order", {
      p_customer_name: customer.name.trim(), p_contact: customer.contact.trim(), p_address: customer.address.trim(),
      p_tax_number: customer.tax.trim(), p_note: customer.note.trim(), p_lines: orderLines,
      p_total_items: count, p_estimated_total: total || null, p_promo: null, p_payment_method: customer.payment,
    });
    setSending(false);
    if (submitError || !data?.length) {
      setError(submitError?.message?.includes("out_of_stock") ? "One of these teas has just sold out. Refresh the shop and choose again." : "We could not place the order. Your cart is still here—please try again.");
      return;
    }
    setComplete({ id: data[0].id, total });
    setCart({});
    fetch("/api/notify-order", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ orderId: data[0].id }) }).catch(() => {});
  };

  if (complete) return (
    <main className={styles.complete}>
      <span><Check size={18}/></span><p>Order received</p><h1>Thank you. The house will confirm your tea shortly.</h1>
      <dl><div><dt>Order</dt><dd>{complete.id}</dd></div><div><dt>Estimated total</dt><dd>{money.format(complete.total)}</dd></div></dl>
      <p>Save the order number. We will contact you using the phone or email supplied at checkout.</p>
      <Link href="/">Return to the house <ArrowRight size={16}/></Link>
    </main>
  );

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/" className={styles.back}><ArrowLeft size={17}/> House of Hoàng Long</Link>
        <button onClick={() => setCartOpen(true)} className={styles.cartButton} aria-label={`Open cart with ${count} items`}>
          <ShoppingBag size={17}/><span>Cart</span><b>{count}</b>
        </button>
      </header>

      <section className={styles.intro}>
        <p>Seasonal tea · direct from the house</p>
        <h1>Choose the leaf before the packaging.</h1>
        <div><p>Each tea begins with origin, harvest, and processing. Packs are simply the format that brings it to your table.</p><Link href="/wholesale">Buying for a business? <ArrowRight size={16}/></Link></div>
      </section>

      {loading ? <section className={styles.loading} aria-live="polite"><i/><i/><i/></section> : error && !products.length ? <p className={styles.error} role="alert">{error}</p> : (
        <section className={styles.catalog} aria-label="Available teas">
          {products.map((product, index) => {
            const choices = product.variants.length ? product.variants : [{ weight: product.packSize || "House pack", price: product.price }];
            return <article className={styles.product} key={product.id}>
              <figure>{product.photoUrl ? <img src={product.photoUrl} alt={product.name.en} loading={index > 1 ? "lazy" : undefined} style={{objectPosition:product.photoPosition || "50% 50%"}}/> : <span aria-hidden="true">皇龍</span>}</figure>
              <div className={styles.productCopy}><p>{product.batch || (product.limited ? "Limited release" : "House selection")}</p><h2>{product.name.en}</h2><span>{product.name.vi}</span><p>{product.notes?.en}</p></div>
              <div className={styles.variants}>{choices.map((choice) => {
                const key = product.variants.length ? `${product.id}__${choice.weight}` : product.id;
                const n = cart[key] || 0;
                return <div className={styles.variant} key={key}><span><b>{choice.weight}</b><small>{choice.price ? money.format(choice.price) : "Price on request"}</small></span><div><button onClick={() => quantity(key,-1)} disabled={!n} aria-label={`Remove ${product.name.en}`}><Minus size={14}/></button><output>{n}</output><button onClick={() => quantity(key,1)} aria-label={`Add ${product.name.en}`}><Plus size={14}/></button></div></div>;
              })}</div>
            </article>;
          })}
        </section>
      )}

      {count > 0 && <button className={styles.cartRail} onClick={() => setCartOpen(true)}><span>{count} {count === 1 ? "item" : "items"}</span><b>{money.format(total)}</b><span>Checkout <ArrowRight size={16}/></span></button>}

      {cartOpen && <div className={styles.overlay} role="presentation" onMouseDown={(e) => e.target === e.currentTarget && setCartOpen(false)}>
        <aside className={styles.drawer} role="dialog" aria-modal="true" aria-labelledby="cart-title">
          <header><div><p>Your order</p><h2 id="cart-title">Cart</h2></div><button onClick={() => setCartOpen(false)} aria-label="Close cart"><X size={19}/></button></header>
          {!lines.length ? <div className={styles.empty}><ShoppingBag size={22}/><p>Your cart is empty.</p><button onClick={() => setCartOpen(false)}>Continue choosing tea</button></div> : <>
            <div className={styles.lines}>{lines.map((line) => <div key={line.key}><span><b>{line.product.name.en}</b><small>{line.weight || line.product.packSize}</small></span><span>{line.qty} × {line.price ? money.format(line.price) : "—"}</span></div>)}</div>
            <form className={styles.checkout} onSubmit={submit}>
              <div className={styles.total}><span>Estimated total</span><b>{money.format(total)}</b></div>
              <label>Name<input required value={customer.name} onChange={(e)=>setCustomer({...customer,name:e.target.value})}/></label>
              <label>Phone or email<input required value={customer.contact} onChange={(e)=>setCustomer({...customer,contact:e.target.value})}/></label>
              <label>Delivery address<textarea required value={customer.address} onChange={(e)=>setCustomer({...customer,address:e.target.value})}/></label>
              <label>Tax number <small>Optional</small><input value={customer.tax} onChange={(e)=>setCustomer({...customer,tax:e.target.value})}/></label>
              <label>Note <small>Optional</small><textarea value={customer.note} onChange={(e)=>setCustomer({...customer,note:e.target.value})}/></label>
              <fieldset><legend>Payment</legend><label><input type="radio" name="payment" checked={customer.payment==="qr"} onChange={()=>setCustomer({...customer,payment:"qr"})}/> QR bank transfer</label><label><input type="radio" name="payment" checked={customer.payment==="cash"} onChange={()=>setCustomer({...customer,payment:"cash"})}/> Cash</label></fieldset>
              <label className={styles.consent}><input type="checkbox" checked={customer.consent} onChange={(e)=>setCustomer({...customer,consent:e.target.checked})}/> I agree that the house may use these details to fulfil this order.</label>
              {error && <p className={styles.error} role="alert">{error}</p>}
              <button className={styles.submit} disabled={sending || !customer.name.trim() || !customer.contact.trim() || !customer.address.trim() || !customer.consent}>{sending ? "Placing order…" : "Place order"}<ArrowRight size={16}/></button>
            </form>
          </>}
        </aside>
      </div>}
    </main>
  );
}

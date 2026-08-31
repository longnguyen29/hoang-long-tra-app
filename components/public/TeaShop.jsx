"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Globe2, Minus, Plus, ShoppingBag, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { fromCatalogRow, fromVariantRow } from "@/lib/mappers";
import { useLocale } from "@/components/i18n/LocaleProvider";
import styles from "./TeaShop.module.css";

const money = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 });

const COPY = {
  vi: {
    back: "House of Hoang Long",
    switcher: "EN",
    cart: "Giỏ hàng",
    openCart: (count) => `Mở giỏ hàng có ${count} sản phẩm`,
    teaEyebrow: "Trà theo mùa · trực tiếp từ Nhà",
    goodsEyebrow: "Sản vật Tây Bắc · được Nhà tuyển chọn",
    teaTitle: "Chọn lá trà trước khi chọn bao bì.",
    goodsTitle: "Sản vật có người làm và vùng đất phía sau.",
    teaIntro: "Mỗi loại trà bắt đầu từ vùng nguyên liệu, mùa hái và cách chế biến. Bao bì chỉ là hình thức đưa trà đến bàn của bạn.",
    goodsIntro: "Một gian hàng nhỏ dành cho sản vật Tây Bắc, nơi người làm ra sản phẩm vẫn hiện diện trong câu chuyện.",
    teaLink: "Mua trà cho quán hoặc doanh nghiệp?",
    goodsLink: "Gặp những người phía sau sản vật",
    loadError: "Chưa tải được danh mục mùa này. Vui lòng thử lại.",
    emptyTea: "Danh mục trà mùa này đang được chuẩn bị.",
    emptyGoods: "Gian hàng đang được chuẩn bị.",
    houseMarket: "Gian hàng của Nhà",
    housePack: "Gói của Nhà",
    limited: "Mẻ giới hạn",
    selection: "Trà Nhà chọn",
    priceOnRequest: "Liên hệ báo giá",
    remove: (name) => `Bớt ${name}`,
    add: (name) => `Thêm ${name}`,
    itemCount: (count) => `${count} sản phẩm`,
    checkout: "Thanh toán",
    yourOrder: "Đơn hàng của bạn",
    closeCart: "Đóng giỏ hàng",
    emptyCart: "Giỏ hàng đang trống.",
    continueTea: "Tiếp tục chọn trà",
    estimatedTotal: "Tổng tạm tính",
    name: "Tên",
    contact: "Số điện thoại hoặc email",
    address: "Địa chỉ giao hàng",
    tax: "Mã số thuế",
    note: "Ghi chú",
    optional: "Không bắt buộc",
    payment: "Thanh toán",
    bankTransfer: "Chuyển khoản QR",
    cash: "Tiền mặt",
    consent: "Tôi đồng ý để Nhà sử dụng thông tin này nhằm xử lý và giao đơn hàng.",
    placing: "Đang gửi đơn…",
    placeOrder: "Đặt hàng",
    soldOut: "Một loại trà vừa hết hàng. Hãy tải lại trang và chọn lại.",
    orderError: "Chưa gửi được đơn. Giỏ hàng vẫn được giữ nguyên—vui lòng thử lại.",
    received: "Đã nhận đơn",
    thanks: (kind) => `Cảm ơn bạn. Nhà sẽ sớm xác nhận ${kind === "goods" ? "đơn sản vật" : "đơn trà"}.`,
    order: "Mã đơn",
    saveOrder: "Hãy lưu mã đơn. Chúng tôi sẽ liên hệ qua số điện thoại hoặc email bạn đã cung cấp.",
    returnHome: "Về trang chủ",
  },
  en: {
    back: "House of Hoang Long",
    switcher: "VI",
    cart: "Cart",
    openCart: (count) => `Open cart with ${count} items`,
    teaEyebrow: "Seasonal tea · direct from the house",
    goodsEyebrow: "North-West goods · carried by the house",
    teaTitle: "Choose the leaf before the packaging.",
    goodsTitle: "Produce with a person and place behind it.",
    teaIntro: "Each tea begins with origin, harvest, and processing. Packs are simply the format that brings it to your table.",
    goodsIntro: "A small market for food from the North-West, carried by the House without removing the growers from the story.",
    teaLink: "Buying for a business?",
    goodsLink: "Meet the people behind the House",
    loadError: "The seasonal catalogue could not be loaded. Please try again.",
    emptyTea: "The seasonal catalogue is being prepared.",
    emptyGoods: "The market table is being prepared.",
    houseMarket: "House market",
    housePack: "House pack",
    limited: "Limited release",
    selection: "House selection",
    priceOnRequest: "Price on request",
    remove: (name) => `Remove ${name}`,
    add: (name) => `Add ${name}`,
    itemCount: (count) => `${count} ${count === 1 ? "item" : "items"}`,
    checkout: "Checkout",
    yourOrder: "Your order",
    closeCart: "Close cart",
    emptyCart: "Your cart is empty.",
    continueTea: "Continue choosing tea",
    estimatedTotal: "Estimated total",
    name: "Name",
    contact: "Phone or email",
    address: "Delivery address",
    tax: "Tax number",
    note: "Note",
    optional: "Optional",
    payment: "Payment",
    bankTransfer: "QR bank transfer",
    cash: "Cash",
    consent: "I agree that the house may use these details to fulfil this order.",
    placing: "Placing order…",
    placeOrder: "Place order",
    soldOut: "One of these teas has just sold out. Refresh the shop and choose again.",
    orderError: "We could not place the order. Your cart is still here—please try again.",
    received: "Order received",
    thanks: (kind) => `Thank you. The house will confirm your ${kind === "goods" ? "goods" : "tea"} shortly.`,
    order: "Order",
    saveOrder: "Save the order number. We will contact you using the phone or email supplied at checkout.",
    returnHome: "Return to the house",
  },
};

export default function TeaShop({ mode = "tea" }) {
  const { locale, toggleLocale } = useLocale();
  const t = COPY[locale];
  const supabase = useMemo(() => createClient(), []);
  const [products, setProducts] = useState([]);
  const [vendors, setVendors] = useState([]);
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
      supabase.from("catalog_variants").select("*"),
      supabase.rpc("list_public_vendors"),
    ]).then(([catalogResult, variantResult, vendorResult]) => {
      if (!live) return;
      if (catalogResult.error || variantResult.error) {
        setError(t.loadError);
      } else {
        const variants = variantResult.data || [];
        setProducts((catalogResult.data || []).map((row) => ({
          ...fromCatalogRow(row),
          variants: variants.filter((v) => v.product_id === row.id).map(fromVariantRow),
        })).filter((item) => mode === "goods" ? item.kind === "goods" : item.kind !== "goods"));
        if (!vendorResult.error) setVendors(vendorResult.data || []);
      }
      setLoading(false);
    });
    return () => { live = false; };
  }, [supabase, mode, t.loadError]);

  const isGoods = mode === "goods";

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
      qty, unit: product.kind === "goods" ? "pcs" : product.line === "everyday" ? "kg" : "pcs", price: price || null, productId: product.id, weight,
    }));
    const { data, error: submitError } = await supabase.rpc("submit_retail_order", {
      p_customer_name: customer.name.trim(), p_contact: customer.contact.trim(), p_address: customer.address.trim(),
      p_tax_number: customer.tax.trim(), p_note: customer.note.trim(), p_lines: orderLines,
      p_total_items: count, p_estimated_total: total || null, p_promo: null, p_payment_method: customer.payment,
    });
    setSending(false);
    if (submitError || !data?.length) {
      setError(submitError?.message?.includes("out_of_stock") ? t.soldOut : t.orderError);
      return;
    }
    setComplete({ id: data[0].id, total });
    setCart({});
    fetch("/api/notify-order", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ orderId: data[0].id }) }).catch(() => {});
  };

  if (complete) return (
    <main className={styles.complete}>
      <span><Check size={18}/></span><p>{t.received}</p><h1>{t.thanks(isGoods ? "goods" : "tea")}</h1>
      <dl><div><dt>{t.order}</dt><dd>{complete.id}</dd></div><div><dt>{t.estimatedTotal}</dt><dd>{money.format(complete.total)}</dd></div></dl>
      <p>{t.saveOrder}</p>
      <Link href="/">{t.returnHome} <ArrowRight size={16}/></Link>
    </main>
  );

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/" className={styles.back}><ArrowLeft size={17}/> {t.back}</Link>
        <div className={styles.headerActions}>
          <button type="button" className={styles.languageButton} onClick={toggleLocale} aria-label={locale === "vi" ? "Switch to English" : "Chuyển sang tiếng Việt"}>
            <Globe2 size={15} aria-hidden="true"/><span>{t.switcher}</span>
          </button>
          <button onClick={() => setCartOpen(true)} className={styles.cartButton} aria-label={t.openCart(count)}>
            <ShoppingBag size={17}/><span>{t.cart}</span><b>{count}</b>
          </button>
        </div>
      </header>

      <section className={styles.intro}>
        <p>{isGoods ? t.goodsEyebrow : t.teaEyebrow}</p>
        <h1>{isGoods ? t.goodsTitle : t.teaTitle}</h1>
        <div><p>{isGoods ? t.goodsIntro : t.teaIntro}</p><Link href={isGoods ? "/story" : "/wholesale"}>{isGoods ? t.goodsLink : t.teaLink} <ArrowRight size={16}/></Link></div>
      </section>

      {loading ? <section className={styles.loading} aria-live="polite"><i/><i/><i/></section> : error && !products.length ? <p className={styles.error} role="alert">{error}</p> : (
        <section className={styles.catalog} aria-label={locale === "vi" ? "Các loại trà hiện có" : "Available teas"}>
          {!products.length && <p className={styles.emptyCatalog}>{isGoods ? t.emptyGoods : t.emptyTea}</p>}
          {products.map((product, index) => {
            const productName = product.name?.[locale] || product.name?.vi || product.name?.en || "";
            const secondaryName = product.name?.[locale === "vi" ? "en" : "vi"] || "";
            const productNotes = product.notes?.[locale] || product.notes?.vi || product.notes?.en || "";
            const choices = product.variants.length ? product.variants : [{ weight: product.packSize || t.housePack, price: product.price }];
            return <article className={styles.product} key={product.id}>
              <figure>{product.photoUrl ? <img src={product.photoUrl} alt={productName} loading={index > 1 ? "lazy" : undefined} style={{objectPosition:product.photoPosition || "50% 50%"}}/> : <span aria-hidden="true">皇龍</span>}</figure>
              <div className={styles.productCopy}><p>{isGoods ? (vendors.find((vendor) => vendor.id === product.vendorId)?.name || t.houseMarket) : product.batch || (product.limited ? t.limited : t.selection)}</p><h2>{productName}</h2>{secondaryName && <span>{secondaryName}</span>}<p>{productNotes}</p></div>
              <div className={styles.variants}>{choices.map((choice) => {
                const key = product.variants.length ? `${product.id}__${choice.weight}` : product.id;
                const n = cart[key] || 0;
                return <div className={styles.variant} key={key}><span><b>{choice.weight}</b><small>{choice.price ? money.format(choice.price) : t.priceOnRequest}</small></span><div><button onClick={() => quantity(key,-1)} disabled={!n} aria-label={t.remove(productName)}><Minus size={14}/></button><output>{n}</output><button onClick={() => quantity(key,1)} aria-label={t.add(productName)}><Plus size={14}/></button></div></div>;
              })}</div>
            </article>;
          })}
        </section>
      )}

      {count > 0 && <button className={styles.cartRail} onClick={() => setCartOpen(true)}><span>{t.itemCount(count)}</span><b>{money.format(total)}</b><span>{t.checkout} <ArrowRight size={16}/></span></button>}

      {cartOpen && <div className={styles.overlay} role="presentation" onMouseDown={(e) => e.target === e.currentTarget && setCartOpen(false)}>
        <aside className={styles.drawer} role="dialog" aria-modal="true" aria-labelledby="cart-title">
          <header><div><p>{t.yourOrder}</p><h2 id="cart-title">{t.cart}</h2></div><button onClick={() => setCartOpen(false)} aria-label={t.closeCart}><X size={19}/></button></header>
          {!lines.length ? <div className={styles.empty}><ShoppingBag size={22}/><p>{t.emptyCart}</p><button onClick={() => setCartOpen(false)}>{t.continueTea}</button></div> : <>
            <div className={styles.lines}>{lines.map((line) => <div key={line.key}><span><b>{line.product.name?.[locale] || line.product.name?.vi || line.product.name?.en}</b><small>{line.weight || line.product.packSize}</small></span><span>{line.qty} × {line.price ? money.format(line.price) : "—"}</span></div>)}</div>
            <form className={styles.checkout} onSubmit={submit}>
              <div className={styles.total}><span>{t.estimatedTotal}</span><b>{money.format(total)}</b></div>
              <label>{t.name}<input required value={customer.name} onChange={(e)=>setCustomer({...customer,name:e.target.value})}/></label>
              <label>{t.contact}<input required value={customer.contact} onChange={(e)=>setCustomer({...customer,contact:e.target.value})}/></label>
              <label>{t.address}<textarea required value={customer.address} onChange={(e)=>setCustomer({...customer,address:e.target.value})}/></label>
              <label>{t.tax} <small>{t.optional}</small><input value={customer.tax} onChange={(e)=>setCustomer({...customer,tax:e.target.value})}/></label>
              <label>{t.note} <small>{t.optional}</small><textarea value={customer.note} onChange={(e)=>setCustomer({...customer,note:e.target.value})}/></label>
              <fieldset><legend>{t.payment}</legend><label><input type="radio" name="payment" checked={customer.payment==="qr"} onChange={()=>setCustomer({...customer,payment:"qr"})}/> {t.bankTransfer}</label><label><input type="radio" name="payment" checked={customer.payment==="cash"} onChange={()=>setCustomer({...customer,payment:"cash"})}/> {t.cash}</label></fieldset>
              <label className={styles.consent}><input type="checkbox" checked={customer.consent} onChange={(e)=>setCustomer({...customer,consent:e.target.checked})}/> {t.consent}</label>
              {error && <p className={styles.error} role="alert">{error}</p>}
              <button className={styles.submit} disabled={sending || !customer.name.trim() || !customer.contact.trim() || !customer.address.trim() || !customer.consent}>{sending ? t.placing : t.placeOrder}<ArrowRight size={16}/></button>
            </form>
          </>}
        </aside>
      </div>}
    </main>
  );
}

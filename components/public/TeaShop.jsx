"use client";
import PolicyLinks from "@/components/PolicyLinks";

import { useState, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Globe2, Minus, Plus, ShoppingBag, X } from "lucide-react";
import { useRetailCart } from "./RetailCartProvider";
import RetailCatalogGrid from "./RetailCatalogGrid";
import RetailProductDetail from "./RetailProductDetail";
import { retailOptions } from "@/lib/retail-catalog";
import { sellingUnitLabel } from "@/lib/selling-units";
import { useLocale } from "@/components/i18n/LocaleProvider";
import styles from "./TeaShop.module.css";

import { useDialogFocus } from "@/components/hooks/useDialogFocus";

const money = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 });

const COPY = {
  vi: {
    back: "House of Hoang Long",
    switcher: "EN",
    cart: "Giỏ hàng",
    openCart: (count) => `Mở giỏ hàng có ${count} sản phẩm`,
    teaEyebrow: "Trà theo mùa · trực tiếp từ Nhà",
    goodsEyebrow: "Sản vật Tây Bắc · được Nhà tuyển chọn",
    teaTitle: "Trà cho bàn trà của bạn.",
    goodsTitle: "Sản vật có người làm và vùng đất phía sau.",
    teaIntro: "Khám phá hương vị, xem cách pha và chọn quy cách phù hợp. Mỗi loại trà có một trang riêng để bạn tìm hiểu trước khi đặt hàng.",
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
    checkout: "Xem giỏ hàng",
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
    orderError: "Chưa nhận được kết quả đặt hàng. Giỏ vẫn được giữ; nếu vừa bấm đặt hàng, hãy liên hệ Nhà để kiểm tra trước khi gửi lại.",
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
    teaTitle: "Tea for your table.",
    goodsTitle: "Produce with a person and place behind it.",
    teaIntro: "Explore taste notes, brewing guidance and available packs. Open a tea to get to know it before placing an order.",
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
    checkout: "View cart",
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
    orderError: "The order result could not be confirmed. Your cart is kept; if you just placed an order, contact the house before submitting again.",
    received: "Order received",
    thanks: (kind) => `Thank you. The house will confirm your ${kind === "goods" ? "goods" : "tea"} shortly.`,
    order: "Order",
    saveOrder: "Save the order number. We will contact you using the phone or email supplied at checkout.",
    returnHome: "Return to the house",
  },
};

export default function TeaShop({ mode = "tea", product = null }) {
  const { locale, toggleLocale } = useLocale();
  const t = COPY[locale];
  const { products: allProducts, vendors, cart, cartOpen, setCartOpen, catalogStatus, cartAdjusted, clearCart, changeQuantity } = useRetailCart();
  const products = allProducts.filter(item => mode === "goods" ? item.kind === "goods" : item.kind !== "goods" && item.line !== "sample");
  const loading = catalogStatus === "loading";
  const cartRef = useRef(null);
  useDialogFocus(cartRef, cartOpen, () => setCartOpen(false));
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [complete, setComplete] = useState(null);
  const [customer, setCustomer] = useState({ name: "", contact: "", address: "", tax: "", note: "", payment: "qr", consent: false });

  const isGoods = mode === "goods";
  const options = allProducts.flatMap(retailOptions);
  const lines = options.filter(option => cart[option.key] > 0).map(option => ({ ...option, qty: cart[option.key] }));
  const count = Object.values(cart).reduce((sum, qty) => sum + qty, 0);
  const total = lines.reduce((sum, line) => sum + line.price * line.qty, 0);
  const quantity = changeQuantity;

  const submit = async (event) => {
    event.preventDefault();
    if (sending || catalogStatus !== "ready" || !lines.length || !customer.name.trim() || !customer.contact.trim() || !customer.address.trim() || !customer.consent) return;
    setSending(true); setError("");
    let result;
    try {
      const response = await fetch("/api/retail-order", { method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ cart, expectedTotal: total, expectedLines: lines.map(line => ({ key: line.key, price: line.price, unit: line.unit, weight: line.weight, packing: line.product.packSize || "" })), customer }) });
      result = await response.json();
      if (!response.ok) throw new Error(result.error || "order_failed");
    } catch (problem) {
      setSending(false);
      setError(problem.message === "cart_changed" || problem.message === "out_of_stock" || problem.message === "price_changed"
        ? (locale === "vi" ? "Giá hoặc quy cách trong giỏ đã thay đổi. Hãy tải lại trang, kiểm tra giỏ rồi đặt lại." : "A price or pack has changed. Reload, review your cart and place the order again.") : t.orderError);
      return;
    }
    setSending(false);
    setComplete({ id: result.orderId, total: result.total });
    clearCart();
    setCartOpen(false);
    fetch("/api/notify-order", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ orderId: result.orderId }) }).catch(() => {});
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
    <main className={styles.page} data-no-translate>
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

      {product ? <RetailProductDetail key={product.id} product={product}/> : <>
        <section className={styles.intro}>
          <p>{isGoods ? t.goodsEyebrow : t.teaEyebrow}</p>
          <h1>{isGoods ? t.goodsTitle : t.teaTitle}</h1>
          <div><p>{isGoods ? t.goodsIntro : t.teaIntro}</p><Link href={isGoods ? "/story" : "/catalog"}>{isGoods ? t.goodsLink : t.teaLink} <ArrowRight size={16}/></Link></div>
        </section>
        {loading ? <section className={styles.loading} aria-label={locale === "vi" ? "Đang tải danh mục" : "Loading catalogue"} aria-live="polite"><i/><i/><i/></section>
          : catalogStatus === "error" ? <div className={styles.loadError} role="alert"><p>{t.loadError}</p><button type="button" onClick={() => window.location.reload()}>{locale === "vi" ? "Tải lại danh mục" : "Reload catalogue"}</button></div>
          : <RetailCatalogGrid products={products} vendors={vendors} locale={locale} cart={cart} quantity={quantity} mode={mode}/>}
      </>}

      {count > 0 && <button className={styles.cartRail} onClick={() => setCartOpen(true)}><span>{t.itemCount(count)}</span><b>{catalogStatus === "ready" ? money.format(total) : "…"}</b><span>{t.checkout} <ArrowRight size={16}/></span></button>}

      <div style={{padding:"24px var(--page-gutter)"}}><PolicyLinks/></div>
      {cartOpen && <div className={styles.overlay} role="presentation" onMouseDown={(e) => e.target === e.currentTarget && setCartOpen(false)}>
        <aside ref={cartRef} tabIndex={-1} className={styles.drawer} role="dialog" aria-modal="true" aria-labelledby="cart-title">
          <header><div><p>{t.yourOrder}</p><h2 id="cart-title">{t.cart}</h2></div><button onClick={() => setCartOpen(false)} aria-label={t.closeCart}><X size={19}/></button></header>
          {cartAdjusted && <p className={styles.cartNotice} role="status">{locale === "vi" ? "Giỏ hàng đã cập nhật theo quy cách và lượng còn có trong danh mục." : "Your cart was updated to match the current packs and availability."}</p>}
          {catalogStatus !== "ready" ? <p role={catalogStatus === "error" ? "alert" : "status"}>{catalogStatus === "error" ? t.loadError : (locale === "vi" ? "Đang kiểm tra giỏ hàng…" : "Checking your cart…")}</p> : !lines.length ? <div className={styles.empty}><ShoppingBag size={22}/><p>{t.emptyCart}</p><button onClick={() => setCartOpen(false)}>{t.continueTea}</button></div> : <>
            <div className={styles.lines}>{lines.map((line) => <div key={line.key}><span><b>{line.product.name?.[locale] || line.product.name?.vi || line.product.name?.en}</b><small>{line.weight || line.product.packSize}</small></span><span>{line.qty} {sellingUnitLabel(line.unit, locale)} × {money.format(line.price)}<span className={styles.lineControls}><button type="button" onClick={()=>quantity(line.key,-1)} aria-label={t.remove(line.product.name?.[locale] || line.product.name?.vi)}><Minus size={14}/></button><button type="button" disabled={line.qty >= 99 || (line.stock !== null && line.qty >= line.stock)} onClick={()=>quantity(line.key,1)} aria-label={t.add(line.product.name?.[locale] || line.product.name?.vi)}><Plus size={14}/></button><button type="button" onClick={()=>quantity(line.key,-line.qty)} aria-label={locale === "vi" ? "Xóa dòng sản phẩm" : "Remove item"}><X size={14}/></button></span></span></div>)}</div>
            <form className={styles.checkout} onSubmit={submit}>
              <div className={styles.total}><span>{t.estimatedTotal}</span><b>{money.format(total)}</b></div>
              <label>{t.name}<input required maxLength={180} autoComplete="name" value={customer.name} onChange={(e)=>setCustomer({...customer,name:e.target.value})}/></label>
              <label>{t.contact}<input required maxLength={240} autoComplete="tel" value={customer.contact} onChange={(e)=>setCustomer({...customer,contact:e.target.value})}/></label>
              <label>{t.address}<textarea required maxLength={1000} autoComplete="street-address" value={customer.address} onChange={(e)=>setCustomer({...customer,address:e.target.value})}/></label>
              <label>{t.tax} <small>{t.optional}</small><input maxLength={80} value={customer.tax} onChange={(e)=>setCustomer({...customer,tax:e.target.value})}/></label>
              <label>{t.note} <small>{t.optional}</small><textarea maxLength={3000} value={customer.note} onChange={(e)=>setCustomer({...customer,note:e.target.value})}/></label>
              <fieldset><legend>{t.payment}</legend><label><input type="radio" name="payment" checked={customer.payment==="qr"} onChange={()=>setCustomer({...customer,payment:"qr"})}/> {t.bankTransfer}</label><label><input type="radio" name="payment" checked={customer.payment==="cash"} onChange={()=>setCustomer({...customer,payment:"cash"})}/> {t.cash}</label></fieldset>
              <label className={styles.consent}><input type="checkbox" checked={customer.consent} onChange={(e)=>setCustomer({...customer,consent:e.target.checked})}/> {t.consent}</label>
              <PolicyLinks/>
              {error && <p className={styles.error} role="alert">{error}</p>}
              <button className={styles.submit} disabled={sending || catalogStatus !== "ready" || !customer.name.trim() || !customer.contact.trim() || !customer.address.trim() || !customer.consent}>{sending ? t.placing : t.placeOrder}<ArrowRight size={16}/></button>
            </form>
          </>}
        </aside>
      </div>}
    </main>
  );
}

"use client";
import PolicyLinks from "@/components/PolicyLinks";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { ArrowRight, Check, Minus, Plus, ShoppingBag, X } from "lucide-react";
import { useRetailCart } from "./RetailCartProvider";
import RetailCatalogGrid from "./RetailCatalogGrid";
import RetailProductDetail from "./RetailProductDetail";
import RetailVolumeOffer from "./RetailVolumeOffer";
import RetailPartnerBanner from "./RetailPartnerBanner";
import RetailTeaBundles from "./RetailTeaBundles";
import PublicSiteHeader from "./PublicSiteHeader";
import { retailOptions } from "@/lib/retail-catalog";
import { RETAIL_CART_MAX } from "@/lib/retail-cart";
import { retailVolumeBenefits } from "@/lib/retail-volume-policy";
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
    teaEyebrow: "Bộ sưu tập trà Hoàng Long",
    goodsEyebrow: "Sản vật Tây Bắc · được Nhà tuyển chọn",
    teaTitle: "Chọn trà hợp gu.",
    goodsTitle: "Sản vật có người làm và vùng đất phía sau.",
    teaIntro: "Bạn thích vị thanh nhẹ, hương hoa hay đậm đà? Khám phá các loại trà, xem cách pha và chọn gói phù hợp.",
    goodsIntro: "Một gian hàng nhỏ dành cho sản vật Tây Bắc, nơi người làm ra sản phẩm vẫn hiện diện trong câu chuyện.",
    teaLink: "Xem trà sỉ cho quán và doanh nghiệp",
    chooseSingle: "Chọn từng loại trà",
    chooseBundle: "Chọn bộ trà theo dịp",
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
    teaEyebrow: "The Hoàng Long tea collection",
    goodsEyebrow: "North-West goods · carried by the house",
    teaTitle: "Find your kind of tea.",
    goodsTitle: "Produce with a person and place behind it.",
    teaIntro: "Prefer a light cup, floral aromas or a fuller flavour? Explore the teas, find brewing guidance and choose your pack.",
    goodsIntro: "A small market for food from the North-West, carried by the House without removing the growers from the story.",
    teaLink: "Explore wholesale tea for cafés and businesses",
    chooseSingle: "Browse individual teas",
    chooseBundle: "Choose a tea set",
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
  const { locale } = useLocale();
  const t = COPY[locale];
  const { retailPartner, partnerCandidate, referralStatus, clearRetailPartner, products: allProducts, vendors, cart, cartOpen, setCartOpen, catalogStatus, cartAdjusted, clearCart, changeQuantity } = useRetailCart();
  const products = allProducts.filter(item => mode === "goods" ? item.kind === "goods" : item.kind !== "goods" && item.line !== "sample");
  const loading = catalogStatus === "loading";
  const cartRef = useRef(null);
  useDialogFocus(cartRef, cartOpen, () => setCartOpen(false));
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [complete, setComplete] = useState(null);
  const [partnerConsent, setPartnerConsent] = useState(false);
  const attemptRef = useRef(null);
  useEffect(() => setPartnerConsent(false), [retailPartner?.slug, retailPartner?.revision]);
  const referralReady = !partnerCandidate && !["loading", "unavailable", "choice"].includes(referralStatus) && (!retailPartner || partnerConsent);
  const [customer, setCustomer] = useState({ name: "", contact: "", address: "", tax: "", note: "", payment: "qr", consent: false });

  const isGoods = mode === "goods";
  const options = allProducts.flatMap(retailOptions);
  const lines = options.filter(option => cart[option.key] > 0).map(option => ({ ...option, qty: cart[option.key] }));
  const count = Object.values(cart).reduce((sum, qty) => sum + qty, 0);
  const benefits = retailVolumeBenefits(lines);
  const total = benefits.total;
  const quantity = changeQuantity;

  const submit = async (event) => {
    event.preventDefault();
    if (sending || !referralReady || catalogStatus !== "ready" || !lines.length || !customer.name.trim() || !customer.contact.trim() || !customer.address.trim() || !customer.consent) return;
    setSending(true); setError("");
    let result;
    const checkout = { cart, expectedTotal: total, expectedLines: lines.map(line => ({ key: line.key, price: line.price, unit: line.unit, weight: line.weight, packing: line.product.packSize || "" })), customer,
      partner: retailPartner ? { slug: retailPartner.slug, revision: retailPartner.revision, consent: partnerConsent } : null };
    const signature = JSON.stringify(checkout);
    if (!attemptRef.current || attemptRef.current.signature !== signature) attemptRef.current = { signature, requestId: crypto.randomUUID() };
    try {
      const response = await fetch("/api/retail-order", { method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...checkout, requestId: attemptRef.current.requestId }) });
      result = await response.json();
      if (!response.ok) throw new Error(result.error || "order_failed");
    } catch (problem) {
      setSending(false);
      if (problem.message === "retail_partner_unavailable") {
        setError(locale === "vi" ? "Trang đối tác đã thay đổi hoặc tạm dừng. Bỏ người giới thiệu để mua trực tiếp, hoặc mở lại liên kết và kiểm tra." : "This introducer is no longer available. Remove them to buy directly, or reopen their link."); return;
      }
      setError(problem.message === "checkout_retry_conflict" ? (locale === "vi" ? "Yêu cầu trước có thông tin khác. Giữ nguyên thông tin để thử lại, hoặc liên hệ Nhà kiểm tra trước khi tạo đơn khác." : "This request conflicts with an earlier attempt. Contact the house before creating another order.") : problem.message === "cart_changed" || problem.message === "out_of_stock" || problem.message === "price_changed"
        ? (locale === "vi" ? "Giá hoặc quy cách trong giỏ đã thay đổi. Hãy tải lại trang, kiểm tra giỏ rồi đặt lại." : "A price or pack has changed. Reload, review your cart and place the order again.") : t.orderError);
      return;
    }
    setSending(false);
    setComplete({ id: result.orderId, total: result.total });
    attemptRef.current = null;
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
      <PublicSiteHeader>
        <button type="button" onClick={() => setCartOpen(true)} className={styles.cartButton} aria-label={t.openCart(count)}>
          <ShoppingBag size={17} aria-hidden="true"/><span>{t.cart}</span><b>{count}</b>
        </button>
      </PublicSiteHeader>

      <RetailPartnerBanner locale={locale}/>
      {product ? <RetailProductDetail key={product.id} product={product}/> : <>
        <section className={styles.intro}>
          <p>{isGoods ? t.goodsEyebrow : t.teaEyebrow}</p>
          <h1>{isGoods ? t.goodsTitle : t.teaTitle}</h1>
          <div><p>{isGoods ? t.goodsIntro : t.teaIntro}</p><Link href={isGoods ? "/story" : "/catalog"}>{isGoods ? t.goodsLink : t.teaLink} <ArrowRight size={16}/></Link></div>
          {!isGoods && <RetailVolumeOffer locale={locale}/>}
        </section>
        {!isGoods && <nav className={styles.shopChoices} aria-label={locale === "vi" ? "Cách chọn trà" : "Ways to choose tea"}><a href="#tea-selection">{t.chooseSingle}</a><a href="#tea-bundles">{t.chooseBundle}<ArrowRight size={16} aria-hidden="true"/></a></nav>}
        {loading ? <section className={styles.loading} aria-label={locale === "vi" ? "Đang tải danh mục" : "Loading catalogue"} aria-live="polite"><i/><i/><i/></section>
          : catalogStatus === "error" ? <div className={styles.loadError} role="alert"><p>{t.loadError}</p><button type="button" onClick={() => window.location.reload()}>{locale === "vi" ? "Tải lại danh mục" : "Reload catalogue"}</button></div>
          : <><div id={isGoods ? undefined : "tea-selection"}><RetailCatalogGrid products={products} vendors={vendors} locale={locale} cart={cart} quantity={quantity} mode={mode}/></div>{!isGoods && <RetailTeaBundles locale={locale}/>}</>}
      </>}

      {count > 0 && <button className={styles.cartRail} onClick={() => setCartOpen(true)}><span>{t.itemCount(count)}</span><b>{catalogStatus === "ready" ? money.format(total) : "…"}</b><span>{t.checkout} <ArrowRight size={16}/></span></button>}

      <div style={{padding:"24px var(--page-gutter)"}}><PolicyLinks/></div>
      {cartOpen && <div className={styles.overlay} role="presentation" onMouseDown={(e) => e.target === e.currentTarget && setCartOpen(false)}>
        <aside ref={cartRef} tabIndex={-1} className={styles.drawer} role="dialog" aria-modal="true" aria-labelledby="cart-title">
          <header><div><p>{t.yourOrder}</p><h2 id="cart-title">{t.cart}</h2></div><button onClick={() => setCartOpen(false)} aria-label={t.closeCart}><X size={19}/></button></header>
          {cartAdjusted && <p className={styles.cartNotice} role="status">{locale === "vi" ? "Giỏ hàng đã cập nhật theo quy cách và lượng còn có trong danh mục." : "Your cart was updated to match the current packs and availability."}</p>}
          {catalogStatus !== "ready" ? <p role={catalogStatus === "error" ? "alert" : "status"}>{catalogStatus === "error" ? t.loadError : (locale === "vi" ? "Đang kiểm tra giỏ hàng…" : "Checking your cart…")}</p> : !lines.length ? <div className={styles.empty}><ShoppingBag size={22}/><p>{t.emptyCart}</p><button onClick={() => setCartOpen(false)}>{t.continueTea}</button></div> : <>
            <div className={styles.lines}>{lines.map((line) => <div key={line.key}><span><b>{line.product.name?.[locale] || line.product.name?.vi || line.product.name?.en}</b><small>{line.weight || line.product.packSize}</small></span><span>{line.qty} {sellingUnitLabel(line.unit, locale)} × {money.format(line.price)}<span className={styles.lineControls}><button type="button" onClick={()=>quantity(line.key,-1)} aria-label={t.remove(line.product.name?.[locale] || line.product.name?.vi)}><Minus size={14}/></button><input className={styles.quantityInput} type="number" inputMode="numeric" min={1} max={Math.min(RETAIL_CART_MAX,line.stock ?? RETAIL_CART_MAX)} value={line.qty} aria-label={`${locale === 'vi' ? 'Số lượng' : 'Quantity'} ${line.product.name?.[locale] || line.product.name?.vi}`} onChange={event=>{const value=Number(event.target.value);if(Number.isInteger(value)&&value>0&&value<=RETAIL_CART_MAX)quantity(line.key,value-line.qty)}}/><button type="button" disabled={line.qty >= RETAIL_CART_MAX || (line.stock !== null && line.qty >= line.stock)} onClick={()=>quantity(line.key,1)} aria-label={t.add(line.product.name?.[locale] || line.product.name?.vi)}><Plus size={14}/></button><button type="button" onClick={()=>quantity(line.key,-line.qty)} aria-label={locale === "vi" ? "Xóa dòng sản phẩm" : "Remove item"}><X size={14}/></button></span></span></div>)}</div>
            <form className={styles.checkout} onSubmit={submit}>
              <RetailVolumeOffer benefits={benefits} locale={locale}/>
              {benefits.discount > 0 && <div className={styles.discountBreakdown}><span>{locale === 'vi' ? 'Tiền hàng trước ưu đãi' : 'Before volume discount'}<b>{money.format(benefits.subtotal)}</b></span><span>{locale === 'vi' ? `Ưu đãi trà ${benefits.percent}%` : `Tea discount ${benefits.percent}%`}<b>−{money.format(benefits.discount)}</b></span></div>}
              <div className={styles.total}><span>{t.estimatedTotal}</span><b>{money.format(total)}</b></div>
              <label>{t.name}<input required maxLength={180} autoComplete="name" value={customer.name} onChange={(e)=>setCustomer({...customer,name:e.target.value})}/></label>
              <label>{t.contact}<input required maxLength={240} autoComplete="tel" value={customer.contact} onChange={(e)=>setCustomer({...customer,contact:e.target.value})}/></label>
              <label>{t.address}<textarea required maxLength={1000} autoComplete="street-address" value={customer.address} onChange={(e)=>setCustomer({...customer,address:e.target.value})}/></label>
              <label>{t.tax} <small>{t.optional}</small><input maxLength={80} value={customer.tax} onChange={(e)=>setCustomer({...customer,tax:e.target.value})}/></label>
              <label>{t.note} <small>{t.optional}</small><textarea maxLength={3000} value={customer.note} onChange={(e)=>setCustomer({...customer,note:e.target.value})}/></label>
              <fieldset><legend>{t.payment}</legend><label><input type="radio" name="payment" checked={customer.payment==="qr"} onChange={()=>setCustomer({...customer,payment:"qr"})}/> {t.bankTransfer}</label><label><input type="radio" name="payment" checked={customer.payment==="cash"} onChange={()=>setCustomer({...customer,payment:"cash"})}/> {t.cash}</label></fieldset>
              <label className={styles.consent}><input type="checkbox" checked={customer.consent} onChange={(e)=>setCustomer({...customer,consent:e.target.checked})}/> {t.consent}</label>
              {retailPartner && <label className={styles.consent}><input type="checkbox" checked={partnerConsent} onChange={event=>setPartnerConsent(event.target.checked)}/><span>{locale === "vi" ? `Tôi đồng ý chia sẻ tên, liên hệ và tiến độ đơn này với ${retailPartner.display_name} để tư vấn, chăm sóc và ghi nhận giới thiệu. Không chia sẻ địa chỉ giao hàng hay thông tin thanh toán.` : `I agree to share my name, contact and this order’s progress with ${retailPartner.display_name} for assistance and referral tracking. Delivery address and payment details are not shared.`} <button type="button" onClick={clearRetailPartner}>{locale === "vi" ? "Mua trực tiếp, không chia sẻ" : "Buy directly without sharing"}</button></span></label>}
              {!referralReady && !retailPartner && <p className={styles.cartNotice}>{locale === "vi" ? "Hãy chọn người giới thiệu hoặc tiếp tục mua trực tiếp ở thông báo đầu trang." : "Choose your introducer or continue buying directly in the banner above."}<button type="button" onClick={clearRetailPartner}>{locale === "vi" ? "Tiếp tục mua trực tiếp" : "Continue buying directly"}</button></p>}
              <PolicyLinks/>
              {error && <p className={styles.error} role="alert">{error}</p>}
              <button className={styles.submit} disabled={sending || !referralReady || catalogStatus !== "ready" || !customer.name.trim() || !customer.contact.trim() || !customer.address.trim() || !customer.consent}>{sending ? t.placing : t.placeOrder}<ArrowRight size={16}/></button>
            </form>
          </>}
        </aside>
      </div>}
    </main>
  );
}

"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Minus, Plus, ShoppingBag, Truck, X } from "lucide-react";
import { useDialogFocus } from "@/components/hooks/useDialogFocus";
import { RETAIL_CART_MAX } from "@/lib/retail-cart";
import { sellingUnitLabel } from "@/lib/selling-units";
import { useRetailCart } from "./RetailCartProvider";
import styles from "./TeaShop.module.css";

const currency = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 });
const money = value => currency.format(value);
const emptyCustomer = { name: "", contact: "", address: "", tax: "", note: "", payment: "qr", consent: false };

function CartLine({ line, locale, changeQuantity }) {
  const vi = locale === "vi";
  const name = line.product.name?.[locale] || line.product.name?.vi || line.product.name?.en;
  const pack = line.displayWeight || line.weight || (line.unit === "kg" ? "" : line.product.packSize) || sellingUnitLabel(line.unit, locale);
  const max = Math.min(RETAIL_CART_MAX, line.stock ?? RETAIL_CART_MAX);
  const [input, setInput] = useState(null);
  function commit() {
    const value = Number(input);
    if (input !== null && Number.isInteger(value) && value >= 1) changeQuantity(line.key, Math.min(value, max) - line.qty);
    setInput(null);
  }
  return <li className={styles.cartLine}>
    <div className={styles.cartImage} aria-hidden="true">
      {line.product.photoUrl
        ? <img src={line.product.photoUrl} alt="" loading="lazy" style={{objectPosition: line.product.photoPosition || undefined}} />
        : <ShoppingBag size={20} />}
    </div>
    <div className={styles.itemDetails}>
      <strong>{name}</strong>
      <small>{pack} · {money(line.price)}/{sellingUnitLabel(line.unit, locale)}</small>
      <div className={styles.itemControls}>
        <div className={styles.stepper}>
          <button type="button" disabled={line.qty <= 1} onClick={() => changeQuantity(line.key, -1)} aria-label={vi ? `Bớt ${name}` : `Remove one ${name}`}><Minus size={16} aria-hidden="true" /></button>
          <input type="text" inputMode="numeric" aria-label={vi ? `Số lượng ${name} ${pack}` : `Quantity of ${name} ${pack}`} value={input ?? line.qty}
            onChange={event => { if (/^\d{0,4}$/.test(event.target.value)) setInput(event.target.value); }} onBlur={commit}
            onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); event.currentTarget.blur(); } }} />
          <button type="button" disabled={line.qty >= max} onClick={() => changeQuantity(line.key, 1)} aria-label={vi ? `Thêm ${name}` : `Add one ${name}`}><Plus size={16} aria-hidden="true" /></button>
        </div>
        <button className={styles.removeItem} type="button" onClick={() => changeQuantity(line.key, -line.qty)} aria-label={vi ? `Xóa ${name} khỏi giỏ hàng` : `Remove ${name} from cart`}>{vi ? "Xóa" : "Remove"}</button>
      </div>
    </div>
    <b className={styles.lineTotal}>{money(line.price * line.qty)}</b>
  </li>;
}

function Summary({ benefits, vi }) {
  const free = benefits.freeShippingEligible;
  return <dl className={styles.priceSummary}>
    <div><dt>{vi ? "Tiền hàng" : "Items subtotal"}</dt><dd>{money(benefits.subtotal)}</dd></div>
    {benefits.discount > 0 && <div className={styles.savings}><dt>{vi ? `Ưu đãi trà ${benefits.percent}%` : `Tea discount ${benefits.percent}%`}</dt><dd>−{money(benefits.discount)}</dd></div>}
    <div><dt>{vi ? "Phí giao hàng" : "Delivery"}</dt>
      <dd>{free ? (vi ? "Miễn phí giao tiêu chuẩn trong nước" : "Free standard delivery in Vietnam") : (vi ? "Xác nhận theo địa chỉ" : "Confirmed after address review")}</dd></div>
  </dl>;
}

export default function RetailCheckoutDrawer({ locale, lines, benefits, onOrder }) {
  const vi = locale === "vi";
  const { cart, cartOpen, setCartOpen, catalogStatus, cartAdjusted, changeQuantity, retailPartner, partnerCandidate, referralStatus, confirmRetailPartner, clearRetailPartner } = useRetailCart();
  const [view, setView] = useState("cart");
  const [customer, setCustomer] = useState(emptyCustomer);
  const [partnerConsent, setPartnerConsent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const dialog = useRef(null);
  const body = useRef(null);
  const title = useRef(null);
  const attempt = useRef(null);
  const inFlight = useRef(false);
  const formId = useId();
  const headingId = useId();
  const errorRef = useRef(null);
  const titleView = useRef("cart");
  const canCheckout = catalogStatus === "ready" && lines.length > 0;
  const checkingOut = canCheckout && view === "delivery";
  const referralReady = !partnerCandidate && !["loading", "unavailable", "choice"].includes(referralStatus) && (!retailPartner || partnerConsent);

  function close() {
    if (!inFlight.current) {
      titleView.current = "cart";
      setCartOpen(false);
      setView("cart");
    }
  }
  useDialogFocus(dialog, cartOpen, close);

  useEffect(() => {
    if (!cartOpen) return;
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = "hidden";
    return () => { root.style.overflow = previous; };
  }, [cartOpen]);

  useEffect(() => {
    if (!cartOpen || titleView.current === view) return;
    titleView.current = view;
    body.current?.scrollTo({ top: 0 });
    title.current?.focus({ preventScroll: true });
  }, [cartOpen, view]);

  useEffect(() => setPartnerConsent(false), [retailPartner?.slug, retailPartner?.revision]);
  useEffect(() => { if (error && cartOpen && checkingOut) errorRef.current?.focus(); }, [error, cartOpen, checkingOut]);

  function setField(key, value) {
    setCustomer(current => ({ ...current, [key]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    if (inFlight.current || !canCheckout) return;
    if (!referralReady || !customer.consent || !customer.name.trim() || !customer.contact.trim() || !customer.address.trim()) {
      setError(vi ? "Kiểm tra thông tin giao hàng và các lựa chọn đồng ý rồi thử lại." : "Check the delivery details and consent before placing your order.");
      return;
    }
    inFlight.current = true;
    setSending(true);
    setError("");
    const checkout = {
      cart,
      expectedTotal: benefits.total,
      expectedLines: lines.map(line => ({ key: line.key, price: line.price, unit: line.unit, weight: line.weight, packing: line.product.packSize || "" })),
      customer,
      partner: retailPartner ? { slug: retailPartner.slug, revision: retailPartner.revision, consent: partnerConsent } : null,
    };
    const signature = JSON.stringify(checkout);
    if (attempt.current?.signature !== signature) attempt.current = { signature, requestId: crypto.randomUUID() };
    try {
      const response = await fetch("/api/retail-order", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...checkout, requestId: attempt.current.requestId }),
      });
      const result = await response.json();
      if (!response.ok || !result.orderId) throw new Error(result.error || "order_failed");
      attempt.current = null;
      setCustomer(emptyCustomer);
      setView("cart");
      onOrder({ id: result.orderId, total: result.total });
    } catch (problem) {
      const changed = ["cart_changed", "out_of_stock", "price_changed"].includes(problem.message);
      if (changed) setError(vi ? "Giá, quy cách hoặc tồn kho đã thay đổi. Tải lại trang rồi kiểm tra giỏ hàng." : "A price, pack or stock level changed. Refresh and review your cart.");
      else if (problem.message === "retail_partner_unavailable") setError(vi ? "Người giới thiệu hiện không khả dụng. Hãy mua trực tiếp hoặc mở lại liên kết giới thiệu." : "The introducer is unavailable. Buy directly or reopen their referral link.");
      else if (problem.message === "checkout_retry_conflict") setError(vi ? "Đơn này trùng với một yêu cầu trước đó. Liên hệ Hoàng Long để kiểm tra trước khi đặt lại." : "This order conflicts with an earlier attempt. Contact Hoàng Long before placing it again.");
      else if (["invalid_checkout", "invalid_partner_contact", "partner_consent_required"].includes(problem.message)) setError(vi ? "Kiểm tra thông tin giao hàng và các lựa chọn đồng ý, rồi thử lại." : "Check your delivery details and consent, then try again.");
      else setError(vi ? "Chưa xác nhận được đơn. Giỏ hàng vẫn được giữ. Thử lại với cùng thông tin hoặc liên hệ Hoàng Long để kiểm tra." : "We couldn’t confirm the order. Your cart is saved. Retry with the same details or contact Hoàng Long to check.");
    } finally {
      inFlight.current = false;
      setSending(false);
    }
  }

  if (!cartOpen) return null;
  const paymentChoices = [
    ["qr", vi ? "Chuyển khoản QR" : "QR bank transfer", vi ? "Chuyển khoản theo hướng dẫn sau khi xác nhận đơn." : "Transfer using the instructions in your order confirmation."],
    ["cash", vi ? "Tiền mặt" : "Cash", vi ? "Hoàng Long sẽ xác nhận cách thu tiền theo đơn." : "Hoàng Long will confirm how cash payment will be collected."],
  ];
  const blockedReferral = !retailPartner && !referralReady;
  return <div className={styles.overlay} onClick={event => { if (event.target === event.currentTarget) close(); }}>
    <aside ref={dialog} tabIndex={-1} className={styles.drawer} role="dialog" aria-modal="true" aria-labelledby={headingId}>
      <header className={styles.drawerHead}>
        {checkingOut && <button type="button" disabled={sending} onClick={() => setView("cart")} aria-label={vi ? "Quay lại giỏ hàng" : "Back to cart"}><ArrowLeft size={20} aria-hidden="true" /></button>}
        <h2 id={headingId} ref={title} tabIndex={-1}>{checkingOut ? (vi ? "Đặt hàng" : "Checkout") : (vi ? "Giỏ hàng" : "Cart")}</h2>
        <button type="button" disabled={sending} onClick={close} aria-label={vi ? "Đóng giỏ hàng" : "Close cart"}><X size={20} aria-hidden="true" /></button>
      </header>
      <div ref={body} className={styles.drawerBody}>
        {cartAdjusted && <p className={styles.cartNotice} role="status">{vi ? "Giỏ hàng đã cập nhật theo quy cách và tồn kho hiện tại." : "Your cart has been updated to match current packs and stock."}</p>}
        {catalogStatus === "error" ? <div className={styles.empty} role="alert"><p>{vi ? "Chưa kiểm tra được giỏ hàng." : "We couldn’t check your cart."}</p><button type="button" onClick={() => window.location.reload()}>{vi ? "Tải lại trang" : "Reload page"}</button></div>
          : catalogStatus !== "ready" ? <p role="status">{vi ? "Đang kiểm tra giỏ hàng…" : "Checking your cart…"}</p>
          : !lines.length ? <div className={styles.empty}><ShoppingBag size={28} aria-hidden="true" /><b>{vi ? "Giỏ hàng đang trống" : "Your cart is empty"}</b><button type="button" onClick={close}>{vi ? "Tiếp tục chọn trà" : "Continue shopping"}</button></div>
          : checkingOut ? <form id={formId} className={styles.checkout} onSubmit={submit}>
            <section className={styles.checkoutSection}>
              <h3>{vi ? "Thông tin giao hàng" : "Delivery details"}</h3>
              <label>{vi ? "Họ tên người nhận" : "Recipient name"}<input required maxLength={180} autoComplete="shipping name" value={customer.name} onChange={event => setField("name", event.target.value)} /></label>
              <label>{vi ? "Số điện thoại hoặc email" : "Phone or email"}<input required maxLength={240} autoComplete="section-delivery tel" autoCapitalize="none" value={customer.contact} onChange={event => setField("contact", event.target.value)} /></label>
              <label>{vi ? "Địa chỉ giao hàng" : "Delivery address"}<textarea required rows={2} maxLength={1000} autoComplete="shipping street-address" value={customer.address} onChange={event => setField("address", event.target.value)} /></label>
              <details className={styles.optionalFields}>
                <summary>{vi ? "Thêm ghi chú hoặc mã số thuế" : "Add a note or tax number"}</summary>
                <label>{vi ? "Ghi chú" : "Order note"}<textarea rows={2} maxLength={3000} value={customer.note} onChange={event => setField("note", event.target.value)} /></label>
                <label>{vi ? "Mã số thuế" : "Tax number"}<input maxLength={80} value={customer.tax} onChange={event => setField("tax", event.target.value)} /></label>
              </details>
            </section>
            <fieldset className={styles.payment}><legend>{vi ? "Thanh toán" : "Payment"}</legend>
              {paymentChoices.map(([id, label, detail]) => <label key={id} data-selected={customer.payment === id}>
                <input type="radio" name="payment" checked={customer.payment === id} onChange={() => setField("payment", id)} />
                <span><b>{label}</b><small>{detail}</small></span>
              </label>)}
            </fieldset>
            <section className={styles.checkoutSection}>
              <h3>{vi ? "Tóm tắt đơn" : "Order summary"}</h3>
              <details className={styles.orderReview}>
                <summary>{vi ? "Xem sản phẩm trong đơn" : "Review items in your order"}</summary>
                <ul>{lines.map(line => {
                  const pack = line.displayWeight || line.weight || sellingUnitLabel(line.unit, locale);
                  return <li key={line.key}><span>{line.qty} × {line.product.name?.[locale] || line.product.name?.vi || line.product.name?.en} · {pack}</span><b>{money(line.price * line.qty)}</b></li>;
                })}</ul>
              </details>
              <Summary benefits={benefits} vi={vi} />
              <label className={styles.consent}><input type="checkbox" required checked={customer.consent} onChange={event => setField("consent", event.target.checked)} /><span>{vi ? "Tôi đồng ý cho Hoàng Long dùng thông tin trên để xử lý và giao đơn hàng." : "I agree that Hoàng Long may use these details to fulfil my order."}</span></label>
              {retailPartner && <div className={styles.partnerConsent}>
                <label className={styles.consent}><input type="checkbox" required checked={partnerConsent} onChange={event => setPartnerConsent(event.target.checked)} /><span>{vi
                  ? `Tôi đồng ý chia sẻ tên, liên hệ và tiến độ đơn với ${retailPartner.display_name} để được hỗ trợ và ghi nhận giới thiệu. Địa chỉ giao hàng và thông tin thanh toán được giữ riêng.`
                  : `I agree to share my name, contact and order progress with ${retailPartner.display_name} for support and referral tracking. Delivery and payment details stay private.`}</span></label>
                <button type="button" className={styles.textButton} onClick={clearRetailPartner}>{vi ? "Mua trực tiếp, không chia sẻ" : "Buy directly without sharing"}</button>
              </div>}
              {blockedReferral && <div className={styles.partnerConsent}>
                <p>{partnerCandidate ? (vi ? `Bạn đang mua qua giới thiệu của ${partnerCandidate.display_name}.` : `You’ve opened a referral from ${partnerCandidate.display_name}.`)
                  : (vi ? "Thông tin giới thiệu chưa xác nhận được." : "The referral has not been confirmed.")}</p>
                {partnerCandidate && <button type="button" className={styles.textButton} onClick={confirmRetailPartner}>{vi ? "Chọn người giới thiệu này" : "Choose this introducer"}</button>}
                <button type="button" className={styles.textButton} onClick={clearRetailPartner}>{vi ? "Mua trực tiếp" : "Buy directly"}</button>
              </div>}
              <nav className={styles.policyLinks} aria-label={vi ? "Chính sách mua hàng" : "Purchase policies"}>
                <Link target="_blank" rel="noopener noreferrer" href="/shipping">{vi ? "Giao nhận" : "Delivery"}</Link>
                <Link target="_blank" rel="noopener noreferrer" href="/returns">{vi ? "Đổi trả" : "Returns"}</Link>
                <Link target="_blank" rel="noopener noreferrer" href="/terms">{vi ? "Điều khoản" : "Terms"}</Link>
                <Link target="_blank" rel="noopener noreferrer" href="/privacy">{vi ? "Quyền riêng tư" : "Privacy"}</Link>
              </nav>
              {error && <p ref={errorRef} tabIndex={-1} className={styles.error} role="alert">{error}</p>}
            </section>
          </form> : <>
            <ul className={styles.cartItems}>{lines.map(line => <CartLine key={line.key} line={line} locale={locale} changeQuantity={changeQuantity} />)}</ul>
            <Summary benefits={benefits} vi={vi} />
            <p className={styles.deliveryNote}>{benefits.freeShippingEligible ? <Check size={16} aria-hidden="true" /> : <Truck size={16} aria-hidden="true" />}
              {vi ? "Hoàng Long xác nhận phí giao và tổng tiền trước khi bạn thanh toán." : "Hoàng Long confirms delivery costs and the final total before you pay."}</p>
          </>}
      </div>
      {canCheckout && <footer className={styles.drawerFooter}>
        <div className={styles.total} aria-live="polite"><span>{vi ? "Tạm tính" : "Estimated total"}</span><b>{money(benefits.total)}</b></div>
        {checkingOut
          ? <button key="submit" className={styles.submit} type="submit" form={formId} disabled={sending}>{sending ? (vi ? "Đang gửi đơn…" : "Placing order…") : (vi ? "Đặt hàng" : "Place order")}<ArrowRight size={17} aria-hidden="true" /></button>
          : <button key="continue" className={styles.submit} type="button" onClick={event => { event.preventDefault(); setView("delivery"); }}>{vi ? "Tiếp tục đặt hàng" : "Continue to checkout"}<ArrowRight size={17} aria-hidden="true" /></button>}
      </footer>}
    </aside>
  </div>;
}

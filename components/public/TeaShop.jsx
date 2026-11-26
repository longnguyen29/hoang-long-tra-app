"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Copy, ShoppingBag } from "lucide-react";
import PolicyLinks from "@/components/PolicyLinks";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { retailOptions } from "@/lib/retail-catalog";
import { retailVolumeBenefits } from "@/lib/retail-volume-policy";
import { useRetailCart } from "./RetailCartProvider";
import RetailCatalogGrid, { RetailCatalogSkeleton } from "./RetailCatalogGrid";
import RetailCheckoutDrawer from "./RetailCheckoutDrawer";
import RetailProductDetail from "./RetailProductDetail";
import RetailVolumeOffer from "./RetailVolumeOffer";
import RetailPartnerBanner from "./RetailPartnerBanner";
import RetailTeaBundles from "./RetailTeaBundles";
import CuratedTeaSelection from "./CuratedTeaSelection";
import useCuratedTeas from "./useCuratedTeas";
import PublicSiteHeader from "./PublicSiteHeader";
import styles from "./TeaShop.module.css";

const money = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 });

function ShopFooter({ vi }) {
  return <footer className={styles.shopFooter}>
    <PolicyLinks className={styles.policyLinks} />
    <Link href="/privacy">{vi ? "Quyền riêng tư" : "Privacy"}</Link>
    <div id="shop-cookie-preferences" />
  </footer>;
}

function OrderReceived({ order, isGoods, locale, onContinue }) {
  const vi = locale === "vi";
  const heading = useRef(null);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
    heading.current?.focus({ preventScroll: true });
  }, []);
  async function copyOrder() {
    try { await navigator.clipboard.writeText(order.id); setCopied(true); }
    catch { setCopied(false); }
  }
  return <main className={styles.page} data-no-translate>
    <PublicSiteHeader />
    <section className={styles.complete}>
      <span className={styles.completeMark}><Check size={24} aria-hidden="true" /></span>
      <h1 ref={heading} tabIndex={-1}>{vi ? "Hoàng Long đã nhận đơn" : "Hoàng Long received your order"}</h1>
      <p>{vi ? "Chúng tôi sẽ liên hệ để xác nhận đơn, phí giao và cách thanh toán." : "We’ll contact you to confirm your order, delivery costs and how to pay."}</p>
      <dl className={styles.receiptDetails}>
        <div><dt>{vi ? "Mã đơn" : "Order number"}</dt><dd><code>{order.id}</code><button type="button" onClick={copyOrder} aria-label={vi ? "Sao chép mã đơn" : "Copy order number"}><Copy size={16} aria-hidden="true" /></button></dd></div>
        <div><dt>{vi ? "Tạm tính" : "Estimated total"}</dt><dd><b>{money.format(order.total)}</b></dd></div>
      </dl>
      {copied && <small role="status">{vi ? "Đã sao chép mã đơn" : "Order number copied"}</small>}
      <Link className={styles.continue} href={isGoods ? "/goods" : "/shop"} onClick={event => {
        // The listing can be the same route as the receipt.
        if (!event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey && window.location.pathname === (isGoods ? "/goods" : "/shop")) {
          event.preventDefault();
          onContinue();
        }
      }}>{vi ? "Tiếp tục mua sắm" : "Continue shopping"} <ArrowRight size={16} aria-hidden="true" /></Link>
    </section>
    <ShopFooter vi={vi} />
  </main>;
}

export default function TeaShop({ mode = "tea", product = null }) {
  const { locale } = useLocale();
  const vi = locale === "vi";
  const isGoods = mode === "goods";
  const curated = useCuratedTeas(!isGoods);
  const { products: allProducts, vendors, cart, setCartOpen, catalogStatus, clearCart, changeQuantity } = useRetailCart();
  const [complete, setComplete] = useState(null);
  const products = allProducts.filter(item => isGoods ? item.kind === "goods" : item.kind !== "goods" && item.line !== "sample");
  const lines = allProducts.flatMap(retailOptions).filter(option => cart[option.key] > 0).map(option => ({ ...option, qty: cart[option.key] }));
  const count = Object.values(cart).reduce((sum, qty) => sum + qty, 0);
  const benefits = retailVolumeBenefits(lines);
  const cartLabel = vi ? `Mở giỏ hàng có ${count} sản phẩm` : `Open cart with ${count} items`;

  function receiveOrder(order) {
    clearCart();
    setCartOpen(false);
    setComplete(order);
    fetch("/api/notify-order", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ orderId: order.id }) }).catch(() => {});
  }

  if (complete) return <OrderReceived order={complete} isGoods={isGoods} locale={locale} onContinue={() => setComplete(null)} />;

  return <main className={styles.page} data-no-translate>
    <PublicSiteHeader>
      <button type="button" onClick={() => setCartOpen(true)} className={styles.cartButton} aria-label={cartLabel}>
        <ShoppingBag size={19} aria-hidden="true" /><span>{vi ? "Giỏ hàng" : "Cart"}</span><b>{count}</b>
      </button>
    </PublicSiteHeader>

    <RetailPartnerBanner locale={locale} />
    {product ? <RetailProductDetail key={product.id} product={product} curatedSelection={curated.entries.find(entry => entry.productId === product.id)} /> : <>
      <section className={styles.intro}>
        <div>
          <h1>{isGoods ? (vi ? "Sản vật Tây Bắc" : "Northwest pantry") : (vi ? "Chọn trà hợp gu" : "Find your kind of tea")}</h1>
          <p>{isGoods ? (vi ? "Sản vật từ những người làm nghề ở Tây Bắc." : "Food from independent producers in Vietnam’s Northwest.")
            : (vi ? "Trà thanh, hương hoa hay vị đậm. Chọn theo gu và xem giá từng gói." : "Light, floral or full-bodied. Browse by taste and see the price per pack.")}</p>
        </div>
        {!isGoods && <nav className={styles.shopChoices} aria-label={vi ? "Khám phá cửa hàng" : "Explore the shop"}>
          <a href="#tea-bundles">{vi ? "Bộ trà theo dịp" : "Tea sets"} <ArrowRight size={14} aria-hidden="true" /></a>
          <a href="#partner-teas">{vi ? "Trà tuyển chọn" : "Selected partner teas"} <ArrowRight size={14} aria-hidden="true" /></a>
        </nav>}
      </section>
      <div id={isGoods ? undefined : "tea-selection"}>
        {catalogStatus === "loading" ? <RetailCatalogSkeleton label={vi ? "Đang tải danh mục…" : "Loading catalogue…"} />
          : catalogStatus === "error" ? <div className={styles.loadError} role="alert">
            <p>{vi ? "Chưa tải được danh mục." : "We couldn’t load the catalogue."}</p>
            <button type="button" onClick={() => window.location.reload()}>{vi ? "Tải lại danh mục" : "Reload catalogue"}</button>
          </div>
          : <RetailCatalogGrid products={products} vendors={vendors} locale={locale} cart={cart} quantity={changeQuantity} mode={mode} />}
      </div>
      {catalogStatus === "ready" && !isGoods && <>
        <RetailTeaBundles locale={locale} />
        <CuratedTeaSelection products={products} state={curated} locale={locale} />
        <div className={styles.shopExtras}>
          <RetailVolumeOffer locale={locale} />
          <Link href="/catalog">{vi ? "Mua trà cho quán và doanh nghiệp" : "Wholesale tea for cafés and businesses"} <ArrowRight size={15} aria-hidden="true" /></Link>
        </div>
      </>}
    </>}
    {count > 0 && <button className={styles.cartRail} data-product={Boolean(product)} type="button" onClick={() => setCartOpen(true)}>
      <ShoppingBag size={19} aria-hidden="true" />
      <span>{vi ? `${count} sản phẩm` : `${count} ${count === 1 ? "item" : "items"}`}<b>{catalogStatus === "ready" ? money.format(benefits.total) : "…"}</b></span>
      <strong>{vi ? "Xem giỏ hàng" : "View cart"} <ArrowRight size={17} aria-hidden="true" /></strong>
    </button>}
    <ShopFooter vi={vi} />
    <RetailCheckoutDrawer locale={locale} lines={lines} benefits={benefits} onOrder={receiveOrder} />
  </main>;
}

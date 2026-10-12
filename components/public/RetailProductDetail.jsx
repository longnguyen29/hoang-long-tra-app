"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Minus, Plus, ShoppingBag } from "lucide-react";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { EVENT_CONTACT } from "@/lib/event-contact";
import { retailOptions, retailProductFacts, retailProductHref } from "@/lib/retail-catalog";
import { sellingUnitLabel } from "@/lib/selling-units";
import { tradeEnquiryHref } from "@/lib/trade-catalog";
import { useRetailCart } from "./RetailCartProvider";
import styles from "./RetailProductDetail.module.css";

const money = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 });

const COPY = {
  vi: {
    back: "Tất cả trà", photoMissing: "Ảnh sản phẩm đang được cập nhật", photoError: "Chưa tải được ảnh sản phẩm",
    flavors: "Hương vị", packing: "Chọn quy cách", defaultPack: "Quy cách hiện có", quantity: "Số lượng",
    orderUnit: "Đơn vị đặt hàng", recordedPacking: "Thông tin đóng gói", unitPrice: "Giá theo đơn vị đặt hàng",
    less: "Giảm số lượng", more: "Tăng số lượng", add: "Thêm vào giỏ", soldOut: "Tạm hết hàng",
    requestPrice: "Liên hệ hỏi giá", noPrice: "Giá chưa được niêm yết. Liên hệ Nhà để xác nhận trước khi đặt hàng.",
    selectedPrice: "Giá theo quy cách đã chọn", total: "Tạm tính", viewCart: "Xem giỏ hàng",
    added: (quantity, unit) => `Đã thêm ${quantity} ${unit} vào giỏ.`,
    stockLimit: "Bạn đã chọn hết lượng hiện có trong giỏ.", cartLimit: "Mỗi quy cách tối đa 99 đơn vị trong giỏ.", unavailable: "Quy cách này hiện chưa đặt được.",
    checking: "Đang kiểm tra giá và tồn kho…", loadError: "Chưa kiểm tra được giá và tồn kho. Tải lại trang hoặc liên hệ Nhà.",
    invalidQuantity: "Chọn số lượng nguyên từ 1 đến 99, trong lượng hàng hiện có.",
    brewing: "Gợi ý pha", listedBrew: "Bắt đầu với gợi ý pha đang công bố, rồi điều chỉnh theo khẩu vị của bạn.",
    policies: "Trước khi đặt hàng", shipping: "Thanh toán & giao nhận", returns: "Đổi trả & hoàn tiền",
    terms: "Điều khoản mua hàng", businessTitle: "Mua trà cho quán hoặc doanh nghiệp?",
    businessNote: "Trao đổi mẫu, quy cách và khối lượng. Nhà sẽ xác nhận giá sỉ trong báo giá riêng.",
    quote: "Xin báo giá cho trà này", sample: "Trao đổi mẫu trà", related: "Tiếp tục chọn trà", details: "Xem trà",
  },
  en: {
    back: "All teas", photoMissing: "Product photo is being updated", photoError: "Product photo could not load",
    flavors: "Tasting notes", packing: "Choose a format", defaultPack: "Current format", quantity: "Quantity",
    orderUnit: "Order unit", recordedPacking: "Packing information", unitPrice: "Price per order unit",
    less: "Decrease quantity", more: "Increase quantity", add: "Add to cart", soldOut: "Currently sold out",
    requestPrice: "Ask the house for pricing", noPrice: "A price is not listed. Contact the house to confirm before ordering.",
    selectedPrice: "Price for the selected format", total: "Subtotal", viewCart: "View cart",
    added: (quantity, unit) => `Added ${quantity} ${unit} to your cart.`,
    stockLimit: "Your cart already contains the available quantity.", cartLimit: "A maximum of 99 units per format can be added to the cart.", unavailable: "This format cannot currently be ordered.",
    checking: "Checking price and availability…", loadError: "Price and availability could not be checked. Reload this page or contact the house.",
    invalidQuantity: "Choose a whole quantity from 1 to 99, within the available stock.",
    brewing: "Brewing guidance", listedBrew: "Start with the listed guidance, then adjust to your taste.",
    policies: "Before ordering", shipping: "Payment & delivery (Vietnamese)", returns: "Returns & refunds (Vietnamese)",
    terms: "Purchase terms (Vietnamese)", businessTitle: "Buying for a café or business?",
    businessNote: "Discuss samples, packing and volume. The house confirms wholesale pricing in a separate quotation.",
    quote: "Request a quote for this tea", sample: "Discuss tea samples", related: "Continue exploring teas", details: "Explore tea",
  },
};

function ProductPhoto({ product, name, text, small = false }) {
  const [failed, setFailed] = useState(false);
  return <div className={`${styles.photo}${small ? ` ${styles.smallPhoto}` : ""}`}>
    {product.photoUrl && !failed
      ? <img src={product.photoUrl} alt={name} loading={small ? "lazy" : "eager"} onError={() => setFailed(true)} style={{ objectPosition: product.photoPosition || "center" }}/>
      : <div className={styles.photoFallback}><span>Hoàng Long</span><strong>{name}</strong><small>{failed ? text.photoError : text.photoMissing}</small></div>}
  </div>;
}

export default function RetailProductDetail({ product }) {
  const { locale } = useLocale();
  const t = COPY[locale === "en" ? "en" : "vi"];
  const { cart, addOption, openCart, catalogStatus, products } = useRetailCart();
  const liveProduct = products.find(item => item.id === product.id);
  const currentProduct = liveProduct || product;
  const facts = retailProductFacts(currentProduct, locale);
  const options = retailOptions(currentProduct);
  const hasVariants = currentProduct.variants?.length > 0;
  const kilogramBasis = !hasVariants && options[0]?.unit === "kg";
  const [selectedKey, setSelectedKey] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [message, setMessage] = useState("");
  const [added, setAdded] = useState(false);
  const groupName = useId();
  const selected = options.find(option => option.key === selectedKey) || options.find(option => option.orderable) || options[0];
  const price = Number(selected?.price);
  const hasPrice = Number.isFinite(price) && price > 0;
  const stock = selected?.stock;
  const trackedStock = typeof stock === "number" && Number.isFinite(stock);
  const soldOut = trackedStock && stock <= 0;
  const inCart = selected ? Number(cart[selected.key] || 0) : 0;
  const remaining = trackedStock ? Math.max(0, Math.floor(stock) - inCart) : null;
  const maxQuantity = Math.max(0, Math.min(99 - inCart, remaining ?? 99));
  const quantityNumber = Number(quantity);
  const validQuantity = Number.isInteger(quantityNumber) && quantityNumber >= 1 && quantityNumber <= maxQuantity;
  const canAdd = catalogStatus === "ready" && liveProduct && selected?.orderable && hasPrice && !soldOut && maxQuantity > 0 && validQuantity;
  const unit = sellingUnitLabel(selected?.unit, locale);
  const shopHref = `/shop?lang=${locale}`;
  const related = products.filter(item => item.id !== product.id && item.kind !== "goods" && item.line !== "sample" && retailProductFacts(item, locale).groupId === facts.groupId).slice(0, 3);

  function selectOption(key) {
    setSelectedKey(key);
    setQuantity("1");
    setMessage("");
    setAdded(false);
  }

  function updateQuantity(next) {
    setQuantity(next);
    setMessage("");
    setAdded(false);
  }

  function addToCart(event) {
    event.preventDefault();
    if (!canAdd) {
      setMessage(validQuantity ? t.unavailable : t.invalidQuantity);
      setAdded(false);
      return;
    }
    const accepted = addOption(selected, quantityNumber);
    if (accepted === true) setQuantity("1");
    setAdded(accepted === true);
    setMessage(accepted === true ? t.added(quantityNumber, unit) : t.unavailable);
  }

  return <article className={styles.detail} data-no-translate>
    <nav className={styles.breadcrumb} aria-label={locale === "en" ? "Breadcrumb" : "Đường dẫn"}>
      <Link href={shopHref}><ArrowLeft size={17} aria-hidden="true"/>{t.back}</Link><span aria-hidden="true">/</span><span>{facts.name}</span>
    </nav>

    <div className={styles.opening}>
      <ProductPhoto key={`${currentProduct.id}:${currentProduct.photoUrl || ""}`} product={currentProduct} name={facts.name} text={t}/>
      <div className={styles.productInfo}>
        <p className={styles.eyebrow}>{facts.groupLabel}</p>
        <h1>{facts.name}</h1>
        {facts.note && <p className={styles.note}>{facts.note}</p>}
        {!!facts.flavors.length && <div className={styles.flavorSection}><h2>{t.flavors}</h2><ul>{facts.flavors.map((flavor, index) => <li key={`${flavor}:${index}`}>{flavor}</li>)}</ul></div>}

        <form className={styles.purchase} onSubmit={addToCart}>
          <fieldset className={styles.packages}>
            <legend>{kilogramBasis ? t.orderUnit : t.packing}</legend>
            {options.map(option => {
              const unavailableStock = typeof option.stock === "number" && Number.isFinite(option.stock) && option.stock <= 0;
              const optionHasPrice = Number.isFinite(Number(option.price)) && Number(option.price) > 0;
              return <label key={option.key} className={`${styles.package}${selected?.key === option.key ? ` ${styles.selectedPackage}` : ""}`}>
                <input type="radio" name={groupName} value={option.key} checked={selected?.key === option.key} onChange={() => selectOption(option.key)}/>
                <span><strong>{option.weight || (kilogramBasis ? "1 kg" : facts.packing || t.defaultPack)}</strong><small>{optionHasPrice ? `${money.format(option.price)} / ${sellingUnitLabel(option.unit, locale)}` : t.requestPrice}</small></span>
                {unavailableStock && <span className={styles.stockLabel}>{t.soldOut}</span>}
              </label>;
            })}
            {!options.length && <p className={styles.availability}>{t.unavailable}</p>}
          </fieldset>

          {kilogramBasis && facts.packing && <div className={styles.recordedPacking}><span>{t.recordedPacking}</span><p>{facts.packing}</p></div>}

          {hasPrice && <div className={styles.price}><span>{kilogramBasis ? t.unitPrice : t.selectedPrice}</span><strong>{money.format(price)}<small> / {unit}</small></strong></div>}

          {hasPrice && !soldOut && selected?.orderable && <div className={styles.quantityRow}>
            <label htmlFor={`${groupName}-quantity`}>{t.quantity}<small>{unit}</small></label>
            <div className={styles.stepper}>
              <button type="button" aria-label={t.less} disabled={!validQuantity || quantityNumber <= 1} onClick={() => updateQuantity(String(quantityNumber - 1))}><Minus size={17} aria-hidden="true"/></button>
              <input id={`${groupName}-quantity`} type="number" inputMode="numeric" min="1" max={maxQuantity || 1} step="1" required disabled={maxQuantity === 0} value={quantity} onChange={event => updateQuantity(event.target.value)} aria-describedby={`${groupName}-availability`}/>
              <button type="button" aria-label={t.more} disabled={!validQuantity || quantityNumber >= maxQuantity} onClick={() => updateQuantity(String(quantityNumber + 1))}><Plus size={17} aria-hidden="true"/></button>
            </div>
          </div>}

          <p id={`${groupName}-availability`} className={styles.availability} role="status">
            {catalogStatus === "loading" ? t.checking : catalogStatus === "error" ? t.loadError : !liveProduct || !selected ? t.unavailable : soldOut ? t.soldOut : remaining === 0 ? t.stockLimit : maxQuantity === 0 ? t.cartLimit : !selected?.orderable && hasPrice ? t.unavailable : ""}
          </p>

          {!hasPrice ? <><p className={styles.contactNote}>{t.noPrice}</p><a className={styles.primary} href={EVENT_CONTACT.zaloUrl} target="_blank" rel="noopener noreferrer">{t.requestPrice}<ArrowRight size={17} aria-hidden="true"/></a></>
            : <><div className={styles.subtotal}><span>{t.total}</span><strong>{Number.isInteger(quantityNumber) && quantityNumber > 0 ? money.format(price * quantityNumber) : "—"}</strong></div><button className={styles.primary} type="submit" disabled={!canAdd}><ShoppingBag size={18} aria-hidden="true"/>{soldOut ? t.soldOut : t.add}</button></>}

          {message && <div className={`${styles.feedback}${added ? "" : ` ${styles.feedbackError}`}`} role={added ? "status" : "alert"}>
            {added && <Check size={17} aria-hidden="true"/>}<p>{message}</p>{added && <button type="button" onClick={openCart}>{t.viewCart}<ArrowRight size={16} aria-hidden="true"/></button>}
          </div>}
        </form>
      </div>
    </div>

    <div className={styles.detailsGrid}>
      {facts.brew && <section className={styles.brewing} aria-labelledby={`${groupName}-brew`}><p className={styles.eyebrow}>Hoàng Long</p><h2 id={`${groupName}-brew`}>{t.brewing}</h2><p className={styles.brew}>{facts.brew}</p><p className={styles.brewNote}>{t.listedBrew}</p></section>}
      <section className={styles.business} aria-labelledby={`${groupName}-business`}><h2 id={`${groupName}-business`}>{t.businessTitle}</h2><p>{t.businessNote}</p><div><Link href={tradeEnquiryHref(currentProduct.id, "quote", "", locale)}>{t.quote}<ArrowRight size={16} aria-hidden="true"/></Link><Link href={tradeEnquiryHref(currentProduct.id, "sample", "", locale)}>{t.sample}</Link></div></section>
    </div>

    <nav className={styles.policies} aria-label={t.policies}><strong>{t.policies}</strong><div><Link href="/shipping">{t.shipping}</Link><Link href="/returns">{t.returns}</Link><Link href="/terms">{t.terms}</Link></div></nav>

    {!!related.length && <section className={styles.related} aria-labelledby={`${groupName}-related`}>
      <div className={styles.relatedHeading}><h2 id={`${groupName}-related`}>{t.related}</h2><Link href={shopHref}>{t.back}<ArrowRight size={16} aria-hidden="true"/></Link></div>
      <div className={styles.relatedGrid}>{related.map(item => {
        const itemFacts = retailProductFacts(item, locale);
        return <Link href={retailProductHref(item.id, locale)} className={styles.relatedProduct} key={item.id}>
          <ProductPhoto key={item.photoUrl || item.id} product={item} name={itemFacts.name} text={t} small/>
          <span>{itemFacts.groupLabel}</span><h3>{itemFacts.name}</h3><div>{t.details}<ArrowRight size={16} aria-hidden="true"/></div>
        </Link>;
      })}</div>
    </section>}
  </article>;
}

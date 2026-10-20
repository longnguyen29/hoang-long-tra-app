"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, ChevronDown, MessageCircle, Minus, PackageCheck, Plus, ReceiptText, ShoppingBag } from "lucide-react";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { EVENT_CONTACT } from "@/lib/event-contact";
import { retailOptions, retailProductFacts, retailProductHref, retailStockBadge } from "@/lib/retail-catalog";
import { retailBrewingGuidance } from "@/lib/retail-product-guidance";
import { retailTeaCharacteristics } from "@/lib/retail-tea-characteristics";
import { RETAIL_CART_MAX } from "@/lib/retail-cart";
import { RETAIL_VOLUME_POLICY } from "@/lib/retail-volume-policy";
import { sellingUnitLabel } from "@/lib/selling-units";
import { tradeEnquiryHref } from "@/lib/trade-catalog";
import { useRetailCart } from "./RetailCartProvider";
import RetailTeaComparison from "./RetailTeaComparison";
import RetailTeaBundles from "./RetailTeaBundles";
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
    stockLimit: "Bạn đã chọn hết lượng hiện có trong giỏ.", cartLimit: `Mỗi quy cách tối đa ${RETAIL_CART_MAX} đơn vị trong giỏ.`, unavailable: "Quy cách này hiện chưa đặt được.",
    checking: "Đang kiểm tra giá và tồn kho…", loadError: "Chưa kiểm tra được giá và tồn kho. Tải lại trang hoặc liên hệ Nhà.",
    invalidQuantity: `Chọn số lượng nguyên từ 1 đến ${RETAIL_CART_MAX}, trong lượng hàng hiện có.`,
    volumeTitle: "Ưu đãi theo tổng lượng trà", freeShipping: kg => `Từ ${kg} kg: miễn phí giao tiêu chuẩn nội địa.`, volumeTier: (kg, percent) => `Từ ${kg} kg · giảm ${percent}%`, volumeNote: "Cộng dồn trà có khối lượng xác định trong giỏ, không gồm bộ mẫu và sản vật. Áp dụng một mức giảm cao nhất.",
    brewing: "Pha theo cách bạn thích", listedBrew: "Hướng dẫn riêng đang niêm yết", brewMethods: "Chọn cách pha",
    reassurance: "Yên tâm khi đặt trà", trustPrice: "Giá và phí rõ ràng", trustPriceNote: "Nhà xác nhận loại trà, quy cách, tổng tiền và phí giao trước khi thực hiện. Không tự thay sản phẩm hoặc tăng giá đơn đã xác nhận.",
    trustReturns: "Hỗ trợ khi hàng có vấn đề", trustReturnsNote: "Giao sai, thiếu hoặc hàng lỗi: Nhà tiếp nhận và trao đổi bổ sung, đổi hàng hoặc hoàn tiền theo chính sách. Báo sớm trong 7 ngày để xử lý nhanh; không bắt buộc video mở hộp.",
    trustContact: "Trao đổi trực tiếp với Nhà", trustContactNote: "Cần chọn trà, hỏi cách pha hoặc hỗ trợ đơn hàng? Liên hệ trực tiếp Hoàng Long qua điện thoại hoặc Zalo.", contactZalo: "Nhắn Zalo",
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
    stockLimit: "Your cart already contains the available quantity.", cartLimit: `A maximum of ${RETAIL_CART_MAX} units per format can be added to the cart.`, unavailable: "This format cannot currently be ordered.",
    checking: "Checking price and availability…", loadError: "Price and availability could not be checked. Reload this page or contact the house.",
    invalidQuantity: `Choose a whole quantity from 1 to ${RETAIL_CART_MAX}, within the available stock.`,
    volumeTitle: "Benefits by total tea weight", freeShipping: kg => `From ${kg} kg: free standard domestic delivery.`, volumeTier: (kg, percent) => `${kg} kg or more · ${percent}% off`, volumeNote: "Combines tea with a confirmed weight in your cart, excluding samples and produce. The single highest discount applies.",
    brewing: "Brew it your way", listedBrew: "Listed tea-specific instructions", brewMethods: "Choose a brewing method",
    reassurance: "Order with clarity", trustPrice: "Clear pricing and delivery costs", trustPriceNote: "The house confirms the tea, format, total and delivery cost before fulfilment. Confirmed orders are not changed or repriced without your agreement.",
    trustReturns: "Support for order problems", trustReturnsNote: "For wrong, missing or faulty goods, the house reviews replacement, correction or refund under the returns policy. Report promptly within 7 days for faster handling; an unboxing video is not required.",
    trustContact: "Speak directly with the house", trustContactNote: "Need help choosing tea, brewing or checking an order? Contact Hoàng Long directly by phone or Zalo.", contactZalo: "Message on Zalo",
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
  const characteristics = retailTeaCharacteristics(currentProduct, locale);
  const signatureNotes = characteristics?.signatureNotes || facts.flavors;
  const options = retailOptions(currentProduct);
  const hasVariants = currentProduct.variants?.length > 0;
  const kilogramBasis = !hasVariants && options[0]?.unit === "kg";
  const [selectedKey, setSelectedKey] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [message, setMessage] = useState("");
  const [added, setAdded] = useState(false);
  const [brewMethod, setBrewMethod] = useState("tasting");
  const groupName = useId();
  const selected = options.find(option => option.key === selectedKey) || options.find(option => option.orderable) || options[0];
  const price = Number(selected?.price);
  const hasPrice = Number.isFinite(price) && price > 0;
  const stock = selected?.stock;
  const trackedStock = typeof stock === "number" && Number.isFinite(stock);
  const soldOut = trackedStock && stock <= 0;
  const inCart = selected ? Number(cart[selected.key] || 0) : 0;
  const remaining = trackedStock ? Math.max(0, Math.floor(stock) - inCart) : null;
  const maxQuantity = Math.max(0, Math.min(RETAIL_CART_MAX - inCart, remaining ?? RETAIL_CART_MAX));
  const quantityNumber = Number(quantity);
  const validQuantity = Number.isInteger(quantityNumber) && quantityNumber >= 1 && quantityNumber <= maxQuantity;
  const canAdd = catalogStatus === "ready" && liveProduct && selected?.orderable && hasPrice && !soldOut && maxQuantity > 0 && validQuantity;
  const unit = sellingUnitLabel(selected?.unit, locale);
  const stockBadge = retailStockBadge(currentProduct, selected, locale);
  const brewGuidance = retailBrewingGuidance(currentProduct, locale);
  const selectedBrew = brewGuidance.methods.find(method => method.id === brewMethod) || brewGuidance.methods[0];
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
        {stockBadge && <p className={styles.stockBadge} data-kind={stockBadge.kind}>{stockBadge.label}</p>}
        <h1>{facts.name}</h1>
        {facts.note && <p className={styles.note}>{facts.note}</p>}
        {!!signatureNotes.length && <div className={styles.flavorSection}><h2>{characteristics?.labels.signature || t.flavors}</h2><ul>{signatureNotes.map((flavor, index) => <li key={`${flavor}:${index}`}>{flavor}</li>)}</ul></div>}

        {characteristics && <section className={styles.characteristics} aria-labelledby={`${groupName}-characteristics`}>
          <h2 id={`${groupName}-characteristics`}>{characteristics.labels.title}</h2>
          <dl>
            <div><dt>{characteristics.labels.feeling}</dt><dd>{characteristics.feeling}</dd></div>
            <div><dt>{characteristics.labels.moment}</dt><dd>{characteristics.moment}</dd></div>
            <div><dt>{characteristics.labels.serving}</dt><dd>{characteristics.serving}</dd></div>
          </dl>
          <p>{characteristics.labels.caffeine}</p>
        </section>}

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
          {stockBadge?.detail && <p className={styles.stockDetail}>{stockBadge.detail}</p>}

          {!hasPrice ? <><p className={styles.contactNote}>{t.noPrice}</p><a className={styles.primary} href={EVENT_CONTACT.zaloUrl} target="_blank" rel="noopener noreferrer">{t.requestPrice}<ArrowRight size={17} aria-hidden="true"/></a></>
            : <><div className={styles.subtotal}><span>{t.total}</span><strong>{Number.isInteger(quantityNumber) && quantityNumber > 0 ? money.format(price * quantityNumber) : "—"}</strong></div><button className={styles.primary} type="submit" disabled={!canAdd}><ShoppingBag size={18} aria-hidden="true"/>{soldOut ? t.soldOut : t.add}</button></>}

          {message && <div className={`${styles.feedback}${added ? "" : ` ${styles.feedbackError}`}`} role={added ? "status" : "alert"}>
            {added && <Check size={17} aria-hidden="true"/>}<p>{message}</p>{added && <button type="button" onClick={openCart}>{t.viewCart}<ArrowRight size={16} aria-hidden="true"/></button>}
          </div>}
        </form>

        {currentProduct.kind !== "goods" && currentProduct.line !== "sample" && <aside className={styles.volumeBenefits} aria-label={t.volumeTitle}>
          <strong>{t.volumeTitle}</strong><p>{t.freeShipping(RETAIL_VOLUME_POLICY.freeShippingGrams / 1000)}</p>
          <ul>{RETAIL_VOLUME_POLICY.tiers.map(tier => <li key={tier.grams}>{t.volumeTier(tier.grams / 1000, tier.percent)}</li>)}</ul>
          <small>{t.volumeNote}</small>
        </aside>}

        <section className={styles.trust} aria-label={t.reassurance}>
          <p className={styles.trustHeading}>{t.reassurance}</p>
          <details><summary><ReceiptText size={18} aria-hidden="true"/><span>{t.trustPrice}</span><ChevronDown size={16} aria-hidden="true"/></summary><div><p>{t.trustPriceNote}</p><Link href="/shipping">{t.shipping}<ArrowRight size={15} aria-hidden="true"/></Link></div></details>
          <details><summary><PackageCheck size={18} aria-hidden="true"/><span>{t.trustReturns}</span><ChevronDown size={16} aria-hidden="true"/></summary><div><p>{t.trustReturnsNote}</p><Link href="/returns">{t.returns}<ArrowRight size={15} aria-hidden="true"/></Link></div></details>
          <details><summary><MessageCircle size={18} aria-hidden="true"/><span>{t.trustContact}</span><ChevronDown size={16} aria-hidden="true"/></summary><div><p>{t.trustContactNote}</p><div className={styles.trustContacts}><a href={`tel:${EVENT_CONTACT.phone}`}>{EVENT_CONTACT.phoneLabel}</a><a href={EVENT_CONTACT.zaloUrl} target="_blank" rel="noopener noreferrer">{t.contactZalo}<ArrowRight size={15} aria-hidden="true"/></a></div></div></details>
        </section>
      </div>
    </div>

    <div className={styles.detailsGrid}>
      {(facts.brew || selectedBrew) && <section className={styles.brewing} aria-labelledby={`${groupName}-brew`}>
        <p className={styles.eyebrow}>Hoàng Long</p><h2 id={`${groupName}-brew`}>{t.brewing}</h2>
        {selectedBrew && <>
          <div className={styles.brewMethods} role="group" aria-label={t.brewMethods}>{brewGuidance.methods.map(method => <button type="button" key={method.id} aria-pressed={selectedBrew.id === method.id} onClick={() => setBrewMethod(method.id)}>{method.label}</button>)}</div>
          <div className={styles.brewMethod} role="region" aria-live="polite" aria-label={selectedBrew.label}><strong>{selectedBrew.duration}</strong><span>{selectedBrew.caption}</span><p>{selectedBrew.instructions}</p></div>
          <p className={styles.brewNote}>{brewGuidance.note}</p>
        </>}
        {facts.brew && (selectedBrew ? <details className={styles.listedBrew}><summary>{t.listedBrew}<ChevronDown size={16} aria-hidden="true"/></summary><p className={styles.brew}>{facts.brew}</p></details> : <p className={styles.brew}>{facts.brew}</p>)}
      </section>}
      <section className={styles.business} aria-labelledby={`${groupName}-business`}><h2 id={`${groupName}-business`}>{t.businessTitle}</h2><p>{t.businessNote}</p><div><Link href={tradeEnquiryHref(currentProduct.id, "quote", "", locale)}>{t.quote}<ArrowRight size={16} aria-hidden="true"/></Link><Link href={tradeEnquiryHref(currentProduct.id, "sample", "", locale)}>{t.sample}</Link></div></section>
    </div>

    <RetailTeaComparison products={products} locale={locale} currentProductId={currentProduct.id}/>

    <RetailTeaBundles locale={locale} productId={currentProduct.id} compact/>

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

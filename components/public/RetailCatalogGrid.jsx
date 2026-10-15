"use client";

import { useId, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Minus, Plus, Search, ShoppingBag, X } from "lucide-react";
import { sellingUnitLabel } from "@/lib/selling-units";
import { RETAIL_CART_MAX } from "@/lib/retail-cart";
import { matchesRetailSearch, retailOptions, retailProductFacts, retailProductHref, retailStockBadge } from "@/lib/retail-catalog";
import styles from "./RetailCatalogGrid.module.css";

const money = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 });
const COPY = {
  vi: {
    search: "Tìm trà", goodsSearch: "Tìm sản vật", searchHint: "Tên trà, hương vị hoặc quy cách…", goodsSearchHint: "Tên sản vật hoặc quy cách…",
    clearSearch: "Xóa tìm kiếm", all: "Tất cả", results: (n, goods) => `${n} ${goods ? "sản vật" : "loại trà"}`,
    noResults: "Chưa tìm thấy sản phẩm phù hợp.", resetHint: "Thử tên khác hoặc xem lại toàn bộ danh mục.", reset: "Xem tất cả", empty: "Danh mục đang được chuẩn bị.",
    from: "Từ", request: "Liên hệ báo giá", soldOut: "Tạm hết hàng", pack: "Đơn vị đặt", packing: "Thông tin quy cách", housePack: "Quy cách của Nhà", view: "Xem trà", add: "Thêm vào giỏ", added: "Trong giỏ",
    removeLabel: (name, pack) => `Bớt ${name}${pack ? ` · ${pack}` : ""}`, addLabel: (name, pack) => `Thêm ${name}${pack ? ` · ${pack}` : ""}`, cartQty: (name) => `Số lượng ${name} trong giỏ`,
    unavailable: "Chưa đặt được quy cách này", houseMarket: "Gian hàng của Nhà", photo: "Ảnh đang cập nhật", filter: "Lọc theo nhóm trà", goodsFilter: "Lọc theo nhóm sản vật",
  },
  en: {
    search: "Find tea", goodsSearch: "Find produce", searchHint: "Tea name, taste or pack size…", goodsSearchHint: "Produce name or pack size…",
    clearSearch: "Clear search", all: "All", results: (n, goods) => `${n} ${goods ? (n === 1 ? "product" : "products") : (n === 1 ? "tea" : "teas")}`,
    noResults: "No products match your search.", resetHint: "Try a different name or browse the full catalogue.", reset: "View all", empty: "The catalogue is being prepared.",
    from: "From", request: "Price on request", soldOut: "Currently unavailable", pack: "Order unit", packing: "Packaging details", housePack: "House pack", view: "Explore tea", add: "Add to cart", added: "In your cart",
    removeLabel: (name, pack) => `Remove ${name}${pack ? ` · ${pack}` : ""}`, addLabel: (name, pack) => `Add ${name}${pack ? ` · ${pack}` : ""}`, cartQty: (name) => `Quantity of ${name} in cart`,
    unavailable: "This pack cannot be ordered yet", houseMarket: "House market", photo: "Photo to follow", filter: "Filter by tea group", goodsFilter: "Filter by produce group",
  },
};

function ProductCard({ product, locale, cart, quantity, vendors, isGoods, index }) {
  const t = COPY[locale];
  const id = useId();
  const facts = retailProductFacts(product, locale);
  const options = retailOptions(product);
  const [selectedKey, setSelectedKey] = useState("");
  const [failedPhoto, setFailedPhoto] = useState("");
  const selected = options.find((option) => option.key === selectedKey) || options.find((option) => option.orderable) || options[0];
  const purchasable = options.filter((option) => option.orderable && Number(option.price) > 0);
  const lowest = purchasable.reduce((best, option) => !best || option.price < best.price ? option : best, null);
  const differentPrices = new Set(purchasable.map((option) => Number(option.price))).size > 1;
  const hasPrice = options.some((option) => Number(option.price) > 0);
  // Packing descriptions can list several formats without defining a priced
  // variant. Only a recorded variant changes the selectable sale package.
  const packLabel = (option) => option.weight || `1 ${sellingUnitLabel(option.unit, locale)}`;
  const priceBasis = (option) => `${sellingUnitLabel(option.unit, locale)}${option.weight ? ` · ${option.weight}` : ""}`;
  const selectedQty = selected ? Number(cart?.[selected.key] || 0) : 0;
  const canAdd = selected?.orderable && selectedQty < RETAIL_CART_MAX && (selected.stock === null || selectedQty < selected.stock);
  const totalQty = options.reduce((sum, option) => sum + Number(cart?.[option.key] || 0), 0);
  const href = retailProductHref(product.id, locale);
  const stockBadge = !isGoods ? retailStockBadge(product, selected, locale) : null;
  const vendor = isGoods && vendors.find((entry) => entry.id === product.vendorId);
  const photo = <figure className={styles.photo}>{product.photoUrl && failedPhoto !== product.photoUrl ? <img src={product.photoUrl} alt={facts.name} loading={index > 2 ? "lazy" : undefined} style={{ objectPosition: product.photoPosition || "50% 50%" }} onError={() => setFailedPhoto(product.photoUrl)}/> : <div className={styles.photoPlaceholder}><span aria-hidden="true">皇龍</span><small>{t.photo}</small></div>}</figure>;

  return <article className={styles.card}>
    {isGoods ? photo : <Link href={href} className={styles.photoLink} aria-label={`${t.view}: ${facts.name}`}>{photo}</Link>}
    <div className={styles.copy}>
      <p className={styles.category}>{isGoods ? vendor?.name || t.houseMarket : facts.groupLabel}</p>
      {stockBadge && <p className={styles.stockBadge} data-kind={stockBadge.kind}>{stockBadge.label}</p>}
      <h2>{isGoods ? facts.name : <Link href={href}>{facts.name}</Link>}</h2>
      {facts.note && <p className={styles.note}>{facts.note}</p>}
      {Array.isArray(facts.flavors) && facts.flavors.length > 0 && <ul className={styles.flavors} aria-label={locale === "vi" ? "Hương vị" : "Taste notes"}>{facts.flavors.slice(0, 3).map((flavor) => <li key={flavor}>{flavor}</li>)}</ul>}
      <p className={styles.price}>{lowest ? <>{differentPrices && <small>{t.from} </small>}<strong>{money.format(lowest.price)}</strong><span> / {priceBasis(lowest)}</span></> : <span>{hasPrice ? t.soldOut : t.request}</span>}</p>
      {options.length > 0 && !options.some((option) => option.weight) && facts.packing && facts.packing !== packLabel(options[0]) && <p className={styles.packing}>{t.packing}: {facts.packing}</p>}
    </div>
    <div className={styles.buy}>
      {options.length > 1 ? <label className={styles.packLabel} htmlFor={`${id}-pack`}><span>{t.pack}</span><select id={`${id}-pack`} value={selected?.key || ""} onChange={(event) => setSelectedKey(event.target.value)}>{options.map((option) => <option key={option.key} value={option.key}>{packLabel(option)}{Number(option.price) > 0 ? ` · ${money.format(option.price)}` : ` · ${t.request}`}{!option.orderable && Number(option.price) > 0 ? ` · ${t.soldOut}` : ""}</option>)}</select></label> : selected && <div className={styles.singlePack}><span>{t.pack}</span><strong>{packLabel(selected)}</strong></div>}
      {selectedQty > 0 ? <div className={styles.quantity}><button type="button" onClick={() => quantity(selected.key, -1)} aria-label={t.removeLabel(facts.name, packLabel(selected))}><Minus size={16} aria-hidden="true"/></button><output aria-label={t.cartQty(facts.name)}>{selectedQty} <span>{sellingUnitLabel(selected.unit, locale)}</span></output><button type="button" onClick={() => quantity(selected.key, 1)} disabled={!canAdd} aria-label={t.addLabel(facts.name, packLabel(selected))}><Plus size={16} aria-hidden="true"/></button></div> : <button type="button" className={styles.addButton} disabled={!canAdd} onClick={() => canAdd && quantity(selected.key, 1)}><ShoppingBag size={16} aria-hidden="true"/>{selected?.orderable ? t.add : selected && Number(selected.price) > 0 ? t.soldOut : t.request}</button>}
      {!selected?.orderable && selectedQty === 0 && selected && <small className={styles.unavailable}>{t.unavailable}</small>}
      {!isGoods && <Link href={href} className={styles.detailLink}>{t.view}<ArrowRight size={16} aria-hidden="true"/></Link>}
      {totalQty > 0 && <small className={styles.cartNote} aria-live="polite">{t.added}: {totalQty}</small>}
    </div>
  </article>;
}

export default function RetailCatalogGrid({ products = [], locale = "vi", cart = {}, quantity, vendors = [], mode = "tea" }) {
  const t = COPY[locale === "en" ? "en" : "vi"];
  const isGoods = mode === "goods";
  const searchId = useId();
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState("all");
  const groups = useMemo(() => {
    const unique = new Map();
    products.forEach((product) => { const facts = retailProductFacts(product, locale); if (facts.groupId && facts.groupLabel) unique.set(facts.groupId, facts.groupLabel); });
    return [...unique.entries()];
  }, [products, locale]);
  const visible = useMemo(() => products.filter((product) => (group === "all" || retailProductFacts(product, locale).groupId === group) && matchesRetailSearch(product, query, locale)), [products, query, group, locale]);
  const reset = () => { setQuery(""); setGroup("all"); };

  return <section className={styles.catalog} aria-label={locale === "vi" ? (isGoods ? "Danh mục sản vật" : "Danh mục trà mua lẻ") : (isGoods ? "Produce catalogue" : "Retail tea catalogue")}>
    <div className={styles.toolbar}>
      <label className={styles.searchLabel} htmlFor={searchId}>{isGoods ? t.goodsSearch : t.search}</label>
      <div className={styles.search}><Search size={18} aria-hidden="true"/><input id={searchId} type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={isGoods ? t.goodsSearchHint : t.searchHint}/>{query && <button type="button" onClick={() => setQuery("")} aria-label={t.clearSearch}><X size={17} aria-hidden="true"/></button>}</div>
      {groups.length > 1 && <div className={styles.filters} role="group" aria-label={isGoods ? t.goodsFilter : t.filter}><button type="button" aria-pressed={group === "all"} onClick={() => setGroup("all")}>{t.all}</button>{groups.map(([key, label]) => <button type="button" key={key} aria-pressed={group === key} onClick={() => setGroup(key)}>{label}</button>)}</div>}
      <p className={styles.resultCount} aria-live="polite">{t.results(visible.length, isGoods)}</p>
    </div>
    {visible.length > 0 ? <div className={styles.grid}>{visible.map((product, index) => <ProductCard key={product.id} product={product} locale={locale === "en" ? "en" : "vi"} cart={cart} quantity={quantity} vendors={vendors} isGoods={isGoods} index={index}/>)}</div> : <div className={styles.empty}><h2>{products.length ? t.noResults : t.empty}</h2>{products.length > 0 && <><p>{t.resetHint}</p><button type="button" onClick={reset}>{t.reset}<ArrowRight size={16} aria-hidden="true"/></button></>}</div>}
  </section>;
}

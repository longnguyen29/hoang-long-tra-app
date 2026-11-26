"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ChevronRight, Minus, Plus, Search, X } from "lucide-react";
import { sellingUnitLabel } from "@/lib/selling-units";
import { RETAIL_CART_MAX } from "@/lib/retail-cart";
import { matchesRetailSearch, retailOptions, retailProductFacts, retailProductHref, retailStockBadge } from "@/lib/retail-catalog";
import { retailTeaCharacteristics } from "@/lib/retail-tea-characteristics";
import RetailTeaComparison from "./RetailTeaComparison";
import Skeleton from "@/components/ui/Skeleton";
import styles from "./RetailCatalogGrid.module.css";

const money = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 });
const COPY = {
  vi: {
    search: "Tìm trà", goodsSearch: "Tìm sản vật", searchHint: "Tìm theo tên, vị trà, quy cách", goodsSearchHint: "Tìm theo tên hoặc quy cách",
    clearSearch: "Xóa tìm kiếm", all: "Tất cả", results: (n, goods) => `${n} ${goods ? "sản vật" : "loại trà"}`,
    noResults: "Chưa tìm thấy sản phẩm phù hợp.", resetHint: "Thử tên khác hoặc bỏ bộ lọc.", reset: "Xóa bộ lọc",
    empty: "Danh mục đang được chuẩn bị.", from: "Từ", request: "Liên hệ báo giá", soldOut: "Tạm hết hàng",
    pack: "Quy cách", choose: "Chọn quy cách", view: "Xem chi tiết", add: "Thêm vào giỏ",
    removeLabel: (name, pack) => `Bớt ${name} · ${pack}`, addLabel: (name, pack) => `Thêm ${name} · ${pack} vào giỏ`,
    cartQty: (name) => `Số lượng ${name} trong giỏ`,
    houseMarket: "Gian hàng của Nhà", photo: "Ảnh đang cập nhật", filter: "Lọc theo nhóm trà", goodsFilter: "Lọc theo nhóm sản vật",
  },
  en: {
    search: "Find tea", goodsSearch: "Find produce", searchHint: "Search by tea, flavour or pack", goodsSearchHint: "Search by name or pack",
    clearSearch: "Clear search", all: "All", results: (n, goods) => `${n} ${goods ? (n === 1 ? "product" : "products") : (n === 1 ? "tea" : "teas")}`,
    noResults: "No products match your search.", resetHint: "Try a different name or clear the filters.", reset: "Clear filters",
    empty: "The catalogue is being prepared.", from: "From", request: "Price on request", soldOut: "Out of stock",
    pack: "Pack", choose: "Choose pack", view: "View details", add: "Add to cart",
    removeLabel: (name, pack) => `Remove ${name} · ${pack}`, addLabel: (name, pack) => `Add ${name} · ${pack} to cart`,
    cartQty: (name) => `Quantity of ${name} in cart`,
    houseMarket: "House market", photo: "Photo to follow", filter: "Filter by tea group", goodsFilter: "Filter by produce group",
  },
};

const packLabel = (option, locale) => option.displayWeight || `1 ${sellingUnitLabel(option.unit, locale)}`;
const browseKey = "hlRetailBrowse";

function ProductCard({ product, locale, cart, quantity, vendors, isGoods, index }) {
  const t = COPY[locale];
  const facts = retailProductFacts(product, locale);
  const characteristics = retailTeaCharacteristics(product, locale);
  const signature = characteristics?.signatureNotes.length ? characteristics.signatureNotes : facts.flavors;
  const taste = signature.slice(0, 2).join(" · ") || characteristics?.feeling || facts.note;
  const options = retailOptions(product);
  const [selectedKey, setSelectedKey] = useState("");
  const [failedPhoto, setFailedPhoto] = useState("");
  const addButton = useRef(null);
  const purchasable = options.filter(option => option.orderable);
  const lowest = purchasable.reduce((best, option) => !best || option.price < best.price ? option : best, null);
  const active = options.find(option => option.key === selectedKey) || purchasable[0] || options[0];
  // Tea with multiple packs is priced from the cheapest available pack. Goods
  // have no detail page, so their price follows the inline selection.
  const multiple = options.length > 1;
  const choosePack = !isGoods && multiple && Boolean(lowest);
  const shown = isGoods ? active : lowest;
  const from = !isGoods && purchasable.some(option => option.price !== lowest?.price);
  const itemQty = active ? Number(cart[active.key] || 0) : 0;
  const canAdd = active?.orderable && itemQty < RETAIL_CART_MAX && (active.stock === null || itemQty < active.stock);
  const stockBadge = lowest ? retailStockBadge(product, multiple && !isGoods ? null : active, locale) : null;
  const hasPrice = isGoods ? active?.price != null : options.some(option => option.price !== null);
  const itemStatus = hasPrice ? t.soldOut : t.request;
  const vendor = isGoods && vendors.find(entry => entry.id === product.vendorId);
  const summary = <>
    <figure className={styles.photo}>
      {product.photoUrl && failedPhoto !== product.photoUrl
        ? <img src={product.photoUrl} alt="" loading={index > 3 ? "lazy" : undefined} decoding="async"
            style={{ objectPosition: product.photoPosition || "50% 50%" }} onError={() => setFailedPhoto(product.photoUrl)}/>
        : <div className={styles.photoPlaceholder}><span aria-hidden="true">皇龍</span><small>{t.photo}</small></div>}
      {stockBadge && <span className={styles.stockBadge}>{stockBadge.label}</span>}
    </figure>
    <div className={styles.copy}>
      <p className={styles.category}>{isGoods ? vendor?.name || t.houseMarket : facts.groupLabel}</p>
      <h2>{facts.name}</h2>
      {taste && <p className={styles.taste}>{taste}</p>}
      <p className={styles.price}>
        {shown?.price != null
          ? <>{from && <small>{t.from}</small>}<strong>{money.format(shown.price)}</strong><span> / {packLabel(shown, locale)}</span></>
          : <span>{itemStatus}</span>}
      </p>
    </div>
  </>;
  const orderable = isGoods ? Boolean(active?.orderable) : Boolean(lowest);
  const quickAdd = Boolean(quantity && orderable && (!multiple || isGoods));
  const inlineAction = isGoods && (active || multiple);

  return <article className={styles.card}>
    {isGoods ? <div className={styles.productSummary}>{summary}</div>
      : <Link href={retailProductHref(product.id, locale)} className={styles.productSummary} aria-label={choosePack ? `${t.choose} · ${facts.name}` : undefined}>
          {summary}
          {!quickAdd && <span className={styles.choose}>{choosePack ? t.choose : t.view}<ChevronRight size={15} aria-hidden="true"/></span>}
        </Link>}
    {(quickAdd || inlineAction) && <div className={styles.buy}>
      {isGoods && multiple && <label className={styles.packLabel}>{t.pack}
        <select value={active?.key || ""} onChange={event => setSelectedKey(event.target.value)}>
          {options.map(option => <option key={option.key} value={option.key}>
            {[packLabel(option, locale), option.price == null ? t.request : money.format(option.price), !option.orderable && option.price != null ? t.soldOut : null].filter(Boolean).join(" · ")}
          </option>)}
        </select>
      </label>}
      {active && <div className={itemQty > 0 ? styles.quantity : styles.buyAction}>
        {itemQty > 0 && <button key="remove" type="button" onClick={() => {
          quantity?.(active.key, -1);
          if (itemQty === 1) requestAnimationFrame(() => addButton.current?.focus());
        }} aria-label={t.removeLabel(facts.name, packLabel(active, locale))}>
          <Minus size={16} aria-hidden="true"/>
        </button>}
        {itemQty > 0 && <output key="quantity" aria-live="polite" aria-label={t.cartQty(facts.name)}>{itemQty}</output>}
        <button key="add" ref={addButton} type="button" className={itemQty > 0 ? undefined : styles.addButton}
          disabled={!canAdd || !quantity} aria-label={active.orderable ? t.addLabel(facts.name, packLabel(active, locale)) : undefined}
          onClick={() => quantity?.(active.key, 1)}>
          {(itemQty > 0 || canAdd) && <Plus size={16} aria-hidden="true"/>}
          {itemQty === 0 && (active.orderable ? t.add : itemStatus)}
        </button>
      </div>}
    </div>}
  </article>;
}

export function RetailCatalogSkeleton({ label }) {
  return <section className={styles.catalog}>
    <p role="status" className={styles.loadingStatus}>{label}</p>
    <div className={styles.toolbar} aria-hidden="true"><Skeleton className={styles.loadingSearch}/></div>
    <div className={styles.grid} aria-hidden="true">
      {[0, 1, 2, 3].map(index => <div className={styles.card} key={index}>
        <Skeleton className={styles.photo}/>
        <div className={styles.copy}><Skeleton className={styles.loadingTitle}/><Skeleton className={styles.loadingLine}/></div>
      </div>)}
    </div>
  </section>;
}

export default function RetailCatalogGrid({ products = [], locale = "vi", cart = {}, quantity, vendors = [], mode = "tea" }) {
  const language = locale === "en" ? "en" : "vi";
  const t = COPY[language];
  const isGoods = mode === "goods";
  const searchId = useId();
  const searchInput = useRef(null);
  const [{ query, group }, setFilters] = useState({ query: "", group: "all" });
  const groups = useMemo(() => {
    const unique = new Map();
    for (const product of products) {
      const facts = retailProductFacts(product, language);
      if (facts.groupId && facts.groupLabel) unique.set(facts.groupId, facts.groupLabel);
    }
    return [...unique.entries()];
  }, [products, language]);
  const activeGroup = groups.some(([key]) => key === group) ? group : "all";
  const visible = useMemo(() => products.filter(product => {
    if (activeGroup !== "all" && retailProductFacts(product, language).groupId !== activeGroup) return false;
    if (!query.trim()) return true;
    const packSize = [product.packSize, ...retailOptions(product).map(option => packLabel(option, language))].filter(Boolean).join(" ");
    return matchesRetailSearch({ ...product, packSize }, query, language);
  }), [products, query, activeGroup, language]);

  useEffect(() => {
    const restore = () => {
      const saved = window.history.state?.[browseKey];
      if (saved?.path === window.location.pathname && saved.mode === mode && typeof saved.query === "string" && typeof saved.group === "string") {
        setFilters({ query: saved.query, group: saved.group });
      }
    };
    restore();
    window.addEventListener("popstate", restore);
    return () => window.removeEventListener("popstate", restore);
  }, [mode]);

  function updateFilters(nextQuery, nextGroup) {
    setFilters({ query: nextQuery, group: nextGroup });
    // Keep filters on the catalogue's own history entry. A new visit starts at
    // the beginning, while a trip into a product and Back restores the list.
    window.history.replaceState({
      ...window.history.state,
      [browseKey]: { path: window.location.pathname, mode, query: nextQuery, group: nextGroup },
    }, "");
  }

  return <section className={styles.catalog} aria-label={language === "vi" ? (isGoods ? "Danh mục sản vật" : "Danh mục trà mua lẻ") : (isGoods ? "Produce catalogue" : "Retail tea catalogue")}>
    <div className={styles.toolbar}>
      <label className={styles.visuallyHidden} htmlFor={searchId}>{isGoods ? t.goodsSearch : t.search}</label>
      <div className={styles.search}>
        <Search size={18} aria-hidden="true"/>
        <input ref={searchInput} id={searchId} type="search" value={query} maxLength={120} onChange={event => updateFilters(event.target.value, activeGroup)}
          autoComplete="off" enterKeyHint="search" placeholder={isGoods ? t.goodsSearchHint : t.searchHint}/>
        {query && <button type="button" onClick={() => { updateFilters("", activeGroup); searchInput.current?.focus(); }} aria-label={t.clearSearch}>
          <X size={17} aria-hidden="true"/>
        </button>}
      </div>
      {groups.length > 1 && <div className={styles.filters} role="group" aria-label={isGoods ? t.goodsFilter : t.filter}>
        <button type="button" aria-pressed={activeGroup === "all"} onClick={() => updateFilters(query, "all")}>{t.all}</button>
        {groups.map(([key, label]) => <button type="button" key={key} aria-pressed={activeGroup === key} onClick={() => updateFilters(query, key)}>{label}</button>)}
      </div>}
      <p className={styles.resultCount} aria-live="polite">{t.results(visible.length, isGoods)}</p>
    </div>
    {visible.length > 0 ? <div className={styles.grid} data-goods={isGoods}>{visible.map((product, index) =>
      <ProductCard key={product.id} product={product} locale={language} cart={cart} quantity={quantity} vendors={vendors} isGoods={isGoods} index={index}/>)}</div>
      : <div className={styles.empty}><h2>{products.length ? t.noResults : t.empty}</h2>
        {products.length > 0 && <><p>{t.resetHint}</p><button type="button"
          onClick={() => { updateFilters("", "all"); searchInput.current?.focus(); }}>{t.reset}</button></>}
      </div>}
    {!isGoods && <div className={styles.comparison}><RetailTeaComparison products={products} locale={language}/></div>}
  </section>;
}

"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { fromCatalogRow, fromVariantRow } from '@/lib/mappers';
import { RETAIL_PRODUCT_FIELDS, RETAIL_VARIANT_FIELDS, retailOptions } from '@/lib/retail-catalog';
import { RETAIL_CART_STORAGE_KEY, RETAIL_CART_MAX, changeRetailQuantity, parseRetailCart, reconcileRetailCart } from '@/lib/retail-cart';

const Context = createContext(null);
export function useRetailCart() { return useContext(Context); }

export default function RetailCartProvider({ children }) {
  const pathname = usePathname();
  const active = pathname === '/shop' || pathname.startsWith('/shop/') || pathname === '/goods';
  const [cart, setCart] = useState({});
  const [hydrated, setHydrated] = useState(false);
  const [products, setProducts] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [catalogStatus, setCatalogStatus] = useState('loading');
  const [cartOpen, setCartOpen] = useState(false);
  const [cartAdjusted, setCartAdjusted] = useState(false);
  const options = useMemo(() => products.flatMap(retailOptions), [products]);

  useEffect(() => {
    try { setCart(parseRetailCart(localStorage.getItem(RETAIL_CART_STORAGE_KEY))); } catch { /* A blocked store still permits an in-memory cart. */ }
    setHydrated(true);
    const changed = event => {
      if (event.key === RETAIL_CART_STORAGE_KEY) setCart(parseRetailCart(event.newValue));
    };
    window.addEventListener('storage', changed);
    return () => window.removeEventListener('storage', changed);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try { localStorage.setItem(RETAIL_CART_STORAGE_KEY, JSON.stringify(cart)); } catch { /* No contact details are persisted. */ }
  }, [cart, hydrated]);

  useEffect(() => {
    if (!active) { setCartOpen(false); return; }
    let live = true;
    setCatalogStatus('loading');
    const supabase = createClient();
    Promise.all([
      supabase.from('catalog_products').select(RETAIL_PRODUCT_FIELDS).eq('available', true).order('id'),
      supabase.from('catalog_variants').select(RETAIL_VARIANT_FIELDS),
      supabase.rpc('list_public_vendors'),
    ]).then(([catalogResult, variantResult, vendorResult]) => {
      if (!live) return;
      if (catalogResult.error || variantResult.error) { setCatalogStatus('error'); return; }
      const variants = variantResult.data || [];
      setProducts((catalogResult.data || []).map(row => ({ ...fromCatalogRow(row), variants: variants.filter(v => v.product_id === row.id).map(fromVariantRow) })));
      setVendors(vendorResult.error ? [] : vendorResult.data || []);
      setCatalogStatus('ready');
    }).catch(() => { if (live) setCatalogStatus('error'); });
    return () => { live = false; };
  }, [active]);

  useEffect(() => {
    if (!hydrated || catalogStatus !== 'ready') return;
    const next = reconcileRetailCart(cart, options);
    if (JSON.stringify(next) !== JSON.stringify(cart)) { setCartAdjusted(true); setCart(next); }
  }, [cart, options, hydrated, catalogStatus]);

  const changeQuantity = useCallback((key, delta) => {
    if (!Number.isInteger(delta)) return;
    const option = options.find(item => item.key === key);
    if (delta > 0 && (catalogStatus !== 'ready' || !option?.orderable)) return;
    setCart(current => {
      const next = changeRetailQuantity(current, key, delta);
      return option?.stock !== null && option?.stock !== undefined && next[key] > option.stock ? { ...next, [key]: option.stock } : next;
    });
  }, [options, catalogStatus]);

  const addOption = useCallback((option, quantity = 1) => {
    const current = options.find(item => item.key === option?.key);
    if (catalogStatus !== 'ready' || !current?.orderable || !Number.isInteger(quantity) || quantity < 1 || (cart[current.key] || 0) + quantity > RETAIL_CART_MAX || (current.stock !== null && (cart[current.key] || 0) + quantity > current.stock)) return false;
    changeQuantity(current.key, quantity);
    return true;
  }, [options, catalogStatus, cart, changeQuantity]);

  const value = { cart, products, vendors, catalogStatus, cartOpen, setCartOpen, cartAdjusted,
    clearCart: () => { setCart({}); setCartAdjusted(false); }, openCart: () => setCartOpen(true), changeQuantity, addOption };
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

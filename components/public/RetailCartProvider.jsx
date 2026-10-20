"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { publicRetailPartner, RETAIL_PARTNER_STORAGE_KEY } from '@/lib/retail-partner';
import { fromCatalogRow, fromVariantRow } from '@/lib/mappers';
import { RETAIL_PRODUCT_FIELDS, RETAIL_VARIANT_FIELDS, retailOptions } from '@/lib/retail-catalog';
import { RETAIL_CART_STORAGE_KEY, RETAIL_LEGACY_CART_STORAGE_KEY, RETAIL_CART_MAX, changeRetailQuantity, parseRetailCart, restoreRetailCart, reconcileRetailCart } from '@/lib/retail-cart';
import { RETAIL_BUNDLES, addRetailBundleToCart } from '@/lib/retail-bundles';

const Context = createContext(null);
export function useRetailCart() { return useContext(Context); }

export default function RetailCartProvider({ children }) {
  const pathname = usePathname();
  const active = pathname === '/shop' || pathname.startsWith('/shop/') || pathname === '/goods';
  const [cart, setCartState] = useState({});
  const cartRef = useRef({});
  // All cart writers use the same synchronous snapshot. Two quick bundle clicks
  // must validate the combined demand before React renders the next frame.
  const setCart = useCallback(update => {
    const next = typeof update === 'function' ? update(cartRef.current) : update;
    cartRef.current = next;
    setCartState(next);
  }, []);
  const [hydrated, setHydrated] = useState(false);
  const [products, setProducts] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [catalogStatus, setCatalogStatus] = useState('loading');
  const [cartOpen, setCartOpen] = useState(false);
  const [cartAdjusted, setCartAdjusted] = useState(false);
  const [retailPartner, setRetailPartner] = useState(null);
  const [partnerCandidate, setPartnerCandidate] = useState(null);
  const [referralStatus, setReferralStatus] = useState('');
  const clearRetailPartner = useCallback(() => {
    setRetailPartner(null); setPartnerCandidate(null); setReferralStatus('');
    try { sessionStorage.removeItem(RETAIL_PARTNER_STORAGE_KEY); } catch { /* Memory-only browsing is supported. */ }
    const url = new URL(window.location.href);
    if (url.searchParams.has('ref')) { url.searchParams.delete('ref'); window.history.replaceState(null, '', url); }
  }, []);
  const confirmRetailPartner = useCallback(() => {
    if (!partnerCandidate) return;
    setRetailPartner(partnerCandidate); setPartnerCandidate(null); setReferralStatus('ready');
    try { sessionStorage.setItem(RETAIL_PARTNER_STORAGE_KEY, JSON.stringify(partnerCandidate)); } catch { /* No buyer information is stored. */ }
  }, [partnerCandidate]);

  useEffect(() => {
    if (!active) return;
    let live = true, stored = null;
    try { stored = publicRetailPartner(JSON.parse(sessionStorage.getItem(RETAIL_PARTNER_STORAGE_KEY) || 'null')); } catch { /* Ignore stale public metadata. */ }
    const incoming = new URL(window.location.href).searchParams.get('ref');
    const slug = incoming === null ? stored?.slug : incoming;
    if (!slug) { if (incoming !== null) setReferralStatus('unavailable'); return; }
    setReferralStatus('loading');
    fetch(`/api/retail-partner?ref=${encodeURIComponent(slug)}`, { cache: 'no-store' })
      .then(async response => { const data = await response.json(); return response.ok ? publicRetailPartner(data.partner) : null; })
      .then(partner => {
        if (!live) return;
        if (!partner) { setRetailPartner(null); setPartnerCandidate(null); setReferralStatus('unavailable'); return; }
        if (stored?.slug === partner.slug && stored.revision === partner.revision) {
          setRetailPartner(partner); setPartnerCandidate(null); setReferralStatus('ready');
        } else {
          // A new link never silently takes over an existing referral. The buyer
          // must choose this named partner, then consent again for each order.
          setRetailPartner(null); setPartnerCandidate(partner); setReferralStatus('choice');
        }
      }).catch(() => { if (live) { setRetailPartner(null); setReferralStatus('unavailable'); } });
    return () => { live = false; };
  }, [pathname, active]);
  const options = useMemo(() => products.flatMap(retailOptions), [products]);

  useEffect(() => {
    try { setCart(restoreRetailCart(localStorage.getItem(RETAIL_CART_STORAGE_KEY), localStorage.getItem(RETAIL_LEGACY_CART_STORAGE_KEY))); } catch { /* A blocked store still permits an in-memory cart. */ }
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
    if (catalogStatus !== 'ready' || !current?.orderable || !Number.isInteger(quantity) || quantity < 1 || (cartRef.current[current.key] || 0) + quantity > RETAIL_CART_MAX || (current.stock !== null && (cartRef.current[current.key] || 0) + quantity > current.stock)) return false;
    changeQuantity(current.key, quantity);
    return true;
  }, [options, catalogStatus, changeQuantity]);

  const addBundle = useCallback(bundleId => {
    const bundle = RETAIL_BUNDLES.find(item => item.id === bundleId);
    if (catalogStatus !== 'ready' || !hydrated || !bundle) return { ok: false, reason: 'unavailable' };
    const result = addRetailBundleToCart(cartRef.current, bundle, products);
    if (!result.ok) return { ok: false, reason: result.reason };
    setCart(result.cart);
    setCartAdjusted(false);
    return { ok: true, reason: null };
  }, [catalogStatus, hydrated, products, setCart]);

  const value = { retailPartner, partnerCandidate, referralStatus, clearRetailPartner, confirmRetailPartner, cart, products, vendors, catalogStatus, cartOpen, setCartOpen, cartAdjusted,
    clearCart: () => { setCart({}); setCartAdjusted(false); }, openCart: () => setCartOpen(true), changeQuantity, addOption, addBundle };
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

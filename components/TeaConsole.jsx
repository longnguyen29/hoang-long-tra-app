"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Search, ChevronRight, ChevronLeft, Menu, X, Edit3, Save, Plus, Trash2,
  Leaf, Mountain, Languages, Copy, Check,
  MessageCircle, Send, Download, Printer, LogOut,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { TOKENS, ROLES, NAV, CATEGORIES, PRICE_TIERS, STATUS_STEPS } from "@/lib/constants";
import { STR } from "@/lib/strings";
import {
  fromOrderRow, toOrderRow, fromThreadRow,
  fromCatalogRow, toCatalogRow, fromPromoRow, toPromoRow,
  fromPaymentRow, toPaymentRow,
} from "@/lib/mappers";
import PaymentBlock from "./PaymentBlock";
import ReorderBox from "./ReorderBox";
import TrackOrderBox from "./TrackOrderBox";
import TeaDetailModal from "./TeaDetailModal";
import ChatThreadPanel from "./ChatThreadPanel";

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9à-ỹ]+/gi, "-").slice(0, 40) + "-" + Date.now().toString(36);
}

export default function TeaConsole({ isAdmin, staffEmail, onLogout }) {
  const supabase = useMemo(() => createClient(), []);

  const [role, setRole] = useState(isAdmin ? "admin" : "wholesale");
  const [lang, setLang] = useState("vi");
  const [section, setSection] = useState("home");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [articles, setArticles] = useState([]);
  const [query, setQuery] = useState("");

  const [wikiCategory, setWikiCategory] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ title: "", body: "", category: "legacy" });

  const [cart, setCart] = useState({});
  const [detailProduct, setDetailProduct] = useState(null);
  const [retailCart, setRetailCart] = useState({});
  const [copied, setCopied] = useState(false);
  const [orderName, setOrderName] = useState("");
  const [orderContact, setOrderContact] = useState("");
  const [orderAddress, setOrderAddress] = useState("");
  const [orderTaxNumber, setOrderTaxNumber] = useState("");
  const [orderNote, setOrderNote] = useState("");
  const [orderSubmitted, setOrderSubmitted] = useState(null);

  const [orders, setOrders] = useState([]);
  const [threads, setThreads] = useState([]);
  const [leads, setLeads] = useState([]);
  const [myThread, setMyThread] = useState(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatName, setChatName] = useState("");
  const [chatDraft, setChatDraft] = useState("");
  const [customerId] = useState(() => {
    if (typeof window === "undefined") return "guest";
    const KEY = "thl:customer-id";
    let id;
    try {
      id = window.localStorage.getItem(KEY);
    } catch {
      id = null;
    }
    if (!id) {
      id = "guest-" + Math.random().toString(36).slice(2, 9);
      try { window.localStorage.setItem(KEY, id); } catch { /* ignore */ }
    }
    return id;
  });
  const [activeThreadId, setActiveThreadId] = useState(null);
  const [frontDeskTab, setFrontDeskTab] = useState("orders");

  const [showOnboarding, setShowOnboarding] = useState(!isAdmin);
  const [onboardStep, setOnboardStep] = useState(0);
  const [onboardInterest, setOnboardInterest] = useState("wholesale");
  const [onboardName, setOnboardName] = useState("");
  const [onboardContact, setOnboardContact] = useState("");
  const [onboardConsent, setOnboardConsent] = useState(false);

  const [bankList, setBankList] = useState([]);
  const [payment, setPayment] = useState({ bin: "", bankShortName: "", accountNumber: "", accountName: "" });
  const [paymentSaved, setPaymentSaved] = useState(false);

  const [catalog, setCatalog] = useState([]);
  const [productDraft, setProductDraft] = useState({
    id: null, nameEn: "", nameVi: "", line: "everyday",
    notesEn: "", notesVi: "", brewEn: "", brewVi: "", packSize: "", photoUrl: "",
  });

  const [testimonials, setTestimonials] = useState([]);
  const [testimonialDraft, setTestimonialDraft] = useState({ id: null, name: "", quote: "" });

  const [promos, setPromos] = useState([]);
  const [promoDraft, setPromoDraft] = useState({ id: null, code: "", percent: "", ownerName: "" });
  const [promoInput, setPromoInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState(null);
  const [promoError, setPromoError] = useState(false);

  const [orderConsent, setOrderConsent] = useState(false);

  const t = STR[lang];
  const other = lang === "en" ? "vi" : "en";

  const visibleCategories = useMemo(() => CATEGORIES.filter((c) => c.audience.includes(role)), [role]);
  const visibleCategoryIds = useMemo(() => new Set(visibleCategories.map((c) => c.id)), [visibleCategories]);
  const visibleArticles = useMemo(() => articles.filter((a) => visibleCategoryIds.has(a.category)), [articles, visibleCategoryIds]);

  const searchResults = useMemo(() => {
    if (!query.trim()) return null;
    const q = query.toLowerCase();
    return visibleArticles.filter((a) => {
      const title = (a.title[lang] || a.title.en || "").toLowerCase();
      const body = (a.body[lang] || a.body.en || "").toLowerCase();
      return title.includes(q) || body.includes(q);
    });
  }, [visibleArticles, query, lang]);

  const articlesInCategory = (catId) => visibleArticles.filter((a) => a.category === catId);
  const active = articles.find((a) => a.id === activeId);
  const activeCategoryMeta = wikiCategory ? CATEGORIES.find((c) => c.id === wikiCategory) : null;

  const resetWiki = () => {
    setWikiCategory(null);
    setActiveId(null);
    setEditing(false);
    setQuery("");
  };

  const startEdit = (a) => {
    setDraft({ title: a.title[lang] || a.title.en, body: a.body[lang] || a.body.en, category: a.category });
    setEditing(true);
  };
  const startNew = (presetCategory) => {
    setDraft({ title: "", body: "", category: presetCategory || wikiCategory || "legacy" });
    setActiveId(null);
    setEditing(true);
  };
  const saveDraft = async () => {
    if (!draft.title.trim()) return;
    if (activeId) {
      const existing = articles.find((a) => a.id === activeId);
      const updated = {
        category: draft.category,
        title: { ...existing.title, [lang]: draft.title },
        body: { ...existing.body, [lang]: draft.body },
      };
      await supabase.from("wiki_articles").update(updated).eq("id", activeId);
      setArticles(articles.map((a) => (a.id === activeId ? { ...a, ...updated } : a)));
    } else {
      const id = slugify(draft.title);
      const row = { id, category: draft.category, title: { [lang]: draft.title }, body: { [lang]: draft.body } };
      await supabase.from("wiki_articles").insert(row);
      setArticles([...articles, row]);
      setActiveId(id);
      setWikiCategory(draft.category);
    }
    setEditing(false);
  };
  const deleteArticle = async (id) => {
    await supabase.from("wiki_articles").delete().eq("id", id);
    setArticles(articles.filter((a) => a.id !== id));
    setActiveId(null);
    setEditing(false);
  };

  const nav = NAV.filter((n) => n.roles.includes(role));

  const wholesaleProducts = catalog.filter((p) => p.line !== "reserve");
  const retailProducts = catalog;

  const cartLines = wholesaleProducts.map((p) => ({ ...p, qty: Number(cart[p.id]) || 0 })).filter((p) => p.qty > 0);
  const totalKg = cartLines.reduce((sum, p) => sum + p.qty, 0);
  const currentTier = [...PRICE_TIERS].reverse().find((tier) => totalKg >= tier.min) || PRICE_TIERS[0];

  const retailCartLines = retailProducts.map((p) => ({ ...p, qty: Number(retailCart[p.id]) || 0 })).filter((p) => p.qty > 0);
  const retailTotalItems = retailCartLines.reduce((sum, p) => sum + p.qty, 0);

  const setQty = (id, val) => {
    const n = Math.max(0, Number(val) || 0);
    setCart((c) => ({ ...c, [id]: n }));
  };
  const setRetailQty = (id, val) => {
    const n = Math.max(0, Number(val) || 0);
    setRetailCart((c) => ({ ...c, [id]: n }));
  };

  const summaryText = useMemo(() => {
    if (cartLines.length === 0) return "";
    const lines = cartLines.map((p) => `- ${p.name[lang]}: ${p.qty} ${t.kg}`);
    return [
      `${t.summaryTitle} — House of Hoàng Long`,
      ...lines,
      `${t.totalKg}: ${totalKg} ${t.kg}`,
      `${t.tierApplied}: ${currentTier.range[lang]} (${currentTier.off[lang]})`,
    ].join("\n");
  }, [cartLines, totalKg, currentTier, lang, t]);

  const copySummary = async () => {
    try {
      await navigator.clipboard.writeText(summaryText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (e) {
      console.error("Copy failed:", e);
    }
  };

  // --- data loading ---
  const loadArticles = useCallback(async () => {
    const { data } = await supabase.from("wiki_articles").select("*");
    if (data) setArticles(data);
  }, [supabase]);

  const loadCatalog = useCallback(async () => {
    const { data } = await supabase.from("catalog_products").select("*");
    if (data) setCatalog(data.map(fromCatalogRow));
  }, [supabase]);

  const loadTestimonials = useCallback(async () => {
    const { data } = await supabase.from("testimonials").select("*");
    if (data) setTestimonials(data);
  }, [supabase]);

  const loadPayment = useCallback(async () => {
    const { data } = await supabase.rpc("get_payment_info");
    if (data && data.length > 0) setPayment(fromPaymentRow(data[0]));
  }, [supabase]);

  const loadOrders = useCallback(async () => {
    const { data } = await supabase.from("orders").select("*").order("ts", { ascending: true });
    if (data) setOrders(data.map(fromOrderRow));
  }, [supabase]);

  const loadThreads = useCallback(async () => {
    const { data } = await supabase.from("support_threads").select("*").order("created_at", { ascending: true });
    if (data) setThreads(data.map(fromThreadRow));
  }, [supabase]);

  const loadLeads = useCallback(async () => {
    const { data } = await supabase.from("leads").select("*").order("ts", { ascending: true });
    if (data) setLeads(data);
  }, [supabase]);

  const loadPromos = useCallback(async () => {
    const { data } = await supabase.from("promos").select("*").order("code");
    if (data) setPromos(data.map(fromPromoRow));
  }, [supabase]);

  const loadMyThread = useCallback(async () => {
    const { data } = await supabase.rpc("get_customer_thread", { p_customer_id: customerId });
    if (data && data.length > 0) setMyThread(fromThreadRow(data[0]));
  }, [supabase, customerId]);

  useEffect(() => {
    loadArticles();
    loadCatalog();
    loadTestimonials();
    loadPayment();
    (async () => {
      try {
        const res = await fetch("https://api.vietqr.io/v2/banks");
        const json = await res.json();
        if (json && json.data) setBankList(json.data);
      } catch (e) { console.error("Bank list fetch failed:", e); }
    })();
    if (isAdmin) {
      loadOrders();
      loadThreads();
      loadLeads();
      loadPromos();
    } else {
      loadMyThread();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin || section !== "frontdesk") return;
    const id = setInterval(() => { loadOrders(); loadThreads(); loadLeads(); }, 4000);
    return () => clearInterval(id);
  }, [isAdmin, section, loadOrders, loadThreads, loadLeads]);

  useEffect(() => {
    if (isAdmin || !chatOpen) return;
    loadMyThread();
    const id = setInterval(loadMyThread, 4000);
    return () => clearInterval(id);
  }, [isAdmin, chatOpen, loadMyThread]);

  const updateOrderStatus = async (id, status) => {
    await supabase.from("orders").update({ status }).eq("id", id);
    setOrders(orders.map((o) => (o.id === id ? { ...o, status } : o)));
  };
  const markOrderRead = async (id) => {
    await supabase.from("orders").update({ unread: false }).eq("id", id);
    setOrders(orders.map((o) => (o.id === id ? { ...o, unread: false } : o)));
  };
  const markLeadRead = async (id) => {
    await supabase.from("leads").update({ unread: false }).eq("id", id);
    setLeads(leads.map((l) => (l.id === id ? { ...l, unread: false } : l)));
  };

  const saveProductDraft = async () => {
    if (!productDraft.nameEn.trim() && !productDraft.nameVi.trim()) return;
    const fields = {
      line: productDraft.line,
      name: { en: productDraft.nameEn.trim(), vi: productDraft.nameVi.trim() },
      notes: { en: productDraft.notesEn.trim(), vi: productDraft.notesVi.trim() },
      brew: { en: productDraft.brewEn.trim(), vi: productDraft.brewVi.trim() },
      packSize: productDraft.packSize.trim(),
      photoUrl: productDraft.photoUrl.trim(),
    };
    if (productDraft.id) {
      await supabase.from("catalog_products").update({
        line: fields.line, name: fields.name, notes: fields.notes, brew: fields.brew,
        pack_size: fields.packSize, photo_url: fields.photoUrl,
      }).eq("id", productDraft.id);
      setCatalog(catalog.map((p) => (p.id === productDraft.id ? { ...p, ...fields } : p)));
    } else {
      const id = slugify(productDraft.nameEn || productDraft.nameVi);
      const newRow = { id, available: true, ...fields };
      await supabase.from("catalog_products").insert(toCatalogRow(newRow));
      setCatalog([...catalog, newRow]);
    }
    setProductDraft({ id: null, nameEn: "", nameVi: "", line: "everyday", notesEn: "", notesVi: "", brewEn: "", brewVi: "", packSize: "", photoUrl: "" });
  };
  const toggleAvailability = async (id) => {
    const p = catalog.find((x) => x.id === id);
    const next = !p.available;
    await supabase.from("catalog_products").update({ available: next }).eq("id", id);
    setCatalog(catalog.map((x) => (x.id === id ? { ...x, available: next } : x)));
  };
  const editProductDraft = (p) =>
    setProductDraft({
      id: p.id,
      nameEn: p.name.en || "", nameVi: p.name.vi || "", line: p.line,
      notesEn: p.notes?.en || "", notesVi: p.notes?.vi || "",
      brewEn: p.brew?.en || "", brewVi: p.brew?.vi || "",
      packSize: p.packSize || "", photoUrl: p.photoUrl || "",
    });
  const deleteProductFn = async (id) => {
    await supabase.from("catalog_products").delete().eq("id", id);
    setCatalog(catalog.filter((p) => p.id !== id));
  };

  const savePromoDraft = async () => {
    const pct = Number(promoDraft.percent);
    if (!promoDraft.code.trim() || !pct || pct <= 0) return;
    if (promoDraft.id) {
      const code = promoDraft.code.trim().toUpperCase();
      const ownerName = promoDraft.ownerName.trim();
      await supabase.from("promos").update({ code, percent: pct, owner_name: ownerName }).eq("id", promoDraft.id);
      setPromos(promos.map((p) => (p.id === promoDraft.id ? { ...p, code, percent: pct, ownerName } : p)));
    } else {
      const row = { id: "promo-" + Date.now().toString(36), code: promoDraft.code.trim().toUpperCase(), percent: pct, ownerName: promoDraft.ownerName.trim(), active: true };
      await supabase.from("promos").insert(toPromoRow(row));
      setPromos([...promos, row]);
    }
    setPromoDraft({ id: null, code: "", percent: "", ownerName: "" });
  };
  const togglePromoActive = async (id) => {
    const p = promos.find((x) => x.id === id);
    const next = !p.active;
    await supabase.from("promos").update({ active: next }).eq("id", id);
    setPromos(promos.map((x) => (x.id === id ? { ...x, active: next } : x)));
  };
  const deletePromo = async (id) => {
    await supabase.from("promos").delete().eq("id", id);
    setPromos(promos.filter((p) => p.id !== id));
  };
  const applyPromoCode = async () => {
    const code = promoInput.trim().toUpperCase();
    if (!code) return;
    const { data, error } = await supabase.rpc("apply_promo_code", { p_code: code });
    if (error || !data || data.length === 0) {
      setAppliedPromo(null);
      setPromoError(true);
      return;
    }
    const row = data[0];
    setAppliedPromo({ code: row.code, percent: row.percent, ownerName: row.owner_name || "" });
    setPromoError(false);
  };

  const saveTestimonialDraft = async () => {
    if (!testimonialDraft.name.trim() || !testimonialDraft.quote.trim()) return;
    if (testimonialDraft.id) {
      const name = testimonialDraft.name.trim();
      const quote = testimonialDraft.quote.trim();
      await supabase.from("testimonials").update({ name, quote }).eq("id", testimonialDraft.id);
      setTestimonials(testimonials.map((r) => (r.id === testimonialDraft.id ? { ...r, name, quote } : r)));
    } else {
      const row = { id: "review-" + Date.now().toString(36), name: testimonialDraft.name.trim(), quote: testimonialDraft.quote.trim() };
      await supabase.from("testimonials").insert(row);
      setTestimonials([...testimonials, row]);
    }
    setTestimonialDraft({ id: null, name: "", quote: "" });
  };
  const deleteTestimonial = async (id) => {
    await supabase.from("testimonials").delete().eq("id", id);
    setTestimonials(testimonials.filter((r) => r.id !== id));
  };

  const savePayment = async () => {
    await supabase.from("settings_payment").upsert(toPaymentRow(payment));
    setPaymentSaved(true);
    setTimeout(() => setPaymentSaved(false), 1800);
  };

  const printInvoice = (order) => {
    const itemRows = order.lines
      .map((l) => `<tr><td style="padding:8px 0;">${l.name.en || l.name.vi}</td><td style="padding:8px 0;text-align:right;">${l.qty} ${l.unit === "kg" ? "kg" : "pcs"}</td></tr>`)
      .join("");
    const totalLine =
      order.type === "retail"
        ? `<tr><td style="padding:10px 0;font-weight:700;">Total items</td><td style="padding:10px 0;text-align:right;font-weight:700;">${order.totalItems} pcs</td></tr>`
        : `<tr><td style="padding:10px 0;font-weight:700;">Total volume</td><td style="padding:10px 0;text-align:right;font-weight:700;">${order.totalKg} kg</td></tr>
           <tr><td colspan="2" style="padding:2px 0 10px;color:#AD8A4E;">${order.tier.range.en} · ${order.tier.off.en}</td></tr>`;
    const promoLine = order.promo ? `<tr><td colspan="2" style="padding:2px 0 10px;color:#9C3B2E;">Promo: ${order.promo.code} (-${order.promo.percent}%)</td></tr>` : "";
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Invoice ${order.id}</title>
      <style>
        body{font-family:Georgia,serif;color:#1C2B24;padding:40px;max-width:600px;margin:0 auto;}
        table{width:100%;border-collapse:collapse;}
        .seal{width:48px;height:48px;border-radius:50%;border:1.5px solid #AD8A4E;display:flex;align-items:center;justify-content:center;font-size:18px;color:#AD8A4E;margin-bottom:12px;}
        .brand{font-size:22px;font-weight:600;margin-bottom:2px;}
        .meta{font-size:13px;color:#2E4A40;margin-bottom:24px;}
        hr{border:none;border-top:1px solid #AD8A4E55;margin:16px 0;}
        h2{font-size:14px;text-transform:uppercase;letter-spacing:0.5px;color:#AD8A4E;margin:0 0 10px;}
      </style></head>
      <body>
        <div class="seal">皇龍</div>
        <div class="brand">House of Hoàng Long</div>
        <div class="meta">Invoice · Order ${order.id}<br/>${new Date(order.ts).toLocaleString("vi-VN")}</div>
        <hr/>
        <h2>Customer</h2>
        <p style="font-size:14px;line-height:1.7;margin:0 0 16px;">
          ${order.customerName}<br/>${order.contact}${order.address ? `<br/>${order.address}` : ""}${order.taxNumber ? `<br/>Tax No: ${order.taxNumber}` : ""}
        </p>
        <h2>Items</h2>
        <table>${itemRows}${totalLine}${promoLine}</table>
        ${order.note ? `<p style="font-size:13px;font-style:italic;color:#2E4A40;margin-top:16px;">Note: ${order.note}</p>` : ""}
        <hr/>
        <p style="font-size:11px;color:#2E4A40;">This is a preliminary invoice. Final pricing is confirmed by our team.</p>
      </body></html>`;
    const win = window.open("", "_blank", "width=700,height=900");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 350);
  };

  const exportOrdersCsv = () => {
    const headers = ["Order ID", "Date", "Type", "Customer", "Contact", "Address", "Tax Number", "Items", "Total", "Tier/VAT", "Promo", "Status", "Note"];
    const rows = orders.map((o) => [
      o.id,
      new Date(o.ts).toLocaleString("vi-VN"),
      o.type,
      o.customerName,
      o.contact,
      o.address || "",
      o.taxNumber || "",
      o.lines.map((l) => `${l.name.en || l.name.vi}: ${l.qty}${l.unit === "kg" ? "kg" : "pcs"}`).join(" | "),
      o.type === "retail" ? `${o.totalItems} pcs` : `${o.totalKg} kg`,
      o.type === "retail" ? `VAT ${o.vat}%` : `${o.tier?.range?.en || ""} (${o.tier?.off?.en || ""})`,
      o.promo ? `${o.promo.code} (-${o.promo.percent}%)${o.promo.ownerName ? " via " + o.promo.ownerName : ""}` : "",
      o.status || "pending",
      o.note || "",
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const vietQrUrl = (order) => {
    if (!payment.bin || !payment.accountNumber) return null;
    const info = encodeURIComponent(order ? order.id : "");
    const name = encodeURIComponent(payment.accountName || "");
    return `https://img.vietqr.io/image/${payment.bin}-${payment.accountNumber}-compact2.png?accountName=${name}&addInfo=${info}`;
  };

  const unreadOrders = orders.filter((o) => o.unread).length;
  const unreadThreads = threads.filter((th) => th.unreadForAdmin && th.messages.length > 0).length;
  const unreadLeads = leads.filter((l) => l.unread).length;
  const frontDeskBadge = unreadOrders + unreadThreads + unreadLeads;

  const submitLead = async () => {
    if (!onboardName.trim() || !onboardContact.trim() || !onboardConsent) return;
    const newLead = {
      id: "lead-" + Date.now().toString(36),
      ts: new Date().toISOString(),
      name: onboardName.trim(),
      contact: onboardContact.trim(),
      interest: onboardInterest,
      unread: true,
    };
    const { error } = await supabase.from("leads").insert(newLead);
    if (error) { console.error(error); return; }
    setOrderName(onboardName.trim());
    setOrderContact(onboardContact.trim());
    setOrderConsent(true);
    setRole(onboardInterest);
    setSection(onboardInterest);
    setShowOnboarding(false);
    setOnboardConsent(false);
  };

  const applyReorder = (order) => {
    const productList = order.type === "retail" ? retailProducts : wholesaleProducts;
    const newCart = {};
    order.lines.forEach((l) => {
      const match = productList.find((p) => p.name.en === l.name.en || p.name.vi === l.name.vi);
      if (match) newCart[match.id] = l.qty;
    });
    if (order.type === "retail") setRetailCart(newCart); else setCart(newCart);
    setOrderName(order.customerName);
    setOrderContact(order.contact);
    setOrderAddress(order.address || "");
    setOrderTaxNumber(order.taxNumber || "");
  };

  const submitOrder = async (type) => {
    if (!orderName.trim() || !orderContact.trim() || !orderConsent) return;
    const isRetail = type === "retail";
    const lines = isRetail
      ? retailCartLines.map((p) => ({ name: p.name, qty: p.qty, unit: "pcs" }))
      : cartLines.map((p) => ({ name: p.name, qty: p.qty, unit: "kg" }));
    const newOrder = {
      id: "order-" + Date.now().toString(36),
      ts: new Date().toISOString(),
      type,
      customerName: orderName.trim(),
      contact: orderContact.trim(),
      address: orderAddress.trim(),
      taxNumber: isRetail ? "" : orderTaxNumber.trim(),
      vat: isRetail ? 10 : null,
      promo: appliedPromo,
      note: orderNote.trim(),
      lines,
      totalKg: isRetail ? null : totalKg,
      totalItems: isRetail ? retailTotalItems : null,
      tier: isRetail ? null : currentTier,
      status: "pending",
      unread: true,
    };
    const { error } = await supabase.from("orders").insert(toOrderRow(newOrder));
    if (error) { console.error(error); return; }
    setOrderSubmitted(newOrder);
    if (isRetail) setRetailCart({}); else setCart({});
    setAppliedPromo(null);
    setPromoInput("");
    setPromoError(false);
    setOrderConsent(false);
  };

  const mailtoHref = (order) => {
    const subject = encodeURIComponent(`${order.type === "retail" ? "New retail order" : "New wholesale order"} — ${order.customerName}`);
    const bodyLines = [
      `Customer: ${order.customerName}`,
      `Contact: ${order.contact}`,
      order.address ? `Address: ${order.address}` : null,
      order.taxNumber ? `Tax number: ${order.taxNumber}` : null,
      order.note ? `Note: ${order.note}` : null,
      "",
      ...order.lines.map((l) => `- ${l.name[lang] || l.name.en}: ${l.qty} ${l.unit === "kg" ? "kg" : "pcs"}`),
      "",
      order.type === "retail" ? `Items: ${order.totalItems}` : `Total: ${order.totalKg} kg`,
      order.vat ? `VAT: ${order.vat}% (added to final invoice)` : null,
      order.promo ? `Promo code: ${order.promo.code} (-${order.promo.percent}%)` : null,
      order.tier ? `Tier: ${order.tier.range[lang]} (${order.tier.off[lang]})` : null,
    ].filter(Boolean);
    return `mailto:hotro.trahoanglong@gmail.com?subject=${subject}&body=${encodeURIComponent(bodyLines.join("\n"))}`;
  };

  const activeThread = threads.find((th) => th.id === activeThreadId);

  const sendChatMessage = async () => {
    if (!chatDraft.trim()) return;
    const { data, error } = await supabase.rpc("submit_customer_message", {
      p_customer_id: customerId,
      p_customer_name: chatName.trim() || "Guest",
      p_role: role,
      p_text: chatDraft.trim(),
    });
    setChatDraft("");
    if (!error && data && data.length > 0) setMyThread(fromThreadRow(data[0]));
  };

  const sendCustomerReply = async (text) => {
    const { data, error } = await supabase.rpc("submit_customer_message", {
      p_customer_id: customerId,
      p_customer_name: myThread?.customerName || chatName.trim() || "Guest",
      p_role: role,
      p_text: text,
    });
    if (!error && data && data.length > 0) setMyThread(fromThreadRow(data[0]));
  };

  const sendAdminReply = async (threadId, text) => {
    if (!text.trim()) return;
    const th = threads.find((x) => x.id === threadId);
    if (!th) return;
    const msg = { from: "admin", text: text.trim(), ts: new Date().toISOString() };
    const nextMessages = [...th.messages, msg];
    await supabase.from("support_threads").update({ messages: nextMessages, unread_for_admin: false }).eq("id", threadId);
    setThreads(threads.map((x) => (x.id === threadId ? { ...x, messages: nextMessages, unreadForAdmin: false } : x)));
  };

  const openThreadAsAdmin = async (threadId) => {
    setActiveThreadId(threadId);
    await supabase.from("support_threads").update({ unread_for_admin: false }).eq("id", threadId);
    setThreads(threads.map((x) => (x.id === threadId ? { ...x, unreadForAdmin: false } : x)));
  };

  return (
    <div style={{ fontFamily: "Inter, sans-serif", background: TOKENS.paper, minHeight: "100vh", color: TOKENS.jade, display: "flex", overflowX: "clip" }}>
      {/* Sidebar */}
      <aside
        style={{
          width: sidebarOpen ? 240 : 0,
          minWidth: sidebarOpen ? 240 : 0,
          background: TOKENS.jade,
          color: TOKENS.paper,
          transition: "width 0.25s ease, min-width 0.25s ease",
          overflow: "hidden",
          position: "sticky",
          top: 0,
          height: "100vh",
          zIndex: 20,
        }}
      >
        <div style={{ padding: "24px 20px", borderBottom: `1px solid ${TOKENS.jadeSoft}` }}>
          <div style={{ fontFamily: "Fraunces, Georgia, serif", fontSize: 20, letterSpacing: 1, color: TOKENS.brass }}>皇龍</div>
          <div style={{ fontSize: 13, marginTop: 4, opacity: 0.85, whiteSpace: "nowrap" }}>House of Hoàng Long</div>
        </div>
        <nav style={{ padding: "12px 10px" }}>
          {nav.map((n) => {
            const Icon = n.icon;
            const isActive = section === n.id;
            return (
              <button
                key={n.id}
                onClick={() => { setSection(n.id); resetWiki(); }}
                style={{
                  display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "11px 12px",
                  marginBottom: 4, background: isActive ? TOKENS.jadeSoft : "transparent", border: "none",
                  borderRadius: 8, color: isActive ? TOKENS.brass : TOKENS.paper, fontSize: 14,
                  fontWeight: isActive ? 600 : 400, cursor: "pointer", textAlign: "left", whiteSpace: "nowrap",
                }}
              >
                <Icon size={17} strokeWidth={1.8} />
                {n.label[lang]}
                {n.id === "frontdesk" && frontDeskBadge > 0 && (
                  <span style={{
                    marginLeft: "auto", background: TOKENS.lacquer, color: TOKENS.paper, borderRadius: 10,
                    fontSize: 11, fontWeight: 700, padding: "1px 7px", minWidth: 18, textAlign: "center",
                  }}>
                    {frontDeskBadge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
        <div style={{ position: "absolute", bottom: 16, left: 20, right: 20, fontSize: 11, opacity: 0.55, lineHeight: 1.5 }}>
          Trà Cổ Hà Giang – Công Nghệ Nhật Bản
        </div>
      </aside>

      {/* Main */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        {/* Top bar */}
        <header
          style={{
            display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px",
            borderBottom: `1px solid ${TOKENS.brassDeep}33`, background: TOKENS.paperDeep,
            position: "sticky", top: 0, zIndex: 10, gap: 10,
          }}
        >
          <button onClick={() => setSidebarOpen((s) => !s)} style={{ background: "none", border: "none", cursor: "pointer", color: TOKENS.jade, flexShrink: 0 }} aria-label="Menu">
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div style={{ fontFamily: "Fraunces, Georgia, serif", fontSize: 16, fontWeight: 600, flex: 1, minWidth: 0, overflowWrap: "anywhere" }}>
            {nav.find((n) => n.id === section)?.label[lang] || nav[0]?.label[lang]}
          </div>

          <button
            onClick={() => setLang(other)}
            title="Switch language"
            style={{
              display: "flex", alignItems: "center", gap: 5, border: `1px solid ${TOKENS.brassDeep}55`,
              background: TOKENS.paper, color: TOKENS.jade, borderRadius: 16, padding: "6px 10px",
              fontSize: 12, fontWeight: 600, cursor: "pointer", flexShrink: 0,
            }}
          >
            <Languages size={13} />
            {other.toUpperCase()}
          </button>

          {isAdmin ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
              <span style={{ fontSize: 12, color: TOKENS.jadeSoft, display: "none", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} className="staff-email">
                {staffEmail}
              </span>
              <button
                onClick={onLogout}
                title={t.logout}
                style={{
                  display: "flex", alignItems: "center", gap: 5, border: `1px solid ${TOKENS.brassDeep}55`,
                  background: TOKENS.paper, color: TOKENS.jade, borderRadius: 16, padding: "6px 10px",
                  fontSize: 12, fontWeight: 600, cursor: "pointer",
                }}
              >
                <LogOut size={13} /> {t.logout}
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 4, background: TOKENS.paper, borderRadius: 20, padding: 3, border: `1px solid ${TOKENS.brassDeep}44`, flexShrink: 0 }}>
              {ROLES.map((r) => (
                <button
                  key={r.id}
                  onClick={() => {
                    setRole(r.id);
                    setSection("home");
                    resetWiki();
                    setShowOnboarding(true);
                    setOnboardStep(0);
                    setOnboardInterest(r.id);
                  }}
                  title={r.label[lang]}
                  style={{
                    border: "none", borderRadius: 16, padding: "6px 10px", fontSize: 12, cursor: "pointer",
                    background: role === r.id ? TOKENS.brass : "transparent",
                    color: role === r.id ? TOKENS.paper : TOKENS.jade,
                    display: "flex", alignItems: "center", gap: 5, whiteSpace: "nowrap",
                  }}
                >
                  <r.icon size={13} />
                </button>
              ))}
            </div>
          )}
        </header>

        {/* Content */}
        <main style={{ flex: 1, padding: "24px 20px 60px", maxWidth: 860, width: "100%", margin: "0 auto", minWidth: 0 }}>
          {section === "home" && (
            <div style={{ margin: "-24px -20px 0", padding: "0 0 40px" }}>
              {/* Hero */}
              <div
                style={{
                  position: "relative",
                  background: `linear-gradient(160deg, ${TOKENS.jade} 0%, ${TOKENS.jadeSoft} 100%)`,
                  color: TOKENS.paper,
                  padding: "56px 24px 44px",
                  overflow: "hidden",
                }}
              >
                <svg
                  viewBox="0 0 400 90"
                  preserveAspectRatio="none"
                  style={{ position: "absolute", left: 0, right: 0, bottom: 0, width: "100%", height: 70, opacity: 0.16 }}
                >
                  <path d="M0,90 L0,55 L45,20 L80,48 L120,10 L165,50 L210,28 L250,55 L290,15 L335,45 L400,25 L400,90 Z" fill={TOKENS.brass} />
                </svg>

                <div style={{ position: "relative", maxWidth: 520 }}>
                  <div
                    style={{
                      width: 52, height: 52, borderRadius: "50%", border: `1.5px solid ${TOKENS.brass}`,
                      display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20,
                      fontFamily: "'Noto Serif SC', serif", fontSize: 20, color: TOKENS.brass,
                    }}
                  >
                    皇龍
                  </div>
                  <div style={{ fontSize: 11, letterSpacing: 2.5, textTransform: "uppercase", color: TOKENS.brass, marginBottom: 10, fontWeight: 600 }}>
                    Est. 1995 · Hà Giang
                  </div>
                  <h1 style={{ fontFamily: "Fraunces, Georgia, serif", fontWeight: 500, fontSize: "clamp(28px, 7vw, 42px)", lineHeight: 1.08, margin: "0 0 14px", overflowWrap: "anywhere" }}>
                    House of Hoàng Long
                  </h1>
                  <div style={{ width: 40, height: 2, background: TOKENS.brass }} />
                </div>
              </div>

              {/* Viewing-as strip */}
              {!isAdmin && (
                <div style={{ padding: "14px 20px", fontSize: 12.5, color: TOKENS.jadeSoft, borderBottom: `1px solid ${TOKENS.brassDeep}22` }}>
                  {t.viewingAs}: <strong style={{ color: TOKENS.jade }}>{ROLES.find((r) => r.id === role)?.label[lang]}</strong>
                </div>
              )}

              {/* Bento entry points */}
              <div style={{ padding: "22px 20px 0", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
                {nav.filter((n) => n.id !== "home").map((n, i) => {
                  const Icon = n.icon;
                  const featured = i === 0;
                  return (
                    <button
                      key={n.id}
                      onClick={() => { setSection(n.id); resetWiki(); }}
                      style={{
                        gridColumn: featured ? "1 / -1" : "auto",
                        background: featured ? TOKENS.paperDeep : TOKENS.paper,
                        border: `1px solid ${TOKENS.brassDeep}${featured ? "66" : "33"}`,
                        borderRadius: 14, padding: featured ? "26px 24px" : "20px 18px",
                        textAlign: "left", cursor: "pointer", minWidth: 0,
                        display: "flex", flexDirection: featured ? "row" : "column",
                        alignItems: featured ? "center" : "flex-start", gap: featured ? 20 : 12,
                        justifyContent: "space-between",
                      }}
                    >
                      <div style={{ display: "flex", flexDirection: "column", gap: featured ? 8 : 10, minWidth: 0 }}>
                        <div style={{
                          width: featured ? 44 : 36, height: featured ? 44 : 36, borderRadius: 10, background: TOKENS.jade,
                          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                        }}>
                          <Icon size={featured ? 21 : 17} color={TOKENS.brass} strokeWidth={1.6} />
                        </div>
                        <div style={{ fontFamily: "Fraunces, Georgia, serif", fontWeight: 500, fontSize: featured ? 20 : 16, overflowWrap: "anywhere" }}>
                          {n.label[lang]}
                        </div>
                        <div style={{ fontSize: 12.5, color: TOKENS.jadeSoft }}>
                          {n.id === "wiki"
                            ? (lang === "en" ? "The full story behind the leaf — legacy, origin, and craft." : t.articleCount(visibleCategories.length))
                            : t.comingSoon}
                        </div>
                      </div>
                      <ChevronRight size={18} color={TOKENS.brassDeep} style={{ flexShrink: 0, display: featured ? "block" : "none" }} />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ---------- WIKI: MAIN MENU (level 1) ---------- */}
          {section === "wiki" && !wikiCategory && !editing && (
            <div>
              <div style={{ position: "relative", marginBottom: 22 }}>
                <Search size={16} style={{ position: "absolute", left: 12, top: 12, color: TOKENS.jadeSoft }} />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t.search}
                  style={{
                    width: "100%", boxSizing: "border-box", padding: "10px 12px 10px 36px", borderRadius: 8,
                    border: `1px solid ${TOKENS.brassDeep}55`, background: TOKENS.paperDeep, fontSize: 14, color: TOKENS.jade,
                  }}
                />
              </div>

              {searchResults ? (
                <div>
                  <div style={{ fontSize: 12, color: TOKENS.jadeSoft, marginBottom: 10 }}>{t.results(searchResults.length, query)}</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {searchResults.map((a) => (
                      <button
                        key={a.id}
                        onClick={() => { setWikiCategory(a.category); setActiveId(a.id); }}
                        style={{
                          display: "flex", alignItems: "center", justifyContent: "space-between", background: TOKENS.paperDeep,
                          border: `1px solid ${TOKENS.brassDeep}33`, borderRadius: 10, padding: "13px 14px", textAlign: "left",
                          cursor: "pointer", fontSize: 14.5, color: TOKENS.jade, minWidth: 0,
                        }}
                      >
                        <span style={{ overflowWrap: "anywhere" }}>{a.title[lang] || a.title.en}</span>
                        <ChevronRight size={16} color={TOKENS.brassDeep} style={{ flexShrink: 0, marginLeft: 8 }} />
                      </button>
                    ))}
                    {searchResults.length === 0 && <p style={{ color: TOKENS.jadeSoft, fontSize: 14 }}>{t.noResults}</p>}
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ fontSize: 12.5, color: TOKENS.jadeSoft, marginBottom: 16 }}>{t.chooseSection}</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {visibleCategories.map((cat, i) => {
                      const Icon = cat.icon;
                      const count = articlesInCategory(cat.id).length;
                      return (
                        <button
                          key={cat.id}
                          onClick={() => setWikiCategory(cat.id)}
                          style={{
                            display: "flex", alignItems: "center", gap: 14, background: TOKENS.paperDeep,
                            border: `1px solid ${TOKENS.brassDeep}44`, borderRadius: 12, padding: "16px 16px",
                            textAlign: "left", cursor: "pointer", minWidth: 0,
                          }}
                        >
                          <div style={{ width: 38, height: 38, borderRadius: 10, background: TOKENS.jade, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <Icon size={18} color={TOKENS.brass} strokeWidth={1.7} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 15, fontWeight: 600, overflowWrap: "anywhere" }}>{i + 1}. {cat.label[lang]}</div>
                            <div style={{ fontSize: 12.5, color: TOKENS.jadeSoft, marginTop: 2 }}>{cat.subtitle[lang]} · {count}</div>
                          </div>
                          <ChevronRight size={17} color={TOKENS.brassDeep} style={{ flexShrink: 0 }} />
                        </button>
                      );
                    })}
                  </div>
                  {isAdmin && (
                    <button
                      onClick={() => startNew(null)}
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", marginTop: 16,
                        background: "transparent", color: TOKENS.brassDeep, border: `1px dashed ${TOKENS.brassDeep}88`,
                        borderRadius: 10, padding: "12px", fontSize: 13.5, fontWeight: 600, cursor: "pointer",
                      }}
                    >
                      <Plus size={15} /> {t.addArticle}
                    </button>
                  )}
                </>
              )}
            </div>
          )}

          {/* ---------- WIKI: CATEGORY LIST (level 2) ---------- */}
          {section === "wiki" && wikiCategory && !activeId && !editing && (
            <div>
              <button onClick={() => setWikiCategory(null)} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: TOKENS.jadeSoft, cursor: "pointer", fontSize: 13.5, marginBottom: 16, padding: 0 }}>
                <ChevronLeft size={15} /> {t.allSections}
              </button>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
                {activeCategoryMeta && <activeCategoryMeta.icon size={20} color={TOKENS.brassDeep} />}
                <h2 style={{ fontFamily: "Fraunces, Georgia, serif", fontSize: "clamp(19px, 4vw, 24px)", margin: 0, overflowWrap: "anywhere" }}>
                  {activeCategoryMeta?.label[lang]}
                </h2>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {articlesInCategory(wikiCategory).map((a) => (
                  <button
                    key={a.id}
                    onClick={() => setActiveId(a.id)}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between", background: TOKENS.paperDeep,
                      border: `1px solid ${TOKENS.brassDeep}33`, borderRadius: 10, padding: "13px 14px", textAlign: "left",
                      cursor: "pointer", fontSize: 14.5, color: TOKENS.jade, minWidth: 0,
                    }}
                  >
                    <span style={{ overflowWrap: "anywhere" }}>{a.title[lang] || a.title.en}</span>
                    <ChevronRight size={16} color={TOKENS.brassDeep} style={{ flexShrink: 0, marginLeft: 8 }} />
                  </button>
                ))}
                {articlesInCategory(wikiCategory).length === 0 && <p style={{ color: TOKENS.jadeSoft, fontSize: 14 }}>{t.noArticles}</p>}
              </div>
              {isAdmin && (
                <button
                  onClick={() => startNew(wikiCategory)}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", marginTop: 14,
                    background: "transparent", color: TOKENS.brassDeep, border: `1px dashed ${TOKENS.brassDeep}88`,
                    borderRadius: 10, padding: "11px", fontSize: 13, fontWeight: 600, cursor: "pointer",
                  }}
                >
                  <Plus size={14} /> {t.addToSection}
                </button>
              )}
            </div>
          )}

          {/* ---------- WIKI: ARTICLE (level 3) ---------- */}
          {section === "wiki" && activeId && active && !editing && (
            <div>
              <button onClick={() => setActiveId(null)} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: TOKENS.jadeSoft, cursor: "pointer", fontSize: 13.5, marginBottom: 16, padding: 0 }}>
                <ChevronLeft size={15} /> {activeCategoryMeta?.label[lang]}
              </button>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: TOKENS.brassDeep, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>
                {activeCategoryMeta?.label[lang]}
              </div>
              <h2 style={{ fontFamily: "Fraunces, Georgia, serif", fontSize: "clamp(20px, 4vw, 26px)", margin: "0 0 16px", overflowWrap: "anywhere" }}>
                {active.title[lang] || active.title.en}
              </h2>
              <div style={{ whiteSpace: "pre-line", fontSize: 15, lineHeight: 1.75, color: TOKENS.jade }}>
                {active.body[lang] || active.body.en || <em style={{ color: TOKENS.jadeSoft }}>— {STR[other].noResults}</em>}
              </div>

              {active.id === "dong-san-pham" && (
                <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 22 }}>
                  {["everyday", "reserve"].map((lineId) => {
                    const items = catalog.filter((p) => p.line === lineId);
                    if (items.length === 0) return null;
                    return (
                      <div key={lineId}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: TOKENS.brassDeep, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>
                          {lineId === "everyday" ? t.everydayOption : t.reserveOption}
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                          {items.map((p) => (
                            <div
                              key={p.id}
                              onClick={() => setDetailProduct({ product: p, cartType: lineId === "reserve" ? "retail" : (role === "retail" ? "retail" : "wholesale") })}
                              style={{ display: "flex", gap: 12, background: TOKENS.paperDeep, border: `1px solid ${TOKENS.brassDeep}33`, borderRadius: 12, padding: 14, opacity: p.available === false ? 0.6 : 1, cursor: "pointer" }}
                            >
                              {p.photoUrl && (
                                <img src={p.photoUrl} alt={p.name[lang]} style={{ width: 64, height: 64, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />
                              )}
                              <div style={{ minWidth: 0, flex: 1 }}>
                                <div style={{ fontSize: 14.5, fontWeight: 600, overflowWrap: "anywhere" }}>
                                  {p.name[lang]}
                                  {p.available === false && <span style={{ color: TOKENS.lacquer, fontSize: 11, fontWeight: 700, marginLeft: 8 }}>· {t.outOfStock}</span>}
                                </div>
                                {p.notes?.[lang] && <div style={{ fontSize: 13, color: TOKENS.jadeSoft, fontStyle: "italic", marginTop: 3 }}>{p.notes[lang]}</div>}
                                <div style={{ fontSize: 12, color: TOKENS.brassDeep, marginTop: 4 }}>
                                  {p.brew?.[lang]}
                                  {p.packSize && ` · ${p.packSize}`}
                                </div>
                                <div style={{ fontSize: 11, color: TOKENS.jadeSoft, marginTop: 6, textDecoration: "underline" }}>{t.viewDetails}</div>
                              </div>
                              <ChevronRight size={16} color={TOKENS.brassDeep} style={{ flexShrink: 0, alignSelf: "center" }} />
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {isAdmin && (
                <div style={{ display: "flex", gap: 10, marginTop: 24, flexWrap: "wrap" }}>
                  <button onClick={() => startEdit(active)} style={{ display: "flex", alignItems: "center", gap: 6, background: TOKENS.brass, color: TOKENS.paper, border: "none", borderRadius: 8, padding: "9px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                    <Edit3 size={14} /> {t.edit}
                  </button>
                  <button onClick={() => deleteArticle(active.id)} style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", color: TOKENS.lacquer, border: `1px solid ${TOKENS.lacquer}55`, borderRadius: 8, padding: "9px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                    <Trash2 size={14} /> {t.delete}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ---------- WIKI: EDIT ---------- */}
          {section === "wiki" && editing && (
            <div>
              <button onClick={() => setEditing(false)} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: TOKENS.jadeSoft, cursor: "pointer", fontSize: 13.5, marginBottom: 16, padding: 0 }}>
                <ChevronLeft size={15} /> {t.cancel}
              </button>
              <div style={{ fontSize: 12, color: TOKENS.jadeSoft, marginBottom: 10 }}>
                Editing {lang.toUpperCase()} content{activeId ? "" : " (new article)"}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <input
                  value={draft.title}
                  onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                  placeholder={t.titlePh}
                  style={{ padding: "11px 13px", borderRadius: 8, border: `1px solid ${TOKENS.brassDeep}55`, fontSize: 15, fontWeight: 600, background: TOKENS.paperDeep, color: TOKENS.jade }}
                />
                <select
                  value={draft.category}
                  onChange={(e) => setDraft({ ...draft, category: e.target.value })}
                  style={{ padding: "11px 13px", borderRadius: 8, border: `1px solid ${TOKENS.brassDeep}55`, fontSize: 13.5, background: TOKENS.paperDeep, color: TOKENS.jade }}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>{c.label[lang]}</option>
                  ))}
                </select>
                <textarea
                  value={draft.body}
                  onChange={(e) => setDraft({ ...draft, body: e.target.value })}
                  placeholder={t.bodyPh}
                  rows={12}
                  style={{ padding: "11px 13px", borderRadius: 8, border: `1px solid ${TOKENS.brassDeep}55`, fontSize: 14.5, lineHeight: 1.6, background: TOKENS.paperDeep, color: TOKENS.jade, resize: "vertical", fontFamily: "inherit" }}
                />
                <button onClick={saveDraft} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, background: TOKENS.jade, color: TOKENS.paper, border: "none", borderRadius: 8, padding: "12px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                  <Save size={15} /> {t.save}
                </button>
              </div>
            </div>
          )}

          {/* ---------- TRADE PARTNERS ---------- */}
          {section === "wholesale" && (
            <div>
              {orderSubmitted && orderSubmitted.type === "wholesale" ? (
                <div style={{ textAlign: "center", padding: "40px 16px" }}>
                  <div style={{ display: "inline-flex", padding: 16, borderRadius: "50%", background: TOKENS.paperDeep, marginBottom: 16 }}>
                    <Check size={26} color={TOKENS.brassDeep} />
                  </div>
                  <h2 style={{ fontFamily: "Fraunces, Georgia, serif", fontSize: 20, margin: "0 0 8px" }}>{t.orderSent}</h2>
                  <PaymentBlock order={orderSubmitted} payment={payment} qrUrl={vietQrUrl(orderSubmitted)} onPrint={printInvoice} t={t} TOKENS={TOKENS} />
                  <a
                    href={mailtoHref(orderSubmitted)}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 7, marginTop: 14, background: TOKENS.jade, color: TOKENS.paper,
                      borderRadius: 8, padding: "10px 16px", fontSize: 13.5, fontWeight: 600, textDecoration: "none",
                    }}
                  >
                    <Send size={14} /> {t.emailFallback}
                  </a>
                  <div>
                    <button
                      onClick={() => { setOrderSubmitted(null); setOrderName(""); setOrderContact(""); setOrderAddress(""); setOrderTaxNumber(""); setOrderNote(""); }}
                      style={{ marginTop: 18, background: "none", border: "none", color: TOKENS.jadeSoft, fontSize: 13, cursor: "pointer", textDecoration: "underline" }}
                    >
                      {t.orderTitle}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <h2 style={{ fontFamily: "Fraunces, Georgia, serif", fontWeight: 500, fontSize: 22, margin: "0 0 4px" }}>{t.orderTitle}</h2>
                  <p style={{ color: TOKENS.jadeSoft, fontSize: 13.5, marginBottom: 18 }}>{t.orderHint}</p>
                  {!isAdmin && <ReorderBox supabase={supabase} type="wholesale" onApply={applyReorder} t={t} TOKENS={TOKENS} />}

                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
                    {[...wholesaleProducts].sort((a, b) => (a.available === false ? 1 : 0) - (b.available === false ? 1 : 0)).map((p) => (
                      <div
                        key={p.id}
                        style={{
                          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
                          background: TOKENS.paperDeep, border: `1px solid ${TOKENS.brassDeep}33`,
                          borderRadius: 10, padding: "10px 14px", opacity: p.available === false ? 0.55 : 1,
                        }}
                      >
                        <div
                          onClick={() => setDetailProduct({ product: p, cartType: "wholesale" })}
                          style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, cursor: "pointer" }}
                        >
                          {p.photoUrl && (
                            <img src={p.photoUrl} alt={p.name[lang]} style={{ width: 40, height: 40, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />
                          )}
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 14, overflowWrap: "anywhere" }}>{p.name[lang]}</div>
                            {p.notes?.[lang] && (
                              <div style={{ fontSize: 11.5, color: TOKENS.jadeSoft, fontStyle: "italic", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 200 }}>
                                {p.notes[lang]}
                              </div>
                            )}
                          </div>
                        </div>
                        {p.available === false ? (
                          <span style={{ fontSize: 11.5, fontWeight: 700, color: TOKENS.lacquer, flexShrink: 0 }}>{t.outOfStock}</span>
                        ) : (
                        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                          <input
                            type="number"
                            min="0"
                            inputMode="numeric"
                            value={cart[p.id] || ""}
                            onChange={(e) => setQty(p.id, e.target.value)}
                            placeholder="0"
                            style={{
                              width: 68, padding: "8px 10px", borderRadius: 8, border: `1px solid ${TOKENS.brassDeep}55`,
                              background: TOKENS.paper, color: TOKENS.jade, fontSize: 14, textAlign: "right",
                            }}
                          />
                          <span style={{ fontSize: 12.5, color: TOKENS.jadeSoft }}>{t.kg}</span>
                        </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {cartLines.length === 0 ? (
                    <p style={{ color: TOKENS.jadeSoft, fontSize: 13.5, fontStyle: "italic" }}>{t.emptyCart}</p>
                  ) : (
                    <div style={{ background: TOKENS.jade, color: TOKENS.paper, borderRadius: 12, padding: "18px 18px 16px", marginBottom: 20 }}>
                      <div style={{ fontSize: 11.5, letterSpacing: 1, textTransform: "uppercase", color: TOKENS.brass, marginBottom: 10, fontWeight: 600 }}>
                        {t.summaryTitle}
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 12 }}>
                        {cartLines.map((p) => (
                          <div key={p.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5 }}>
                            <span style={{ opacity: 0.9 }}>{p.name[lang]}</span>
                            <span>{p.qty} {t.kg}</span>
                          </div>
                        ))}
                      </div>
                      <div style={{ borderTop: `1px solid ${TOKENS.paper}33`, paddingTop: 10, display: "flex", flexDirection: "column", gap: 4, marginBottom: 14 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, fontWeight: 600 }}>
                          <span>{t.totalKg}</span>
                          <span>{totalKg} {t.kg}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: TOKENS.brass }}>
                          <span>{t.tierApplied}</span>
                          <span>{currentTier.range[lang]} · {currentTier.off[lang]}</span>
                        </div>
                        {appliedPromo && (
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: TOKENS.brass }}>
                            <span>{t.promoLabel}</span>
                            <span>{appliedPromo.code} (-{appliedPromo.percent}%)</span>
                          </div>
                        )}
                      </div>

                      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
                        <input
                          value={promoInput}
                          onChange={(e) => { setPromoInput(e.target.value); setPromoError(false); }}
                          placeholder={t.promoCodePh}
                          style={{ flex: 1, padding: "9px 12px", borderRadius: 8, border: `1px solid ${TOKENS.paper}44`, background: `${TOKENS.paper}14`, color: TOKENS.paper, fontSize: 13, minWidth: 0 }}
                        />
                        <button
                          onClick={applyPromoCode}
                          style={{ background: TOKENS.paper, color: TOKENS.jade, border: "none", borderRadius: 8, padding: "9px 14px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}
                        >
                          {t.applyPromo}
                        </button>
                      </div>
                      {promoError && <p style={{ fontSize: 12, color: "#E8A99A", marginTop: -8, marginBottom: 12 }}>{t.promoInvalid}</p>}

                      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
                        <input
                          value={orderName}
                          onChange={(e) => setOrderName(e.target.value)}
                          placeholder={t.yourName}
                          style={{ padding: "9px 12px", borderRadius: 8, border: `1px solid ${TOKENS.paper}44`, background: `${TOKENS.paper}14`, color: TOKENS.paper, fontSize: 13.5 }}
                        />
                        <input
                          value={orderContact}
                          onChange={(e) => setOrderContact(e.target.value)}
                          placeholder={t.yourContact}
                          style={{ padding: "9px 12px", borderRadius: 8, border: `1px solid ${TOKENS.paper}44`, background: `${TOKENS.paper}14`, color: TOKENS.paper, fontSize: 13.5 }}
                        />
                        <input
                          value={orderAddress}
                          onChange={(e) => setOrderAddress(e.target.value)}
                          placeholder={t.yourAddress}
                          style={{ padding: "9px 12px", borderRadius: 8, border: `1px solid ${TOKENS.paper}44`, background: `${TOKENS.paper}14`, color: TOKENS.paper, fontSize: 13.5 }}
                        />
                        <input
                          value={orderTaxNumber}
                          onChange={(e) => setOrderTaxNumber(e.target.value)}
                          placeholder={t.taxNumber}
                          style={{ padding: "9px 12px", borderRadius: 8, border: `1px solid ${TOKENS.paper}44`, background: `${TOKENS.paper}14`, color: TOKENS.paper, fontSize: 13.5 }}
                        />
                        <textarea
                          value={orderNote}
                          onChange={(e) => setOrderNote(e.target.value)}
                          placeholder={t.orderNote}
                          rows={3}
                          style={{ padding: "9px 12px", borderRadius: 8, border: `1px solid ${TOKENS.paper}44`, background: `${TOKENS.paper}14`, color: TOKENS.paper, fontSize: 13.5, resize: "vertical", fontFamily: "inherit" }}
                        />
                      </div>

                      <label style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 12, fontSize: 12, color: `${TOKENS.paper}cc`, cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={orderConsent}
                          onChange={(e) => setOrderConsent(e.target.checked)}
                          style={{ marginTop: 2, flexShrink: 0 }}
                        />
                        {t.consentLabel}
                      </label>

                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          onClick={copySummary}
                          style={{
                            display: "flex", alignItems: "center", justifyContent: "center", gap: 6, flex: 1,
                            background: copied ? TOKENS.brass : "transparent", color: copied ? TOKENS.jade : TOKENS.paper,
                            border: `1px solid ${TOKENS.brass}`, borderRadius: 8, padding: "10px", fontSize: 13, fontWeight: 600, cursor: "pointer",
                          }}
                        >
                          {copied ? <Check size={14} /> : <Copy size={14} />}
                          {copied ? t.copied : t.copySummary}
                        </button>
                        <button
                          onClick={() => submitOrder("wholesale")}
                          disabled={!orderName.trim() || !orderContact.trim() || !orderConsent}
                          title={!orderConsent ? t.consentRequired : (!orderName.trim() || !orderContact.trim()) ? t.nameRequired : ""}
                          style={{
                            display: "flex", alignItems: "center", justifyContent: "center", gap: 6, flex: 1,
                            background: TOKENS.brass, color: TOKENS.jade, border: "none", borderRadius: 8, padding: "10px",
                            fontSize: 13, fontWeight: 700, cursor: "pointer",
                            opacity: (!orderName.trim() || !orderContact.trim() || !orderConsent) ? 0.5 : 1,
                          }}
                        >
                          <Send size={14} /> {t.submitOrder}
                        </button>
                      </div>
                    </div>
                  )}

                  <p style={{ color: TOKENS.jadeSoft, fontSize: 12.5, lineHeight: 1.6, marginBottom: 20 }}>{t.tradeQuoteNote}</p>

                  <div style={{ fontSize: 11.5, fontWeight: 700, color: TOKENS.brassDeep, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>
                    {t.priceRef}
                  </div>
                  <div style={{ border: `1px solid ${TOKENS.brassDeep}44`, borderRadius: 12, overflow: "hidden" }}>
                    {PRICE_TIERS.map((row, i) => (
                      <div
                        key={i}
                        style={{
                          display: "flex", justifyContent: "space-between", padding: "12px 16px",
                          background: row.min === currentTier.min ? `${TOKENS.brass}22` : (i % 2 === 0 ? TOKENS.paperDeep : TOKENS.paper),
                          borderTop: i === 0 ? "none" : `1px solid ${TOKENS.brassDeep}22`, fontSize: 13.5,
                        }}
                      >
                        <span>{row.range[lang]}</span>
                        <strong style={{ color: TOKENS.brassDeep }}>{row.off[lang]}</strong>
                      </div>
                    ))}
                  </div>
                  {!isAdmin && <TrackOrderBox supabase={supabase} lang={lang} t={t} TOKENS={TOKENS} />}
                </>
              )}
            </div>
          )}

          {/* ---------- FRONT DESK (internal only) ---------- */}
          {section === "frontdesk" && isAdmin && (
            <div>
              {(() => {
                const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
                const weeklyOrders = orders.filter((o) => new Date(o.ts).getTime() >= weekAgo);
                const weeklyKg = weeklyOrders.filter((o) => o.type === "wholesale").reduce((s, o) => s + (o.totalKg || 0), 0);
                const weeklyLeadsCount = leads.filter((l) => new Date(l.ts).getTime() >= weekAgo).length;
                const weeklyMsgCount = threads.reduce(
                  (s, th) => s + th.messages.filter((m) => m.from === "customer" && new Date(m.ts).getTime() >= weekAgo).length,
                  0
                );
                const stats = [
                  { label: t.statsOrders, value: weeklyOrders.length },
                  { label: t.statsWholesaleVolume, value: `${weeklyKg} kg` },
                  { label: t.statsLeads, value: weeklyLeadsCount },
                  { label: t.statsMessages, value: weeklyMsgCount },
                ];
                return (
                  <div style={{ marginBottom: 18 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: TOKENS.brassDeep, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>
                      {t.statsWeekTitle}
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 8 }}>
                      {stats.map((s, i) => (
                        <div key={i} style={{ background: TOKENS.paperDeep, border: `1px solid ${TOKENS.brassDeep}33`, borderRadius: 10, padding: "10px 12px" }}>
                          <div style={{ fontSize: 20, fontWeight: 700, color: TOKENS.jade }}>{s.value}</div>
                          <div style={{ fontSize: 11, color: TOKENS.jadeSoft }}>{s.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              <div style={{ display: "flex", gap: 8, marginBottom: 20, overflowX: "auto", paddingBottom: 4 }}>
                {["orders", "leads", "messages", "payment", "catalog", "reviews", "promos"].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setFrontDeskTab(tab)}
                    style={{
                      flex: "0 0 auto", minWidth: 88, padding: "10px 12px", borderRadius: 8, border: `1px solid ${TOKENS.brassDeep}44`,
                      background: frontDeskTab === tab ? TOKENS.jade : TOKENS.paperDeep,
                      color: frontDeskTab === tab ? TOKENS.paper : TOKENS.jade,
                      fontSize: 13.5, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    }}
                  >
                    {tab === "orders" ? t.frontDeskOrders : tab === "leads" ? t.frontDeskLeads : tab === "payment" ? t.frontDeskPayment : tab === "catalog" ? t.catalogTitle : tab === "reviews" ? t.reviewsTitle : tab === "promos" ? t.promosTitle : t.frontDeskMessages}
                    {tab === "orders" && unreadOrders > 0 && (
                      <span style={{ background: TOKENS.lacquer, color: TOKENS.paper, borderRadius: 10, fontSize: 10.5, padding: "1px 6px" }}>{unreadOrders}</span>
                    )}
                    {tab === "leads" && unreadLeads > 0 && (
                      <span style={{ background: TOKENS.lacquer, color: TOKENS.paper, borderRadius: 10, fontSize: 10.5, padding: "1px 6px" }}>{unreadLeads}</span>
                    )}
                    {tab === "messages" && unreadThreads > 0 && (
                      <span style={{ background: TOKENS.lacquer, color: TOKENS.paper, borderRadius: 10, fontSize: 10.5, padding: "1px 6px" }}>{unreadThreads}</span>
                    )}
                  </button>
                ))}
              </div>

              {frontDeskTab === "leads" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {leads.length === 0 && <p style={{ color: TOKENS.jadeSoft, fontSize: 14 }}>{t.noLeadsYet}</p>}
                  {[...leads].reverse().map((l) => (
                    <div key={l.id} style={{ background: TOKENS.paperDeep, border: `1px solid ${TOKENS.brassDeep}${l.unread ? "88" : "33"}`, borderRadius: 12, padding: 16 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div>
                          <div style={{ fontSize: 15, fontWeight: 600 }}>{l.name}</div>
                          <div style={{ fontSize: 12.5, color: TOKENS.jadeSoft }}>{t.contactLabel}: {l.contact}</div>
                          <div style={{ fontSize: 12.5, color: TOKENS.brassDeep, marginTop: 2 }}>{t.interestedIn}: {l.interest === "wholesale" ? t.onboardWholesale : t.onboardRetail}</div>
                        </div>
                        {l.unread && <span style={{ background: TOKENS.lacquer, color: TOKENS.paper, borderRadius: 10, fontSize: 10.5, fontWeight: 700, padding: "2px 8px", flexShrink: 0 }}>{t.newBadge}</span>}
                      </div>
                      {l.unread && (
                        <button
                          onClick={() => markLeadRead(l.id)}
                          style={{ fontSize: 12.5, color: TOKENS.jadeSoft, background: "none", border: `1px solid ${TOKENS.brassDeep}55`, borderRadius: 6, padding: "6px 10px", cursor: "pointer", marginTop: 10 }}
                        >
                          {t.markRead}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {frontDeskTab === "payment" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 420 }}>
                  <p style={{ fontSize: 12.5, color: TOKENS.jadeSoft, margin: 0 }}>
                    {t.paymentSettingsTitle} — {lang === "en" ? "shown to customers as a VietQR code after they submit an order." : "hiện cho khách dưới dạng mã VietQR sau khi họ gửi đơn."}
                  </p>
                  <select
                    value={payment.bin}
                    onChange={(e) => {
                      const bank = bankList.find((b) => b.bin === e.target.value);
                      setPayment({ ...payment, bin: e.target.value, bankShortName: bank ? bank.shortName : "" });
                    }}
                    style={{ padding: "10px 12px", borderRadius: 8, border: `1px solid ${TOKENS.brassDeep}55`, fontSize: 13.5, background: TOKENS.paperDeep, color: TOKENS.jade }}
                  >
                    <option value="">{t.selectBank}</option>
                    {bankList.map((b) => (
                      <option key={b.bin} value={b.bin}>{b.shortName} — {b.name}</option>
                    ))}
                  </select>
                  <input
                    value={payment.accountNumber}
                    onChange={(e) => setPayment({ ...payment, accountNumber: e.target.value })}
                    placeholder={t.accountNumberLabel}
                    style={{ padding: "10px 12px", borderRadius: 8, border: `1px solid ${TOKENS.brassDeep}55`, fontSize: 13.5 }}
                  />
                  <input
                    value={payment.accountName}
                    onChange={(e) => setPayment({ ...payment, accountName: e.target.value })}
                    placeholder={t.accountNameLabel}
                    style={{ padding: "10px 12px", borderRadius: 8, border: `1px solid ${TOKENS.brassDeep}55`, fontSize: 13.5 }}
                  />
                  <button
                    onClick={savePayment}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: paymentSaved ? TOKENS.brass : TOKENS.jade,
                      color: paymentSaved ? TOKENS.jade : TOKENS.paper, border: "none", borderRadius: 8, padding: "11px", fontSize: 13.5, fontWeight: 600, cursor: "pointer",
                    }}
                  >
                    {paymentSaved ? <Check size={14} /> : <Save size={14} />}
                    {paymentSaved ? t.savedNote : t.saveSettings}
                  </button>
                  {payment.bin && payment.accountNumber && (
                    <img
                      src={`https://img.vietqr.io/image/${payment.bin}-${payment.accountNumber}-compact2.png?accountName=${encodeURIComponent(payment.accountName || "")}`}
                      alt="VietQR preview"
                      style={{ width: 160, height: 160, borderRadius: 8, border: `1px solid ${TOKENS.brassDeep}33`, alignSelf: "flex-start" }}
                    />
                  )}
                </div>
              )}

              {frontDeskTab === "catalog" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ background: TOKENS.paperDeep, border: `1px solid ${TOKENS.brassDeep}44`, borderRadius: 12, padding: 14, display: "flex", flexDirection: "column", gap: 8 }}>
                    <input
                      value={productDraft.nameEn}
                      onChange={(e) => setProductDraft({ ...productDraft, nameEn: e.target.value })}
                      placeholder={t.productNameEnPh}
                      style={{ padding: "9px 12px", borderRadius: 8, border: `1px solid ${TOKENS.brassDeep}55`, fontSize: 13.5 }}
                    />
                    <input
                      value={productDraft.nameVi}
                      onChange={(e) => setProductDraft({ ...productDraft, nameVi: e.target.value })}
                      placeholder={t.productNameViPh}
                      style={{ padding: "9px 12px", borderRadius: 8, border: `1px solid ${TOKENS.brassDeep}55`, fontSize: 13.5 }}
                    />
                    <select
                      value={productDraft.line}
                      onChange={(e) => setProductDraft({ ...productDraft, line: e.target.value })}
                      style={{ padding: "9px 12px", borderRadius: 8, border: `1px solid ${TOKENS.brassDeep}55`, fontSize: 13.5 }}
                    >
                      <option value="everyday">{t.everydayOption}</option>
                      <option value="reserve">{t.reserveOption}</option>
                    </select>
                    <input
                      value={productDraft.notesEn}
                      onChange={(e) => setProductDraft({ ...productDraft, notesEn: e.target.value })}
                      placeholder={t.tastingNotesEnPh}
                      style={{ padding: "9px 12px", borderRadius: 8, border: `1px solid ${TOKENS.brassDeep}55`, fontSize: 13.5 }}
                    />
                    <input
                      value={productDraft.notesVi}
                      onChange={(e) => setProductDraft({ ...productDraft, notesVi: e.target.value })}
                      placeholder={t.tastingNotesViPh}
                      style={{ padding: "9px 12px", borderRadius: 8, border: `1px solid ${TOKENS.brassDeep}55`, fontSize: 13.5 }}
                    />
                    <div style={{ display: "flex", gap: 8 }}>
                      <input
                        value={productDraft.brewEn}
                        onChange={(e) => setProductDraft({ ...productDraft, brewEn: e.target.value })}
                        placeholder={t.brewEnPh}
                        style={{ flex: 1, padding: "9px 12px", borderRadius: 8, border: `1px solid ${TOKENS.brassDeep}55`, fontSize: 13, minWidth: 0 }}
                      />
                      <input
                        value={productDraft.brewVi}
                        onChange={(e) => setProductDraft({ ...productDraft, brewVi: e.target.value })}
                        placeholder={t.brewViPh}
                        style={{ flex: 1, padding: "9px 12px", borderRadius: 8, border: `1px solid ${TOKENS.brassDeep}55`, fontSize: 13, minWidth: 0 }}
                      />
                    </div>
                    <input
                      value={productDraft.packSize}
                      onChange={(e) => setProductDraft({ ...productDraft, packSize: e.target.value })}
                      placeholder={t.packSizePh}
                      style={{ padding: "9px 12px", borderRadius: 8, border: `1px solid ${TOKENS.brassDeep}55`, fontSize: 13.5 }}
                    />
                    <input
                      value={productDraft.photoUrl}
                      onChange={(e) => setProductDraft({ ...productDraft, photoUrl: e.target.value })}
                      placeholder={t.photoUrlPh}
                      style={{ padding: "9px 12px", borderRadius: 8, border: `1px solid ${TOKENS.brassDeep}55`, fontSize: 13.5 }}
                    />
                    <button
                      onClick={saveProductDraft}
                      style={{ background: TOKENS.jade, color: TOKENS.paper, border: "none", borderRadius: 8, padding: "10px", fontSize: 13.5, fontWeight: 600, cursor: "pointer" }}
                    >
                      {productDraft.id ? t.saveProduct : t.addProduct}
                    </button>
                  </div>

                  {catalog.map((p) => (
                    <div key={p.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: TOKENS.paperDeep, border: `1px solid ${TOKENS.brassDeep}33`, borderRadius: 10, padding: "10px 14px", opacity: p.available === false ? 0.6 : 1 }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>{p.name.en} <span style={{ color: TOKENS.jadeSoft, fontWeight: 400 }}>· {p.name.vi}</span></div>
                        <div style={{ fontSize: 11.5, color: TOKENS.brassDeep }}>
                          {p.line === "reserve" ? t.reserveOption : t.everydayOption}
                          {p.packSize && ` · ${p.packSize}`}
                          {p.available === false && <span style={{ color: TOKENS.lacquer, marginLeft: 6 }}>· {t.outOfStock}</span>}
                        </div>
                        {p.notes?.en && <div style={{ fontSize: 12, color: TOKENS.jade, fontStyle: "italic", marginTop: 3 }}>{p.notes.en}</div>}
                        {!p.notes?.en && !p.photoUrl && (
                          <div style={{ fontSize: 11, color: `${TOKENS.jadeSoft}99`, marginTop: 3 }}>{t.missingDetailsHint}</div>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                        <button
                          onClick={() => toggleAvailability(p.id)}
                          title={p.available === false ? t.markAvailable : t.markOutOfStock}
                          style={{ background: "none", border: `1px solid ${p.available === false ? TOKENS.brass : TOKENS.brassDeep}55`, borderRadius: 6, padding: "6px 8px", cursor: "pointer" }}
                        >
                          {p.available === false ? <Check size={13} color={TOKENS.brass} /> : <X size={13} color={TOKENS.jadeSoft} />}
                        </button>
                        <button onClick={() => editProductDraft(p)} style={{ background: "none", border: `1px solid ${TOKENS.brassDeep}55`, borderRadius: 6, padding: "6px 8px", cursor: "pointer" }}>
                          <Edit3 size={13} color={TOKENS.jade} />
                        </button>
                        <button onClick={() => deleteProductFn(p.id)} style={{ background: "none", border: `1px solid ${TOKENS.lacquer}55`, borderRadius: 6, padding: "6px 8px", cursor: "pointer" }}>
                          <Trash2 size={13} color={TOKENS.lacquer} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {frontDeskTab === "reviews" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ background: TOKENS.paperDeep, border: `1px solid ${TOKENS.brassDeep}44`, borderRadius: 12, padding: 14, display: "flex", flexDirection: "column", gap: 8 }}>
                    <input
                      value={testimonialDraft.name}
                      onChange={(e) => setTestimonialDraft({ ...testimonialDraft, name: e.target.value })}
                      placeholder={t.reviewerNamePh}
                      style={{ padding: "9px 12px", borderRadius: 8, border: `1px solid ${TOKENS.brassDeep}55`, fontSize: 13.5 }}
                    />
                    <textarea
                      value={testimonialDraft.quote}
                      onChange={(e) => setTestimonialDraft({ ...testimonialDraft, quote: e.target.value })}
                      placeholder={t.reviewQuotePh}
                      rows={3}
                      style={{ padding: "9px 12px", borderRadius: 8, border: `1px solid ${TOKENS.brassDeep}55`, fontSize: 13.5, resize: "vertical", fontFamily: "inherit" }}
                    />
                    <button
                      onClick={saveTestimonialDraft}
                      style={{ background: TOKENS.jade, color: TOKENS.paper, border: "none", borderRadius: 8, padding: "10px", fontSize: 13.5, fontWeight: 600, cursor: "pointer" }}
                    >
                      {testimonialDraft.id ? t.saveProduct : t.addReview}
                    </button>
                  </div>
                  {testimonials.length === 0 && <p style={{ color: TOKENS.jadeSoft, fontSize: 14 }}>{t.noReviewsYetAdmin}</p>}
                  {testimonials.map((r) => (
                    <div key={r.id} style={{ background: TOKENS.paperDeep, border: `1px solid ${TOKENS.brassDeep}33`, borderRadius: 10, padding: "12px 14px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 600 }}>{r.name}</div>
                          <div style={{ fontSize: 13, color: TOKENS.jadeSoft, fontStyle: "italic", marginTop: 3 }}>&quot;{r.quote}&quot;</div>
                        </div>
                        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                          <button onClick={() => setTestimonialDraft({ id: r.id, name: r.name, quote: r.quote })} style={{ background: "none", border: `1px solid ${TOKENS.brassDeep}55`, borderRadius: 6, padding: "6px 8px", cursor: "pointer" }}>
                            <Edit3 size={13} color={TOKENS.jade} />
                          </button>
                          <button onClick={() => deleteTestimonial(r.id)} style={{ background: "none", border: `1px solid ${TOKENS.lacquer}55`, borderRadius: 6, padding: "6px 8px", cursor: "pointer" }}>
                            <Trash2 size={13} color={TOKENS.lacquer} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {frontDeskTab === "promos" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ background: TOKENS.paperDeep, border: `1px solid ${TOKENS.brassDeep}44`, borderRadius: 12, padding: 14, display: "flex", flexDirection: "column", gap: 8 }}>
                    <input
                      value={promoDraft.code}
                      onChange={(e) => setPromoDraft({ ...promoDraft, code: e.target.value })}
                      placeholder={t.promoCodeFieldPh}
                      style={{ padding: "9px 12px", borderRadius: 8, border: `1px solid ${TOKENS.brassDeep}55`, fontSize: 13.5, textTransform: "uppercase" }}
                    />
                    <input
                      type="number"
                      value={promoDraft.percent}
                      onChange={(e) => setPromoDraft({ ...promoDraft, percent: e.target.value })}
                      placeholder={t.promoPercentPh}
                      style={{ padding: "9px 12px", borderRadius: 8, border: `1px solid ${TOKENS.brassDeep}55`, fontSize: 13.5 }}
                    />
                    <input
                      value={promoDraft.ownerName}
                      onChange={(e) => setPromoDraft({ ...promoDraft, ownerName: e.target.value })}
                      placeholder={t.affiliateNamePh}
                      style={{ padding: "9px 12px", borderRadius: 8, border: `1px solid ${TOKENS.brassDeep}55`, fontSize: 13.5 }}
                    />
                    <button
                      onClick={savePromoDraft}
                      style={{ background: TOKENS.jade, color: TOKENS.paper, border: "none", borderRadius: 8, padding: "10px", fontSize: 13.5, fontWeight: 600, cursor: "pointer" }}
                    >
                      {promoDraft.id ? t.saveProduct : t.addPromo}
                    </button>
                  </div>
                  {promos.length === 0 && <p style={{ color: TOKENS.jadeSoft, fontSize: 14 }}>{t.noPromosYet}</p>}
                  {promos.map((p) => {
                    const usedOrders = orders.filter((o) => o.promo && o.promo.code === p.code);
                    const usedKg = usedOrders.filter((o) => o.type === "wholesale").reduce((s, o) => s + (o.totalKg || 0), 0);
                    const usedPcs = usedOrders.filter((o) => o.type === "retail").reduce((s, o) => s + (o.totalItems || 0), 0);
                    return (
                      <div key={p.id} style={{ background: TOKENS.paperDeep, border: `1px solid ${TOKENS.brassDeep}33`, borderRadius: 10, padding: "10px 14px", opacity: p.active ? 1 : 0.55 }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 700, fontFamily: "monospace" }}>{p.code}</div>
                            <div style={{ fontSize: 11.5, color: TOKENS.brassDeep }}>-{p.percent}%{p.ownerName ? ` · ${p.ownerName}` : ""}</div>
                          </div>
                          <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                            <button onClick={() => setPromoDraft({ id: p.id, code: p.code, percent: String(p.percent), ownerName: p.ownerName || "" })} style={{ background: "none", border: `1px solid ${TOKENS.brassDeep}55`, borderRadius: 6, padding: "6px 8px", cursor: "pointer" }}>
                              <Edit3 size={13} color={TOKENS.jade} />
                            </button>
                            <button onClick={() => togglePromoActive(p.id)} style={{ background: "none", border: `1px solid ${TOKENS.brassDeep}55`, borderRadius: 6, padding: "6px 10px", fontSize: 11.5, cursor: "pointer", color: TOKENS.jade }}>
                              {p.active ? t.deactivate : t.activate}
                            </button>
                            <button onClick={() => deletePromo(p.id)} style={{ background: "none", border: `1px solid ${TOKENS.lacquer}55`, borderRadius: 6, padding: "6px 8px", cursor: "pointer" }}>
                              <Trash2 size={13} color={TOKENS.lacquer} />
                            </button>
                          </div>
                        </div>
                        {p.ownerName && (
                          <div style={{ fontSize: 12, color: TOKENS.jadeSoft, marginTop: 8, borderTop: `1px solid ${TOKENS.brassDeep}22`, paddingTop: 8 }}>
                            {t.usedCount(usedOrders.length)}{usedKg > 0 ? ` · ${usedKg} kg` : ""}{usedPcs > 0 ? ` · ${usedPcs} pcs` : ""}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {frontDeskTab === "orders" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {orders.length > 0 && (
                    <button
                      onClick={exportOrdersCsv}
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 6, alignSelf: "flex-start",
                        background: TOKENS.paperDeep, color: TOKENS.jade, border: `1px solid ${TOKENS.brassDeep}55`,
                        borderRadius: 8, padding: "8px 14px", fontSize: 12.5, fontWeight: 600, cursor: "pointer", marginBottom: 4,
                      }}
                    >
                      <Download size={14} /> {t.exportCsv}
                    </button>
                  )}
                  {orders.length === 0 && <p style={{ color: TOKENS.jadeSoft, fontSize: 14 }}>{t.noOrdersYet}</p>}
                  {[...orders].reverse().map((o) => (
                    <div key={o.id} style={{ background: TOKENS.paperDeep, border: `1px solid ${TOKENS.brassDeep}${o.unread ? "88" : "33"}`, borderRadius: 12, padding: 16 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                        <span style={{
                          fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5,
                          background: o.type === "retail" ? `${TOKENS.jadeSoft}22` : `${TOKENS.brass}22`,
                          color: o.type === "retail" ? TOKENS.jadeSoft : TOKENS.brassDeep, padding: "2px 8px", borderRadius: 6,
                        }}>
                          {o.type === "retail" ? t.shopTitle : t.orderTitle}
                        </span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                        <div>
                          <div style={{ fontSize: 15, fontWeight: 600 }}>{o.customerName}</div>
                          <div style={{ fontSize: 12.5, color: TOKENS.jadeSoft }}>{t.contactLabel}: {o.contact}</div>
                          {o.address && <div style={{ fontSize: 12.5, color: TOKENS.jadeSoft }}>{t.yourAddress}: {o.address}</div>}
                          {o.taxNumber && <div style={{ fontSize: 12.5, color: TOKENS.jadeSoft }}>{t.taxNumber}: {o.taxNumber}</div>}
                          {o.vat && <div style={{ fontSize: 12.5, color: TOKENS.brassDeep }}>VAT: {o.vat}%</div>}
                          {o.promo && <div style={{ fontSize: 12.5, color: TOKENS.lacquer }}>{t.promoLabel}: {o.promo.code} (-{o.promo.percent}%){o.promo.ownerName ? ` · ${o.promo.ownerName}` : ""}</div>}
                        </div>
                        {o.unread && <span style={{ background: TOKENS.lacquer, color: TOKENS.paper, borderRadius: 10, fontSize: 10.5, fontWeight: 700, padding: "2px 8px", flexShrink: 0 }}>{t.newBadge}</span>}
                      </div>
                      <div style={{ fontSize: 13.5, lineHeight: 1.7, marginBottom: 8 }}>
                        {o.lines.map((l, i) => (
                          <div key={i} style={{ display: "flex", justifyContent: "space-between" }}>
                            <span>{l.name[lang] || l.name.en}</span>
                            <span>{l.qty} {l.unit === "kg" ? t.kg : t.pcs}</span>
                          </div>
                        ))}
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 600, borderTop: `1px solid ${TOKENS.brassDeep}33`, paddingTop: 8 }}>
                        {o.type === "retail" ? (
                          <span>{t.itemsTotal}: {o.totalItems} {t.pcs}</span>
                        ) : (
                          <>
                            <span>{o.totalKg} {t.kg}</span>
                            <span style={{ color: TOKENS.brassDeep }}>{o.tier.range[lang]} · {o.tier.off[lang]}</span>
                          </>
                        )}
                      </div>
                      {o.note && <div style={{ fontSize: 12.5, color: TOKENS.jadeSoft, marginTop: 8, fontStyle: "italic" }}>{t.noteLabel}: {o.note}</div>}

                      <div style={{ marginTop: 12 }}>
                        <div style={{ fontSize: 11, color: TOKENS.jadeSoft, marginBottom: 5 }}>{t.orderStatusLabel}</div>
                        <div style={{ display: "flex", gap: 5 }}>
                          {STATUS_STEPS.map((s) => (
                            <button
                              key={s.id}
                              onClick={() => updateOrderStatus(o.id, s.id)}
                              style={{
                                flex: 1, fontSize: 11, padding: "6px 4px", borderRadius: 6, cursor: "pointer",
                                border: `1px solid ${TOKENS.brassDeep}55`,
                                background: (o.status || "pending") === s.id ? TOKENS.jade : "transparent",
                                color: (o.status || "pending") === s.id ? TOKENS.paper : TOKENS.jadeSoft,
                                fontWeight: (o.status || "pending") === s.id ? 700 : 400,
                              }}
                            >
                              {s.label[lang]}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                        <a href={mailtoHref(o)} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12.5, color: TOKENS.jade, textDecoration: "none", border: `1px solid ${TOKENS.brassDeep}55`, borderRadius: 6, padding: "6px 10px" }}>
                          <Send size={12} /> {t.emailFallback}
                        </a>
                        <button onClick={() => printInvoice(o)} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12.5, color: TOKENS.jade, background: "none", border: `1px solid ${TOKENS.brassDeep}55`, borderRadius: 6, padding: "6px 10px", cursor: "pointer" }}>
                          <Printer size={12} /> {t.printInvoice}
                        </button>
                        {o.unread && (
                          <button onClick={() => markOrderRead(o.id)} style={{ fontSize: 12.5, color: TOKENS.jadeSoft, background: "none", border: `1px solid ${TOKENS.brassDeep}55`, borderRadius: 6, padding: "6px 10px", cursor: "pointer" }}>
                            {t.markRead}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {frontDeskTab === "messages" && !activeThreadId && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {threads.length === 0 && <p style={{ color: TOKENS.jadeSoft, fontSize: 14 }}>{t.noThreadsYet}</p>}
                  {[...threads].reverse().map((th) => (
                    <button
                      key={th.id}
                      onClick={() => openThreadAsAdmin(th.id)}
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between", background: TOKENS.paperDeep,
                        border: `1px solid ${TOKENS.brassDeep}${th.unreadForAdmin ? "88" : "33"}`, borderRadius: 10, padding: "13px 14px",
                        textAlign: "left", cursor: "pointer",
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 14.5, fontWeight: 600 }}>{th.customerName}</div>
                        <div style={{ fontSize: 12, color: TOKENS.jadeSoft, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 220 }}>
                          {th.messages[th.messages.length - 1]?.text}
                        </div>
                      </div>
                      {th.unreadForAdmin && <span style={{ background: TOKENS.lacquer, color: TOKENS.paper, borderRadius: 10, fontSize: 10.5, fontWeight: 700, padding: "2px 8px", flexShrink: 0 }}>{t.newBadge}</span>}
                    </button>
                  ))}
                </div>
              )}

              {frontDeskTab === "messages" && activeThreadId && activeThread && (
                <ChatThreadPanel
                  thread={activeThread}
                  onBack={() => setActiveThreadId(null)}
                  onSend={(text) => sendAdminReply(activeThread.id, text)}
                  meLabel={t.admin}
                  themLabel={activeThread.customerName}
                  replyPh={t.replyPh}
                  backLabel={t.back}
                />
              )}
            </div>
          )}

          {/* ---------- TEA SHOP ---------- */}
          {section === "retail" && (
            <div>
              {orderSubmitted && orderSubmitted.type === "retail" ? (
                <div style={{ textAlign: "center", padding: "40px 16px" }}>
                  <div style={{ display: "inline-flex", padding: 16, borderRadius: "50%", background: TOKENS.paperDeep, marginBottom: 16 }}>
                    <Check size={26} color={TOKENS.brassDeep} />
                  </div>
                  <h2 style={{ fontFamily: "Fraunces, Georgia, serif", fontSize: 20, margin: "0 0 8px" }}>{t.orderSent}</h2>
                  <PaymentBlock order={orderSubmitted} payment={payment} qrUrl={vietQrUrl(orderSubmitted)} onPrint={printInvoice} t={t} TOKENS={TOKENS} />
                  <a
                    href={mailtoHref(orderSubmitted)}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 7, marginTop: 14, background: TOKENS.jade, color: TOKENS.paper,
                      borderRadius: 8, padding: "10px 16px", fontSize: 13.5, fontWeight: 600, textDecoration: "none",
                    }}
                  >
                    <Send size={14} /> {t.emailFallback}
                  </a>
                  <div>
                    <button
                      onClick={() => { setOrderSubmitted(null); setOrderName(""); setOrderContact(""); setOrderAddress(""); setOrderTaxNumber(""); setOrderNote(""); }}
                      style={{ marginTop: 18, background: "none", border: "none", color: TOKENS.jadeSoft, fontSize: 13, cursor: "pointer", textDecoration: "underline" }}
                    >
                      {t.shopTitle}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <h2 style={{ fontFamily: "Fraunces, Georgia, serif", fontWeight: 500, fontSize: 22, margin: "0 0 4px" }}>{t.shopTitle}</h2>
                  <p style={{ color: TOKENS.jadeSoft, fontSize: 13.5, marginBottom: 18 }}>{t.shopHint}</p>
                  {!isAdmin && <ReorderBox supabase={supabase} type="retail" onApply={applyReorder} t={t} TOKENS={TOKENS} />}

                  {testimonials.length > 0 && (
                    <div style={{ marginBottom: 22 }}>
                      <div style={{ fontSize: 11.5, fontWeight: 700, color: TOKENS.brassDeep, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>
                        {t.testimonialsHeading}
                      </div>
                      <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 6 }}>
                        {testimonials.map((r) => (
                          <div key={r.id} style={{ flex: "0 0 auto", width: 220, background: TOKENS.paperDeep, border: `1px solid ${TOKENS.brassDeep}33`, borderRadius: 12, padding: 14 }}>
                            <div style={{ fontSize: 13, color: TOKENS.jade, fontStyle: "italic", lineHeight: 1.5, marginBottom: 8 }}>&quot;{r.quote}&quot;</div>
                            <div style={{ fontSize: 12.5, fontWeight: 600, color: TOKENS.brassDeep }}>— {r.name}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div style={{ display: "flex", flexDirection: "column", gap: 18, marginBottom: 20 }}>
                    {["everyday", "reserve"].map((lineId) => {
                      const items = [...retailProducts]
                        .filter((p) => p.line === lineId)
                        .sort((a, b) => (a.available === false ? 1 : 0) - (b.available === false ? 1 : 0));
                      if (items.length === 0) return null;
                      return (
                        <div key={lineId}>
                          <div style={{ fontSize: 11.5, fontWeight: 700, color: TOKENS.brassDeep, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>
                            {lineId === "everyday" ? t.everydayOption : t.reserveOption}
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            {items.map((p) => (
                              <div
                                key={p.id}
                                style={{
                                  display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
                                  background: TOKENS.paperDeep, border: `1px solid ${TOKENS.brassDeep}33`,
                                  borderRadius: 10, padding: "10px 14px", opacity: p.available === false ? 0.55 : 1,
                                }}
                              >
                                <div
                                  onClick={() => setDetailProduct({ product: p, cartType: "retail" })}
                                  style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, cursor: "pointer" }}
                                >
                                  {p.photoUrl && (
                                    <img src={p.photoUrl} alt={p.name[lang]} style={{ width: 40, height: 40, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />
                                  )}
                                  <div style={{ minWidth: 0 }}>
                                    <div style={{ fontSize: 14, overflowWrap: "anywhere" }}>{p.name[lang]}</div>
                                    {p.notes?.[lang] && (
                                      <div style={{ fontSize: 11.5, color: TOKENS.jadeSoft, fontStyle: "italic", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 200 }}>
                                        {p.notes[lang]}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                {p.available === false ? (
                                  <span style={{ fontSize: 11.5, fontWeight: 700, color: TOKENS.lacquer, flexShrink: 0 }}>{t.outOfStock}</span>
                                ) : (
                                <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                                  <input
                                    type="number"
                                    min="0"
                                    inputMode="numeric"
                                    value={retailCart[p.id] || ""}
                                    onChange={(e) => setRetailQty(p.id, e.target.value)}
                                    placeholder="0"
                                    style={{
                                      width: 68, padding: "8px 10px", borderRadius: 8, border: `1px solid ${TOKENS.brassDeep}55`,
                                      background: TOKENS.paper, color: TOKENS.jade, fontSize: 14, textAlign: "right",
                                    }}
                                  />
                                  <span style={{ fontSize: 12.5, color: TOKENS.jadeSoft }}>{t.pcs}</span>
                                </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {retailCartLines.length === 0 ? (
                    <p style={{ color: TOKENS.jadeSoft, fontSize: 13.5, fontStyle: "italic" }}>{t.emptyCart}</p>
                  ) : (
                    <div style={{ background: TOKENS.jade, color: TOKENS.paper, borderRadius: 12, padding: "18px 18px 16px", marginBottom: 20 }}>
                      <div style={{ fontSize: 11.5, letterSpacing: 1, textTransform: "uppercase", color: TOKENS.brass, marginBottom: 10, fontWeight: 600 }}>
                        {t.summaryTitle}
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 12 }}>
                        {retailCartLines.map((p) => (
                          <div key={p.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5 }}>
                            <span style={{ opacity: 0.9 }}>{p.name[lang]}</span>
                            <span>{p.qty} {t.pcs}</span>
                          </div>
                        ))}
                      </div>
                      <div style={{ borderTop: `1px solid ${TOKENS.paper}33`, paddingTop: 10, display: "flex", justifyContent: "space-between", fontSize: 14, fontWeight: 600 }}>
                        <span>{t.itemsTotal}</span>
                        <span>{retailTotalItems} {t.pcs}</span>
                      </div>
                      {appliedPromo && (
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: TOKENS.brass, marginTop: 4 }}>
                          <span>{t.promoLabel}</span>
                          <span>{appliedPromo.code} (-{appliedPromo.percent}%)</span>
                        </div>
                      )}
                      <p style={{ fontSize: 11.5, color: `${TOKENS.paper}99`, margin: "6px 0 14px" }}>{t.vatNote}</p>

                      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
                        <input
                          value={promoInput}
                          onChange={(e) => { setPromoInput(e.target.value); setPromoError(false); }}
                          placeholder={t.promoCodePh}
                          style={{ flex: 1, padding: "9px 12px", borderRadius: 8, border: `1px solid ${TOKENS.paper}44`, background: `${TOKENS.paper}14`, color: TOKENS.paper, fontSize: 13, minWidth: 0 }}
                        />
                        <button
                          onClick={applyPromoCode}
                          style={{ background: TOKENS.paper, color: TOKENS.jade, border: "none", borderRadius: 8, padding: "9px 14px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}
                        >
                          {t.applyPromo}
                        </button>
                      </div>
                      {promoError && <p style={{ fontSize: 12, color: "#E8A99A", marginTop: -8, marginBottom: 12 }}>{t.promoInvalid}</p>}

                      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
                        <input
                          value={orderName}
                          onChange={(e) => setOrderName(e.target.value)}
                          placeholder={t.yourName}
                          style={{ padding: "9px 12px", borderRadius: 8, border: `1px solid ${TOKENS.paper}44`, background: `${TOKENS.paper}14`, color: TOKENS.paper, fontSize: 13.5 }}
                        />
                        <input
                          value={orderContact}
                          onChange={(e) => setOrderContact(e.target.value)}
                          placeholder={t.yourContact}
                          style={{ padding: "9px 12px", borderRadius: 8, border: `1px solid ${TOKENS.paper}44`, background: `${TOKENS.paper}14`, color: TOKENS.paper, fontSize: 13.5 }}
                        />
                        <input
                          value={orderAddress}
                          onChange={(e) => setOrderAddress(e.target.value)}
                          placeholder={t.yourAddress}
                          style={{ padding: "9px 12px", borderRadius: 8, border: `1px solid ${TOKENS.paper}44`, background: `${TOKENS.paper}14`, color: TOKENS.paper, fontSize: 13.5 }}
                        />
                        <textarea
                          value={orderNote}
                          onChange={(e) => setOrderNote(e.target.value)}
                          placeholder={t.orderNote}
                          rows={3}
                          style={{ padding: "9px 12px", borderRadius: 8, border: `1px solid ${TOKENS.paper}44`, background: `${TOKENS.paper}14`, color: TOKENS.paper, fontSize: 13.5, resize: "vertical", fontFamily: "inherit" }}
                        />
                      </div>

                      <label style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 12, fontSize: 12, color: `${TOKENS.paper}cc`, cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={orderConsent}
                          onChange={(e) => setOrderConsent(e.target.checked)}
                          style={{ marginTop: 2, flexShrink: 0 }}
                        />
                        {t.consentLabel}
                      </label>

                      <button
                        onClick={() => submitOrder("retail")}
                        disabled={!orderName.trim() || !orderContact.trim() || !orderConsent}
                        title={!orderConsent ? t.consentRequired : (!orderName.trim() || !orderContact.trim()) ? t.nameRequired : ""}
                        style={{
                          display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%",
                          background: TOKENS.brass, color: TOKENS.jade, border: "none", borderRadius: 8, padding: "10px",
                          fontSize: 13.5, fontWeight: 700, cursor: "pointer",
                          opacity: (!orderName.trim() || !orderContact.trim() || !orderConsent) ? 0.5 : 1,
                        }}
                      >
                        <Send size={14} /> {t.submitOrder}
                      </button>
                    </div>
                  )}
                  {!isAdmin && <TrackOrderBox supabase={supabase} lang={lang} t={t} TOKENS={TOKENS} />}
                </>
              )}
            </div>
          )}
        </main>
      </div>

      {/* ---------- FLOATING SUPPORT CHAT (customer-facing) ---------- */}
      {!isAdmin && (
        <>
          <button
            onClick={() => setChatOpen((s) => !s)}
            style={{
              position: "fixed", bottom: 20, right: 20, width: 52, height: 52, borderRadius: "50%",
              background: TOKENS.jade, color: TOKENS.brass, border: `1.5px solid ${TOKENS.brass}`,
              display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", zIndex: 40,
              boxShadow: "0 4px 14px rgba(28,43,36,0.35)",
            }}
            aria-label="Chat"
          >
            {chatOpen ? <X size={22} /> : <MessageCircle size={22} />}
          </button>

          {chatOpen && (
            <div
              style={{
                position: "fixed", bottom: 82, right: 20, width: "min(340px, calc(100vw - 40px))", maxHeight: "70vh",
                background: TOKENS.paper, border: `1px solid ${TOKENS.brassDeep}44`, borderRadius: 14,
                boxShadow: "0 10px 30px rgba(28,43,36,0.25)", zIndex: 40, display: "flex", flexDirection: "column", overflow: "hidden",
              }}
            >
              <div style={{ background: TOKENS.jade, color: TOKENS.paper, padding: "14px 16px" }}>
                <div style={{ fontFamily: "Fraunces, Georgia, serif", fontSize: 15, fontWeight: 600 }}>{t.chatTitle}</div>
                <div style={{ fontSize: 12, color: `${TOKENS.paper}bb`, marginTop: 2 }}>{t.chatIntro}</div>
              </div>

              {!myThread ? (
                <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                  <input
                    value={chatName}
                    onChange={(e) => setChatName(e.target.value)}
                    placeholder={t.chatNamePh}
                    style={{ padding: "9px 12px", borderRadius: 8, border: `1px solid ${TOKENS.brassDeep}55`, fontSize: 13.5 }}
                  />
                  <textarea
                    value={chatDraft}
                    onChange={(e) => setChatDraft(e.target.value)}
                    placeholder={t.chatMsgPh}
                    rows={3}
                    style={{ padding: "9px 12px", borderRadius: 8, border: `1px solid ${TOKENS.brassDeep}55`, fontSize: 13.5, resize: "vertical", fontFamily: "inherit" }}
                  />
                  <button
                    onClick={sendChatMessage}
                    disabled={!chatDraft.trim()}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: TOKENS.brass,
                      color: TOKENS.jade, border: "none", borderRadius: 8, padding: "10px", fontSize: 13.5, fontWeight: 700,
                      cursor: "pointer", opacity: chatDraft.trim() ? 1 : 0.5,
                    }}
                  >
                    <Send size={14} /> {t.chatStart}
                  </button>
                </div>
              ) : (
                <ChatThreadPanel
                  thread={myThread}
                  onSend={sendCustomerReply}
                  meLabel={t.you}
                  themLabel={t.admin}
                  replyPh={t.chatMsgPh}
                  compact
                />
              )}
            </div>
          )}
        </>
      )}
      {/* ---------- TEA DETAIL MODAL ---------- */}
      {detailProduct && (
        <TeaDetailModal
          product={detailProduct.product}
          unit={detailProduct.cartType === "retail" ? t.pcs : t.kg}
          lang={lang}
          t={t}
          TOKENS={TOKENS}
          onConfirm={(qty) => {
            if (detailProduct.cartType === "retail") setRetailQty(detailProduct.product.id, qty);
            else setQty(detailProduct.product.id, qty);
          }}
          onClose={() => setDetailProduct(null)}
        />
      )}

      {/* ---------- FIRST-TIME ONBOARDING FUNNEL ---------- */}
      {showOnboarding && !isAdmin && (
        <div
          style={{
            position: "fixed", inset: 0, background: "rgba(28,43,36,0.72)", zIndex: 50,
            display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
          }}
        >
          <div
            style={{
              background: TOKENS.paper, borderRadius: 16, width: "min(420px, 100%)", maxHeight: "88vh",
              overflowY: "auto", position: "relative", boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
            }}
          >
            <button
              onClick={() => setShowOnboarding(false)}
              style={{ position: "absolute", top: 14, right: 14, background: "none", border: "none", color: TOKENS.jadeSoft, cursor: "pointer", fontSize: 12.5, zIndex: 1 }}
            >
              {t.onboardSkip}
            </button>

            <div style={{ background: TOKENS.jade, padding: "28px 24px 22px" }}>
              <div style={{
                width: 42, height: 42, borderRadius: "50%", border: `1.5px solid ${TOKENS.brass}`,
                display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14,
                fontFamily: "'Noto Serif SC', serif", fontSize: 17, color: TOKENS.brass,
              }}>
                皇龍
              </div>
              <div style={{ fontSize: 10.5, letterSpacing: 1.5, textTransform: "uppercase", color: TOKENS.brass, fontWeight: 600, marginBottom: 4 }}>
                {t.onboardStepOf(onboardStep + 1, 3)}
              </div>
              <div style={{ display: "flex", gap: 5 }}>
                {[0, 1, 2].map((i) => (
                  <div key={i} style={{ height: 3, flex: 1, borderRadius: 2, background: i <= onboardStep ? TOKENS.brass : `${TOKENS.paper}33` }} />
                ))}
              </div>
            </div>

            <div style={{ padding: "26px 24px 24px" }}>
              {onboardStep === 0 && (
                <div>
                  <h2 style={{ fontFamily: "Fraunces, Georgia, serif", fontWeight: 500, fontSize: 22, margin: "0 0 10px" }}>{t.onboardWelcomeTitle}</h2>
                  <p style={{ fontSize: 14, lineHeight: 1.65, color: TOKENS.jadeSoft, margin: 0 }}>{t.onboardWelcomeBody}</p>
                </div>
              )}

              {onboardStep === 1 && (
                <div>
                  <h2 style={{ fontFamily: "Fraunces, Georgia, serif", fontWeight: 500, fontSize: 20, margin: "0 0 16px" }}>{t.onboardOfferTitle}</h2>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: TOKENS.jade, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <Mountain size={16} color={TOKENS.brass} />
                      </div>
                      <div>
                        <div style={{ fontSize: 14.5, fontWeight: 600 }}>{t.onboardOriginTitle}</div>
                        <div style={{ fontSize: 13, color: TOKENS.jadeSoft, lineHeight: 1.5 }}>{t.onboardOriginBody}</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: TOKENS.jade, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <Leaf size={16} color={TOKENS.brass} />
                      </div>
                      <div>
                        <div style={{ fontSize: 14.5, fontWeight: 600 }}>{t.onboardLibraryTitle}</div>
                        <div style={{ fontSize: 13, color: TOKENS.jadeSoft, lineHeight: 1.5 }}>{t.onboardLibraryBody}</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {onboardStep === 2 && (
                <div>
                  <h2 style={{ fontFamily: "Fraunces, Georgia, serif", fontWeight: 500, fontSize: 20, margin: "0 0 16px" }}>{t.onboardInfoTitle}</h2>

                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <input
                      value={onboardName}
                      onChange={(e) => setOnboardName(e.target.value)}
                      placeholder={t.onboardNamePh}
                      style={{ padding: "10px 13px", borderRadius: 8, border: `1px solid ${TOKENS.brassDeep}55`, fontSize: 14 }}
                    />
                    <input
                      value={onboardContact}
                      onChange={(e) => setOnboardContact(e.target.value)}
                      placeholder={t.onboardContactPh}
                      style={{ padding: "10px 13px", borderRadius: 8, border: `1px solid ${TOKENS.brassDeep}55`, fontSize: 14 }}
                    />
                  </div>
                  <label style={{ display: "flex", alignItems: "flex-start", gap: 8, marginTop: 14, fontSize: 12, color: TOKENS.jadeSoft, cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={onboardConsent}
                      onChange={(e) => setOnboardConsent(e.target.checked)}
                      style={{ marginTop: 2, flexShrink: 0 }}
                    />
                    {t.consentLabel}
                  </label>
                </div>
              )}

              <div style={{ display: "flex", gap: 10, marginTop: 26 }}>
                {onboardStep > 0 && (
                  <button
                    onClick={() => setOnboardStep((s) => s - 1)}
                    style={{
                      display: "flex", alignItems: "center", gap: 5, background: "transparent", color: TOKENS.jadeSoft,
                      border: `1px solid ${TOKENS.brassDeep}44`, borderRadius: 8, padding: "11px 16px", fontSize: 13.5, cursor: "pointer",
                    }}
                  >
                    <ChevronLeft size={14} /> {t.back}
                  </button>
                )}
                {onboardStep < 2 ? (
                  <button
                    onClick={() => setOnboardStep((s) => s + 1)}
                    style={{
                      flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: TOKENS.jade,
                      color: TOKENS.paper, border: "none", borderRadius: 8, padding: "11px", fontSize: 14, fontWeight: 600, cursor: "pointer",
                    }}
                  >
                    {t.onboardCTA} <ChevronRight size={15} />
                  </button>
                ) : (
                  <button
                    onClick={submitLead}
                    disabled={!onboardName.trim() || !onboardContact.trim() || !onboardConsent}
                    title={!onboardConsent ? t.consentRequired : (!onboardName.trim() || !onboardContact.trim()) ? t.leadRequired : ""}
                    style={{
                      flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: TOKENS.brass,
                      color: TOKENS.jade, border: "none", borderRadius: 8, padding: "11px", fontSize: 14, fontWeight: 700, cursor: "pointer",
                      opacity: (!onboardName.trim() || !onboardContact.trim() || !onboardConsent) ? 0.5 : 1,
                    }}
                  >
                    {t.onboardCTA}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

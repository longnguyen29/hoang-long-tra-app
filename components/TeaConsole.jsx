"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  Search, ChevronRight, ChevronLeft, Menu, X, Edit3, Save, Plus, Trash2,
  Leaf, Mountain, Languages, Copy, Check, Lock, Clock, Upload, Sparkles, ShoppingCart, Minus,
  MessageCircle, Send, Download, Printer, LogOut, Tag, Truck, Loader2, Calendar, Phone, Images,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { uploadImage } from "@/lib/supabase/storage";
import {
  TOKENS, NAV, CATEGORIES, LIBRARY_CATEGORIES, PRICE_TIERS, STATUS_STEPS,
  YIELD_GUIDE, CUP_ML_MIN, CUP_ML_MAX,
  getStockTotal, getVariantMinPrice, getVariantStockTotal,
} from "@/lib/constants";
import { STR } from "@/lib/strings";
import {
  fromOrderRow, toOrderRow, fromThreadRow,
  fromCatalogRow, toCatalogRow, fromVariantRow, fromPromoRow, toPromoRow,
  fromPaymentRow, toPaymentRow, fromGalleryRow, fromWholesaleAccountRow, fromTeaSessionRow,
  fromProductReviewRow,
} from "@/lib/mappers";
import AuthPanel from "./AuthPanel";
import PaymentBlock from "./PaymentBlock";
import ReorderBox from "./ReorderBox";
import TrackOrderBox from "./TrackOrderBox";
import TeaDetailModal from "./TeaDetailModal";
import ChatThreadPanel from "./ChatThreadPanel";
import BrandSeal from "./BrandSeal";
import VariantEditorRow from "./VariantEditorRow";
import TrackingCodeEditor from "./TrackingCodeEditor";
import TeaSessionBooking from "./TeaSessionBooking";

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9à-ỹ]+/gi, "-").slice(0, 40) + "-" + Date.now().toString(36);
}

// Turns any http(s) URL inside plain text into a clickable link, preserving surrounding text/line breaks.
function linkifyText(text, color) {
  if (!text) return text;
  const regex = /(https?:\/\/[^\s]+)/g;
  const result = [];
  let lastIndex = 0;
  let match;
  let key = 0;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) result.push(text.slice(lastIndex, match.index));
    result.push(
      <a key={key++} href={match[0]} target="_blank" rel="noopener noreferrer" style={{ color, textDecoration: "underline", wordBreak: "break-all" }}>
        {match[0]}
      </a>
    );
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) result.push(text.slice(lastIndex));
  return result;
}

// Expands catalog products (incl. variants) into flat orderable line items keyed by cartKey.
function flattenOrderable(products) {
  return products.flatMap((p) => {
    if (p.variants && p.variants.length > 0) {
      return p.variants.map((v) => ({
        cartKey: `${p.id}__${v.weight}`,
        productId: p.id,
        weight: v.weight,
        line: p.line,
        available: p.available,
        name: p.name,
        notes: p.notes,
        brew: p.brew,
        photoUrl: p.photoUrl,
        photoPosition: p.photoPosition,
        price: v.price,
        stockHaGiang: v.stockHaGiang,
        stockSocSon: v.stockSocSon,
      }));
    }
    return [{
      cartKey: p.id,
      productId: p.id,
      weight: null,
      line: p.line,
      available: p.available,
      name: p.name,
      notes: p.notes,
      brew: p.brew,
      photoUrl: p.photoUrl,
      photoPosition: p.photoPosition,
      price: p.price,
      stockHaGiang: p.stockHaGiang,
      stockSocSon: p.stockSocSon,
    }];
  });
}

export default function TeaConsole({ isAdmin, staffEmail, onLogout }) {
  const supabase = useMemo(() => createClient(), []);

  // role is derived from real auth, not a manual toggle: not signed in (or signed in without
  // an approved wholesale account) = retail; signed in + wholesale_verified = wholesale; admin
  // is separate and already gated by real Supabase Auth + staff_roles.
  const [session, setSession] = useState(null);
  const [wholesaleAccount, setWholesaleAccount] = useState(null);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => setSession(newSession));
    return () => sub.subscription.unsubscribe();
  }, [supabase]);
  useEffect(() => {
    if (isAdmin || !session?.user) { setWholesaleAccount(null); return; }
    supabase.from("wholesale_accounts").select("*").eq("user_id", session.user.id).maybeSingle().then(({ data }) => {
      setWholesaleAccount(data ? fromWholesaleAccountRow(data) : null);
    });
  }, [isAdmin, session, supabase]);
  const role = isAdmin ? "admin" : (wholesaleAccount?.wholesaleVerified ? "wholesale" : "retail");
  const [lang, setLang] = useState("en");
  const [section, setSection] = useState("home");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [articles, setArticles] = useState([]);
  const [wikiCategory, setWikiCategory] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ title: "", body: "", category: "legacy" });

  const [libraryArticles, setLibraryArticles] = useState([]);
  const [libraryTab, setLibraryTab] = useState("gallery");
  const [libraryCategory, setLibraryCategory] = useState(null);
  const [libraryActiveId, setLibraryActiveId] = useState(null);
  const [libraryQuery, setLibraryQuery] = useState("");
  const [galleryImages, setGalleryImages] = useState([]);
  const [galleryDraft, setGalleryDraft] = useState({ url: "", captionEn: "", captionVi: "" });
  const [uploadingGalleryPhoto, setUploadingGalleryPhoto] = useState(false);
  const [galleryPhotoError, setGalleryPhotoError] = useState(false);
  // Resolved after mount so the server-rendered HTML can't disagree with the client's clock.
  const [today, setToday] = useState(null);
  useEffect(() => { setToday(new Date()); }, []);

  const [galleryIndex, setGalleryIndex] = useState(0);
  const [lightboxImage, setLightboxImage] = useState(null);
  const [homePhoto, setHomePhoto] = useState("");
  // Producer + origin facts shown at the top of Our Story. Empty until staff fill it in.
  const [houseStory, setHouseStory] = useState({ producerName: "", producerPhoto: "", producerRole: {}, producerQuote: {}, originStats: [] });
  const [houseDraft, setHouseDraft] = useState(null);
  const [houseSaved, setHouseSaved] = useState(false);
  const [uploadingProducerPhoto, setUploadingProducerPhoto] = useState(false);
  const [producerPhotoError, setProducerPhotoError] = useState(false);
  const [uploadingHomePhoto, setUploadingHomePhoto] = useState(false);
  const [homePhotoError, setHomePhotoError] = useState(false);

  const [cart, setCart] = useState({});
  const [detailProduct, setDetailProduct] = useState(null);
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
  // cartDrawerOpen is the public "should be open" intent (set from the header cart icon,
  // checkout button, etc.). mounted/visible split it into two frames so the slide-in
  // transition actually has a starting position to animate from, and the panel stays
  // mounted just long enough to play its exit transition instead of vanishing instantly.
  const [cartDrawerMounted, setCartDrawerMounted] = useState(false);
  const [cartDrawerVisible, setCartDrawerVisible] = useState(false);
  useEffect(() => {
    if (cartDrawerOpen) {
      setCartDrawerMounted(true);
    } else {
      setCartDrawerVisible(false);
      const id = setTimeout(() => setCartDrawerMounted(false), 320);
      return () => clearTimeout(id);
    }
  }, [cartDrawerOpen]);
  useEffect(() => {
    if (!cartDrawerMounted) return;
    const raf = requestAnimationFrame(() => setCartDrawerVisible(true));
    return () => cancelAnimationFrame(raf);
  }, [cartDrawerMounted]);
  const [retailCart, setRetailCart] = useState({});
  const [copied, setCopied] = useState(false);
  const [orderName, setOrderName] = useState("");
  const [orderContact, setOrderContact] = useState("");
  const [orderAddress, setOrderAddress] = useState("");
  const [orderTaxNumber, setOrderTaxNumber] = useState("");
  const [orderNote, setOrderNote] = useState("");
  const [orderSubmitted, setOrderSubmitted] = useState(null);
  const [orderError, setOrderError] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("qr");
  const [variantSelection, setVariantSelection] = useState({});
  const retailSummaryRef = useRef(null);
  const sampleSectionRef = useRef(null);
  const everydaySectionRef = useRef(null);
  const reserveSectionRef = useRef(null);

  const [orders, setOrders] = useState([]);
  const [teaSessions, setTeaSessions] = useState([]);
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
    try { id = window.localStorage.getItem(KEY); } catch { id = null; }
    if (!id) {
      id = "guest-" + Math.random().toString(36).slice(2, 9);
      try { window.localStorage.setItem(KEY, id); } catch { /* ignore */ }
    }
    return id;
  });
  const [activeThreadId, setActiveThreadId] = useState(null);
  const [frontDeskTab, setFrontDeskTab] = useState("orders");

  const [showOnboarding, setShowOnboarding] = useState(false);
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
    price: "", stockHaGiang: "", stockSocSon: "", batch: "", soldCount: "",
    flavorsEn: "", flavorsVi: "", photoPosX: 50, photoPosY: 50,
  });
  const [uploadingProductPhoto, setUploadingProductPhoto] = useState(false);
  const [productPhotoError, setProductPhotoError] = useState(false);

  const [testimonials, setTestimonials] = useState([]);
  const [testimonialDraft, setTestimonialDraft] = useState({ id: null, name: "", quote: "" });
  const [customerReviewDraft, setCustomerReviewDraft] = useState({ name: "", quote: "" });
  const [customerReviewSent, setCustomerReviewSent] = useState(false);

  // Per-product reviews. Customers see approved ones via the list_approved_product_reviews
  // RPC (no reviewer contact); staff read the table directly and get everything.
  const [productReviews, setProductReviews] = useState([]);
  const [productReviewFilter, setProductReviewFilter] = useState("all");

  const [promos, setPromos] = useState([]);
  const [promoDraft, setPromoDraft] = useState({ id: null, code: "", percent: "", ownerName: "" });
  const [promoInput, setPromoInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState(null);
  const [promoError, setPromoError] = useState(false);

  const [wholesaleAccounts, setWholesaleAccounts] = useState([]);
  const [partnerDraft, setPartnerDraft] = useState({ id: null, code: "", businessName: "", contact: "" });
  const [applyBusinessName, setApplyBusinessName] = useState("");
  const [applyContact, setApplyContact] = useState("");
  const [applyError, setApplyError] = useState(false);
  const [eligibleForTestPack, setEligibleForTestPack] = useState(false);
  const [addTestPack, setAddTestPack] = useState(false);

  const [orderConsent, setOrderConsent] = useState(false);

  const t = STR[lang];
  const other = lang === "en" ? "vi" : "en";
  const lineLabel = (l) => (l === "reserve" ? t.reserveOption : l === "sample" ? t.sampleOption : t.everydayOption);
  const formatVND = (n) => n.toLocaleString("vi-VN") + "đ";

  // Decorative 皇龍 mark used as a quiet anchor at the end of a few sections. Deliberately
  // sparse — it stops meaning anything if it's on every block.
  const sealMark = (size = 26) => (
    <div aria-hidden="true" style={{ display: "flex", justifyContent: "center", padding: "26px 0 6px" }}>
      <div style={{
        width: size + 18, height: size + 18, borderRadius: "50%",
        border: `1px solid ${TOKENS.brass}44`, display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "'Noto Serif SC', serif", fontSize: size * 0.5, color: `${TOKENS.brass}99`,
        background: TOKENS.sealGlow,
      }}>
        皇龍
      </div>
    </div>
  );

  // Compact flavour chips for cards — capped at three so a long list can't wrap the layout.
  const flavorChips = (p, onDark) => {
    const list = (p.flavors?.[lang]?.length ? p.flavors[lang] : p.flavors?.en) || [];
    if (list.length === 0) return null;
    return (
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 5 }}>
        {list.slice(0, 3).map((f) => (
          <span
            key={f}
            style={{
              fontSize: 10, fontWeight: 600, borderRadius: 20, padding: "2px 8px",
              color: onDark ? TOKENS.brassOnDark : TOKENS.brassOnPaper,
              background: onDark ? `${TOKENS.paper}1A` : `${TOKENS.brass}1F`,
            }}
          >
            {f}
          </span>
        ))}
      </div>
    );
  };

  // Rating + sold-count line for product cards. Hidden entirely when a product has neither.
  // `onDark` switches to the light brass variant for the jade-backed sample cards.
  const productBadges = (p, onDark) => {
    const s = reviewStats[p.id];
    const hasRating = s && s.count > 0;
    if (!hasRating && !(p.soldCount > 0)) return null;
    return (
      <div style={{
        display: "flex", alignItems: "center", gap: 8, marginTop: 3,
        fontSize: 11, fontWeight: 600, color: onDark ? TOKENS.brassOnDark : TOKENS.brassOnPaper,
      }}>
        {hasRating && <span>★ {s.avg} ({s.count})</span>}
        {p.soldCount > 0 && <span>{t.soldBadge(p.soldCount)}</span>}
      </div>
    );
  };

  // House Partners is a multi-step flow (browse → cart → pricing → track) that used to run
  // together as one undifferentiated scroll of bordered cards. This numbered header makes
  // each step visually distinct without introducing a new palette.
  const stepHeader = (n, Icon, label) => (
    <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 12 }}>
      <div style={{
        width: 22, height: 22, borderRadius: "50%", background: TOKENS.jade, color: TOKENS.brass,
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0,
      }}>
        {n}
      </div>
      <Icon size={14} color={TOKENS.brassOnPaper} />
      <span style={{ fontSize: 11.5, fontWeight: 700, color: TOKENS.brassOnPaper, textTransform: "uppercase", letterSpacing: 0.6 }}>
        {label}
      </span>
    </div>
  );

  const visibleCategories = useMemo(() => CATEGORIES.filter((c) => c.audience.includes(role)), [role]);
  const visibleCategoryIds = useMemo(() => new Set(visibleCategories.map((c) => c.id)), [visibleCategories]);
  const visibleArticles = useMemo(() => articles.filter((a) => visibleCategoryIds.has(a.category)), [articles, visibleCategoryIds]);

  const articlesInCategory = (catId) => visibleArticles.filter((a) => a.category === catId);
  const active = articles.find((a) => a.id === activeId);
  const activeCategoryMeta = wikiCategory ? CATEGORIES.find((c) => c.id === wikiCategory) : null;

  const libraryArticlesInCategory = (catId) => libraryArticles.filter((a) => a.category === catId);
  const librarySearchResults = useMemo(() => {
    if (!libraryQuery.trim()) return null;
    const q = libraryQuery.toLowerCase();
    return libraryArticles.filter((a) => {
      const title = (a.title[lang] || a.title.en || "").toLowerCase();
      const body = (a.body[lang] || a.body.en || "").toLowerCase();
      return title.includes(q) || body.includes(q);
    });
  }, [libraryArticles, libraryQuery, lang]);
  const libraryActive = libraryArticles.find((a) => a.id === libraryActiveId);
  const libraryActiveCategoryMeta = libraryCategory ? LIBRARY_CATEGORIES.find((c) => c.id === libraryCategory) : null;

  const resetWiki = () => {
    setWikiCategory(null);
    setActiveId(null);
    setEditing(false);
    setLibraryCategory(null);
    setLibraryActiveId(null);
    setLibraryQuery("");
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

  // productId -> { avg, count } over approved reviews, for the card/modal rating badges.
  const reviewStats = useMemo(() => {
    const acc = {};
    for (const r of productReviews) {
      if (r.approved === false) continue;
      const s = acc[r.productId] || (acc[r.productId] = { total: 0, count: 0 });
      s.total += r.rating;
      s.count += 1;
    }
    const out = {};
    for (const [pid, s] of Object.entries(acc)) {
      out[pid] = { avg: Math.round((s.total / s.count) * 10) / 10, count: s.count };
    }
    return out;
  }, [productReviews]);

  // "Tea of the day" — same tea for everyone on a given day. Sample packs are excluded:
  // the point is to spotlight an individual tea, not a bundle.
  const teaOfDay = useMemo(() => {
    if (!today) return null;
    const pool = catalog.filter((p) => p.line !== "sample");
    if (pool.length === 0) return null;
    const dayNumber = Math.floor(today.getTime() / 86400000);
    return pool[dayNumber % pool.length];
  }, [today, catalog]);

  const wholesaleProducts = catalog.filter((p) => p.line === "everyday");
  const retailProducts = catalog;

  const cartLines = wholesaleProducts.map((p) => ({ ...p, qty: Number(cart[p.id]) || 0 })).filter((p) => p.qty > 0);
  const totalKg = cartLines.reduce((sum, p) => sum + p.qty, 0);
  const currentTier = [...PRICE_TIERS].reverse().find((tier) => totalKg >= tier.min) || PRICE_TIERS[0];

  const retailOrderableItems = flattenOrderable(retailProducts);
  const retailCartLines = retailOrderableItems.map((item) => ({ ...item, qty: Number(retailCart[item.cartKey]) || 0 })).filter((item) => item.qty > 0);
  const retailTotalItems = retailCartLines.reduce((sum, p) => sum + p.qty, 0);

  const setQty = (id, val) => {
    const n = Math.max(0, Number(val) || 0);
    setCart((c) => ({ ...c, [id]: n }));
  };
  const setRetailQty = (cartKey, val, stockTotal) => {
    let n = Math.max(0, Number(val) || 0);
    if (typeof stockTotal === "number") n = Math.min(n, stockTotal);
    setRetailCart((c) => ({ ...c, [cartKey]: n }));
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

  const loadLibraryArticles = useCallback(async () => {
    const { data } = await supabase.from("library_articles").select("*");
    if (data) setLibraryArticles(data);
  }, [supabase]);

  const loadGalleryImages = useCallback(async () => {
    const { data } = await supabase.from("gallery_images").select("*").order("created_at", { ascending: true });
    if (data) setGalleryImages(data.map(fromGalleryRow));
  }, [supabase]);

  const loadHomeSettings = useCallback(async () => {
    const { data } = await supabase.from("settings_home").select("*").eq("id", 1).maybeSingle();
    if (!data) return;
    setHomePhoto(data.featured_photo || "");
    setHouseStory({
      producerName: data.producer_name || "",
      producerPhoto: data.producer_photo || "",
      producerRole: data.producer_role || {},
      producerQuote: data.producer_quote || {},
      originStats: Array.isArray(data.origin_stats) ? data.origin_stats : [],
    });
  }, [supabase]);

  const loadCatalog = useCallback(async () => {
    const [{ data: products }, { data: variants }] = await Promise.all([
      supabase.from("catalog_products").select("*"),
      supabase.from("catalog_variants").select("*"),
    ]);
    if (products) {
      const byProduct = {};
      (variants || []).forEach((v) => {
        (byProduct[v.product_id] ||= []).push(fromVariantRow(v));
      });
      setCatalog(products.map((r) => {
        const p = fromCatalogRow(r);
        const vs = byProduct[p.id];
        if (vs && vs.length > 0) p.variants = vs;
        return p;
      }));
    }
  }, [supabase]);

  const loadTestimonials = useCallback(async () => {
    const { data } = await supabase.from("testimonials").select("*");
    if (data) setTestimonials(data);
  }, [supabase]);

  // Staff need pending reviews too, so they read the table directly (RLS is staff-only);
  // customers go through the RPC, which returns approved rows without reviewer contact.
  const loadProductReviews = useCallback(async () => {
    if (isAdmin) {
      const { data } = await supabase.from("product_reviews").select("*").order("created_at", { ascending: false });
      if (data) setProductReviews(data.map(fromProductReviewRow));
      return;
    }
    const { data } = await supabase.rpc("list_approved_product_reviews");
    if (data) setProductReviews(data.map(fromProductReviewRow));
  }, [supabase, isAdmin]);

  const loadPayment = useCallback(async () => {
    const { data } = await supabase.rpc("get_payment_info");
    if (data && data.length > 0) setPayment(fromPaymentRow(data[0]));
  }, [supabase]);

  const loadOrders = useCallback(async () => {
    const { data } = await supabase.from("orders").select("*").order("ts", { ascending: true });
    if (data) setOrders(data.map(fromOrderRow));
  }, [supabase]);

  const loadTeaSessions = useCallback(async () => {
    const { data } = await supabase.from("tea_sessions").select("*").order("date", { ascending: true });
    if (data) setTeaSessions(data.map(fromTeaSessionRow));
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

  const loadWholesaleAccounts = useCallback(async () => {
    const { data } = await supabase.from("wholesale_accounts").select("*").order("code");
    if (data) setWholesaleAccounts(data.map(fromWholesaleAccountRow));
  }, [supabase]);

  const loadMyThread = useCallback(async () => {
    const { data } = await supabase.rpc("get_customer_thread", { p_customer_id: customerId });
    if (data && data.length > 0) setMyThread(fromThreadRow(data[0]));
  }, [supabase, customerId]);

  useEffect(() => {
    loadArticles();
    loadLibraryArticles();
    loadGalleryImages();
    loadHomeSettings();
    loadCatalog();
    loadTestimonials();
    loadProductReviews();
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
      loadTeaSessions();
      loadThreads();
      loadLeads();
      loadPromos();
      loadWholesaleAccounts();
    } else {
      loadMyThread();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin || section !== "frontdesk") return;
    const id = setInterval(() => { loadOrders(); loadTeaSessions(); loadThreads(); loadLeads(); }, 4000);
    return () => clearInterval(id);
  }, [isAdmin, section, loadOrders, loadTeaSessions, loadThreads, loadLeads]);

  useEffect(() => {
    if (isAdmin || !chatOpen) return;
    loadMyThread();
    const id = setInterval(loadMyThread, 4000);
    return () => clearInterval(id);
  }, [isAdmin, chatOpen, loadMyThread]);

  // Onboarding shows once per browser, not on every reload/role switch — checked in an
  // effect (not the initial useState) so server and first client render both start closed
  // and stay in sync, avoiding a hydration mismatch.
  useEffect(() => {
    if (isAdmin) return;
    try {
      if (!window.localStorage.getItem("thl:onboarded")) setShowOnboarding(true);
    } catch { /* localStorage unavailable — just skip onboarding */ }
  }, [isAdmin]);

  const markOnboarded = () => {
    try { window.localStorage.setItem("thl:onboarded", "1"); } catch { /* ignore */ }
    setShowOnboarding(false);
  };

  // Eligibility for the free "new batch test pack" — checked server-side via RPC since
  // customers have no direct read access to the orders table.
  useEffect(() => {
    if (isAdmin || !wholesaleAccount?.wholesaleVerified || !wholesaleAccount?.contact) { setEligibleForTestPack(false); return; }
    supabase.rpc("has_prior_wholesale_order", { p_contact: wholesaleAccount.contact }).then(({ data }) => {
      setEligibleForTestPack(!!data);
    });
  }, [isAdmin, wholesaleAccount, supabase]);

  // Prefill the order form once from an approved wholesale account (mirrors the old
  // verifyPartnerId prefill) — only when the fields are still empty, so we never clobber
  // something the customer already typed.
  useEffect(() => {
    if (!wholesaleAccount?.wholesaleVerified) return;
    setOrderName((v) => (v.trim() ? v : wholesaleAccount.businessName));
    setOrderContact((v) => (v.trim() || !wholesaleAccount.contact ? v : wholesaleAccount.contact));
  }, [wholesaleAccount]);

  const updateOrderStatus = async (id, status) => {
    await supabase.from("orders").update({ status }).eq("id", id);
    setOrders(orders.map((o) => (o.id === id ? { ...o, status } : o)));
  };
  const updateTeaSessionStatus = async (id, status) => {
    await supabase.from("tea_sessions").update({ status }).eq("id", id);
    setTeaSessions(teaSessions.map((s) => (s.id === id ? { ...s, status } : s)));
  };
  const updateTrackingCode = async (id, trackingCode) => {
    await supabase.from("orders").update({ tracking_code: trackingCode }).eq("id", id);
    setOrders(orders.map((o) => (o.id === id ? { ...o, trackingCode } : o)));
  };
  const markOrderRead = async (id) => {
    await supabase.from("orders").update({ unread: false }).eq("id", id);
    setOrders(orders.map((o) => (o.id === id ? { ...o, unread: false } : o)));
  };
  const markLeadRead = async (id) => {
    await supabase.from("leads").update({ unread: false }).eq("id", id);
    setLeads(leads.map((l) => (l.id === id ? { ...l, unread: false } : l)));
  };

  const savePayment = async () => {
    await supabase.from("settings_payment").upsert(toPaymentRow(payment));
    setPaymentSaved(true);
    setTimeout(() => setPaymentSaved(false), 1800);
  };

  const saveProductDraft = async () => {
    if (!productDraft.nameEn.trim() && !productDraft.nameVi.trim()) return;
    const priceVal = Number(productDraft.price);
    const hgVal = productDraft.stockHaGiang.trim();
    const ssVal = productDraft.stockSocSon.trim();
    const fields = {
      line: productDraft.line,
      name: { en: productDraft.nameEn.trim(), vi: productDraft.nameVi.trim() },
      notes: { en: productDraft.notesEn.trim(), vi: productDraft.notesVi.trim() },
      brew: { en: productDraft.brewEn.trim(), vi: productDraft.brewVi.trim() },
      packSize: productDraft.packSize.trim(),
      photoUrl: productDraft.photoUrl.trim(),
      photoPosition: `${productDraft.photoPosX}% ${productDraft.photoPosY}%`,
      price: priceVal > 0 ? priceVal : undefined,
      stockHaGiang: hgVal !== "" ? Math.max(0, Number(hgVal)) : undefined,
      stockSocSon: ssVal !== "" ? Math.max(0, Number(ssVal)) : undefined,
      batch: productDraft.batch.trim(),
      soldCount: Math.max(0, Number(productDraft.soldCount) || 0),
      flavors: {
        en: productDraft.flavorsEn.split(",").map((s) => s.trim()).filter(Boolean),
        vi: productDraft.flavorsVi.split(",").map((s) => s.trim()).filter(Boolean),
      },
    };
    if (productDraft.id) {
      await supabase.from("catalog_products").update({
        line: fields.line, name: fields.name, notes: fields.notes, brew: fields.brew,
        pack_size: fields.packSize, photo_url: fields.photoUrl, photo_position: fields.photoPosition,
        price: fields.price ?? null, stock_ha_giang: fields.stockHaGiang ?? null, stock_soc_son: fields.stockSocSon ?? null,
        batch: fields.batch, sold_count: fields.soldCount, flavors: fields.flavors,
      }).eq("id", productDraft.id);
      setCatalog(catalog.map((p) => (p.id === productDraft.id ? { ...p, ...fields } : p)));
    } else {
      const id = slugify(productDraft.nameEn || productDraft.nameVi);
      const newRow = { id, available: true, limited: false, ...fields };
      await supabase.from("catalog_products").insert(toCatalogRow(newRow));
      setCatalog([...catalog, newRow]);
    }
    setProductDraft({ id: null, nameEn: "", nameVi: "", line: "everyday", notesEn: "", notesVi: "", brewEn: "", brewVi: "", packSize: "", photoUrl: "", price: "", stockHaGiang: "", stockSocSon: "", batch: "", soldCount: "", flavorsEn: "", flavorsVi: "", photoPosX: 50, photoPosY: 50 });
  };
  const toggleAvailability = async (id) => {
    const p = catalog.find((x) => x.id === id);
    const next = !p.available;
    await supabase.from("catalog_products").update({ available: next }).eq("id", id);
    setCatalog(catalog.map((x) => (x.id === id ? { ...x, available: next } : x)));
  };
  const toggleLimited = async (id) => {
    const p = catalog.find((x) => x.id === id);
    const next = !p.limited;
    await supabase.from("catalog_products").update({ limited: next }).eq("id", id);
    setCatalog(catalog.map((x) => (x.id === id ? { ...x, limited: next } : x)));
  };
  const updateVariant = async (productId, weight, fields) => {
    await supabase.from("catalog_variants").update({
      price: fields.price ?? null, stock_ha_giang: fields.stockHaGiang ?? null, stock_soc_son: fields.stockSocSon ?? null,
    }).eq("product_id", productId).eq("weight", weight);
    setCatalog(catalog.map((p) =>
      p.id === productId && p.variants
        ? { ...p, variants: p.variants.map((v) => (v.weight === weight ? { ...v, ...fields } : v)) }
        : p
    ));
  };
  const editProductDraft = (p) =>
    setProductDraft({
      id: p.id,
      nameEn: p.name.en || "", nameVi: p.name.vi || "", line: p.line,
      notesEn: p.notes?.en || "", notesVi: p.notes?.vi || "",
      brewEn: p.brew?.en || "", brewVi: p.brew?.vi || "",
      packSize: p.packSize || "", photoUrl: p.photoUrl || "", price: p.price ? String(p.price) : "",
      stockHaGiang: p.stockHaGiang !== undefined && p.stockHaGiang !== null ? String(p.stockHaGiang) : "",
      stockSocSon: p.stockSocSon !== undefined && p.stockSocSon !== null ? String(p.stockSocSon) : "",
      batch: p.batch || "",
      soldCount: p.soldCount ? String(p.soldCount) : "",
      flavorsEn: (p.flavors?.en || []).join(", "),
      flavorsVi: (p.flavors?.vi || []).join(", "),
      photoPosX: p.photoPosition ? Number(p.photoPosition.split(" ")[0].replace("%", "")) : 50,
      photoPosY: p.photoPosition ? Number(p.photoPosition.split(" ")[1].replace("%", "")) : 50,
    });
  const deleteProductFn = async (id) => {
    await supabase.from("catalog_products").delete().eq("id", id);
    setCatalog(catalog.filter((p) => p.id !== id));
  };

  const uploadProductPhoto = async (file) => {
    setProductPhotoError(false);
    setUploadingProductPhoto(true);
    try {
      const url = await uploadImage(supabase, file, "products");
      setProductDraft((d) => ({ ...d, photoUrl: url }));
    } catch (e) {
      console.error("Upload failed:", e);
      setProductPhotoError(e?.message || true);
    } finally {
      setUploadingProductPhoto(false);
    }
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
      const row = { id: "review-" + Date.now().toString(36), name: testimonialDraft.name.trim(), quote: testimonialDraft.quote.trim(), approved: true };
      await supabase.from("testimonials").insert(row);
      setTestimonials([...testimonials, row]);
    }
    setTestimonialDraft({ id: null, name: "", quote: "" });
  };
  const deleteTestimonial = async (id) => {
    await supabase.from("testimonials").delete().eq("id", id);
    setTestimonials(testimonials.filter((r) => r.id !== id));
  };
  const approveTestimonial = async (id) => {
    await supabase.from("testimonials").update({ approved: true }).eq("id", id);
    setTestimonials(testimonials.map((r) => (r.id === id ? { ...r, approved: true } : r)));
  };
  const approveProductReview = async (id) => {
    await supabase.from("product_reviews").update({ approved: true }).eq("id", id);
    setProductReviews(productReviews.map((r) => (r.id === id ? { ...r, approved: true } : r)));
  };
  const deleteProductReview = async (id) => {
    await supabase.from("product_reviews").delete().eq("id", id);
    setProductReviews(productReviews.filter((r) => r.id !== id));
  };
  const submitCustomerReview = async () => {
    if (!customerReviewDraft.name.trim() || !customerReviewDraft.quote.trim()) return;
    const row = { id: "review-" + Date.now().toString(36), name: customerReviewDraft.name.trim(), quote: customerReviewDraft.quote.trim(), approved: false };
    const { error } = await supabase.from("testimonials").insert(row);
    if (error) { console.error(error); return; }
    setCustomerReviewDraft({ name: "", quote: "" });
    setCustomerReviewSent(true);
    setTimeout(() => setCustomerReviewSent(false), 3000);
  };

  const addGalleryImage = async () => {
    if (!galleryDraft.url.trim()) return;
    const row = {
      id: "img-" + Date.now().toString(36),
      url: galleryDraft.url.trim(),
      caption: { en: galleryDraft.captionEn.trim(), vi: galleryDraft.captionVi.trim() },
    };
    await supabase.from("gallery_images").insert(row);
    setGalleryImages([...galleryImages, row]);
    setGalleryDraft({ url: "", captionEn: "", captionVi: "" });
  };
  const deleteGalleryImage = async (id) => {
    await supabase.from("gallery_images").delete().eq("id", id);
    setGalleryImages(galleryImages.filter((g) => g.id !== id));
  };
  const uploadGalleryPhoto = async (file) => {
    setGalleryPhotoError(false);
    setUploadingGalleryPhoto(true);
    try {
      const url = await uploadImage(supabase, file, "gallery");
      setGalleryDraft((d) => ({ ...d, url }));
    } catch (e) {
      console.error("Upload failed:", e);
      setGalleryPhotoError(e?.message || true);
    } finally {
      setUploadingGalleryPhoto(false);
    }
  };

  const saveHomePhoto = async (url) => {
    await supabase.from("settings_home").upsert({ id: 1, featured_photo: url });
    setHomePhoto(url);
  };
  // Stats are edited as one line per stat: "value | English label | Vietnamese label".
  const parseOriginStats = (text) =>
    text.split("\n").map((line) => {
      const [value, en, vi] = line.split("|").map((s) => (s || "").trim());
      if (!value) return null;
      return { value, label: { en: en || "", vi: vi || en || "" } };
    }).filter(Boolean);

  const originStatsToText = (stats) =>
    (stats || []).map((s) => `${s.value} | ${s.label?.en || ""} | ${s.label?.vi || ""}`).join("\n");

  const openHouseDraft = () => setHouseDraft({
    producerName: houseStory.producerName,
    producerPhoto: houseStory.producerPhoto,
    roleEn: houseStory.producerRole?.en || "",
    roleVi: houseStory.producerRole?.vi || "",
    quoteEn: houseStory.producerQuote?.en || "",
    quoteVi: houseStory.producerQuote?.vi || "",
    statsText: originStatsToText(houseStory.originStats),
  });

  const saveHouseDraft = async () => {
    const next = {
      producer_name: houseDraft.producerName.trim(),
      producer_photo: houseDraft.producerPhoto.trim(),
      producer_role: { en: houseDraft.roleEn.trim(), vi: houseDraft.roleVi.trim() },
      producer_quote: { en: houseDraft.quoteEn.trim(), vi: houseDraft.quoteVi.trim() },
      origin_stats: parseOriginStats(houseDraft.statsText),
    };
    const { error } = await supabase.from("settings_home").update(next).eq("id", 1);
    if (error) { console.error(error); return; }
    setHouseStory({
      producerName: next.producer_name,
      producerPhoto: next.producer_photo,
      producerRole: next.producer_role,
      producerQuote: next.producer_quote,
      originStats: next.origin_stats,
    });
    setHouseSaved(true);
    setTimeout(() => setHouseSaved(false), 1800);
  };

  const uploadProducerPhoto = async (file) => {
    setProducerPhotoError(false);
    setUploadingProducerPhoto(true);
    try {
      const url = await uploadImage(supabase, file, "producer");
      setHouseDraft((d) => ({ ...d, producerPhoto: url }));
    } catch (e) {
      console.error("Upload failed:", e);
      setProducerPhotoError(e?.message || true);
    } finally {
      setUploadingProducerPhoto(false);
    }
  };

  const uploadHomePhoto = async (file) => {
    setHomePhotoError(false);
    setUploadingHomePhoto(true);
    try {
      const url = await uploadImage(supabase, file, "home");
      await saveHomePhoto(url);
    } catch (e) {
      console.error("Upload failed:", e);
      setHomePhotoError(e?.message || true);
    } finally {
      setUploadingHomePhoto(false);
    }
  };

  // Manual staff-side add, for partners staff wants to pre-provision without waiting for
  // self-registration — since staff is the one typing it in, it's created already verified.
  const savePartnerDraft = async () => {
    if (!partnerDraft.businessName.trim()) return;
    if (partnerDraft.id) {
      const code = partnerDraft.code.trim().toUpperCase();
      const businessName = partnerDraft.businessName.trim();
      const contact = partnerDraft.contact.trim();
      await supabase.from("wholesale_accounts").update({ code: code || null, business_name: businessName, contact }).eq("id", partnerDraft.id);
      setWholesaleAccounts(wholesaleAccounts.map((a) => (a.id === partnerDraft.id ? { ...a, code, businessName, contact } : a)));
    } else {
      const row = {
        id: "partner-" + Date.now().toString(36), code: partnerDraft.code.trim().toUpperCase() || null,
        businessName: partnerDraft.businessName.trim(), contact: partnerDraft.contact.trim(), wholesaleVerified: true,
      };
      await supabase.from("wholesale_accounts").insert({
        id: row.id, code: row.code, business_name: row.businessName, contact: row.contact, wholesale_verified: true,
      });
      setWholesaleAccounts([...wholesaleAccounts, row]);
    }
    setPartnerDraft({ id: null, code: "", businessName: "", contact: "" });
  };
  const deletePartner = async (id) => {
    await supabase.from("wholesale_accounts").delete().eq("id", id);
    setWholesaleAccounts(wholesaleAccounts.filter((a) => a.id !== id));
  };
  const approveWholesalePartner = async (id) => {
    await supabase.from("wholesale_accounts").update({ wholesale_verified: true }).eq("id", id);
    setWholesaleAccounts(wholesaleAccounts.map((a) => (a.id === id ? { ...a, wholesaleVerified: true } : a)));
  };

  // Self-registration: the logged-in customer applies for wholesale access; the row starts
  // wholesale_verified = false (RLS enforces this — see 0008_v3_rls.sql) until staff approves
  // it from Front Desk.
  const submitWholesaleApplication = async () => {
    if (!applyBusinessName.trim() || !session?.user) return;
    setApplyError(false);
    const row = {
      id: "partner-" + Date.now().toString(36), user_id: session.user.id,
      business_name: applyBusinessName.trim(), contact: applyContact.trim(), wholesale_verified: false,
    };
    const { error } = await supabase.from("wholesale_accounts").insert(row);
    if (error) { console.error(error); setApplyError(true); return; }
    setWholesaleAccount({
      id: row.id, code: null, businessName: row.business_name, contact: row.contact,
      userId: row.user_id, wholesaleVerified: false,
    });
  };

  const printInvoice = (order) => {
    // Escape user-controlled text before interpolating into raw HTML — without this, a malicious
    // order name/address/note could run arbitrary script in the admin's browser when printing.
    const esc = (s) =>
      String(s ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
    const itemRows = order.lines
      .map((l) => `<tr><td style="padding:8px 0;">${esc(l.name.en || l.name.vi)}${l.price ? ` <span style="color:#AD8A4E;">(${l.price.toLocaleString("vi-VN")}đ)</span>` : ""}</td><td style="padding:8px 0;text-align:right;">${l.qty} ${l.unit === "kg" ? "kg" : l.unit === "pack" ? "pack" : "pcs"}${l.price ? ` = ${(l.price * l.qty).toLocaleString("vi-VN")}đ` : ""}</td></tr>`)
      .join("");
    const totalLine =
      order.type === "retail"
        ? `<tr><td style="padding:10px 0;font-weight:700;">Total items</td><td style="padding:10px 0;text-align:right;font-weight:700;">${order.totalItems} pcs</td></tr>`
        : `<tr><td style="padding:10px 0;font-weight:700;">Total volume</td><td style="padding:10px 0;text-align:right;font-weight:700;">${order.totalKg} kg</td></tr>
           <tr><td colspan="2" style="padding:2px 0 10px;color:#AD8A4E;">${esc(order.tier.range.en)} · ${esc(order.tier.off.en)}</td></tr>`;
    const estimatedTotalLine = order.estimatedTotal
      ? `<tr><td style="padding:6px 0;font-weight:700;color:#AD8A4E;">Estimated total</td><td style="padding:6px 0;text-align:right;font-weight:700;color:#AD8A4E;">${order.estimatedTotal.toLocaleString("vi-VN")}đ</td></tr>`
      : "";
    const promoLine = order.promo ? `<tr><td colspan="2" style="padding:2px 0 10px;color:#9C3B2E;">Promo: ${esc(order.promo.code)} (-${order.promo.percent}%)</td></tr>` : "";
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Invoice ${esc(order.id)}</title>
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
        <div class="meta">Invoice · Order ${esc(order.id)}<br/>${esc(new Date(order.ts).toLocaleString("vi-VN"))}</div>
        <hr/>
        <h2>Customer</h2>
        <p style="font-size:14px;line-height:1.7;margin:0 0 16px;">
          ${esc(order.customerName)}<br/>${esc(order.contact)}${order.address ? `<br/>${esc(order.address)}` : ""}${order.taxNumber ? `<br/>Tax No: ${esc(order.taxNumber)}` : ""}
        </p>
        <h2>Items</h2>
        <table>${itemRows}${totalLine}${estimatedTotalLine}${promoLine}</table>
        ${order.note ? `<p style="font-size:13px;font-style:italic;color:#2E4A40;margin-top:16px;">Note: ${esc(order.note)}</p>` : ""}
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
    const headers = ["Order ID", "Date", "Type", "Customer", "Contact", "Address", "Tax Number", "Items", "Total", "Tier/VAT", "Estimated Total (VND)", "Promo", "Payment Method", "Status", "Tracking Code", "Note"];
    const rows = orders.map((o) => [
      o.id,
      new Date(o.ts).toLocaleString("vi-VN"),
      o.type,
      o.customerName,
      o.contact,
      o.address || "",
      o.taxNumber || "",
      o.lines.map((l) => `${l.name.en || l.name.vi}: ${l.qty}${l.unit === "kg" ? "kg" : l.unit === "pack" ? "pack" : "pcs"}${l.price ? ` @${l.price.toLocaleString("vi-VN")}đ` : ""}`).join(" | "),
      o.type === "retail" ? `${o.totalItems} pcs` : `${o.totalKg} kg`,
      o.type === "retail" ? `VAT ${o.vat}%` : `${o.tier?.range?.en || ""} (${o.tier?.off?.en || ""})`,
      o.estimatedTotal ? o.estimatedTotal.toLocaleString("vi-VN") + "đ" : "",
      o.promo ? `${o.promo.code} (-${o.promo.percent}%)${o.promo.ownerName ? " via " + o.promo.ownerName : ""}` : "",
      o.paymentMethod === "cash" ? "Cash" : "QR",
      o.status || "pending",
      o.trackingCode || "",
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

  const vietQrUrl = (order, amountOverride) => {
    if (!payment.bin || !payment.accountNumber) return null;
    const info = encodeURIComponent(order ? order.id : "");
    const name = encodeURIComponent(payment.accountName || "");
    const amount = amountOverride ?? order?.estimatedTotal;
    const amountParam = amount ? `&amount=${Math.round(amount)}` : "";
    return `https://img.vietqr.io/image/${payment.bin}-${payment.accountNumber}-compact2.png?accountName=${name}&addInfo=${info}${amountParam}`;
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
    setSection(onboardInterest);
    markOnboarded();
    setOnboardConsent(false);
  };

  const applyReorder = (order) => {
    const newCart = {};
    if (order.type === "retail") {
      order.lines.forEach((l) => {
        const match = retailProducts.find((p) => l.name.en === p.name.en || l.name.en.startsWith(p.name.en + " ("));
        if (!match) return;
        if (match.variants && match.variants.length > 0) {
          const m = l.name.en.match(/\(([^)]+)\)\s*$/);
          const weight = (m && match.variants.some((v) => v.weight === m[1])) ? m[1] : match.variants[0].weight;
          newCart[`${match.id}__${weight}`] = l.qty;
        } else {
          newCart[match.id] = l.qty;
        }
      });
      setRetailCart(newCart);
    } else {
      order.lines.forEach((l) => {
        const match = wholesaleProducts.find((p) => p.name.en === l.name.en || p.name.vi === l.name.vi);
        if (match) newCart[match.id] = l.qty;
      });
      setCart(newCart);
    }
    setOrderName(order.customerName);
    setOrderContact(order.contact);
    setOrderAddress(order.address || "");
    setOrderTaxNumber(order.taxNumber || "");
  };

  const submitOrder = async (type) => {
    if (!orderName.trim() || !orderContact.trim() || !orderConsent) return;
    const isRetail = type === "retail";
    const lines = isRetail
      ? retailCartLines.map((p) => ({
          name: p.weight ? { en: `${p.name.en} (${p.weight})`, vi: `${p.name.vi} (${p.weight})` } : p.name,
          qty: p.qty, unit: p.line === "everyday" ? "kg" : "pcs", price: p.price || null,
          productId: p.productId, weight: p.weight || null,
        }))
      : cartLines.map((p) => ({ name: p.name, qty: p.qty, unit: "kg", price: p.price || null }));
    if (!isRetail && addTestPack) {
      lines.push({ name: t.testPackName, qty: 1, unit: "pack" });
    }
    const rawTotal = lines.reduce((s, l) => s + (l.price ? l.price * l.qty : 0), 0);
    const wholesaleTotal = rawTotal > 0 ? Math.round(rawTotal * (1 - currentTier.pct / 100)) : null;

    setOrderError(false);

    if (isRetail) {
      const { data, error } = await supabase.rpc("submit_retail_order", {
        p_customer_name: orderName.trim(),
        p_contact: orderContact.trim(),
        p_address: orderAddress.trim(),
        p_tax_number: orderTaxNumber.trim(),
        p_note: orderNote.trim(),
        p_lines: lines,
        p_total_items: retailTotalItems,
        p_estimated_total: rawTotal || null,
        p_promo: appliedPromo,
        p_payment_method: paymentMethod,
      });
      if (error || !data || data.length === 0) {
        console.error(error);
        setOrderError(true);
        loadCatalog(); // stock may have changed under us — refresh what's shown
        return;
      }
      const row = data[0];
      setOrderSubmitted({
        id: row.id, ts: row.ts, type: "retail",
        customerName: orderName.trim(), contact: orderContact.trim(), address: orderAddress.trim(),
        taxNumber: orderTaxNumber.trim(), vat: 10, promo: appliedPromo, note: orderNote.trim(), lines,
        totalKg: null, totalItems: retailTotalItems, estimatedTotal: rawTotal || null, tier: null,
        paymentMethod, status: "pending", trackingCode: "", unread: true,
      });
      setRetailCart({});
      loadCatalog();
    } else {
      const newOrder = {
        id: "order-" + Date.now().toString(36),
        ts: new Date().toISOString(),
        type,
        customerName: orderName.trim(),
        contact: orderContact.trim(),
        address: orderAddress.trim(),
        taxNumber: orderTaxNumber.trim(),
        vat: null,
        promo: appliedPromo,
        note: orderNote.trim(),
        lines,
        totalKg,
        totalItems: null,
        estimatedTotal: wholesaleTotal,
        tier: currentTier,
        paymentMethod,
        status: "pending",
        trackingCode: "",
        unread: true,
      };
      const { error } = await supabase.from("orders").insert(toOrderRow(newOrder));
      if (error) { console.error(error); setOrderError(true); return; }
      setOrderSubmitted(newOrder);
      setCart({});
    }
    setAppliedPromo(null);
    setPromoInput("");
    setPromoError(false);
    setOrderConsent(false);
    setPaymentMethod("qr");
    setAddTestPack(false);
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
      ...order.lines.map((l) => `- ${l.name[lang] || l.name.en}: ${l.qty} ${l.unit === "kg" ? "kg" : l.unit === "pack" ? "pack" : "pcs"}${l.price ? ` (${l.price.toLocaleString("vi-VN")}đ each)` : ""}`),
      "",
      order.type === "retail" ? `Items: ${order.totalItems}` : `Total: ${order.totalKg} kg`,
      order.estimatedTotal ? `Estimated total: ${order.estimatedTotal.toLocaleString("vi-VN")}đ` : null,
      `Payment method: ${order.paymentMethod === "cash" ? "Cash" : "QR bank transfer"}`,
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
      {sidebarOpen && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(28,43,36,0.55)", zIndex: 25 }}
          onClick={() => setSidebarOpen(false)}
        >
          <aside
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 240, minWidth: 240, background: TOKENS.jade, color: TOKENS.paper,
              position: "fixed", top: 0, left: 0, height: "100vh", zIndex: 26,
              borderRadius: "0 24px 24px 0", boxShadow: "10px 0 40px rgba(0,0,0,0.28)",
            }}
          >
            <div style={{ padding: "26px 20px 22px", borderBottom: `1px solid ${TOKENS.jadeSoft}`, position: "relative" }}>
              <div
                aria-hidden="true"
                style={{
                  position: "absolute", top: 4, left: 2, width: 110, height: 110, borderRadius: "50%",
                  background: TOKENS.sealGlow, filter: "blur(5px)", pointerEvents: "none",
                }}
              />
              <div style={{
                position: "relative",
                width: 38, height: 38, borderRadius: "50%", border: `1px solid ${TOKENS.brass}88`,
                display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12,
                fontFamily: "'Noto Serif SC', serif", fontSize: 15, color: TOKENS.brass,
              }}>
                皇龍
              </div>
              <div style={{ fontFamily: "Lora, Georgia, serif", fontSize: 14.5, fontWeight: 600, letterSpacing: 0.2, whiteSpace: "nowrap" }}>House of Hoàng Long</div>
            </div>
            <nav style={{ padding: "14px 8px" }}>
              {nav.map((n) => {
                const Icon = n.icon;
                const isActive = section === n.id;
                return (
                  <button
                    key={n.id}
                    onClick={() => { setSection(n.id); resetWiki(); setSidebarOpen(false); }}
                    style={{
                      display: "flex", alignItems: "center", gap: 11, width: "100%", padding: "9px 11px",
                      marginBottom: 4, border: "none", borderRadius: 14,
                      background: isActive ? TOKENS.navActiveBg : "transparent",
                      boxShadow: isActive ? TOKENS.navActiveInset : "none",
                      color: isActive ? TOKENS.paper : `${TOKENS.paper}99`, fontSize: 14,
                      fontWeight: isActive ? 600 : 400, cursor: "pointer", textAlign: "left", whiteSpace: "nowrap",
                      transition: "background 220ms cubic-bezier(0.23, 1, 0.32, 1)",
                    }}
                  >
                    <span style={{
                      width: 32, height: 32, borderRadius: 10, flexShrink: 0,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      background: isActive ? `${TOKENS.brass}2E` : `${TOKENS.paper}0F`,
                    }}>
                      <Icon size={16} strokeWidth={1.7} color={isActive ? TOKENS.brass : `${TOKENS.paper}88`} />
                    </span>
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
            <div style={{ position: "absolute", bottom: 16, left: 20, right: 20, fontSize: 10.5, letterSpacing: 0.3, lineHeight: 1.5 }}>
              <a
                href="tel:+84903333841"
                style={{ display: "flex", alignItems: "center", gap: 6, color: TOKENS.brass, opacity: 0.9, textDecoration: "none", fontWeight: 600, marginBottom: 6 }}
              >
                <Phone size={12} /> 0903 333 841
              </a>
              <div style={{ opacity: 0.45 }}>Trà Cổ Hà Giang – Công Nghệ Nhật Bản</div>
            </div>
          </aside>
        </div>
      )}

      {/* Main */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        {/* Top bar */}
        <header
          style={{
            display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px",
            borderBottom: `1px solid ${TOKENS.hairline}`, background: TOKENS.paper,
            position: "sticky", top: 0, zIndex: 10, gap: 14,
          }}
        >
          <button onClick={() => setSidebarOpen((s) => !s)} style={{ background: "none", border: "none", cursor: "pointer", color: TOKENS.jadeSoft, flexShrink: 0, padding: 0, display: "flex" }} aria-label="Menu">
            {sidebarOpen ? <X size={21} /> : <Menu size={21} />}
          </button>

          {/* Persistent brand wordmark — stays put in the header on every page/scroll
              position, independent of the big animated seal in the home hero. */}
          <div
            style={{
              display: "flex", alignItems: "center", gap: 6, flexShrink: 0,
              background: TOKENS.jade, border: `1px solid ${TOKENS.brass}`, borderRadius: 20,
              padding: "5px 10px 5px 8px", boxShadow: "0 0 14px rgba(176,141,87,0.28)",
            }}
          >
            <span style={{ fontFamily: "'Noto Serif SC', serif", fontSize: 13, color: TOKENS.brass, lineHeight: 1 }}>皇龍</span>
            <span className="brand-wordmark-text" style={{ fontFamily: "TMCOngDo, Lora, Georgia, serif", fontSize: 13, color: TOKENS.brass, whiteSpace: "nowrap", letterSpacing: 0.2 }}>
              House of Hoàng Long
            </span>
          </div>

          <div style={{ fontFamily: "Lora, Georgia, serif", fontSize: 17.5, fontWeight: 600, letterSpacing: 0.1, flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: TOKENS.jade }}>
            {nav.find((n) => n.id === section)?.label[lang] || nav[0]?.label[lang]}
          </div>

          <button
            onClick={() => setLang(other)}
            title="Switch language"
            style={{
              display: "flex", alignItems: "center", gap: 4, border: "none",
              background: "none", color: TOKENS.jadeSoft, padding: "4px 2px",
              fontSize: 12, fontWeight: 600, cursor: "pointer", flexShrink: 0,
            }}
          >
            <Languages size={14} />
            {other.toUpperCase()}
          </button>

          {section === "retail" && !isAdmin && (
            <button
              onClick={() => setCartDrawerOpen(true)}
              style={{
                position: "relative", display: "flex", alignItems: "center", justifyContent: "center",
                border: "none", background: "none", color: TOKENS.jadeSoft, cursor: "pointer", flexShrink: 0, padding: "4px 2px",
              }}
              aria-label="Cart"
            >
              <ShoppingCart size={18} />
              {retailTotalItems > 0 && (
                <span style={{
                  position: "absolute", top: -3, right: -3, background: TOKENS.lacquer, color: TOKENS.paper,
                  borderRadius: 10, fontSize: 10, fontWeight: 700, minWidth: 17, height: 17, padding: "0 4px",
                  display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1,
                }}>
                  {retailTotalItems}
                </span>
              )}
            </button>
          )}

          {isAdmin ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
              <span style={{ fontSize: 12, color: TOKENS.jadeSoft, display: "none", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} className="staff-email">
                {staffEmail}
              </span>
              <button
                onClick={onLogout}
                title={t.logout}
                style={{
                  display: "flex", alignItems: "center", gap: 5, border: `1px solid ${TOKENS.hairline}`,
                  background: TOKENS.paperDeep, color: TOKENS.jade, borderRadius: 16, padding: "6px 10px",
                  fontSize: 12, fontWeight: 600, cursor: "pointer",
                }}
              >
                <LogOut size={13} /> {t.logout}
              </button>
            </div>
          ) : session ? (
            <button
              onClick={() => supabase.auth.signOut()}
              title={t.logout}
              style={{
                display: "flex", alignItems: "center", gap: 5, border: `1px solid ${TOKENS.hairline}`,
                background: TOKENS.paperDeep, color: TOKENS.jade, borderRadius: 16, padding: "6px 10px",
                fontSize: 12, fontWeight: 600, cursor: "pointer", flexShrink: 0,
              }}
            >
              <LogOut size={13} /> {t.logout}
            </button>
          ) : null}
        </header>

        {/* Content */}
        <main style={{ flex: 1, padding: "24px 20px 60px", maxWidth: 860, width: "100%", margin: "0 auto", minWidth: 0 }}>
          {section === "home" && (
            <div style={{ margin: "-24px -20px 0", padding: "0 0 40px" }}>
              {/* Hero */}
              <div
                style={{
                  position: "relative", background: TOKENS.jade, color: TOKENS.paper,
                  padding: "72px 28px 56px", overflow: "hidden",
                  borderRadius: "0 0 28px 28px",
                }}
              >
                <svg
                  viewBox="0 0 400 90"
                  preserveAspectRatio="none"
                  style={{ position: "absolute", left: 0, right: 0, bottom: 0, width: "100%", height: 56, opacity: 0.3 }}
                >
                  <path
                    d="M0,90 L0,55 L45,20 L80,48 L120,10 L165,50 L210,28 L250,55 L290,15 L335,45 L400,25 L400,90"
                    fill="none" stroke={TOKENS.brass} strokeWidth="1"
                  />
                </svg>
                <div style={{ position: "relative", maxWidth: 460, margin: "0 auto" }}>
                  <BrandSeal TOKENS={TOKENS} />
                </div>
              </div>

              {/* Story teaser */}
              <button
                onClick={() => { setSection("wiki"); setWikiCategory("legacy"); setActiveId("not-farm-not-corp"); }}
                style={{
                  display: "block", width: "100%", textAlign: "left", background: "none", border: "none", cursor: "pointer",
                  padding: "22px 20px", borderBottom: `1px solid ${TOKENS.brassDeep}22`,
                }}
              >
                <p style={{ fontFamily: "Lora, Georgia, serif", fontStyle: "italic", fontSize: "clamp(19px, 4.6vw, 24px)", lineHeight: 1.45, color: TOKENS.jade, margin: "0 0 10px", maxWidth: "34ch" }}>
                  {lang === "en"
                    ? "“It's easy to make great things from great ingredients — but to make great things from the ordinary, that's something else.”"
                    : "“Làm ra thứ tuyệt vời từ nguyên liệu tuyệt vời thì dễ, nhưng từ những gì bình thường — đó mới là chuyện khác.”"}
                </p>
                <span style={{ fontSize: 12, fontWeight: 600, color: TOKENS.brassOnPaper, textDecoration: "underline" }}>
                  {t.viewDetails}
                </span>
              </button>

              {/* Featured photo below the quote */}
              {(homePhoto || isAdmin) && (
                <div style={{ padding: "20px 20px 0" }}>
                  {homePhoto && (
                    <img
                      src={homePhoto}
                      alt=""
                      style={{ width: "100%", height: 220, objectFit: "cover", borderRadius: TOKENS.radius, boxShadow: TOKENS.shadowSm, display: "block" }}
                    />
                  )}
                  {isAdmin && (
                    <>
                    <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                      <label style={{
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 6, flex: 1,
                        padding: "9px 12px", borderRadius: 8, border: `1px dashed ${TOKENS.brassDeep}88`,
                        fontSize: 12.5, color: TOKENS.brassOnPaper, cursor: uploadingHomePhoto ? "default" : "pointer", fontWeight: 600,
                        opacity: uploadingHomePhoto ? 0.6 : 1,
                      }}>
                        {uploadingHomePhoto ? <Loader2 size={14} className="spin" /> : <Upload size={14} />}
                        {uploadingHomePhoto ? t.uploading : (homePhoto ? t.uploadPhotoLabel : t.addPhoto)}
                        <input
                          type="file"
                          accept="image/*"
                          disabled={uploadingHomePhoto}
                          style={{ display: "none" }}
                          onChange={(e) => { const file = e.target.files?.[0]; if (file) uploadHomePhoto(file); }}
                        />
                      </label>
                      {homePhoto && (
                        <button
                          onClick={() => saveHomePhoto("")}
                          style={{ background: "none", border: `1px solid ${TOKENS.lacquer}55`, borderRadius: 8, padding: "9px 12px", cursor: "pointer" }}
                        >
                          <Trash2 size={14} color={TOKENS.lacquer} />
                        </button>
                      )}
                    </div>
                    {homePhotoError && (
                      <p style={{ fontSize: 11.5, color: TOKENS.lacquer, margin: "6px 0 0" }}>
                        {t.uploadFailed}{typeof homePhotoError === "string" ? ` (${homePhotoError})` : ""}
                      </p>
                    )}
                    </>
                  )}
                </div>
              )}

              {/* Tea of the day — museum "object of the day" framing, rotates once per day */}
              {teaOfDay && (
                <div style={{ padding: "20px 20px 0" }}>
                  <div
                    className="pcard"
                    onClick={() => setDetailProduct({ product: teaOfDay, cartType: role === "wholesale" && teaOfDay.line === "everyday" ? "wholesale" : "retail" })}
                    style={{
                      display: "flex", alignItems: "center", gap: 16, cursor: "pointer",
                      background: TOKENS.paper, borderRadius: TOKENS.radius, boxShadow: TOKENS.shadowSm,
                      padding: "18px 20px", position: "relative", overflow: "hidden",
                    }}
                  >
                    <div style={{
                      fontFamily: "Lora, Georgia, serif", fontSize: 52, fontWeight: 500, lineHeight: 0.9,
                      color: `${TOKENS.jade}1F`, flexShrink: 0, letterSpacing: -1,
                    }}>
                      {String(today.getDate()).padStart(2, "0")}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 10.5, fontWeight: 700, color: TOKENS.brassOnPaper, textTransform: "uppercase", letterSpacing: 1 }}>
                        {t.teaOfDayLabel}
                      </div>
                      <div style={{ fontFamily: "Lora, Georgia, serif", fontSize: "clamp(19px, 4.4vw, 22px)", lineHeight: 1.25, color: TOKENS.jade, marginTop: 4, overflowWrap: "anywhere" }}>
                        {teaOfDay.name[lang] || teaOfDay.name.en}
                      </div>
                      {teaOfDay.notes?.[lang] && (
                        <div style={{ fontSize: 12.5, color: TOKENS.jadeSoft, fontStyle: "italic", marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {teaOfDay.notes[lang]}
                        </div>
                      )}
                    </div>
                    {teaOfDay.photoUrl && (
                      <img
                        src={teaOfDay.photoUrl}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        style={{
                          width: 64, height: 64, borderRadius: 16, objectFit: "cover", flexShrink: 0,
                          objectPosition: teaOfDay.photoPosition || "50% 50%",
                        }}
                      />
                    )}
                  </div>
                </div>
              )}

              {/* Booking CTA — deliberately styled as an action (filled jade + brass) so it
                  reads differently from the paper nav cards further down, which only navigate. */}
              {!isAdmin && (
                <div style={{ padding: "20px 20px 0" }}>
                  <button
                    className="pcard"
                    onClick={() => setSection("sessions")}
                    style={{
                      display: "flex", alignItems: "center", gap: 12, width: "100%", textAlign: "left",
                      background: `linear-gradient(135deg, ${TOKENS.jade} 0%, ${TOKENS.jadeSoft} 100%)`,
                      color: TOKENS.paper, border: "none", borderRadius: TOKENS.radius,
                      padding: "18px 20px", cursor: "pointer", boxShadow: TOKENS.shadowMd,
                    }}
                  >
                    <span style={{
                      width: 42, height: 42, borderRadius: 14, flexShrink: 0,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      background: `${TOKENS.brass}2E`, boxShadow: `inset 0 0 0 1px ${TOKENS.brass}55`,
                    }}>
                      <Calendar size={19} color={TOKENS.brass} strokeWidth={1.7} />
                    </span>
                    <span style={{ minWidth: 0, flex: 1 }}>
                      <span style={{ display: "block", fontFamily: "Lora, Georgia, serif", fontSize: "clamp(19px, 4.4vw, 22px)", lineHeight: 1.25, color: TOKENS.paper }}>
                        {t.teaSessionCtaBtn}
                      </span>
                      <span style={{ display: "block", fontSize: 12, color: TOKENS.brassOnDark, marginTop: 2 }}>
                        {t.teaSessionFreeNote}
                      </span>
                    </span>
                    <ChevronRight size={18} color={TOKENS.brass} style={{ flexShrink: 0 }} />
                  </button>
                </div>
              )}

              {/* Featured: Sample Pack */}
              {catalog.some((p) => p.line === "sample") && (
                <div style={{ padding: "20px 20px 0" }}>
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: TOKENS.brassOnPaper, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>
                    {t.sampleOption}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
                    {catalog.filter((p) => p.line === "sample").map((p) => {
                      const stockTotal = getStockTotal(p);
                      const soldOut = p.available === false || stockTotal === 0;
                      return (
                        <div
                          key={p.id}
                          className="pcard"
                          onClick={() => setDetailProduct({ product: p, cartType: "retail" })}
                          style={{
                            background: `linear-gradient(160deg, ${TOKENS.jade} 0%, ${TOKENS.jadeSoft} 100%)`,
                            borderRadius: 14, padding: 16, cursor: "pointer", opacity: soldOut ? 0.55 : 1,
                            display: "flex", flexDirection: "column", gap: 6, minHeight: 110,
                          }}
                        >
                          <div style={{ fontFamily: "Lora, Georgia, serif", fontSize: 17, lineHeight: 1.25, color: TOKENS.paper, overflowWrap: "anywhere" }}>{p.name[lang]}</div>
                          {p.price ? <div style={{ fontSize: 16, fontWeight: 700, color: TOKENS.brassOnDark }}>{formatVND(p.price)}</div> : null}
                          <div style={{ fontSize: 11, color: TOKENS.brassOnDark, fontWeight: 600, textDecoration: "underline", marginTop: "auto" }}>
                            {soldOut ? t.outOfStock : t.viewDetails}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Bento entry points */}
              <div style={{ padding: "28px 20px 0", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
                {nav.filter((n) => n.id !== "home").map((n, i) => {
                  const Icon = n.icon;
                  const featured = i === 0;
                  return (
                    <button
                      key={n.id}
                      className="pcard"
                      onClick={() => { setSection(n.id); resetWiki(); }}
                      style={{
                        gridColumn: featured ? "1 / -1" : "auto",
                        background: TOKENS.paper, border: "none",
                        boxShadow: featured ? TOKENS.shadowMd : TOKENS.shadowSm,
                        borderRadius: featured ? TOKENS.radiusLg : TOKENS.radius, padding: featured ? "28px 26px" : "22px 20px",
                        textAlign: "left", cursor: "pointer", minWidth: 0, color: TOKENS.jade,
                        display: "flex", flexDirection: featured ? "row" : "column",
                        alignItems: featured ? "center" : "flex-start", gap: featured ? 20 : 12,
                        justifyContent: "space-between",
                      }}
                    >
                      <div style={{ display: "flex", flexDirection: "column", gap: featured ? 10 : 12, minWidth: 0 }}>
                        <div style={{
                          width: featured ? 44 : 36, height: featured ? 44 : 36, borderRadius: 10, background: TOKENS.jade,
                          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                        }}>
                          <Icon size={featured ? 21 : 17} color={TOKENS.brass} strokeWidth={1.6} />
                        </div>
                        <div style={{ fontFamily: "Lora, Georgia, serif", fontWeight: 500, fontSize: featured ? "clamp(24px, 5.5vw, 30px)" : "clamp(19px, 4.4vw, 22px)", lineHeight: 1.2, letterSpacing: -0.2, overflowWrap: "anywhere", color: TOKENS.jade }}>
                          {n.label[lang]}
                        </div>
                        <div style={{ fontSize: 12.5, color: TOKENS.jadeSoft }}>
                          {n.id === "wiki"
                            ? (lang === "en" ? "The full story behind the leaf — legacy, origin, and craft." : t.articleCount(visibleCategories.length))
                            : n.id === "library"
                            ? (lang === "en" ? "General tea knowledge — types, culture, brewing." : "Kiến thức trà nói chung — phân loại, văn hoá, cách pha.")
                            : n.id === "wholesale"
                            ? (lang === "en" ? "Wholesale pricing and ordering." : "Giá sỉ và đặt hàng.")
                            : n.id === "retail"
                            ? (lang === "en" ? "Shop our teas by the pack." : "Mua trà theo gói.")
                            : n.id === "frontdesk"
                            ? (lang === "en" ? "Orders, leads, messages, and settings." : "Đơn hàng, lead, tin nhắn, cài đặt.")
                            : n.id === "sessions"
                            ? (lang === "en" ? "Reserve a private tasting with Long." : "Đặt lịch buổi trà riêng với Long.")
                            : t.comingSoon}
                        </div>
                      </div>
                      <ChevronRight size={18} color={TOKENS.brassDeep} style={{ flexShrink: 0, display: featured ? "block" : "none" }} />
                    </button>
                  );
                })}
              </div>

              {/* Contact footer — high-contrast jade block so it reads as the page's endpoint */}
              <div style={{ padding: "28px 20px 0" }}>
                <div style={{
                  background: TOKENS.jade, borderRadius: TOKENS.radius, padding: "22px 20px",
                  display: "flex", flexDirection: "column", gap: 12, boxShadow: TOKENS.shadowMd,
                }}>
                  <div style={{ fontSize: 10.5, fontWeight: 700, color: TOKENS.brassOnDark, textTransform: "uppercase", letterSpacing: 1 }}>
                    {t.stillHaveQuestions}
                  </div>
                  <a
                    href="tel:+84903333841"
                    style={{ display: "flex", alignItems: "center", gap: 10, color: TOKENS.paper, textDecoration: "none" }}
                  >
                    <span style={{
                      width: 36, height: 36, borderRadius: 12, flexShrink: 0, background: `${TOKENS.brass}2E`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <Phone size={16} color={TOKENS.brass} />
                    </span>
                    <span style={{ fontFamily: "Lora, Georgia, serif", fontSize: 17 }}>0903 333 841</span>
                  </a>
                  <a
                    href="mailto:hotro.trahoanglong@gmail.com"
                    style={{ display: "flex", alignItems: "center", gap: 10, color: TOKENS.paper, textDecoration: "none" }}
                  >
                    <span style={{
                      width: 36, height: 36, borderRadius: 12, flexShrink: 0, background: `${TOKENS.brass}2E`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <Send size={15} color={TOKENS.brass} />
                    </span>
                    <span style={{ fontSize: 13.5, overflowWrap: "anywhere" }}>hotro.trahoanglong@gmail.com</span>
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* ---------- WIKI: MAIN MENU (level 1) ---------- */}
          {section === "wiki" && !wikiCategory && !editing && (
            <div>
                  {/* Origin facts + the person behind the tea. Warm near-black rather than jade:
                      a colour-tinted dark reads heritage, this reads editorial. Renders only
                      once staff have filled it in from Front Desk › The House. */}
                  {(houseStory.originStats.length > 0 || houseStory.producerName) && (
                    <div style={{
                      margin: "-4px -20px 24px", padding: "26px 20px 24px",
                      background: TOKENS.ink, color: TOKENS.paper, borderRadius: TOKENS.radiusLg,
                    }}>
                      {houseStory.originStats.length > 0 && (
                        <div style={{
                          display: "grid", gap: 14,
                          gridTemplateColumns: `repeat(${Math.min(houseStory.originStats.length, 4)}, 1fr)`,
                        }}>
                          {houseStory.originStats.slice(0, 4).map((s, i) => (
                            <div key={i} style={{ minWidth: 0 }}>
                              <div style={{ fontFamily: "Lora, Georgia, serif", fontSize: "clamp(20px, 5vw, 28px)", lineHeight: 1.1, color: TOKENS.paper, overflowWrap: "anywhere" }}>
                                {s.value}
                              </div>
                              <div style={{ fontSize: 10, color: `${TOKENS.paper}88`, textTransform: "uppercase", letterSpacing: 0.7, marginTop: 5, lineHeight: 1.3 }}>
                                {s.label?.[lang] || s.label?.en}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {houseStory.producerName && (
                        <div style={{
                          display: "flex", alignItems: "center", gap: 14,
                          marginTop: houseStory.originStats.length > 0 ? 24 : 0,
                          paddingTop: houseStory.originStats.length > 0 ? 22 : 0,
                          borderTop: houseStory.originStats.length > 0 ? `1px solid ${TOKENS.paper}1A` : "none",
                        }}>
                          {houseStory.producerPhoto && (
                            <img
                              src={houseStory.producerPhoto}
                              alt={houseStory.producerName}
                              loading="lazy"
                              decoding="async"
                              style={{ width: 62, height: 62, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
                            />
                          )}
                          <div style={{ minWidth: 0 }}>
                            {houseStory.producerQuote?.[lang] && (
                              <p style={{ fontFamily: "Lora, Georgia, serif", fontStyle: "italic", fontSize: 15, lineHeight: 1.5, color: TOKENS.paper, margin: "0 0 8px" }}>
                                “{houseStory.producerQuote[lang]}”
                              </p>
                            )}
                            <div style={{ fontSize: 13.5, fontWeight: 600, color: TOKENS.brassOnDark }}>{houseStory.producerName}</div>
                            {houseStory.producerRole?.[lang] && (
                              <div style={{ fontSize: 11.5, color: `${TOKENS.paper}99`, marginTop: 1 }}>{houseStory.producerRole[lang]}</div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div style={{ display: "flex", flexDirection: "column" }}>
                    {visibleCategories.map((cat, i) => {
                      const Icon = cat.icon;
                      const count = articlesInCategory(cat.id).length;
                      return (
                        <button
                          key={cat.id}
                          onClick={() => setWikiCategory(cat.id)}
                          style={{
                            display: "flex", alignItems: "center", gap: 16, background: "transparent",
                            border: "none", borderTop: i === 0 ? `1px solid ${TOKENS.hairline}` : "none",
                            borderBottom: `1px solid ${TOKENS.hairline}`, padding: "18px 4px",
                            textAlign: "left", cursor: "pointer", minWidth: 0, color: TOKENS.jade,
                          }}
                        >
                          <div style={{ width: 52, height: 52, borderRadius: 14, background: TOKENS.jade, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <Icon size={26} color={TOKENS.brass} strokeWidth={1.6} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 15, fontWeight: 600, overflowWrap: "anywhere", color: TOKENS.jade }}>{cat.label[lang]}</div>
                            <div style={{ fontSize: 12.5, color: TOKENS.jadeSoft, marginTop: 2 }}>{cat.subtitle[lang]} · {count}</div>
                          </div>
                          <ChevronRight size={17} color={TOKENS.brassDeep} style={{ flexShrink: 0 }} />
                        </button>
                      );
                    })}
                  </div>
                  {sealMark()}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "4px 0" }}>
                    <span style={{ fontSize: 12.5, color: TOKENS.jadeSoft }}>{t.stillHaveQuestions}</span>
                    <a href="tel:+84903333841" style={{ display: "flex", alignItems: "center", gap: 5, color: TOKENS.brassOnPaper, fontSize: 12.5, fontWeight: 700, textDecoration: "none" }}>
                      <Phone size={13} /> 0903 333 841
                    </a>
                  </div>
                  {isAdmin && (
                    <button
                      onClick={() => startNew(null)}
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", marginTop: 20,
                        background: "transparent", color: TOKENS.brassOnPaper, border: `1px dashed ${TOKENS.brassDeep}66`,
                        borderRadius: 10, padding: "12px", fontSize: 13.5, fontWeight: 600, cursor: "pointer",
                      }}
                    >
                      <Plus size={15} /> {t.addArticle}
                    </button>
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
                <h2 style={{ fontFamily: "Lora, Georgia, serif", fontSize: "clamp(19px, 4vw, 24px)", margin: 0, overflowWrap: "anywhere" }}>
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
                    background: "transparent", color: TOKENS.brassOnPaper, border: `1px dashed ${TOKENS.brassDeep}88`,
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
              <div style={{ fontSize: 11.5, fontWeight: 700, color: TOKENS.brassOnPaper, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>
                {activeCategoryMeta?.label[lang]}
              </div>
              <h2 style={{ fontFamily: "Lora, Georgia, serif", fontWeight: 500, fontSize: "clamp(28px, 6.5vw, 40px)", lineHeight: 1.12, letterSpacing: -0.5, margin: "0 0 18px", overflowWrap: "anywhere" }}>
                {active.title[lang] || active.title.en}
              </h2>
              <div style={{ whiteSpace: "pre-line", fontSize: 15, lineHeight: 1.75, color: TOKENS.jade }}>
                {linkifyText(active.body[lang] || active.body.en, TOKENS.brassDeep) || <em style={{ color: TOKENS.jadeSoft }}>— {STR[other].noResults}</em>}
              </div>

              {active.id === "dong-san-pham" && (
                <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 22 }}>
                  {["everyday", "reserve", "sample"].map((lineId) => {
                    const items = catalog.filter((p) => p.line === lineId);
                    if (items.length === 0) return null;
                    return (
                      <div key={lineId}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: TOKENS.brassOnPaper, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>
                          {lineLabel(lineId)}
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                          {items.map((p) => (
                            <div
                              key={p.id}
                              onClick={() => setDetailProduct({ product: p, cartType: (lineId === "reserve" || lineId === "sample") ? "retail" : (role === "retail" ? "retail" : "wholesale") })}
                              style={{ display: "flex", gap: 12, background: TOKENS.paperDeep, border: `1px solid ${TOKENS.brassDeep}33`, borderRadius: 12, padding: 14, opacity: p.available === false ? 0.6 : 1, cursor: "pointer", position: "relative" }}
                            >
                              {p.limited && (
                                <div style={{
                                  position: "absolute", top: 8, right: 8, zIndex: 1,
                                  background: TOKENS.jade, color: TOKENS.brassOnDark, borderRadius: 20,
                                  padding: "3px 8px", display: "flex", alignItems: "center", gap: 4,
                                  fontSize: 10, fontWeight: 700,
                                }}>
                                  <Sparkles size={11} /> {t.limitedBadge}
                                </div>
                              )}
                              {p.photoUrl && (
                                <img src={p.photoUrl} alt={p.name[lang]} loading="lazy" decoding="async" style={{ width: 64, height: 64, borderRadius: 8, objectFit: "cover", objectPosition: p.photoPosition || "50% 50%", flexShrink: 0 }} />
                              )}
                              <div style={{ minWidth: 0, flex: 1 }}>
                                <div style={{ fontSize: 14.5, fontWeight: 600, overflowWrap: "anywhere" }}>
                                  {p.name[lang]}
                                  {p.available === false && <span style={{ color: TOKENS.lacquer, fontSize: 11, fontWeight: 700, marginLeft: 8 }}>· {t.outOfStock}</span>}
                                </div>
                                {lang === "en" && p.name.vi && (
                                  <div style={{ fontSize: 11.5, color: TOKENS.jadeSoft, marginTop: 1 }}>{p.name.vi}</div>
                                )}
                                {p.price ? <div style={{ fontSize: 13.5, fontWeight: 700, color: TOKENS.brassOnPaper, marginTop: 2 }}>{formatVND(p.price)}{p.line === "everyday" ? ` / ${t.kg}` : ""}</div> : null}
                                {!p.price && getVariantMinPrice(p) !== undefined && (
                                  <div style={{ fontSize: 13.5, fontWeight: 700, color: TOKENS.brassOnPaper, marginTop: 2 }}>{t.fromPrice(formatVND(getVariantMinPrice(p)))}</div>
                                )}
                                {productBadges(p)}
                                {flavorChips(p)}
                                {typeof getStockTotal(p) === "number" && p.available !== false && (
                                  <div style={{ fontSize: 11.5, fontWeight: 700, color: getStockTotal(p) <= 5 ? TOKENS.lacquer : TOKENS.jadeSoft, marginTop: 2 }}>
                                    {t.stockLeft(getStockTotal(p))}{getStockTotal(p) <= 5 ? ` · ${t.lastFew}` : ""}
                                  </div>
                                )}
                                {!getStockTotal(p) && getVariantStockTotal(p) !== undefined && p.available !== false && (
                                  <div style={{ fontSize: 11.5, fontWeight: 700, color: getVariantStockTotal(p) <= 5 ? TOKENS.lacquer : TOKENS.jadeSoft, marginTop: 2 }}>
                                    {t.stockLeft(getVariantStockTotal(p))}{getVariantStockTotal(p) <= 5 ? ` · ${t.lastFew}` : ""}
                                  </div>
                                )}
                                {p.notes?.[lang] && <div style={{ fontSize: 13, color: TOKENS.jadeSoft, fontStyle: "italic", marginTop: 3 }}>{p.notes[lang]}</div>}
                                <div style={{ fontSize: 12, color: TOKENS.brassOnPaper, marginTop: 4 }}>
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

              {active.id === "planning-visit" && !isAdmin && (
                <TeaSessionBooking supabase={supabase} payment={payment} vietQrUrl={vietQrUrl} t={t} TOKENS={TOKENS} />
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

          {/* ---------- LIBRARY ---------- */}
          {section === "library" && (
            <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
              {["gallery", "reading"].map((tb) => (
                <button
                  key={tb}
                  onClick={() => setLibraryTab(tb)}
                  style={{
                    flex: 1, padding: "10px", borderRadius: 10, cursor: "pointer", fontSize: 13.5, fontWeight: 600,
                    border: `1px solid ${libraryTab === tb ? TOKENS.brass : TOKENS.hairline}`,
                    background: libraryTab === tb ? TOKENS.jade : TOKENS.paper,
                    color: libraryTab === tb ? TOKENS.brass : TOKENS.jadeSoft,
                  }}
                >
                  {tb === "gallery" ? t.galleryTab : t.readingTab}
                </button>
              ))}
            </div>
          )}

          {/* Quick access: jump straight to Gallery or any Library section without scrolling */}
          {section === "library" && (
            <div style={{ marginBottom: 22 }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: TOKENS.brassOnPaper, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>
                {t.quickAccess}
              </div>
              <div style={{ display: "flex", gap: 14, overflowX: "auto", paddingBottom: 4 }} className="peekrail">
                {[
                  { id: "__gallery", icon: Images, label: t.galleryTab, onClick: () => { setLibraryTab("gallery"); setLibraryCategory(null); setLibraryActiveId(null); } },
                  ...LIBRARY_CATEGORIES.map((c) => ({
                    id: c.id, icon: c.icon, label: c.label[lang],
                    onClick: () => { setLibraryTab("reading"); setLibraryCategory(c.id); setLibraryActiveId(null); },
                  })),
                ].map((item) => {
                  const Icon = item.icon;
                  const active = item.id === "__gallery" ? libraryTab === "gallery" : (libraryTab === "reading" && libraryCategory === item.id);
                  return (
                    <button
                      key={item.id}
                      onClick={item.onClick}
                      style={{
                        display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flex: "0 0 auto",
                        width: 72, background: "none", border: "none", cursor: "pointer", padding: 0, color: TOKENS.jade,
                      }}
                    >
                      <span style={{
                        width: 52, height: 52, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                        background: active ? TOKENS.jade : TOKENS.paper,
                        boxShadow: active ? `0 0 0 2px ${TOKENS.brass}, ${TOKENS.shadowSm}` : TOKENS.shadowSm,
                        transition: "box-shadow 220ms cubic-bezier(0.23, 1, 0.32, 1)",
                      }}>
                        <Icon size={21} strokeWidth={1.6} color={active ? TOKENS.brass : TOKENS.brassDeep} />
                      </span>
                      <span style={{ fontSize: 10.5, lineHeight: 1.25, textAlign: "center", color: TOKENS.jadeSoft, overflowWrap: "anywhere" }}>
                        {item.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {section === "library" && libraryTab === "gallery" && (
            <div>
              {isAdmin && (
                <div style={{ marginBottom: 20, background: TOKENS.paperDeep, border: `1px solid ${TOKENS.hairline}`, borderRadius: 12, padding: 14, display: "flex", flexDirection: "column", gap: 8 }}>
                  <label style={{
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    padding: "9px 12px", borderRadius: 8, border: `1px dashed ${TOKENS.brassDeep}88`,
                    fontSize: 12.5, color: TOKENS.brassOnPaper, cursor: uploadingGalleryPhoto ? "default" : "pointer", fontWeight: 600,
                    opacity: uploadingGalleryPhoto ? 0.6 : 1,
                  }}>
                    {uploadingGalleryPhoto ? <Loader2 size={14} className="spin" /> : <Upload size={14} />}
                    {uploadingGalleryPhoto ? t.uploading : t.uploadPhotoLabel}
                    <input
                      type="file"
                      accept="image/*"
                      disabled={uploadingGalleryPhoto}
                      style={{ display: "none" }}
                      onChange={(e) => { const file = e.target.files?.[0]; if (file) uploadGalleryPhoto(file); }}
                    />
                  </label>
                  {galleryPhotoError && (
                    <p style={{ fontSize: 11.5, color: TOKENS.lacquer, margin: 0 }}>
                      {t.uploadFailed}{typeof galleryPhotoError === "string" ? ` (${galleryPhotoError})` : ""}
                    </p>
                  )}
                  {galleryDraft.url && !uploadingGalleryPhoto && (
                    <img src={galleryDraft.url} alt="" loading="lazy" decoding="async" style={{ width: "100%", height: 120, borderRadius: 8, objectFit: "cover" }} />
                  )}
                  <input
                    value={galleryDraft.captionEn}
                    onChange={(e) => setGalleryDraft({ ...galleryDraft, captionEn: e.target.value })}
                    placeholder={`${t.captionPh} (EN)`}
                    style={{ padding: "9px 12px", borderRadius: 8, border: `1px solid ${TOKENS.brassDeep}55`, fontSize: 13.5 }}
                  />
                  <input
                    value={galleryDraft.captionVi}
                    onChange={(e) => setGalleryDraft({ ...galleryDraft, captionVi: e.target.value })}
                    placeholder={`${t.captionPh} (VI)`}
                    style={{ padding: "9px 12px", borderRadius: 8, border: `1px solid ${TOKENS.brassDeep}55`, fontSize: 13.5 }}
                  />
                  <button
                    onClick={addGalleryImage}
                    style={{ background: TOKENS.jade, color: TOKENS.paper, border: "none", borderRadius: 8, padding: "10px", fontSize: 13.5, fontWeight: 600, cursor: "pointer" }}
                  >
                    {t.addPhoto}
                  </button>
                </div>
              )}

              {galleryImages.length === 0 ? (
                <p style={{ color: TOKENS.jadeSoft, fontSize: 14, fontStyle: "italic" }}>{t.emptyGallery}</p>
              ) : (
                /* Peek carousel: the current photo holds most of the frame while the next one
                   stays partly visible at the right edge, so there's an obvious "swipe on" cue. */
                <div style={{ position: "relative", margin: "0 -20px" }}>
                  <div
                    className="peekrail"
                    onScroll={(e) => {
                      const el = e.currentTarget;
                      const first = el.firstElementChild;
                      const step = first ? first.getBoundingClientRect().width + 12 : 1;
                      const i = Math.round(el.scrollLeft / step);
                      setGalleryIndex(Math.max(0, Math.min(galleryImages.length - 1, i)));
                    }}
                    style={{
                      display: "flex", gap: 12, overflowX: "auto", scrollSnapType: "x mandatory",
                      padding: "0 20px 12px", scrollPaddingLeft: 20,
                    }}
                  >
                    {galleryImages.map((g) => (
                      <div key={g.id} style={{ position: "relative", flex: "0 0 84%", scrollSnapAlign: "start" }}>
                        <img
                          src={g.url}
                          alt={g.caption?.[lang] || ""}
                          loading="lazy"
                          decoding="async"
                          onClick={() => setLightboxImage(g)}
                          style={{
                            width: "100%", height: 300, objectFit: "cover", borderRadius: TOKENS.radius,
                            boxShadow: TOKENS.shadowMd, cursor: "pointer", display: "block",
                          }}
                        />
                        {g.caption?.[lang] && (
                          <div style={{ fontSize: 12.5, color: TOKENS.jadeSoft, marginTop: 8, paddingRight: 8 }}>{g.caption[lang]}</div>
                        )}
                        {isAdmin && (
                          <button
                            onClick={() => deleteGalleryImage(g.id)}
                            style={{
                              position: "absolute", top: 10, left: 10, background: "rgba(28,43,36,0.7)", border: "none",
                              borderRadius: "50%", width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
                            }}
                          >
                            <Trash2 size={13} color="#fff" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <div style={{
                    position: "absolute", top: 12, right: 32,
                    background: "rgba(28,43,36,0.72)", color: TOKENS.brass,
                    borderRadius: 20, padding: "4px 11px", fontSize: 11.5, fontWeight: 700,
                    fontFamily: "Lora, Georgia, serif", letterSpacing: 0.5, pointerEvents: "none",
                  }}>
                    {String(galleryIndex + 1).padStart(2, "0")} / {String(galleryImages.length).padStart(2, "0")}
                  </div>
                </div>
              )}
            </div>
          )}

          {section === "library" && libraryTab === "reading" && !libraryCategory && (
            <div>
              <div style={{ position: "relative", marginBottom: 18 }}>
                <Search size={16} style={{ position: "absolute", left: 12, top: 12, color: TOKENS.jadeSoft }} />
                <input
                  value={libraryQuery}
                  onChange={(e) => setLibraryQuery(e.target.value)}
                  placeholder={t.librarySearch}
                  style={{
                    width: "100%", boxSizing: "border-box", padding: "10px 12px 10px 36px",
                    borderRadius: 8, border: `1px solid ${TOKENS.brassDeep}55`,
                    background: TOKENS.paperDeep, fontSize: 14, color: TOKENS.jade,
                  }}
                />
              </div>

              {librarySearchResults ? (
                <div>
                  <div style={{ fontSize: 12, color: TOKENS.jadeSoft, marginBottom: 10 }}>
                    {t.results(librarySearchResults.length, libraryQuery)}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {librarySearchResults.map((a) => (
                      <button
                        key={a.id}
                        onClick={() => { setLibraryCategory(a.category); setLibraryActiveId(a.id); }}
                        style={{
                          display: "flex", alignItems: "center", justifyContent: "space-between",
                          background: TOKENS.paperDeep, border: `1px solid ${TOKENS.brassDeep}33`,
                          borderRadius: 10, padding: "13px 14px", textAlign: "left", cursor: "pointer",
                          fontSize: 14.5, color: TOKENS.jade, minWidth: 0,
                        }}
                      >
                        <span style={{ overflowWrap: "anywhere" }}>{a.title[lang] || a.title.en}</span>
                        <ChevronRight size={16} color={TOKENS.brassDeep} style={{ flexShrink: 0, marginLeft: 8 }} />
                      </button>
                    ))}
                    {librarySearchResults.length === 0 && <p style={{ color: TOKENS.jadeSoft, fontSize: 14 }}>{t.noResults}</p>}
                  </div>
                </div>
              ) : (
                <>
                  <p style={{ fontSize: 12.5, color: TOKENS.jadeSoft, marginBottom: 16, lineHeight: 1.5 }}>{t.libraryChooseSection}</p>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    {LIBRARY_CATEGORIES.map((cat, i) => {
                      const Icon = cat.icon;
                      const count = libraryArticlesInCategory(cat.id).length;
                      return (
                        <button
                          key={cat.id}
                          onClick={() => setLibraryCategory(cat.id)}
                          style={{
                            display: "flex", alignItems: "center", gap: 18, background: "transparent",
                            border: "none", borderTop: i === 0 ? `1px solid ${TOKENS.hairline}` : "none",
                            borderBottom: `1px solid ${TOKENS.hairline}`, padding: "18px 4px",
                            textAlign: "left", cursor: "pointer", minWidth: 0,
                          }}
                        >
                          <div style={{ fontFamily: "Lora, Georgia, serif", fontSize: 22, fontWeight: 500, color: `${TOKENS.jade}44`, width: 28, flexShrink: 0, textAlign: "right" }}>
                            {String(i + 1).padStart(2, "0")}
                          </div>
                          <div style={{ width: 34, height: 34, borderRadius: 9, background: TOKENS.jade, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <Icon size={16} color={TOKENS.brass} strokeWidth={1.7} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 15, fontWeight: 600, overflowWrap: "anywhere" }}>{cat.label[lang]}</div>
                            <div style={{ fontSize: 12.5, color: TOKENS.jadeSoft, marginTop: 2 }}>{cat.subtitle[lang]} · {count}</div>
                          </div>
                          <ChevronRight size={17} color={TOKENS.brassDeep} style={{ flexShrink: 0 }} />
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          {section === "library" && libraryTab === "reading" && libraryCategory && !libraryActiveId && (
            <div>
              <button onClick={() => setLibraryCategory(null)} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: TOKENS.jadeSoft, cursor: "pointer", fontSize: 13.5, marginBottom: 16, padding: 0 }}>
                <ChevronLeft size={15} /> {t.allSections}
              </button>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
                {libraryActiveCategoryMeta && <libraryActiveCategoryMeta.icon size={20} color={TOKENS.brassDeep} />}
                <h2 style={{ fontFamily: "Lora, Georgia, serif", fontSize: "clamp(19px, 4vw, 24px)", margin: 0, overflowWrap: "anywhere" }}>
                  {libraryActiveCategoryMeta?.label[lang]}
                </h2>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {libraryArticlesInCategory(libraryCategory).map((a) => (
                  <button
                    key={a.id}
                    onClick={() => setLibraryActiveId(a.id)}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      background: TOKENS.paperDeep, border: `1px solid ${TOKENS.brassDeep}33`,
                      borderRadius: 10, padding: "13px 14px", textAlign: "left", cursor: "pointer",
                      fontSize: 14.5, color: TOKENS.jade, minWidth: 0,
                    }}
                  >
                    <span style={{ overflowWrap: "anywhere" }}>{a.title[lang] || a.title.en}</span>
                    <ChevronRight size={16} color={TOKENS.brassDeep} style={{ flexShrink: 0, marginLeft: 8 }} />
                  </button>
                ))}
              </div>
            </div>
          )}

          {section === "library" && libraryTab === "reading" && libraryActiveId && libraryActive && (
            <div>
              <button onClick={() => setLibraryActiveId(null)} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: TOKENS.jadeSoft, cursor: "pointer", fontSize: 13.5, marginBottom: 16, padding: 0 }}>
                <ChevronLeft size={15} /> {libraryActiveCategoryMeta?.label[lang]}
              </button>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: TOKENS.brassOnPaper, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>
                {libraryActiveCategoryMeta?.label[lang]}
              </div>
              <h2 style={{ fontFamily: "Lora, Georgia, serif", fontWeight: 500, fontSize: "clamp(28px, 6.5vw, 40px)", lineHeight: 1.12, letterSpacing: -0.5, margin: "0 0 18px", overflowWrap: "anywhere" }}>
                {libraryActive.title[lang] || libraryActive.title.en}
              </h2>
              <div style={{ whiteSpace: "pre-line", fontSize: 15, lineHeight: 1.75, color: TOKENS.jade }}>
                {linkifyText(libraryActive.body[lang] || libraryActive.body.en, TOKENS.brassDeep)}
              </div>
            </div>
          )}

          {/* ---------- BOOK A SESSION ---------- */}
          {section === "sessions" && !isAdmin && (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                <div style={{ display: "inline-flex", padding: 10, borderRadius: "50%", background: TOKENS.paperDeep }}>
                  <Calendar size={18} color={TOKENS.brassDeep} />
                </div>
                <h2 style={{ fontFamily: "Lora, Georgia, serif", fontWeight: 500, fontSize: 22, margin: 0 }}>
                  {NAV.find((n) => n.id === "sessions")?.label[lang]}
                </h2>
              </div>
              <TeaSessionBooking supabase={supabase} payment={payment} vietQrUrl={vietQrUrl} t={t} TOKENS={TOKENS} autoOpen />
            </div>
          )}

          {/* ---------- HOUSE PARTNERS ---------- */}
          {section === "wholesale" && (
            <div>
              {!isAdmin && !wholesaleAccount?.wholesaleVerified ? (
                <div style={{ maxWidth: 380, margin: "20px auto 0", textAlign: "center" }}>
                  {!session ? (
                    <>
                      <div style={{ display: "inline-flex", padding: 14, borderRadius: "50%", background: TOKENS.paperDeep, marginBottom: 16 }}>
                        <Lock size={22} color={TOKENS.brassDeep} />
                      </div>
                      <h2 style={{ fontFamily: "Lora, Georgia, serif", fontWeight: 500, fontSize: 19, margin: "0 0 8px" }}>{t.wholesaleGateTitle}</h2>
                      <p style={{ fontSize: 13.5, color: TOKENS.jadeSoft, marginBottom: 4 }}>{t.wholesaleGateHint}</p>
                      <AuthPanel supabase={supabase} t={t} TOKENS={TOKENS} />
                    </>
                  ) : wholesaleAccount ? (
                    <>
                      <div style={{ display: "inline-flex", padding: 14, borderRadius: "50%", background: TOKENS.paperDeep, marginBottom: 16 }}>
                        <Clock size={22} color={TOKENS.brassDeep} />
                      </div>
                      <h2 style={{ fontFamily: "Lora, Georgia, serif", fontWeight: 500, fontSize: 19, margin: "0 0 8px" }}>{t.wholesalePendingTitle}</h2>
                      <p style={{ fontSize: 13.5, color: TOKENS.jadeSoft, margin: 0 }}>{t.wholesalePendingHint}</p>
                    </>
                  ) : (
                    <>
                      <h2 style={{ fontFamily: "Lora, Georgia, serif", fontWeight: 500, fontSize: 19, margin: "0 0 8px" }}>{t.wholesaleApplyTitle}</h2>
                      <p style={{ fontSize: 13.5, color: TOKENS.jadeSoft, marginBottom: 18 }}>{t.wholesaleApplyHint}</p>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8, textAlign: "left" }}>
                        <input
                          value={applyBusinessName}
                          onChange={(e) => setApplyBusinessName(e.target.value)}
                          placeholder={t.businessNamePh}
                          style={{ padding: "10px 13px", borderRadius: 8, border: `1px solid ${TOKENS.brassDeep}55`, fontSize: 14 }}
                        />
                        <input
                          value={applyContact}
                          onChange={(e) => setApplyContact(e.target.value)}
                          placeholder={t.yourContact}
                          style={{ padding: "10px 13px", borderRadius: 8, border: `1px solid ${TOKENS.brassDeep}55`, fontSize: 14 }}
                        />
                        <button
                          onClick={submitWholesaleApplication}
                          disabled={!applyBusinessName.trim()}
                          style={{ background: TOKENS.jade, color: TOKENS.paper, border: "none", borderRadius: 8, padding: "11px", fontSize: 13.5, fontWeight: 600, cursor: "pointer", opacity: applyBusinessName.trim() ? 1 : 0.6 }}
                        >
                          {t.wholesaleApplyBtn}
                        </button>
                      </div>
                      {applyError && <p style={{ fontSize: 12.5, color: TOKENS.lacquer, marginTop: 10 }}>{t.authError}</p>}
                    </>
                  )}
                </div>
              ) : (
              <>
              {orderSubmitted && orderSubmitted.type === "wholesale" ? (
                <div style={{ textAlign: "center", padding: "40px 16px" }}>
                  <div style={{ display: "inline-flex", padding: 16, borderRadius: "50%", background: TOKENS.paperDeep, marginBottom: 16 }}>
                    <Check size={26} color={TOKENS.brassDeep} />
                  </div>
                  <h2 style={{ fontFamily: "Lora, Georgia, serif", fontSize: 20, margin: "0 0 8px" }}>{t.orderSent}</h2>
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
                  <h2 style={{ fontFamily: "Lora, Georgia, serif", fontWeight: 500, fontSize: 22, margin: "0 0 4px" }}>{t.orderTitle}</h2>
                  <p style={{ color: TOKENS.jadeSoft, fontSize: 13.5, marginBottom: 18 }}>{t.orderHint}</p>
                  {!isAdmin && <ReorderBox supabase={supabase} type="wholesale" onApply={applyReorder} t={t} TOKENS={TOKENS} />}

                  {stepHeader(1, Leaf, t.stepBrowse)}
                  <div style={{ marginBottom: 20, background: TOKENS.paper, boxShadow: TOKENS.shadowSm, borderRadius: TOKENS.radius, padding: 18 }}>
                    <div style={{ fontFamily: "Lora, Georgia, serif", fontWeight: 500, fontSize: 16, marginBottom: 3 }}>{t.yieldGuideTitle}</div>
                    <p style={{ fontSize: 11.5, color: TOKENS.jadeSoft, margin: "0 0 14px", lineHeight: 1.5 }}>{t.yieldGuideHint}</p>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      {YIELD_GUIDE.map((y, i) => {
                        const minCups = Math.round((y.minL * 1000) / CUP_ML_MAX);
                        const maxCups = Math.round((y.maxL * 1000) / CUP_ML_MIN);
                        const label = y.key === "light" ? t.yieldLight : y.key === "standard" ? t.yieldStandard : t.yieldConcentrate;
                        return (
                          <div
                            key={y.key}
                            style={{
                              display: "flex", justifyContent: "space-between", alignItems: "center",
                              padding: "12px 0", borderTop: i === 0 ? `1px solid ${TOKENS.hairline}` : "none",
                              borderBottom: `1px solid ${TOKENS.hairline}`,
                            }}
                          >
                            <div style={{ fontSize: 13, color: TOKENS.jade, maxWidth: "50%" }}>{label}</div>
                            <div style={{ textAlign: "right" }}>
                              <div style={{ fontFamily: "Lora, Georgia, serif", fontSize: 15, fontWeight: 600, color: TOKENS.brassOnPaper }}>
                                {y.minL}–{y.maxL} {t.litersLabel}
                              </div>
                              <div style={{ fontSize: 11, color: TOKENS.jadeSoft, marginTop: 1 }}>{t.cupsApprox(minCups, maxCups)}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {eligibleForTestPack && (
                    <div style={{ marginBottom: 20, background: `${TOKENS.brass}14`, border: `1px solid ${TOKENS.brass}55`, borderRadius: 12, padding: 14 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 3 }}>{t.testPackOfferTitle}</div>
                      <p style={{ fontSize: 12.5, color: TOKENS.jadeSoft, margin: "0 0 10px" }}>{t.testPackOfferHint}</p>
                      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                        <input type="checkbox" checked={addTestPack} onChange={(e) => setAddTestPack(e.target.checked)} />
                        {t.testPackCheckbox}
                      </label>
                    </div>
                  )}

                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
                    {[...wholesaleProducts].sort((a, b) => (a.available === false ? 1 : 0) - (b.available === false ? 1 : 0)).map((p) => (
                      <div
                        key={p.id}
                        className="pcard"
                        style={{
                          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
                          background: TOKENS.paper, boxShadow: TOKENS.shadowSm,
                          borderRadius: TOKENS.radiusSm, padding: "14px 16px", opacity: p.available === false ? 0.55 : 1,
                        }}
                      >
                        <div
                          onClick={() => setDetailProduct({ product: p, cartType: "wholesale" })}
                          style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, cursor: "pointer" }}
                        >
                          {p.photoUrl && (
                            <img src={p.photoUrl} alt={p.name[lang]} loading="lazy" decoding="async" style={{ width: 44, height: 44, borderRadius: 8, objectFit: "cover", objectPosition: p.photoPosition || "50% 50%", flexShrink: 0 }} />
                          )}
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 14, overflowWrap: "anywhere" }}>{p.name[lang]}</div>
                            {lang === "en" && p.name.vi && (
                              <div style={{ fontSize: 11, color: TOKENS.jadeSoft, marginTop: 0 }}>{p.name.vi}</div>
                            )}
                            {p.price ? (
                              <div style={{ display: "flex", alignItems: "baseline", gap: 3, marginTop: 2 }}>
                                <span style={{ fontSize: 13.5, fontWeight: 700, color: TOKENS.brassOnPaper, fontFamily: "Lora, Georgia, serif" }}>
                                  {formatVND(p.price)}
                                </span>
                                <span style={{ fontSize: 10.5, color: TOKENS.jadeSoft, letterSpacing: 0.3 }}>/ {t.kg}</span>
                              </div>
                            ) : null}
                            {productBadges(p)}
                            {flavorChips(p)}
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

                  <div style={{ borderTop: `1px solid ${TOKENS.hairline}`, paddingTop: 24, marginBottom: 24 }}>
                    {stepHeader(2, ShoppingCart, t.stepYourOrder)}
                    {cartLines.length === 0 && !addTestPack ? (
                    <p style={{ color: TOKENS.jadeSoft, fontSize: 13.5, fontStyle: "italic" }}>{t.emptyCart}</p>
                  ) : (
                    <div style={{ background: TOKENS.jade, color: TOKENS.paper, borderRadius: 12, padding: "18px 18px 16px", marginBottom: 20 }}>
                      <div style={{ fontSize: 11.5, letterSpacing: 1, textTransform: "uppercase", color: TOKENS.brassOnDark, marginBottom: 10, fontWeight: 600 }}>
                        {t.summaryTitle}
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 12 }}>
                        {cartLines.map((p) => (
                          <div key={p.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5 }}>
                            <span style={{ opacity: 0.9 }}>{p.name[lang]}{p.price ? ` (${formatVND(p.price)}/${t.kg})` : ""}</span>
                            <span>{p.qty} {t.kg}{p.price ? ` = ${formatVND(p.price * p.qty)}` : ""}</span>
                          </div>
                        ))}
                        {addTestPack && (
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, color: TOKENS.brassOnDark }}>
                            <span>{t.testPackName[lang]}</span>
                            <span>× 1</span>
                          </div>
                        )}
                      </div>
                      <div style={{ borderTop: `1px solid ${TOKENS.paper}33`, paddingTop: 10, display: "flex", flexDirection: "column", gap: 4, marginBottom: 14 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, fontWeight: 600 }}>
                          <span>{t.totalKg}</span>
                          <span>{totalKg} {t.kg}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: TOKENS.brassOnDark }}>
                          <span>{t.tierApplied}</span>
                          <span>{currentTier.range[lang]} · {currentTier.off[lang]}</span>
                        </div>
                        {cartLines.some((p) => p.price) && (
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 15, fontWeight: 700, color: TOKENS.brassOnDark, marginTop: 2 }}>
                            <span>{t.estimatedTotal}</span>
                            <span>{formatVND(Math.round(cartLines.reduce((s, p) => s + (p.price ? p.price * p.qty : 0), 0) * (1 - currentTier.pct / 100)))}</span>
                          </div>
                        )}
                        {cartLines.some((p) => !p.price) && (
                          <p style={{ fontSize: 10.5, color: `${TOKENS.paper}88`, margin: "2px 0 0" }}>{t.priceNote}</p>
                        )}
                        {appliedPromo && (
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: TOKENS.brassOnDark }}>
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

                      <div style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: 12, color: `${TOKENS.paper}cc`, marginBottom: 6 }}>{t.paymentMethodLabel}</div>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button
                            type="button"
                            onClick={() => setPaymentMethod("qr")}
                            style={{
                              flex: 1, padding: "9px", borderRadius: 8, cursor: "pointer", fontSize: 12.5, fontWeight: 600,
                              border: `1px solid ${paymentMethod === "qr" ? TOKENS.brass : TOKENS.paper + "44"}`,
                              background: paymentMethod === "qr" ? TOKENS.brass : "transparent",
                              color: paymentMethod === "qr" ? TOKENS.jade : TOKENS.paper,
                            }}
                          >
                            {t.payByQR}
                          </button>
                          <button
                            type="button"
                            onClick={() => setPaymentMethod("cash")}
                            style={{
                              flex: 1, padding: "9px", borderRadius: 8, cursor: "pointer",
                              border: `1px solid ${paymentMethod === "cash" ? TOKENS.brass : TOKENS.paper + "44"}`,
                              background: paymentMethod === "cash" ? TOKENS.brass : "transparent",
                              color: paymentMethod === "cash" ? TOKENS.jade : TOKENS.paper,
                            }}
                          >
                            {t.payByCash}
                          </button>
                        </div>
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

                      {orderError && <p style={{ fontSize: 12.5, color: "#E8A99A", marginBottom: 10 }}>{t.orderFailed}</p>}

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
                  </div>

                  <div style={{ borderTop: `1px solid ${TOKENS.hairline}`, paddingTop: 24, marginBottom: 24 }}>
                    {stepHeader(3, Tag, t.priceRef)}
                    <p style={{ color: TOKENS.jadeSoft, fontSize: 12.5, lineHeight: 1.6, marginBottom: 14 }}>{t.tradeQuoteNote}</p>
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
                        <strong style={{ color: TOKENS.brassOnPaper }}>{row.off[lang]}</strong>
                      </div>
                    ))}
                    </div>
                  </div>

                  {!isAdmin && (
                    <div style={{ borderTop: `1px solid ${TOKENS.hairline}`, paddingTop: 24 }}>
                      {stepHeader(4, Truck, t.trackOrder)}
                      <TrackOrderBox supabase={supabase} lang={lang} t={t} TOKENS={TOKENS} />
                    </div>
                  )}
                </>
              )}
              </>
              )}
            </div>
          )}

          {/* ---------- FRONT DESK (internal only) ---------- */}
          {section === "frontdesk" && (
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
                    <div style={{ fontSize: 11, fontWeight: 700, color: TOKENS.brassOnPaper, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>
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
                {["orders", "sessions", "leads", "messages", "payment", "catalog", "reviews", "promos", "partners", "house"].map((tab) => (
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
                    {tab === "orders" ? t.frontDeskOrders : tab === "sessions" ? t.frontDeskSessionsTab : tab === "leads" ? t.frontDeskLeads : tab === "payment" ? t.frontDeskPayment : tab === "catalog" ? t.catalogTitle : tab === "reviews" ? t.reviewsTitle : tab === "promos" ? t.promosTitle : tab === "partners" ? t.wholesaleAccountsTitle : tab === "house" ? t.frontDeskHouseTab : t.frontDeskMessages}
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
                          <div style={{ fontSize: 12.5, color: TOKENS.brassOnPaper, marginTop: 2 }}>{t.interestedIn}: {l.interest === "wholesale" ? t.onboardWholesale : t.onboardRetail}</div>
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
                    onClick={() => savePayment()}
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
                      loading="lazy"
                      decoding="async"
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
                      <option value="sample">{t.sampleOption}</option>
                    </select>
                    <p style={{ fontSize: 11, color: TOKENS.jadeSoft, margin: "-4px 0 2px", lineHeight: 1.4 }}>{t.productLineHint}</p>
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
                        value={productDraft.flavorsEn}
                        onChange={(e) => setProductDraft({ ...productDraft, flavorsEn: e.target.value })}
                        placeholder={t.flavorsEnPh}
                        style={{ flex: 1, padding: "9px 12px", borderRadius: 8, border: `1px solid ${TOKENS.brassDeep}55`, fontSize: 13, minWidth: 0 }}
                      />
                      <input
                        value={productDraft.flavorsVi}
                        onChange={(e) => setProductDraft({ ...productDraft, flavorsVi: e.target.value })}
                        placeholder={t.flavorsViPh}
                        style={{ flex: 1, padding: "9px 12px", borderRadius: 8, border: `1px solid ${TOKENS.brassDeep}55`, fontSize: 13, minWidth: 0 }}
                      />
                    </div>
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
                      type="number"
                      value={productDraft.price}
                      onChange={(e) => setProductDraft({ ...productDraft, price: e.target.value })}
                      placeholder={t.pricePh}
                      style={{ padding: "9px 12px", borderRadius: 8, border: `1px solid ${TOKENS.brassDeep}55`, fontSize: 13.5 }}
                    />
                    <div style={{ display: "flex", gap: 8 }}>
                      <input
                        type="number"
                        min="0"
                        value={productDraft.stockHaGiang}
                        onChange={(e) => setProductDraft({ ...productDraft, stockHaGiang: e.target.value })}
                        placeholder={t.stockHaGiangPh}
                        style={{ flex: 1, padding: "9px 12px", borderRadius: 8, border: `1px solid ${TOKENS.brassDeep}55`, fontSize: 13, minWidth: 0 }}
                      />
                      <input
                        type="number"
                        min="0"
                        value={productDraft.stockSocSon}
                        onChange={(e) => setProductDraft({ ...productDraft, stockSocSon: e.target.value })}
                        placeholder={t.stockSocSonPh}
                        style={{ flex: 1, padding: "9px 12px", borderRadius: 8, border: `1px solid ${TOKENS.brassDeep}55`, fontSize: 13, minWidth: 0 }}
                      />
                    </div>
                    <input
                      type="number"
                      min="0"
                      value={productDraft.soldCount}
                      onChange={(e) => setProductDraft({ ...productDraft, soldCount: e.target.value })}
                      placeholder={t.soldCountPh}
                      style={{ padding: "9px 12px", borderRadius: 8, border: `1px solid ${TOKENS.brassDeep}55`, fontSize: 13.5 }}
                    />
                    <input
                      value={productDraft.batch}
                      onChange={(e) => setProductDraft({ ...productDraft, batch: e.target.value })}
                      placeholder={t.batchPh}
                      style={{ padding: "9px 12px", borderRadius: 8, border: `1px solid ${TOKENS.brassDeep}55`, fontSize: 13.5 }}
                    />
                    <input
                      value={productDraft.photoUrl}
                      onChange={(e) => setProductDraft({ ...productDraft, photoUrl: e.target.value })}
                      placeholder={t.photoUrlPh}
                      style={{ padding: "9px 12px", borderRadius: 8, border: `1px solid ${TOKENS.brassDeep}55`, fontSize: 13.5 }}
                    />
                    <label style={{
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                      padding: "9px 12px", borderRadius: 8, border: `1px dashed ${TOKENS.brassDeep}88`,
                      fontSize: 12.5, color: TOKENS.brassOnPaper, cursor: uploadingProductPhoto ? "default" : "pointer", fontWeight: 600,
                      opacity: uploadingProductPhoto ? 0.6 : 1,
                    }}>
                      {uploadingProductPhoto ? <Loader2 size={14} className="spin" /> : <Upload size={14} />}
                      {uploadingProductPhoto ? t.uploading : t.uploadPhotoLabel}
                      <input
                        type="file"
                        accept="image/*"
                        disabled={uploadingProductPhoto}
                        style={{ display: "none" }}
                        onChange={(e) => { const file = e.target.files?.[0]; if (file) uploadProductPhoto(file); }}
                      />
                    </label>
                    {productPhotoError && (
                      <p style={{ fontSize: 11.5, color: TOKENS.lacquer, margin: 0 }}>
                        {t.uploadFailed}{typeof productPhotoError === "string" ? ` (${productPhotoError})` : ""}
                      </p>
                    )}
                    {productDraft.photoUrl && !uploadingProductPhoto && (
                      <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                        <img
                          src={productDraft.photoUrl}
                          alt=""
                          loading="lazy"
                          decoding="async"
                          style={{
                            width: 84, height: 84, borderRadius: 8, objectFit: "cover", flexShrink: 0,
                            objectPosition: `${productDraft.photoPosX}% ${productDraft.photoPosY}%`,
                            border: `1px solid ${TOKENS.brassDeep}44`,
                          }}
                        />
                        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6, paddingTop: 4 }}>
                          <div style={{ fontSize: 11, color: TOKENS.jadeSoft }}>{t.centerImageLabel}</div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ fontSize: 10.5, color: TOKENS.jadeSoft, width: 14 }}>X</span>
                            <input
                              type="range" min="0" max="100" value={productDraft.photoPosX}
                              onChange={(e) => setProductDraft({ ...productDraft, photoPosX: Number(e.target.value) })}
                              style={{ flex: 1 }}
                            />
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ fontSize: 10.5, color: TOKENS.jadeSoft, width: 14 }}>Y</span>
                            <input
                              type="range" min="0" max="100" value={productDraft.photoPosY}
                              onChange={(e) => setProductDraft({ ...productDraft, photoPosY: Number(e.target.value) })}
                              style={{ flex: 1 }}
                            />
                          </div>
                        </div>
                      </div>
                    )}
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
                        <div style={{ fontSize: 11.5, color: TOKENS.brassOnPaper }}>
                          {lineLabel(p.line)}
                          {p.packSize && ` · ${p.packSize}`}
                          {p.price && ` · ${formatVND(p.price)}`}
                          {p.available === false && <span style={{ color: TOKENS.lacquer, marginLeft: 6 }}>· {t.outOfStock}</span>}
                        </div>
                        {(typeof p.stockHaGiang === "number" || typeof p.stockSocSon === "number") && (
                          <div style={{ fontSize: 11, color: TOKENS.jadeSoft, marginTop: 2 }}>
                            {t.warehouseHaGiang}: {p.stockHaGiang ?? 0} · {t.warehouseSocSon}: {p.stockSocSon ?? 0} · {t.stockLeft(getStockTotal(p))}
                          </div>
                        )}
                        {p.batch && (
                          <div style={{ fontSize: 11, color: TOKENS.jadeSoft, marginTop: 2 }}>{t.batchLabel}: {p.batch}</div>
                        )}
                        {p.variants && p.variants.length > 0 && (
                          <div style={{ marginTop: 8, background: TOKENS.paper, borderRadius: 8, padding: 8 }}>
                            <div style={{ fontSize: 10.5, color: TOKENS.jadeSoft, marginBottom: 2 }}>{t.chooseWeight} · {t.pricePh} · {t.warehouseHaGiang} · {t.warehouseSocSon}</div>
                            {p.variants.map((v) => (
                              <VariantEditorRow
                                key={v.weight}
                                variant={v}
                                onSave={(fields) => updateVariant(p.id, v.weight, fields)}
                                t={t}
                                TOKENS={TOKENS}
                              />
                            ))}
                          </div>
                        )}
                        {p.notes?.en && <div style={{ fontSize: 12, color: TOKENS.jade, fontStyle: "italic", marginTop: 3 }}>{p.notes.en}</div>}
                        {!p.notes?.en && !p.photoUrl && (
                          <div style={{ fontSize: 11, color: `${TOKENS.jadeSoft}99`, marginTop: 3 }}>{t.missingDetailsHint}</div>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                        <button
                          onClick={() => toggleLimited(p.id)}
                          title={t.limitedBadge}
                          style={{ background: p.limited ? TOKENS.jade : "none", border: `1px solid ${TOKENS.brassDeep}55`, borderRadius: 6, padding: "6px 8px", cursor: "pointer" }}
                        >
                          <Sparkles size={13} color={p.limited ? TOKENS.brass : TOKENS.jadeSoft} />
                        </button>
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
                  {[...testimonials].sort((a, b) => (a.approved === false ? -1 : 1) - (b.approved === false ? -1 : 1)).map((r) => (
                    <div key={r.id} style={{ background: TOKENS.paperDeep, border: `1px solid ${r.approved === false ? TOKENS.lacquer : TOKENS.brassDeep}${r.approved === false ? "88" : "33"}`, borderRadius: 10, padding: "12px 14px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ fontSize: 14, fontWeight: 600 }}>{r.name}</div>
                            {r.approved === false && (
                              <span style={{ background: TOKENS.lacquer, color: TOKENS.paper, borderRadius: 10, fontSize: 10, fontWeight: 700, padding: "2px 8px" }}>{t.pendingApproval}</span>
                            )}
                          </div>
                          <div style={{ fontSize: 13, color: TOKENS.jadeSoft, fontStyle: "italic", marginTop: 3 }}>&quot;{r.quote}&quot;</div>
                        </div>
                        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                          {r.approved === false && (
                            <button onClick={() => approveTestimonial(r.id)} style={{ background: TOKENS.jade, border: "none", borderRadius: 6, padding: "6px 8px", cursor: "pointer" }}>
                              <Check size={13} color={TOKENS.brass} />
                            </button>
                          )}
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

                  {/* ---------- Per-product reviews ---------- */}
                  <div style={{ borderTop: `1px solid ${TOKENS.hairline}`, marginTop: 14, paddingTop: 16 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
                      <div style={{ fontSize: 11.5, fontWeight: 700, color: TOKENS.brassOnPaper, textTransform: "uppercase", letterSpacing: 0.5 }}>
                        {t.productReviewsTitle}
                      </div>
                      <select
                        value={productReviewFilter}
                        onChange={(e) => setProductReviewFilter(e.target.value)}
                        style={{ padding: "7px 10px", borderRadius: 8, border: `1px solid ${TOKENS.brassDeep}55`, fontSize: 12.5, background: TOKENS.paper, color: TOKENS.jade }}
                      >
                        <option value="all">{t.allProducts}</option>
                        {catalog.map((p) => (
                          <option key={p.id} value={p.id}>{p.name[lang] || p.name.en}</option>
                        ))}
                      </select>
                    </div>

                    {(() => {
                      const shown = productReviews
                        .filter((r) => productReviewFilter === "all" || r.productId === productReviewFilter)
                        .sort((a, b) => (a.approved === false ? -1 : 1) - (b.approved === false ? -1 : 1));
                      if (shown.length === 0) {
                        return <p style={{ color: TOKENS.jadeSoft, fontSize: 14 }}>{t.noProductReviewsAdmin}</p>;
                      }
                      return (
                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                          {shown.map((r) => {
                            const prod = catalog.find((p) => p.id === r.productId);
                            return (
                              <div key={r.id} style={{ background: TOKENS.paperDeep, border: `1px solid ${r.approved === false ? TOKENS.lacquer + "88" : TOKENS.brassDeep + "33"}`, borderRadius: 10, padding: "12px 14px" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                                  <div style={{ minWidth: 0 }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                                      <span style={{ fontSize: 13, fontWeight: 700, color: TOKENS.brassOnPaper }}>{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</span>
                                      <span style={{ fontSize: 14, fontWeight: 600 }}>{r.reviewerName}</span>
                                      {r.approved === false && (
                                        <span style={{ background: TOKENS.lacquer, color: TOKENS.paper, borderRadius: 10, fontSize: 10, fontWeight: 700, padding: "2px 8px" }}>{t.pendingApproval}</span>
                                      )}
                                    </div>
                                    <div style={{ fontSize: 12, color: TOKENS.jadeSoft, marginTop: 2 }}>
                                      {prod ? (prod.name[lang] || prod.name.en) : r.productId}
                                      {r.contact ? ` · ${r.contact}` : ""}
                                      {r.createdAt ? ` · ${String(r.createdAt).slice(0, 10)}` : ""}
                                    </div>
                                    {r.body && <div style={{ fontSize: 13, color: TOKENS.jadeSoft, fontStyle: "italic", marginTop: 3 }}>&quot;{r.body}&quot;</div>}
                                  </div>
                                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                                    {r.approved === false && (
                                      <button onClick={() => approveProductReview(r.id)} title={t.approve} style={{ background: TOKENS.jade, border: "none", borderRadius: 6, padding: "6px 8px", cursor: "pointer" }}>
                                        <Check size={13} color={TOKENS.brass} />
                                      </button>
                                    )}
                                    <button onClick={() => deleteProductReview(r.id)} style={{ background: "none", border: `1px solid ${TOKENS.lacquer}55`, borderRadius: 6, padding: "6px 8px", cursor: "pointer" }}>
                                      <Trash2 size={13} color={TOKENS.lacquer} />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
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
                            <div style={{ fontSize: 11.5, color: TOKENS.brassOnPaper }}>-{p.percent}%{p.ownerName ? ` · ${p.ownerName}` : ""}</div>
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

              {frontDeskTab === "partners" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ background: TOKENS.paperDeep, border: `1px solid ${TOKENS.brassDeep}44`, borderRadius: 12, padding: 14, display: "flex", flexDirection: "column", gap: 8 }}>
                    <input
                      value={partnerDraft.code}
                      onChange={(e) => setPartnerDraft({ ...partnerDraft, code: e.target.value })}
                      placeholder={t.partnerCodePh}
                      style={{ padding: "9px 12px", borderRadius: 8, border: `1px solid ${TOKENS.brassDeep}55`, fontSize: 13.5, textTransform: "uppercase" }}
                    />
                    <input
                      value={partnerDraft.businessName}
                      onChange={(e) => setPartnerDraft({ ...partnerDraft, businessName: e.target.value })}
                      placeholder={t.businessNamePh}
                      style={{ padding: "9px 12px", borderRadius: 8, border: `1px solid ${TOKENS.brassDeep}55`, fontSize: 13.5 }}
                    />
                    <input
                      value={partnerDraft.contact}
                      onChange={(e) => setPartnerDraft({ ...partnerDraft, contact: e.target.value })}
                      placeholder={t.yourContact}
                      style={{ padding: "9px 12px", borderRadius: 8, border: `1px solid ${TOKENS.brassDeep}55`, fontSize: 13.5 }}
                    />
                    <button
                      onClick={savePartnerDraft}
                      style={{ background: TOKENS.jade, color: TOKENS.paper, border: "none", borderRadius: 8, padding: "10px", fontSize: 13.5, fontWeight: 600, cursor: "pointer" }}
                    >
                      {partnerDraft.id ? t.saveProduct : t.addPartner}
                    </button>
                  </div>
                  {wholesaleAccounts.length === 0 && <p style={{ color: TOKENS.jadeSoft, fontSize: 14 }}>{t.noPartnersYet}</p>}
                  {wholesaleAccounts.map((a) => (
                    <div key={a.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: TOKENS.paperDeep, border: `1px solid ${TOKENS.brassDeep}33`, borderRadius: 10, padding: "10px 14px" }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          {a.code && <span style={{ fontSize: 14, fontWeight: 700, fontFamily: "monospace" }}>{a.code}</span>}
                          <span
                            style={{
                              fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4,
                              padding: "2px 7px", borderRadius: 10,
                              background: a.wholesaleVerified ? `${TOKENS.jade}18` : `${TOKENS.lacquer}18`,
                              color: a.wholesaleVerified ? TOKENS.jade : TOKENS.lacquer,
                            }}
                          >
                            {a.wholesaleVerified ? t.partnerVerifiedBadge : t.partnerPendingBadge}
                          </span>
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{a.businessName}</div>
                        {a.contact && <div style={{ fontSize: 11.5, color: TOKENS.jadeSoft }}>{a.contact}</div>}
                      </div>
                      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                        {!a.wholesaleVerified && (
                          <button onClick={() => approveWholesalePartner(a.id)} style={{ background: TOKENS.jade, color: TOKENS.paper, border: "none", borderRadius: 6, padding: "6px 10px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                            {t.approvePartnerBtn}
                          </button>
                        )}
                        <button onClick={() => setPartnerDraft({ id: a.id, code: a.code || "", businessName: a.businessName, contact: a.contact || "" })} style={{ background: "none", border: `1px solid ${TOKENS.brassDeep}55`, borderRadius: 6, padding: "6px 8px", cursor: "pointer" }}>
                          <Edit3 size={13} color={TOKENS.jade} />
                        </button>
                        <button onClick={() => deletePartner(a.id)} style={{ background: "none", border: `1px solid ${TOKENS.lacquer}55`, borderRadius: 6, padding: "6px 8px", cursor: "pointer" }}>
                          <Trash2 size={13} color={TOKENS.lacquer} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {frontDeskTab === "house" && (() => {
                const d = houseDraft ?? {
                  producerName: houseStory.producerName, producerPhoto: houseStory.producerPhoto,
                  roleEn: houseStory.producerRole?.en || "", roleVi: houseStory.producerRole?.vi || "",
                  quoteEn: houseStory.producerQuote?.en || "", quoteVi: houseStory.producerQuote?.vi || "",
                  statsText: originStatsToText(houseStory.originStats),
                };
                const set = (patch) => setHouseDraft({ ...d, ...patch });
                const field = { padding: "9px 12px", borderRadius: 8, border: `1px solid ${TOKENS.brassDeep}55`, fontSize: 13.5 };
                return (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <p style={{ fontSize: 12.5, color: TOKENS.jadeSoft, margin: 0, lineHeight: 1.5 }}>{t.houseTabHint}</p>

                    <div style={{ fontSize: 11.5, fontWeight: 700, color: TOKENS.brassOnPaper, textTransform: "uppercase", letterSpacing: 0.5, marginTop: 6 }}>
                      {t.originStatsTitle}
                    </div>
                    <textarea
                      value={d.statsText}
                      onChange={(e) => set({ statsText: e.target.value })}
                      placeholder={t.originStatsPh}
                      rows={4}
                      style={{ ...field, resize: "vertical", fontFamily: "monospace", fontSize: 12.5 }}
                    />

                    <div style={{ fontSize: 11.5, fontWeight: 700, color: TOKENS.brassOnPaper, textTransform: "uppercase", letterSpacing: 0.5, marginTop: 6 }}>
                      {t.producerTitle}
                    </div>
                    <input value={d.producerName} onChange={(e) => set({ producerName: e.target.value })} placeholder={t.producerNamePh} style={field} />
                    <div style={{ display: "flex", gap: 8 }}>
                      <input value={d.roleEn} onChange={(e) => set({ roleEn: e.target.value })} placeholder={t.producerRoleEnPh} style={{ ...field, flex: 1, minWidth: 0 }} />
                      <input value={d.roleVi} onChange={(e) => set({ roleVi: e.target.value })} placeholder={t.producerRoleViPh} style={{ ...field, flex: 1, minWidth: 0 }} />
                    </div>
                    <textarea value={d.quoteEn} onChange={(e) => set({ quoteEn: e.target.value })} placeholder={t.producerQuoteEnPh} rows={2} style={{ ...field, resize: "vertical", fontFamily: "inherit" }} />
                    <textarea value={d.quoteVi} onChange={(e) => set({ quoteVi: e.target.value })} placeholder={t.producerQuoteViPh} rows={2} style={{ ...field, resize: "vertical", fontFamily: "inherit" }} />

                    <label style={{
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                      padding: "9px 12px", borderRadius: 8, border: `1px dashed ${TOKENS.brassDeep}88`,
                      fontSize: 12.5, color: TOKENS.brassOnPaper, cursor: uploadingProducerPhoto ? "default" : "pointer",
                      fontWeight: 600, opacity: uploadingProducerPhoto ? 0.6 : 1,
                    }}>
                      {uploadingProducerPhoto ? <Loader2 size={14} className="spin" /> : <Upload size={14} />}
                      {uploadingProducerPhoto ? t.uploading : t.producerPhotoLabel}
                      <input
                        type="file"
                        accept="image/*"
                        disabled={uploadingProducerPhoto}
                        style={{ display: "none" }}
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) { if (!houseDraft) openHouseDraft(); uploadProducerPhoto(f); } }}
                      />
                    </label>
                    {producerPhotoError && (
                      <p style={{ fontSize: 11.5, color: TOKENS.lacquer, margin: 0 }}>
                        {t.uploadFailed}{typeof producerPhotoError === "string" ? ` (${producerPhotoError})` : ""}
                      </p>
                    )}
                    {d.producerPhoto && !uploadingProducerPhoto && (
                      <img src={d.producerPhoto} alt="" style={{ width: 76, height: 76, borderRadius: "50%", objectFit: "cover" }} />
                    )}

                    <button
                      onClick={() => { if (!houseDraft) { setHouseDraft(d); setTimeout(saveHouseDraft, 0); } else saveHouseDraft(); }}
                      style={{ background: houseSaved ? TOKENS.brass : TOKENS.jade, color: houseSaved ? TOKENS.jade : TOKENS.paper, border: "none", borderRadius: 8, padding: "11px", fontSize: 13.5, fontWeight: 600, cursor: "pointer", marginTop: 4 }}
                    >
                      {houseSaved ? t.saved : t.save}
                    </button>
                  </div>
                );
              })()}

              {frontDeskTab === "sessions" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {teaSessions.length === 0 && <p style={{ color: TOKENS.jadeSoft, fontSize: 14 }}>{t.teaSessionNoneYet}</p>}
                  {[...teaSessions].reverse().map((s) => (
                    <div key={s.id} style={{ background: TOKENS.paperDeep, border: `1px solid ${TOKENS.brassDeep}33`, borderRadius: 12, padding: 16 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                        <div style={{ fontFamily: "Lora, Georgia, serif", fontSize: 17, fontWeight: 600 }}>{s.date}{s.time ? ` · ${s.time}` : ""}</div>
                        <span
                          style={{
                            fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4,
                            padding: "2px 8px", borderRadius: 6, flexShrink: 0,
                            background: s.status === "confirmed" ? `${TOKENS.jade}18` : s.status === "cancelled" ? `${TOKENS.lacquer}18` : `${TOKENS.brass}22`,
                            color: s.status === "confirmed" ? TOKENS.jade : s.status === "cancelled" ? TOKENS.lacquer : TOKENS.brassDeep,
                          }}
                        >
                          {s.status === "confirmed" ? t.teaSessionStatusConfirmed : s.status === "cancelled" ? t.teaSessionStatusCancelled : t.teaSessionStatusPending}
                        </span>
                      </div>
                      <div style={{ fontSize: 13.5, fontWeight: 600 }}>{s.customerName}</div>
                      <div style={{ fontSize: 12.5, color: TOKENS.jadeSoft }}>{t.contactLabel}: {s.contact}</div>
                      <div style={{ fontSize: 12.5, color: TOKENS.jadeSoft }}>{t.paymentMethodLabel}: {s.paymentMethod === "cash" ? t.payByCash : t.payByQR}</div>
                      {s.note && <div style={{ fontSize: 12.5, color: TOKENS.jadeSoft, marginTop: 6, fontStyle: "italic" }}>{t.noteLabel}: {s.note}</div>}
                      {s.status !== "cancelled" && (
                        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                          {s.status === "pending" && (
                            <button
                              onClick={() => updateTeaSessionStatus(s.id, "confirmed")}
                              style={{ background: TOKENS.jade, color: TOKENS.paper, border: "none", borderRadius: 8, padding: "8px 12px", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}
                            >
                              {t.teaSessionConfirmBtn}
                            </button>
                          )}
                          <button
                            onClick={() => updateTeaSessionStatus(s.id, "cancelled")}
                            style={{ background: "none", border: `1px solid ${TOKENS.lacquer}55`, color: TOKENS.lacquer, borderRadius: 8, padding: "8px 12px", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}
                          >
                            {t.teaSessionCancelBtn}
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
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
                          {o.vat && <div style={{ fontSize: 12.5, color: TOKENS.brassOnPaper }}>VAT: {o.vat}%</div>}
                          <div style={{ fontSize: 12.5, color: TOKENS.jadeSoft }}>{t.paymentMethodLabel}: {o.paymentMethod === "cash" ? t.payByCash : t.payByQR}</div>
                          {o.promo && <div style={{ fontSize: 12.5, color: TOKENS.lacquer }}>{t.promoLabel}: {o.promo.code} (-{o.promo.percent}%){o.promo.ownerName ? ` · ${o.promo.ownerName}` : ""}</div>}
                        </div>
                        {o.unread && <span style={{ background: TOKENS.lacquer, color: TOKENS.paper, borderRadius: 10, fontSize: 10.5, fontWeight: 700, padding: "2px 8px", flexShrink: 0 }}>{t.newBadge}</span>}
                      </div>
                      <div style={{ fontSize: 13.5, lineHeight: 1.7, marginBottom: 8 }}>
                        {o.lines.map((l, i) => (
                          <div key={i} style={{ display: "flex", justifyContent: "space-between" }}>
                            <span>{l.name[lang] || l.name.en}</span>
                            <span>{l.qty} {l.unit === "kg" ? t.kg : l.unit === "pack" ? "pack" : t.pcs}</span>
                          </div>
                        ))}
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 600, borderTop: `1px solid ${TOKENS.brassDeep}33`, paddingTop: 8 }}>
                        {o.type === "retail" ? (
                          <span>{t.itemsTotal}: {o.totalItems} {t.pcs}</span>
                        ) : (
                          <>
                            <span>{o.totalKg} {t.kg}</span>
                            <span style={{ color: TOKENS.brassOnPaper }}>{o.tier.range[lang]} · {o.tier.off[lang]}</span>
                          </>
                        )}
                      </div>
                      {o.estimatedTotal ? (
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 700, color: TOKENS.brassOnPaper, marginTop: 4 }}>
                          <span>{t.estimatedTotal}</span>
                          <span>{formatVND(o.estimatedTotal)}</span>
                        </div>
                      ) : null}
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

                      <div style={{ marginTop: 10 }}>
                        <div style={{ fontSize: 11, color: TOKENS.jadeSoft }}>{t.trackingCodeLabel}</div>
                        <TrackingCodeEditor value={o.trackingCode} onSave={(code) => updateTrackingCode(o.id, code)} t={t} TOKENS={TOKENS} />
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
                  <h2 style={{ fontFamily: "Lora, Georgia, serif", fontSize: 20, margin: "0 0 8px" }}>{t.orderSent}</h2>
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
                  <h2 style={{ fontFamily: "Lora, Georgia, serif", fontWeight: 500, fontSize: 22, margin: "0 0 4px" }}>{t.shopTitle}</h2>
                  <p style={{ color: TOKENS.jadeSoft, fontSize: 13.5, marginBottom: 14 }}>{t.shopHint}</p>

                  <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, marginBottom: 18 }}>
                    {[
                      { ref: sampleSectionRef, label: t.sampleOption, show: catalog.some((p) => p.line === "sample") },
                      { ref: everydaySectionRef, label: t.everydayOption, show: catalog.some((p) => p.line === "everyday") },
                      { ref: reserveSectionRef, label: t.reserveOption, show: catalog.some((p) => p.line === "reserve") },
                    ].filter((s) => s.show).map((s) => (
                      <button
                        key={s.label}
                        onClick={() => s.ref.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
                        style={{
                          flexShrink: 0, padding: "7px 14px", borderRadius: 20, border: `1px solid ${TOKENS.brassDeep}55`,
                          background: TOKENS.paperDeep, color: TOKENS.jade, fontSize: 12.5, fontWeight: 600, cursor: "pointer",
                        }}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                  {!isAdmin && <ReorderBox supabase={supabase} type="retail" onApply={applyReorder} t={t} TOKENS={TOKENS} />}

                  {/* Featured: Sample Packs as a standalone hero row */}
                  {catalog.some((p) => p.line === "sample") && (
                    <div ref={sampleSectionRef} style={{ marginBottom: 24, scrollMarginTop: 70 }}>
                      <div style={{ fontSize: 11.5, fontWeight: 700, color: TOKENS.brassOnPaper, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>
                        {t.sampleOption}
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
                        {catalog.filter((p) => p.line === "sample").map((p) => {
                          const stockTotal = getStockTotal(p);
                          const soldOut = p.available === false || stockTotal === 0;
                          return (
                            <div
                              key={p.id}
                              className="pcard"
                              onClick={() => setDetailProduct({ product: p, cartType: "retail" })}
                              style={{
                                background: `linear-gradient(160deg, ${TOKENS.jade} 0%, ${TOKENS.jadeSoft} 100%)`,
                                borderRadius: 14, padding: 16, cursor: "pointer", opacity: soldOut ? 0.55 : 1,
                                display: "flex", flexDirection: "column", gap: 6, minHeight: 120, position: "relative", overflow: "hidden",
                              }}
                            >
                              <div style={{ fontSize: 10, fontWeight: 700, color: TOKENS.brassOnDark, textTransform: "uppercase", letterSpacing: 0.5 }}>
                                {t.sampleOption}
                              </div>
                              <div style={{ fontSize: 15, fontWeight: 600, color: TOKENS.paper, overflowWrap: "anywhere" }}>{p.name[lang]}</div>
                              {p.price ? <div style={{ fontSize: 16, fontWeight: 700, color: TOKENS.brassOnDark }}>{formatVND(p.price)}</div> : null}
                              {productBadges(p, true)}
                              {flavorChips(p, true)}
                              {p.notes?.[lang] && (
                                <div style={{ fontSize: 11.5, color: `${TOKENS.paper}bb`, lineHeight: 1.4, flex: 1 }}>{p.notes[lang]}</div>
                              )}
                              <div style={{ fontSize: 11, color: TOKENS.brassOnDark, fontWeight: 600, textDecoration: "underline", marginTop: 4 }}>
                                {soldOut ? t.outOfStock : t.viewDetails}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div style={{ display: "flex", flexDirection: "column", gap: 20, marginBottom: 20 }}>
                    {["everyday", "reserve"].map((lineId) => {
                      const items = [...retailProducts]
                        .filter((p) => p.line === lineId)
                        .sort((a, b) => (a.available === false ? 1 : 0) - (b.available === false ? 1 : 0));
                      if (items.length === 0) return null;
                      return (
                        <div key={lineId} ref={lineId === "everyday" ? everydaySectionRef : reserveSectionRef} style={{ scrollMarginTop: 70 }}>
                          <div style={{ fontSize: 11.5, fontWeight: 700, color: TOKENS.brassOnPaper, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>
                            {lineLabel(lineId)}
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(148px, 1fr))", gap: 10 }}>
                            {items.map((p) => {
                              const hasVariants = p.variants && p.variants.length > 0;
                              const selectedWeight = hasVariants ? (variantSelection[p.id] || p.variants[0].weight) : null;
                              const variant = hasVariants ? (p.variants.find((v) => v.weight === selectedWeight) || p.variants[0]) : null;
                              const cartKey = hasVariants ? `${p.id}__${variant.weight}` : p.id;
                              const price = hasVariants ? variant.price : p.price;
                              const stockTotal = hasVariants ? getStockTotal(variant) : getStockTotal(p);
                              const soldOut = p.available === false || stockTotal === 0;
                              return (
                                <div
                                  key={p.id}
                                  className="pcard"
                                  style={{
                                    display: "flex", flexDirection: "column", position: "relative",
                                    background: TOKENS.paper, boxShadow: TOKENS.shadowSm,
                                    borderRadius: TOKENS.radius, overflow: "hidden", opacity: soldOut ? 0.55 : 1,
                                  }}
                                >
                                  {p.limited && (
                                    <div style={{
                                      position: "absolute", top: 8, right: 8, zIndex: 1,
                                      background: TOKENS.jade, color: TOKENS.brassOnDark, borderRadius: 20,
                                      padding: "3px 8px", display: "flex", alignItems: "center", gap: 4,
                                      fontSize: 10, fontWeight: 700,
                                    }}>
                                      <Sparkles size={11} /> {t.limitedBadge}
                                    </div>
                                  )}
                                  <div
                                    onClick={() => setDetailProduct({ product: p, cartType: "retail" })}
                                    style={{ cursor: "pointer" }}
                                  >
                                    {p.photoUrl ? (
                                      <img src={p.photoUrl} alt={p.name[lang]} loading="lazy" decoding="async" style={{ width: "100%", height: 100, objectFit: "cover", objectPosition: p.photoPosition || "50% 50%", display: "block" }} />
                                    ) : (
                                      <div style={{ width: "100%", height: 72, background: TOKENS.jade, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                        <Leaf size={22} color={TOKENS.brass} strokeWidth={1.4} />
                                      </div>
                                    )}
                                    <div style={{ padding: "10px 10px 0" }}>
                                      <div style={{ fontSize: 13, fontWeight: 600, overflowWrap: "anywhere", lineHeight: 1.3 }}>{p.name[lang]}</div>
                                      {lang === "en" && p.name.vi && (
                                        <div style={{ fontSize: 10.5, color: TOKENS.jadeSoft, marginTop: 1 }}>{p.name.vi}</div>
                                      )}
                                      {price ? <div style={{ fontSize: 12.5, color: TOKENS.brassOnPaper, fontWeight: 700, marginTop: 3 }}>{formatVND(price)}{p.line === "everyday" ? ` / ${t.kg}` : ""}</div> : null}
                                      {productBadges(p)}
                                      {flavorChips(p)}
                                      {typeof stockTotal === "number" && p.available !== false && (
                                        <div style={{ fontSize: 10.5, fontWeight: 700, color: stockTotal <= 5 ? TOKENS.lacquer : TOKENS.jadeSoft, marginTop: 2 }}>
                                          {t.stockLeft(stockTotal)}
                                        </div>
                                      )}
                                      {p.notes?.[lang] && (
                                        <div style={{ fontSize: 10.5, color: TOKENS.jadeSoft, fontStyle: "italic", marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                          {p.notes[lang]}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <div style={{ padding: "8px 10px 10px", marginTop: "auto" }}>
                                    {hasVariants && (
                                      <div style={{ display: "flex", gap: 5, marginBottom: 6 }}>
                                        {p.variants.map((v) => (
                                          <button
                                            key={v.weight}
                                            onClick={(e) => { e.stopPropagation(); setVariantSelection({ ...variantSelection, [p.id]: v.weight }); }}
                                            style={{
                                              flex: 1, minWidth: 0, padding: "5px 4px", borderRadius: 7, cursor: "pointer",
                                              border: `1px solid ${v.weight === selectedWeight ? TOKENS.brass : TOKENS.brassDeep}55`,
                                              background: v.weight === selectedWeight ? TOKENS.jade : TOKENS.paper,
                                              color: v.weight === selectedWeight ? TOKENS.brass : TOKENS.jade,
                                              display: "flex", flexDirection: "column", alignItems: "center", lineHeight: 1.2,
                                            }}
                                          >
                                            <span style={{ fontSize: 11, fontWeight: 700 }}>{v.weight}</span>
                                            {v.price ? <span style={{ fontSize: 9 }}>{formatVND(v.price)}</span> : null}
                                          </button>
                                        ))}
                                      </div>
                                    )}
                                    {soldOut ? (
                                      <div style={{ fontSize: 11, fontWeight: 700, color: TOKENS.lacquer, textAlign: "center", padding: "6px 0" }}>{t.outOfStock}</div>
                                    ) : (
                                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                        <input
                                          type="number"
                                          min="0"
                                          inputMode="numeric"
                                          value={retailCart[cartKey] || ""}
                                          onChange={(e) => setRetailQty(cartKey, e.target.value, stockTotal)}
                                          placeholder="0"
                                          style={{
                                            width: "100%", boxSizing: "border-box", padding: "7px 8px", borderRadius: 6, border: `1px solid ${TOKENS.brassDeep}55`,
                                            background: TOKENS.paper, color: TOKENS.jade, fontSize: 13, textAlign: "center",
                                          }}
                                        />
                                        <span style={{ fontSize: 11.5, color: TOKENS.jadeSoft, flexShrink: 0 }}>{p.line === "everyday" ? t.kg : t.pcs}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {testimonials.some((r) => r.approved !== false) && (
                    <div style={{ marginBottom: 22 }}>
                      <div style={{ fontSize: 11.5, fontWeight: 700, color: TOKENS.brassOnPaper, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>
                        {t.testimonialsHeading}
                      </div>
                      <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 6 }}>
                        {testimonials.filter((r) => r.approved !== false).map((r) => (
                          <div key={r.id} style={{ flex: "0 0 auto", width: 220, background: TOKENS.paperDeep, border: `1px solid ${TOKENS.brassDeep}33`, borderRadius: 12, padding: 14 }}>
                            <div style={{ fontSize: 13, color: TOKENS.jade, fontStyle: "italic", lineHeight: 1.5, marginBottom: 8 }}>&quot;{r.quote}&quot;</div>
                            <div style={{ fontSize: 12.5, fontWeight: 600, color: TOKENS.brassOnPaper }}>— {r.name}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div style={{ marginBottom: 22, background: TOKENS.paperDeep, border: `1px solid ${TOKENS.brassDeep}33`, borderRadius: 12, padding: 14 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>{t.shareExperienceTitle}</div>
                    {customerReviewSent ? (
                      <p style={{ fontSize: 12.5, color: TOKENS.brassOnPaper, margin: 0 }}>{t.reviewSubmittedNote}</p>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        <input
                          value={customerReviewDraft.name}
                          onChange={(e) => setCustomerReviewDraft({ ...customerReviewDraft, name: e.target.value })}
                          placeholder={t.yourReviewNamePh}
                          style={{ padding: "9px 12px", borderRadius: 8, border: `1px solid ${TOKENS.brassDeep}55`, fontSize: 13.5 }}
                        />
                        <textarea
                          value={customerReviewDraft.quote}
                          onChange={(e) => setCustomerReviewDraft({ ...customerReviewDraft, quote: e.target.value })}
                          placeholder={t.yourReviewQuotePh}
                          rows={2}
                          style={{ padding: "9px 12px", borderRadius: 8, border: `1px solid ${TOKENS.brassDeep}55`, fontSize: 13.5, resize: "vertical", fontFamily: "inherit" }}
                        />
                        <button
                          onClick={submitCustomerReview}
                          disabled={!customerReviewDraft.name.trim() || !customerReviewDraft.quote.trim()}
                          style={{
                            background: TOKENS.jade, color: TOKENS.paper, border: "none", borderRadius: 8, padding: "10px",
                            fontSize: 13, fontWeight: 600, cursor: "pointer",
                            opacity: (!customerReviewDraft.name.trim() || !customerReviewDraft.quote.trim()) ? 0.5 : 1,
                          }}
                        >
                          {t.submitReview}
                        </button>
                      </div>
                    )}
                  </div>

                  {retailCartLines.length === 0 ? (
                    <p style={{ color: TOKENS.jadeSoft, fontSize: 13.5, fontStyle: "italic" }}>{t.emptyCart}</p>
                  ) : (
                    <div ref={retailSummaryRef} style={{ background: TOKENS.jade, color: TOKENS.paper, borderRadius: 12, padding: "18px 18px 16px", marginBottom: 20 }}>
                      <div style={{ fontSize: 11.5, letterSpacing: 1, textTransform: "uppercase", color: TOKENS.brassOnDark, marginBottom: 10, fontWeight: 600 }}>
                        {t.summaryTitle}
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 12 }}>
                        {retailCartLines.map((p) => (
                          <div key={p.cartKey} style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5 }}>
                            <span style={{ opacity: 0.9 }}>{p.name[lang]}{p.weight ? ` — ${p.weight}` : ""}{p.price ? ` (${formatVND(p.price)})` : ""}</span>
                            <span>{p.qty} {p.line === "everyday" ? t.kg : t.pcs}{p.price ? ` = ${formatVND(p.price * p.qty)}` : ""}</span>
                          </div>
                        ))}
                      </div>
                      <div style={{ borderTop: `1px solid ${TOKENS.paper}33`, paddingTop: 10, display: "flex", justifyContent: "space-between", fontSize: 14, fontWeight: 600 }}>
                        <span>{t.itemsTotal}</span>
                        <span>{retailTotalItems} {t.pcs}</span>
                      </div>
                      {retailCartLines.some((p) => p.price) && (
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, fontWeight: 700, color: TOKENS.brassOnDark, marginTop: 4 }}>
                          <span>{t.estimatedTotal}</span>
                          <span>{formatVND(retailCartLines.reduce((s, p) => s + (p.price ? p.price * p.qty : 0), 0))}</span>
                        </div>
                      )}
                      {retailCartLines.some((p) => !p.price) && (
                        <p style={{ fontSize: 11, color: `${TOKENS.paper}88`, marginTop: 4 }}>{t.priceNote}</p>
                      )}
                      {appliedPromo && (
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: TOKENS.brassOnDark, marginTop: 4 }}>
                          <span>{t.promoLabel}</span>
                          <span>{appliedPromo.code} (-{appliedPromo.percent}%)</span>
                        </div>
                      )}
                      <p style={{ fontSize: 11.5, color: `${TOKENS.paper}99`, margin: "6px 0 14px" }}>{t.vatNote}</p>

                      {!isAdmin && role !== "wholesale" && (
                        <button
                          type="button"
                          onClick={() => setSection("wholesale")}
                          style={{
                            display: "block", width: "100%", textAlign: "left", background: "none", border: "none",
                            color: TOKENS.brassOnDark, fontSize: 12.5, fontWeight: 600, cursor: "pointer",
                            padding: 0, margin: "0 0 14px", textDecoration: "underline",
                          }}
                        >
                          {t.wholesaleDiscoveryPrompt}
                        </button>
                      )}

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

                      <div style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: 12, color: `${TOKENS.paper}cc`, marginBottom: 6 }}>{t.paymentMethodLabel}</div>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button
                            type="button"
                            onClick={() => setPaymentMethod("qr")}
                            style={{
                              flex: 1, padding: "9px", borderRadius: 8, cursor: "pointer", fontSize: 12.5, fontWeight: 600,
                              border: `1px solid ${paymentMethod === "qr" ? TOKENS.brass : TOKENS.paper + "44"}`,
                              background: paymentMethod === "qr" ? TOKENS.brass : "transparent",
                              color: paymentMethod === "qr" ? TOKENS.jade : TOKENS.paper,
                            }}
                          >
                            {t.payByQR}
                          </button>
                          <button
                            type="button"
                            onClick={() => setPaymentMethod("cash")}
                            style={{
                              flex: 1, padding: "9px", borderRadius: 8, cursor: "pointer",
                              border: `1px solid ${paymentMethod === "cash" ? TOKENS.brass : TOKENS.paper + "44"}`,
                              background: paymentMethod === "cash" ? TOKENS.brass : "transparent",
                              color: paymentMethod === "cash" ? TOKENS.jade : TOKENS.paper,
                            }}
                          >
                            {t.payByCash}
                          </button>
                        </div>
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

                      {orderError && <p style={{ fontSize: 12.5, color: "#E8A99A", marginBottom: 10 }}>{t.orderFailed}</p>}

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
                <div style={{ fontFamily: "Lora, Georgia, serif", fontSize: 15, fontWeight: 600 }}>{t.chatTitle}</div>
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

      {/* ---------- GALLERY LIGHTBOX ---------- */}
      {lightboxImage && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(28,43,36,0.85)", zIndex: 65, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
          onClick={() => setLightboxImage(null)}
        >
          <div style={{ maxWidth: "min(560px, 100%)" }} onClick={(e) => e.stopPropagation()}>
            <img src={lightboxImage.url} alt={lightboxImage.caption?.[lang] || ""} decoding="async" style={{ width: "100%", maxHeight: "75vh", objectFit: "contain", borderRadius: 10 }} />
            {lightboxImage.caption?.[lang] && (
              <p style={{ color: TOKENS.paper, fontSize: 13.5, textAlign: "center", marginTop: 12 }}>{lightboxImage.caption[lang]}</p>
            )}
            <button
              onClick={() => setLightboxImage(null)}
              aria-label={t.close}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", margin: "10px auto 0", background: "none", border: `1px solid ${TOKENS.paper}55`, color: TOKENS.paper, borderRadius: "50%", width: 44, height: 44, cursor: "pointer" }}
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ---------- CART DRAWER (Shopify-style) ---------- */}
      {cartDrawerMounted && (
        <div
          style={{
            position: "fixed", inset: 0, background: "rgba(28,43,36,0.55)", zIndex: 60,
            opacity: cartDrawerVisible ? 1 : 0,
            transition: `opacity ${cartDrawerVisible ? 320 : 220}ms ease`,
          }}
          onClick={() => setCartDrawerOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "fixed", top: 0, right: 0, bottom: 0, width: "min(360px, 90vw)",
              background: TOKENS.paper, boxShadow: "-8px 0 30px rgba(0,0,0,0.25)",
              display: "flex", flexDirection: "column", zIndex: 61,
              transform: cartDrawerVisible ? "translateX(0)" : "translateX(100%)",
              transition: `transform ${cartDrawerVisible ? 320 : 220}ms cubic-bezier(0.32, 0.72, 0, 1)`,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px", borderBottom: `1px solid ${TOKENS.brassDeep}33` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "Lora, Georgia, serif", fontSize: 17, fontWeight: 600 }}>
                <ShoppingCart size={17} color={TOKENS.brassDeep} /> {t.cartTitle}
              </div>
              <button
                onClick={() => setCartDrawerOpen(false)}
                aria-label={t.close}
                style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 44, height: 44, margin: "-12px -12px -12px 0", background: "none", border: "none", cursor: "pointer", color: TOKENS.jadeSoft }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "12px 18px" }}>
              {retailCartLines.length === 0 ? (
                <p style={{ color: TOKENS.jadeSoft, fontSize: 13.5, fontStyle: "italic", marginTop: 20 }}>{t.emptyCart}</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {retailCartLines.map((p) => {
                    const stockTotal = getStockTotal(p);
                    return (
                      <div key={p.cartKey} style={{ display: "flex", gap: 10, paddingBottom: 12, borderBottom: `1px solid ${TOKENS.brassDeep}22` }}>
                        {p.photoUrl ? (
                          <img src={p.photoUrl} alt={p.name[lang]} loading="lazy" decoding="async" style={{ width: 48, height: 48, borderRadius: 8, objectFit: "cover", objectPosition: p.photoPosition || "50% 50%", flexShrink: 0 }} />
                        ) : (
                          <div style={{ width: 48, height: 48, borderRadius: 8, background: TOKENS.jade, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <Leaf size={18} color={TOKENS.brass} />
                          </div>
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13.5, fontWeight: 600, overflowWrap: "anywhere" }}>
                            {p.name[lang]}{p.weight ? ` — ${p.weight}` : ""}
                          </div>
                          {p.price ? <div style={{ fontSize: 12, color: TOKENS.brassOnPaper, fontWeight: 600, marginTop: 2 }}>{formatVND(p.price)}{p.line === "everyday" ? ` / ${t.kg}` : ""}</div> : null}
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
                            <button
                              onClick={() => setRetailQty(p.cartKey, p.qty - 1, stockTotal)}
                              style={{ width: 24, height: 24, borderRadius: 6, border: `1px solid ${TOKENS.brassDeep}55`, background: TOKENS.paperDeep, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                            >
                              <Minus size={12} color={TOKENS.jade} />
                            </button>
                            <span style={{ fontSize: 13, fontWeight: 600, minWidth: 18, textAlign: "center" }}>{p.qty}</span>
                            <span style={{ fontSize: 10.5, color: TOKENS.jadeSoft }}>{p.line === "everyday" ? t.kg : t.pcs}</span>
                            <button
                              onClick={() => setRetailQty(p.cartKey, p.qty + 1, stockTotal)}
                              disabled={typeof stockTotal === "number" && p.qty >= stockTotal}
                              style={{ width: 24, height: 24, borderRadius: 6, border: `1px solid ${TOKENS.brassDeep}55`, background: TOKENS.paperDeep, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", opacity: (typeof stockTotal === "number" && p.qty >= stockTotal) ? 0.4 : 1 }}
                            >
                              <Plus size={12} color={TOKENS.jade} />
                            </button>
                            <button
                              onClick={() => setRetailQty(p.cartKey, 0, stockTotal)}
                              style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: TOKENS.lacquer }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                        {p.price ? (
                          <div style={{ fontSize: 13, fontWeight: 700, color: TOKENS.jade, flexShrink: 0 }}>{formatVND(p.price * p.qty)}</div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {retailCartLines.length > 0 && (
              <div style={{ padding: "16px 18px", borderTop: `1px solid ${TOKENS.brassDeep}33` }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, color: TOKENS.jadeSoft, marginBottom: 4 }}>
                  <span>{t.itemsTotal}</span>
                  <span>{retailTotalItems} {t.pcs}</span>
                </div>
                {retailCartLines.some((p) => p.price) && (
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 16, fontWeight: 700, color: TOKENS.brassOnPaper, marginBottom: 10 }}>
                    <span>{t.estimatedTotal}</span>
                    <span>{formatVND(retailCartLines.reduce((s, p) => s + (p.price ? p.price * p.qty : 0), 0))}</span>
                  </div>
                )}
                <button
                  onClick={() => { setCartDrawerOpen(false); setTimeout(() => retailSummaryRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 200); }}
                  style={{
                    width: "100%", background: TOKENS.jade, color: TOKENS.paper, border: "none", borderRadius: 10,
                    padding: "13px", fontSize: 14.5, fontWeight: 700, cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                  }}
                >
                  {t.proceedToCheckout} <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ---------- TEA DETAIL MODAL ---------- */}
      {detailProduct && (
        <TeaDetailModal
          product={detailProduct.product}
          unit={detailProduct.product.line === "everyday" ? t.kg : t.pcs}
          showYield={detailProduct.cartType === "wholesale"}
          lang={lang}
          t={t}
          TOKENS={TOKENS}
          supabase={supabase}
          reviews={productReviews.filter((r) => r.productId === detailProduct.product.id && r.approved !== false)}
          stats={reviewStats[detailProduct.product.id]}
          onReviewSubmitted={loadProductReviews}
          onConfirm={(qty, weight) => {
            const cartKey = weight ? `${detailProduct.product.id}__${weight}` : detailProduct.product.id;
            if (detailProduct.cartType === "retail") {
              const variant = weight ? detailProduct.product.variants?.find((v) => v.weight === weight) : null;
              const stockTotal = variant ? getStockTotal(variant) : getStockTotal(detailProduct.product);
              setRetailQty(cartKey, qty, stockTotal);
            } else {
              setQty(detailProduct.product.id, qty);
            }
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
              onClick={markOnboarded}
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
              <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", color: TOKENS.brassOnDark, fontWeight: 600, marginBottom: 4 }}>
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
                  <h2 style={{ fontFamily: "Lora, Georgia, serif", fontWeight: 500, fontSize: 22, margin: "0 0 10px" }}>{t.onboardWelcomeTitle}</h2>
                  <p style={{ fontSize: 14, lineHeight: 1.65, color: TOKENS.jadeSoft, margin: 0 }}>{t.onboardWelcomeBody}</p>
                </div>
              )}

              {onboardStep === 1 && (
                <div>
                  <h2 style={{ fontFamily: "Lora, Georgia, serif", fontWeight: 500, fontSize: 20, margin: "0 0 16px" }}>{t.onboardOfferTitle}</h2>
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
                  <h2 style={{ fontFamily: "Lora, Georgia, serif", fontWeight: 500, fontSize: 20, margin: "0 0 16px" }}>{t.onboardInfoTitle}</h2>
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

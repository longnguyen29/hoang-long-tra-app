"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Globe2, Menu, X } from "lucide-react";
import { useLocale } from "@/components/i18n/LocaleProvider";
import styles from "./PublicSiteHeader.module.css";

const GROUPS = [
  {
    id: "about", label: { vi: "Doanh nghiệp", en: "Company" },
    links: [
      { href: "/company", label: { vi: "Hồ sơ doanh nghiệp", en: "Company profile" } },
      { href: "/company#cooperation", label: { vi: "Đề xuất hợp tác", en: "Cooperation proposal" } },
      { href: "/company#documents", label: { vi: "Tài liệu giao thương", en: "Trade documents" } },
      { href: "/story", label: { vi: "Nguồn trà & câu chuyện", en: "Tea origins & stories" } },
      { href: "/company#contact", label: { vi: "Liên hệ hợp tác", en: "Cooperation contact" } },
    ],
  },
  {
    id: "wholesale", label: { vi: "Hợp tác B2B", en: "B2B supply" },
    links: [
      { href: "/catalog", label: { vi: "Danh mục cung ứng", en: "Supply catalogue" } },
      { href: "/wholesale", label: { vi: "Mẫu & đề bài cung ứng", en: "Samples & supply briefs" } },
      { href: "/cho-quan", label: { vi: "Trà cho quán", en: "Tea for cafés" } },
      { href: "/partners/account", label: { vi: "Khách sỉ đăng nhập", en: "Wholesale sign in" } },
    ],
  },
  {
    id: "shop", label: { vi: "Mua trà", en: "Shop tea" },
    links: [
      { href: "/shop", label: { vi: "Mua trà lẻ", en: "Loose-leaf tea" } },
      { href: "/shop#tea-bundles", label: { vi: "Chọn bộ trà", en: "Tea sets" } },
      { href: "/goods", label: { vi: "Sản vật", en: "Regional goods" } },
    ],
  },
];
const TRACKING_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];

function campaignQuery(search) {
  const incoming = new URLSearchParams(search);
  const safe = new URLSearchParams();
  for (const key of TRACKING_KEYS) {
    const values = incoming.getAll(key);
    if (values.length !== 1 || !values[0]) continue;
    const value = values[0].replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 80);
    if (value) safe.set(key, value);
  }
  return safe.toString();
}

export default function PublicSiteHeader({ children }) {
  const { locale, toggleLocale } = useLocale();
  const language = locale === "en" ? "en" : "vi";
  const pathname = usePathname() || "/";
  const id = useId();
  const headerRef = useRef(null);
  const menuButtonRef = useRef(null);
  const summaryRefs = useRef({});
  const [menuOpen, setMenuOpen] = useState(false);
  const [openGroup, setOpenGroup] = useState(null);
  const [tracking, setTracking] = useState("");
  const [currentHash, setCurrentHash] = useState("");
  const closeNavigation = useCallback(() => {
    setMenuOpen(false);
    setOpenGroup(null);
  }, []);

  useEffect(() => {
    const readLocation = () => {
      setTracking(campaignQuery(window.location.search));
      setCurrentHash(window.location.hash);
    };
    readLocation();
    closeNavigation();
    window.addEventListener("popstate", readLocation);
    window.addEventListener("hashchange", readLocation);
    return () => {
      window.removeEventListener("popstate", readLocation);
      window.removeEventListener("hashchange", readLocation);
    };
  }, [pathname, closeNavigation]);

  useEffect(() => {
    const onPointerDown = (event) => {
      if (!headerRef.current?.contains(event.target)) closeNavigation();
    };
    const onKeyDown = (event) => {
      if (event.key !== "Escape" || (!menuOpen && !openGroup)) return;
      event.preventDefault();
      if (headerRef.current?.contains(document.activeElement)) {
        if (menuOpen) menuButtonRef.current?.focus();
        else summaryRefs.current[openGroup]?.focus();
      }
      closeNavigation();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen, openGroup, closeNavigation]);

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 64rem)");
    desktop.addEventListener("change", closeNavigation);
    return () => desktop.removeEventListener("change", closeNavigation);
  }, [closeNavigation]);

  const hrefFor = (href) => {
    const [path, hash] = href.split("#");
    const query = new URLSearchParams(tracking);
    query.set("lang", language);
    return `${path}?${query}${hash ? `#${hash}` : ""}`;
  };
  const pathMatches = (href) => {
    const path = href.split("#")[0];
    return pathname === path || pathname.startsWith(`${path}/`);
  };
  const renderLink = (link) => {
    const [path, hash] = link.href.split("#");
    const bundleSelected = pathname === "/shop" && currentHash === "#tea-bundles";
    const current = pathname === path && (hash ? currentHash === `#${hash}` : !(path === "/shop" && bundleSelected));
    const active = hash ? current : pathMatches(link.href) && !(path === "/shop" && bundleSelected);
    return (
      <Link
        key={link.href}
        href={hrefFor(link.href)}
        className={styles.navLink}
        data-active={active || undefined}
        aria-current={current ? (hash ? "location" : "page") : undefined}
        onClick={(event) => {
          closeNavigation();
          if (path === pathname && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey && event.button === 0) {
            setCurrentHash(hash ? `#${hash}` : "");
          }
        }}
      >
        {link.label[language]}
      </Link>
    );
  };

  return (
    <header ref={headerRef} className={styles.header} data-no-translate>
      <div className={styles.bar}>
        <Link
          href={hrefFor("/")}
          className={styles.brand}
          aria-label={language === "vi" ? "House of Hoàng Long — Trang chủ" : "House of Hoàng Long — Home"}
          aria-current={pathname === "/" ? "page" : undefined}
          onClick={closeNavigation}
          translate="no"
        >
          <span className={styles.seal} aria-hidden="true">皇龍</span>
          <span className={styles.brandFull}>House of Hoàng Long</span>
          <span className={styles.brandShort}>Hoàng Long</span>
        </Link>

        <nav className={styles.desktopNav} aria-label={language === "vi" ? "Điều hướng chính" : "Main navigation"}>
          {GROUPS.map((group) => (
            <details
              key={group.id}
              className={styles.group}
              open={openGroup === group.id}
              data-active={group.links.some((link) => pathMatches(link.href)) || undefined}
              onToggle={(event) => {
                if (event.currentTarget.open) setOpenGroup(group.id);
                else setOpenGroup((current) => current === group.id ? null : current);
              }}
            >
              <summary
                ref={(node) => { summaryRefs.current[group.id] = node; }}
                className={styles.groupSummary}
                aria-expanded={openGroup === group.id}
                aria-controls={`${id}-${group.id}`}
              >
                {group.label[language]}<ChevronDown size={14} aria-hidden="true" />
              </summary>
              <div id={`${id}-${group.id}`} className={styles.dropdown}>
                {group.links.map(renderLink)}
              </div>
            </details>
          ))}
        </nav>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.languageButton}
            onClick={() => { closeNavigation(); toggleLocale(); }}
            aria-label={language === "vi" ? "Chuyển sang tiếng Anh" : "Switch to Vietnamese"}
          >
            <Globe2 size={16} className={styles.languageIcon} aria-hidden="true" />
            <span>{language.toUpperCase()}</span>
          </button>
          {children && <div className={styles.cartSlot} onClick={closeNavigation}>{children}</div>}
          <button
            ref={menuButtonRef}
            type="button"
            className={styles.menuButton}
            aria-expanded={menuOpen}
            aria-controls={`${id}-mobile`}
            aria-label={language === "vi" ? (menuOpen ? "Đóng menu" : "Mở menu") : (menuOpen ? "Close menu" : "Open menu")}
            onClick={() => { setOpenGroup(null); setMenuOpen((current) => !current); }}
          >
            {menuOpen ? <X size={19} aria-hidden="true" /> : <Menu size={19} aria-hidden="true" />}
            <span className={styles.menuLabel}>Menu</span>
          </button>
        </div>
      </div>

      <nav
        id={`${id}-mobile`}
        className={styles.mobileNav}
        aria-label={language === "vi" ? "Điều hướng chính" : "Main navigation"}
        hidden={!menuOpen}
      >
        {GROUPS.map((group) => (
          <section key={group.id} className={styles.mobileGroup} aria-labelledby={`${id}-mobile-${group.id}`}>
            <h2 id={`${id}-mobile-${group.id}`} className={styles.mobileHeading} data-active={group.links.some((link) => pathMatches(link.href)) || undefined}>
              {group.label[language]}
            </h2>
            {group.links.map(renderLink)}
          </section>
        ))}
      </nav>
    </header>
  );
}

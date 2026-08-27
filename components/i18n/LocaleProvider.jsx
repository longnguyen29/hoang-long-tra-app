"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Languages } from "lucide-react";
import { STR } from "@/lib/strings";
import { CATEGORIES, LIBRARY_CATEGORIES, NAV, PRICE_TIERS, STATUS_STEPS } from "@/lib/constants";
import { UI_PAIRS } from "@/lib/ui-translations";

const LocaleContext = createContext({ locale: "vi", setLocale: () => {}, toggleLocale: () => {} });

const collectPairs = (value, pairs = []) => {
  if (!value || typeof value !== "object") return pairs;
  if (typeof value.en === "string" && typeof value.vi === "string") pairs.push([value.en, value.vi]);
  Object.values(value).forEach((item) => collectPairs(item, pairs));
  return pairs;
};

const pairs = [
  ...UI_PAIRS,
  ...Object.keys(STR.en).flatMap((key) =>
    typeof STR.en[key] === "string" && typeof STR.vi[key] === "string" ? [[STR.en[key], STR.vi[key]]] : [],
  ),
  ...collectPairs({ CATEGORIES, LIBRARY_CATEGORIES, NAV, PRICE_TIERS, STATUS_STEPS }),
];
const toEnglish = new Map(pairs.map(([en, vi]) => [vi, en]));
const toVietnamese = new Map(pairs.map(([en, vi]) => [en, vi]));

const translateText = (text, locale) => {
  if (typeof text !== "string" || !text.trim()) return text;
  const leading = text.match(/^\s*/)?.[0] || "";
  const trailing = text.match(/\s*$/)?.[0] || "";
  const core = text.slice(leading.length, text.length - trailing.length || undefined);
  const translated = (locale === "en" ? toEnglish : toVietnamese).get(core);
  return translated ? `${leading}${translated}${trailing}` : text;
};

const shouldSkip = (node) => node.parentElement?.closest("[data-no-translate],script,style,textarea");

const translateDom = (root, locale) => {
  if (!root || typeof document === "undefined") return;
  if (root.nodeType === Node.TEXT_NODE) {
    if (!shouldSkip(root)) {
      const next = translateText(root.nodeValue, locale);
      if (next !== root.nodeValue) root.nodeValue = next;
    }
    return;
  }
  if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) return;
  if (root.nodeType === Node.ELEMENT_NODE) {
    if (root.closest("[data-no-translate]")) return;
    ["aria-label", "placeholder", "title", "alt"].forEach((name) => {
      const value = root.getAttribute(name);
      if (!value) return;
      const next = translateText(value, locale);
      if (next !== value) root.setAttribute(name, next);
    });
  }
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  let node = walker.currentNode;
  while (node) {
    if (node !== root) {
      if (node.nodeType === Node.TEXT_NODE && !shouldSkip(node)) {
        const next = translateText(node.nodeValue, locale);
        if (next !== node.nodeValue) node.nodeValue = next;
      } else if (node.nodeType === Node.ELEMENT_NODE && !node.closest("[data-no-translate]")) {
        ["aria-label", "placeholder", "title", "alt"].forEach((name) => {
          const value = node.getAttribute(name);
          if (!value) return;
          const next = translateText(value, locale);
          if (next !== value) node.setAttribute(name, next);
        });
      }
    }
    node = walker.nextNode();
  }
};

export const useLocale = () => useContext(LocaleContext);

export default function LocaleProvider({ children }) {
  const [locale, setLocale] = useState("vi");

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("lang");
    let saved = null;
    try {
      saved = window.localStorage?.getItem("hl-locale");
    } catch {
      saved = null;
    }
    if (requested === "en" || requested === "vi") setLocale(requested);
    else if (saved === "en" || saved === "vi") setLocale(saved);
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = translateText(document.title, locale);
    try {
      window.localStorage?.setItem("hl-locale", locale);
    } catch {
      // Privacy-restricted browsers can still use the switch for the current page.
    }
    translateDom(document.documentElement, locale);
    const observer = new MutationObserver((records) => {
      records.forEach((record) => {
        if (record.type === "characterData") translateDom(record.target, locale);
        record.addedNodes.forEach((node) => translateDom(node, locale));
      });
    });
    observer.observe(document.documentElement, { subtree: true, childList: true, characterData: true });
    return () => observer.disconnect();
  }, [locale]);

  const value = useMemo(
    () => ({ locale, setLocale, toggleLocale: () => setLocale((current) => (current === "vi" ? "en" : "vi")) }),
    [locale],
  );

  return (
    <LocaleContext.Provider value={value}>
      {children}
      <button
        type="button"
        className="hl-locale-switch"
        onClick={value.toggleLocale}
        aria-label={locale === "vi" ? "Switch to English" : "Chuyển sang tiếng Việt"}
        data-no-translate
      >
        <Languages aria-hidden="true" />
        <span>{locale === "vi" ? "EN" : "VI"}</span>
      </button>
    </LocaleContext.Provider>
  );
}

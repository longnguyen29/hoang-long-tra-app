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
const toEnglish = new Map();
const toVietnamese = new Map();
pairs.forEach(([en, vi]) => {
  if (!toEnglish.has(vi)) toEnglish.set(vi, en);
  if (!toVietnamese.has(en)) toVietnamese.set(en, vi);
});

const dynamicPatterns = {
  en: [
    [/^(\d+)\/(\d+) hoàn tất$/, "$1/$2 complete"],
    [/^(\d+) mục$/, "$1 items"],
    [/^(\d+) chờ duyệt$/, "$1 awaiting review"],
    [/^(\d+) chưa đọc$/, "$1 unread"],
    [/^(\d+) hồ sơ$/, "$1 profiles"],
    [/^(\d+) đơn$/, "$1 orders"],
    [/^(\d+) cần liên hệ$/, "$1 to contact"],
    [/^(\d+) đang chờ$/, "$1 waiting"],
    [/^(\d+) chờ xác nhận$/, "$1 awaiting confirmation"],
    [/^(\d+) món$/, "$1 items"],
    [/^Phiên bản (\d+)$/, "Version $1"],
    [/^Ưu tiên (\d+)$/, "Priority $1"],
    [/^Sửa ưu tiên (\d+)$/, "Edit priority $1"],
    [/^(\d+) phút trước$/, "$1 minutes ago"],
    [/^(\d+) giờ trước$/, "$1 hours ago"],
    [/^Đã rời bàn (.+)\.$/, "You left the desk $1."],
    [/^(\d+) khoản ngân sách đang chờ duyệt$/, "$1 budget allocations are awaiting review"],
    [/^(\d+) khoản phân bổ đã dùng từ 80%$/, "$1 allocations have used at least 80%"],
    [/^(\d+) công nợ đã quá hạn$/, "$1 receivables are overdue"],
    [/^(\d+) đơn đang bị chặn$/, "$1 orders are blocked"],
    [/^(\d+) cơ hội đã đến hạn theo đuổi$/, "$1 opportunities are due for follow-up"],
    [/^(\d+) báo giá sắp hết hạn$/, "$1 quotations are expiring soon"],
    [/^(\d+) bảng giá cần rà soát$/, "$1 price lists need review"],
    [/^(\d+) đơn mới chưa đọc$/, "$1 new orders are unread"],
    [/^(\d+) cuộc trò chuyện chưa đọc$/, "$1 conversations are unread"],
    [/^(\d+) yêu cầu mẫu đang chờ$/, "$1 sample requests are waiting"],
    [/^(\d+) đối tác đã đến nhịp đặt lại$/, "$1 partners are due to reorder"],
    [/^(\d+) mặt hàng dưới nhu cầu một tháng$/, "$1 items are below one month of demand"],
    [/^Rà soát lại (.+)$/, "Review on $1"],
  ],
  vi: [
    [/^(\d+)\/(\d+) complete$/, "$1/$2 hoàn tất"],
    [/^(\d+) items$/, "$1 mục"],
    [/^(\d+) awaiting review$/, "$1 chờ duyệt"],
    [/^(\d+) unread$/, "$1 chưa đọc"],
    [/^(\d+) profiles$/, "$1 hồ sơ"],
    [/^(\d+) orders$/, "$1 đơn"],
    [/^(\d+) to contact$/, "$1 cần liên hệ"],
    [/^(\d+) waiting$/, "$1 đang chờ"],
    [/^(\d+) awaiting confirmation$/, "$1 chờ xác nhận"],
    [/^Version (\d+)$/, "Phiên bản $1"],
    [/^Priority (\d+)$/, "Ưu tiên $1"],
    [/^Edit priority (\d+)$/, "Sửa ưu tiên $1"],
    [/^(\d+) minutes ago$/, "$1 phút trước"],
    [/^(\d+) hours ago$/, "$1 giờ trước"],
    [/^You left the desk (.+)\.$/, "Đã rời bàn $1."],
    [/^(\d+) budget allocations are awaiting review$/, "$1 khoản ngân sách đang chờ duyệt"],
    [/^(\d+) allocations have used at least 80%$/, "$1 khoản phân bổ đã dùng từ 80%"],
    [/^(\d+) receivables are overdue$/, "$1 công nợ đã quá hạn"],
    [/^(\d+) orders are blocked$/, "$1 đơn đang bị chặn"],
    [/^(\d+) opportunities are due for follow-up$/, "$1 cơ hội đã đến hạn theo đuổi"],
    [/^(\d+) quotations are expiring soon$/, "$1 báo giá sắp hết hạn"],
    [/^(\d+) price lists need review$/, "$1 bảng giá cần rà soát"],
    [/^(\d+) new orders are unread$/, "$1 đơn mới chưa đọc"],
    [/^(\d+) conversations are unread$/, "$1 cuộc trò chuyện chưa đọc"],
    [/^(\d+) sample requests are waiting$/, "$1 yêu cầu mẫu đang chờ"],
    [/^(\d+) partners are due to reorder$/, "$1 đối tác đã đến nhịp đặt lại"],
    [/^(\d+) items are below one month of demand$/, "$1 mặt hàng dưới nhu cầu một tháng"],
    [/^Review on (.+)$/, "Rà soát lại $1"],
  ],
};

const translateText = (text, locale) => {
  if (typeof text !== "string" || !text.trim()) return text;
  const leading = text.match(/^\s*/)?.[0] || "";
  const trailing = text.match(/\s*$/)?.[0] || "";
  const core = text.slice(leading.length, text.length - trailing.length || undefined);
  const translated = (locale === "en" ? toEnglish : toVietnamese).get(core)
    || dynamicPatterns[locale].reduce((result, [pattern, replacement]) => result || (pattern.test(core) ? core.replace(pattern, replacement) : ""), "");
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

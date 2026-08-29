"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { Languages } from "lucide-react";
import { STR } from "@/lib/strings";
import { CATEGORIES, LIBRARY_CATEGORIES, NAV, PRICE_TIERS, STATUS_STEPS } from "@/lib/constants";
import { UI_PAIRS } from "@/lib/ui-translations";
import { resolveActionTooltip } from "@/lib/action-tooltips";
import ActionTooltipLayer from "./ActionTooltipLayer";

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
    [/^Tạm dừng · (\d+)$/, "Paused · $1"],
    [/^(\d+) việc đến hạn hôm nay$/, "$1 items due today"],
    [/^(\d+) mối quan hệ đang mở$/, "$1 relationships open"],
    [/^(\d+) đã đồng ý$/, "$1 accepted"],
    [/^(\d+) đang ở đơn đầu$/, "$1 at first order"],
    [/^(.+) · Chưa cấp mã · nhịp đặt lại (\d+) ngày$/, "$1 · Code not assigned · $2-day reorder cadence"],
    [/^(\d+) đơn · VAT ước tính (.+)$/, "$1 orders · estimated VAT $2"],
    [/^(.+) chưa phân bổ$/, "$1 not yet allocated"],
    [/^(.+) còn khả dụng$/, "$1 still available"],
    [/^(.+) chưa thanh toán$/, "$1 not yet paid"],
    [/^Đã dùng (\d+)%$/, "$1% used"],
    [/^(\d+) đơn đã gắn lô và giá vốn$/, "$1 orders linked to batches and cost of goods"],
    [/^(.+) · (\d+) biến thể$/, "$1 · $2 variants"],
    [/^(.+) quá hạn$/, "$1 overdue"],
    [/^(.+) kg\/tháng$/, "$1 kg/month"],
    [/^Mở (\d+) cơ hội đã đến hạn theo đuổi$/, "Open $1 opportunities due for follow-up"],
    [/^Cập nhật (.+)$/, "Updated $1"],
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
    [/^Paused · (\d+)$/, "Tạm dừng · $1"],
    [/^(\d+) items due today$/, "$1 việc đến hạn hôm nay"],
    [/^(\d+) relationships open$/, "$1 mối quan hệ đang mở"],
    [/^(\d+) accepted$/, "$1 đã đồng ý"],
    [/^(\d+) at first order$/, "$1 đang ở đơn đầu"],
    [/^(.+) · Code not assigned · (\d+)-day reorder cadence$/, "$1 · Chưa cấp mã · nhịp đặt lại $2 ngày"],
    [/^(\d+) orders · estimated VAT (.+)$/, "$1 đơn · VAT ước tính $2"],
    [/^(.+) not yet allocated$/, "$1 chưa phân bổ"],
    [/^(.+) still available$/, "$1 còn khả dụng"],
    [/^(.+) not yet paid$/, "$1 chưa thanh toán"],
    [/^(\d+)% used$/, "Đã dùng $1%"],
    [/^(\d+) orders linked to batches and cost of goods$/, "$1 đơn đã gắn lô và giá vốn"],
    [/^(.+) · (\d+) variants$/, "$1 · $2 biến thể"],
    [/^(.+) overdue$/, "$1 quá hạn"],
    [/^(.+) kg\/month$/, "$1 kg/tháng"],
    [/^Open (\d+) opportunities due for follow-up$/, "Mở $1 cơ hội đã đến hạn theo đuổi"],
    [/^Updated (.+)$/, "Cập nhật $1"],
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

const enhanceActionHint = (element, locale) => {
  if (!(element instanceof Element)) return;
  if (!window.location.pathname.startsWith("/admin") && !window.location.pathname.startsWith("/partners")) return;
  const isFileLabel = element.matches("label") && element.querySelector('input[type="file"]');
  if (!element.matches('button,a[href],[role="button"]') && !isFileLabel) return;
  const label = element.getAttribute("aria-label") || element.getAttribute("title") || element.textContent || "";
  const role = element.getAttribute("role") || (element.matches("button") && element.closest("nav") ? "view" : "");
  const region = element.closest("section,aside,article,nav,form");
  const regionLabel = region?.querySelector("h1,h2,h3,[role='heading']")?.textContent || "";
  const tooltip = resolveActionTooltip({
    label,
    href: element.getAttribute("href") || "",
    role,
    pathname: window.location.pathname,
    contextId: element.closest("[id]")?.id || "",
    inDialog: Boolean(element.closest('[role="dialog"],form')),
    regionLabel,
  }, locale);
  if (!tooltip) {
    element.removeAttribute("data-action-tooltip");
    element.removeAttribute("aria-description");
    return;
  }
  element.setAttribute("data-action-tooltip", tooltip);
  element.setAttribute("aria-description", tooltip);
};

const translateDom = (root, locale) => {
  if (!root || typeof document === "undefined") return;
  if (root.nodeType === Node.TEXT_NODE) {
    if (!shouldSkip(root)) {
      const next = translateText(root.nodeValue, locale);
      if (next !== root.nodeValue) root.nodeValue = next;
      enhanceActionHint(root.parentElement?.closest('button,a[href],[role="button"],label'), locale);
    }
    return;
  }
  if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) return;
  if (root.nodeType === Node.ELEMENT_NODE) {
    enhanceActionHint(root, locale);
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
        enhanceActionHint(node, locale);
      }
    }
    node = walker.nextNode();
  }
};

export const useLocale = () => useContext(LocaleContext);

export default function LocaleProvider({ children }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin");
  const isWorkBoard = pathname?.startsWith("/admin/work");
  const defaultLocale = isWorkBoard ? "vi" : isAdmin ? "en" : "vi";
  const storageKey = isWorkBoard ? "hl-work-locale" : isAdmin ? "hl-admin-locale" : "hl-locale";
  const [locale, setLocale] = useState(defaultLocale);

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("lang");
    let saved = null;
    try {
      saved = window.localStorage?.getItem(storageKey);
    } catch {
      saved = null;
    }
    if (requested === "en" || requested === "vi") setLocale(requested);
    else if (saved === "en" || saved === "vi") setLocale(saved);
    else setLocale(defaultLocale);
  }, [defaultLocale, storageKey]);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = translateText(document.title, locale);
    try {
      window.localStorage?.setItem(storageKey, locale);
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
  }, [locale, storageKey]);

  const value = useMemo(
    () => ({ locale, setLocale, toggleLocale: () => setLocale((current) => (current === "vi" ? "en" : "vi")) }),
    [locale],
  );

  return (
    <LocaleContext.Provider value={value}>
      {children}
      <ActionTooltipLayer />
      {!isWorkBoard && <button
        type="button"
        className={`hl-locale-switch${isAdmin ? " hl-locale-switch--admin" : ""}`}
        onClick={value.toggleLocale}
        aria-label={locale === "vi" ? "Switch to English" : "Chuyển sang tiếng Việt"}
        aria-description={locale === "vi" ? "Đổi toàn bộ giao diện sang tiếng Anh." : "Switch the full interface to Vietnamese."}
        data-action-tooltip={locale === "vi" ? "Đổi toàn bộ giao diện sang tiếng Anh." : "Switch the full interface to Vietnamese."}
        data-no-translate
      >
        <Languages aria-hidden="true" />
        <span>{locale === "vi" ? "English" : "Tiếng Việt"}</span>
      </button>}
    </LocaleContext.Provider>
  );
}

import { eventLink } from "./event-contact.js";
import { catalogText, isTradeTea } from "./trade-catalog.js";

const TEA_ID = /^[a-zA-Z0-9_-]{1,80}$/;
const MAX_SELECTION = 3;
const MAX_NOTE_LENGTH = 700;
const MAX_NAME_LENGTH = 120;

function safeTeaIds(values, limit = MAX_SELECTION) {
  const ids = [];
  const seen = new Set();
  for (const value of values) {
    if (typeof value !== "string" || !TEA_ID.test(value) || seen.has(value)) continue;
    seen.add(value);
    ids.push(value);
    if (ids.length === limit) break;
  }
  return ids;
}

function requestedIds(searchOrIds) {
  return Array.isArray(searchOrIds)
    ? searchOrIds
    : new URLSearchParams(typeof searchOrIds === "string" ? searchOrIds : "").getAll("tea");
}

// Public queries carry identities only; names and visitor details never travel
// through catalogue links. Products are resolved separately against the catalogue.
export function eventTeaIds(search = "") {
  return safeTeaIds(requestedIds(typeof search === "string" ? search : ""));
}

export function selectedEventTeas(products, searchOrIds = "") {
  const catalogue = new Map();
  for (const product of Array.isArray(products) ? products : []) {
    if (product && isTradeTea(product) && typeof product.id === "string" && TEA_ID.test(product.id) && !catalogue.has(product.id)) {
      catalogue.set(product.id, product);
    }
  }
  const selected = [];
  // Missing or ineligible IDs do not use up one of the three selection slots.
  for (const id of safeTeaIds(requestedIds(searchOrIds), Infinity)) {
    const product = catalogue.get(id);
    if (!product) continue;
    selected.push(product);
    if (selected.length === MAX_SELECTION) break;
  }
  return selected;
}

function selectionHref(path, products, ids, search, intent) {
  const base = eventLink(path, search);
  const query = new URLSearchParams(base.slice(base.indexOf("?") + 1));
  for (const product of selectedEventTeas(products, ids)) query.append("tea", product.id);
  if (intent !== undefined) query.set("intent", intent === "quote" ? "quote" : "sample");
  return `${path}?${query}${intent === undefined ? "" : "#message"}`;
}

export function eventCatalogueHref(products, ids, search = "") {
  return selectionHref("/meet/catalog", products, ids, search);
}

export function eventEnquiryHref(products, ids, intent = "sample", search = "") {
  return selectionHref("/meet", products, ids, search, intent === "quote" ? "quote" : "sample");
}

function selectionName(value) {
  if (typeof value !== "string") return "";
  return value.normalize("NFC")
    .replace(/[\p{Cc}\p{Cf}\u2028\u2029]/gu, " ")
    .replace(/\s+/gu, " ")
    .trim()
    .slice(0, MAX_NAME_LENGTH)
    .replace(/[\ud800-\udbff]$/, "")
    .trim();
}

// The selection prefix has its own bounds. The visitor's note remains intact;
// callers must use tooLong to block submission instead of truncating.
export function eventSelectionNote(products, userNote = "", locale = "vi") {
  const catalogue = Array.isArray(products) ? products : [];
  const selected = selectedEventTeas(catalogue, catalogue.map((product) => product?.id));
  const language = locale === "en" ? "en" : "vi";
  const labels = selected.map((product) => `${selectionName(catalogText(product.name, language)) || product.id} (${product.id})`);
  const prefix = labels.length ? `${language === "en" ? "Selected teas" : "Trà đã chọn"}: ${labels.join("; ")}` : "";
  const text = typeof userNote === "string" ? userNote : "";
  const maxNoteLength = MAX_NOTE_LENGTH - (prefix ? prefix.length + 1 : 0);
  return {
    note: prefix ? `${prefix}${text ? `\n${text}` : ""}` : text,
    prefix,
    maxNoteLength,
    tooLong: text.length > maxNoteLength,
  };
}

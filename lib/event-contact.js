export const EVENT_CONTACT = Object.freeze({
  name: "Nhà làm Trà Hoàng Long",
  phone: "+84903333841",
  phoneLabel: "0903 333 841",
  zaloUrl: "https://zalo.me/0903333841",
  website: "https://www.hoanglongtra.com",
  address: "36B QL2A, Sóc Sơn, Hà Nội, Việt Nam",
});

const EVENT_UTM = Object.freeze({
  utm_source: "teashow",
  utm_medium: "qr",
  utm_campaign: "event_contact_v1",
});
const SOURCE_VALUES = new Set(["teashow", "event", "website", "zalo"]);
const MEDIUM_VALUES = new Set(["qr", "referral", "owned"]);
const EVENT_PATHS = new Set(["/catalog", "/sample", "/wholesale"]);

export const EVENT_QR_URL = `${EVENT_CONTACT.website}/meet?${new URLSearchParams(EVENT_UTM)}`;

function approvedUtm(params, key, values) {
  const inputs = params.getAll(key);
  const value = inputs.length === 1 ? inputs[0].trim().toLowerCase() : "";
  return values.has(value) ? value : EVENT_UTM[key];
}

// Only known event attribution may travel to the next public page. Form data,
// arbitrary campaign labels, fragments and other incoming queries stay behind.
export function eventLink(path, search = "") {
  const params = new URLSearchParams(typeof search === "string" ? search : "");
  const attribution = new URLSearchParams({
    utm_source: approvedUtm(params, "utm_source", SOURCE_VALUES),
    utm_medium: approvedUtm(params, "utm_medium", MEDIUM_VALUES),
    utm_campaign: EVENT_UTM.utm_campaign,
  });
  return `${EVENT_PATHS.has(path) ? path : "/catalog"}?${attribution}`;
}

function messageField(value, limit) {
  if (typeof value !== "string") return "";
  return value.normalize("NFC")
    .replace(/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g, " ")
    .replace(/\s+/gu, " ")
    .trim()
    .slice(0, limit)
    .replace(/[\ud800-\udbff]$/, "")
    .trim();
}

const MESSAGE_COPY = {
  vi: {
    hello: "Xin chào Nhà Hoàng Long, tôi muốn trao đổi về trà.",
    name: "Tên",
    business: "Đơn vị / quán",
    contact: "Liên hệ",
    intent: "Nhu cầu",
    note: "Ghi chú",
    intents: { sample: "Nhận mẫu trà", quote: "Nhận báo giá", cooperation: "Trao đổi hợp tác" },
  },
  en: {
    hello: "Hello Hoàng Long, I would like to discuss tea.",
    name: "Name",
    business: "Business / café",
    contact: "Contact",
    intent: "Interest",
    note: "Note",
    intents: { sample: "Tea samples", quote: "A quotation", cooperation: "Cooperation" },
  },
};

// This returns plain text for the visitor to review and copy; it never builds
// a URL containing their details or assumes Zalo supports a prefilled message.
export function composeEventMessage(form = {}, locale = "vi") {
  const fields = form && typeof form === "object" ? form : {};
  const copy = MESSAGE_COPY[locale === "en" ? "en" : "vi"];
  const lines = [copy.hello];
  for (const [key, limit] of [["name", 80], ["business", 120], ["contact", 120]]) {
    const value = messageField(fields[key], limit);
    if (value) lines.push(`${copy[key]}: ${value}`);
  }
  const intent = Object.hasOwn(copy.intents, fields.intent) ? fields.intent : "sample";
  lines.push(`${copy.intent}: ${copy.intents[intent]}`);
  const note = messageField(fields.note, 700);
  if (note) lines.push(`${copy.note}: ${note}`);
  return lines.join("\n").slice(0, 1600);
}

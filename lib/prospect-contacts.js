// Extract only explicitly published contact details. Never guess email addresses.
export function decodeContactText(value) {
  return String(value || '').replace(/&#(x[0-9a-f]+|\d+);/gi, (_, n) => {
    const code = n[0].toLowerCase() === 'x' ? parseInt(n.slice(1), 16) : Number(n);
    return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : '';
  }).replace(/&amp;/gi, '&').replace(/&quot;/gi, '"').replace(/&apos;|&#39;/gi, "'").replace(/&nbsp;/gi, ' ');
}
export function normalizePhone(raw) {
  let digits = String(raw || '').replace(/\D/g, '');
  if (digits.startsWith('0084')) digits = digits.slice(2);
  if (digits.startsWith('84')) digits = `0${digits.slice(2)}`;
  if (!/^(0[35789]\d{8}|02\d{9}|1[89]00\d{4,6})$/.test(digits)) return '';
  return digits.startsWith('0') ? `+84${digits.slice(1)}` : digits;
}
export function contactKey(kind, value) {
  if (kind === 'phone') return normalizePhone(value);
  if (kind === 'email') return String(value).trim().toLowerCase();
  try {
    const u = new URL(value); u.hash = '';
    for (const key of [...u.searchParams.keys()]) if (/^(utm_|fbclid$|gclid$)/i.test(key)) u.searchParams.delete(key);
    u.searchParams.sort();
    return `${u.hostname.toLowerCase().replace(/^www\./, '')}${u.pathname.replace(/\/+$/, '')}${u.search}`;
  } catch { return ''; }
}
export function extractContacts(html, sourceUrl, observedAt = new Date().toISOString()) {
  const source = new URL(sourceUrl);
  const clean = String(html).slice(0, 1500000).replace(/<!--[^]*?-->/g, '').replace(/<(script|style|noscript)\b[^>]*>[^]*?<\/\1\s*>/gi, '');
  const text = decodeContactText(clean.replace(/<[^>]+>/g, ' '));
  const contacts = [], seen = new Set(), contactPages = new Set();
  function add(kind, value, evidence) {
    const normalized = contactKey(kind, value), key = `${kind}:${normalized}`;
    if (!normalized || seen.has(key)) return;
    seen.add(key);
    contacts.push({ kind, value: kind === 'phone' ? normalized : value, normalized, source_url: source.href, observed_at: observedAt, evidence: evidence.slice(0, 180), verification: 'public_source', role: 'unknown', consent: 'unknown' });
  }
  for (const match of clean.matchAll(/<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([^]*?)<\/a\s*>/gi)) {
    const href = decodeContactText(match[1]), label = decodeContactText(match[2].replace(/<[^>]+>/g, ' ')).trim();
    if (/^mailto:/i.test(href)) {
      let emails; try { emails = decodeURIComponent(href.slice(7).split('?')[0]); } catch { continue; }
      for (const email of emails.split(/[,;]/)) if (/^[\w.!#$%&'*+/=?^`{|}~-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(email.trim())) add('email', email.trim().toLowerCase(), label || 'Địa chỉ email được liên kết trên trang');
      continue;
    }
    if (/^tel:/i.test(href)) { add('phone', href.slice(4), label || 'Số điện thoại được liên kết trên trang'); continue; }
    let url; try { url = new URL(href, source); } catch { continue; }
    if (!/^https?:$/.test(url.protocol) || url.username || url.password) continue;
    const host = url.hostname.toLowerCase().replace(/^www\./, '');
    if (/^(facebook\.com|m\.facebook\.com|fb\.com|m\.me)$/.test(host) && !/\/(sharer|share|dialog|plugins)(\/|\.|$)/.test(url.pathname) && url.pathname !== '/') add('facebook', url.href, label || 'Liên kết Facebook trên website');
    if (host === 'zalo.me' && url.pathname !== '/') add('zalo', url.href, label || 'Liên kết Zalo trên website');
    if ((host === 'wa.me' || host === 'api.whatsapp.com') && url.pathname !== '/') add('whatsapp', url.href, label || 'Liên kết WhatsApp trên website');
    if (url.origin === source.origin && /contact|lien[-_]?he|liên hệ|liên lạc/i.test(`${url.pathname} ${label}`)) { url.hash = ''; contactPages.add(url.href); }
  }
  for (const match of text.matchAll(/[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9.-]+\.[a-z]{2,}/gi)) {
    if (!/\.(png|jpe?g|webp|svg|gif)$/i.test(match[0])) add('email', match[0].toLowerCase(), text.slice(Math.max(0, match.index - 35), match.index + match[0].length + 35).trim());
  }
  // Unlinked numbers require a contact label; bare prices/order IDs are not phone leads.
  for (const match of text.matchAll(/(?:hotline|điện thoại|đt|phone|tel|liên hệ)\s*[:：.]?\s*((?:\+84|0084|0|1800|1900)[\d ().-]{7,22})/gi)) add('phone', match[1], match[0]);
  return { contacts: contacts.slice(0, 30), contact_pages: [...contactPages].slice(0, 2) };
}
export function dedupeContacts(records) {
  const grouped = new Map();
  for (const record of records) {
    const normalized = contactKey(record.kind, record.value);
    if (!normalized) continue;
    const key = `${record.kind}:${normalized}`;
    if (!grouped.has(key)) grouped.set(key, { ...record, normalized, sources: [], prospect_ids: [] });
    const item = grouped.get(key);
    if (record.source_url && !item.sources.includes(record.source_url)) item.sources.push(record.source_url);
    if (record.prospect_id && !item.prospect_ids.includes(record.prospect_id)) item.prospect_ids.push(record.prospect_id);
  }
  return [...grouped.values()];
}

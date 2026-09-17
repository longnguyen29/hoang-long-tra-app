import { sourceUrl } from './prospect-discovery.js';
import { normalizePhone, contactKey } from './prospect-contacts.js';

export function publicContact(input) {
  const kind = input?.kind;
  const value = String(input?.value || '').trim();
  const source_url = sourceUrl(input?.source_url);
  if (!source_url || /[\r\n\u0000]/.test(value) || !value || value.length > 2000) throw new Error('Nhập liên hệ và đường dẫn nguồn công khai hợp lệ.');
  let normalized;
  if (kind === 'email' && /^[^\s@?&#]+@[^\s@]+\.[a-z]{2,}$/i.test(value)) normalized = value.toLowerCase();
  if (kind === 'phone') normalized = normalizePhone(value) || (/^\+[1-9]\d{7,14}$/.test(value) ? value : '');
  if (['facebook','zalo','whatsapp'].includes(kind)) {
    const safe = sourceUrl(value);
    if (safe) {
      const url = new URL(safe), host = url.hostname.replace(/^www\./,'');
      const hosts = { facebook:['facebook.com','m.facebook.com','fb.com','m.me'], zalo:['zalo.me'], whatsapp:['wa.me','api.whatsapp.com'] };
      if (hosts[kind].includes(host) && url.pathname !== '/' && !/\/(share|sharer|dialog|plugins)(\/|\.|$)/.test(url.pathname)) normalized = contactKey(kind,safe);
    }
  }
  if (!normalized) throw new Error('Liên hệ chưa đúng định dạng. Số quốc tế dùng + và mã quốc gia.');
  return { kind, value:kind==='phone'?normalized:value, normalized, source_url, evidence:String(input?.evidence || '').trim().slice(0,180) };
}

// Links only open the selected channel. Never add a message body or send automatically.
export function publicContactHref(contact) {
  try {
    const c = publicContact(contact);
    if (c.kind === 'email') return `mailto:${encodeURIComponent(c.value)}`;
    if (c.kind === 'phone') return `tel:${c.normalized}`;
    const url = new URL(sourceUrl(c.value));
    // Keep identity parameters only; published share links may contain prefilled text.
    for (const key of [...url.searchParams.keys()]) if (!['id','phone'].includes(key)) url.searchParams.delete(key);
    return url.href;
  } catch { return ''; }
}

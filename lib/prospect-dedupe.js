// Review signals, never an automatic business merge or branch identity claim.
export function businessHost(value) {
  try {
    const host = new URL(value).hostname.toLowerCase().replace(/^www\./,'');
    if (/(^|\.)(facebook\.com|fb\.com|zalo\.me|instagram\.com|tiktok\.com|google\.com|maps\.app\.goo\.gl|shopeefood\.vn|foody\.vn|grab\.com|wixsite\.com|wordpress\.com|blogspot\.com)$/.test(host)) return '';
    return host;
  } catch { return ''; }
}
export function possibleDuplicates(prospect, saved) {
  const host=businessHost(prospect?.source_url);
  return host ? saved.filter(p=>p.id!==prospect.id && businessHost(p.source_url)===host) : [];
}
export function matchesQueue(prospect, summary, queue) {
  if (queue==='review') return prospect.status==='research';
  if (queue==='missing_contact') return prospect.status==='qualified' && !summary?.contact_count && !prospect.contact;
  if (queue==='prepare') return prospect.status==='qualified' && prospect.evidence_kind==='page_review' && Boolean(summary?.contact_count || prospect.contact) && !summary?.has_draft;
  if (queue==='draft') return prospect.status==='qualified' && prospect.evidence_kind==='page_review' && Boolean(summary?.has_draft);
  return true;
}

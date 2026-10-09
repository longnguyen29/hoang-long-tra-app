"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUpRight, ChevronDown, RefreshCw } from "lucide-react";
import { useLocale } from "@/components/i18n/LocaleProvider";
import styles from "./EventEnquiryInbox.module.css";

const FIELDS = "id,opportunity_id,name,business,contact,intent,note,source,medium,campaign,received_at,consent_version,consent_at";
const LIMIT = 30;
const tx = (locale, vi, en) => locale === "en" ? en : vi;
const reference = (id) => `HL-E-${String(id || "").slice(0, 8).toUpperCase()}`;
const timestamp = (value, locale) => {
  const date = new Date(value);
  if (!value || !Number.isFinite(date.getTime())) return "—";
  return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "vi-VN", {
    dateStyle: "short", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh",
  }).format(date);
};
const intentLabel = (intent, locale) => ({
  sample: tx(locale, "Thử mẫu", "Samples"),
  quote: tx(locale, "Báo giá", "Quotation"),
  cooperation: tx(locale, "Hợp tác", "Partnership"),
})[intent] || tx(locale, "Nhu cầu khác", "Other enquiry");

export default function EventEnquiryInbox({ supabase, opportunityId = null, refreshKey, onOpenOpportunity }) {
  const { locale } = useLocale();
  const [enquiries, setEnquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const request = useRef(0);

  const load = useCallback(async () => {
    const current = ++request.current;
    setLoading(true);
    setError(false);
    setEnquiries([]);
    try {
      let query = supabase.from("event_enquiries").select(FIELDS)
        .order("received_at", { ascending: false }).limit(LIMIT);
      if (opportunityId) query = query.eq("opportunity_id", opportunityId);
      const result = await query;
      if (current !== request.current) return;
      if (result.error) setError(true);
      else setEnquiries(result.data || []);
    } catch {
      if (current === request.current) setError(true);
    } finally {
      if (current === request.current) setLoading(false);
    }
  }, [supabase, opportunityId]);

  useEffect(() => {
    load();
    return () => { request.current += 1; };
  }, [load, refreshKey]);

  return <details className={styles.inbox} data-no-translate>
    <summary>
      <span><strong>{tx(locale, "Liên hệ từ hội chợ / QR", "Event / QR enquiries")}</strong>
        <small>{tx(locale, "Nội dung khách đã gửi về Hoàng Long", "Enquiries submitted to Hoàng Long")}</small>
      </span>
      <span className={styles.summaryEnd}>
        <span>{loading ? tx(locale, "Đang tải…", "Loading…") : error ? tx(locale, "Chưa tải được", "Unavailable") : tx(locale, `${enquiries.length} yêu cầu gần nhất`, `${enquiries.length} latest enquiries`)}</span>
        <ChevronDown aria-hidden="true" />
      </span>
    </summary>
    <div className={styles.body} aria-busy={loading}>
      <header className={styles.toolbar}>
        <p>{tx(locale, `Hiển thị tối đa ${LIMIT} yêu cầu gần nhất${opportunityId ? " của khách hàng này" : ""}.`, `Showing up to ${LIMIT} latest enquiries${opportunityId ? " for this customer" : ""}.`)}</p>
        <button type="button" onClick={load} disabled={loading}><RefreshCw aria-hidden="true" />{tx(locale, "Làm mới", "Refresh")}</button>
      </header>
      {loading ? <p className={styles.message} role="status">{tx(locale, "Đang tải yêu cầu…", "Loading enquiries…")}</p>
        : error ? <div className={styles.error} role="alert"><p>{tx(locale, "Chưa tải được liên hệ hội chợ. Các phần khác của Pipeline vẫn dùng được.", "Event enquiries could not be loaded. Other Pipeline features remain available.")}</p><button type="button" onClick={load}>{tx(locale, "Thử lại", "Retry")}</button></div>
          : enquiries.length === 0 ? <p className={styles.message}>{tx(locale, "Chưa có yêu cầu trong mục này.", "No enquiries in this section yet.")}</p>
            : <div className={styles.list}>{enquiries.map((enquiry) => <article className={styles.enquiry} key={enquiry.id}>
              <header><span className={styles.reference}>{reference(enquiry.id)}</span><time dateTime={enquiry.received_at}>{timestamp(enquiry.received_at, locale)} · VN</time><span className={styles.intent}>{intentLabel(enquiry.intent, locale)}</span></header>
              <div className={styles.content}>
                <div className={styles.customer}><h3>{enquiry.name}</h3>{enquiry.business && <p>{enquiry.business}</p>}<dl><dt>{tx(locale, "Liên hệ", "Contact")}</dt><dd>{enquiry.contact || "—"}</dd></dl></div>
                <div className={styles.note}><span>{tx(locale, "Nhu cầu / ghi chú", "Requirements / notes")}</span><p>{enquiry.note || tx(locale, "Không có ghi chú thêm.", "No additional notes.")}</p></div>
              </div>
              <footer>
                <div className={styles.provenance}><span>{tx(locale, "Nguồn", "Source")}: {[enquiry.source, enquiry.medium, enquiry.campaign].filter(Boolean).join(" · ") || "—"}</span>{enquiry.consent_at && <small>{tx(locale, "Đồng ý liên hệ", "Contact consent")}: {timestamp(enquiry.consent_at, locale)}{enquiry.consent_version ? ` · ${enquiry.consent_version}` : ""}</small>}</div>
                {enquiry.opportunity_id ? typeof onOpenOpportunity === "function" ? <button type="button" onClick={() => onOpenOpportunity(enquiry.opportunity_id)}>{tx(locale, "Mở khách hàng", "Open customer")}<ArrowUpRight aria-hidden="true" /></button> : <span className={styles.linked}>{tx(locale, "Đã liên kết khách hàng", "Customer linked")}</span>
                  : <div className={styles.pending}><strong>{tx(locale, "Chờ đối chiếu khách hàng", "Awaiting customer matching")}</strong><small>{tx(locale, "Không tự chọn hồ sơ khi thông tin liên hệ trùng nhiều khách.", "A customer is not selected automatically when contact details match multiple profiles.")}</small></div>}
              </footer>
            </article>)}</div>}
    </div>
  </details>;
}

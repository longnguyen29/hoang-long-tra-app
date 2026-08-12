"use client";

import { useState, useEffect } from "react";
import { Calendar, Send, X } from "lucide-react";
import { notifyHouse } from "@/lib/notify";
import PaymentBlock from "./PaymentBlock";

// Free for now — set back to 500000 to re-enable the QR/cash payment step below.
const SESSION_PRICE = 0;

export default function TeaSessionBooking({ supabase, payment, vietQrUrl, t, TOKENS, autoOpen }) {
  const [open, setOpen] = useState(!!autoOpen);
  const [takenDates, setTakenDates] = useState(new Set());
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [note, setNote] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [booked, setBooked] = useState(null);

  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

  const fetchTakenDates = async () => {
    const to = new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10);
    const { data } = await supabase.rpc("list_taken_tea_session_dates", { p_from: tomorrow, p_to: to });
    if (data) setTakenDates(new Set(data.map((d) => d.date)));
  };

  const openBooking = async () => {
    setOpen(true);
    await fetchTakenDates();
  };

  useEffect(() => {
    if (autoOpen) fetchTakenDates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpen]);

  const submit = async () => {
    if (!date || !time || !name.trim() || !contact.trim() || takenDates.has(date)) return;
    setLoading(true);
    setError("");
    const { data, error: bookError } = await supabase.rpc("book_tea_session", {
      p_date: date, p_time: time, p_customer_name: name.trim(), p_contact: contact.trim(),
      p_note: note.trim(), p_payment_method: paymentMethod,
    });
    setLoading(false);
    if (bookError) {
      if (bookError.message?.includes("date_taken")) {
        setError(t.teaSessionErrorDateTaken);
        setTakenDates((prev) => new Set([...prev, date]));
      } else {
        setError(t.teaSessionErrorGeneric);
      }
      return;
    }
    notifyHouse("tea_sessions", data[0].id);
    setBooked({ id: data[0].id, date: data[0].date, time: data[0].session_time?.slice(0, 5) || time, paymentMethod });
  };

  const printSessionReceipt = (order) => {
    const win = window.open("", "_blank", "width=600,height=700");
    if (!win) return;
    const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(order.id)}</title>
      <style>body{font-family:Georgia,serif;color:#1C2B24;padding:40px;max-width:500px;margin:0 auto;}
      h2{font-size:16px;margin:0 0 4px;}p{font-size:13px;line-height:1.7;}</style></head>
      <body>
        <h2>House of Hoàng Long — ${esc(t.teaSessionModalTitle)}</h2>
        <p>${esc(order.id)}<br/>${esc(order.date)} ${esc(order.time || "")}<br/>${SESSION_PRICE > 0 ? esc(SESSION_PRICE.toLocaleString("vi-VN")) + "đ" : esc(t.teaSessionFreeNote)}</p>
      </body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 300);
  };

  const reset = () => {
    setBooked(null); setDate(""); setTime(""); setName(""); setContact(""); setNote(""); setError("");
  };

  if (!open) {
    return (
      <button
        onClick={openBooking}
        style={{
          display: "flex", alignItems: "center", gap: 8, marginTop: 16, background: TOKENS.jade, color: TOKENS.paper,
          border: "none", borderRadius: 10, padding: "12px 18px", fontSize: 14, fontWeight: 600, cursor: "pointer",
        }}
      >
        <Calendar size={16} /> {t.teaSessionCtaBtn}
      </button>
    );
  }

  return (
    <div style={{ marginTop: 20, background: TOKENS.paper, boxShadow: TOKENS.shadowMd, borderRadius: TOKENS.radius, padding: 20, maxWidth: 420 }}>
      {booked ? (
        <div>
          <h3 style={{ fontFamily: "Lora, Georgia, serif", fontSize: 18, margin: "0 0 8px" }}>{t.teaSessionSuccessTitle}</h3>
          <p style={{ fontSize: 13, color: TOKENS.jade, fontWeight: 600, marginBottom: 8 }}>{booked.date}{booked.time ? ` · ${booked.time}` : ""}</p>
          <p style={{ fontSize: 12.5, color: TOKENS.jadeSoft, margin: 0 }}>{t.teaSessionPendingNote}</p>
          {SESSION_PRICE > 0 && (
            <PaymentBlock
              order={{ id: booked.id, paymentMethod: booked.paymentMethod }}
              payment={payment}
              qrUrl={booked.paymentMethod === "qr" ? vietQrUrl({ id: booked.id }, SESSION_PRICE) : null}
              onPrint={printSessionReceipt}
              t={t}
              TOKENS={TOKENS}
            />
          )}
          {SESSION_PRICE === 0 && (
            <div style={{ marginTop: 14, fontFamily: "monospace", fontSize: 13, color: TOKENS.jadeSoft }}>{booked.id}</div>
          )}
          <button onClick={reset} style={{ marginTop: 14, background: "none", border: "none", color: TOKENS.jadeSoft, fontSize: 13, cursor: "pointer", textDecoration: "underline", padding: 0 }}>
            {t.teaSessionBackBtn}
          </button>
        </div>
      ) : (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <h3 style={{ fontFamily: "Lora, Georgia, serif", fontSize: 18, margin: "0 0 4px" }}>{t.teaSessionModalTitle}</h3>
            <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: TOKENS.jadeSoft, padding: 0 }}>
              <X size={18} />
            </button>
          </div>
          <p style={{ fontSize: 12.5, color: TOKENS.jadeSoft, marginBottom: 2 }}>{SESSION_PRICE > 0 ? t.teaSessionPriceNote : t.teaSessionFreeNote}</p>
          <p style={{ fontSize: 11.5, color: TOKENS.jadeSoft, marginBottom: 16 }}>{t.teaSessionAddress}</p>

          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 12, color: TOKENS.jadeSoft, marginBottom: 4, display: "block" }}>{t.teaSessionDateLabel}</label>
              <input
                type="date"
                min={tomorrow}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${TOKENS.brassDeep}55`, fontSize: 14 }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 12, color: TOKENS.jadeSoft, marginBottom: 4, display: "block" }}>{t.teaSessionTimeLabel}</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${TOKENS.brassDeep}55`, fontSize: 14 }}
              />
            </div>
          </div>
          {date && takenDates.has(date) && <p style={{ fontSize: 12, color: TOKENS.lacquer, margin: "6px 0 0" }}>{t.teaSessionDateTaken}</p>}

          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t.yourName} style={{ padding: "9px 12px", borderRadius: 8, border: `1px solid ${TOKENS.brassDeep}55`, fontSize: 13.5 }} />
            <input value={contact} onChange={(e) => setContact(e.target.value)} placeholder={t.yourContact} style={{ padding: "9px 12px", borderRadius: 8, border: `1px solid ${TOKENS.brassDeep}55`, fontSize: 13.5 }} />
            <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder={t.teaSessionNotePh} rows={2} style={{ padding: "9px 12px", borderRadius: 8, border: `1px solid ${TOKENS.brassDeep}55`, fontSize: 13.5, resize: "vertical", fontFamily: "inherit" }} />
          </div>

          {SESSION_PRICE > 0 && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 12, color: TOKENS.jadeSoft, marginBottom: 6 }}>{t.paymentMethodLabel}</div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setPaymentMethod("qr")}
                  style={{
                    flex: 1, padding: "9px", borderRadius: 8, cursor: "pointer", fontSize: 12.5, fontWeight: 600,
                    border: `1px solid ${paymentMethod === "qr" ? TOKENS.brass : TOKENS.hairline}`,
                    background: paymentMethod === "qr" ? `${TOKENS.brass}22` : "transparent", color: TOKENS.jade,
                  }}
                >
                  {t.payByQR}
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod("cash")}
                  style={{
                    flex: 1, padding: "9px", borderRadius: 8, cursor: "pointer", fontSize: 12.5, fontWeight: 600,
                    border: `1px solid ${paymentMethod === "cash" ? TOKENS.brass : TOKENS.hairline}`,
                    background: paymentMethod === "cash" ? `${TOKENS.brass}22` : "transparent", color: TOKENS.jade,
                  }}
                >
                  {t.payByCash}
                </button>
              </div>
            </div>
          )}

          {error && <p style={{ fontSize: 12.5, color: TOKENS.lacquer, marginTop: 10, marginBottom: 0 }}>{error}</p>}

          <button
            onClick={submit}
            disabled={loading || !date || !time || !name.trim() || !contact.trim() || takenDates.has(date)}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", marginTop: 14,
              background: TOKENS.jade, color: TOKENS.paper, border: "none", borderRadius: 8, padding: "11px",
              fontSize: 13.5, fontWeight: 700, cursor: "pointer",
              opacity: (loading || !date || !time || !name.trim() || !contact.trim() || takenDates.has(date)) ? 0.5 : 1,
            }}
          >
            <Send size={14} /> {t.teaSessionSubmitBtn}
          </button>
        </>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { ChevronDown, Phone, MessageCircle, Plus } from "lucide-react";
import ConfirmDelete from "./ConfirmDelete";

// Leads, sample requests, and tea session bookings are all the same kind of thing from a
// staff point of view: something a stranger sent in that hasn't become an order yet. They used
// to be three separate Dashboard tabs sitting next to Orders, which made "where do I look for
// new business" a five-way guess. This folds all three into one place, reached from Orders
// itself — collapsed by kind so nothing is hidden, but nothing is shouting either.
function Group({ kindLabel, count, defaultOpen, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%",
          background: "none", border: "none", padding: "10px 2px", cursor: "pointer", textAlign: "left",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#1C2B24" }}>{kindLabel}</span>
          {count > 0 && (
            <span style={{ background: "#9C3B2E", color: "#F7F3EA", borderRadius: 10, fontSize: 10.5, fontWeight: 700, padding: "1px 7px" }}>{count}</span>
          )}
        </span>
        <ChevronDown size={16} color="#2E4A40" style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 160ms ease-out" }} />
      </button>
      {open && <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingBottom: 14 }}>{children}</div>}
    </div>
  );
}

function KindBadge({ children, TOKENS }) {
  return (
    <span style={{
      display: "inline-block", fontSize: 9.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4,
      color: TOKENS.brassOnPaper, background: `${TOKENS.brass}1F`, borderRadius: 5, padding: "2px 6px", marginBottom: 6,
    }}>
      {children}
    </span>
  );
}

export default function IncomingQueue({
  leads, sampleRequests, teaSessions, lang, t, TOKENS,
  onMarkLeadRead, onDeleteLead, onConvertLead,
  onDeleteSampleRequest, onSetSampleStatus,
  onUpdateSessionStatus, onDeleteSession,
}) {
  const openLeads = leads.filter((l) => l.unread).length;
  const openSamples = sampleRequests.filter((r) => r.status === "new").length;
  const openSessions = teaSessions.filter((s) => s.status === "pending").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", divider: "none" }}>
      <Group kindLabel={t.incomingLeadsGroup} count={openLeads} defaultOpen={openLeads > 0}>
        {leads.length === 0 && <p style={{ fontSize: 13, color: TOKENS.jadeSoft, fontStyle: "italic", margin: 0 }}>{t.noLeadsYet}</p>}
        {[...leads].reverse().map((l) => (
          <div key={l.id} style={{ background: TOKENS.paperDeep, border: `1px solid ${TOKENS.brassDeep}${l.unread ? "88" : "33"}`, borderRadius: 12, padding: 14 }}>
            <KindBadge TOKENS={TOKENS}>{t.incomingLeadsGroup}</KindBadge>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 600 }}>{l.name}</div>
                {l.business_name && <div style={{ fontSize: 13, color: TOKENS.jade, overflowWrap: "anywhere" }}>{l.business_name}</div>}
                <div style={{ fontSize: 12.5, color: TOKENS.jadeSoft }}>{t.contactLabel}: {l.contact}</div>
                {l.address && (
                  <div style={{ fontSize: 12.5, color: TOKENS.jadeSoft, overflowWrap: "anywhere", marginTop: 2 }}>{t.addressLabel}: {l.address}</div>
                )}
                <div style={{ fontSize: 12.5, color: TOKENS.brassOnPaper, marginTop: 2 }}>
                  {t.interestedIn}: {l.interest === "mau-thu-doanh-nghiep" ? t.leadFromAd : l.interest === "wholesale" ? t.onboardWholesale : t.onboardRetail}
                </div>
              </div>
              {l.unread && <span style={{ background: TOKENS.lacquer, color: TOKENS.paper, borderRadius: 10, fontSize: 10.5, fontWeight: 700, padding: "2px 8px", flexShrink: 0 }}>{t.newBadge}</span>}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginTop: 10 }}>
              {l.unread && (
                <button onClick={() => onMarkLeadRead(l.id)} style={{ fontSize: 12.5, color: TOKENS.jadeSoft, background: "none", border: `1px solid ${TOKENS.brassDeep}55`, borderRadius: 6, padding: "6px 10px", cursor: "pointer" }}>
                  {t.markRead}
                </button>
              )}
              <button
                onClick={() => onConvertLead(l)}
                style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12.5, fontWeight: 700, color: TOKENS.paper, background: TOKENS.jade, border: "none", borderRadius: 6, padding: "6px 10px", cursor: "pointer" }}
              >
                <Plus size={12} color={TOKENS.brass} /> {t.leadConvertToOrder}
              </button>
              <ConfirmDelete TOKENS={TOKENS} compact label={t.delete} confirmLabel={t.deleteConfirm} onConfirm={() => onDeleteLead(l)} />
            </div>
          </div>
        ))}
      </Group>

      <div style={{ borderTop: `1px solid ${TOKENS.brassDeep}22` }} />

      <Group kindLabel={t.incomingSamplesGroup} count={openSamples} defaultOpen={openSamples > 0}>
        <p style={{ fontSize: 12, color: TOKENS.jadeSoft, lineHeight: 1.55, margin: 0 }}>
          {t.samplesHint} <code style={{ background: `${TOKENS.brass}1F`, padding: "2px 7px", borderRadius: 6, fontSize: 11.5 }}>hoanglongtra.com/sample</code>
        </p>
        {sampleRequests.length === 0 && <p style={{ fontSize: 13, color: TOKENS.jadeSoft, fontStyle: "italic", margin: 0 }}>{t.noSamplesYet}</p>}
        {sampleRequests.map((r) => {
          const zalo = (r.phone || "").replace(/\D/g, "").replace(/^84/, "0");
          return (
            <div key={r.id} style={{ background: TOKENS.paperDeep, borderRadius: 14, padding: "14px 16px", boxShadow: TOKENS.shadowSm }}>
              <KindBadge TOKENS={TOKENS}>{t.incomingSamplesGroup}</KindBadge>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontFamily: "Lora, Georgia, serif", fontSize: 17, color: TOKENS.jade, overflowWrap: "anywhere" }}>{r.store_name}</div>
                  <div style={{ fontSize: 12, color: TOKENS.jadeSoft }}>{[r.contact_name, r.phone].filter(Boolean).join(" · ")}</div>
                </div>
                <span style={{
                  flexShrink: 0, fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 12,
                  color: r.pack === "50g" ? TOKENS.paper : TOKENS.brassOnPaper,
                  background: r.pack === "50g" ? TOKENS.jade : `${TOKENS.brass}1F`,
                }}>
                  {r.pack}{r.pack === "50g" ? ` · ${t.free}` : ""}
                </span>
              </div>
              <div style={{ fontSize: 12.5, color: TOKENS.jade, marginTop: 8, overflowWrap: "anywhere" }}>{r.address}</div>
              {r.heard_from && (
                <div style={{ fontSize: 12, color: TOKENS.brassOnPaper, fontWeight: 600, marginTop: 4 }}>{t.heardFromLabel}: {t.heardFromName(r.heard_from)}</div>
              )}
              {r.note && <div style={{ fontSize: 12, color: TOKENS.jadeSoft, fontStyle: "italic", marginTop: 4 }}>{r.note}</div>}
              {r.pack === "50g" && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 8 }}>
                  {[[r.has_shop, t.qualShop], [r.can_reformulate, t.qualRecipe], [r.can_feedback, t.qualFeedback]].map(([ok, label], i) => (
                    <span key={i} style={{ fontSize: 10.5, fontWeight: 600, borderRadius: 20, padding: "3px 9px", color: ok ? TOKENS.brassOnPaper : TOKENS.lacquer, background: ok ? `${TOKENS.brass}1F` : `${TOKENS.lacquer}14` }}>
                      {ok ? "✓" : "✕"} {label}
                    </span>
                  ))}
                </div>
              )}
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 11, alignItems: "center" }}>
                <a href={`tel:${(r.phone || "").replace(/\s/g, "")}`} style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 12px", borderRadius: 10, background: TOKENS.jade, color: TOKENS.paper, fontSize: 12.5, fontWeight: 600, textDecoration: "none" }}>
                  <Phone size={13} /> {t.callCustomer}
                </a>
                <a href={`https://zalo.me/${zalo}`} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 12px", borderRadius: 10, background: `${TOKENS.brass}2E`, color: TOKENS.brassOnPaper, fontSize: 12.5, fontWeight: 700, textDecoration: "none" }}>
                  <MessageCircle size={13} /> {t.zaloCustomer}
                </a>
                <ConfirmDelete TOKENS={TOKENS} compact label={t.delete} confirmLabel={t.deleteConfirm} onConfirm={() => onDeleteSampleRequest(r)} />
                <select
                  value={r.status}
                  onChange={(e) => onSetSampleStatus(r.id, e.target.value)}
                  style={{ marginLeft: "auto", padding: "7px 10px", borderRadius: 10, border: `1px solid ${TOKENS.hairline}`, fontSize: 12.5, background: TOKENS.paper, color: TOKENS.jade }}
                >
                  <option value="new">{t.sampleNew}</option>
                  <option value="sent">{t.sampleSent}</option>
                  <option value="converted">{t.sampleConverted}</option>
                  <option value="declined">{t.sampleDeclined}</option>
                </select>
              </div>
            </div>
          );
        })}
      </Group>

      <div style={{ borderTop: `1px solid ${TOKENS.brassDeep}22` }} />

      <Group kindLabel={t.incomingSessionsGroup} count={openSessions} defaultOpen={openSessions > 0}>
        {teaSessions.length === 0 && <p style={{ fontSize: 13, color: TOKENS.jadeSoft, fontStyle: "italic", margin: 0 }}>{t.teaSessionNoneYet}</p>}
        {[...teaSessions].reverse().map((s) => (
          <div key={s.id} style={{ background: TOKENS.paperDeep, border: `1px solid ${TOKENS.brassDeep}33`, borderRadius: 12, padding: 16 }}>
            <KindBadge TOKENS={TOKENS}>{t.incomingSessionsGroup}</KindBadge>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
              <div style={{ fontFamily: "Lora, Georgia, serif", fontSize: 17, fontWeight: 600 }}>{s.date}{s.time ? ` · ${s.time}` : ""}</div>
              <span style={{
                fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4, padding: "2px 8px", borderRadius: 6, flexShrink: 0,
                background: s.status === "confirmed" ? `${TOKENS.jade}18` : s.status === "cancelled" ? `${TOKENS.lacquer}18` : `${TOKENS.brass}22`,
                color: s.status === "confirmed" ? TOKENS.jade : s.status === "cancelled" ? TOKENS.lacquer : TOKENS.brassDeep,
              }}>
                {s.status === "confirmed" ? t.teaSessionStatusConfirmed : s.status === "cancelled" ? t.teaSessionStatusCancelled : t.teaSessionStatusPending}
              </span>
            </div>
            <div style={{ fontSize: 13.5, fontWeight: 600 }}>{s.customerName}</div>
            <div style={{ fontSize: 12.5, color: TOKENS.jadeSoft }}>{t.contactLabel}: {s.contact}</div>
            <div style={{ fontSize: 12.5, color: TOKENS.jadeSoft }}>{t.paymentMethodLabel}: {s.paymentMethod === "cash" ? t.payByCash : t.payByQR}</div>
            {s.note && <div style={{ fontSize: 12.5, color: TOKENS.jadeSoft, marginTop: 6, fontStyle: "italic" }}>{t.noteLabel}: {s.note}</div>}
            <div style={{ marginTop: 12 }}>
              <ConfirmDelete TOKENS={TOKENS} compact label={t.delete} confirmLabel={t.deleteConfirm} note={t.deleteSessionNote} onConfirm={() => onDeleteSession(s)} />
            </div>
            {s.status !== "cancelled" && (
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                {s.status === "pending" && (
                  <button onClick={() => onUpdateSessionStatus(s.id, "confirmed")} style={{ background: TOKENS.jade, color: TOKENS.paper, border: "none", borderRadius: 8, padding: "8px 12px", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
                    {t.teaSessionConfirmBtn}
                  </button>
                )}
                <button onClick={() => onUpdateSessionStatus(s.id, "cancelled")} style={{ background: "none", border: `1px solid ${TOKENS.lacquer}55`, color: TOKENS.lacquer, borderRadius: 8, padding: "8px 12px", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
                  {t.teaSessionCancelBtn}
                </button>
              </div>
            )}
          </div>
        ))}
      </Group>
    </div>
  );
}

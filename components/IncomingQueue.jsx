"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Phone, MessageCircle, Plus } from "lucide-react";
import ConfirmDelete from "./ConfirmDelete";

// Leads, sample requests, and tea session bookings are all the same kind of thing from a
// staff point of view: something a stranger sent in that hasn't become an order yet. They used
// to be three separate Dashboard tabs, then a padded-card accordion — neither made "what's
// waiting on me" scannable at a glance. This is a dense, Notion-database-style table instead:
// one line per item, a status pill, grouped and collapsed by kind. Click a row to open the
// detail and the actions that used to be always-visible on the card.
//
// Not a literal multi-column grid: this app is used on a phone as often as a desktop, and a
// wide table means horizontal scrolling on the one device staff are most likely holding while
// standing at the counter. Each row fits one line by showing only what identifies the item —
// everything else (address, note, qualifying answers, buttons) lives in the row's own
// expansion, one tap away rather than always on screen.

function Group({ kindLabel, count, defaultOpen, headerNote, children }) {
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
          <span style={{ background: "#AD8A4E22", color: "#82602D", borderRadius: 10, fontSize: 10.5, fontWeight: 700, padding: "1px 7px" }}>{count}</span>
        </span>
        <ChevronDown size={16} color="#2E4A40" style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 160ms ease-out" }} />
      </button>
      {open && (
        <div>
          {headerNote}
          <div>{children}</div>
        </div>
      )}
    </div>
  );
}

function Pill({ label, color, bg }) {
  return (
    <span style={{
      flexShrink: 0, fontSize: 10.5, fontWeight: 700, padding: "2px 9px", borderRadius: 20,
      color, background: bg, whiteSpace: "nowrap",
    }}>
      {label}
    </span>
  );
}

// One line, click to expand.
function Row({ title, sub, pill, TOKENS, children }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: `1px solid ${TOKENS.brassDeep}1F` }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "10px 2px",
          background: "none", border: "none", cursor: "pointer", textAlign: "left",
        }}
      >
        <ChevronRight size={13} color={TOKENS.jadeSoft} style={{ flexShrink: 0, transform: open ? "rotate(90deg)" : "none", transition: "transform 140ms ease-out" }} />
        <div style={{ minWidth: 0, flex: "1 1 auto" }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: TOKENS.jade, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {title}
          </div>
          {sub && <div style={{ fontSize: 11.5, color: TOKENS.jadeSoft, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sub}</div>}
        </div>
        {pill}
      </button>
      {open && <div style={{ padding: "0 2px 14px 21px" }}>{children}</div>}
    </div>
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
    <div style={{ display: "flex", flexDirection: "column" }}>
      <Group kindLabel={t.incomingLeadsGroup} count={leads.length} defaultOpen={openLeads > 0}>
        {leads.length === 0 && <p style={{ fontSize: 13, color: TOKENS.jadeSoft, fontStyle: "italic", margin: "4px 0 12px" }}>{t.noLeadsYet}</p>}
        {[...leads].reverse().map((l) => (
          <Row
            key={l.id}
            title={l.name}
            sub={[l.business_name, l.contact].filter(Boolean).join(" · ")}
            TOKENS={TOKENS}
            pill={l.unread
              ? <Pill label={t.incomingStatusNew} color={TOKENS.paper} bg={TOKENS.lacquer} />
              : <Pill label={t.incomingStatusRead} color={TOKENS.jadeSoft} bg={`${TOKENS.jadeSoft}18`} />}
          >
            <div style={{ fontSize: 12.5, color: TOKENS.jadeSoft, marginBottom: 2 }}>{t.contactLabel}: {l.contact}</div>
            {l.address && <div style={{ fontSize: 12.5, color: TOKENS.jadeSoft, overflowWrap: "anywhere", marginBottom: 2 }}>{t.addressLabel}: {l.address}</div>}
            <div style={{ fontSize: 12.5, color: TOKENS.brassOnPaper, marginBottom: 8 }}>
              {t.interestedIn}: {l.interest === "mau-thu-doanh-nghiep" ? t.leadFromAd : l.interest === "wholesale" ? t.onboardWholesale : t.onboardRetail}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
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
          </Row>
        ))}
      </Group>

      <div style={{ borderTop: `1px solid ${TOKENS.brassDeep}22`, margin: "4px 0" }} />

      <Group
        kindLabel={t.incomingSamplesGroup}
        count={sampleRequests.length}
        defaultOpen={openSamples > 0}
        headerNote={
          <p style={{ fontSize: 11.5, color: TOKENS.jadeSoft, lineHeight: 1.5, margin: "0 0 6px" }}>
            {t.samplesHint} <code style={{ background: `${TOKENS.brass}1F`, padding: "1px 6px", borderRadius: 5, fontSize: 11 }}>hoanglongtra.com/sample</code>
          </p>
        }
      >
        {sampleRequests.length === 0 && <p style={{ fontSize: 13, color: TOKENS.jadeSoft, fontStyle: "italic", margin: "4px 0 12px" }}>{t.noSamplesYet}</p>}
        {sampleRequests.map((r) => {
          const zalo = (r.phone || "").replace(/\D/g, "").replace(/^84/, "0");
          const statusPill = {
            new: { label: t.sampleNew, color: TOKENS.brassOnPaper, bg: `${TOKENS.brass}22` },
            sent: { label: t.sampleSent, color: TOKENS.jade, bg: `${TOKENS.jade}18` },
            converted: { label: t.sampleConverted, color: TOKENS.paper, bg: TOKENS.jade },
            declined: { label: t.sampleDeclined, color: TOKENS.lacquer, bg: `${TOKENS.lacquer}18` },
          }[r.status] || { label: r.status, color: TOKENS.jadeSoft, bg: `${TOKENS.jadeSoft}18` };
          return (
            <Row
              key={r.id}
              title={r.store_name}
              sub={[r.contact_name, r.phone].filter(Boolean).join(" · ")}
              TOKENS={TOKENS}
              pill={<Pill {...statusPill} />}
            >
              <div style={{ fontSize: 12.5, color: TOKENS.jade, overflowWrap: "anywhere", marginBottom: 4 }}>{r.address}</div>
              <div style={{ fontSize: 11.5, color: TOKENS.brassOnPaper, fontWeight: 600, marginBottom: 4 }}>
                {r.pack}{r.pack === "50g" ? ` · ${t.free}` : ""}
              </div>
              {r.heard_from && (
                <div style={{ fontSize: 12, color: TOKENS.brassOnPaper, marginBottom: 4 }}>{t.heardFromLabel}: {t.heardFromName(r.heard_from)}</div>
              )}
              {r.note && <div style={{ fontSize: 12, color: TOKENS.jadeSoft, fontStyle: "italic", marginBottom: 6 }}>{r.note}</div>}
              {r.pack === "50g" && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 8 }}>
                  {[[r.has_shop, t.qualShop], [r.can_reformulate, t.qualRecipe], [r.can_feedback, t.qualFeedback]].map(([ok, label], i) => (
                    <span key={i} style={{ fontSize: 10.5, fontWeight: 600, borderRadius: 20, padding: "3px 9px", color: ok ? TOKENS.brassOnPaper : TOKENS.lacquer, background: ok ? `${TOKENS.brass}1F` : `${TOKENS.lacquer}14` }}>
                      {ok ? "✓" : "✕"} {label}
                    </span>
                  ))}
                </div>
              )}
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
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
            </Row>
          );
        })}
      </Group>

      <div style={{ borderTop: `1px solid ${TOKENS.brassDeep}22`, margin: "4px 0" }} />

      <Group kindLabel={t.incomingSessionsGroup} count={teaSessions.length} defaultOpen={openSessions > 0}>
        {teaSessions.length === 0 && <p style={{ fontSize: 13, color: TOKENS.jadeSoft, fontStyle: "italic", margin: "4px 0 12px" }}>{t.teaSessionNoneYet}</p>}
        {[...teaSessions].reverse().map((s) => {
          const statusPill = {
            pending: { label: t.teaSessionStatusPending, color: TOKENS.brassDeep, bg: `${TOKENS.brass}22` },
            confirmed: { label: t.teaSessionStatusConfirmed, color: TOKENS.jade, bg: `${TOKENS.jade}18` },
            cancelled: { label: t.teaSessionStatusCancelled, color: TOKENS.lacquer, bg: `${TOKENS.lacquer}18` },
          }[s.status] || { label: s.status, color: TOKENS.jadeSoft, bg: `${TOKENS.jadeSoft}18` };
          return (
            <Row
              key={s.id}
              title={`${s.date}${s.time ? ` · ${s.time}` : ""}`}
              sub={s.customerName}
              TOKENS={TOKENS}
              pill={<Pill {...statusPill} />}
            >
              <div style={{ fontSize: 12.5, color: TOKENS.jadeSoft, marginBottom: 2 }}>{t.contactLabel}: {s.contact}</div>
              <div style={{ fontSize: 12.5, color: TOKENS.jadeSoft, marginBottom: 2 }}>{t.paymentMethodLabel}: {s.paymentMethod === "cash" ? t.payByCash : t.payByQR}</div>
              {s.note && <div style={{ fontSize: 12.5, color: TOKENS.jadeSoft, fontStyle: "italic", marginBottom: 8 }}>{t.noteLabel}: {s.note}</div>}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                {s.status !== "cancelled" && s.status === "pending" && (
                  <button onClick={() => onUpdateSessionStatus(s.id, "confirmed")} style={{ background: TOKENS.jade, color: TOKENS.paper, border: "none", borderRadius: 8, padding: "8px 12px", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
                    {t.teaSessionConfirmBtn}
                  </button>
                )}
                {s.status !== "cancelled" && (
                  <button onClick={() => onUpdateSessionStatus(s.id, "cancelled")} style={{ background: "none", border: `1px solid ${TOKENS.lacquer}55`, color: TOKENS.lacquer, borderRadius: 8, padding: "8px 12px", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
                    {t.teaSessionCancelBtn}
                  </button>
                )}
                <ConfirmDelete TOKENS={TOKENS} compact label={t.delete} confirmLabel={t.deleteConfirm} note={t.deleteSessionNote} onConfirm={() => onDeleteSession(s)} />
              </div>
            </Row>
          );
        })}
      </Group>
    </div>
  );
}

"use client";

import { useState } from "react";
import { X, Check, Plus, AlertTriangle, CheckCircle2, RotateCcw, FileText, Trash2, Printer } from "lucide-react";
import { ORDER_STAGES, STAGE_CHECKLIST_DEFAULTS, ISSUE_CATEGORIES, ISSUE_PLAYBOOK } from "@/lib/constants";
import ConfirmDelete from "./ConfirmDelete";
import DocumentModal from "./DocumentModal";

const IMPACT_COLOR = (impact, TOKENS) => ({ low: TOKENS.jadeSoft, medium: TOKENS.brassOnPaper, high: TOKENS.lacquer }[impact] || TOKENS.jadeSoft);

function ChecklistTab({ order, lang, t, TOKENS, onSaveChecklist }) {
  const saved = order.stageChecklist?.[order.stage];
  const items = saved || (STAGE_CHECKLIST_DEFAULTS[order.stage] || []).map((d) => ({ label: d[lang] || d.en, done: false }));
  const [draft, setDraft] = useState("");

  const toggle = (idx) => {
    const next = items.map((it, i) => (i === idx ? { ...it, done: !it.done } : it));
    onSaveChecklist(order.id, order.stage, next);
  };
  const addItem = () => {
    const label = draft.trim();
    if (!label) return;
    onSaveChecklist(order.id, order.stage, [...items, { label, done: false }]);
    setDraft("");
  };

  return (
    <div>
      {items.length === 0 && <p style={{ fontSize: 13, color: TOKENS.jadeSoft }}>{t.checklistEmpty}</p>}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {items.map((it, idx) => (
          <button
            key={idx}
            onClick={() => toggle(idx)}
            style={{
              display: "flex", alignItems: "center", gap: 10, textAlign: "left", cursor: "pointer",
              background: TOKENS.paperDeep, border: `1px solid ${TOKENS.brassDeep}33`, borderRadius: 8, padding: "9px 12px",
            }}
          >
            <span style={{
              width: 17, height: 17, borderRadius: 4, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
              border: `1.5px solid ${it.done ? TOKENS.jade : TOKENS.brassDeep}`, background: it.done ? TOKENS.jade : "transparent",
            }}>
              {it.done && <Check size={12} color={TOKENS.paper} />}
            </span>
            <span style={{ fontSize: 13.5, color: it.done ? TOKENS.jadeSoft : TOKENS.jade, textDecoration: it.done ? "line-through" : "none" }}>
              {it.label}
            </span>
          </button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") addItem(); }}
          placeholder={t.checklistItemPh}
          style={{ flex: 1, fontSize: 13, padding: "8px 10px", borderRadius: 8, border: `1px solid ${TOKENS.brassDeep}55`, background: TOKENS.paper, color: TOKENS.jade }}
        />
        <button
          onClick={addItem}
          style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12.5, fontWeight: 600, padding: "8px 12px", borderRadius: 8, cursor: "pointer", border: `1px solid ${TOKENS.brassDeep}55`, background: "none", color: TOKENS.jade }}
        >
          <Plus size={13} /> {t.addChecklistItem}
        </button>
      </div>
    </div>
  );
}

function IssuesTab({ order, issues, lang, t, TOKENS, onAddIssue, onSetIssueResolved, onDeleteIssue }) {
  const [formOpen, setFormOpen] = useState(false);
  const [draft, setDraft] = useState({ category: "other", title: "", impact: "medium", suggestedFix: "", escalateTo: "" });

  const prefill = (p) => setDraft({
    category: p.category, title: p.title[lang] || p.title.en, impact: p.impact,
    suggestedFix: p.suggestedFix[lang] || p.suggestedFix.en, escalateTo: "",
  });

  const save = async () => {
    if (!draft.title.trim()) return;
    await onAddIssue({ orderId: order.id, ...draft, title: draft.title.trim(), suggestedFix: draft.suggestedFix.trim(), escalateTo: draft.escalateTo.trim() });
    setDraft({ category: "other", title: "", impact: "medium", suggestedFix: "", escalateTo: "" });
    setFormOpen(false);
  };

  const open = issues.filter((i) => !i.resolved);
  const resolved = issues.filter((i) => i.resolved);

  return (
    <div>
      {issues.length === 0 && !formOpen && <p style={{ fontSize: 13, color: TOKENS.jadeSoft }}>{t.issuesEmpty}</p>}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {[...open, ...resolved].map((i) => (
          <div key={i.id} style={{
            background: TOKENS.paperDeep, border: `1px solid ${i.resolved ? TOKENS.brassDeep + "22" : TOKENS.lacquer + "44"}`,
            borderRadius: 10, padding: 12, opacity: i.resolved ? 0.65 : 1,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4, color: TOKENS.jadeSoft, background: TOKENS.paper, borderRadius: 5, padding: "2px 6px" }}>
                  {(ISSUE_CATEGORIES.find((c) => c.id === i.category)?.label[lang]) || i.category}
                </span>
                <span style={{ fontSize: 10, fontWeight: 700, color: IMPACT_COLOR(i.impact, TOKENS) }}>
                  {{ low: t.impactLow, medium: t.impactMedium, high: t.impactHigh }[i.impact] || i.impact}
                </span>
              </div>
              {i.resolved ? <CheckCircle2 size={15} color={TOKENS.jadeSoft} /> : <AlertTriangle size={15} color={TOKENS.lacquer} />}
            </div>
            <div style={{ fontSize: 13.5, fontWeight: 600, marginTop: 6, color: TOKENS.jade }}>{i.title}</div>
            {i.suggestedFix && <div style={{ fontSize: 12.5, color: TOKENS.jadeSoft, marginTop: 3 }}>{t.issueFixLabel}: {i.suggestedFix}</div>}
            {i.escalateTo && <div style={{ fontSize: 12.5, color: TOKENS.brassOnPaper, marginTop: 3 }}>{t.issueEscalateLabel}: {i.escalateTo}</div>}
            <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
              <button
                onClick={() => onSetIssueResolved(i.id, !i.resolved)}
                style={{
                  display: "flex", alignItems: "center", gap: 5, fontSize: 11.5, fontWeight: 600, padding: "5px 9px", borderRadius: 7, cursor: "pointer",
                  border: `1px solid ${TOKENS.brassDeep}55`, background: "none", color: TOKENS.jade,
                }}
              >
                {i.resolved ? <><RotateCcw size={12} /> {t.issueReopen}</> : <><CheckCircle2 size={12} /> {t.issueResolve}</>}
              </button>
              <ConfirmDelete TOKENS={TOKENS} compact label={t.remove} confirmLabel={t.deleteConfirm} onConfirm={() => onDeleteIssue(i.id)} />
            </div>
          </div>
        ))}
      </div>

      {formOpen ? (
        <div style={{ marginTop: 12, background: TOKENS.paperDeep, border: `1px solid ${TOKENS.brassDeep}33`, borderRadius: 10, padding: 12 }}>
          <div style={{ fontSize: 11, color: TOKENS.jadeSoft, marginBottom: 6 }}>{t.issuePlaybookHint}</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
            {ISSUE_PLAYBOOK.map((p, idx) => (
              <button key={idx} onClick={() => prefill(p)} style={{ fontSize: 11, padding: "5px 9px", borderRadius: 999, cursor: "pointer", border: `1px solid ${TOKENS.brassDeep}55`, background: "none", color: TOKENS.jadeSoft }}>
                {p.title[lang] || p.title.en}
              </button>
            ))}
          </div>
          <input
            value={draft.title}
            onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
            placeholder={t.issueTitlePh}
            style={{ width: "100%", fontSize: 13, padding: "8px 10px", borderRadius: 8, border: `1px solid ${TOKENS.brassDeep}55`, background: TOKENS.paper, color: TOKENS.jade, marginBottom: 8 }}
          />
          <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
            <label style={{ fontSize: 11.5, color: TOKENS.jadeSoft, display: "flex", flexDirection: "column", gap: 4 }}>
              {t.issueCategoryLabel}
              <select value={draft.category} onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value }))} style={{ fontSize: 12.5, padding: "6px 8px", borderRadius: 7, border: `1px solid ${TOKENS.brassDeep}55`, background: TOKENS.paper, color: TOKENS.jade }}>
                {ISSUE_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label[lang]}</option>)}
              </select>
            </label>
            <label style={{ fontSize: 11.5, color: TOKENS.jadeSoft, display: "flex", flexDirection: "column", gap: 4 }}>
              {t.issueImpactLabel}
              <select value={draft.impact} onChange={(e) => setDraft((d) => ({ ...d, impact: e.target.value }))} style={{ fontSize: 12.5, padding: "6px 8px", borderRadius: 7, border: `1px solid ${TOKENS.brassDeep}55`, background: TOKENS.paper, color: TOKENS.jade }}>
                <option value="low">{t.impactLow}</option>
                <option value="medium">{t.impactMedium}</option>
                <option value="high">{t.impactHigh}</option>
              </select>
            </label>
          </div>
          <textarea
            value={draft.suggestedFix}
            onChange={(e) => setDraft((d) => ({ ...d, suggestedFix: e.target.value }))}
            placeholder={t.issueFixPh}
            rows={2}
            style={{ width: "100%", fontSize: 13, padding: "8px 10px", borderRadius: 8, border: `1px solid ${TOKENS.brassDeep}55`, background: TOKENS.paper, color: TOKENS.jade, marginBottom: 8, resize: "vertical" }}
          />
          <input
            value={draft.escalateTo}
            onChange={(e) => setDraft((d) => ({ ...d, escalateTo: e.target.value }))}
            placeholder={t.issueEscalatePh}
            style={{ width: "100%", fontSize: 13, padding: "8px 10px", borderRadius: 8, border: `1px solid ${TOKENS.brassDeep}55`, background: TOKENS.paper, color: TOKENS.jade, marginBottom: 10 }}
          />
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={save} style={{ fontSize: 12.5, fontWeight: 600, padding: "8px 14px", borderRadius: 8, cursor: "pointer", border: "none", background: TOKENS.jade, color: TOKENS.paper }}>{t.issueSave}</button>
            <button onClick={() => setFormOpen(false)} style={{ fontSize: 12.5, fontWeight: 600, padding: "8px 14px", borderRadius: 8, cursor: "pointer", border: `1px solid ${TOKENS.brassDeep}55`, background: "none", color: TOKENS.jadeSoft }}>{t.cancel}</button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setFormOpen(true)}
          style={{
            display: "flex", alignItems: "center", gap: 6, marginTop: 12, fontSize: 12.5, fontWeight: 600, padding: "8px 14px",
            borderRadius: 8, cursor: "pointer", border: `1px dashed ${TOKENS.brassDeep}88`, background: "none", color: TOKENS.brassOnPaper,
          }}
        >
          <Plus size={13} /> {t.addIssue}
        </button>
      )}
    </div>
  );
}

function DocumentsTab({ order, t, TOKENS, onOpenDocument }) {
  return (
    <div>
      <p style={{ fontSize: 13, color: TOKENS.jadeSoft, marginTop: 0 }}>{t.documentsHint}</p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button
          onClick={() => onOpenDocument("invoice")}
          style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, padding: "10px 14px", borderRadius: 9, cursor: "pointer", border: `1px solid ${TOKENS.brassDeep}55`, background: TOKENS.paperDeep, color: TOKENS.jade }}
        >
          <FileText size={14} /> {t.generateInvoice}
        </button>
        <button
          onClick={() => onOpenDocument("packing-slip")}
          style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, padding: "10px 14px", borderRadius: 9, cursor: "pointer", border: `1px solid ${TOKENS.brassDeep}55`, background: TOKENS.paperDeep, color: TOKENS.jade }}
        >
          <FileText size={14} /> {t.generatePackingSlip}
        </button>
      </div>
    </div>
  );
}

export default function OrderStepDetail({
  order, issues, lang, t, TOKENS, onClose,
  onUpdateStage, onSaveChecklist, onAddIssue, onSetIssueResolved, onDeleteIssue, onPrintInvoice,
}) {
  const [tab, setTab] = useState("checklist");
  const [docModal, setDocModal] = useState(null); // "invoice" | "packing-slip" | null
  const openIssueCount = issues.filter((i) => !i.resolved).length;

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(28,43,36,0.72)", zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
      onClick={onClose}
    >
      <div
        style={{ background: TOKENS.paper, borderRadius: 16, width: "min(640px, 100%)", maxHeight: "88vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.35)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "18px 20px 12px" }}>
          <div>
            <div style={{ fontSize: 11, color: TOKENS.jadeSoft }}>{order.id}</div>
            <h3 style={{ fontFamily: "Lora, Georgia, serif", fontSize: 20, margin: "2px 0 0", color: TOKENS.jade }}>{order.customerName}</h3>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={() => onPrintInvoice(order)} title={t.printInvoice} style={{ background: "none", border: `1px solid ${TOKENS.brassDeep}55`, borderRadius: 8, width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              <Printer size={14} color={TOKENS.jadeSoft} />
            </button>
            <button onClick={onClose} aria-label={t.close} style={{ background: "none", border: `1px solid ${TOKENS.brassDeep}55`, borderRadius: 8, width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              <X size={16} color={TOKENS.jadeSoft} />
            </button>
          </div>
        </div>

        {/* Stage stepper — one tap moves the order, same directness as the status stepper in
            the list view (STATUS_STEPS). No separate "preview" mode: this drawer always shows
            the order's actual current stage. */}
        <div style={{ padding: "0 20px" }}>
          <div style={{ fontSize: 11, color: TOKENS.jadeSoft, marginBottom: 6 }}>{t.orderFlowStageLabel}</div>
          <div style={{ display: "flex", gap: 5, overflowX: "auto", paddingBottom: 4 }}>
            {ORDER_STAGES.map((s) => (
              <button
                key={s.id}
                onClick={() => onUpdateStage(order.id, s.id)}
                style={{
                  flex: "0 0 auto", fontSize: 11, padding: "7px 10px", borderRadius: 7, cursor: "pointer", whiteSpace: "nowrap",
                  border: `1px solid ${TOKENS.brassDeep}55`,
                  background: order.stage === s.id ? TOKENS.jade : "transparent",
                  color: order.stage === s.id ? TOKENS.paper : TOKENS.jadeSoft,
                  fontWeight: order.stage === s.id ? 700 : 400,
                }}
              >
                {s.label[lang]}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", gap: 4, padding: "14px 20px 0", borderBottom: `1px solid ${TOKENS.brassDeep}33` }}>
          {[
            { id: "checklist", label: t.checklistTab },
            { id: "issues", label: t.issuesTab, badge: openIssueCount },
            { id: "documents", label: t.documentsTab },
          ].map((tabDef) => (
            <button
              key={tabDef.id}
              onClick={() => setTab(tabDef.id)}
              style={{
                display: "flex", alignItems: "center", gap: 5, fontSize: 13, fontWeight: 600, padding: "8px 4px 10px", marginRight: 14,
                background: "none", border: "none", cursor: "pointer",
                color: tab === tabDef.id ? TOKENS.jade : TOKENS.jadeSoft,
                borderBottom: tab === tabDef.id ? `2px solid ${TOKENS.jade}` : "2px solid transparent",
              }}
            >
              {tabDef.label}
              {!!tabDef.badge && (
                <span style={{ background: TOKENS.lacquer, color: TOKENS.paper, borderRadius: 10, fontSize: 10, fontWeight: 700, padding: "1px 6px" }}>{tabDef.badge}</span>
              )}
            </button>
          ))}
        </div>

        <div style={{ padding: 20 }}>
          {tab === "checklist" && <ChecklistTab order={order} lang={lang} t={t} TOKENS={TOKENS} onSaveChecklist={onSaveChecklist} />}
          {tab === "issues" && (
            <IssuesTab order={order} issues={issues} lang={lang} t={t} TOKENS={TOKENS} onAddIssue={onAddIssue} onSetIssueResolved={onSetIssueResolved} onDeleteIssue={onDeleteIssue} />
          )}
          {tab === "documents" && <DocumentsTab order={order} t={t} TOKENS={TOKENS} onOpenDocument={setDocModal} />}
        </div>
      </div>

      {docModal && <DocumentModal order={order} initialKind={docModal} onClose={() => setDocModal(null)} t={t} TOKENS={TOKENS} />}
    </div>
  );
}

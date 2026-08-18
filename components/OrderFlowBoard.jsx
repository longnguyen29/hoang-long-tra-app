"use client";

import { useState } from "react";
import { AlertTriangle, Printer } from "lucide-react";
import { ORDER_STAGES, stageFromStatus } from "@/lib/constants";
import OrderStepDetail from "./OrderStepDetail";

function stageOf(order) {
  return order.stage || stageFromStatus(order.status);
}

// Kanban view of Orders — a second way to look at the same `orders` state the List view
// above already fetches/polls, grouped by the internal `stage` field instead of a flat list.
// Nothing here owns data: every mutation is a callback into TeaConsole, same pattern as
// TrackingCodeEditor/ConfirmDelete elsewhere in this file.
export default function OrderFlowBoard({
  orders, orderIssues, lang, t, TOKENS,
  onUpdateStage, onSaveChecklist, onAddIssue, onSetIssueResolved, onDeleteIssue, onPrintInvoice,
}) {
  const [openOrderId, setOpenOrderId] = useState(null);
  const openOrder = orders.find((o) => o.id === openOrderId) || null;

  return (
    <div>
      <p style={{ fontSize: 11.5, color: TOKENS.jadeSoft, margin: "0 0 10px" }}>{t.orderFlowClickHint}</p>
      <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 8 }}>
        {ORDER_STAGES.map((stage) => {
          const stageOrders = orders.filter((o) => stageOf(o) === stage.id).slice().reverse();
          return (
            <div
              key={stage.id}
              style={{
                flex: "0 0 236px", background: TOKENS.paperDeep, borderRadius: 12, padding: 10,
                maxHeight: "72vh", display: "flex", flexDirection: "column",
              }}
            >
              <div style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "2px 4px 8px", borderBottom: `1px solid ${TOKENS.brassDeep}33`, marginBottom: 8,
              }}>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: TOKENS.jade }}>{stage.label[lang]}</span>
                <span style={{ fontSize: 11, color: TOKENS.jadeSoft, background: TOKENS.paper, borderRadius: 10, padding: "1px 7px" }}>
                  {stageOrders.length}
                </span>
              </div>

              <div style={{ overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
                {stageOrders.map((o) => {
                  const openIssues = orderIssues.filter((i) => i.orderId === o.id && !i.resolved).length;
                  return (
                    <div
                      key={o.id}
                      onClick={() => setOpenOrderId(o.id)}
                      style={{
                        background: TOKENS.paper, border: `1px solid ${TOKENS.brassDeep}${o.unread ? "88" : "33"}`,
                        borderRadius: 10, padding: 10, cursor: "pointer",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 6 }}>
                        <span style={{
                          fontSize: 9.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4,
                          background: o.type === "retail" ? `${TOKENS.jadeSoft}22` : `${TOKENS.brass}22`,
                          color: o.type === "retail" ? TOKENS.jadeSoft : TOKENS.brassDeep, padding: "2px 6px", borderRadius: 5,
                        }}>
                          {o.type === "retail" ? t.shopTitle : t.orderTitle}
                        </span>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          {openIssues > 0 && (
                            <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 10.5, fontWeight: 700, color: TOKENS.lacquer }}>
                              <AlertTriangle size={11} /> {openIssues}
                            </span>
                          )}
                          <button
                            onClick={(e) => { e.stopPropagation(); onPrintInvoice(o); }}
                            title={t.printInvoice}
                            style={{ background: "none", border: "none", cursor: "pointer", padding: 2, display: "flex" }}
                          >
                            <Printer size={12} color={TOKENS.jadeSoft} />
                          </button>
                        </div>
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 600, marginTop: 6, color: TOKENS.jade }}>{o.customerName}</div>
                      <div style={{ fontSize: 11, color: TOKENS.jadeSoft, marginTop: 2 }}>
                        {o.type === "retail" ? `${o.totalItems} ${t.pcs}` : `${o.totalKg} ${t.kg}`}
                      </div>
                    </div>
                  );
                })}
                {stageOrders.length === 0 && (
                  <div style={{ fontSize: 11.5, color: TOKENS.jadeSoft, opacity: 0.6, padding: "6px 2px" }}>—</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {openOrder && (
        <OrderStepDetail
          order={openOrder}
          issues={orderIssues.filter((i) => i.orderId === openOrder.id)}
          lang={lang}
          t={t}
          TOKENS={TOKENS}
          onClose={() => setOpenOrderId(null)}
          onUpdateStage={onUpdateStage}
          onSaveChecklist={onSaveChecklist}
          onAddIssue={onAddIssue}
          onSetIssueResolved={onSetIssueResolved}
          onDeleteIssue={onDeleteIssue}
          onPrintInvoice={onPrintInvoice}
        />
      )}
    </div>
  );
}

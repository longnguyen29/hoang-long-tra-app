"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { ArrowRight, CircleCheck, ClipboardCheck, Leaf, Truck } from "lucide-react";
import { orderStageMeta, reconcileOrderStage } from "@/lib/order-flow";
import styles from "./OrderJourneyMap.module.css";

const phases = [
  { id: "confirm", label: "Chốt đơn", icon: ClipboardCheck, stages: ["new_order", "confirm_details"],
    detail: "Kiểm tra mặt hàng, số lượng, giá, địa chỉ và mốc giao. Khi các bên đã thống nhất, mở xác nhận đơn ngay trong chi tiết đơn." },
  { id: "prepare", label: "Chuẩn bị trà", icon: Leaf, stages: ["prepare_materials", "production", "packing"],
    detail: "Đơn sỉ có thể qua chuẩn bị trà và sản xuất trước khi đóng gói. Đơn lẻ thường đi từ xác nhận thẳng đến đóng gói." },
  { id: "ship", label: "Đang giao", icon: Truck, stages: ["shipping"],
    detail: "Theo dõi vận đơn. Khi bàn giao, dùng biên bản giao nhận trong chi tiết đơn để đối chiếu mã lô và số lượng thực nhận." },
  { id: "complete", label: "Hoàn tất", icon: CircleCheck, stages: ["completed"],
    detail: "Tra lại đơn đã đóng và lịch sử của khách khi cần đối chiếu hoặc chuẩn bị đơn tiếp theo." },
];

function summarize(orders) {
  const stages = new Map();
  for (const order of orders) {
    const stage = reconcileOrderStage(order.stage, order.status);
    const entry = stages.get(stage) || { count: 0, blocked: 0 };
    entry.count += 1;
    if (stage !== "completed" && order.health === "blocked") entry.blocked += 1;
    stages.set(stage, entry);
  }
  return phases.map(phase => {
    const steps = phase.stages.map(id => ({ ...orderStageMeta(id), count: 0, blocked: 0, ...stages.get(id) }));
    return {
      ...phase, steps,
      count: steps.reduce((sum, step) => sum + step.count, 0),
      blocked: steps.reduce((sum, step) => sum + step.blocked, 0),
    };
  });
}

export default function OrderJourneyMap({ orders = [], loading, unavailable }) {
  const id = useId();
  const journey = summarize(orders);
  const activePhases = journey.slice(0, -1);
  const [selection, setSelection] = useState(null);
  const current = journey.find(phase => phase.id === selection)
    || activePhases.find(phase => phase.blocked) || activePhases.find(phase => phase.count) || journey[0];
  const total = activePhases.reduce((sum, phase) => sum + phase.count, 0);
  const blocked = activePhases.reduce((sum, phase) => sum + phase.blocked, 0);
  const countsReady = !loading && !unavailable;

  return <section className={styles.map} aria-labelledby={id}>
    <header className={styles.header}>
      <h2 id={id}>Luồng đơn trà</h2>
      <p aria-live="polite">{loading ? "Đang tải đơn hàng…" : unavailable ? "Chưa tải được số liệu đơn hàng."
        : <><b>{total} đơn đang mở</b>{blocked > 0 && <span className={styles.blocked}> · {blocked} đơn bị vướng</span>}</>}</p>
    </header>
    <div className={styles.track} role="group" aria-label="Các chặng xử lý đơn trà">
      {journey.map(({ id: phaseId, label, icon: Icon, count, blocked: phaseBlocked }) =>
        <button key={phaseId} type="button" aria-pressed={phaseId === current.id} aria-controls={id + "-detail"}
          className={styles.stop} onClick={() => setSelection(phaseId)}>
          <span className={styles.icon}><Icon size={20} aria-hidden="true" /></span>
          <span className={styles.label}>{label}</span>
          <span className={styles.count}>{countsReady ? count : "—"} <small>đơn</small></span>
          {countsReady && phaseBlocked > 0 && <span className={styles.blocked}>{phaseBlocked} bị vướng</span>}
        </button>)}
    </div>
    <div className={styles.detail} id={id + "-detail"}>
      <div><h3>{current.label}</h3><p>{current.detail}</p></div>
      <ul>{current.steps.map(step => <li key={step.id}>
        <Link href={`/admin/orders?stage=${step.id}#orders`}>
          <span>{step.label}{countsReady && step.blocked > 0 && <small className={styles.blocked}>{step.blocked} bị vướng</small>}</span>
          <b>{countsReady ? step.count : "—"}</b>
          <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </li>)}</ul>
    </div>
  </section>;
}

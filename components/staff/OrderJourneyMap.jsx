"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { ArrowRight, CircleCheck, ClipboardCheck, Layers3, Leaf, RotateCcw, RotateCw, Truck } from "lucide-react";
import { orderStageMeta, reconcileOrderStage } from "@/lib/order-flow";
import styles from "./OrderJourneyMap.module.css";

const phases = [
  { id: "confirm", zone: "Bàn đơn hàng", label: "Chốt đơn", icon: ClipboardCheck, stages: ["new_order", "confirm_details"],
    detail: "Kiểm tra mặt hàng, số lượng, giá, địa chỉ và mốc giao. Khi các bên đã thống nhất, mở xác nhận đơn ngay trong chi tiết đơn." },
  { id: "prepare", zone: "Xưởng trà", label: "Chuẩn bị trà", icon: Leaf, stages: ["prepare_materials", "production", "packing"],
    detail: "Đơn sỉ có thể qua chuẩn bị trà và sản xuất trước khi đóng gói. Đơn lẻ thường đi từ xác nhận thẳng đến đóng gói." },
  { id: "ship", zone: "Khu xuất hàng", label: "Đang giao", icon: Truck, stages: ["shipping"],
    detail: "Theo dõi vận đơn. Khi bàn giao, dùng biên bản giao nhận trong chi tiết đơn để đối chiếu mã lô và số lượng thực nhận." },
  { id: "complete", zone: "Hồ sơ đơn", label: "Hoàn tất", icon: CircleCheck, stages: ["completed"],
    detail: "Tra lại đơn đã đóng và lịch sử của khách khi cần đối chiếu hoặc chuẩn bị đơn tiếp theo." },
];

function summarize(orders) {
  const stages = new Map();
  for (const order of orders) {
    const stage = reconcileOrderStage(order.stage, order.status);
    const entry = stages.get(stage) || { count: 0, blocked: 0, waiting: 0 };
    entry.count += 1;
    if (stage !== "completed" && order.health === "blocked") entry.blocked += 1;
    if (stage !== "completed" && order.health === "waiting") entry.waiting += 1;
    stages.set(stage, entry);
  }
  return phases.map(phase => {
    const steps = phase.stages.map(id => ({ ...orderStageMeta(id), count: 0, blocked: 0, waiting: 0, ...stages.get(id) }));
    return {
      ...phase, steps,
      count: steps.reduce((sum, step) => sum + step.count, 0),
      waiting: steps.reduce((sum, step) => sum + step.waiting, 0),
      blocked: steps.reduce((sum, step) => sum + step.blocked, 0),
    };
  });
}

const refreshMs = 30000;
const cameraAngles = [-14, 0, 14];
const workspaceLinks = [
  ["pipeline", "/admin/pipeline", "Khách & báo giá"],
  ["operations", "/admin/operations", "Vận hành & tài chính"],
  ["procedures", "/admin/procedures", "Quy trình"],
  ["documents", "/admin/documents", "Tài liệu"],
];

export default function OrderJourneyMap({ supabase, allowedModules }) {
  const id = useId();
  const [snapshot, setSnapshot] = useState(null);
  const [unavailable, setUnavailable] = useState(false);
  const [angle, setAngle] = useState(1);
  const [flat, setFlat] = useState(false);
  const [selection, setSelection] = useState(null);

  useEffect(() => {
    let stopped = false;
    let busy = false;
    const controller = new AbortController();
    async function refresh() {
      if (stopped || busy || document.hidden) return;
      busy = true;
      try {
        const { data, count, error } = await supabase.from("orders")
          .select("stage,status,health", { count: "exact" })
          .order("ts", { ascending: false }).order("id", { ascending: false }).limit(1000)
          .abortSignal(controller.signal);
        if (error || !Array.isArray(data)) throw new Error("order_snapshot_unavailable");
        if (!stopped) {
          setSnapshot({ orders: data, total: count ?? data.length, at: new Date() });
          setUnavailable(false);
        }
      } catch {
        if (!stopped) setUnavailable(true);
      } finally {
        busy = false;
      }
    }
    refresh();
    const timer = window.setInterval(refresh, refreshMs);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      stopped = true;
      controller.abort();
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [supabase]);

  const journey = summarize(snapshot?.orders || []);
  const activePhases = journey.slice(0, -1);
  const current = journey.find(phase => phase.id === selection)
    || activePhases.find(phase => phase.blocked) || activePhases.find(phase => phase.count) || journey[0];
  const totals = [
    ["Đang xử lý", "count"], ["Đang chờ", "waiting"], ["Bị vướng", "blocked"],
  ].map(([label, key]) => ({ label, key, value: activePhases.reduce((sum, phase) => sum + phase[key], 0) }));
  const links = workspaceLinks.filter(([key]) => allowedModules === null || allowedModules.includes(key));

  return <section className={styles.map} aria-labelledby={id}>
    <header className={styles.header}>
      <div><h2 id={id}>Toàn cảnh vận hành</h2>
        <p className={styles.status} data-stale={unavailable}>{unavailable
          ? snapshot ? "Mất kết nối · đang hiển thị lượt cập nhật gần nhất" : "Chưa tải được số liệu đơn hàng"
          : snapshot ? `Cập nhật lúc ${snapshot.at.toLocaleTimeString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}` : "Đang tải số liệu đơn hàng…"}</p>
      </div>
      <dl className={styles.totals}>{totals.map(({ label, key, value }) =>
        <div key={key} data-kind={key}><dt>{label}</dt><dd>{snapshot ? value : "—"}</dd></div>)}</dl>
    </header>
    {snapshot && snapshot.total > snapshot.orders.length && <p className={styles.coverage}>Số liệu từ {snapshot.orders.length.toLocaleString("vi-VN")} đơn mới nhất trên tổng {snapshot.total.toLocaleString("vi-VN")} đơn.</p>}
    <div className={styles.scene} data-flat={flat}>
      <div className={styles.controls} role="group" aria-label="Điều khiển góc nhìn">
        <button type="button" disabled={flat || angle === 0} onClick={() => setAngle(value => value - 1)} aria-label="Xoay trái"><RotateCcw size={16} /></button>
        <button type="button" disabled={flat || angle === 2} onClick={() => setAngle(value => value + 1)} aria-label="Xoay phải"><RotateCw size={16} /></button>
        <button type="button" aria-pressed={flat} onClick={() => setFlat(value => !value)}><Layers3 size={16} aria-hidden="true" />{flat ? "Mở góc 3D" : "Xem dạng phẳng"}</button>
      </div>
      <div className={styles.camera}>
        <div className={styles.track} style={{ "--turn": `${cameraAngles[angle]}deg` }} role="group" aria-label="Các khu xử lý đơn trà">
          {journey.map(({ id: phaseId, zone, label, icon: Icon, count, blocked }) =>
            <button key={phaseId} type="button" data-phase={phaseId} data-busy={Boolean(snapshot && count)}
              aria-pressed={phaseId === current.id} aria-controls={id + "-detail"} className={styles.stop} onClick={() => setSelection(phaseId)}>
              <span className={styles.zone}>{zone}</span>
              <span className={styles.icon}><Icon size={23} aria-hidden="true" /></span>
              <span className={styles.count}>{snapshot ? count : "—"} <small>đơn</small></span>
              <span className={styles.label}>{label}</span>
              {snapshot && blocked > 0 && <span className={styles.blocked}>{blocked} bị vướng</span>}
            </button>)}
        </div>
      </div>
    </div>
    <div className={styles.detail} id={id + "-detail"}>
      <div><h3>{current.zone} · {current.label}</h3><p>{current.detail}</p></div>
      <ul>{current.steps.map(step => <li key={step.id}>
        <Link href={`/admin/orders?stage=${step.id}#orders`}>
          <span>{step.label}{snapshot && step.blocked > 0 && <small className={styles.blocked}>{step.blocked} bị vướng</small>}</span>
          <b>{snapshot ? step.count : "—"}</b><ArrowRight size={16} aria-hidden="true" />
        </Link>
      </li>)}</ul>
    </div>
    {links.length > 0 && <nav className={styles.shortcuts} aria-label="Công cụ vận hành">{links.map(([key, href, label]) =>
      <Link key={key} href={href}>{label}<ArrowRight size={14} aria-hidden="true" /></Link>)}</nav>}
  </section>;
}

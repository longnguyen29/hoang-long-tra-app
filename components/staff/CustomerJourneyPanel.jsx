"use client";

import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  FileText,
  FlaskConical,
  History,
  PackageCheck,
  ReceiptText,
  Send,
  Truck,
} from "lucide-react";
import { relativeDueLabel } from "@/lib/customer-journey";
import { shortDate } from "@/lib/trade-pipeline";
import styles from "./CustomerJourneyPanel.module.css";

const EVENT_ICONS = {
  relationship: History,
  sample: PackageCheck,
  recipe: FlaskConical,
  test: FlaskConical,
  quote: FileText,
  order: ReceiptText,
  delivery: Truck,
  payment: CheckCircle2,
};

function ActionControl({ action, onCommand }) {
  const label = action.kind === "payment" ? "Mở đơn" : action.kind === "sample" ? "Xử lý mẫu" : action.kind === "recipe" ? "Mở công thức" : "Thực hiện";
  if (action.command) {
    return <button type="button" onClick={() => onCommand(action)}>{label}<ArrowRight/></button>;
  }
  if (action.href?.startsWith("tel:")) {
    return <a href={action.href}>Gọi khách<ArrowRight/></a>;
  }
  if (action.href) {
    return <Link href={action.href}>{label}<ArrowRight/></Link>;
  }
  return null;
}

export default function CustomerJourneyPanel({ journey, onCommand }) {
  if (!journey) return null;
  const counts = journey.counts || {};

  return <section className={styles.journey} aria-labelledby="customer-journey-title">
    <header>
      <div>
        <p>Customer journey</p>
        <h3 id="customer-journey-title">Hành trình khách hàng</h3>
      </div>
      <span>{journey.timeline.length} dấu mốc</span>
    </header>

    <dl className={styles.counts} aria-label="Dữ liệu đã kết nối">
      <div><dt>Mẫu</dt><dd>{counts.samples || 0}</dd></div>
      <div><dt>Công thức</dt><dd>{counts.recipes || 0}</dd></div>
      <div><dt>Báo giá</dt><dd>{counts.quotes || 0}</dd></div>
      <div><dt>Đơn</dt><dd>{counts.orders || 0}</dd></div>
    </dl>

    <div className={styles.actionSection}>
      <div className={styles.sectionTitle}><CalendarClock/><span><b>Việc hệ thống đề xuất</b><small>Dựa trên trạng thái thực tế, không tạo thêm danh sách riêng.</small></span></div>
      {journey.actions.length ? <div className={styles.actions}>{journey.actions.slice(0, 4).map((action, index) => <article key={action.key} data-priority={action.priority}>
        <span className={styles.actionNumber}>{String(index + 1).padStart(2, "0")}</span>
        <div><b>{action.title}</b><small>{action.detail}</small><time dateTime={action.dueAt}>{relativeDueLabel(action.dueAt)}</time></div>
        <ActionControl action={action} onCommand={onCommand}/>
      </article>)}</div> : <div className={styles.clear}><CheckCircle2/><span><b>Chưa có việc cần xử lý.</b><small>Hành trình đang đúng nhịp; đặt bước tiếp theo khi có cuộc trao đổi mới.</small></span></div>}
    </div>

    <details className={styles.timeline}>
      <summary><History/>Xem lịch sử đã kết nối <span>{journey.lastActivityAt ? `Mới nhất ${shortDate(journey.lastActivityAt)}` : ""}</span></summary>
      <ol>{journey.timeline.slice(0, 10).map((event) => {
        const Icon = EVENT_ICONS[event.type] || History;
        const content = <><Icon/><span><b>{event.title}</b>{event.detail && <small>{event.detail}</small>}<time dateTime={event.at}>{shortDate(event.at)}{event.status ? ` · ${event.status}` : ""}</time></span></>;
        return <li key={event.id}>{event.href ? <Link href={event.href}>{content}</Link> : <div>{content}</div>}</li>;
      })}</ol>
    </details>
  </section>;
}

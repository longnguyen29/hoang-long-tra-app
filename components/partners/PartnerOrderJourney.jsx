import { Check, ChevronDown, Circle, Truck } from "lucide-react";
import { carrierLabel } from "@/lib/carrier-tracking";
import { COMMISSION_STATUS, formatPartnerMoney } from "@/lib/partner-network";
import { partnerDateLabel, partnerOrderCommission, partnerOrderJourney } from "@/lib/partner-order-journey";
import { sellingUnitLabel } from "@/lib/selling-units";
import styles from "./PartnerOrderJourney.module.css";

const number = value => new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 3 }).format(value);

export default function PartnerOrderJourney({ order, commission, businessName, compact = false }) {
  if (!order?.id) return null;
  const journey = partnerOrderJourney(order);
  const money = partnerOrderCommission(order, commission);
  return <article className={styles.card} aria-label={`Tiến độ đơn ${order.id}`}>
    <header className={styles.header}><div><p className={styles.reference}>{order.id}</p><h3>{businessName || order.business_name || order.customer_name || "Đơn của khách giới thiệu"}</h3><p className={styles.date}>Tạo {partnerDateLabel(order.ts)}{journey.quantity ? ` · ${journey.quantity}` : ""}</p></div><span className={styles.chip} data-health={order.health}>{journey.stageLabel}</span></header>
    <ol className={styles.progress} aria-label="Giai đoạn đơn hàng">{journey.steps.map(step => <li key={step.id} data-state={step.state} aria-current={step.state === "current" ? "step" : undefined}>{step.state === "past" ? <Check size={14} aria-hidden="true"/> : <Circle size={12} aria-hidden="true"/>}<span>{step.label}</span></li>)}</ol>
    <div className={styles.next}><span>Bước tiếp theo</span><p>{journey.nextAction}</p></div>
    <dl className={styles.facts}><div><dt>Tiến độ</dt><dd data-health={order.health}>{journey.health}</dd></div><div><dt>Giao hàng dự kiến</dt><dd>{partnerDateLabel(journey.deliveryDueAt)}</dd></div><div><dt>Thanh toán của khách</dt><dd>{journey.collectionComplete ? "Đã ghi nhận thu đủ" : "Chưa xác nhận thu đủ"}</dd></div><div><dt>Cập nhật gần nhất</dt><dd>{partnerDateLabel(journey.lastUpdated, true)}</dd></div></dl>
    {journey.delivery && <section className={styles.delivery} aria-label="Trạng thái giao hàng"><Truck size={19} aria-hidden="true"/><div><strong>{journey.delivery.label}</strong><p>{journey.delivery.summary}</p>{order.tracking_code && <p>{carrierLabel(order.shipping_carrier)} · <span className={styles.tracking}>{order.tracking_code}</span></p>}{order.delivered_at && <p>Ghi nhận giao: {partnerDateLabel(order.delivered_at, true)}</p>}</div></section>}
    {order.public_note && <p className={styles.publicNote}>{order.public_note}</p>}
    {!compact && <>
      <details className={styles.details}><summary>Sản phẩm trong đơn<ChevronDown size={16} aria-hidden="true"/></summary>{journey.lines.length ? <ul className={styles.lines}>{journey.lines.map((line, index) => <li key={`${line.name}-${index}`}><span>{line.name}</span><strong>{line.qty == null ? "Chưa rõ số lượng" : `${number(line.qty)}${line.unit ? ` ${sellingUnitLabel(line.unit)}` : " · chưa rõ đơn vị"}`}</strong></li>)}</ul> : <p className={styles.note}>Chưa có sản phẩm được ghi nhận.</p>}</details>
      <section className={styles.commission} aria-label="Hoa hồng của đơn"><div className={styles.commissionHeading}><h4>Hoa hồng đơn này</h4>{money.status && <span className={styles.chip}>{COMMISSION_STATUS[money.status] || "Đang đối soát"}</span>}</div><dl className={styles.money}><div><dt>Dự kiến từ Hoàng Long</dt><dd>{formatPartnerMoney(money.forecast)}</dd></div><div><dt>Tạm tính sau đối soát</dt><dd>{formatPartnerMoney(money.provisional)}</dd></div><div><dt>Đã duyệt</dt><dd>{formatPartnerMoney(money.approved)}</dd></div><div><dt>Đã ghi nhận chi trả</dt><dd>{formatPartnerMoney(money.paid)}</dd></div></dl>{order.forecast_note && <p className={styles.note}><strong>Cơ sở dự kiến:</strong> {order.forecast_note}</p>}<p className={styles.note}>Dự kiến để theo dõi, chưa phải khoản được cam kết hoặc đã trả. Kết quả có thể tăng hoặc giảm sau khi xác nhận tiền thực thu, chi phí và điều chỉnh được duyệt.</p>{money.stale && <p className={styles.warning} role="status">Dữ liệu đơn đã đổi; đang chờ đối soát lại. Khoản đã chi trả vẫn được giữ nguyên.</p>}<dl className={styles.facts}><div><dt>Dự kiến trả hoa hồng</dt><dd>{partnerDateLabel(journey.expectedPaymentOn)}</dd></div><div><dt>Đã ghi nhận trả ngày</dt><dd>{partnerDateLabel(money.paidAt)}</dd></div></dl><p className={styles.note}>Ngày giao hàng và ngày trả hoa hồng là hai mốc riêng. Hoàng Long chỉ ghi nhận chi trả sau khi duyệt đối soát và khách đã thanh toán đủ.</p></section>
    </>}
  </article>;
}

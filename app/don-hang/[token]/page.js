import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, Clock3, Info, MessageCircle, PackageCheck, RefreshCw, ExternalLink, ScanLine, Truck, WalletCards } from "lucide-react";
import { carrierLabel } from "@/lib/carrier-tracking";
import { ORDER_STAGES, orderStageIndex, reconcileOrderStage, orderStagesForType } from "@/lib/order-flow";
import { withPaymentBankOverride } from "@/lib/payment-settings";
import { createAdminClient } from "@/lib/supabase/admin";
import { publicDeliveryState, latestOrderUpdate, publicOrderLines, orderQuantitySummary, carrierTrackingUrl } from "@/lib/public-order-journey";
import { CopyTrackingCode, ReorderRequest } from "./JourneyActions";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = {
  title: "Theo dõi đơn hàng — Hoàng Long Trà",
  description: "Xem hành trình đơn hàng Hoàng Long Trà.",
  robots: { index: false, follow: false, nocache: true },
};

const STATUS_COPY = {
  new_order: ["Nhà đã nhận đơn của bạn.", "Chúng tôi đang kiểm tra thông tin trước khi bắt đầu chuẩn bị trà."],
  confirm_details: ["Đơn đang được xác nhận.", "Thông tin sản phẩm, số lượng và lịch giao đang được chốt lại."],
  prepare_materials: ["Trà đang được chuẩn bị.", "Nhà đang giữ đủ trà, bao bì và nhãn cho đơn của bạn."],
  production: ["Mẻ trà đang được hoàn thiện.", "Trà đang đi qua các công đoạn cần thiết trước khi đóng gói."],
  packing: ["Đơn đang được đóng gói.", "Số lượng, nhãn và niêm phong đang được kiểm tra lần cuối."],
  shipping: ["Kiện trà đang trên đường tới bạn.", "Đơn vị vận chuyển đang cập nhật hành trình của kiện hàng."],
  completed: ["Đơn đã đến nơi.", "Cảm ơn bạn đã chọn trà của Nhà Hoàng Long."],
};

function dateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function shortDate(value) {
  const [year, month, day] = String(value || "").split("-");
  return year && month && day ? `${day}/${month}/${year}` : "—";
}

const money = (value) => new Intl.NumberFormat("vi-VN", {
  style: "currency", currency: "VND", maximumFractionDigits: 0,
}).format(Number(value || 0));

function vietQrUrl(payment, paymentReference, amount) {
  if (!payment?.bin || !payment?.account_number || amount <= 0) return "";
  const name = encodeURIComponent(payment.account_name || "");
  const info = encodeURIComponent(paymentReference);
  return `https://img.vietqr.io/image/${encodeURIComponent(payment.bin)}-${encodeURIComponent(payment.account_number)}-compact2.png?accountName=${name}&addInfo=${info}&amount=${Math.round(amount)}`;
}

async function readOrder(token) {
  if (!/^[0-9a-f-]{36}$/i.test(token || "")) return null;
  const admin = createAdminClient();
  const { data: order, error } = await admin
    .from("orders")
    .select("id,ts,type,lines,status,stage,tracking_code,shipping_carrier,carrier_status_code,carrier_status_name,carrier_status_at,delivered_at,payment_method,estimated_total")
    .eq("public_tracking_token", token)
    .maybeSingle();
  if (error) {
    console.error("Could not load public order journey", error);
    return null;
  }
  if (!order) return null;
  const [{ data: receivable }, { data: lastEvent }, { data: payment }] = await Promise.all([
    admin.from("receivables").select("invoice_number,issued_at,due_at,total,paid,status,payment_terms").eq("order_id", order.id).neq("status", "void").maybeSingle(),
    admin.from("order_events").select("created_at").eq("order_id", order.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    admin.from("settings_payment").select("bin,bank_short_name,account_number,account_name").eq("id", 1).maybeSingle(),
  ]);
  return {
    order,
    receivable,
    lastEventAt: lastEvent?.created_at,
    payment: withPaymentBankOverride(payment || { bank_short_name: "", account_number: "", account_name: "" }),
  };
}

export default async function PublicOrderJourneyPage({ params }) {
  const { token } = await params;
  const result = await readOrder(token);
  if (!result) notFound();
  const { order, receivable, payment, lastEventAt } = result;

  const stage = reconcileOrderStage(order.stage, order.status);
  const currentIndex = orderStageIndex(stage);
  const delivery = publicDeliveryState(order, stage);
  const [headline, summary] = delivery ? [delivery.headline, delivery.summary] : STATUS_COPY[stage] || STATUS_COPY.new_order;
  const lastUpdated = latestOrderUpdate(order, lastEventAt);
  const lines = publicOrderLines(order.lines);
  const quantities = orderQuantitySummary(lines);
  const stages = orderStagesForType(order.type, stage);
  const pastStages = stages.filter(item => orderStageIndex(item.id) < currentIndex);
  const nextStages = stages.filter(item => orderStageIndex(item.id) >= currentIndex);
  const trackingUrl = carrierTrackingUrl(order.shipping_carrier);
  const paymentTotal = Math.max(0, Number(receivable?.total || 0));
  const recordedPaid = Math.min(paymentTotal, Math.max(0, Number(receivable?.paid || 0)));
  const remaining = Math.max(0, paymentTotal - recordedPaid);
  const paymentReference = receivable?.invoice_number || order.id;
  const qrUrl = vietQrUrl(payment, paymentReference, remaining);

  return (
    <main className={styles.shell}>
      <header className={styles.topbar}>
        <Link href="/" className={styles.brand} aria-label="Về trang chủ Hoàng Long Trà">
          <span aria-hidden="true">皇龍</span>
          <b>Hoàng Long Trà</b>
        </Link>
        <Link href="/" className={styles.back}><ArrowLeft aria-hidden="true"/>Về Nhà</Link>
      </header>

      <section className={styles.intro}>
        <div className={styles.introCopy}>
          <p className={styles.eyebrow}><span>Hành trình đơn</span> {order.id}</p>
          <h1>{headline}</h1>
          <p className={styles.summary}>{summary}</p>
          <div className={styles.updated}><Clock3 aria-hidden="true"/><span>Cập nhật đơn</span> {dateTime(lastUpdated)}</div>
        </div>
        <div className={styles.stageMark} data-complete={stage === "completed"}>
          {stage === "completed" ? <PackageCheck aria-hidden="true"/> : <Truck aria-hidden="true"/>}
          <span><small>Trạng thái hiện tại</small><b>{delivery?.label || ORDER_STAGES[currentIndex].label}</b></span>
        </div>
      </section>

      <section className={styles.shippingOverview} aria-label="Thông tin giao hàng">
        <div className={styles.carrier}>
          <p className={styles.label}>Vận chuyển</p>
          {order.shipping_carrier && order.tracking_code ? <>
            <h2>{carrierLabel(order.shipping_carrier)}</h2>
            <code>{order.tracking_code}</code>
            <CopyTrackingCode code={order.tracking_code}/>
            <p>{order.carrier_status_name || "Chưa có cập nhật từ hãng. Mã vận đơn chưa xác nhận kiện đã được hãng nhận."}</p>
            {order.carrier_status_at && <small>Cập nhật từ hãng: {dateTime(order.carrier_status_at)}</small>}
            {trackingUrl && <a className={styles.carrierLink} href={trackingUrl} target="_blank" rel="noreferrer">Tra cứu trên {carrierLabel(order.shipping_carrier)}<ExternalLink aria-hidden="true"/></a>}
            <small className={styles.trackingHint}>Sao chép mã rồi dán vào trang tra cứu của hãng.</small>
          </> : <><h2>Chờ mã vận đơn</h2><p>Nhà sẽ cập nhật hãng và mã vận đơn tại đây khi có thông tin.</p></>}
        </div>
        <div className={styles.support}>
          <p className={styles.label}>Nhà luôn sẵn sàng hỗ trợ</p>
          <h2>Cần hỏi về đơn này?</h2>
          <p>Gửi mã đơn {order.id} để Nhà kiểm tra nhanh hơn.</p>
          <div className={styles.actions}>
            <a href="https://zalo.me/0903333841" target="_blank" rel="noreferrer"><MessageCircle aria-hidden="true"/>Cần hỗ trợ qua Zalo</a>
            <a href={`/don-hang/${token}`}><RefreshCw aria-hidden="true"/>Tải cập nhật mới</a>
          </div>
        </div>
      </section>

      <section className={styles.body}>
        <div className={styles.journey} aria-label="Các bước của đơn hàng">
          <header><p>Từ Nhà đến bạn</p><h2>Tiến độ đơn hàng</h2></header>
          {pastStages.length > 0 && <details className={styles.pastStages}>
            <summary>{pastStages.length} bước đã đi qua · xem chi tiết</summary>
            <ol>{pastStages.map(item => <li key={item.id} data-state="done"><span className={styles.node}>✓</span><div><b>{item.label}</b><small>Đã đi qua</small></div></li>)}</ol>
          </details>}
          <ol>
            {nextStages.map(item => {
              const state = item.id === stage ? "current" : "next";
              return <li key={item.id} data-state={state} aria-current={state === "current" ? "step" : undefined}>
                <span className={styles.node}>{item.number}</span>
                <div><b>{item.label}</b><small>{state === "current" ? delivery?.label || "Đang thực hiện" : "Bước tiếp theo"}</small></div>
              </li>;
            })}
          </ol>
          {(stage === "completed" || order.delivered_at) && lines.length > 0 && <ReorderRequest reference={order.id} lines={lines}/>}
        </div>

        <aside className={styles.details}>
          <section>
            <p className={styles.label}>Trà trong đơn</p>
            {lines.length > 0 && <>
              <h2>{lines.length} loại trà{quantities ? ` · ${quantities}` : ''}</h2>
              <ul className={styles.teaList}>{lines.map((line, index) => <li key={index}><b>{line.name}</b><span>{new Intl.NumberFormat('vi-VN').format(line.qty)} {line.unit === 'pcs' ? 'gói' : line.unit}</span></li>)}</ul>
            </>}
            <dl>
              <div><dt>Mã đơn</dt><dd>{order.id}</dd></div>
              <div><dt>Ngày nhận đơn</dt><dd>{dateTime(order.ts)}</dd></div>
            </dl>
          </section>

          {receivable && <section className={styles.payment} data-paid={remaining === 0}>
            <div className={styles.paymentHeading}>
              <p className={styles.label}>Thanh toán</p>
              <span>{remaining > 0 ? "Chờ đối soát" : "Đã hoàn tất"}</span>
            </div>
            {remaining > 0 ? <>
              <h2 className={styles.balance}>{money(remaining)}</h2>
              <p className={styles.balanceLabel}>Số tiền còn lại của đơn hàng</p>

              <div className={styles.paymentSummary} aria-label="Tóm tắt thanh toán">
                <div><span>Tổng đơn</span><b>{money(paymentTotal)}</b></div>
                <div><span>Đã ghi nhận</span><b>{money(recordedPaid)}</b></div>
                <div><span>Còn lại</span><b>{money(remaining)}</b></div>
              </div>

              <p className={styles.paymentReminder}><Info aria-hidden="true"/><span>Khi thuận tiện, quý khách vui lòng hoàn tất khoản còn lại. <b>Nếu quý khách đã chuyển khoản, vui lòng bỏ qua lời nhắc này</b>; Nhà sẽ cập nhật sau khi đối chiếu.</span></p>

              <div className={styles.transferSlip}>
                {qrUrl ? <figure>
                  <img src={qrUrl} alt={`Mã QR thanh toán ${money(remaining)}`}/>
                  <figcaption><ScanLine aria-hidden="true"/>Quét QR để điền sẵn số tiền và nội dung</figcaption>
                </figure> : <p className={styles.qrUnavailable}>Mã QR sẽ xuất hiện sau khi Nhà hoàn tất thông tin tài khoản.</p>}
                <dl>
                  <div><dt>Ngân hàng</dt><dd>{payment?.bank_short_name || "—"}</dd></div>
                  <div><dt>Số tài khoản</dt><dd>{payment?.account_number || "—"}</dd></div>
                  <div><dt>Chủ tài khoản</dt><dd>{payment?.account_name || "—"}</dd></div>
                  <div><dt>Nội dung</dt><dd>{paymentReference}</dd></div>
                  {receivable.due_at && <div><dt>Hạn thanh toán</dt><dd>{shortDate(receivable.due_at)}</dd></div>}
                </dl>
              </div>
              <small><WalletCards aria-hidden="true"/>{receivable.payment_terms || "Vui lòng chuyển khoản theo thông tin trên."}</small>
            </> : <div className={styles.paid}><CheckCircle2 aria-hidden="true"/><span><b>Đã thanh toán đủ</b><small>Nhà đã ghi nhận toàn bộ khoản thanh toán của đơn.</small></span></div>}
          </section>}

          <p className={styles.privacy}>Link riêng này hiển thị trà đã đặt, hành trình và thanh toán nếu có. Địa chỉ và thông tin liên hệ của bạn không xuất hiện trên trang.</p>
        </aside>
      </section>
    </main>
  );
}

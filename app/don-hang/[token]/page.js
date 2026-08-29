import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock3, MessageCircle, PackageCheck, RefreshCw, Truck } from "lucide-react";
import { carrierLabel } from "@/lib/carrier-tracking";
import { ORDER_STAGES, orderStageIndex, reconcileOrderStage } from "@/lib/order-flow";
import { createAdminClient } from "@/lib/supabase/admin";
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

async function readOrder(token) {
  if (!/^[0-9a-f-]{36}$/i.test(token || "")) return null;
  const { data, error } = await createAdminClient()
    .from("orders")
    .select("id,ts,status,stage,tracking_code,shipping_carrier,carrier_status_code,carrier_status_name,carrier_status_at,delivered_at")
    .eq("public_tracking_token", token)
    .maybeSingle();
  if (error) {
    console.error("Could not load public order journey", error);
    return null;
  }
  return data;
}

export default async function PublicOrderJourneyPage({ params }) {
  const { token } = await params;
  const order = await readOrder(token);
  if (!order) notFound();

  const stage = reconcileOrderStage(order.stage, order.status);
  const currentIndex = orderStageIndex(stage);
  const [headline, summary] = STATUS_COPY[stage] || STATUS_COPY.new_order;
  const lastUpdated = order.carrier_status_at || order.delivered_at || order.ts;

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
          <p className={styles.eyebrow}>Hành trình đơn {order.id}</p>
          <h1>{headline}</h1>
          <p className={styles.summary}>{summary}</p>
          <div className={styles.updated}><Clock3 aria-hidden="true"/>Cập nhật {dateTime(lastUpdated)}</div>
        </div>
        <div className={styles.stageMark} data-complete={stage === "completed"}>
          {stage === "completed" ? <PackageCheck aria-hidden="true"/> : <Truck aria-hidden="true"/>}
          <span><small>Trạng thái hiện tại</small><b>{ORDER_STAGES[currentIndex].label}</b></span>
        </div>
      </section>

      <section className={styles.body}>
        <div className={styles.journey} aria-label="Các bước của đơn hàng">
          <header><p>Từ Nhà đến bạn</p><h2>Mẻ trà đang ở đâu</h2></header>
          <ol>
            {ORDER_STAGES.map((item, index) => {
              const state = index < currentIndex ? "done" : index === currentIndex ? "current" : "next";
              return (
                <li key={item.id} data-state={state} aria-current={state === "current" ? "step" : undefined}>
                  <span className={styles.node}>{state === "done" ? "✓" : item.number}</span>
                  <div><b>{item.label}</b><small>{state === "done" ? "Đã đi qua" : state === "current" ? "Đang thực hiện" : "Bước tiếp theo"}</small></div>
                </li>
              );
            })}
          </ol>
        </div>

        <aside className={styles.details}>
          <section>
            <p className={styles.label}>Đơn hàng</p>
            <dl>
              <div><dt>Mã đơn</dt><dd>{order.id}</dd></div>
              <div><dt>Ngày nhận đơn</dt><dd>{dateTime(order.ts)}</dd></div>
            </dl>
          </section>

          {order.shipping_carrier && order.tracking_code ? (
            <section className={styles.carrier}>
              <p className={styles.label}>Vận chuyển</p>
              <h2>{carrierLabel(order.shipping_carrier)}</h2>
              <code>{order.tracking_code}</code>
              <p>{order.carrier_status_name || "Đã kết nối · đang chờ hãng cập nhật"}</p>
              {order.carrier_status_at && <small>Cập nhật từ hãng {dateTime(order.carrier_status_at)}</small>}
            </section>
          ) : (
            <section className={styles.waiting}>
              <p className={styles.label}>Vận chuyển</p>
              <h2>Chưa bàn giao cho hãng</h2>
              <p>Mã vận đơn sẽ xuất hiện tại đây khi kiện trà rời Nhà.</p>
            </section>
          )}

          <div className={styles.actions}>
            <a href={`/don-hang/${token}`}><RefreshCw aria-hidden="true"/>Cập nhật trạng thái</a>
            <a href="https://zalo.me/0903333841" target="_blank" rel="noreferrer"><MessageCircle aria-hidden="true"/>Nhắn cho Hoàng Long</a>
          </div>
          <p className={styles.privacy}>Link riêng này chỉ hiển thị hành trình giao hàng. Địa chỉ và thông tin liên hệ của bạn không xuất hiện trên trang.</p>
        </aside>
      </section>
    </main>
  );
}

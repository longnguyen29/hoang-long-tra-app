"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { customerOrderHref } from "@/lib/customer-journey";
import { formatLineQuantities } from "@/lib/selling-units";
import { orderStageMeta, reconcileOrderStage } from "@/lib/order-flow";
import { shortDate } from "@/lib/trade-pipeline";
import styles from "./TradePipeline.module.css";

export default function CustomerOrders({ orders }) {
  const [limit, setLimit] = useState(4);
  return <section className={styles.purchases}>
    <h3>Đơn của khách <span>{orders.length}</span></h3>
    {orders.length ? <ul>{orders.slice(0, limit).map(order => {
      const lines = Array.isArray(order.lines) ? order.lines : [];
      const products = lines.map(line => typeof line?.name === "string" ? line.name : line?.name?.vi || line?.name?.en).filter(Boolean);
      return <li key={order.id}><Link href={customerOrderHref(order.id)}>
        <div><b>{products.slice(0, 2).join(" · ") || order.id}{products.length > 2 ? ` +${products.length - 2}` : ""}</b>
          <small>{[order.ts && shortDate(order.ts), formatLineQuantities(lines), products.length ? order.id : ""].filter(Boolean).join(" · ")}</small></div>
        <span>{orderStageMeta(reconcileOrderStage(order.stage, order.status)).shortLabel}</span><ChevronRight size={17}/></Link></li>;
    })}</ul> : <p>Chưa có đơn được nối với hồ sơ này.</p>}
    {orders.length > limit && <button type="button" onClick={() => setLimit(limit + 8)}>Xem thêm {Math.min(orders.length - limit, 8)} đơn</button>}
  </section>;
}

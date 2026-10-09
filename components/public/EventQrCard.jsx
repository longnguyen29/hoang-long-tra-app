"use client";

import Link from "next/link";
import { ArrowLeft, Download, Printer } from "lucide-react";
import { EVENT_CONTACT } from "@/lib/event-contact";
import styles from "./EventQrCard.module.css";

export default function EventQrCard() {
  return <main className={styles.page} data-no-translate>
    <header className={styles.toolbar}><Link href="/meet"><ArrowLeft size={17} aria-hidden="true"/>Trang liên hệ</Link><button type="button" onClick={() => window.print()}><Printer size={17} aria-hidden="true"/>In thẻ QR</button></header>
    <section className={styles.card} aria-labelledby="qr-title">
      <span className={styles.seal} aria-hidden="true">皇龍</span>
      <p className={styles.brand}>Trà Hoàng Long</p>
      <h1 id="qr-title">Gặp nhau bên trà.<br/>Giữ liên hệ từ đây.</h1>
      <p className={styles.translation}>Vietnamese tea. A conversation worth continuing.</p>
      <img src="/events/meet-qr.svg" width={280} height={280} alt="Quét QR để mở trang liên hệ Trà Hoàng Long tại hoanglongtra.com/meet"/>
      <p className={styles.instruction}>Quét để lưu liên hệ & trao đổi nhu cầu<br/><span>Scan to save our contact & discuss your requirements</span></p>
      <strong className={styles.phone}>Zalo · {EVENT_CONTACT.phoneLabel}</strong>
      <p className={styles.url}>hoanglongtra.com/meet</p>
      <p className={styles.address}>Văn phòng & kho · {EVENT_CONTACT.address}</p>
    </section>
    <footer className={styles.downloads}><p>Đặt mã này trên bàn, bảng gian hàng hoặc danh thiếp. QR mở trang liên hệ; không tự gửi tin nhắn.</p><div><a href="/events/meet-qr.png" download="hoang-long-meet-qr.png"><Download size={17} aria-hidden="true"/>Tải QR PNG</a><a href="/events/meet-qr.svg" download="hoang-long-meet-qr.svg">Tải SVG để in</a></div></footer>
  </main>;
}

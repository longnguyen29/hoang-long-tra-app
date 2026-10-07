import Link from 'next/link';
import { ArrowUpRight, History, PencilLine } from 'lucide-react';
import { APP_UPDATES, PLANNED_UPDATES } from '@/lib/app-updates';
import styles from './AppUpdates.module.css';

const dateLabel = value => new Intl.DateTimeFormat('vi-VN', {dateStyle:'long'}).format(new Date(`${value}T12:00:00Z`));

export default function AppUpdates() {
  return <section className={styles.panel} aria-label="Cập nhật app">
    <header className={styles.header}><div><p>Sổ cập nhật</p><h2>App đã có gì mới?</h2><span>Các tính năng có trong phiên bản bạn đang mở, cùng nơi sử dụng.</span></div><History aria-hidden="true"/></header>
    <div className={styles.timeline}>{APP_UPDATES.map(update => <article key={update.id}>
      <time dateTime={update.date}>{dateLabel(update.date)}</time><h3>{update.title}</h3>
      <ul>{update.items.map(item => <li key={item.title}><div><b>{item.title}</b><p>{item.detail}</p></div><Link href={item.href}>Mở <ArrowUpRight aria-hidden="true"/><span className={styles.srOnly}>{item.title}</span></Link></li>)}</ul>
    </article>)}</div>
    <section className={styles.pending}><h3>Chưa triển khai</h3><ul>{PLANNED_UPDATES.map(item => <li key={item.title}><b>{item.title}</b><p>{item.detail}</p></li>)}</ul><Link href="/admin#dashboard-planner"><PencilLine aria-hidden="true"/>Ghi chú việc cần làm hoặc chức năng cần thử</Link></section>
  </section>;
}

'use client';

import Link from 'next/link';
import { ArrowRight, Leaf } from 'lucide-react';
import { EVENT_CONTACT } from '@/lib/event-contact';
import { retailProductFacts, retailProductHref } from '@/lib/retail-catalog';
import styles from './CuratedTeaSelection.module.css';

const COPY = {
  vi: {
    eyebrow: 'Trà từ những người cùng làm trà',
    title: 'Mở rộng bàn trà, giữ sự chọn lọc.',
    intro: 'Bên cạnh trà của Hoàng Long, Nhà tìm hiểu và lựa chọn những mẻ trà từ các nhà sản xuất khác để giới thiệu đến bạn.',
    collection: 'Trà đối tác tuyển chọn',
    purchaseNote: 'Bạn đặt hàng và thanh toán cho Hoàng Long. Nhà là đầu mối hỗ trợ và trao đổi về đơn hàng.',
    empty: 'Bộ sưu tập đang được chuẩn bị. Mỗi loại trà sẽ được giới thiệu sau khi Nhà đã thử và hoàn tất lựa chọn.',
    unavailable: 'Thông tin bộ sưu tập đang được cập nhật. Bạn vẫn có thể xem các loại trà hiện có trong cửa hàng.',
    loading: 'Đang tải bộ sưu tập…',
    badge: 'Hoàng Long đã thử & lựa chọn',
    producer: 'Nhà sản xuất',
    partner: 'Đối tác cung ứng',
    batch: 'Lô tham chiếu đã thử',
    tasted: 'Ngày thử',
    detail: 'Xem trà',
    supplierTitle: 'Bạn là người làm trà?',
    supplierNote: 'Nếu muốn giới thiệu trà với Hoàng Long, hãy nhắn cho Nhà tên đơn vị, loại trà và vùng sản xuất. Nhà sẽ trao đổi thêm về mẫu và thông tin sản phẩm.',
    supplierCta: 'Trao đổi qua Zalo',
    badgeNote: 'Đây là đánh giá cảm quan đối với lô tham chiếu, không thay thế kết quả kiểm nghiệm hoặc chứng nhận an toàn. Lô giao thực tế có thể khác; liên hệ Nhà để xác nhận trước khi đặt hàng.',
  },
  en: {
    eyebrow: 'Tea from fellow makers',
    title: 'A wider tea table, thoughtfully chosen.',
    intro: 'Alongside Hoàng Long teas, the house explores and selects teas from other makers to share with you.',
    collection: 'Selected partner teas',
    purchaseNote: 'Place and pay for your order with Hoàng Long. Our team is your point of contact for order support.',
    empty: 'This collection is being prepared. Each tea will be introduced after the house has tasted and selected it.',
    unavailable: 'Collection information is being updated. You can still explore the teas currently available in the shop.',
    loading: 'Loading the collection…',
    badge: 'Tasted and selected by Hoàng Long',
    producer: 'Producer',
    partner: 'Supplying partner',
    batch: 'Reference batch tasted',
    tasted: 'Tasted on',
    detail: 'Explore tea',
    supplierTitle: 'Do you make tea?',
    supplierNote: 'To introduce your tea to Hoàng Long, message us your business name, tea and production region. We can then discuss samples and product details.',
    supplierCta: 'Contact us on Zalo',
    badgeNote: 'This is a sensory assessment of the reference batch, not a laboratory test or safety certification. The delivered batch may differ; contact us to confirm it before ordering.',
  },
};

function displayDate(value, locale) {
  const parts = value.split('-');
  return locale === 'en' ? `${parts[1]}/${parts[2]}/${parts[0]}` : `${parts[2]}/${parts[1]}/${parts[0]}`;
}

export function CuratedTeaBadge({ entry, locale = 'vi' }) {
  if (!entry) return null;
  const lang = locale === 'en' ? 'en' : 'vi';
  const t = COPY[lang];
  return <details className={styles.badgeDetail}>
    <summary><Leaf size={16} aria-hidden="true"/><span>{t.badge}</span></summary>
    <div className={styles.badgeContent}>
      <dl>
        <div><dt>{t.producer}</dt><dd>{entry.producerName}</dd></div>
        <div><dt>{t.partner}</dt><dd>{entry.supplierName}</dd></div>
        <div><dt>{t.batch}</dt><dd>{entry.batchCode}</dd></div>
        <div><dt>{t.tasted}</dt><dd>{displayDate(entry.tastedOn, lang)}</dd></div>
      </dl>
      {entry.publicNote && <p>{entry.publicNote}</p>}
      <p>{t.badgeNote}</p>
    </div>
  </details>;
}

export default function CuratedTeaSelection({ products = [], state = { status: 'loading', entries: [] }, locale = 'vi' }) {
  const lang = locale === 'en' ? 'en' : 'vi';
  const t = COPY[lang];
  const productsById = new Map(products.map(product => [product.id, product]));
  const selected = state.entries.map(entry => ({ entry, product: productsById.get(entry.productId) }))
    .filter(({ product }) => product?.available && product.kind !== 'goods' && product.line !== 'sample');
  return <section id="partner-teas" className={styles.section} aria-labelledby="partner-teas-title">
    <div className={styles.intro}>
      <div><p className={styles.eyebrow}>{t.eyebrow}</p><h2 id="partner-teas-title">{t.title}</h2></div>
      <p>{t.intro}</p>
    </div>
    <div className={styles.collection}>
      <h3>{t.collection}</h3>
      <p className={styles.purchaseNote}>{t.purchaseNote}</p>
      {state.status === 'loading' ? <p role="status" className={styles.empty}>{t.loading}</p>
        : state.status !== 'ready' ? <p className={styles.empty}>{t.unavailable}</p>
        : selected.length ? <div className={styles.grid}>{selected.map(({ entry, product }) => {
          const facts = retailProductFacts(product, lang);
          return <article className={styles.tea} key={entry.productId}>
            <Link href={retailProductHref(product.id, lang)} className={styles.image} aria-label={`${t.detail}: ${facts.name}`}>
              {product.photoUrl ? <img src={product.photoUrl} alt="" loading="lazy" style={{objectPosition:product.photoPosition || '50% 50%'}}/> : <span aria-hidden="true">茶</span>}
            </Link>
            <div className={styles.teaCopy}><p className={styles.producer}>{entry.producerName}</p><h4><Link href={retailProductHref(product.id, lang)}>{facts.name}</Link></h4>
              <CuratedTeaBadge entry={entry} locale={lang}/>
              <Link className={styles.teaLink} href={retailProductHref(product.id, lang)}>{t.detail}<ArrowRight size={16} aria-hidden="true"/></Link>
            </div>
          </article>;
        })}</div> : <p className={styles.empty}>{t.empty}</p>}
    </div>
    <aside className={styles.invite}><div><h3>{t.supplierTitle}</h3><p>{t.supplierNote}</p></div><a href={EVENT_CONTACT.zaloUrl} target="_blank" rel="noopener noreferrer">{t.supplierCta}<ArrowRight size={16} aria-hidden="true"/></a></aside>
  </section>;
}

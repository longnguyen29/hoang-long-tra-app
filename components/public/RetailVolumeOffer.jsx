import { RETAIL_VOLUME_POLICY } from '@/lib/retail-volume-policy';
import styles from './RetailVolumeOffer.module.css';

export default function RetailVolumeOffer({ benefits, locale = 'vi' }) {
  const en = locale === 'en';
  const kg = value => new Intl.NumberFormat(en ? 'en-US' : 'vi-VN', { maximumFractionDigits: 3 }).format(value);
  return <section className={styles.offer} aria-label={en ? 'Tea order benefits' : 'Ưu đãi đơn trà'}>
    {benefits ? <div className={styles.current} aria-live="polite"><strong>{en ? `${kg(benefits.teaKg)} kg of tea counted` : `Đã tính ${kg(benefits.teaKg)} kg trà`}</strong>
      <span>{benefits.freeShippingEligible
        ? (en ? 'Eligible for free standard delivery in Vietnam.' : 'Đủ ngưỡng miễn phí giao tiêu chuẩn trong nước.')
        : (en ? `${kg(benefits.toFreeShippingKg)} kg more for free standard delivery in Vietnam.` : `Thêm ${kg(benefits.toFreeShippingKg)} kg để miễn phí giao tiêu chuẩn trong nước.`)}</span>
      {benefits.percent > 0 && <span>{en ? `${benefits.percent}% off eligible tea is applied.` : `Đã áp dụng giảm ${benefits.percent}% tiền trà đủ điều kiện.`}</span>}
      {benefits.nextTier && <small>{en ? `${kg((benefits.nextTier.grams - benefits.teaGrams) / 1000)} kg more to reach ${benefits.nextTier.percent}%.` : `Thêm ${kg((benefits.nextTier.grams - benefits.teaGrams) / 1000)} kg để đạt mức giảm ${benefits.nextTier.percent}%.`}</small>}
    </div> : <p className={styles.headline}>{en ? 'From 5 kg of tea · free standard delivery in Vietnam' : 'Từ 5 kg trà · miễn phí giao tiêu chuẩn trong nước'}</p>}
    <details><summary>{en ? 'Volume benefits & conditions' : 'Ưu đãi theo kg & điều kiện'}</summary>
      <ul>{RETAIL_VOLUME_POLICY.tiers.map(tier => <li key={tier.grams}><b>{en ? 'From' : 'Từ'} {tier.grams / 1000} kg</b><span>{en ? `${tier.percent}% off` : `Giảm ${tier.percent}%`}</span></li>)}</ul>
      <p>{en ? 'The highest tier applies once to tea with a confirmed pack weight. Other goods and tea packs with unknown weight do not count. Applies to this retail checkout; existing B2B quotations keep their agreed terms. Delivery address and method are confirmed before dispatch; international delivery is quoted separately.' : 'Áp dụng một mức cao nhất trên tiền trà có khối lượng xác định. Phụ kiện, sản vật và trà chưa rõ trọng lượng không tính vào ngưỡng hoặc tiền được giảm. Áp dụng cho giỏ mua lẻ này; báo giá B2B giữ điều kiện đã thỏa thuận. Nhà xác nhận địa chỉ và phương án giao trước khi gửi; giao quốc tế báo phí riêng.'}</p>
      {benefits?.unknownTeaWeight && <p className={styles.notice}>{en ? 'Some tea packs have no confirmed weight and are excluded. Contact the house to confirm their weight.' : 'Có quy cách trà chưa ghi rõ trọng lượng nên chưa được tính. Liên hệ Nhà để xác nhận quy cách.'}</p>}
    </details>
  </section>;
}

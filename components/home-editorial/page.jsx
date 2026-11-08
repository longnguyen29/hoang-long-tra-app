"use client";
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import PublicSiteHeader from '@/components/public/PublicSiteHeader';
import HouseHome from '@/components/public/HouseHome';
import PolicyLinks from '@/components/PolicyLinks';
import { useLocale } from '@/components/i18n/LocaleProvider';
import { createClient } from '@/lib/supabase/client';
import { recordPublicConversion } from '@/lib/public-attribution';
import styles from './study.module.css';

const teas = [
  { no: '01', name: 'Hồng trà Mật', note: 'Ấm áp · mật ong · caramel', image: '/export/core-hong-tra-shan-mat.jpeg' },
  { no: '02', name: 'Hồng trà Khói', note: 'Đậm sâu · gỗ · đậu đen', image: '/export/core-hong-tra-shan-khoi.jpeg' },
  { no: '03', name: 'Trà Xanh Mộc', note: 'Thanh mát · dịu nhẹ', image: '/export/core-luc-tra-shan-moc.jpeg' },
  { no: '04', name: 'Trà Hoa Ngọc Lan', note: 'Hương hoa · tinh tế', image: '/export/core-luc-tra-ngoc-lan.jpeg' },
];
export default function HeroStudy() {
  const {locale} = useLocale();
  const supabase = useMemo(() => createClient(), []);
  const [campaign, setCampaign] = useState('');
  const [home, setHome] = useState(null);
  useEffect(() => { let active = true; supabase.from('settings_home').select('featured_photos,producer_name,producer_photo,producer_role,producer_quote').eq('id', 1).maybeSingle().then(({data,error}) => { if (active && !error) setHome(data || null); }).catch(() => {}); return () => { active = false; }; }, [supabase]);
  useEffect(() => {
    if (locale !== 'vi') return;
    const incoming = new URLSearchParams(window.location.search);
    const safe = new URLSearchParams();
    for (const key of ['utm_source','utm_medium','utm_campaign','utm_content','utm_term']) {
      const value = incoming.get(key);
      if (value) safe.set(key, value.replace(/[^a-zA-Z0-9._-]/g,'-').slice(0,80));
    }
    safe.set('lang','vi');
    setCampaign(`?${safe}`);
    recordPublicConversion(supabase, 'home_view', {once:true,placement:'home'}).catch(() => {});
  }, [supabase, locale]);
  if (locale === 'en') return <HouseHome />;
  return <main className={styles.page}>
  <PublicSiteHeader/>

  <section className={styles.hero}>
    <div className={styles.heroImage}/><div className={styles.heroShade}/><div className={styles.heroTop}><span>NHÀ TRÀ HOÀNG LONG</span><span>VIỆT NAM · TEA HOUSE</span></div>
    <div className={styles.heroContent}><p className={styles.kicker}><span/> TRÀ VIỆT, GỬI ĐẾN THẾ GIỚI</p><h1>Trà Việt,<br/><em>từ đất đến người.</em></h1><p>Từ nhà máy trà tại Hà Giang, Hoàng Long giới thiệu những dòng trà Việt cho người thưởng trà, các thương hiệu đồ uống và đối tác thương mại.</p><div className={styles.heroActions}><Link href={`/catalog${campaign}`}>Khám phá bộ sưu tập <span>↗</span></Link><Link href={`/wholesale${campaign}`}>Dành cho đối tác <span>→</span></Link></div></div><div className={styles.heroBottom}><span>HOUSE OF HOÀNG LONG</span><span>HÌNH ẢNH MINH HỌA</span><a href="#story">CUỘN ĐỂ KHÁM PHÁ ↓</a></div>
  </section>
  <section id="story" className={styles.story}><div className={styles.storyVisual}><img loading="lazy" decoding="async" src={home?.featured_photos?.[0] || "/landing/1.jpg"} alt="Hình ảnh từ thư viện Hoàng Long"/><span>01 / TỪ VÙNG TRÀ</span></div><div className={styles.storyText}><p className={styles.label}>NGUỒN CỘI &amp; CON NGƯỜI <span>01 — 04</span></p><h2>Từ vùng trà,<br/><em>đến nhà máy.</em></h2><p>Tại Tân Lập, Hà Giang, Hoàng Long làm việc với trà Việt từ khâu lựa chọn nguyên liệu đến chế biến và hoàn thiện sản phẩm.</p><p>Mỗi dòng trà được giới thiệu với hương vị và quy cách phù hợp, từ nhu cầu thưởng thức đến pha chế và cung ứng sỉ.</p>{home?.producer_quote?.vi && <p>“{home.producer_quote.vi}”{home?.producer_name && <> — {home.producer_name}</>}</p>}<Link className={styles.textLink} href={`/company${campaign}`}>Tìm hiểu về Hoàng Long <span>↗</span></Link></div></section>
  <section id="collection" className={styles.collection}><div className={styles.sectionHead}><div><p className={styles.label}>TUYỂN CHỌN HOÀNG LONG <span>02 — 04</span></p><h2>Bốn dòng trà,<br/><em>bốn nét riêng.</em></h2></div><p>Từ hương mật êm dịu đến nét khói trầm sâu, mỗi dòng trà mở ra một cách thưởng thức và sáng tạo riêng.</p></div><div className={styles.teas}>{teas.map(t => <Link href={`/catalog${campaign}`} className={styles.tea} key={t.no}><div className={styles.teaPhoto}><img src={t.image} alt={t.name} loading="lazy" decoding="async"/><span>↗</span></div><div className={styles.teaTitle}><h3>{t.name}</h3><span>{t.no}</span></div><p>{t.note}</p></Link>)}</div><Link className={styles.textLink} href={`/catalog${campaign}`}>Xem danh mục trà <span>↗</span></Link></section>
  <section className={styles.trade}><div className={styles.tradeImage}><img loading="lazy" decoding="async" src="/landing/3.jpg" alt="Dây chuyền chế biến trà trong bộ ảnh Hoàng Long"/><figure><img loading="lazy" decoding="async" src="/cafe/serving-20260910/tea-trio-1200.webp" alt="Minh họa các cách dùng trà trong đồ uống cho quán"/><figcaption>Gợi ý ứng dụng pha chế · Hình ảnh minh họa</figcaption></figure></div><div className={styles.tradeContent}><p className={styles.label}>DÀNH CHO ĐỐI TÁC <span>03 — 04</span></p><h2>Một nguồn trà phù hợp.<br/><em>Một khởi đầu<br/>vững vàng.</em></h2><p>Từ quán đồ uống đến nhà phân phối và đối tác xuất khẩu, chúng tôi trao đổi nhu cầu, gửi mẫu và xây dựng báo giá theo từng đơn hàng.</p><div className={styles.steps}><span>01 &nbsp; Trao đổi nhu cầu</span><span>02 &nbsp; Chọn trà &amp; thử mẫu</span><span>03 &nbsp; Báo giá &amp; hợp tác</span></div><Link className={styles.lightButton} href={`/wholesale${campaign}`}>Bắt đầu cuộc trao đổi <span>↗</span></Link></div></section>
  <section className={styles.retail}><div className={styles.retailCopy}><p className={styles.label}>DÀNH CHO BẠN <span>04 — 04</span></p><h2>Chọn trà cho<br/><em>những ngày thường.</em></h2><p>Tìm một hương trà hợp gu, dành cho bàn trà của bạn hoặc làm quà cho người thân.</p><Link className={styles.textLink} href="/shop">Ghé cửa hàng trà <span>↗</span></Link></div><figure className={styles.retailImage}><img loading="lazy" decoding="async" src="/hero-study/tea-moment-illustration.jpg" alt="Minh họa khoảnh khắc rót trà bên bàn gỗ"/><figcaption>Hình ảnh minh họa</figcaption></figure></section>
  <section className={styles.closing}><p>HOUSE OF HOÀNG LONG · VIETNAM</p><h2>Cùng trò chuyện<br/><em>về trà.</em></h2><Link href={`/wholesale${campaign}`}>Liên hệ hợp tác <span>↗</span></Link></section><footer className={styles.footer}><div><b>HOUSE OF HOÀNG LONG</b><p>Trà Việt, cho những cuộc gặp gỡ.</p></div><div><Link href={`/company${campaign}`}>Về Hoàng Long</Link><Link href={`/catalog${campaign}`}>Danh mục trà</Link><Link href="/shop">Cửa hàng</Link></div><div><p>Công ty TNHH Thương Mại Trà Hoàng Long · MST 0110818609</p><a href="tel:+84903333841">0903 333 841</a><p><Link href="/meet">Liên hệ</Link> · <Link href="/privacy">Quyền riêng tư</Link></p><PolicyLinks/></div></footer>
</main>; }

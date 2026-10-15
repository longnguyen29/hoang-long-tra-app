import Link from 'next/link';
import {notFound} from 'next/navigation';
import {getRetailPartner} from '@/lib/retail-partner-server';
import styles from './page.module.css';
export const dynamic='force-dynamic';
export async function generateMetadata({params}){
 const {slug}=await params;const partner=await getRetailPartner(slug);
 return {title:partner?`Chọn trà cùng ${partner.display_name} · Hoàng Long`:'Đối tác giới thiệu · Hoàng Long',robots:{index:false,follow:true}};
}
export default async function RetailPartnerPage({params}){
 const {slug}=await params;const partner=await getRetailPartner(slug);if(!partner)notFound();
 return <main className={styles.page}>
  <Link href="/" className={styles.brand}>HOUSE OF HOÀNG LONG</Link>
  <div className={styles.layout}><section><p className={styles.eyebrow}>Trà Hoàng Long · Đối tác giới thiệu</p>
   <h1>Chọn một vị trà.<br/>Giữ một mối thân tình.</h1>
   <p className={styles.description}>Xem trà, chọn quy cách và đặt hàng trực tiếp với Hoàng Long. {partner.display_name} đồng hành cùng bạn khi cần tư vấn.</p>
   <Link href={`/shop?ref=${encodeURIComponent(partner.slug)}`} className={styles.primary}>Khám phá danh mục trà <span aria-hidden="true">↗</span></Link>
   <p className={styles.detail}>Giá và ưu đãi theo danh mục Hoàng Long. Khi đặt hàng, bạn có thể đồng ý chia sẻ thông tin và tiến độ đơn cho người giới thiệu, hoặc tiếp tục mua trực tiếp.</p>
  </section><aside><img src="/export/hong-tra-shan-khoi.jpeg" alt=""/><div className={styles.contact}><p>Người giới thiệu</p><h2>{partner.display_name}</h2>{partner.region&&<span>{partner.region}</span>}<a href={`tel:${partner.phone.replace(/[^+0-9]/g,'')}`}>{partner.phone}</a></div></aside></div>
  <footer>Đơn hàng do Hoàng Long xác nhận và xử lý. Thông tin người nhận, thanh toán và địa chỉ giao hàng không hiển thị công khai.</footer>
 </main>;
}

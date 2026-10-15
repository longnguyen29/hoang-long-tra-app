'use client';
import {useRetailCart} from './RetailCartProvider';
import styles from './RetailPartnerBanner.module.css';
export default function RetailPartnerBanner({locale='vi'}){
 const {retailPartner:partner,partnerCandidate:candidate,referralStatus:status,clearRetailPartner,confirmRetailPartner}=useRetailCart();
 const en=locale==='en';if(!status)return null;
 return <section className={styles.banner} aria-label={en?'Your introducer':'Người giới thiệu'} aria-live="polite">
  {status==='loading'?<p>{en?'Checking your introducer…':'Đang kiểm tra người giới thiệu…'}</p>:status==='unavailable'?<><p>{en?'This partner link is no longer available. No introducer has been assigned.':'Liên kết đối tác này hiện không sử dụng được. Chưa ghi nhận người giới thiệu cho đơn hàng.'}</p><button type="button" onClick={clearRetailPartner}>{en?'Continue buying directly':'Tiếp tục mua trực tiếp'}</button></>:candidate?<><div><small>{en?'Introduced by':'Bạn được giới thiệu bởi'}</small><strong>{candidate.display_name}</strong><p>{en?'Choose this person for assistance. We will ask your permission before sharing order details.':'Chọn người này để được đồng hành. Nhà sẽ xin phép trước khi chia sẻ thông tin và tiến độ đơn.'}</p></div><div className={styles.actions}><button type="button" onClick={confirmRetailPartner}>{en?'Choose this introducer':'Chọn người giới thiệu này'}</button><button type="button" onClick={clearRetailPartner}>{en?'Buy directly':'Mua trực tiếp với Nhà'}</button></div></>:partner?<><div><small>{en?'Your introducer':'Người giới thiệu của bạn'}</small><strong>{partner.display_name}</strong><a href={`tel:${partner.phone.replace(/[^+0-9]/g,'')}`}>{partner.phone}</a></div><button type="button" onClick={clearRetailPartner}>{en?'Remove introducer':'Bỏ người giới thiệu'}</button></>:null}
 </section>;
}

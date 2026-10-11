"use client";

import {useEffect,useRef,useState} from 'react';
import {AlertCircle,CheckCircle2,Clock3,RefreshCw,RotateCcw,Send} from 'lucide-react';
import {trackingSmsPreview} from '@/lib/tracking-sms-preview';
import {smsStatus} from '@/lib/sms-status';
import styles from './StaffWorkbench.module.css';
import controls from './SmsControls.module.css';

const dateTime=(value)=>value&&!Number.isNaN(new Date(value).getTime())?new Intl.DateTimeFormat('vi-VN',{dateStyle:'short',timeStyle:'short'}).format(new Date(value)):'—';
const errorMessages={
 not_authenticated:'Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại rồi kiểm tra trạng thái SMS.',
 manager_required:'Chỉ quản trị hoặc quản lý được điều khiển gửi SMS.',
 waybill_changed:'Hãng hoặc mã vận đơn đã thay đổi. Tải lại đơn và kiểm tra nội dung trước khi gửi.',
 invalid_phone:'Cần lưu một số điện thoại Việt Nam rõ ràng cho khách trước khi gửi.',
 needs_phone:'Cần kiểm tra và sửa số điện thoại của khách trước khi gửi.',
 incomplete_tracking:'Cần lưu hãng, mã vận đơn và link theo dõi hợp lệ trước khi gửi.',
 invalid_tracking:'Cần kiểm tra hãng và mã vận đơn đã lưu trước khi gửi.',
 not_shipping:'Đơn chưa ở bước gửi SMS vận đơn. Kiểm tra lại bước xử lý của đơn.',
 sms_gateway_not_configured:'Thiết bị Android gửi SMS chưa được cấu hình. Cần kiểm tra dịch vụ gửi SMS.',
 sms_reason_required:'Ghi lý do từ 10 đến 1.000 ký tự trước khi xác nhận gửi.',
 reason_required:'Ghi lý do từ 10 đến 1.000 ký tự trước khi xác nhận gửi.',
 duplicate_ack_required:'Cần xác nhận khách có thể nhận thêm một SMS trước khi gửi lại.',
 sms_duplicate_ack_required:'Cần xác nhận khách có thể nhận thêm một SMS trước khi gửi lại.',
 sms_in_flight:'SMS đang nằm trong hàng đợi hoặc được Android xử lý. Hãy kiểm tra trạng thái trước khi gửi tiếp.',
 already_processing:'Android đang xử lý yêu cầu này. Hãy kiểm tra trạng thái; chưa cần gửi thêm.',
 already_queued:'SMS đã được xếp hàng gửi. Hãy kiểm tra trạng thái; chưa cần gửi thêm.',
 already_sent:'Thiết bị đã báo gửi SMS này. Muốn gửi thêm, chọn Gửi lại và xác nhận khả năng trùng tin.',
 retry_later:'Yêu cầu trước còn đang được xử lý. Kiểm tra trạng thái rồi thử lại sau.',
 submission_uncertain:'Yêu cầu có thể đã tới thiết bị Android nhưng chưa xác định được kết quả. Kiểm tra trạng thái trước khi gửi thêm.',
 receipt_unconfirmed:'Chưa có kết quả gửi rõ ràng. Kiểm tra trạng thái; gửi lại có thể làm khách nhận thêm một SMS.',
 gateway_error:'Chưa xác định được kết quả gửi qua Android. Kiểm tra trạng thái trước khi thử gửi thêm.',
 sms_status_check_failed:'Chưa kiểm tra được trạng thái từ thiết bị Android. Có thể kiểm tra lại; các xác nhận trước vẫn được giữ.',
 sms_provider_unavailable:'Chưa kết nối được dịch vụ SMS. Kiểm tra lại trạng thái sau.',
 sms_result_uncertain:'Chưa nhận được kết quả yêu cầu gửi. SMS có thể đã tới thiết bị Android; kiểm tra trạng thái trước khi gửi thêm.',
 sms_waybill_required:'Cần lưu hãng và mã vận đơn trước khi gửi SMS.',
 sms_waybill_changed:'Hãng hoặc mã vận đơn đã thay đổi. Tải lại đơn và kiểm tra nội dung trước khi gửi.',
 sms_recipient_changed:'Số điện thoại của khách đã thay đổi. Tải lại đơn và kiểm tra lại số nhận trước khi gửi.',
 sms_recipient_required:'Cần xác nhận một số điện thoại Việt Nam rõ ràng của khách trước khi gửi.',
 sms_resend_confirmation_required:'Ghi lý do ít nhất 10 ký tự và xác nhận khách có thể nhận thêm một SMS.',
 sms_not_ready:'Đơn chưa đủ thông tin để gửi. Kiểm tra hãng, mã vận đơn và link theo dõi đã lưu.',
 sms_needs_phone:'Cần kiểm tra và sửa số điện thoại của khách trước khi gửi.',
 sms_confirmation_required:'Ghi lý do gửi lại và xác nhận khách có thể nhận thêm một SMS.',
 sms_status_unavailable:'Chưa kiểm tra được kết quả gửi trước từ Android. Hãy kiểm tra trạng thái rồi thử lại sau.',
 sms_check_required:'Kết quả gửi trước chưa rõ. Kiểm tra trạng thái; muốn gửi thêm cần chọn Gửi lại và xác nhận khả năng trùng tin.',
 sms_not_configured:'Thiết bị Android gửi SMS chưa được cấu hình. Cần kiểm tra dịch vụ gửi SMS.',
 sms_order_read_failed:'Chưa tải được đơn để kiểm tra SMS. Tải lại đơn rồi kiểm tra trạng thái.',
 sms_action_failed:'Chưa xác nhận được kết quả thao tác. Kiểm tra trạng thái trước khi gửi thêm.',
 failed:'Cổng gửi báo lỗi. Kiểm tra trạng thái và dịch vụ Android trước khi thử lại.',
 provider_failed:'Cổng gửi báo lỗi. Kiểm tra trạng thái và dịch vụ Android trước khi thử lại.',
 provider_cancelled:'Cổng gửi đã hủy yêu cầu SMS. Kiểm tra trạng thái trước khi gửi tiếp.',
};
const readableError=(error)=>errorMessages[typeof error==='string'?error:error?.code||error?.message]||'Chưa hoàn tất thao tác SMS. Kiểm tra trạng thái hiện tại rồi thử lại.';
const actionLabels={send:'Gửi SMS',retry:'Thử gửi lại',resend:'Gửi lại SMS'};

export default function TrackingSmsPreview({order,trackingSms,role,onSmsAction,disabled=false}) {
 const preview=trackingSmsPreview(order);
 const current=trackingSms?.shipping_carrier===order.shippingCarrier&&trackingSms?.tracking_code===order.trackingCode?trackingSms:null;
 const [confirmAction,setConfirmAction]=useState(null),[reason,setReason]=useState(''),[acknowledgeDuplicate,setAcknowledgeDuplicate]=useState(false);
 const [pendingAction,setPendingAction]=useState(null),[actionError,setActionError]=useState(''),[actionNotice,setActionNotice]=useState('');
 const [requestUncertain,setRequestUncertain]=useState(false);
 const storedStatus=smsStatus(current||{});
 const status=requestUncertain?{...storedStatus,key:'uncertain',label:'Chưa xác định kết quả yêu cầu mới',detail:'Phản hồi chưa tới màn hình này. Yêu cầu có thể đã tới Android; kiểm tra trạng thái trước khi gửi lại.'}:storedStatus;
 const requestInFlight=useRef(false);
 const canManage=['admin','manager'].includes(role)&&typeof onSmsAction==='function';
 const isBusy=disabled||Boolean(pendingAction);
 const canSend=preview.issues.length===0&&Boolean(preview.phone)&&Boolean(preview.text);
 const providerState=String(current?.provider_state||'').toLowerCase();
 const awaitingResult=Boolean(current)&&(['queued','processing'].includes(status.key)||['pending','processed','cancelling','canceling'].includes(providerState)||(status.key==='pending'&&Boolean(current.provider_message_id)));
 const resendRequired=(Boolean(current)||requestUncertain)&&['sent','delivered','uncertain'].includes(status.key);
 const offeredAction=awaitingResult?null:resendRequired?'resend':current?'retry':'send';
 const confirmationStillValid=confirmAction===offeredAction;
 useEffect(()=>{setConfirmAction(null);setReason('');setAcknowledgeDuplicate(false);setActionError('');setActionNotice('');setRequestUncertain(false)},[order.id,order.shippingCarrier,order.trackingCode]);
 const openConfirmation=(action)=>{
  if(isBusy||!canManage||!canSend||action!==offeredAction)return;
  setConfirmAction(action);setActionError('');setActionNotice('');setAcknowledgeDuplicate(false);
  setReason(action==='send'?'Quản lý xác nhận gửi SMS vận đơn cho khách.':action==='retry'?'Đã kiểm tra đơn và yêu cầu thử gửi SMS vận đơn.':'');
 };
 const runAction=async(action)=>{
  if(isBusy||requestInFlight.current||!canManage)return;
  const trimmedReason=reason.trim();
  if(action!=='refresh'&&(!canSend||action!==offeredAction||trimmedReason.length<10||trimmedReason.length>1000||(action==='resend'&&!acknowledgeDuplicate)))return;
  requestInFlight.current=true;setPendingAction(action);setActionError('');setActionNotice('');
  try{
   const response=await onSmsAction({action,expectedCarrier:order.shippingCarrier,expectedTrackingCode:order.trackingCode,...(action!=='refresh'?{expectedPhone:preview.phone,reason:trimmedReason}:{}),...(action==='resend'?{acknowledgeDuplicate}: {})});
   if(!response||typeof response!=='object')throw new Error(action==='refresh'?'sms_status_check_failed':'sms_result_uncertain');
   if(response.ok===false)throw new Error(response.error||'sms_request_failed');
   if(!response.result)throw new Error(action==='refresh'?'sms_status_check_failed':'sms_result_uncertain');
   setRequestUncertain(false);
   const result=response?.result||{};
   if(['failed','provider_failed','provider_cancelled','needs_phone','skipped','not_ready','not_configured','check_required','status_unavailable','reason_required','confirmation_required','recipient_changed'].includes(result.status)){
    setActionError(readableError(result.reason||(errorMessages[result.status]?result.status:`sms_${result.status}`)));return;
   }
   const nextRecord=Object.hasOwn(response,'trackingSms')?response.trackingSms:current;
   const nextStatus=smsStatus(nextRecord||{});
   if(action==='refresh'){
    setActionNotice(!nextRecord?'Chưa có yêu cầu SMS cho vận đơn đã lưu.':nextStatus.checkError?'Lần kiểm tra chưa thành công. Trạng thái xác nhận trước vẫn được giữ.':`Đã kiểm tra trạng thái: ${nextStatus.label.toLowerCase()}.`);
   }else if(['already_processing','already_queued','already_sent','retry_later'].includes(result.status)){
    setActionNotice(readableError(result.status));setConfirmAction(null);
   }else{
    setActionNotice(nextStatus.key==='uncertain'?'Chưa xác định được kết quả yêu cầu gửi. Kiểm tra trạng thái trước khi gửi thêm.':`Yêu cầu đã được xử lý qua thiết bị Android: ${nextStatus.label.toLowerCase()}.`);
    setConfirmAction(null);setReason('');setAcknowledgeDuplicate(false);
   }
  }catch(error){
   if(action!=='refresh'&&['sms_result_uncertain','sms_action_failed'].includes(error?.message)){setRequestUncertain(true);setConfirmAction(null);setReason('');setAcknowledgeDuplicate(false)}
   setActionError(readableError(error));
  }
  finally{requestInFlight.current=false;setPendingAction(null)}
 };
 const StatusIcon=status.key==='delivered'?CheckCircle2:['failed','uncertain','needs_phone'].includes(status.key)?AlertCircle:Clock3;

 return <section id="tracking-sms-preview" className={styles.messageSection} aria-labelledby="tracking-sms-title">
  <h3 id="tracking-sms-title">SMS cập nhật vận đơn</h3>
  <div className={controls.statusBox} data-state={status.key}>
   <div className={controls.statusHeading}><StatusIcon aria-hidden="true"/><strong>{current||requestUncertain?status.label:'Chưa có yêu cầu gửi'}</strong></div>
   <p role="status">{current||requestUncertain?status.detail:order.stage==='shipping'?'Sẽ tự gửi khi đã lưu đủ hãng, mã vận đơn và số điện thoại hợp lệ.':'Sẽ tự gửi khi đơn đến bước Giao hàng và có đủ thông tin vận đơn, số điện thoại.'}</p>
   {current?.last_error&&['failed','needs_phone','skipped'].includes(status.key)&&<p className={controls.warning}>Lý do: {readableError(current.last_error)}</p>}
   {(current?.queued_at||status.sentAt||status.deliveredAt||status.checkedAt)&&<dl className={controls.statusDates}>
    {current?.queued_at&&<div><dt>Đưa vào hàng đợi</dt><dd>{dateTime(current.queued_at)}</dd></div>}
    {status.sentAt&&<div><dt>Thiết bị báo gửi{requestUncertain?' trước đó':''}</dt><dd>{dateTime(status.sentAt)}</dd></div>}
    {status.deliveredAt&&<div><dt>Nhà mạng báo nhận{requestUncertain?' trước đó':''}</dt><dd>{dateTime(status.deliveredAt)}</dd></div>}
    {status.checkedAt&&<div><dt>Kiểm tra lần cuối</dt><dd>{dateTime(status.checkedAt)}</dd></div>}
   </dl>}
   {status.checkError&&<p className={controls.warning}>Chưa kiểm tra được trạng thái gần nhất. Các xác nhận gửi hoặc phát trước đó vẫn được giữ; có thể kiểm tra lại.</p>}
  </div>
  <dl className={styles.orderSummary}>
   <div><dt>Khách hàng</dt><dd>{order.customerName||'Chưa có tên'}</dd></div>
   <div><dt>Số nhận dự kiến</dt><dd>{preview.phone||'Chưa xác định'}</dd></div>
   <div><dt>Liên hệ gốc</dt><dd>{preview.contact||'Chưa có'}</dd></div>
   <div><dt>Mã đã lưu</dt><dd>{preview.code||'Chưa có'} · {preview.carrier}</dd></div>
  </dl>
  {preview.issues.length>0&&<ul className={controls.issues} role="status">{preview.issues.map(issue=><li key={issue}>{issue}</li>)}</ul>}
  <article className={styles.messagePreview}><header>Nội dung gửi cho khách</header><textarea readOnly aria-label="Nội dung SMS qua Android" value={preview.text} placeholder="Lưu hãng và mã vận đơn để xem nội dung."/><footer>{preview.text.length} ký tự · Nội dung theo vận đơn đã lưu</footer></article>
  {canManage&&<div className={controls.controls}>
   <p className={controls.explanation}>Bấm gửi tại đây sẽ yêu cầu thiết bị Android đã cấu hình gửi SMS cho khách. Dùng được trên web và điện thoại, không cần mở ứng dụng Tin nhắn.</p>
   <p className={controls.hint}>“Kiểm tra trạng thái” chỉ đọc kết quả gửi, không phát SMS mới.</p>
   <div className={controls.actions}>
    <button type="button" disabled={isBusy||confirmAction!==null} onClick={()=>runAction('refresh')} title="Chỉ đọc và kiểm tra kết quả gửi, không gửi thêm SMS."><RefreshCw aria-hidden="true" className={pendingAction==='refresh'?controls.spin:undefined}/>{pendingAction==='refresh'?'Đang kiểm tra…':'Kiểm tra trạng thái'}</button>
    {offeredAction&&<button type="button" className={controls.sendAction} disabled={isBusy||!canSend||confirmAction!==null} aria-expanded={confirmAction===offeredAction} aria-controls="tracking-sms-confirmation" onClick={()=>openConfirmation(offeredAction)}>{offeredAction==='resend'?<RotateCcw aria-hidden="true"/>:<Send aria-hidden="true"/>}{actionLabels[offeredAction]}</button>}
   </div>
   {awaitingResult&&<p className={controls.hint}>SMS còn trong hàng đợi hoặc Android đang xử lý. Kiểm tra trạng thái để cập nhật kết quả.</p>}
   {resendRequired&&<p className={controls.hint}>{status.key==='uncertain'?'Kết quả chưa rõ; hãy kiểm tra trạng thái trước. Gửi thêm có thể làm khách nhận trùng tin.':'Muốn gửi thêm cùng vận đơn, cần ghi lý do và xác nhận khả năng khách nhận thêm một SMS.'}</p>}
   {confirmAction&&<form id="tracking-sms-confirmation" className={controls.confirmation} onSubmit={event=>{event.preventDefault();runAction(confirmAction)}}>
    <h4>{actionLabels[confirmAction]} cho {order.customerName||'khách hàng'}?</h4>
    <p>Thiết bị Android sẽ gửi nội dung đang xem đến <b>{preview.phone}</b>, cho vận đơn <b>{preview.code}</b>. Thao tác được ghi trong lịch sử đơn.</p>
    {confirmAction==='resend'&&<p className={controls.warning}>SMS trước đã được gửi hoặc kết quả chưa rõ. Gửi lại có thể khiến khách nhận thêm một SMS.</p>}
    {!confirmationStillValid&&<p className={controls.warning}>Trạng thái SMS đã thay đổi. Đóng xác nhận và kiểm tra trạng thái trước khi thao tác tiếp.</p>}
    <label className={controls.reason}>Lý do {confirmAction==='resend'?'gửi lại':'gửi'} (bắt buộc)<textarea autoFocus required minLength={10} maxLength={1000} disabled={isBusy} value={reason} onChange={event=>setReason(event.target.value)} placeholder="Ví dụ: khách yêu cầu nhận lại link theo dõi vận đơn" aria-describedby="tracking-sms-reason-help"/></label>
    <small id="tracking-sms-reason-help">Từ 10 đến 1.000 ký tự; lý do được lưu để đối soát.</small>
    {confirmAction==='resend'&&<label className={controls.duplicateAck}><input type="checkbox" checked={acknowledgeDuplicate} disabled={isBusy} onChange={event=>setAcknowledgeDuplicate(event.target.checked)}/><span>Tôi hiểu khách có thể nhận thêm một SMS</span></label>}
    <div className={controls.confirmActions}><button type="button" disabled={isBusy} onClick={()=>{setConfirmAction(null);setReason('');setAcknowledgeDuplicate(false);setActionError('')}}>Hủy</button><button type="submit" className={controls.sendAction} disabled={isBusy||!canSend||!confirmationStillValid||reason.trim().length<10||reason.trim().length>1000||(confirmAction==='resend'&&!acknowledgeDuplicate)}>{pendingAction===confirmAction?'Đang xử lý…':`Xác nhận ${actionLabels[confirmAction].toLowerCase()}`}</button></div>
   </form>}
   {actionError&&<p className={controls.error} role="alert">{actionError}</p>}
   {actionNotice&&<p className={controls.notice} role="status">{actionNotice}</p>}
  </div>}
 </section>;
}

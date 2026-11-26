"use client";
import { useState, useRef } from "react";
import Link from "next/link";
import styles from "./CompanyDocuments.module.css";

const steps = [
  ["scope","Xác định phạm vi và chủ thể","Xác định loại thực phẩm, thị trường, pháp nhân đứng tên, cơ sở sản xuất hoặc nhà sản xuất nước ngoài. Không mặc định mọi nguyên liệu B2B phải tự công bố."],
  ["source","Rà soát sản phẩm và nguồn gốc","Chốt tên, thành phần, xuất xứ, quy cách, hạn sử dụng, nhãn dự kiến, chứng từ nguồn gốc và điều kiện ATTP. OEM: xác nhận hợp đồng và ủy quyền nếu làm thay."],
  ["lab","Kiểm nghiệm","Chọn chỉ tiêu an toàn phù hợp và phòng được chỉ định hoặc công nhận ISO 17025 với phạm vi phù hợp. Đối chiếu mẫu và phiếu; phiếu còn trong 12 tháng khi nộp."],
  ["draft","Soạn hồ sơ","Bản tự công bố Mẫu số 01 Phụ lục I Nghị định 15/2018/NĐ-CP và phiếu kiểm nghiệm (bản chính hoặc bản sao chứng thực). Rà soát nhãn, hồ sơ và người ký."],
  ["publish","Ký, công khai và nộp","Lưu bản đã ký, bằng chứng công khai theo Điều 5 và nộp theo kênh/cơ quan được địa phương chỉ định; lưu bằng chứng nộp. Không nhầm với giấy cấp phép."],
  ["archive","Lưu hồ sơ và hậu kiểm","Liên kết lô hàng, nhãn, chứng từ, hồ sơ đã nộp. Đổi tên, xuất xứ, thành phần: tự công bố lại; thay đổi khác: thông báo theo quy định. Kiểm tra quy định hiện hành trước khi thực hiện."]
];
const fields = [["product","Tên sản phẩm / mã nội bộ"],["brand","Nhãn hiệu"],["entity","Pháp nhân đứng tên"],["manufacturer","Cơ sở sản xuất / nhà sản xuất"],["origin","Xuất xứ"],["owner","Người phụ trách"],["labDate","Ngày phiếu kiểm nghiệm"],["submitDate","Ngày nộp thực tế"]];
const initial=()=>({route:"review",fields:{},done:{},notes:{}});
const routes=[["review","Chưa xác định"],["self","Tự công bố"],["exempt","Xem xét miễn tự công bố"],["registration","Xem xét đăng ký bản công bố"]];
const format="hoang-long-declaration-checklist";
export default function ProductDeclarationChecklist(){
 const [record,setRecord]=useState(initial),[message,setMessage]=useState(""), input=useRef(null);
 const count=steps.filter(([id])=>record.done[id]===true).length;
 function setField(key,value){setRecord(r=>({...r,fields:{...r.fields,[key]:value},done:{}}));setMessage("Thông tin thay đổi; xác nhận lại các bước.");}
 function exportDraft(){
  const blob=new Blob([JSON.stringify({format,version:1,record},null,2)],{type:"application/json"});
  const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="hoang-long-cong-bo-checklist.json";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  setMessage("Đã tải checklist nội bộ; chưa lưu trên máy chủ.");
 }
 async function importDraft(event){
  const file=event.target.files?.[0];event.target.value="";if(!file)return;
  try{
   if(file.size>256*1024)throw Error();
   const parsed=JSON.parse(await file.text()),r=parsed.record;
   if(parsed.format!==format||parsed.version!==1||!r||!routes.some(([id])=>id===r.route))throw Error();
   const pick=(items,source,limit)=>Object.fromEntries(items.map(([id])=>[id,typeof source?.[id]==="string"?source[id].slice(0,limit):""]));
   const values=pick(fields,r.fields,500),notes=pick(steps,r.notes,2000);
   setRecord({route:r.route,fields:values,notes,done:{}});
   setMessage("Đã mở bản nháp; cần xác nhận lại từng bước theo bằng chứng.");
  }catch{setMessage("Không mở được checklist JSON hợp lệ.");}
 }
 return <main className={styles.page} data-no-translate>
  <header className={styles.header}><div><p className={styles.eyebrow}>Tài liệu công ty · An toàn thực phẩm</p><h1>Hồ sơ công bố sản phẩm</h1><p>Checklist nội bộ cho trà đóng gói, OEM và hàng nhập khẩu.</p></div><Link href="/admin/documents">Về tài liệu công ty</Link></header>
  <p className={styles.notice}>Bản hỗ trợ chuẩn bị hồ sơ, không phải bản tự công bố Mẫu 01, không nộp hồ sơ tự động và không xác nhận sản phẩm hợp pháp. Dữ liệu chỉ ở phiên làm việc; tải JSON để giữ bản nháp riêng tư.</p>
  <section className={styles.templates}><label htmlFor="declaration-route">Phân loại thủ tục (cần xác minh)</label><select id="declaration-route" value={record.route} onChange={e=>{setRecord(r=>({...r,route:e.target.value,done:{}}));setMessage("");}}>{routes.map(([id,label])=><option key={id} value={id}>{label}</option>)}</select>
   <p>Không tự áp dụng tự công bố cho thực phẩm thuộc Điều 6 hoặc miễn công bố theo Điều 4. Với hàng nhập khẩu, kiểm tra riêng thủ tục hải quan và ATTP nhập khẩu.</p>
  </section>
  <section className={styles.group}><div className={styles.fields}>{fields.map(([id,label])=><label key={id}><span>{label}</span><input type={id.endsWith("Date")?"date":"text"} maxLength={500} value={record.fields[id]||""} onChange={e=>setField(id,e.target.value)}/></label>)}</div></section>
  <div className={styles.toolbar}><div><strong>{count}/6 bước đã tự xác nhận</strong><p>{record.route!=="self"?"Xác minh loại thủ tục trước khi dùng checklist tự công bố.":count===6?"Hoàn thành checklist nội bộ — không phải xác nhận của cơ quan nhà nước.":"Tiếp tục bước còn thiếu."}</p></div><div className={styles.actions}><button type="button" onClick={exportDraft}>Tải checklist JSON</button><button type="button" onClick={()=>input.current?.click()}>Mở checklist</button><input ref={input} type="file" accept=".json,application/json" hidden onChange={importDraft}/></div></div>
  {message&&<p className={styles.notice} role="status">{message}</p>}
  {steps.map(([id,title,desc],index)=><section key={id} className={styles.group}><div className={styles.fields}><label className={styles.wide}><span>{index+1}. {title}</span><span>{desc}</span><textarea rows={2} maxLength={2000} placeholder="Ghi số hồ sơ, đường dẫn nội bộ hoặc bằng chứng đã kiểm tra (không tải lên tại đây)" value={record.notes[id]||""} onChange={e=>setRecord(r=>({...r,notes:{...r.notes,[id]:e.target.value},done:{...r.done,[id]:false}}))}/></label><label className={styles.wide}><input type="checkbox" checked={!!record.done[id]} disabled={record.route!=="self"||!record.notes[id]?.trim()||!record.fields.product?.trim()||!record.fields.entity?.trim()||steps.slice(0,index).some(([prior])=>!record.done[prior])} onChange={e=>{const checked=e.target.checked;setRecord(r=>({...r,done:{...r.done,[id]:checked,...(!checked?Object.fromEntries(steps.slice(index+1).map(([next])=>[next,false])):{})}}));}}/><span>Đã kiểm tra bằng chứng của bước này</span></label></div></section>)}
  <p>Căn cứ tham khảo: <a href="https://thuvienphapluat.vn/van-ban/the-thao-y-te/decree-15-2018-nd-cp-elaboration-law-of-food-safety-375807.aspx" target="_blank" rel="noreferrer">Nghị định 15/2018/NĐ-CP</a> · <a href="https://baochinhphu.vn/tiep-tuc-ap-dung-nghi-dinh-15-2018-nd-cp-ve-an-toan-thuc-pham-cho-den-khi-co-quy-dinh-moi-102260408123934123.htm" target="_blank" rel="noreferrer">Nghị quyết 15/2026/NQ-CP</a>. Rà soát pháp lý trước ngày nộp.</p>
 </main>;
}

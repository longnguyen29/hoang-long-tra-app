"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import styles from "./DocumentApprovals.module.css";

const endpoint = "/api/staff/document-approval";
const reasons = {
  forbidden:"Tài khoản chưa có quyền thực hiện thao tác này.",
  invalid_form:"Chọn file PDF, pháp nhân và một hoặc hai người ký.",
  invalid_pdf:"Chọn PDF chưa có chữ ký số, tối đa 3 MB và 40 trang.",
  invalid_png:"Chọn ảnh PNG rõ nét, tối đa 350 KB.",
  invalid_signer:"Người ký cần có tài khoản Hoàng Long đang hoạt động.",
  entity_mismatch:"Pháp nhân không khớp với hồ sơ đơn hàng.",
  changed:"Hồ sơ vừa thay đổi. Hãy xem lại trước khi xác nhận.",
  incomplete:"Tài liệu còn chờ người ký.",
};
async function call(suffix="",options={}) {
  const {data:{session}}=await createClient().auth.getSession();
  if (!session?.access_token) throw new Error(reasons.forbidden);
  const response=await fetch(endpoint+suffix,{...options,headers:{Authorization:`Bearer ${session.access_token}`}});
  if (!response.ok) {
    const body=await response.json().catch(()=>null);
    throw new Error(reasons[body?.error]||"Chưa thực hiện được thao tác. Hãy thử lại.");
  }
  return response;
}

export default function DocumentApprovals({orderId="",sellerId="",signOnly=false}) {
  const [data,setData]=useState(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");
  const [reviewed,setReviewed]=useState({});
  const [open,setOpen]=useState(null);
  const load=useCallback(async()=>{
    try { setData(await (await call()).json()); }
    catch (failure) { setError(failure.message); }
  },[]);
  useEffect(()=>{load()},[load]);

  async function submit(event,packet) {
    event.preventDefault();
    if (busy) return;
    const form=event.currentTarget, body=new FormData(form);
    body.set("action",packet?"approve":"create");
    if (packet) {
      body.set("id",packet.id);body.set("sha",packet.sha);body.set("version",String(packet.version));
    } else if (orderId) body.set("order",orderId);
    setBusy(true);setError("");setNotice("");
    try {
      await call("",{method:"POST",body});
      form.reset();setOpen(null);
      setNotice(packet?"Đã ghi nhận xác nhận của bạn.":"Đã tạo yêu cầu ký.");
    } catch(failure) { setError(failure.message); }
    finally { await load();setBusy(false); }
  }
  async function download(packet,approved) {
    setError("");
    try {
      const response=await call(`?id=${packet.id}&file=${approved?"approved":"source"}`);
      const url=URL.createObjectURL(await response.blob());
      const anchor=document.createElement("a");
      anchor.href=url;
      anchor.download=`HL-${packet.id.slice(0,8)}-${approved?"xac-nhan":"goc"}.pdf`;
      anchor.click();
      setTimeout(()=>URL.revokeObjectURL(url),10000);
      if (!approved) setReviewed(previous=>({...previous,[packet.id]:packet.sha}));
    } catch(failure) { setError(failure.message); }
  }
  const packets=data?.packets.filter(packet=>!orderId||packet.order===orderId)??[];
  return <main className={styles.page} data-no-translate>
    <header><Link href={signOnly?"/admin/login":"/admin/documents"}>{signOnly?"Đăng nhập Hoàng Long":"← Tài liệu công ty"}</Link><h1>Ký &amp; đóng dấu</h1>
      <p>Duyệt nội bộ trên đúng bản PDF. Mỗi người dùng tài khoản riêng để xác nhận.</p></header>
    {error&&<p role="alert" className={styles.error}>{error} <button type="button" onClick={load} disabled={busy}>Tải lại</button></p>}
    {notice&&<p role="status">{notice}</p>}
    {!data&&!error&&<p role="status">Đang tải hồ sơ…</p>}
    {data&&<>
      <section aria-labelledby="packet-list">
        <h2 id="packet-list">Hồ sơ ký {orderId&&`· ${orderId}`}</h2>
        {!packets.length&&<p>Chưa có hồ sơ ký.</p>}
        {packets.map(packet=>{
          const complete=packet.signers.every(id=>packet.approvals[id]);
          const canSign=packet.signers.includes(data.viewer)&&!packet.approvals[data.viewer];
          const names=Object.fromEntries(data.people.map(person=>[person.id,person.name]));
          return <article className={styles.packet} key={packet.id}>
            <div className={styles.packetHead}><h3>{packet.title}</h3><strong>{complete?"Đã xác nhận":"Chờ ký"}</strong></div>
            <p>{packet.seller==="green-hill"?"Green Hill":"Hoàng Long"}{packet.stamped?" · Có dấu hình ảnh":""}{packet.order&&` · ${packet.order}`}</p>
            <ul>{packet.signers.map(id=><li key={id}>{packet.approvals[id]?.name||names[id]||"Người được phân công"}
              {packet.approvals[id]?` · ${new Date(packet.approvals[id].at).toLocaleString("vi-VN",{timeZone:"Asia/Ho_Chi_Minh"})}`:" · Chờ ký"}</li>)}</ul>
            <div className={styles.actions}>
              <button type="button" onClick={()=>download(packet,false)}>Tải PDF gốc để xem</button>
              {complete&&<button type="button" onClick={()=>download(packet,true)}>Tải PDF có trang xác nhận</button>}
              {canSign&&<button type="button" disabled={busy||reviewed[packet.id]!==packet.sha} onClick={()=>setOpen(open===packet.id?null:packet.id)}>Ký xác nhận</button>}
            </div>
            {open===packet.id&&canSign&&<form onSubmit={event=>submit(event,packet)}>
              <label>Ảnh chữ ký của bạn (PNG, tùy chọn)<input type="file" name="signature" accept="image/png" disabled={busy}/></label>
              <label className={styles.check}><input type="checkbox" name="consent" value="yes" required disabled={busy}/>Tôi đã đọc và đồng ý với nội dung PDF gốc này.</label>
              <button type="submit" disabled={busy}>{busy?"Đang lưu…":"Xác nhận bằng tài khoản của tôi"}</button>
            </form>}
          </article>;
        })}
      </section>
      {data.canCreate&&!signOnly&&<details className={styles.newPacket} open={packets.length?undefined:true}>
        <summary>Tạo yêu cầu ký</summary>
        <form onSubmit={event=>submit(event,null)}>
          <label>Tên tài liệu<input name="title" required maxLength={160} placeholder="Ví dụ: Hợp đồng mua bán tháng 12" disabled={busy}/></label>
          <label>Pháp nhân<select name="seller" defaultValue={sellerId||"hoang-long"} disabled={busy}>
            <option value="hoang-long">Hoàng Long</option><option value="green-hill">Green Hill</option>
          </select></label>
          <label>Bản PDF cần ký<input type="file" name="pdf" accept="application/pdf,.pdf" required disabled={busy}/><small>Tối đa 3 MB. Tải bản đã rà soát.</small></label>
          <fieldset><legend>Chọn một hoặc hai người ký</legend>
            {data.people.map(person=><label className={styles.check} key={person.id}>
              <input type="checkbox" name="signer" value={person.id} defaultChecked={person.id===data.viewer} disabled={busy}/>
              {person.id===data.viewer?`${person.name} (Bạn)`:person.name}
            </label>)}
          </fieldset>
          {data.canStamp&&<fieldset><legend>Dấu pháp nhân (tùy chọn)</legend>
            <label>Ảnh dấu PNG<input type="file" name="stamp" accept="image/png" disabled={busy}/></label>
            <label className={styles.check}><input type="checkbox" name="stampConsent" value="yes" disabled={busy}/>Tôi có quyền sử dụng dấu của pháp nhân này trên tài liệu.</label>
          </fieldset>}
          <button type="submit" disabled={busy}>{busy?"Đang lưu…":"Tạo yêu cầu ký"}</button>
        </form>
      </details>}
    </>}
  </main>;
}

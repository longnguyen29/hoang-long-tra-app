"use client";

import {useEffect,useMemo,useState} from "react";
import Link from "next/link";
import {ArrowLeft,FileCheck2,Leaf,Printer,ShieldCheck} from "lucide-react";
import {createClient} from "@/lib/supabase/client";
import styles from "./BatchPassport.module.css";

const date=value=>value?new Intl.DateTimeFormat("vi-VN",{day:"2-digit",month:"long",year:"numeric"}).format(new Date(value)):"—";

export default function BatchPassport({code}){
 const supabase=useMemo(()=>createClient(),[]),[batch,setBatch]=useState(undefined);
 useEffect(()=>{supabase.rpc("public_batch_passport",{p_code:code}).then(({data})=>setBatch(data||null))},[code,supabase]);
 if(batch===undefined)return <main className={styles.state}><Leaf/><p>Đang mở hồ sơ lô trà…</p></main>;
 if(!batch)return <main className={styles.state}><FileCheck2/><h1>Không tìm thấy lô trà đã công bố.</h1><Link href="/"><ArrowLeft/>Về Nhà Hoàng Long</Link></main>;
 return <main className={styles.page}><header><Link href="/"><ArrowLeft/>Nhà Hoàng Long</Link><button onClick={()=>window.print()}><Printer/>In / lưu PDF</button></header><section className={styles.hero}><div><p>Tea batch passport</p><span className={styles.code}>{batch.code}</span><h1>{batch.name?.vi||batch.name?.en||"Hồ sơ lô trà"}</h1><div className={styles.verified}><ShieldCheck/><span><b>Hồ sơ do Nhà Hoàng Long phát hành</b><small>Nguồn gốc và thông số gắn với lô thực tế.</small></span></div></div>{batch.photo_url?<img src={batch.photo_url} alt=""/>:<figure><Leaf/></figure>}</section><section className={styles.facts}>{[["Vùng trà",batch.origin],["Người chế biến",batch.producer],["Ngày hái",date(batch.harvest_date)],["Mùa vụ",batch.season],["Giống trà",batch.cultivar],["Quy trình",batch.process],["Độ ẩm",batch.moisture_percent?`${batch.moisture_percent}%`:"—"],["Phân hạng",batch.grade]].map(([label,value])=><article key={label}><span>{label}</span><b>{value||"—"}</b></article>)}</section><section className={styles.notes}><div><p>Ghi chú nếm</p><h2>{batch.tasting_notes?.vi||batch.tasting_notes?.en||"Hương vị được ghi nhận khi lô trà được duyệt xuất."}</h2></div><dl>{Object.entries(batch.quality_metrics||{}).filter(([,value])=>value).map(([key,value])=><div key={key}><dt>{key==="aroma"?"Hương":key==="liquor"?"Nước trà":key==="leaf"?"Bã lá":key}</dt><dd>{value}</dd></div>)}</dl></section><footer><span>House of Hoàng Long · Hà Giang · Since 1995</span><b>{batch.code}</b></footer></main>;
}

"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { MISSIONS, OUTCOMES, weekKey, shiftWeek, count, missionScore, missionRank, trackedPosts, normalizeWeek } from "@/lib/growth-missions.mjs";
import styles from "./GrowthMissions.module.css";

function Step({label,value,change}) {
  return <div className={styles.step}><button type="button" disabled={!value} aria-label={"Giảm "+label} onClick={()=>change(-1)}>−</button><b>{value}</b><button type="button" disabled={value>=9999} aria-label={"Tăng "+label} onClick={()=>change(1)}>+</button></div>;
}
function Plant({score}) {
 return <svg viewBox="0 0 120 130" width="112" aria-hidden="true">
 <circle cx="60" cy="62" r="54" fill="#ffffff" opacity=".06"/>
 <path d="M42 99H78L73 120Q60 124 47 120Z" fill="#b69b72"/>
 <path d={"M60 99Q55 70 60 "+(95-score*.65)} stroke="#a5bd80" strokeWidth="4" fill="none" strokeLinecap="round"/>
 {[0,20,40,60,80].map((n,i)=>score>=n+10&&<g key={n} transform={"translate(60 "+(91-i*12)+") rotate("+(i%2?145:-35)+")"}><path d="M0 0Q14 -22 32 -8Q22 9 0 0" fill={i%2?"#b7ca88":"#79a36b"}/><path d="M0 0L27 -7" stroke="#e0e9c1" opacity=".7"/></g>)}
 {score===100&&<circle cx="60" cy="23" r="5" fill="#f1cf84"/>}</svg>;
}
export default function GrowthMissions({userId,supabase,allowedModules=[]}) {
 const [week,setWeek]=useState(""); const [today,setToday]=useState("");
 const [history,setHistory]=useState({}); const [error,setError]=useState(false);
 const [experiments,setExperiments]=useState(null);
 const key="hl-growth-missions-v1:"+userId;
 useEffect(()=>{
   const current=weekKey(); setWeek(current);setToday(current);
   try {const raw=JSON.parse(localStorage.getItem(key)||"{}");setHistory(raw&&typeof raw==="object"&&!Array.isArray(raw)?raw:{});setError(false);}
   catch{setHistory({});setError(true);}
   const timer=setInterval(()=>setToday(weekKey()),60000);
   return ()=>clearInterval(timer);
 },[key]);
 useEffect(()=>{let active=true; (async()=>{try{const {data,error}=await supabase.rpc("growth_lab_snapshot");if(active&&!error)setExperiments(data?.experiments||[]);}catch{}})();return()=>{active=false};},[supabase]);
 if(!week)return null;
 const entry=normalizeWeek(history[week]);const recorded=trackedPosts(experiments||[],week);
 const totals={...entry.counts,posts:entry.counts.posts+recorded};
 const score=missionScore(totals);const complete=MISSIONS.filter(m=>totals[m.id]>=m.target).length;
 const next=[...MISSIONS].filter(m=>totals[m.id]<m.target).sort((a,b)=>b.weight/b.target-a.weight/a.target)[0];
 const allowed=m=>allowedModules===null||allowedModules.includes(m);
 function save(value){const updated={...history,[week]:value};setHistory(updated);try{localStorage.setItem(key,JSON.stringify(updated));setError(false);}catch{setError(true);}}
 function change(group,id,delta){save({...entry,[group]:{...entry[group],[id]:count(entry[group][id]+delta)}});}
 return <section className={styles.board} aria-labelledby="growth-mission-title">
 <header className={styles.header}><div><small>GROWTH ENGINE · VƯỜN TĂNG TRƯỞNG</small><h2 id="growth-mission-title">Gieo cơ hội. Gặt khách hàng.</h2><p>6 nhiệm vụ mỗi tuần · Không cần ngân sách quảng cáo.</p></div><div className={styles.week}><button type="button" aria-label="Tuần trước" onClick={()=>setWeek(shiftWeek(week,-1))}>←</button><b>Tuần {week.split("-").reverse().join("/")}</b><button type="button" aria-label="Tuần sau" disabled={week>=today} onClick={()=>setWeek(shiftWeek(week,1))}>→</button>{week!==today&&<button type="button" onClick={()=>setWeek(today)}>Tuần này</button>}</div></header>
 <div className={styles.hero}><div><small>CẤP ĐỘ TUẦN</small><h3>{missionRank(score)}</h3><strong>{score} / 100 XP</strong><progress value={score} max={100} aria-label="XP tuần"/><p>{complete}/6 nhiệm vụ · {next?"Ưu tiên: "+next.label:"Đạt mục tiêu tuần!"}</p><div className={styles.levels}>{[[0,"Gieo hạt"],[40,"Bén rễ"],[70,"Tán xanh"],[100,"Vững mạnh"]].map(([n,l])=><span key={n} data-reached={score>=n}>{score>=n?"✓ ":""}{l}</span>)}</div></div><Plant score={score}/></div>
 <div className={styles.grid}><section className={styles.panel}><h3>Nhiệm vụ tuần</h3>{MISSIONS.map(m=><article key={m.id} className={styles.quest}><div><b>{m.label} {totals[m.id]>=m.target?"✓":""}</b><small>{m.detail}</small><progress value={Math.min(totals[m.id],m.target)} max={m.target} aria-label={m.label}/><small>{totals[m.id]}/{m.target} · tối đa {m.weight} XP</small>{m.id==="posts"&&<small>{experiments===null?"Chưa đọc được số bài Growth Lab.":recorded+" bài từ Growth Lab; nút + chỉ ghi bài ngoài hệ thống."}</small>}{m.href&&allowed(m.module)&&<Link href={m.href}>Mở công việc →</Link>}</div><Step label={m.label} value={entry.counts[m.id]} change={d=>change("counts",m.id,d)}/></article>)}</section>
 <div className={styles.side}><section className={styles.panel}><h3>Kết quả kinh doanh</h3><p>Ghi kết quả thật, tách khỏi XP.</p>{OUTCOMES.map(o=><div className={styles.outcome} key={o.id}><span>{o.label}</span><Step label={o.label} value={entry.outcomes[o.id]} change={d=>change("outcomes",o.id,d)}/></div>)}<small>Nhập tay, chưa đối soát CRM.</small></section>
 <section className={styles.panel}><h3>Brief thứ Hai</h3><label htmlFor="growth-focus">Ba cơ hội ưu tiên</label><textarea id="growth-focus" rows={5} maxLength={1000} value={entry.focus} onChange={e=>save({...entry,focus:e.target.value})} placeholder="Dán ưu tiên từ bản tin Growth Engine. Không nhập thông tin riêng tư của khách."/><small>Chưa tự đồng bộ từ bản tin.</small></section>
 <section className={styles.panel}><h3>Trạm làm việc</h3><div className={styles.links}><a href="#growth-lab-workbench">Content Studio →</a>{[["discovery","Customer Radar","/admin/discovery"],["pipeline","CRM","/admin/pipeline"],["customerMemory","Trí nhớ khách hàng","/admin/customer-memory"]].filter(([m])=>allowed(m)).map(([m,l,h])=><Link key={m} href={h}>{l} →</Link>)}</div></section></div></div>
 <p role="status" className={styles.footer}>{error?"Không lưu được trên trình duyệt. Dữ liệu có thể mất khi tải lại.":"Tiến độ lưu trên trình duyệt này theo tài khoản; tuần cũ vẫn xem được. Chưa đồng bộ giữa thiết bị."}</p>
 </section>;
}

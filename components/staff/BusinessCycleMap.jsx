"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, CalendarDays } from "lucide-react";
import { businessPhases, reviewLabel } from "@/lib/business-cycle";
import styles from "./BusinessCycleMap.module.css";

const dateLabel=date=>date.split("-").reverse().join("/");
const planHref="/admin/control?tab=plan#nhip-kinh-doanh";
export default function BusinessCycleMap({supabase,revision=0}) {
  const [snapshot,setSnapshot]=useState(null);
  const [unavailable,setUnavailable]=useState(false);
  useEffect(()=>{
    const controller=new AbortController();
    (async()=>{
      try {
        const {data:{session}}=await supabase.auth.getSession();
        if (!session?.access_token) throw new Error();
        const response=await fetch("/api/staff/business-plan?view=cycle",{
          headers:{Authorization:`Bearer ${session.access_token}`},signal:controller.signal,
        });
        if (!response.ok) throw new Error();
        const value=await response.json();
        if (!controller.signal.aborted) { setSnapshot(value);setUnavailable(false); }
      } catch {
        if (!controller.signal.aborted) { setSnapshot(null);setUnavailable(true); }
      }
    })();
    return ()=>controller.abort();
  },[supabase,revision]);

  const saved=snapshot?.active;
  const selected=businessPhases.find(phase=>phase.id===saved?.cycle.phase);
  const suggested=businessPhases[0];
  const focus=saved?.focus || selected?.advice || suggested.advice;

  return <section className={styles.card} aria-labelledby="business-cycle-title" data-no-translate>
    <div className={styles.copy}>
      <h2 id="business-cycle-title">Nhịp kinh doanh Hoàng Long</h2>
      {unavailable?<p role="status">Chưa tải được nhịp hiện tại.</p>:!snapshot?<p role="status">Đang tải nhịp hiện tại…</p>:<>
        <p className={styles.phase}>{selected?"Đang ở":"Gợi ý để bắt đầu"} <strong>{(selected||suggested).label}</strong></p>
        <p className={styles.focus}>{focus}</p>
        {saved&&<>
          <p className={styles.timing}><CalendarDays size={15} aria-hidden="true"/>
            <span>Từ {dateLabel(saved.cycle.startsOn)} · Xem lại {dateLabel(saved.cycle.reviewOn)}</span>
            <b data-late={saved.cycle.reviewOn<snapshot.today}>{reviewLabel(saved.cycle.reviewOn,snapshot.today)}</b>
          </p>
          <p className={styles.exit}><b>Chuyển nhịp khi</b> {saved.cycle.readyWhen}</p>
        </>}
      </>}
      <Link href={planHref}>{saved?"Cập nhật nhịp":"Mở kế hoạch nhịp"} <ArrowRight size={16} aria-hidden="true"/></Link>
    </div>
    <div className={styles.cycle}>
      <span className={styles.center} aria-hidden="true"><small>Chu kỳ</small><b>Hoàng Long</b></span>
      <ol aria-label="Các giai đoạn của chu kỳ kinh doanh">
        {businessPhases.map(phase=><li key={phase.id} data-phase={phase.id}
          aria-current={selected?.id===phase.id?"step":undefined}
          data-suggested={Boolean(snapshot&&!selected&&phase.id===suggested.id)}>
          <span className={styles.dot} aria-hidden="true"/><span><b>{phase.label}</b><small>{phase.verb}</small></span>
        </li>)}
      </ol>
    </div>
  </section>;
}

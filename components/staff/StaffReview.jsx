"use client";
// Development-only fixture. No customer database calls or writes.
import { useMemo, useState } from "react";
import MorningDesk from "./MorningDesk";
import CustomerJourneyPanel from "./CustomerJourneyPanel";
export default function StaffReview() {
  const [offline, setOffline] = useState(false);
  const client = useMemo(() => {
    const response = () => ({ data: [], error: offline ? { message: "Review connection failure" } : null });
    const query = { select(){return this},eq(){return this},neq(){return this},order(){return this},limit(){return this},then(resolve){return Promise.resolve(response()).then(resolve)} };
    return {from:()=>Object.create(query),rpc:async name => ({data:name === "morning_desk_snapshot" ? {preference:{mode:"sales"},focus:[],queue:{new_samples:2},operations:{today_actions:{},reorders:[],stock:[]},memory:{inbox:[],approved:[]}} : {has_active_period:true},error:offline ? {message:"Review connection failure"}:null})};
  },[offline]);
  return <>
    <div style={{padding:"var(--space-sm)",background:"var(--color-paper-3)"}}><b>Bản xem thử · Dữ liệu minh họa · Không ghi dữ liệu</b> <button onClick={()=>setOffline(!offline)}>{offline ? "Khôi phục kết nối mô phỏng" : "Mô phỏng lỗi tải"}</button></div>
    <MorningDesk supabase={client} email="review@example.test" role="sales" onLogout={()=>{}}/>
    <div style={{padding:"var(--space-md)"}}><CustomerJourneyPanel journey={{counts:{samples:1,recipes:1,quotes:0,orders:0},timeline:[],actions:[{key:"review",kind:"sample",title:"Kiểm tra kết quả thử mẫu",detail:"Tình huống minh họa: chờ phản hồi về độ đậm và hương trà.",dueAt:new Date().toISOString(),priority:1}],lastActivityAt:null}} onCommand={()=>{}}/></div>
  </>;
}

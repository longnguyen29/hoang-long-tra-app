"use client";
// Development-only fixture. Updates are in memory only; no customer database is used.
import { useMemo, useState } from "react";
import WorkBoard from "./WorkBoard";
import MorningDesk from "./MorningDesk";
import StaffWorkbench, {OrderDetail} from "./StaffWorkbench";
import TradePipeline from "./TradePipeline";
import OperationsControl from "./OperationsControl";
import HouseControl from "./HouseControl";
import RecipeLab from "./RecipeLab";
import BusinessControl from "./BusinessControl";
import GrowthLab from "./GrowthLab";
const SCREENS={work:["Giao việc",WorkBoard],today:["Hôm nay",MorningDesk],orders:["Đơn hàng",StaffWorkbench],pipeline:["Khách hàng",TradePipeline],operations:["Vận hành",OperationsControl],house:["Website",HouseControl],recipes:["Công thức",RecipeLab],control:["Thiết lập",BusinessControl],growth:["Nội dung",GrowthLab]};
export default function StaffReview() {
 const [offline,setOffline]=useState(false),[screen,setScreen]=useState('today'),[orderOpen,setOrderOpen]=useState(false);
 const [reviewOrder,setReviewOrder]=useState({id:'REVIEW-001',type:'retail',customerName:'Quán minh họa',contact:'review@example.test',stage:'confirm_details',health:'on_track',estimatedTotal:1000000,lines:[{name:{vi:'Trà minh họa'},qty:2,unit:'kg',price:500000}]});
 const [reviewInvoice,setReviewInvoice]=useState(false);
 const updateReviewOrder=async patch=>{setReviewOrder(current=>{const next={...current,...(patch.type?{type:patch.type}:{})};if(patch.linePrices){next.lines=current.lines.map((line,index)=>({...line,price:patch.linePrices.find(item=>item.index===index)?.price??null}));next.estimatedTotal=next.lines.some(line=>line.price===null)?null:next.lines.reduce((sum,line)=>sum+line.qty*line.price,0)}return next});return true};
 const client=useMemo(()=>{
  const rows={trade_opportunities:[{id:'review-cafe',business_name:'Quán minh họa',contact:'review@example.test',stage:'sample_sent',source_type:'sample',next_action:'Hỏi kết quả pha thử',next_action_at:'2026-09-05T09:00:00+07:00',updated_at:'2026-09-03T09:00:00+07:00',created_at:'2026-09-01T09:00:00+07:00',owner:'review@example.test',monthly_potential_kg:10,notes:'Dữ liệu minh họa để kiểm tra giao diện.'}]};
  const deny={data:null,error:{message:'Bản xem thử không ghi dữ liệu'}};
  function from(table){const query={singleRow:false,write:false};const chain={then(resolve){return Promise.resolve(query.write?deny:{data:query.singleRow?null:(rows[table]||[]),error:offline?{message:'Review connection failure'}:null}).then(resolve)}};
   for(const method of ['select','eq','neq','order','limit','in','gte','lte','is','not','range','or','abortSignal'])chain[method]=()=>chain;
   for(const method of ['single','maybeSingle'])chain[method]=()=>{query.singleRow=true;return chain};
   for(const method of ['insert','update','upsert','delete'])chain[method]=()=>{query.write=true;return chain};return chain;
  }
  return {from,auth:{getSession:async()=>({data:{session:null}})},rpc:async name=>{
   let data;
   if(name==='morning_desk_snapshot')data={preference:{mode:'sales'},focus:[],queue:{},operations:{today_actions:{},reorders:[],stock:[]},memory:{inbox:[],approved:[]}};
   else if(name==='budget_morning_snapshot')data={has_active_period:true};
   else if(name.endsWith('_snapshot'))data={};
   else if(name==='customer_profiles_summary')data=[];
   else return deny;
   return {data,error:offline?{message:'Review connection failure'}:null};
  }};
 },[offline]);
 const Component=SCREENS[screen][1];
 return <>
  <div style={{padding:'var(--space-sm)',background:'var(--color-paper-3)'}}><b>Bản xem thử · Dữ liệu minh họa · Không ghi dữ liệu</b><div style={{display:'flex',gap:'var(--space-xs)',flexWrap:'wrap',marginTop:'var(--space-xs)'}}><label>Màn hình <select value={screen} onChange={event=>setScreen(event.target.value)}>{Object.entries(SCREENS).map(([id,[label]])=><option key={id} value={id}>{label}</option>)}</select></label><button onClick={()=>setOffline(!offline)}>{offline?'Khôi phục kết nối mô phỏng':'Mô phỏng lỗi tải'}</button><button onClick={()=>setOrderOpen(true)}>Xem chi tiết đơn minh họa</button><button onClick={()=>setReviewInvoice(value=>!value)}>{reviewInvoice?"Bỏ công nợ minh họa":"Thêm công nợ minh họa"}</button></div></div>
  <Component key={screen} supabase={client} userId="review-staff" email="review@example.test" role="sales" onLogout={()=>{}}/>
  {orderOpen&&<OrderDetail onDelete={async()=>({error:"Đây là bản minh họa. Không xoá dữ liệu thật."})} order={reviewOrder} events={[]} costs={[]} receivable={reviewInvoice?{id:'review-payment',status:'partial',total:1000000,paid:300000}:null} loadingEvents={false} saving={false} healthDraft="on_track" setHealthDraft={()=>{}} waitingDraft="us" setWaitingDraft={()=>{}} healthNoteDraft="" setHealthNoteDraft={()=>{}} trackingDraft="" setTrackingDraft={()=>{}} carrierDraft="" setCarrierDraft={()=>{}} onUpdate={updateReviewOrder} onIssueReceivable={async()=>false} onRecordPayment={async()=>false} onAddCost={async()=>false} onSyncCosts={async()=>false} onDeleteCost={async()=>false} onClose={()=>setOrderOpen(false)}/>}
 </>;
}

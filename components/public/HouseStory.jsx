"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Globe2, Mountain } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { fromVendorRow } from "@/lib/mappers";
import { CATEGORIES } from "@/lib/constants";
import styles from "./PublicLongform.module.css";

const COPY={
  vi:{back:"Nhà Hoàng Long",switcher:"EN",eyebrow:"Nhà làm trà · từ 1995",title:"Không phải chuyện nông trại. Là câu chuyện của một nhà làm trà.",intro:"Hoàng Long đứng giữa cây trà cổ thụ trên núi và những người sẽ uống trà ở một nơi rất xa. Công việc của Nhà là giữ cho mối nối ấy trung thực.",chapter:"Cách Nhà làm việc",body:["Chúng tôi không sở hữu cả ngọn núi. Trà bắt đầu từ quan hệ lâu dài với người hái, người giữ rừng và những vùng cây Shan Tuyết đã sống trước chúng ta nhiều thế hệ.","Tại xưởng, kinh nghiệm gia đình gặp kỷ luật chế biến Nhật Bản. Không phải để làm trà Việt giống trà Nhật, mà để kiểm soát nhiệt, nước và thời gian đủ chính xác cho bản sắc của lá trà được hiện ra rõ hơn."],people:"Những người và vùng đất phía sau lá",archive:"Hồ sơ của Nhà",empty:"Những ghi chép của Nhà đang được chuẩn bị.",read:"Đọc ghi chép",close:"Trở lại hồ sơ",closing:"Giữ nguồn gốc gần với người uống.",tea:"Xem trà mùa này"},
  en:{back:"House of Hoàng Long",switcher:"VI",eyebrow:"A tea house · since 1995",title:"Not a farm story. The story of a working tea house.",intro:"Hoàng Long stands between old trees on the mountain and people who may drink their tea very far away. The work of the house is to keep that connection honest.",chapter:"How the house works",body:["We do not own an entire mountain. Tea begins with long relationships—with pickers, forest keepers, and places where Shan Tuyết trees have lived for generations before us.","At the factory, family experience meets Japanese processing discipline. Not to make Vietnamese tea imitate Japanese tea, but to control heat, water and time precisely enough for the leaf's own identity to become clearer."],people:"The people and places behind the leaf",archive:"The house record",empty:"The house record is being prepared.",read:"Read the record",close:"Return to the record",closing:"Keep origin close to the person drinking.",tea:"See this season's tea"}
};

export default function HouseStory(){
  const [lang,setLang]=useState("vi"); const [home,setHome]=useState(null); const [vendors,setVendors]=useState([]); const [articles,setArticles]=useState([]); const [active,setActive]=useState(null);
  const supabase=useMemo(()=>createClient(),[]); const t=COPY[lang]; const local=(v)=>v?.[lang]||v?.en||v?.vi||"";
  useEffect(()=>{let live=true;Promise.all([supabase.from("settings_home").select("*").eq("id",1).maybeSingle(),supabase.rpc("list_public_vendors"),supabase.from("wiki_articles").select("*").neq("category","brandkit")]).then(([h,v,a])=>{if(!live)return;if(!h.error)setHome(h.data);if(!v.error)setVendors((v.data||[]).map(fromVendorRow));if(!a.error)setArticles(a.data||[])});return()=>{live=false}},[supabase]);
  const activeArticle=articles.find(a=>a.id===active); const category=(id)=>CATEGORIES.find(c=>c.id===id)?.label?.[lang]||id;
  if(activeArticle)return <main className={styles.reader}><header><button onClick={()=>setActive(null)}><ArrowLeft size={17}/>{t.close}</button><button onClick={()=>setLang(lang==="vi"?"en":"vi")}><Globe2 size={15}/>{t.switcher}</button></header><article><p>{category(activeArticle.category)}</p><h1>{local(activeArticle.title)}</h1><div>{local(activeArticle.body)}</div></article></main>;
  return <main className={styles.page}>
    <header className={styles.header}><Link href="/"><ArrowLeft size={17}/>{t.back}</Link><button onClick={()=>setLang(lang==="vi"?"en":"vi")}><Globe2 size={15}/>{t.switcher}</button></header>
    <section className={styles.storyHero}><div><p>{t.eyebrow}</p><h1>{t.title}</h1><p>{t.intro}</p></div><figure><img src={home?.featured_photos?.[0]||"/landing/1.jpg"} alt="Ancient tea landscape in Hà Giang"/><figcaption>Hà Giang · Việt Nam</figcaption></figure></section>
    {home?.origin_stats?.length>0&&<section className={styles.stats}>{home.origin_stats.slice(0,4).map((s,i)=><div key={i}><b>{s.value}</b><span>{local(s.label)}</span></div>)}</section>}
    <section className={styles.chapter}><div><Mountain size={21}/><h2>{t.chapter}</h2></div><div>{t.body.map((p,i)=><p key={i}>{p}</p>)}</div></section>
    {(home?.producer_name||vendors.length>0)&&<section className={styles.people}><header><h2>{t.people}</h2></header>{home?.producer_name&&<article className={styles.producer}><figure><img src={home.producer_photo||"/landing/2.jpg"} alt={home.producer_name}/></figure><div>{local(home.producer_quote)&&<blockquote>“{local(home.producer_quote)}”</blockquote>}<h3>{home.producer_name}</h3><p>{local(home.producer_role)}</p></div></article>}<div className={styles.vendorGrid}>{vendors.map(v=><article key={v.id}>{v.photo&&<img src={v.photo} alt={v.name}/>}<span>{v.region}</span><h3>{v.name}</h3><p>{local(v.story)}</p></article>)}</div></section>}
    <section className={styles.archive}><header><h2>{t.archive}</h2><p>{articles.length?`${articles.length} ${lang==="vi"?"ghi chép đang mở":"records available"}`:t.empty}</p></header><div>{articles.map((a,i)=><button key={a.id} onClick={()=>setActive(a.id)}><span>{String(i+1).padStart(2,"0")}</span><span><small>{category(a.category)}</small><b>{local(a.title)}</b></span><span>{t.read}<ArrowRight size={16}/></span></button>)}</div></section>
    <footer className={styles.longFooter}><p>{t.closing}</p><Link href="/shop">{t.tea}<ArrowRight size={17}/></Link></footer>
  </main>
}

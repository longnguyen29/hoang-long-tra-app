"use client";

import { useEffect,useMemo,useState } from "react";
import Link from "next/link";
import { ArrowLeft,ArrowRight,Globe2,X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { fromGalleryRow } from "@/lib/mappers";
import { LIBRARY_CATEGORIES } from "@/lib/constants";
import { useLocale } from "@/components/i18n/LocaleProvider";
import styles from "./PublicLongform.module.css";

const COPY={vi:{back:"Nhà Hoàng Long",switcher:"EN",eyebrow:"Thư viện sống",title:"Hình ảnh, ghi chép và kiến thức từ đời sống của trà.",intro:"Nơi lưu lại những hình ảnh và kiến thức giúp bạn hiểu rõ hơn về lá trà, vùng trà và cách pha.",images:"Từ xưởng và vùng trà",reading:"Bài đọc về trà",emptyImages:"Những hình ảnh đầu tiên đang được chuẩn bị.",emptyReading:"Những bài đọc đầu tiên đang được chuẩn bị.",read:"Mở bài",close:"Đóng bài",closing:"Đọc chậm hơn. Nhìn kỹ hơn."},en:{back:"House of Hoàng Long",switcher:"VI",eyebrow:"A living library",title:"Images, field notes and knowledge from the life of tea.",intro:"A library that does not turn everything into content. It keeps only what helps us see the leaf, the place and the brew more clearly.",images:"From the factory and tea country",reading:"The tea reading room",emptyImages:"The first images are being prepared.",emptyReading:"The first readings are being prepared.",read:"Open article",close:"Close article",closing:"Read less. Look more closely."}};
export default function HouseJournal(){
 const {locale:lang,toggleLocale}=useLocale();const [images,setImages]=useState([]),[articles,setArticles]=useState([]),[active,setActive]=useState(null),[lightbox,setLightbox]=useState(null);const supabase=useMemo(()=>createClient(),[]),t=COPY[lang],local=v=>v?.[lang]||v?.en||v?.vi||"";
 useEffect(()=>{let live=true;Promise.all([supabase.from("gallery_images").select("*").order("created_at"),supabase.from("library_articles").select("*")]).then(([g,a])=>{if(!live)return;if(!g.error)setImages((g.data||[]).map(fromGalleryRow));if(!a.error)setArticles(a.data||[])});return()=>{live=false}},[supabase]);
 const article=articles.find(a=>a.id===active),category=id=>LIBRARY_CATEGORIES.find(c=>c.id===id)?.label?.[lang]||id;
 return <main className={styles.page}><header className={styles.header}><Link href="/"><ArrowLeft size={17}/>{t.back}</Link><button onClick={toggleLocale}><Globe2 size={15}/>{t.switcher}</button></header>
 <section className={styles.journalHero}><p>{t.eyebrow}</p><h1>{t.title}</h1><p>{t.intro}</p></section>
 <section className={styles.gallery}><header><h2>{t.images}</h2><span>{String(images.length).padStart(2,"0")}</span></header>{images.length?<div>{images.map((g,i)=><figure key={g.id} onClick={()=>setLightbox(g)}><img src={g.url} alt={local(g.caption)} loading={i>1?"lazy":undefined}/>{local(g.caption)&&<figcaption>{local(g.caption)}</figcaption>}</figure>)}</div>:<p>{t.emptyImages}</p>}</section>
 <section className={styles.reading}><header><h2>{t.reading}</h2><p>{articles.length?`${articles.length} ${lang==="vi"?"bài đọc":"articles"}`:t.emptyReading}</p></header><div>{articles.map((a,i)=><button key={a.id} onClick={()=>setActive(a.id)}><span>{String(i+1).padStart(2,"0")}</span><span><small>{category(a.category)}</small><b>{local(a.title)}</b></span><span>{t.read}<ArrowRight size={16}/></span></button>)}</div></section>
 <footer className={styles.longFooter}><p>{t.closing}</p><Link href="/story">{t.back}<ArrowRight size={17}/></Link></footer>
 {article&&<div className={styles.articleOverlay} role="dialog" aria-modal="true"><header><button onClick={()=>setActive(null)}><X size={18}/>{t.close}</button></header><article><p>{category(article.category)}</p><h2>{local(article.title)}</h2><div>{local(article.body)}</div></article></div>}
 {lightbox&&<div className={styles.lightbox} role="dialog" aria-modal="true" onClick={()=>setLightbox(null)}><button aria-label="Close"><X/></button><figure><img src={lightbox.url} alt={local(lightbox.caption)}/>{local(lightbox.caption)&&<figcaption>{local(lightbox.caption)}</figcaption>}</figure></div>}
 </main>
}

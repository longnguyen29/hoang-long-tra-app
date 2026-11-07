"use client";
import {useMemo,useState} from "react";
import {AROMA_FAMILIES,AROMA_TERMS,findAromaFamilies,normalizeSensoryTerm} from "@/lib/tea-sensory-aromas";
import {PALATE_TERMS,DEFECT_TERMS,SHAN_TERMS} from "@/lib/tea-sensory-reference";
import styles from "./TeaSensoryWheel.module.css";

const GROUPS=[
 {id:"aroma",vi:"Hương thơm",en:"Aroma",entries:AROMA_TERMS},
 {id:"palate",vi:"Vị & cảm giác miệng",en:"Taste & mouthfeel",entries:PALATE_TERMS},
 {id:"defects",vi:"Lỗi cảm quan · QC",en:"Sensory defects · QC",entries:DEFECT_TERMS},
 {id:"shan",vi:"Tham chiếu Shan Tuyết",en:"Shan Tuyết references",entries:SHAN_TERMS},
];
function polar(x,y,r,angle){const a=(angle-90)*Math.PI/180;return [x+r*Math.cos(a),y+r*Math.sin(a)];}
function segment(start,end,inner=80,outer=157){
 const [xo,yo]=polar(170,170,outer,start),[xe,ye]=polar(170,170,outer,end);
 const [xi,yi]=polar(170,170,inner,end),[xj,yj]=polar(170,170,inner,start);
 return `M ${xo} ${yo} A ${outer} ${outer} 0 ${end-start>180?1:0} 1 ${xe} ${ye} L ${xi} ${yi} A ${inner} ${inner} 0 ${end-start>180?1:0} 0 ${xj} ${yj} Z`;
}
function WheelGraphic({locale,active,onCategory,highlight,compact=false}){
 const hasHighlights=highlight.length>0;
 return <svg className={compact?styles.compactWheel:styles.wheel} viewBox="0 0 340 340" role="img" aria-label={locale==="en"?"Twelve aroma families in the House of Hoàng Long tea wheel":"Mười hai nhóm hương trong bánh xe cảm quan trà Hoàng Long"}>
  <circle cx="170" cy="170" r="165" fill="#f4efe7"/>
  {AROMA_FAMILIES.map((family,index)=>{
   const start=index*30+1,end=(index+1)*30-1;
   const dimmed=hasHighlights&&!highlight.includes(family.id);
   const chosen=active===family.id;
   const [tx,ty]=polar(170,170,125,index*30+15);
   return <g key={family.id} className={styles.wedge} data-active={chosen} data-dimmed={dimmed}>
    <path d={segment(start,end)} fill={family.color} stroke={chosen?"#3a4b40":"#fbf8f1"} strokeWidth={chosen?3:1.5} opacity={dimmed?.3:1}
      tabIndex={onCategory?0:undefined} role={onCategory?"button":undefined} aria-label={onCategory?(locale==="en"?family.en:family.vi):undefined}
      onClick={onCategory?()=>onCategory(family.id):undefined}
      onKeyDown={onCategory?e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();onCategory(family.id);}}:undefined}/>
    <text x={tx} y={ty} textAnchor="middle" dominantBaseline="central" fill="#27352b" fontSize="11" fontWeight="600" pointerEvents="none" opacity={dimmed?.25:1}>{String(index+1).padStart(2,"0")}</text>
   </g>;
  })}
  <circle cx="170" cy="170" r="75" fill="#20352b" stroke="#efe9dc" strokeWidth="3"/>
  <text x="170" y="152" textAnchor="middle" fill="#e2c99a" fontSize="12" fontWeight="700" letterSpacing="1.6">HOÀNG LONG</text>
  <text x="170" y="174" textAnchor="middle" fill="#fffaf0" fontSize="14" fontWeight="500">{locale==="en"?"Tea sensory":"Cảm quan trà"}</text>
  <text x="170" y="194" textAnchor="middle" fill="#c4cfc4" fontSize="10">{locale==="en"?"12 aroma families":"12 nhóm hương"}</text>
 </svg>;
}
const textFor=(entry,locale)=>locale==="en"?entry.en:entry.vi;
export default function TeaSensoryWheel({mode="master",locale="vi",notes=[],onSelect}){
 const lang=locale==="en"?"en":"vi",isProduct=mode==="product",isPicker=mode==="picker";
 const [tab,setTab]=useState("aroma"),[active,setActive]=useState("floral"),[search,setSearch]=useState("");
 const selected=Array.isArray(notes)?notes:[];
 const selectedNorm=useMemo(()=>new Set(selected.map(normalizeSensoryTerm)),[selected]);
 const highlighted=useMemo(()=>findAromaFamilies(selected),[selected]);
 const current=GROUPS.find(item=>item.id===tab)||GROUPS[0];
 const showFamily=tab==="aroma"&&!isProduct;
 const result=useMemo(()=>current.entries.filter(item=>(!showFamily||item.familyId===active)&&(!search.trim()||normalizeSensoryTerm(item.vi+" "+item.en).includes(normalizeSensoryTerm(search)))),[current,showFamily,active,search]);
 function isSelected(entry){return selectedNorm.has(normalizeSensoryTerm(entry.vi))||selectedNorm.has(normalizeSensoryTerm(entry.en));}
 if(isProduct){
  if(!selected.length)return null;
  return <section className={styles.product} aria-label={lang==="en"?"Tea tasting wheel":"Bánh xe hương vị"}>
   <div className={styles.productHeader}><span className={styles.eyebrow}>{lang==="en"?"TASTING PROFILE":"HỒ SƠ HƯƠNG VỊ"}</span><h2>{lang==="en"?"A portrait of the cup":"Chân dung chén trà"}</h2><p>{lang==="en"?"Notes from the published product record; aroma families are highlighted only when the wording matches the reference lexicon.":"Ghi chú từ hồ sơ sản phẩm đã công bố. Chỉ tô nhóm hương khi từ ngữ khớp bộ tham chiếu."}</p></div>
   <div className={styles.productContent}><WheelGraphic compact locale={lang} active={null} highlight={highlighted}/><div className={styles.productDetails}>
    <h3>{lang==="en"?"Recorded tasting notes":"Hương vị ghi nhận"}</h3>
    <ul className={styles.pills}>{selected.map((item,i)=><li key={i}>{item}</li>)}</ul>
    {!!highlighted.length&&<div className={styles.matches}>{AROMA_FAMILIES.filter(group=>highlighted.includes(group.id)).map(group=><span key={group.id}><i style={{backgroundColor:group.color}}/>{textFor(group,lang)}</span>)}</div>}
    <small>{lang==="en"?"Aroma notes describe sensory associations, not added ingredients. Profiles may vary by batch.":"Hương là liên tưởng cảm quan, không có nghĩa đã thêm nguyên liệu. Đặc tính có thể thay đổi theo lô."}</small>
   </div></div>
  </section>;
 }
 return <section className={styles.panel} aria-label="House of Hoàng Long tea sensory lexicon">
  <header className={styles.header}><div><span className={styles.eyebrow}>HOUSE OF HOÀNG LONG · SENSORY LAB</span><h2>{isPicker?"Chọn từ mô tả sản phẩm":"Bánh xe cảm quan trà · bản chuẩn"}</h2><p>{isPicker?"Chỉ chọn những đặc tính đã kiểm tra thực tế trên mẫu/lô; từ được lưu song ngữ vào sản phẩm.":"Bộ từ điển song ngữ nội bộ · 173 hương, 86 vị & cảm giác miệng, 40 lỗi, 58 gợi ý Shan Tuyết."}</p></div><span className={styles.edition}>EDITION 02 · 2026</span></header>
  <nav className={styles.tabs} aria-label="Chọn nhóm từ điển">{GROUPS.filter(item=>!isPicker||["aroma","palate"].includes(item.id)).map(item=><button key={item.id} type="button" aria-pressed={tab===item.id} onClick={()=>{setTab(item.id);setSearch("");}}>{item.vi}<small>{item.entries.length}</small></button>)}</nav>
  <div className={styles.body}>
   {tab==="aroma"&&<div className={styles.visual}><WheelGraphic locale="vi" active={active} highlight={isPicker?highlighted:[]} onCategory={setActive}/>
    <div className={styles.legend}>{AROMA_FAMILIES.map((family,i)=><button type="button" key={family.id} className={active===family.id?styles.current:""} aria-pressed={active===family.id} onClick={()=>setActive(family.id)}><i style={{backgroundColor:family.color}}/><span>{String(i+1).padStart(2,"0")} · {family.vi}<small>{family.en}</small></span></button>)}</div>
   </div>}
   <div className={styles.directory}>
    <div className={styles.directoryHead}><div><h3>{tab==="aroma"?AROMA_FAMILIES.find(item=>item.id===active)?.vi:current.vi}</h3><span>{result.length} {isPicker?"mô tả để chọn":"mục tham chiếu"}</span></div><input type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Tìm tiếng Việt / English…" aria-label="Tìm trong từ điển cảm quan"/></div>
    {tab==="defects"&&<p className={styles.caution}>Dùng nội bộ cho QC. Mùi lạ chưa xác định nguyên nhân; nghi mốc, nhiễm tạp hoặc hư hỏng cần kiểm tra phù hợp, không công bố tự động lên sản phẩm.</p>}
    {tab==="shan"&&<p className={styles.caution}>Chỉ là gợi ý đánh giá theo dòng trà Shan Tuyết, không phải kết quả kiểm nghiệm từng lô.</p>}
    <div className={styles.entries}>{result.map(item=>{
     const checked=isSelected(item);
     return isPicker?<button type="button" key={item.id} className={styles.entry} aria-pressed={checked} onClick={()=>onSelect?.(item)}><span className={styles.number}>{String(item.id).padStart(3,"0")}</span><strong>{item.vi}<small>{item.en}</small></strong><span className={styles.selectMark}>{checked?"✓":"+"}</span></button>
     :<div className={styles.entry} key={item.id}><span className={styles.number}>{String(item.id).padStart(3,"0")}</span><strong>{item.vi}<small>{item.en}</small></strong></div>;
    })}</div>
    {!result.length&&<p className={styles.noResults}>Không tìm thấy từ phù hợp.</p>}
    <footer className={styles.footer}>{isPicker?"Ghi chú đã chọn chỉ được công bố sau khi lưu sản phẩm. Không chọn gợi ý nếu chưa kiểm chứng.":"Dùng cùng quy trình nếm mẫu có kiểm soát. Hương mô tả không khẳng định trà có pha phụ gia."}</footer>
   </div>
  </div>
 </section>;
}

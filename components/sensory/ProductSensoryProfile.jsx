"use client";

import {useState} from "react";
import {readSensoryProfile,presentSensoryNotes} from "@/lib/tea-sensory-profile";
import styles from "./ProductSensoryProfile.module.css";

function point(radius,angle){
  const radians=(angle-90)*Math.PI/180;
  return [180+radius*Math.cos(radians),180+radius*Math.sin(radians)];
}
function wedge(index,count,intensity){
  const width=360/count;
  const start=index*width+Math.min(4,width*.08);
  const end=(index+1)*width-Math.min(4,width*.08);
  const inner=76,outer=92+intensity*13;
  const [a,b]=point(outer,start),[c,d]=point(outer,end);
  const [e,f]=point(inner,end),[g,h]=point(inner,start);
  const large=end-start>180?1:0;
  return `M ${a} ${b} A ${outer} ${outer} 0 ${large} 1 ${c} ${d} L ${e} ${f} A ${inner} ${inner} 0 ${large} 0 ${g} ${h} Z`;
}
const scaleVi=["","Rất nhẹ","Nhẹ","Cân bằng","Rõ nét","Nổi bật"];
const scaleEn=["","Very subtle","Subtle","Balanced","Pronounced","Prominent"];

export default function ProductSensoryProfile({flavors,locale="vi",productName="",preview=false}){
  const [active,setActive]=useState(0);
  const isEnglish=locale==="en";
  const profile=readSensoryProfile(flavors,{includeDraft:preview});
  const notes=profile?presentSensoryNotes(profile,locale):[];
  const chosen=notes[Math.min(active,notes.length-1)]||null;
  const oldNotes=Array.isArray(flavors?.[isEnglish?"en":"vi"])?flavors[isEnglish?"en":"vi"].filter(x=>typeof x==="string"&&x.trim()):[];
  return <section className={styles.root} aria-label={isEnglish?"Tea sensory profile":"Hồ sơ cảm quan trà"} data-preview={preview||undefined}>
    <div className={styles.head}>
      <div><p className={styles.kicker}>HOÀNG LONG · TEA SENSORY</p>
        <h2>{isEnglish?"A portrait of the cup":"Chân dung chén trà"}</h2>
        <p className={styles.subtitle}>{isEnglish?"A closer look at the tea's recorded aromas, taste and finish.":"Khám phá những tầng hương, vị và hậu vị đã ghi nhận của từng dòng trà."}</p>
      </div>
      <span className={styles.edition}>{preview?"ADMIN PREVIEW":"SENSORY NOTES"}</span>
    </div>
    {notes.length?
      <div className={styles.body}>
        <div className={styles.art}>
          <svg className={styles.chart} viewBox="0 0 360 360" role="img" aria-label={isEnglish?"Individual tea sensory wheel, with one segment per selected note":"Bánh xe cảm quan từng sản phẩm, mỗi lát là một mô tả được chọn"}>
            <circle cx="180" cy="180" r="158" fill="none" stroke="#e4ded0" strokeWidth="1"/>
            <circle cx="180" cy="180" r="130" fill="none" stroke="#e7e1d6" strokeDasharray="2 5" strokeWidth="1"/>
            <circle cx="180" cy="180" r="104" fill="none" stroke="#e7e1d6" strokeWidth="1"/>
            {notes.map((note,index)=> {
              const isActive=chosen?.key===note.key;
              const coord=point(113+note.intensity*5,index*360/notes.length+180/notes.length);
              return <g key={note.key} className={styles.slice} data-active={isActive}>
                <path d={wedge(index,notes.length,note.intensity)} fill={note.color} opacity={isActive?1:0.73}
                  stroke={isActive?"#314637":"#f8f5ee"} strokeWidth={isActive?3:1.8}
                  tabIndex={0} role="button" aria-label={`${note.label}, ${note.intensity}/5`}
                  onClick={()=>setActive(index)}
                  onKeyDown={event=>{if(event.key==="Enter"||event.key===" "){event.preventDefault();setActive(index);}}}>
                  <title>{`${note.label}: ${note.intensity}/5`}</title>
                </path>
                <text x={coord[0]} y={coord[1]} fontSize="12" fontWeight="700" dominantBaseline="middle" textAnchor="middle" pointerEvents="none" fill="#314637">{String(index+1).padStart(2,"0")}</text>
              </g>;
            })}
            <circle cx="180" cy="180" r="69" fill="#23392d"/>
            <text x="180" y="163" textAnchor="middle" fontSize="11" letterSpacing="2" fill="#d4b981">HOÀNG LONG</text>
            <text x="180" y="184" textAnchor="middle" fontSize="14" fill="#fffdf5">{isEnglish?"Tasting notes":"Hương vị trà"}</text>
            <text x="180" y="202" textAnchor="middle" fontSize="10" fill="#d2d8cc">{notes.length} {isEnglish?"descriptors":"tầng vị"}</text>
          </svg>
        </div>
        <div className={styles.key}>
          <p className={styles.keyTitle}>{isEnglish?"Explore the notes":"Khám phá tầng hương vị"}</p>
          <div className={styles.noteList} role="group" aria-label={isEnglish?"Select a tasting note":"Chọn mô tả cảm quan"}>
            {notes.map((note,index)=><button type="button" className={styles.note} data-active={chosen?.key===note.key} key={note.key} onClick={()=>setActive(index)} aria-pressed={chosen?.key===note.key}>
              <span className={styles.dot} style={{backgroundColor:note.color}}/>
              <span className={styles.noteName}><b>{String(index+1).padStart(2,"0")} · {note.label}</b><small>{isEnglish?note.vi:note.en}</small></span>
              <span className={styles.bars} aria-label={`${note.intensity} / 5`}>{[1,2,3,4,5].map(n=><i key={n} style={{backgroundColor:n<=note.intensity?note.color:undefined}}/>)}</span>
            </button>)}
          </div>
          {chosen&&<div className={styles.detail} aria-live="polite"><span>{isEnglish?"Selected characteristic":"Sắc thái đang xem"}</span>
            <strong>{chosen.label}</strong>
            <p>{(isEnglish?scaleEn:scaleVi)[chosen.intensity]} · {chosen.intensity}/5</p>
          </div>}
          <p className={styles.disclaimer}>{isEnglish?"Intensity is a relative tasting assessment, not a laboratory measurement. Aroma descriptions are sensory associations, not added ingredients. Profiles may vary by batch.":"Cường độ chỉ là đánh giá cảm quan tương đối, không phải kết quả phòng thí nghiệm. Hương mô tả là liên tưởng, không đồng nghĩa trà có thêm nguyên liệu. Có thể thay đổi theo lô."}</p>
        </div>
      </div>:
      <div className={styles.unrecorded}>
        <div className={styles.unrecordedIcon} aria-hidden="true"><span>皇龍</span></div>
        <div><strong>{isEnglish?"This tea's sensory portrait is being refined.":"Hồ sơ cảm quan đang được hoàn thiện."}</strong>
          <p>{isEnglish?"We'll share its aroma and finish profile after the tasting notes are verified.":"Nhà sẽ bổ sung bánh xe hương vị khi các ghi chú nếm được xác nhận."}</p>
          {!!oldNotes.length&&<div className={styles.legacy}><span>{isEnglish?"Existing catalogue notes":"Ghi chú hiện có"}</span><p>{oldNotes.join(" · ")}</p></div>}
        </div>
      </div>}
    {preview&&<p className={styles.previewMessage}>{profile?.published?"Đã bật công bố · bản mới xuất hiện sau khi lưu sản phẩm.":"Bản xem trước nội bộ · chưa hiển thị bánh xe chi tiết với khách."}</p>}
  </section>;
}

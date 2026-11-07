"use client";
import {useMemo,useState} from "react";
import {AROMA_FAMILIES,normalizeSensoryTerm} from "@/lib/tea-sensory-aromas";
import {SENSORY_TERMS,MAX_SENSORY_NOTES,readSensoryProfile,writeSensoryProfile,legacySensoryCandidates,presentSensoryNotes} from "@/lib/tea-sensory-profile";
import ProductSensoryProfile from "./ProductSensoryProfile";
import styles from "./ProductSensoryEditor.module.css";

const COPY={aroma:"Hương thơm",palate:"Vị · cảm giác miệng"};
export default function ProductSensoryEditor({flavors,onChange,productName=""}){
 const [kind,setKind]=useState("aroma");
 const [family,setFamily]=useState("all");
 const [search,setSearch]=useState("");
 const [notice,setNotice]=useState("");
 const profile=readSensoryProfile(flavors,{includeDraft:true})||{version:1,published:false,notes:[]};
 const selected=presentSensoryNotes(profile,"vi");
 const legacy=legacySensoryCandidates(flavors);
 const sourceNotes=Array.isArray(flavors?.vi)?flavors.vi:[];
 const filtered=useMemo(()=>SENSORY_TERMS.filter(term=>term.type===kind)
   .filter(term=>kind!=="aroma"||family==="all"||term.familyId===family)
   .filter(term=>!search.trim()||normalizeSensoryTerm(term.vi+" "+term.en).includes(normalizeSensoryTerm(search))),[kind,family,search]);
 const selectedKeys=new Set(profile.notes.map(item=>item.key));
 function update(next){onChange(writeSensoryProfile(flavors,next));setNotice("");}
 function toggle(term){
  if(selectedKeys.has(term.key)){update({...profile,notes:profile.notes.filter(item=>item.key!==term.key)});return;}
  if(profile.notes.length>=MAX_SENSORY_NOTES){setNotice(`Đã chọn tối đa ${MAX_SENSORY_NOTES} mô tả để bánh xe dễ đọc. Bỏ chọn một mục trước.`);return;}
  update({...profile,notes:[...profile.notes,{key:term.key,intensity:3}]});
 }
 function intensity(key,value){update({...profile,notes:profile.notes.map(item=>item.key===key?{...item,intensity:Number(value)}:item)});}
 function importLegacy(){const existing=new Set(profile.notes.map(item=>item.key));const notes=[...profile.notes,...legacy.filter(item=>!existing.has(item.key))].slice(0,MAX_SENSORY_NOTES);update({...profile,notes,published:false});}
 return <div className={styles.editor}>
  <div className={styles.intro}><div><span className={styles.eyebrow}>SENSORY PROFILE · EDITOR</span><h3>Hồ sơ cảm quan từng trà</h3><p>Chọn tối đa sáu mô tả đã xác nhận khi nếm mẫu, chỉnh cường độ 1–5, rồi bật công bố. Mọi thay đổi chỉ được ghi vào website sau khi bấm <strong>Lưu sản phẩm</strong>.</p></div><span className={styles.counter}>{profile.notes.length}/{MAX_SENSORY_NOTES}</span></div>
  <div className={styles.status}>
   <label className={styles.publish}><input type="checkbox" checked={profile.published} disabled={!profile.notes.length} onChange={e=>update({...profile,published:e.target.checked})}/><span><strong>{profile.published?"Công bố cùng sản phẩm":"Lưu bản nháp nội bộ"}</strong><small>{profile.published?"Trang trà sẽ hiển thị cường độ và bánh xe sau khi lưu.":"Chưa hiển thị số đo cường độ cho khách. Có thể xem trước bên dưới."}</small></span></label>
   <p>Thang 1–5 là đánh giá tương đối của người nếm, không phải chỉ tiêu kiểm nghiệm. Mức 3 là giá trị khởi tạo để hiệu chỉnh, không được coi là kết quả đã xác minh.</p>
  </div>
  {!!sourceNotes.length&&<div className={styles.old}><strong>Ghi chú sản phẩm hiện có</strong><p>{sourceNotes.join(" · ")}</p>{!!legacy.length&&<button type="button" onClick={importLegacy}>Đưa các mô tả khớp từ điển vào bản nháp</button>}<small>Nhập gợi ý không xóa ghi chú cũ và tự chuyển về trạng thái chưa công bố.</small></div>}
  <div className={styles.chooser}>
    <div className={styles.filters}>
      <div className={styles.mode} role="group" aria-label="Kiểu mô tả">{Object.entries(COPY).map(([key,title])=><button type="button" key={key} aria-pressed={kind===key} onClick={()=>{setKind(key);setFamily("all");}}>{title}</button>)}</div>
      {kind==="aroma"&&<label>Nhóm hương<select value={family} onChange={e=>setFamily(e.target.value)}><option value="all">Tất cả 12 nhóm</option>{AROMA_FAMILIES.map(group=><option key={group.id} value={group.id}>{group.vi}</option>)}</select></label>}
      <label>Tìm từ song ngữ<input type="search" placeholder="Ví dụ: hoa sen, honey…" value={search} onChange={e=>setSearch(e.target.value)}/></label>
    </div>
    <div className={styles.options} role="group" aria-label="Từ điển cảm quan">
      {filtered.map(term=><button className={styles.option} type="button" key={term.key} aria-pressed={selectedKeys.has(term.key)} onClick={()=>toggle(term)}><i style={{backgroundColor:term.color}}/><span>{term.vi}<small>{term.en}</small></span><b>{selectedKeys.has(term.key)?"✓":"+"}</b></button>)}
      {!filtered.length&&<p>Không tìm thấy mô tả tương ứng.</p>}
    </div>
  </div>
  {notice&&<p className={styles.warning} role="status">{notice}</p>}
  <div className={styles.selection}>
    <h4>Cường độ đã chọn <small>{profile.notes.length} / {MAX_SENSORY_NOTES}</small></h4>
    {selected.length?<div className={styles.sliders}>{selected.map(note=><div className={styles.selected} key={note.key}><div className={styles.selectedHeading}><span><i style={{backgroundColor:note.color}}/>{note.vi}<small>{note.en}</small></span><button type="button" onClick={()=>toggle(note)} aria-label={`Bỏ ${note.vi}`}>Bỏ</button></div><label><span>Cường độ: <strong>{note.intensity}/5</strong></span><input type="range" min="1" max="5" step="1" value={note.intensity} onChange={e=>intensity(note.key,e.target.value)} aria-label={`Cường độ ${note.vi}`}/></label></div>)}</div>:<p className={styles.empty}>Chưa chọn hương vị. Hãy chọn các ghi chú thực sự có ở mẫu trà này.</p>}
  </div>
  <div className={styles.preview}><div className={styles.previewHeading}><span>LIVE PREVIEW · NỘI BỘ</span><small>Đây là bản xem thử từ dữ liệu trong form, chưa lưu.</small></div><ProductSensoryProfile preview locale="vi" productName={productName} flavors={flavors}/></div>
 </div>;
}

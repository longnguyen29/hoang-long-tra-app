// Public landing data only. No individual sales contacts or internal pricing.
export const DOMESTIC_TEAS = Object.freeze([
  { id: "hong-tra-shan-mat", name: "Hồng Trà Shan Mật", photo: "/export/core-hong-tra-shan-mat.jpeg", note: "Mật ong · Caramel · Vị êm", description: "Hương mật ong và caramel trên nền hồng trà Shan, vị êm dịu. Lựa chọn cho danh mục hồng trà và nhu cầu phát triển đồ uống có hương trà nổi bật." },
  { id: "hong-tra-shan-khoi", name: "Hồng Trà Shan Khói", photo: "/export/core-hong-tra-shan-khoi.jpeg", note: "Khói · Đậu đen · Gỗ · Đậm vị", description: "Hương khói đi cùng nốt đậu đen và gỗ, nền trà đậm vị. Lựa chọn cho doanh nghiệp tìm một dòng hồng trà có bản sắc hương rõ rệt." },
]);
export const DOMESTIC_NOTE_MAX = 240;
const LABEL_LIMITS = { source:32, medium:24, campaign:48, content:32, term:24 };
const TYPES = { distributor:"Nhà phân phối", chain:"Chuỗi trà sữa / đồ uống", business:"Doanh nghiệp khác" };
const HIDDEN = /[\u0000-\u001f\u007f-\u009f\u061c\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufeff]/gu;
function bad(code="invalid_request") { throw new Error(code); }
function clean(value,max,required=false) {
  if (typeof value!=="string" || value.length>max) bad();
  const result=value.normalize("NFC").replace(HIDDEN,"").replace(/\s+/gu," ").trim();
  if (required && !result) bad();
  return result;
}
export function domesticAttribution(search="") {
  const params=new URLSearchParams(search); const result={};
  for (const [key,max] of Object.entries(LABEL_LIMITS)) {
    const values=params.getAll(`utm_${key}`);
    const value=values.length===1 ? values[0].trim().toLowerCase() : "";
    result[key]=/^[a-z0-9._-]+$/.test(value) && value.length<=max ? value : "";
  }
  return result;
}
// Canonical ordering keeps identical retries stable, even after checkbox changes.
export function domesticEnquiryInput(raw) {
  if (!raw || typeof raw!=="object" || Array.isArray(raw)) bad();
  if (raw.consent!==true) bad("consent_required");
  if (typeof raw.website!=="string" || raw.website.trim()) bad();
  if (!Array.isArray(raw.teaIds) || raw.teaIds.length<1 || raw.teaIds.length>2 || new Set(raw.teaIds).size!==raw.teaIds.length || raw.teaIds.some(id=>!DOMESTIC_TEAS.some(tea=>tea.id===id))) bad("tea_required");
  if (!["sample","quote"].includes(raw.intent) || !Object.hasOwn(TYPES,raw.businessType)) bad();
  const phone=clean(raw.phone,40,true);
  if (!/^\+?[0-9 ().-]+$/.test(phone) || phone.replace(/\D/g,"").length<8 || phone.replace(/\D/g,"").length>15 || /^\+0/.test(phone)) bad("invalid_contact");
  const quantity=clean(raw.quantityKg,14);
  if (quantity && (!/^\d{1,8}(?:\.\d{1,3})?$/.test(quantity) || Number(quantity)<=0 || Number(quantity)>10000000)) bad("invalid_quantity");
  const packing=clean(raw.packingKg,10);
  if (!["","20","30","35","custom"].includes(packing)) bad();
  const destination=clean(raw.destination,60);
  const note=clean(raw.note,DOMESTIC_NOTE_MAX);
  if (!raw.attribution || typeof raw.attribution!=="object" || Array.isArray(raw.attribution)) bad();
  const utm=[];
  for (const [key,max] of Object.entries(LABEL_LIMITS)) {
    const value=raw.attribution[key];
    if (typeof value!=="string" || value.length>max || (value && !/^[a-z0-9._-]+$/i.test(value))) bad();
    if(value) utm.push(`${key}=${value.toLowerCase()}`);
  }
  const teas=DOMESTIC_TEAS.filter(tea=>raw.teaIds.includes(tea.id)).map(tea=>tea.id).join(",");
  const savedNote=["[hong-tra-ban-si]",`Trà: ${teas}`,`Loại hình: ${TYPES[raw.businessType]}`,`Tổng lượng dự kiến: ${quantity ? `${Number(quantity)} kg` : "Chưa xác định"}`,`Bao PP/PE: ${packing ? (packing==="custom" ? "Theo yêu cầu" : `${packing} kg`) : "Cần tư vấn"}`,destination && `Nơi nhận: ${destination}`,utm.length && `UTM: ${utm.join(";")}`,note && `Ghi chú: ${note}`].filter(Boolean).join(" | ");
  if(savedNote.length>700) bad("note_too_long");
  return {requestId:raw.requestId,name:clean(raw.name,80,true),business:clean(raw.business,120,true),contact:phone,intent:raw.intent,note:savedNote,consent:true,website:"",attribution:{source:"website",medium:"owned",campaign:"event_contact_v1"}};
}

export function domesticNoteLimit(form,attribution) {
  try {
    const preview=domesticEnquiryInput({...form,requestId:"preview",name:"Preview",business:"Preview",phone:"0900000000",quantityKg:"",teaIds:DOMESTIC_TEAS.map(tea=>tea.id),note:"",consent:true,website:"",attribution});
    return Math.max(0,Math.min(DOMESTIC_NOTE_MAX,700-preview.note.length-" | Ghi chú: ".length-20));
  }catch{return DOMESTIC_NOTE_MAX;}
}

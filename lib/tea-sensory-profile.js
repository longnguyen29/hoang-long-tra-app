import {AROMA_FAMILIES,AROMA_TERMS,normalizeSensoryTerm} from "./tea-sensory-aromas.js";
import {PALATE_TERMS} from "./tea-sensory-reference.js";

// The existing catalogue's JSON 'flavors' column owns the v2 sensory profile.
// Keep legacy flavors.vi/en intact; no migration and no accidental publication.
export const MAX_SENSORY_NOTES = 6;
export const SENSORY_PROFILE_VERSION = 1;
const TASTE_COLORS = ["#b6a078","#91ada1","#9fb8bb","#b9a0ab"];
const FLAVOR_TERMS = [
  ...AROMA_TERMS.map(term=>({
    key:`aroma:${term.id}`,type:"aroma",vi:term.vi,en:term.en,
    familyId:term.familyId,color:AROMA_FAMILIES.find(f=>f.id===term.familyId)?.color||"#b7b5a3",
  })),
  ...PALATE_TERMS.map(term=>({
    key:`palate:${term.id}`,type:"palate",vi:term.vi,en:term.en,
    familyId:"palate",color:TASTE_COLORS[term.id<=21?0:term.id<=47?1:term.id<=61?2:3],
  })),
];
const DICTIONARY=new Map(FLAVOR_TERMS.map(term=>[term.key,term]));
export const SENSORY_TERMS=FLAVOR_TERMS;

export function normalizeSensoryProfile(raw){
  const data=raw&&typeof raw==="object"&&!Array.isArray(raw)?raw:{};
  const seen=new Set();
  const notes=[];
  for(const value of Array.isArray(data.notes)?data.notes:[]){
    if(!value||typeof value!=="object"||!DICTIONARY.has(value.key)||seen.has(value.key))continue;
    const intensity=Number(value.intensity);
    if(!Number.isInteger(intensity)||intensity<1||intensity>5)continue;
    seen.add(value.key);
    notes.push({key:value.key,intensity});
    if(notes.length===MAX_SENSORY_NOTES)break;
  }
  return {version:SENSORY_PROFILE_VERSION,published:data.published===true&&notes.length>0,notes};
}

export function readSensoryProfile(flavors,{includeDraft=false}={}){
  const profile=normalizeSensoryProfile(flavors?.profile);
  return (includeDraft||profile.published)&&profile.notes.length?profile:null;
}

export function writeSensoryProfile(flavors,profile){
  const existing=flavors&&typeof flavors==="object"&&!Array.isArray(flavors)?flavors:{};
  return {...existing,profile:normalizeSensoryProfile(profile)};
}

export function presentSensoryNotes(profile,locale="vi"){
  const lang=locale==="en"?"en":"vi";
  return normalizeSensoryProfile(profile).notes.map(note=>{
    const term=DICTIONARY.get(note.key);
    return {...note,vi:term.vi,en:term.en,label:term[lang],familyId:term.familyId,type:term.type,color:term.color};
  });
}

// Importing old catalogue words is an unpublished starting point: staff must
// validate the tasting and explicitly set intensity and publication status.
export function legacySensoryCandidates(flavors){
  const list=[...(Array.isArray(flavors?.vi)?flavors.vi:[]),...(Array.isArray(flavors?.en)?flavors.en:[])]
    .filter(value=>typeof value==="string").map(normalizeSensoryTerm).filter(Boolean);
  const seen=new Set();
  return SENSORY_TERMS.filter(term=>{
    if(seen.has(term.key))return false;
    const same=list.includes(normalizeSensoryTerm(term.vi))||list.includes(normalizeSensoryTerm(term.en));
    if(same)seen.add(term.key);
    return same;
  }).slice(0,MAX_SENSORY_NOTES).map(term=>({key:term.key,intensity:3}));
}

import test from "node:test";
import assert from "node:assert/strict";
import {AROMA_FAMILIES,AROMA_TERMS,findAromaFamilies} from "../lib/tea-sensory-aromas.js";
import {PALATE_TERMS,DEFECT_TERMS,SHAN_TERMS} from "../lib/tea-sensory-reference.js";

test("complete edition 02 bilingual sensory lexicon",()=>{
 assert.equal(AROMA_TERMS.length,173);
 assert.equal(PALATE_TERMS.length,86);
 assert.equal(DEFECT_TERMS.length,40);
 assert.equal(SHAN_TERMS.length,58);
 for(const terms of [AROMA_TERMS,PALATE_TERMS,DEFECT_TERMS,SHAN_TERMS]){
  assert.deepEqual(terms.map(t=>t.id),Array.from({length:terms.length},(_,i)=>i+1));
  assert.ok(terms.every(t=>t.en&&t.vi));
 }
});
test("all aroma descriptors belong to exactly one family",()=>{
 assert.equal(AROMA_FAMILIES.length,12);
 assert.equal(AROMA_FAMILIES[0].start,1);
 assert.equal(AROMA_FAMILIES.at(-1).end,173);
 for(const term of AROMA_TERMS){
  assert.equal(AROMA_FAMILIES.filter(f=>f.start<=term.id&&f.end>=term.id).length,1);
  assert.ok(AROMA_FAMILIES.some(f=>f.id===term.familyId));
 }
});
test("only catalogue notes activate product sectors",()=>{
 assert.deepEqual(findAromaFamilies([]),[]);
 assert.deepEqual(findAromaFamilies(["Hoa sen"]),["floral"]);
 assert.deepEqual(findAromaFamilies(["Khói gỗ"]),["smoke"]);
 assert.deepEqual(findAromaFamilies(["Mật ong hoa rừng"]),["honey"]);
 assert.deepEqual(findAromaFamilies(["Imaginary flavour"]),[]);
});

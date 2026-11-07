import test from "node:test";
import assert from "node:assert/strict";
import {
  MAX_SENSORY_NOTES,SENSORY_TERMS,normalizeSensoryProfile,readSensoryProfile,
  writeSensoryProfile,presentSensoryNotes,legacySensoryCandidates
} from "../lib/tea-sensory-profile.js";

test("product sensory profile preserves existing bilingual catalogue data",()=>{
 const old={vi:["Hoa sen"],en:["Lotus"],meta:"existing"};
 const next=writeSensoryProfile(old,{notes:[{key:"aroma:7",intensity:4}],published:true});
 assert.deepEqual(next.vi,["Hoa sen"]);
 assert.deepEqual(next.en,["Lotus"]);
 assert.equal(next.meta,"existing");
 assert.equal(next.profile.version,1);
 assert.equal(next.profile.published,true);
 assert.equal(presentSensoryNotes(next.profile,"vi")[0].label,"Hoa sen");
 assert.equal(presentSensoryNotes(next.profile,"en")[0].label,"Lotus");
});
test("unpublished drafts never appear on product pages",()=>{
 const data=writeSensoryProfile({}, {notes:[{key:"aroma:7",intensity:3}],published:false});
 assert.equal(readSensoryProfile(data),null);
 assert.equal(readSensoryProfile(data,{includeDraft:true}).notes.length,1);
});
test("cannot publish an empty or invalid profile",()=>{
 assert.equal(normalizeSensoryProfile({published:true,notes:[]}).published,false);
 assert.equal(normalizeSensoryProfile({published:true,notes:[{key:"bad:999",intensity:5}]}).published,false);
 assert.equal(readSensoryProfile({profile:{published:true,notes:[]}}),null);
});
test("reject unknown, duplicate, out-of-range and non-integer intensity",()=>{
 const raw={published:true,notes:[
  {key:"aroma:7",intensity:4},{key:"aroma:7",intensity:5},
  {key:"palate:1",intensity:0},{key:"palate:2",intensity:6},
  {key:"palate:3",intensity:3.5},{key:"palate:4",intensity:3},
  {key:"unknown:1",intensity:5}
 ]};
 assert.deepEqual(normalizeSensoryProfile(raw).notes,[{key:"aroma:7",intensity:4},{key:"palate:4",intensity:3}]);
});
test("public wheel is limited to six verified descriptors and has translated names",()=>{
 const profile=normalizeSensoryProfile({published:true,notes:SENSORY_TERMS.slice(0,12).map(t=>({key:t.key,intensity:2}))});
 assert.equal(profile.notes.length,MAX_SENSORY_NOTES);
 assert.equal(presentSensoryNotes(profile).length,MAX_SENSORY_NOTES);
});
test("legacy import is an optional draft, not implicit publication",()=>{
 const legacy={vi:["Hoa sen","Khói gỗ","Unknown"],en:["Lotus","Wood smoke"]};
 const picks=legacySensoryCandidates(legacy);
 assert.deepEqual(picks,[{key:"aroma:7",intensity:3},{key:"aroma:159",intensity:3}]);
 assert.equal(normalizeSensoryProfile({published:false,notes:picks}).published,false);
});

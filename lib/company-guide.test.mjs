import test from "node:test";
import assert from "node:assert/strict";
import { guideBrief, guideReferences, workflows } from "./company-guide.js";
import { canOpenStaffPage } from "./staff-workspace.js";

test("an archived or pending decision cannot reappear through a linked topic", () => {
 const memory = ["approved","archived","inbox"].map(status=>({id:status,status,title:status,body:"private"}));
 const topics = [
   {id:"owned",status:"reviewed",title:"Reviewed",body:"Current"},
   {id:"linked",status:"reviewed",memory_item_id:"archived",body:"Obsolete"},
   {id:"draft",status:"draft",body:"Unconfirmed"},
 ];
 const refs=guideReferences(memory,topics);
 assert.deepEqual(refs.map(row=>row.key),["memory/approved","topic/owned"]);
 const brief=guideBrief(workflows[0],"Check this sample",refs.slice(1),"2026-11-25");
 assert.match(brief,/topic\/owned/);
 assert.doesNotMatch(brief,/private|Obsolete|Unconfirmed/);
});

test("the workflow map has a readable entry for a work-only account",()=>{
 const staff={role:"employee"};
 const sources=workflows.flatMap(flow=>flow.sources).filter(([, ,href])=>canOpenStaffPage(staff,href.split(/[?#]/)[0]));
 assert.deepEqual(sources.map(source=>source[2]),["/admin/work"]);
 assert.equal(canOpenStaffPage(staff,"/admin/knowledge"),false);
});

import test from "node:test";
import assert from "node:assert/strict";
import { verifyMetaSignature,metaIncoming,supportedFacts,mergeFacts,parseAiJson,validIncoming } from "./customer-memory-core.js";
import { createHmac } from "node:crypto";

test("meta signature verified using raw body",()=>{
 const raw=JSON.stringify({object:"page"});
 const sig="sha256="+createHmac("sha256","secret").update(raw).digest("hex");
 assert.equal(verifyMetaSignature(raw,"secret",sig),true);
 assert.equal(verifyMetaSignature(raw+"x","secret",sig),false);
 assert.equal(verifyMetaSignature(raw,"secret","sha256=xyz"),false);
});
test("meta ignores echoes, other page and attachment-only messages",()=>{
 const item=(mid,more={})=>({sender:{id:"CUSTOMER"},recipient:{id:"PAGE"},message:{mid,text:"hello",...more}});
 const payload={object:"page",entry:[{id:"PAGE",messaging:[item("one"),item("two",{is_echo:true}),item("three",{text:undefined})]},{id:"OTHER",messaging:[item("four")]}]};
 const events=metaIncoming(payload,"PAGE");
 assert.equal(events.length,1); assert.equal(events[0].messageId,"one");
});
test("facts cannot be invented and quoted prices remain historical",()=>{
 const messages=[{id:"m",body:"Lần trước tôi đã báo giá 85k/kg cho 100kg.",occurred_at:"2026-10-01"}];
 const facts=supportedFacts([{category:"quoted_price",detail:"85k/kg for 100kg",quote:"báo giá 85k/kg cho 100kg"},
  {category:"promise",detail:"Deliver tomorrow",quote:"deliver tomorrow"}],messages);
 assert.equal(facts.length,1);
 assert.equal(mergeFacts(facts,facts).length,1);
});
test("validate input and bounded response",()=>{
 assert.equal(validIncoming({channel:"manual",text:"Hello"}),true);
 assert.equal(validIncoming({channel:"xx",text:"Hello"}),false);
 const parsed=parseAiJson({output_text:JSON.stringify({summary:"a",next_action:"b",reply:"c",facts:[]})});
 assert.equal(parsed.reply,"c");
});

import test from "node:test";
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {verifyZaloOaSignature,parseZaloOaIncoming} from "./customer-memory-zalo-oa.js";
test("Zalo OA webhook signature must match raw event",()=>{
 const obj={app_id:"12345",recipient:{id:"67890"},sender:{id:"123456789"},timestamp:String(Date.now()),event_name:"user_send_text",message:{msg_id:"12345678",text:"chào"}};
 const raw=JSON.stringify(obj);
 const sig="mac="+createHash("sha256").update("12345"+raw+obj.timestamp+"secret").digest("hex");
 assert.equal(verifyZaloOaSignature(raw,"12345",obj.timestamp,"secret",sig),true);
 assert.equal(verifyZaloOaSignature(raw+" ","12345",obj.timestamp,"secret",sig),false);
 assert.equal(parseZaloOaIncoming(obj,"12345","67890")?.channel,"zalo_oa");
 assert.equal(parseZaloOaIncoming({...obj,event_name:"oa_send_text"},"12345","67890"),null);
 assert.equal(parseZaloOaIncoming({...obj,recipient:{id:"WRONG"}},"12345","67890"),null);
});

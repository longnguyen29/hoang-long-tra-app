import test from "node:test";
import assert from "node:assert/strict";
import {hashBridgeToken,normalizePersonalZaloMessage} from "./customer-memory-personal-bridge.js";
test("Only high-entropy generated pairing tokens are accepted",()=>{
 const good="hlzb_"+ "a".repeat(43);
 assert.match(hashBridgeToken(good),/^[a-f0-9]{64}$/);
 assert.equal(hashBridgeToken("hlzb_123"),null);
 assert.equal(hashBridgeToken("../"),null);
});
test("Only bounded, explicit incoming personal chat messages are normalized",()=>{
 const raw={channel:"zalo_personal",externalId:"123456789",messageId:"msg_001",text:"Khách: Lấy 20 kg?",name:"Quán A"};
 assert.equal(normalizePersonalZaloMessage(raw)?.name,"Quán A");
 assert.equal(normalizePersonalZaloMessage({...raw,channel:"facebook"}),null);
 assert.equal(normalizePersonalZaloMessage({...raw,text:""}),null);
 assert.equal(normalizePersonalZaloMessage({...raw,externalId:"../",messageId:"x"}),null);
});

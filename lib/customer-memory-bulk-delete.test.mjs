import test from "node:test";
import assert from "node:assert/strict";
import { deleteSelectedConversations } from "./customer-memory-bulk-delete.js";

test("bulk deletion preserves failed selections and treats an already deleted record as complete", async () => {
  const called=[];
  const result=await deleteSelectedConversations(["one","two","three","four"],async id=>{
    called.push(id);
    if(id==="two") throw new Error("memory_unavailable");
    if(id==="three") throw new Error("thread_not_found");
  });
  assert.deepEqual(called,["one","two","three","four"]);
  assert.deepEqual(result,{removed:["one","three","four"],failed:["two"]});
});

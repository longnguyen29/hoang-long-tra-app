import assert from "node:assert/strict";
import test from "node:test";
import { PDFDocument } from "pdf-lib";
import { createApprovalCopy, isPng, readApprovalPdf } from "./document-approval-pdf.js";

const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+lv1sAAAAASUVORK5CYII=", "base64");

test("approval copy retains the original pages and adds both appearances and company seal", async () => {
  const original = await PDFDocument.create();
  original.addPage([420,595]);
  const source = await original.save();
  const packet = { id:"fixture", seller_id:"hoang-long", source_sha256:"f".repeat(64),
    signer_ids:["first","second"], stamp_path:"seal.png", approvals:{
      first:{name:"Đặng Văn A",at:"2026-11-27T13:00:00Z",path:"first.png"},
      second:{name:"Nguyễn Thị B",at:"2026-11-27T13:01:00Z",path:"second.png"},
    } };
  assert.equal(isPng(png),true);
  const requested=[];
  const approved = await createApprovalCopy(source,packet,async path=>{requested.push(path);return png});
  assert.deepEqual(requested,["first.png","second.png","seal.png"]);
  assert.equal((await PDFDocument.load(approved)).getPageCount(),2);
  assert.equal((await PDFDocument.load(source)).getPageCount(),1);
});

test("rejects invalid PDFs and page counts", async () => {
  await assert.rejects(readApprovalPdf(Buffer.from("invalid")));
  const original = await PDFDocument.create();
  for (let i=0;i<41;i++) original.addPage();
  await assert.rejects(readApprovalPdf(await original.save()),/invalid_pdf/);
  assert.equal(isPng(Buffer.alloc(80)),false);
});

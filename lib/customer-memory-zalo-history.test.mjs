import assert from "node:assert/strict";
import test from "node:test";
import { normalizeZaloHistoryMessage, parseZaloHistoryCsv } from "./customer-memory-zalo-history.js";

const columns = "conversation_id,conversation_name,sent_at,direction,text,message_id,sender_name";
const date = "2026-11-01T19:30:00+07:00";

test("history CSV keeps both directions and quoted UTF-8 text grouped by stable conversation ID", () => {
  const csv = "\uFEFF" + columns + "\r\n" +
    `group:sample,Nhóm mẫu,${date},inbound,"Chào, ""trà""\r\nMẫu 1",100,A\r\n` +
    `local:second,Khách mẫu,${date},inbound,Tin 2,,\r\n` +
    `group:sample,Nhóm mẫu,${date},outbound,Đã nhận,101,\r\n`;
  const result = parseZaloHistoryCsv(csv);
  assert.equal(result.messages,3);
  assert.equal(result.threads.length,2);
  assert.deepEqual(result.threads[0].messages.map(message => [message.direction,message.text,message.sender_name]),[
    ["inbound",'Chào, "trà"\r\nMẫu 1',"A"], ["outbound","Đã nhận",""],
  ]);
});

test("history CSV rejects mismatched identities, malformed records and unterminated quotes", () => {
  const first = `local:sample,Tên mẫu,${date},inbound,Tin mẫu,,`;
  assert.throws(() => parseZaloHistoryCsv(`${columns}\n${first}\nlocal:sample,Tên khác,${date},outbound,Tin mẫu,,`),/^Error: csv_row:3$/);
  assert.throws(() => parseZaloHistoryCsv(`${columns}\nlocal:sample,Tên mẫu,${date},inbound,"Tin mẫu`),/^Error: csv_syntax$/);
  assert.throws(() => parseZaloHistoryCsv("conversation_id,text\nlocal:sample,Example"),/^Error: csv_columns$/);
});

test("history timestamps and bounded text must be valid before upload", () => {
  const message = {sent_at:date,direction:"inbound",text:"Dữ liệu giả 🍵"};
  assert.ok(normalizeZaloHistoryMessage(message));
  for (const patch of [
    {sent_at:"2026-02-30T10:00:00+07:00"}, {sent_at:"2026-11-01T19:30:00"}, {sent_at:[date]},
    {direction:"other"}, {text:" ".repeat(40)}, {text:"A".repeat(12001)}, {text:"a\0b"},
  ]) assert.equal(normalizeZaloHistoryMessage({...message,...patch}),null);
});

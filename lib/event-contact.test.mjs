import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { EVENT_CONTACT, EVENT_QR_URL, eventLink, composeEventMessage } from "./event-contact.js";

test("event links and the static website QR use the approved contact campaign", () => {
  assert.equal(EVENT_CONTACT.zaloUrl, "https://zalo.me/0903333841");
  assert.equal(EVENT_CONTACT.phone, "+84903333841");
  assert.equal(EVENT_QR_URL, "https://www.hoanglongtra.com/meet?utm_source=teashow&utm_medium=qr&utm_campaign=event_contact_v1");
  for (const path of ["/catalog", "/sample", "/wholesale"]) {
    assert.equal(eventLink(path), `${path}?utm_source=teashow&utm_medium=qr&utm_campaign=event_contact_v1`);
  }
});

test("only approved attribution survives; private query values and arbitrary campaigns are dropped", () => {
  const search = "?utm_source=ZALO&utm_medium=referral&utm_campaign=Private+Event&name=Linh&contact=0909999999&note=private&event=Private+Event#secret";
  const result = eventLink("/sample", search);
  assert.equal(result, "/sample?utm_source=zalo&utm_medium=referral&utm_campaign=event_contact_v1");
  assert.equal(eventLink("/wholesale", `?utm_source=${"x".repeat(2000)}&utm_medium=0909999999`), "/wholesale?utm_source=teashow&utm_medium=qr&utm_campaign=event_contact_v1");
  assert.equal(eventLink("/catalog", "?utm_source=event&utm_source=zalo&utm_medium=owned"), "/catalog?utm_source=teashow&utm_medium=owned&utm_campaign=event_contact_v1");
  for (const path of ["https://example.com/private", "/sample?contact=0909999999", "/orders/private-token", "//example.com"]) {
    assert.match(eventLink(path, search), /^\/catalog\?utm_source=zalo&utm_medium=referral&utm_campaign=event_contact_v1$/);
  }
});

test("messages use localised intent labels and omit empty optional fields", () => {
  const form = { name: "  Linh  ", business: "Quán Mộc", contact: "linh@example.com", intent: "quote", note: "Trà pha chế" };
  assert.equal(composeEventMessage(form), "Xin chào Nhà Hoàng Long, tôi muốn trao đổi về trà.\nTên: Linh\nĐơn vị / quán: Quán Mộc\nLiên hệ: linh@example.com\nNhu cầu: Nhận báo giá\nGhi chú: Trà pha chế");
  assert.match(composeEventMessage({ intent: "cooperation" }, "en"), /Interest: Cooperation$/);
  assert.match(composeEventMessage({ intent: "private event", event: "PRIVATE_EVENT" }, "unknown"), /Nhu cầu: Nhận mẫu trà$/);
  assert.doesNotMatch(composeEventMessage({}), /Tên:|Đơn vị|Liên hệ:|Ghi chú:/);
});

test("message fields remain bounded and cannot inject extra lines or hidden direction controls", () => {
  const message = composeEventMessage({
    name: "N".repeat(200), business: "B".repeat(300), contact: "C".repeat(300),
    intent: "sample", note: `\u202efirst\r\n\tsecond\u0000 ${"Z".repeat(2000)}`,
    campaign: "PRIVATE_CAMPAIGN", event: "PRIVATE_EVENT",
  });
  const lines = message.split("\n");
  assert.equal(lines.length, 6);
  assert.equal(lines[1].slice("Tên: ".length).length, 80);
  assert.equal(lines[2].slice("Đơn vị / quán: ".length).length, 120);
  assert.equal(lines[3].slice("Liên hệ: ".length).length, 120);
  assert.equal(lines[5].slice("Ghi chú: ".length).length, 700);
  assert.match(lines[5], /^Ghi chú: first second /);
  assert.ok(message.length <= 1600);
  assert.doesNotMatch(message, /[\u0000-\u0009\u000b-\u001f\u202a-\u202e]|PRIVATE_CAMPAIGN|PRIVATE_EVENT/);
  assert.doesNotMatch(composeEventMessage({ name: `${"a".repeat(79)}😀` }), /[\ud800-\udbff]$/u);
});

test("the downloadable vCard contains only the static company contact with RFC line endings", async () => {
  const file = await readFile(new URL("../public/events/hoang-long.vcf", import.meta.url), "utf8");
  assert.equal(file.replaceAll("\r\n", "").includes("\n"), false);
  assert.ok(file.startsWith("BEGIN:VCARD\r\nVERSION:3.0\r\n"));
  assert.ok(file.endsWith("END:VCARD\r\n"));
  assert.ok(file.includes(`FN:${EVENT_CONTACT.name}\r\n`));
  assert.ok(file.includes(`TEL;TYPE=WORK,VOICE:${EVENT_CONTACT.phone}\r\n`));
  assert.ok(file.includes("ADR;TYPE=WORK:;;36B QL2A;Sóc Sơn;Hà Nội;;Việt Nam\r\n"));
  assert.ok(file.includes(`URL:${EVENT_CONTACT.website}\r\n`));
  assert.doesNotMatch(file, /utm_|<[^>]*>|MAILTO|UID:/i);
});

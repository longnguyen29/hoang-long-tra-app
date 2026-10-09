import test from "node:test";
import assert from "node:assert/strict";
import { eventTeaIds, selectedEventTeas, eventCatalogueHref, eventEnquiryHref, eventSelectionNote } from "./event-catalog.js";

const tea = (id, fields = {}) => ({ id, kind: "tea", line: "reserve", available: true, name: { vi: `Trà ${id}`, en: `Tea ${id}` }, ...fields });
const products = [tea("tea-1"), tea("tea_2"), tea("Tea3"), tea("tea-4"), tea("sold", { available: false }), tea("goods", { kind: "goods" }), tea("sample", { line: "sample" })];

test("event tea queries accept distinct bounded slug IDs and at most three selections", () => {
  assert.deepEqual(eventTeaIds("?tea=tea-1&tea=tea-1&tea=bad%0Aid&tea=two+words&tea=tea_2&tea=Tea3&tea=tea-4&name=private"), ["tea-1", "tea_2", "Tea3"]);
  assert.deepEqual(eventTeaIds(`?tea=${"a".repeat(81)}&tea=${"b".repeat(80)}&tea=../private&tea=`), ["b".repeat(80)]);
  assert.deepEqual(eventTeaIds(null), []);
});

test("selected teas resolve eligible actual catalogue products in requested order", () => {
  const ids = ["fabricated", "sold", "goods", "sample", "tea_2", "tea_2", "tea-4", "tea-1", "Tea3"];
  assert.deepEqual(selectedEventTeas([null, ...products], ids), [products[1], products[3], products[0]]);
  assert.deepEqual(selectedEventTeas(products, "?tea=sample&tea=Tea3&tea=tea-1&tea=Tea3"), [products[2], products[0]]);
  assert.deepEqual(selectedEventTeas(null, ids), []);
  assert.equal(ids.length, 9);
});

test("event catalogue and enquiry URLs forward only approved attribution and real selected tea IDs", () => {
  const incoming = "?utm_source=ZALO&utm_medium=referral&utm_campaign=Private&name=Linh&contact=0909999999&note=private&utm_content=email@example.com&tea=fabricated&intent=cooperation#secret";
  const ids = ["tea_2", "sold", "tea_2", "fabricated", "tea-1", "Tea3", "tea-4"];
  assert.equal(eventCatalogueHref(products, ids, incoming), "/meet/catalog?utm_source=zalo&utm_medium=referral&utm_campaign=event_contact_v1&tea=tea_2&tea=tea-1&tea=Tea3");
  assert.equal(eventEnquiryHref(products, ids, "quote", incoming), "/meet?utm_source=zalo&utm_medium=referral&utm_campaign=event_contact_v1&tea=tea_2&tea=tea-1&tea=Tea3&intent=quote#message");
  assert.equal(eventEnquiryHref(products, ["fabricated"], "cooperation", "?utm_source=event&utm_source=zalo&utm_medium=private"), "/meet?utm_source=website&utm_medium=owned&utm_campaign=event_contact_v1&intent=sample#message");
  assert.equal(eventCatalogueHref(products, []), "/meet/catalog?utm_source=website&utm_medium=owned&utm_campaign=event_contact_v1");
});

test("selection notes preserve visitor whitespace and full oversized text while reserving the prefix budget", () => {
  const input = "  First line\nsecond line \t ";
  const selected = [products[1], products[0]];
  const result = eventSelectionNote(selected, input);
  assert.equal(result.prefix, "Trà đã chọn: Trà tea_2 (tea_2); Trà tea-1 (tea-1)");
  assert.equal(result.note, `${result.prefix}\n${input}`);
  assert.equal(result.maxNoteLength, 700 - result.prefix.length - 1);
  assert.equal(result.tooLong, false);
  const exact = eventSelectionNote(selected, "x".repeat(result.maxNoteLength));
  assert.equal(exact.note.length, 700);
  assert.equal(exact.tooLong, false);
  const oversizedInput = `  ${"z".repeat(700)}\n `;
  const oversized = eventSelectionNote(selected, oversizedInput);
  assert.equal(oversized.note, `${oversized.prefix}\n${oversizedInput}`);
  assert.equal(oversized.tooLong, true);
  assert.deepEqual(eventSelectionNote([], input), { note: input, prefix: "", maxNoteLength: 700, tooLong: false });
  assert.equal(eventSelectionNote([], "x".repeat(700)).tooLong, false);
  assert.equal(eventSelectionNote([], "x".repeat(701)).tooLong, true);
});

test("selection prefixes localize catalogue names, bound names and IDs, and remove injected controls", () => {
  const longId = "a".repeat(80);
  const unsafeName = `\u202eTrà\r\n\t\u200f\u2066\u0000\u2028 ${"N".repeat(500)}`;
  const selection = [tea(longId, { name: { vi: unsafeName, en: "English name" } }), products[0], products[0], tea("bad\nid"), tea("b".repeat(81)), products[1], products[3], products[4]];
  const result = eventSelectionNote(selection);
  assert.equal(result.prefix.split("; ").length, 3);
  assert.match(result.prefix, /^Trà đã chọn: Trà N/);
  assert.doesNotMatch(result.prefix, /[\p{Cc}\p{Cf}\u2028\u2029]/u);
  assert.equal(result.prefix.slice("Trà đã chọn: ".length).split(` (${longId})`)[0].length, 120);
  assert.ok(result.maxNoteLength > 0);
  assert.doesNotMatch(result.prefix, /tea-4|sold|bad/);
  assert.equal(eventSelectionNote([selection[0]], "", "en").prefix, `Selected teas: English name (${longId})`);
  assert.match(eventSelectionNote([products[0]], "", "unknown").prefix, /^Trà đã chọn:/);
  const emoji = eventSelectionNote([tea("emoji", { name: `${"a".repeat(119)}😀` })]);
  assert.doesNotMatch(emoji.prefix, /[\ud800-\udbff]\s*\(/u);
});

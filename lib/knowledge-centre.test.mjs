import test from "node:test";
import assert from "node:assert/strict";
import {
  buildKnowledgeBrief, buildTopicTree, canonicalKnowledgePosts, knowledgePostNodes,
  normalizeKnowledgeSnapshot, safeKnowledgeUrl, searchKnowledge, summarizeKnowledge,
  summarizeTopicCoverage, topicDescendantIds,
} from "./knowledge-centre.js";

const at = "2020-10-01T08:00:00Z";
const topic = (id, parent_id = null, extra = {}) => ({ id, parent_id, title: id, ...extra });
const post = (id, extra = {}) => ({ id, topic_id: "root", title: id, channel: "facebook", url: `https://facebook.com/posts/${id}`, published_at: at, metrics: {}, ...extra });
const snapshotWithVariants = (posts, variants) => ({ topics: [topic("root"), topic("child", "root")], angles: [{ id: "angle", topic_id: "child", title: "Góc thử" }], posts, growth: { experiments: [{ id: "experiment", variants }] } });

test("cycles and orphan topics stay visible once, descendant search is finite and accent insensitive", () => {
  const topics = [topic("root", null, { title: "Trà cổ thụ", domain: "tea" }), topic("child", "root"), topic("a", "b"), topic("b", "a"), topic("orphan", "missing")];
  const flatten = (nodes) => nodes.flatMap((node) => [node.id, ...flatten(node.children)]);
  const ids = flatten(buildTopicTree(topics));
  assert.equal(ids.length, 5);
  assert.equal(new Set(ids).size, 5);
  assert.deepEqual(topicDescendantIds(topics, "a"), ["a", "b"]);
  assert.deepEqual(topicDescendantIds(topics, "root"), ["root", "child"]);
  assert.deepEqual(topicDescendantIds(topics, "absent"), []);
  const result = searchKnowledge({ topics, angles: [{ id: "angle", topic_id: "child", hook: "Giữ vị trà khi pha sữa" }] }, "TRA", { domain: "tea" });
  assert.deepEqual(result.topics.map((row) => row.id), ["root", "child"]);
  assert.equal(result.angles.length, 1);
});

test("linked and manual records for one URL deduplicate with live Growth metrics and all topic relationships", () => {
  const snapshot = snapshotWithVariants([
    post("manual", { metrics: { views: 9999, orders: 25 }, url: "https://www.threads.net/@tea/post/one/?utm_source=other" }),
    post("link", { growth_variant_id: "v", topic_id: "child", angle_id: "angle", metrics: { views: 999 } }),
    post("second-link", { growth_variant_id: "v" }),
  ], [{ id: "v", label: "Mở bằng vị trà", status: "reviewed", threads_post_url: "https://threads.com/@tea/post/one", published_at: at, manual_metrics: { views: 30, likes: 0, replies: 2, reposts: 1, quotes: 7, orders: 99 }, outcomes: { visitors: 22, qualified_requests: 3, samples_sent: 2, first_orders: 1 } }]);
  const records = canonicalKnowledgePosts(snapshot);
  assert.equal(records.length, 1);
  assert.equal(records[0].source, "growth");
  assert.equal(records[0].status, "reviewed");
  assert.equal(records[0].metrics.views, 30);
  assert.equal(records[0].metrics.comments, 2);
  assert.equal(records[0].metrics.shares, 1);
  assert.equal(records[0].metrics.orders, null);
  assert.deepEqual(new Set(records[0].topic_ids), new Set(["root", "child"]));
  assert.deepEqual(new Set(records[0].link_ids), new Set(["manual", "link", "second-link"]));
  assert.equal(records[0].suppressed_records.find((row) => row.id === "manual").metrics.orders, 25);
  assert.match(records[0].duplicate_note, /không cộng vào tổng/);
  assert.equal(summarizeTopicCoverage(snapshot, "root").counts.publishedPosts, 1);
  assert.equal(summarizeTopicCoverage(snapshot, "child").counts.publishedPosts, 1);
  assert.equal(summarizeKnowledge(snapshot).tracked.sample_requests_with_order.total, 1);
  assert.equal(summarizeKnowledge(snapshot).manualAttribution.orders.total, null);
});

test("actual publication evidence includes paused and archived history, never blank dates or Growth drafts", () => {
  const snapshot = snapshotWithVariants([
    post("paused", { growth_variant_id: "paused", status: "archived", topic_id: "child" }),
    post("draft", { growth_variant_id: "draft" }),
    post("no-date", { published_at: null, metrics: { views: 1000 } }),
    post("archived", { status: "archived" }),
  ], [
    { id: "paused", status: "paused", threads_post_url: "https://threads.net/@tea/post/paused", published_at: at, manual_metrics: { views: 3 } },
    { id: "draft", status: "draft", threads_post_url: "https://threads.net/@tea/post/draft", published_at: at, manual_metrics: { views: 888 } },
  ]);
  snapshot.topics[1].status = "archived";
  const all = knowledgePostNodes(snapshot);
  assert.equal(all.length, 4);
  assert.equal(all.find((row) => row.id === "draft").published, false);
  const historical = summarizeKnowledge(snapshot);
  assert.equal(historical.counts.publishedPosts, 2);
  assert.equal(historical.counts.archivedPosts, 2);
  assert.equal(historical.platform.views.total, 3);
  assert.equal(summarizeKnowledge(snapshot, { includeArchived: false }).counts.publishedPosts, 0);
});

test("partial coverage sums known published platform values and keeps manual attribution outside tracked funnel", () => {
  const snapshot = snapshotWithVariants([
    post("external", { metrics: { views: "12", likes: 0, leads: 2, orders: 1, revenue: 500, spend: null } }),
    post("unknown", { metrics: { views: "", likes: null, revenue: -5 } }),
    post("unpublished", { published_at: "invalid", metrics: { views: 10000 } }),
    post("linked", { growth_variant_id: "v" }),
  ], [{ id: "v", status: "published", threads_post_url: "https://threads.net/@tea/post/v", published_at: at, manual_metrics: { views: 8 }, outcomes: { visitors: 25, qualified_requests: 0, samples_sent: 0, first_orders: 0 } }]);
  const summary = summarizeKnowledge(snapshot);
  assert.deepEqual(summary.platform.views, { total: 20, known: 2, unknown: 1, count: 3, complete: false });
  assert.deepEqual(summary.platform.likes, { total: 0, known: 1, unknown: 2, count: 3, complete: false });
  assert.equal(summary.manualAttribution.orders.total, 1);
  assert.equal(summary.manualAttribution.orders.count, 2);
  assert.equal(summary.tracked.sample_requests_with_order.total, 0);
  assert.equal(summary.rates.visitorToQualifiedRequest.value, 0);
  assert.equal(summary.rates.qualifiedRequestToSent.value, null);
  assert.equal(summary.rates.qualifiedRequestToSent.reason, "insufficient");
});

test("zero is measured, missing is unknown and rates require complete comparable coverage and adequate denominator", () => {
  const snapshot = snapshotWithVariants([post("zero", { growth_variant_id: "zero" })], [{ id: "zero", status: "published", threads_post_url: "https://threads.net/@tea/post/zero", published_at: at, manual_metrics: { views: 0 }, outcomes: { visitors: 0, qualified_requests: 0 } }]);
  const summary = summarizeKnowledge(snapshot);
  assert.deepEqual(summary.platform.views, { total: 0, known: 1, unknown: 0, count: 1, complete: true });
  assert.equal(summary.tracked.samples_sent.total, null);
  assert.equal(summary.rates.visitorToQualifiedRequest.value, null);
  assert.equal(summary.rates.visitorToQualifiedRequest.reason, "insufficient");
  snapshot.growth.experiments[0].variants[0].outcomes = { visitors: 100 };
  assert.equal(summarizeKnowledge(snapshot).rates.visitorToQualifiedRequest.reason, "incomplete");
  assert.equal(summarizeKnowledge({}).platform.views.total, null);
});

test("briefs mark draft knowledge for verification and never invent an offer, hypothesis or source", () => {
  const source = { label: "Tài liệu trà", url: "https://example.com/tea" };
  const draft = buildKnowledgeBrief(topic("root", null, { title: "Nền trà", body: "Ghi chép đang nghiên cứu", sources: [source, { label: "Xấu", url: "javascript:alert(1)" }], next_action: "Kiểm tra nguồn" }), { title: "Giữ vị khi pha", hook: "Điều gì còn lại sau khi thêm sữa?", audience: "Chủ quán" });
  assert.equal(draft.proof, "");
  assert.match(draft.researchContext, /KIẾN THỨC NHÁP \/ CẦN XÁC MINH/);
  assert.match(draft.researchContext, /không dùng làm bằng chứng/);
  assert.match(draft.researchContext, /https:\/\/example.com\/tea/);
  assert.doesNotMatch(draft.researchContext, /javascript:/);
  assert.equal(draft.offer, "");
  assert.equal(draft.hypothesis, "");
  assert.equal(draft.cta, "");
  assert.equal(draft.knowledgeWarnings.length, 1);
  const reviewed = buildKnowledgeBrief({ status: "reviewed", body: "Đã đọc nguồn", sources: [source] }, {});
  assert.deepEqual(reviewed.knowledgeWarnings, []);
  assert.equal(reviewed.proof, "Đã đọc nguồn");
  assert.match(reviewed.researchContext, /Kiến thức đã duyệt/);
  assert.equal(safeKnowledgeUrl("https://user:secret@example.com"), "");
  assert.equal(safeKnowledgeUrl("javascript:alert(1)"), "");
  assert.equal(normalizeKnowledgeSnapshot({ memory_items: [{ id: "memory", content: "Nội dung" }] }).memory_items[0].body, "Nội dung");
});

test("linked briefs read current approved memory content and never fall back to hidden stale topic text", () => {
  const linked = { id: "linked", status: "reviewed", memory_item_id: "memory", body: "Nội dung chủ đề cũ không hiển thị" };
  const brief = buildKnowledgeBrief(linked, {}, { memory_items: [{ id: "memory", status: "approved", title: "Quyết định đã duyệt", body: "Nội dung ghi nhớ hiện tại" }] });
  assert.match(brief.proof, /Nội dung ghi nhớ hiện tại/);
  assert.doesNotMatch(brief.proof, /Nội dung chủ đề cũ/);
  assert.equal(brief.knowledgeWarnings.length, 0);
  const unavailable = buildKnowledgeBrief(linked, {}, { memory_items: [{ id: "memory", status: "archived", body: "Đã bị lưu kho" }] });
  assert.equal(unavailable.proof, "");
  assert.match(unavailable.researchContext, /không có trong danh sách đã duyệt/);
  assert.doesNotMatch(unavailable.researchContext, /Nội dung chủ đề cũ|Đã bị lưu kho/);
  assert.equal(unavailable.knowledgeWarnings.length, 1);
});

test("future publication dates stay outside published counts until their declared time", () => {
  const snapshot = { topics: [topic("root")], posts: [post("past", { metrics: { views: 1 } }), post("scheduled", { published_at: "2026-10-09T08:00:00Z", metrics: { views: 999 } })] };
  const before = summarizeKnowledge(snapshot, { now: "2026-10-08T08:00:00Z" });
  assert.equal(before.counts.publishedPosts, 1);
  assert.equal(before.platform.views.total, 1);
  assert.equal(knowledgePostNodes(snapshot, { now: "2026-10-08T08:00:00Z" }).find((item) => item.id === "scheduled").published, false);
  assert.equal(summarizeKnowledge(snapshot, { now: "2026-10-10T08:00:00Z" }).counts.publishedPosts, 2);
  const today = { posts: [post("today", { published_at: "2026-10-08T05:00:00Z" })] };
  assert.equal(knowledgePostNodes(today, { now: "2026-10-08T01:00:00Z" })[0].published, true, "date-only external publication is already today in Vietnam before noon");
});

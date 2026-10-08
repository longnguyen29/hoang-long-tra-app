// Knowledge Centre totals describe recorded coverage, never estimated audience or sales.
const PLATFORM_FIELDS = ["views", "likes", "comments", "shares", "clicks"];
const ATTRIBUTION_FIELDS = ["leads", "orders", "revenue", "spend"];
const TRACKED_FIELDS = ["visitors", "qualified_requests", "samples_sent", "sample_requests_with_order"];
const text = (value) => typeof value === "string" ? value.trim() : "";
const rows = (value) => Array.isArray(value) ? value.filter((row) => row && typeof row === "object") : [];
const id = (value) => text(value) || null;
const fold = (value) => text(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase();

export function safeKnowledgeUrl(value) {
  const candidate = text(value);
  if (!candidate || /[\u0000-\u0020\u007f]/.test(candidate)) return "";
  try {
    const url = new URL(candidate);
    return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password ? url.href : "";
  } catch { return ""; }
}

export function knowledgeMetric(value) {
  if (value === null || value === undefined || typeof value === "boolean" || (typeof value === "string" && !value.trim())) return null;
  if (!["number", "string"].includes(typeof value)) return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 && number <= 1e15 ? number : null;
}

const metricObject = (value, fields) => Object.fromEntries(fields.map((field) => {
  const number = knowledgeMetric(value?.[field]);
  return [field, number !== null && !["revenue", "spend"].includes(field) && !Number.isInteger(number) ? null : number];
}));
const date = (value) => {
  if (!text(value)) return null;
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : null;
};
const vietnamDay = (value) => {
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? new Date(timestamp + 7 * 60 * 60 * 1000).toISOString().slice(0, 10) : "";
};
const uniqueRows = (value) => {
  const result = new Map();
  for (const row of rows(value)) {
    const rowId = id(row.id);
    if (rowId) result.set(rowId, { ...row, id: rowId });
  }
  return [...result.values()];
};

export function normalizeKnowledgeSnapshot(value = {}) {
  const snapshot = value && typeof value === "object" ? value : {};
  return {
    ...snapshot,
    topics: uniqueRows(snapshot.topics).map((topic) => ({
      ...topic, parent_id: id(topic.parent_id), domain: topic.domain === "business" ? "business" : "tea",
      title: text(topic.title), body: text(topic.body), status: ["draft", "reviewed", "archived"].includes(topic.status) ? topic.status : "draft",
      sources: rows(topic.sources).map((source) => ({ label: text(source.label), url: safeKnowledgeUrl(source.url) })),
      memory_item_id: id(topic.memory_item_id), next_action: text(topic.next_action),
    })),
    angles: uniqueRows(snapshot.angles).map((angle) => ({
      ...angle, topic_id: id(angle.topic_id), title: text(angle.title), audience: text(angle.audience), hook: text(angle.hook),
      notes: text(angle.notes), next_action: text(angle.next_action),
      status: ["idea", "research", "drafting", "ready", "archived"].includes(angle.status) ? angle.status : "idea",
    })),
    posts: uniqueRows(snapshot.posts).map((post) => ({
      ...post, topic_id: id(post.topic_id), angle_id: id(post.angle_id), growth_variant_id: id(post.growth_variant_id),
      title: text(post.title), channel: text(post.channel), url: safeKnowledgeUrl(post.url), published_at: date(post.published_at),
      status: post.status === "archived" ? "archived" : "active", measurement_note: text(post.measurement_note),
      metrics: metricObject(post.metrics, [...PLATFORM_FIELDS, ...ATTRIBUTION_FIELDS]),
    })),
    memory_items: uniqueRows(snapshot.memory_items).map((item) => ({ ...item, title: text(item.title), body: text(item.body || item.content) })),
    growth: snapshot.growth && typeof snapshot.growth === "object" ? snapshot.growth : { experiments: [] },
  };
}

// Orphaned parents and cycles remain visible; a topic is rendered at most once.
export function buildTopicTree(input = []) {
  const topics = normalizeKnowledgeSnapshot({ topics: input }).topics;
  const byId = new Map(topics.map((topic) => [topic.id, topic]));
  const children = new Map();
  topics.forEach((topic) => {
    const key = byId.has(topic.parent_id) && topic.parent_id !== topic.id ? topic.parent_id : null;
    children.set(key, [...(children.get(key) || []), topic]);
  });
  const visited = new Set();
  const visit = (topic, depth, cycleRoot = false) => {
    visited.add(topic.id);
    const node = { ...topic, depth, cycleRoot, children: [] };
    for (const child of children.get(topic.id) || []) {
      if (!visited.has(child.id)) node.children.push(visit(child, depth + 1));
    }
    return node;
  };
  const tree = (children.get(null) || []).map((topic) => visit(topic, 0));
  topics.forEach((topic) => { if (!visited.has(topic.id)) tree.push(visit(topic, 0, true)); });
  return tree;
}

export function topicDescendantIds(input = [], topicId) {
  const topics = normalizeKnowledgeSnapshot({ topics: input }).topics;
  if (!topics.some((topic) => topic.id === topicId)) return [];
  const result = new Set([topicId]);
  const queue = [topicId];
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    topics.forEach((topic) => {
      if (topic.parent_id === queue[cursor] && !result.has(topic.id)) { result.add(topic.id); queue.push(topic.id); }
    });
  }
  return [...result];
}

export function searchKnowledge(input = {}, query = "", { domain, status } = {}) {
  const snapshot = normalizeKnowledgeSnapshot(input);
  const term = fold(query);
  const matches = (values) => !term || fold(values.filter(Boolean).join(" ")).includes(term);
  const allowed = snapshot.topics.filter((topic) => (!domain || topic.domain === domain) && (!status || topic.status === status));
  const allowedIds = new Set(allowed.map((topic) => topic.id));
  const angles = snapshot.angles.filter((angle) => allowedIds.has(angle.topic_id) && matches([angle.title, angle.audience, angle.hook, angle.notes, angle.next_action]));
  const posts = knowledgePostNodes(snapshot).filter((post) => post.topic_ids.some((topicId) => allowedIds.has(topicId)) && matches([post.title, post.channel, post.url, post.measurement_note]));
  const related = new Set([...angles.map((angle) => angle.topic_id), ...posts.flatMap((post) => post.topic_ids)]);
  return { topics: allowed.filter((topic) => matches([topic.title, topic.body, topic.next_action, ...topic.sources.map((source) => `${source.label} ${source.url}`)]) || related.has(topic.id)), angles, posts };
}

const postUrlKey = (value) => {
  const safe = safeKnowledgeUrl(value);
  if (!safe) return "";
  const url = new URL(safe);
  url.protocol = "https:";
  url.hostname = url.hostname.replace(/^www\./, "").replace(/^threads\.net$/, "threads.com");
  url.hash = "";
  for (const key of [...url.searchParams.keys()]) if (/^(utm_|fbclid$|gclid$|igshid$|igsh$|xmt$|mibextid$)/i.test(key)) url.searchParams.delete(key);
  url.searchParams.sort();
  url.pathname = url.pathname.replace(/\/+$/, "") || "/";
  return url.href;
};

const recordTime = (post) => new Date(post.updated_at || post.created_at || 0).getTime() || 0;
const compareAuthority = (a, b) => Number(b.source === "growth") - Number(a.source === "growth") || recordTime(b) - recordTime(a) || Number(b.version || 0) - Number(a.version || 0) || a.id.localeCompare(b.id);

// Publication metadata and platform metrics on Growth links always come from Growth.
// Relationship aliases are retained so a duplicate URL can belong to multiple topics.
export function knowledgePostNodes(input = {}, { includeArchived = true, now = new Date() } = {}) {
  const snapshot = normalizeKnowledgeSnapshot(input);
  const asOf = new Date(now).getTime();
  const variants = new Map();
  rows(snapshot.growth.experiments).forEach((experiment) => rows(experiment.variants).forEach((variant) => variants.set(variant.id, { ...variant, experiment_id: experiment.id, experiment_title: experiment.title })));
  rows(snapshot.growth.variants).forEach((variant) => variants.set(variant.id, variant));
  const records = snapshot.posts.filter((post) => includeArchived || post.status !== "archived").map((post) => {
    const linked = Boolean(post.growth_variant_id);
    const variant = linked ? variants.get(post.growth_variant_id) : null;
    const metrics = linked ? metricObject({ ...variant?.manual_metrics, comments: variant?.manual_metrics?.comments ?? variant?.manual_metrics?.replies, shares: variant?.manual_metrics?.shares ?? variant?.manual_metrics?.reposts }, [...PLATFORM_FIELDS, ...ATTRIBUTION_FIELDS]) : post.metrics;
    // First-order matching counts sample requests with a later phone-matched order,
    // not exact order counts. Direct attribution remains external-only.
    if (linked) ATTRIBUTION_FIELDS.forEach((field) => { metrics[field] = null; });
    const tracked = linked && variant ? metricObject({ ...variant.outcomes, sample_requests_with_order: variant.outcomes?.sample_requests_with_order ?? variant.outcomes?.first_orders }, TRACKED_FIELDS) : metricObject({}, TRACKED_FIELDS);
    const url = linked ? safeKnowledgeUrl(variant?.threads_post_url || variant?.post_url || variant?.url) : post.url;
    const publishedAt = linked ? date(variant?.published_at) : post.published_at;
    const status = linked ? variant?.status || "unavailable" : post.status;
    return {
      ...post, id: post.id, record_ids: [post.id], topic_ids: post.topic_id ? [post.topic_id] : [], angle_ids: post.angle_id ? [post.angle_id] : [],
      source: linked ? "growth" : "external", title: linked ? text(variant?.label) || text(variant?.experiment_title) || "Bản Growth" : post.title,
      channel: linked ? "threads" : post.channel, status, record_status: post.status, url, published_at: publishedAt,
      published: Boolean(url && publishedAt && (linked ? new Date(publishedAt).getTime() <= asOf : vietnamDay(publishedAt) <= vietnamDay(asOf)) && (!linked || ["published", "paused", "reviewed"].includes(status))),
      metrics, tracked_metrics: tracked, experiment_id: variant?.experiment_id || null,
      body: linked ? text(variant?.post_text) : "", missing_variant: linked && !variant,
    };
  });
  // Merge connected aliases, including a URL duplicate encountered before its link.
  const groups = [];
  for (const record of records) {
    const aliases = new Set([record.growth_variant_id ? `growth:${record.growth_variant_id}` : `record:${record.id}`, ...(record.url ? [`url:${postUrlKey(record.url)}`] : [])]);
    const matches = groups.filter((group) => [...aliases].some((key) => group.aliases.has(key)));
    const all = [record, ...matches.flatMap((group) => group.records)];
    matches.forEach((group) => { group.aliases.forEach((key) => aliases.add(key)); groups.splice(groups.indexOf(group), 1); });
    groups.push({ aliases, records: all });
  }
  return groups.map(({ records: group }) => {
    const chosen = [...group].sort(compareAuthority)[0];
    const recordIds = [...new Set(group.flatMap((post) => post.record_ids))];
    const suppressed = group.filter((post) => post.id !== chosen.id).map((post) => ({ id: post.id, source: post.source, metrics: post.metrics, reason: chosen.source === "growth" ? "growth_authoritative" : "duplicate_url" }));
    return {
      ...chosen, record_status: group.every((post) => post.record_status === "archived") ? "archived" : "active", record_ids: recordIds, link_ids: recordIds,
      topic_ids: [...new Set(group.flatMap((post) => post.topic_ids))], angle_ids: [...new Set(group.flatMap((post) => post.angle_ids))],
      suppressed_records: suppressed,
      duplicate_note: suppressed.length ? chosen.source === "growth" ? "Các bản ghi trùng được tính là một bài. Nội dung và số liệu lấy từ bài gốc Growth Lab; số liệu nhập tay ở bản ghi trùng được giữ trong bản gốc nhưng không cộng vào tổng." : "Các bản ghi cùng đường dẫn được tính là một bài. Tổng dùng số liệu của bản ghi mới nhất; các bản ghi còn lại được giữ để đối chiếu và không cộng thêm." : "",
    };
  });
}

export function canonicalKnowledgePosts(snapshot = {}, options = {}) {
  return knowledgePostNodes(snapshot, options).filter((post) => post.published);
}

export function summarizeMetricCoverage(values = []) {
  const normalized = values.map(knowledgeMetric);
  const known = normalized.filter((value) => value !== null);
  return { total: known.length ? known.reduce((sum, value) => sum + value, 0) : null, known: known.length, unknown: normalized.length - known.length, count: normalized.length, complete: normalized.length > 0 && known.length === normalized.length };
}

const rate = (posts, numeratorKey, denominatorKey, minimumDenominator = 20) => {
  const paired = posts.map((post) => [knowledgeMetric(post.tracked_metrics[numeratorKey]), knowledgeMetric(post.tracked_metrics[denominatorKey])]);
  const complete = paired.length > 0 && paired.every(([numerator, denominator]) => numerator !== null && denominator !== null);
  const numerator = complete ? paired.reduce((sum, pair) => sum + pair[0], 0) : null;
  const denominator = complete ? paired.reduce((sum, pair) => sum + pair[1], 0) : null;
  const reason = !complete ? "incomplete" : denominator < minimumDenominator || denominator <= 0 ? "insufficient" : null;
  return { value: reason ? null : numerator / denominator, numerator, denominator, minimumDenominator, reason };
};

export function summarizeKnowledge(input = {}, { topicId, angleId, includeDescendants = true, includeArchived = true, now } = {}) {
  const snapshot = normalizeKnowledgeSnapshot(input);
  const topicIds = topicId ? new Set(includeDescendants ? topicDescendantIds(snapshot.topics, topicId) : [topicId]) : null;
  const topics = snapshot.topics.filter((topic) => !topicIds || topicIds.has(topic.id));
  const angles = snapshot.angles.filter((angle) => (!topicIds || topicIds.has(angle.topic_id)) && (!angleId || angle.id === angleId));
  const posts = canonicalKnowledgePosts(snapshot, { includeArchived, now }).filter((post) => (!topicIds || post.topic_ids.some((key) => topicIds.has(key))) && (!angleId || post.angle_ids.includes(angleId)));
  const linked = posts.filter((post) => post.source === "growth");
  const external = posts.filter((post) => post.source === "external");
  const coveredAngles = new Set(posts.flatMap((post) => post.angle_ids));
  return {
    posts,
    counts: { topics: topics.length, angles: angles.length, publishedPosts: posts.length, archivedPosts: posts.filter((post) => post.record_status === "archived").length, linkedPosts: linked.length, externalPosts: external.length, anglesWithPosts: angles.filter((angle) => coveredAngles.has(angle.id)).length, reviewedTopics: topics.filter((topic) => topic.status === "reviewed").length },
    platform: Object.fromEntries(PLATFORM_FIELDS.map((field) => [field, summarizeMetricCoverage(posts.map((post) => post.metrics[field]))])),
    tracked: Object.fromEntries(TRACKED_FIELDS.map((field) => [field, summarizeMetricCoverage(linked.map((post) => post.tracked_metrics[field]))])),
    manualAttribution: Object.fromEntries(ATTRIBUTION_FIELDS.map((field) => [field, summarizeMetricCoverage(external.map((post) => post.metrics[field]))])),
    rates: { visitorToQualifiedRequest: rate(linked, "qualified_requests", "visitors"), qualifiedRequestToSent: rate(linked, "samples_sent", "qualified_requests"), sentToOrderMatch: rate(linked, "sample_requests_with_order", "samples_sent") },
    notes: { views: "Tổng lượt xem trên các nền tảng; không phải số người xem duy nhất.", visitors: "Tổng người vào theo từng link Growth; có thể trùng người giữa các bài.", trackedOrders: "Yêu cầu mẫu có đơn khớp số điện thoại sau đó; không phải số đơn chính xác.", manualAttribution: "Số tự ghi nhận riêng, không cộng vào funnel theo dõi." },
  };
}

export function summarizeTopicCoverage(snapshot = {}, topicId, options = {}) {
  return summarizeKnowledge(snapshot, { ...options, topicId });
}

export function buildKnowledgeBrief(inputTopic = {}, inputAngle = {}, inputSnapshot = {}) {
  const normalized = normalizeKnowledgeSnapshot({ ...inputSnapshot, topics: [{ ...inputTopic, id: id(inputTopic?.id) || "brief-topic" }] });
  const topic = normalized.topics[0];
  const angle = normalizeKnowledgeSnapshot({ angles: [{ ...inputAngle, id: id(inputAngle?.id) || "brief-angle" }] }).angles[0];
  const memory = topic.memory_item_id ? normalized.memory_items.find((item) => item.id === topic.memory_item_id && item.status === "approved") : null;
  const missingMemory = Boolean(topic.memory_item_id && !memory);
  const body = topic.memory_item_id ? memory?.body || "" : topic.body;
  const reviewed = topic.status === "reviewed" && !missingMemory;
  const sources = topic.sources.filter((source) => source.url).map((source) => `${source.label || "Nguồn"}: ${source.url}`).join("\n");
  const warning = reviewed ? "Kiến thức đã duyệt. Chỉ dùng điều được nội dung và nguồn bên dưới hỗ trợ; không tự mở rộng thành tuyên bố mới." : "KIẾN THỨC NHÁP / CẦN XÁC MINH. Nội dung dưới đây chỉ là ngữ cảnh chưa duyệt; không dùng làm bằng chứng hoặc khẳng định trong bài đăng trước khi người phụ trách xác minh.";
  return {
    title: angle.title || topic.title || "",
    audience: angle.audience,
    customerProblem: angle.notes,
    angle: [angle.title, angle.hook].filter(Boolean).join("\n"),
    // Unreviewed research is visible context, never prefilled as sales evidence.
    proof: reviewed ? body : "",
    researchContext: [warning, missingMemory ? "Ghi nhớ liên kết hiện không có trong danh sách đã duyệt. Kiểm tra bản gốc trước khi dùng làm căn cứ." : memory ? `Ghi nhớ công ty đã duyệt: ${memory.title}` : "", body, sources].filter(Boolean).join("\n\n"),
    offer: "",
    // An internal research task is not a call to action for the customer.
    cta: "",
    hypothesis: "",
    knowledgeWarnings: reviewed ? [] : [warning],
  };
}

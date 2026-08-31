import { normalizeContact } from "./trade-pipeline.js";

const DAY = 86400000;

const time = (value) => {
  const parsed = value ? new Date(value).getTime() : NaN;
  return Number.isFinite(parsed) ? parsed : 0;
};

const iso = (value) => {
  const parsed = time(value);
  return parsed ? new Date(parsed).toISOString() : null;
};

const ageInDays = (value, now) => value ? Math.floor((now.getTime() - time(value)) / DAY) : 0;
const daysUntil = (value, now) => value ? Math.ceil((time(value) - now.getTime()) / DAY) : null;

const statusLabel = {
  new: "Đang chờ xử lý",
  sent: "Đã gửi",
  declined: "Đã từ chối",
  converted: "Đã chuyển đổi",
  draft: "Bản nháp",
  testing: "Đang thử",
  customer_test: "Khách đang thử",
  approved: "Đã duyệt",
  archived: "Đã lưu trữ",
  accepted: "Đã đồng ý",
  expired: "Đã hết hạn",
  paid: "Đã thanh toán",
  partial: "Thanh toán một phần",
  open: "Đang chờ thanh toán",
  pending: "Đang chờ xác nhận",
  confirmed: "Đã xác nhận",
  shipped: "Đang giao",
  completed: "Đã hoàn thành",
};

const byNewest = (left, right) => time(right.at) - time(left.at);
const byAction = (left, right) => left.priority - right.priority || time(left.dueAt) - time(right.dueAt);

const addTimeline = (timeline, event) => {
  if (!event?.at) return;
  timeline.push({
    id: event.id,
    type: event.type,
    title: event.title,
    detail: event.detail || "",
    status: event.status || "",
    at: iso(event.at),
    href: event.href || "",
  });
};

const addAction = (actions, action) => {
  if (!action?.title) return;
  const key = `${action.kind}:${action.sourceId || action.title}`;
  if (actions.some((item) => item.key === key)) return;
  actions.push({
    key,
    kind: action.kind,
    sourceId: action.sourceId || "",
    title: action.title,
    detail: action.detail || "",
    priority: action.priority || 3,
    dueAt: iso(action.dueAt) || new Date().toISOString(),
    href: action.href || "",
    command: action.command || "",
  });
};

export function buildCustomerJourney({
  opportunity,
  samples = [],
  recipes = [],
  recipeVersions = [],
  quotes = [],
  orders = [],
  receivables = [],
  partners = [],
  now = new Date(),
} = {}) {
  if (!opportunity) return { actions: [], timeline: [], counts: {}, lastActivityAt: null };

  const clock = now instanceof Date ? now : new Date(now);
  const contactKey = normalizeContact(opportunity.contact);
  const matchingSamples = samples.filter((item) => item.id === opportunity.source_id || normalizeContact(item.phone) === contactKey);
  const sampleIds = new Set(matchingSamples.map((item) => item.id));
  const matchingRecipes = recipes.filter((item) => item.opportunity_id === opportunity.id || sampleIds.has(item.sample_request_id));
  const recipeIds = new Set(matchingRecipes.map((item) => item.id));
  const matchingVersions = recipeVersions.filter((item) => recipeIds.has(item.recipe_id));
  const matchingQuotes = quotes.filter((item) => item.opportunity_id === opportunity.id || normalizeContact(item.contact) === contactKey);
  const quoteIds = new Set(matchingQuotes.map((item) => item.id));
  const matchingPartners = partners.filter((item) => item.opportunity_id === opportunity.id || normalizeContact(item.contact) === contactKey);
  const partnerIds = new Set(matchingPartners.map((item) => item.id));
  const matchingOrders = orders.filter((item) => quoteIds.has(item.quote_id) || partnerIds.has(item.partner_account_id) || normalizeContact(item.contact) === contactKey);
  const orderIds = new Set(matchingOrders.map((item) => item.id));
  const matchingReceivables = receivables.filter((item) => orderIds.has(item.order_id));
  const receivableByOrder = Object.fromEntries(matchingReceivables.map((item) => [item.order_id, item]));

  const timeline = [];
  addTimeline(timeline, {
    id: `opportunity:${opportunity.id}`,
    type: "relationship",
    title: "Bắt đầu mối quan hệ",
    detail: opportunity.source_type === "manual" ? "Được thêm trực tiếp vào CRM" : `Nguồn: ${opportunity.source_type}`,
    at: opportunity.created_at,
  });

  matchingSamples.forEach((sample) => addTimeline(timeline, {
    id: `sample:${sample.id}`,
    type: "sample",
    title: sample.status === "sent" ? "Đã gửi bộ mẫu" : "Yêu cầu bộ mẫu",
    detail: [sample.pack, sample.store_name].filter(Boolean).join(" · "),
    status: statusLabel[sample.status] || sample.status,
    at: sample.ts,
    href: "/admin/orders#relationships",
  }));

  matchingRecipes.forEach((recipe) => addTimeline(timeline, {
    id: `recipe:${recipe.id}`,
    type: "recipe",
    title: recipe.status === "approved" ? `Đã duyệt công thức ${recipe.name}` : `Mở công thức ${recipe.name}`,
    detail: recipe.purpose,
    status: statusLabel[recipe.status] || recipe.status,
    at: recipe.updated_at || recipe.created_at,
    href: `/admin/recipes?view=lab&opportunity=${encodeURIComponent(opportunity.id)}`,
  }));

  matchingVersions.forEach((version) => {
    const recipe = matchingRecipes.find((item) => item.id === version.recipe_id);
    addTimeline(timeline, {
      id: `recipe-version:${version.id}`,
      type: "test",
      title: `Thử ${recipe?.name || "công thức"} · bản ${version.version_number}`,
      detail: version.customer_feedback || version.notes,
      status: version.result === "pass" ? "Đạt" : version.result === "fail" ? "Không đạt" : "Cần thử lại",
      at: version.created_at || version.tested_at,
      href: `/admin/recipes?view=lab&opportunity=${encodeURIComponent(opportunity.id)}`,
    });
  });

  matchingQuotes.forEach((quote) => addTimeline(timeline, {
    id: `quote:${quote.id}`,
    type: "quote",
    title: quote.status === "accepted" ? "Khách đã đồng ý báo giá" : quote.status === "converted" ? "Báo giá đã thành đơn" : "Tạo báo giá",
    detail: quote.total ? new Intl.NumberFormat("vi-VN").format(Number(quote.total)) + " ₫" : quote.id,
    status: statusLabel[quote.status] || quote.status,
    at: quote.accepted_at || quote.sent_at || quote.created_at,
  }));

  matchingOrders.forEach((order) => {
    addTimeline(timeline, {
      id: `order:${order.id}`,
      type: "order",
      title: `Tạo đơn ${order.id}`,
      detail: order.estimated_total ? new Intl.NumberFormat("vi-VN").format(Number(order.estimated_total)) + " ₫" : "Chưa chốt tổng tiền",
      status: statusLabel[order.status] || order.status,
      at: order.ts,
      href: "/admin/orders#orders",
    });
    if (order.delivered_at || order.status === "completed") addTimeline(timeline, {
      id: `delivery:${order.id}`,
      type: "delivery",
      title: "Đơn hàng đã hoàn thành",
      detail: order.carrier_status_name || order.tracking_code || order.id,
      status: "Đã giao",
      at: order.delivered_at || order.carrier_status_at || order.ts,
      href: "/admin/orders#orders",
    });
  });

  matchingReceivables.forEach((receivable) => addTimeline(timeline, {
    id: `payment:${receivable.id}`,
    type: "payment",
    title: receivable.status === "paid" ? "Đã nhận đủ thanh toán" : "Đã mở theo dõi thanh toán",
    detail: `${new Intl.NumberFormat("vi-VN").format(Number(receivable.paid || 0))} / ${new Intl.NumberFormat("vi-VN").format(Number(receivable.total || 0))} ₫`,
    status: statusLabel[receivable.status] || receivable.status,
    at: receivable.updated_at || receivable.created_at || receivable.issued_at,
    href: "/admin/orders#orders",
  }));

  timeline.sort(byNewest);
  const actions = [];

  if (opportunity.stage !== "lost" && opportunity.next_action && opportunity.next_action_at) {
    const dueIn = daysUntil(opportunity.next_action_at, clock);
    if (dueIn <= 7) addAction(actions, {
      kind: "manual",
      sourceId: opportunity.id,
      title: opportunity.next_action,
      detail: dueIn < 0 ? `Quá hạn ${Math.abs(dueIn)} ngày` : dueIn === 0 ? "Đến hạn hôm nay" : `Đến hạn trong ${dueIn} ngày`,
      priority: dueIn < 0 ? 1 : dueIn === 0 ? 2 : 3,
      dueAt: opportunity.next_action_at,
      command: "edit-rhythm",
    });
  }

  matchingSamples.filter((item) => item.status === "new").forEach((sample) => addAction(actions, {
    kind: "sample",
    sourceId: sample.id,
    title: "Xác nhận và gửi bộ mẫu",
    detail: `${sample.store_name} · ${sample.pack}`,
    priority: 1,
    dueAt: sample.ts,
    href: "/admin/orders#relationships",
  }));

  matchingSamples.filter((item) => item.status === "sent" && opportunity.stage === "sample_sent" && ageInDays(opportunity.updated_at, clock) >= 2).forEach((sample) => addAction(actions, {
    kind: "feedback",
    sourceId: sample.id,
    title: "Hỏi kết quả thử trà",
    detail: `Đã ${ageInDays(opportunity.updated_at, clock)} ngày từ lần cập nhật gửi mẫu`,
    priority: 2,
    dueAt: new Date(time(opportunity.updated_at) + 2 * DAY),
    href: sample.phone ? `tel:${sample.phone}` : "",
  }));

  matchingRecipes.filter((item) => ["testing", "customer_test"].includes(item.status)).forEach((recipe) => addAction(actions, {
    kind: "recipe",
    sourceId: recipe.id,
    title: recipe.status === "customer_test" ? "Ghi nhận phản hồi công thức" : "Tiếp tục thử công thức",
    detail: recipe.name,
    priority: 2,
    dueAt: recipe.updated_at,
    href: `/admin/recipes?view=lab&opportunity=${encodeURIComponent(opportunity.id)}`,
  }));

  const approvedRecipes = matchingRecipes.filter((item) => item.status === "approved");
  if (approvedRecipes.length && !matchingQuotes.length) addAction(actions, {
    kind: "quote",
    sourceId: approvedRecipes[0].id,
    title: "Tạo báo giá từ công thức đã duyệt",
    detail: approvedRecipes[0].name,
    priority: 1,
    dueAt: approvedRecipes[0].updated_at,
    command: "create-quote",
  });

  matchingQuotes.filter((item) => item.status === "draft").forEach((quote) => addAction(actions, {
    kind: "quote",
    sourceId: quote.id,
    title: "Kiểm tra và gửi báo giá",
    detail: quote.id,
    priority: 1,
    dueAt: quote.created_at,
    command: "open-quote",
  }));

  matchingQuotes.filter((item) => item.status === "sent").forEach((quote) => {
    const expiryIn = daysUntil(quote.valid_until, clock);
    if (ageInDays(quote.sent_at || quote.created_at, clock) >= 2 || (expiryIn !== null && expiryIn <= 3)) addAction(actions, {
      kind: "quote-followup",
      sourceId: quote.id,
      title: "Theo dõi báo giá đã gửi",
      detail: expiryIn !== null && expiryIn < 0 ? `Đã hết hạn ${Math.abs(expiryIn)} ngày` : expiryIn !== null ? `Còn ${expiryIn} ngày hiệu lực` : "Báo giá vô thời hạn",
      priority: expiryIn !== null && expiryIn <= 0 ? 1 : 2,
      dueAt: quote.valid_until || new Date(time(quote.sent_at || quote.created_at) + 2 * DAY),
      href: opportunity.contact ? `tel:${opportunity.contact}` : "",
    });
  });

  matchingQuotes.filter((item) => item.status === "accepted" && !item.converted_order_id).forEach((quote) => addAction(actions, {
    kind: "order",
    sourceId: quote.id,
    title: "Tạo đơn từ báo giá đã đồng ý",
    detail: quote.id,
    priority: 1,
    dueAt: quote.accepted_at || quote.updated_at,
    command: "convert-quote",
  }));

  matchingOrders.filter((item) => item.health === "blocked" || item.health === "waiting").forEach((order) => addAction(actions, {
    kind: "order-risk",
    sourceId: order.id,
    title: order.health === "blocked" ? "Gỡ vướng đơn hàng" : "Xử lý phần đơn đang chờ",
    detail: order.health_note || order.id,
    priority: 1,
    dueAt: order.health_changed_at || order.ts,
    href: "/admin/orders#orders",
  }));

  matchingOrders.filter((order) => order.delivered_at || order.status === "completed").forEach((order) => {
    const receivable = receivableByOrder[order.id];
    if (receivable && !["paid", "void"].includes(receivable.status) && ageInDays(order.delivered_at || order.ts, clock) >= 3) addAction(actions, {
      kind: "payment",
      sourceId: order.id,
      title: "Nhắc phần thanh toán còn lại",
      detail: `Còn ${new Intl.NumberFormat("vi-VN").format(Math.max(0, Number(receivable.total || 0) - Number(receivable.paid || 0)))} ₫`,
      priority: 1,
      dueAt: new Date(time(order.delivered_at || order.ts) + 3 * DAY),
      href: "/admin/orders#orders",
    });
  });

  matchingPartners.forEach((partner) => {
    const partnerOrders = matchingOrders.filter((order) => order.partner_account_id === partner.id).sort((a, b) => time(b.ts) - time(a.ts));
    if (!partnerOrders.length) return;
    const cadence = Number(partner.reorder_cadence_days) || 30;
    const dueAt = new Date(time(partnerOrders[0].ts) + cadence * DAY);
    if (dueAt <= clock) addAction(actions, {
      kind: "reorder",
      sourceId: partner.id,
      title: "Hỏi nhịp đặt hàng tiếp theo",
      detail: `Đã qua nhịp ${cadence} ngày của khách`,
      priority: 2,
      dueAt,
      href: opportunity.contact ? `tel:${opportunity.contact}` : "",
    });
  });

  if (!actions.length && opportunity.stage !== "lost" && timeline[0] && ageInDays(timeline[0].at, clock) >= 45) addAction(actions, {
    kind: "reconnect",
    sourceId: opportunity.id,
    title: "Kết nối lại với khách hàng",
    detail: `Không có hoạt động mới trong ${ageInDays(timeline[0].at, clock)} ngày`,
    priority: 3,
    dueAt: clock,
    href: opportunity.contact ? `tel:${opportunity.contact}` : "",
  });

  actions.sort(byAction);
  return {
    opportunity,
    partner: matchingPartners[0] || null,
    actions,
    timeline,
    counts: {
      samples: matchingSamples.length,
      recipes: matchingRecipes.length,
      quotes: matchingQuotes.length,
      orders: matchingOrders.length,
    },
    lastActivityAt: timeline[0]?.at || iso(opportunity.updated_at || opportunity.created_at),
  };
}

export function buildJourneyQueue(input = {}) {
  return (input.opportunities || [])
    .filter((opportunity) => opportunity.stage !== "lost")
    .map((opportunity) => buildCustomerJourney({ ...input, opportunity }))
    .flatMap((journey) => journey.actions.slice(0, 1).map((action) => ({ ...action, opportunity: journey.opportunity })))
    .sort(byAction);
}

export function relativeDueLabel(value, now = new Date()) {
  const difference = daysUntil(value, now instanceof Date ? now : new Date(now));
  if (difference === null) return "Chưa đặt hạn";
  if (difference < 0) return `Quá hạn ${Math.abs(difference)} ngày`;
  if (difference === 0) return "Hôm nay";
  if (difference === 1) return "Ngày mai";
  return `Còn ${difference} ngày`;
}

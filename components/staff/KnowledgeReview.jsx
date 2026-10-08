"use client";

// Development-only, explicitly fictional data. Never reads or writes production.
import { useMemo, useRef, useState } from "react";
import KnowledgeCentre from "./KnowledgeCentre";
import GrowthLab from "./GrowthLab";

const IDS = {
  tea: "10000000-0000-4000-8000-000000000001", brew: "10000000-0000-4000-8000-000000000002",
  business: "10000000-0000-4000-8000-000000000003", sales: "10000000-0000-4000-8000-000000000004",
  angle: "20000000-0000-4000-8000-000000000001", experiment: "30000000-0000-4000-8000-000000000001",
  variant: "40000000-0000-4000-8000-000000000001", memory: "50000000-0000-4000-8000-000000000001",
};
const clone = value => JSON.parse(JSON.stringify(value));
const topic = (id, parent_id, domain, title, body = "") => ({ id, parent_id, domain, title, body,
  sources: [], status: "draft", memory_item_id: null, next_action: "", version: 1 });
function fixture() {
  return {
    topics: [
      topic(IDS.tea, null, "tea", "Pha chế & nền trà"),
      { ...topic(IDS.brew, IDS.tea, "tea", "Độ đậm khi pha trà trái cây", "Câu hỏi để nghiên cứu: cách thử nền trà với cùng công thức trái cây? Chưa có kết luận thực tế."), next_action: "Pha thử hai định lượng và ghi điều kiện thử." },
      topic(IDS.business, null, "business", "Phát triển khách B2B"),
      topic(IDS.sales, IDS.business, "business", "Từ xin mẫu đến đơn đầu", "Cần ghi nhận lý do khách chưa đặt và bước theo dõi tiếp theo."),
    ],
    angles: [{ id: IDS.angle, topic_id: IDS.brew, title: "Vì sao nền trà bị lấn vị?", audience: "Người phát triển menu cho quán", hook: "So sánh trong cùng một công thức", notes: "Góc minh họa; chưa phải kết quả thử trà.", next_action: "Chụp hai ly và ghi công thức.", status: "research", version: 1 }],
    posts: [
      { id: "60000000-0000-4000-8000-000000000001", topic_id: IDS.brew, angle_id: IDS.angle, growth_variant_id: IDS.variant, status: "active", channel: "", title: "", url: "", published_at: null, metrics: {}, measurement_note: "", version: 1 },
      { id: "60000000-0000-4000-8000-000000000002", topic_id: IDS.brew, angle_id: IDS.angle, growth_variant_id: null, status: "active", channel: "facebook", title: "Bài minh họa: so sánh nền trà", url: "https://example.test/posts/tea-demo", published_at: "2026-10-01T09:00:00+07:00", metrics: { views: null, likes: 12, comments: null, shares: 3, clicks: null, leads: null, orders: null, revenue: null, spend: 0 }, measurement_note: "Số liệu hoàn toàn minh họa, chưa nhập lượt xem.", version: 1 },
    ],
    memory_items: [{ id: IDS.memory, kind: "policy", title: "Nguyên tắc minh họa: ghi nguồn của kết quả", body: "Không dùng số liệu chưa được ghi nhận làm bằng chứng bán hàng.", status: "approved", approved_at: "2026-10-01T09:00:00+07:00" }],
    growth: { active_prompt: { id: "70000000-0000-4000-8000-000000000001", version: 1, name: "Prompt minh họa" }, experiments: [{ id: IDS.experiment, title: "Phép thử minh họa: nền trà", status: "review", angle: "So sánh công thức", variants: [{ id: IDS.variant, experiment_id: IDS.experiment, label: "Bản minh họa A", tracking_code: "hl-review-a", post_text: "Bản nháp minh họa; không đăng lên mạng xã hội. [LINK_SAMPLE]", status: "published", threads_post_url: "https://example.test/posts/threads-demo", published_at: "2026-10-01T09:00:00+07:00", manual_metrics: { views: 1200, likes: 40, replies: 8, reposts: 2 }, outcomes: { visitors: 30, qualified_requests: 4, samples_sent: 2, first_orders: 1 } }] }] },
    dashboard_plans: [],
  };
}

export default function KnowledgeReview() {
  const state = useRef(fixture());
  const offlineRef = useRef(false);
  const [offline, setOffline] = useState(false);
  const [view, setView] = useState("knowledge");
  const [revision, setRevision] = useState(0);
  const supabase = useMemo(() => {
    const denied = () => ({ data: null, error: { message: "Mô phỏng mất kết nối" } });
    const tableRows = table => {
      if (table === "growth_experiments") return state.current.growth.experiments;
      if (table === "growth_variants") return state.current.growth.experiments.flatMap(item => item.variants || []);
      return state.current[table] || [];
    };
    return {
      auth: { getUser: async () => ({ data: { user: { id: "review-user", email: "review@example.test" } } }), getSession: async () => ({ data: { session: { user: { id: "review-user" }, access_token: "" } } }) },
      rpc: async (name, args = {}) => {
        if (offlineRef.current) return denied();
        if (name === "knowledge_centre_snapshot") return { data: clone(state.current), error: null };
        if (name === "growth_lab_snapshot") return { data: clone(state.current.growth), error: null };
        if (name === "b2b_conversion_snapshot") return { data: { days: 30, by_source: [] }, error: null };
        const kind = { save_knowledge_topic: "topics", save_knowledge_angle: "angles", save_knowledge_post: "posts" }[name];
        if (!kind) return { data: null, error: { message: "Thao tác này chưa được mô phỏng" } };
        const rows = state.current[kind];
        const current = rows.find(item => item.id === args.p_id);
        if ((args.p_id && (!current || current.version !== args.p_expected_version)) || (!args.p_id && args.p_expected_version !== null)) return { data: null, error: { message: `knowledge_${kind.slice(0, -1)}_conflict` } };
        const now = new Date().toISOString();
        const row = { ...(current || { id: crypto.randomUUID(), created_at: now }), ...clone(args.p_fields), version: (current?.version || 0) + 1, updated_at: now };
        if (current) rows[rows.indexOf(current)] = row; else rows.push(row);
        return { data: [clone(row)], error: null };
      },
      from: table => {
        let filters = [], single = false, operation = "read", fields;
        const chain = {
          select: () => chain, order: () => chain, limit: () => chain,
          eq: (key, value) => { filters.push(row => row[key] === value); return chain; },
          in: (key, values) => { filters.push(row => values.includes(row[key])); return chain; },
          maybeSingle: () => { single = true; return chain; }, single: () => { single = true; return chain; },
          insert: value => { operation = "insert"; fields = value; return chain; },
          upsert: value => { operation = "insert"; fields = value; return chain; },
          update: value => { operation = "update"; fields = value; return chain; },
          then: resolve => {
            if (offlineRef.current) return Promise.resolve(denied()).then(resolve);
            let result = tableRows(table).filter(row => filters.every(filter => filter(row)));
            if (operation === "insert") {
              result = (Array.isArray(fields) ? fields : [fields]).map(value => ({ id: crypto.randomUUID(), created_at: new Date().toISOString(), ...(table === "growth_variants" ? { status: "draft", manual_metrics: {} } : table === "growth_experiments" ? { status: "draft" } : table === "dashboard_plans" ? { status: "pending" } : {}), ...value }));
              if (table === "growth_experiments") result.forEach(row => state.current.growth.experiments.unshift({ ...row, variants: [] }));
              else if (table === "growth_variants") result.forEach(row => state.current.growth.experiments.find(item => item.id === row.experiment_id)?.variants.push(row));
              else if (table === "dashboard_plans") state.current.dashboard_plans.push(...result);
            } else if (operation === "update") result.forEach(row => Object.assign(row, fields));
            return Promise.resolve({ data: clone(single ? result[0] || null : result), error: null }).then(resolve);
          },
        };
        return chain;
      },
    };
  }, []);
  return <>
    <aside style={{ padding: "var(--space-sm)", background: "var(--color-paper-3)" }}>
      <b>Dữ liệu minh họa · Chỉ lưu trong phiên xem thử · Không đăng bài hoặc gửi tin</b>
      <div style={{ display: "flex", gap: "var(--space-xs)", flexWrap: "wrap", marginTop: "var(--space-xs)" }}>
        <button onClick={() => { offlineRef.current = !offline; setOffline(!offline); }}>{offline ? "Khôi phục kết nối mô phỏng" : "Mô phỏng lỗi tải/lưu"}</button>
        <button onClick={() => { state.current = fixture(); setRevision(value => value + 1); }}>Khôi phục dữ liệu minh họa</button>
        <button onClick={() => { state.current = { topics: [], angles: [], posts: [], memory_items: [], growth: { experiments: [] }, dashboard_plans: [] }; setRevision(value => value + 1); }}>Xem trạng thái trống</button>
        <button onClick={() => setView(view === "knowledge" ? "growth" : "knowledge")}>{view === "knowledge" ? "Xem Growth Lab minh họa" : "Về cây kiến thức"}</button>
      </div>
    </aside>
    {view === "knowledge" ? <KnowledgeCentre key={revision} supabase={supabase} email="review@example.test" role="admin"/> : <GrowthLab key={revision} supabase={supabase} email="review@example.test" role="admin"/>}
  </>;
}

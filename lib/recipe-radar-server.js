import {
  buildGoogleNewsUrl,
  conceptKey,
  deriveConceptName,
  inferCategory,
  parseRssItems,
  RADAR_MARKETS,
  safeExternalUrl,
  scoreConcept,
  signalFingerprint,
  teaFitScore,
  feasibilityScore,
  toSignalRecord,
} from "@/lib/recipe-radar";

const MAX_ITEMS_PER_FEED = 8;
const SIGNAL_WINDOW_DAYS = 120;

function termForMarket(query, marketCode) {
  const market = RADAR_MARKETS[marketCode] || RADAR_MARKETS.US;
  return query.search_terms?.[market.language] || query.search_terms?.en || query.label;
}

async function collectNewsFeed(query, region) {
  const url = buildGoogleNewsUrl(termForMarket(query, region), region);
  const response = await fetch(url, {
    headers: { "User-Agent": "House-of-Hoang-Long-Menu-Radar/1.0" },
    signal: AbortSignal.timeout(9000),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`news_${region}_${response.status}`);
  const xml = await response.text();
  return parseRssItems(xml).slice(0, MAX_ITEMS_PER_FEED).map((item) => toSignalRecord(item, { query, region }));
}

async function collectYouTubeFeed(query, region, apiKey) {
  const market = RADAR_MARKETS[region] || RADAR_MARKETS.US;
  const params = new URLSearchParams({
    part: "snippet", type: "video", maxResults: "6", order: "date",
    q: termForMarket(query, region), regionCode: region, relevanceLanguage: market.language,
    publishedAfter: new Date(Date.now() - 21 * 86400000).toISOString(), key: apiKey,
  });
  const response = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`, { signal: AbortSignal.timeout(9000), cache: "no-store" });
  if (!response.ok) throw new Error(`youtube_${region}_${response.status}`);
  const payload = await response.json();
  const items = payload.items || [];
  const videoIds = items.map((item) => item.id?.videoId).filter(Boolean);
  let metrics = {};
  if (videoIds.length) {
    const statsParams = new URLSearchParams({ part: "statistics", id: videoIds.join(","), key: apiKey });
    const statsResponse = await fetch(`https://www.googleapis.com/youtube/v3/videos?${statsParams}`, { signal: AbortSignal.timeout(9000), cache: "no-store" });
    if (statsResponse.ok) {
      const statsPayload = await statsResponse.json();
      metrics = Object.fromEntries((statsPayload.items || []).map((item) => [item.id, {
        views: Number(item.statistics?.viewCount || 0), likes: Number(item.statistics?.likeCount || 0),
        comments: Number(item.statistics?.commentCount || 0),
      }]));
    }
  }
  return items.map((item) => toSignalRecord({
    title: item.snippet?.title || "", excerpt: item.snippet?.description || "",
    url: `https://www.youtube.com/watch?v=${item.id?.videoId}`, sourceId: item.id?.videoId,
    publisher: item.snippet?.channelTitle || "", publishedAt: item.snippet?.publishedAt,
    metrics: metrics[item.id?.videoId] || {},
  }, { query, region, source: "youtube" }));
}

export async function collectRecipeRadarSignals(queries, { youtubeApiKey = "" } = {}) {
  const jobs = [];
  for (const query of queries.filter((item) => item.active !== false)) {
    const markets = Array.isArray(query.markets) ? query.markets : Object.keys(RADAR_MARKETS);
    for (const region of markets.filter((code) => RADAR_MARKETS[code])) {
      jobs.push({ source: "google-news", query: query.id, region, promise: collectNewsFeed(query, region) });
      if (youtubeApiKey) jobs.push({ source: "youtube", query: query.id, region, promise: collectYouTubeFeed(query, region, youtubeApiKey) });
    }
  }

  const settled = await Promise.allSettled(jobs.map((job) => job.promise));
  const signals = [];
  const errors = [];
  const sourceSummary = {};
  settled.forEach((result, index) => {
    const job = jobs[index];
    if (result.status === "fulfilled") {
      signals.push(...result.value);
      sourceSummary[job.source] = (sourceSummary[job.source] || 0) + result.value.length;
    } else {
      errors.push({ source: job.source, query: job.query, region: job.region, error: String(result.reason?.message || result.reason).slice(0, 160) });
    }
  });
  return { signals, errors, sourceSummary };
}

function conceptSummary(score, category) {
  const spread = score.marketCount > 1 ? `${score.marketCount} thị trường` : "một thị trường";
  const gap = score.vietnamGap >= 80 ? "chưa thấy tín hiệu tương xứng tại Việt Nam" : "đã có dấu hiệu tại Việt Nam";
  return `${score.signalCount} tín hiệu từ ${spread}; ${gap}. Nhóm: ${category}.`;
}

export async function refreshRecipeRadarConcepts(admin, { triggeredBy = "" } = {}) {
  const since = new Date(Date.now() - SIGNAL_WINDOW_DAYS * 86400000).toISOString();
  const [{ data: signals, error: signalError }, { data: existing, error: conceptError }] = await Promise.all([
    admin.from("recipe_radar_signals").select("*").gte("published_at", since).order("published_at", { ascending: false }).limit(5000),
    admin.from("recipe_radar_concepts").select("id,canonical_key,stage,promoted_recipe_id,created_by,first_seen_at"),
  ]);
  if (signalError) throw signalError;
  if (conceptError) throw conceptError;

  const existingMap = new Map((existing || []).map((item) => [item.canonical_key, item]));
  const groups = new Map();
  for (const signal of signals || []) {
    const key = signal.concept_key || conceptKey(signal.concept_name || signal.title);
    groups.set(key, [...(groups.get(key) || []), signal]);
  }

  const rows = [...groups.entries()].map(([key, group]) => {
    const score = scoreConcept(group);
    const prior = existingMap.get(key);
    const newest = [...group].sort((a, b) => new Date(b.published_at) - new Date(a.published_at))[0];
    const oldest = [...group].sort((a, b) => new Date(a.published_at) - new Date(b.published_at))[0];
    const lockedStage = prior && ["candidate", "testing", "dismissed"].includes(prior.stage) ? prior.stage : score.suggestedStage;
    return {
      id: prior?.id || `radar-concept-${key}`,
      canonical_key: key,
      name: newest.concept_name || deriveConceptName(newest.title),
      category: newest.category || inferCategory(newest.title),
      summary: conceptSummary(score, newest.category || "menu-launch"),
      stage: lockedStage,
      score_total: score.total,
      score_velocity: score.velocity,
      score_cross_market: score.crossMarket,
      score_vietnam_gap: score.vietnamGap,
      score_tea_fit: score.teaFit,
      score_feasibility: score.feasibility,
      signal_count: score.signalCount,
      market_count: score.marketCount,
      regions: score.regions,
      sources: score.sources,
      first_seen_at: prior?.first_seen_at || oldest.published_at,
      last_seen_at: newest.published_at,
      promoted_recipe_id: prior?.promoted_recipe_id || null,
      created_by: prior?.created_by || triggeredBy,
      updated_at: new Date().toISOString(),
    };
  });
  if (rows.length) {
    const { error } = await admin.from("recipe_radar_concepts").upsert(rows, { onConflict: "canonical_key" });
    if (error) throw error;
  }
  return rows;
}

export async function runRecipeRadar(admin, { mode = "manual", triggeredBy = "" } = {}) {
  const { data: run, error: runError } = await admin.from("recipe_radar_runs").insert({ mode, triggered_by: triggeredBy }).select("id").single();
  if (runError) throw runError;
  try {
    const { data: queries, error: queryError } = await admin.from("recipe_radar_queries").select("*").eq("active", true).order("created_at");
    if (queryError) throw queryError;
    const collected = await collectRecipeRadarSignals(queries || [], { youtubeApiKey: process.env.YOUTUBE_DATA_API_KEY?.trim() || "" });
    const ids = collected.signals.map((item) => item.id);
    let existingIds = [];
    if (ids.length) {
      const { data } = await admin.from("recipe_radar_signals").select("id").in("id", ids);
      existingIds = (data || []).map((item) => item.id);
      const { error: signalError } = await admin.from("recipe_radar_signals").upsert(collected.signals, { onConflict: "id" });
      if (signalError) throw signalError;
    }
    const concepts = await refreshRecipeRadarConcepts(admin, { triggeredBy });
    const status = collected.errors.length && !collected.signals.length ? "failed" : collected.errors.length ? "partial" : "completed";
    const result = {
      status, queryCount: queries?.length || 0, signalCount: collected.signals.length,
      newSignalCount: ids.filter((id) => !existingIds.includes(id)).length,
      conceptCount: concepts.length, sourceSummary: collected.sourceSummary, errors: collected.errors,
    };
    await admin.from("recipe_radar_runs").update({
      status, query_count: result.queryCount, signal_count: result.signalCount,
      new_signal_count: result.newSignalCount, concept_count: result.conceptCount,
      source_summary: result.sourceSummary, errors: result.errors, completed_at: new Date().toISOString(),
    }).eq("id", run.id);
    return { runId: run.id, ...result };
  } catch (error) {
    await admin.from("recipe_radar_runs").update({ status: "failed", errors: [{ error: String(error.message || error).slice(0, 200) }], completed_at: new Date().toISOString() }).eq("id", run.id);
    throw error;
  }
}

export async function saveManualRadarSignal(admin, input, { triggeredBy = "" } = {}) {
  const url = safeExternalUrl(input.url);
  const title = String(input.title || "").trim().slice(0, 240);
  if (!url || !title) throw new Error("invalid_signal");
  const name = String(input.conceptName || "").trim().slice(0, 160) || deriveConceptName(title);
  const region = RADAR_MARKETS[input.region] ? input.region : "US";
  const row = {
    id: signalFingerprint({ source: "manual", url, title, region }), source: "manual", url, title,
    excerpt: String(input.excerpt || "").trim().slice(0, 1000), publisher: String(input.publisher || "").trim().slice(0, 160),
    published_at: input.publishedAt && !Number.isNaN(new Date(input.publishedAt).getTime()) ? new Date(input.publishedAt).toISOString() : new Date().toISOString(),
    region, language: RADAR_MARKETS[region].language, metrics: {}, concept_key: conceptKey(name), concept_name: name,
    category: input.category || inferCategory(`${name} ${title}`), tea_fit: teaFitScore(`${name} ${title}`),
    feasibility: feasibilityScore(`${name} ${title}`), manual_notes: String(input.notes || "").trim().slice(0, 1000), created_by: triggeredBy,
  };
  const { error } = await admin.from("recipe_radar_signals").upsert(row, { onConflict: "id" });
  if (error) throw error;
  const concepts = await refreshRecipeRadarConcepts(admin, { triggeredBy });
  await admin.from("recipe_radar_runs").insert({
    mode: "manual-signal", status: "completed", signal_count: 1, new_signal_count: 1,
    concept_count: concepts.length, source_summary: { manual: 1 }, triggered_by: triggeredBy, completed_at: new Date().toISOString(),
  });
  return { signal: row, concept: concepts.find((item) => item.canonical_key === row.concept_key) || null };
}

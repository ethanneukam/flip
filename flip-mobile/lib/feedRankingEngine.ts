/**
 * Phase 14 — sole authority for feed ranking + category heat.
 * Screens fetch raw rows; all scoring and sort orders are computed here only.
 */
import type { GlasscardData } from '../types/models';

export type FeedSortMode =
  | 'trending'
  | 'liquidity'
  | 'momentum'
  | 'movers'
  | 'trusted_sellers'
  | 'fulfillment_quality'
  | 'newest';

export const FEED_SORT_MODES: FeedSortMode[] = [
  'trending',
  'liquidity',
  'momentum',
  'movers',
  'trusted_sellers',
  'fulfillment_quality',
  'newest',
];

export const FEED_SORT_LABELS: Record<FeedSortMode, string> = {
  trending: 'Trending',
  liquidity: 'Liquidity',
  momentum: 'Momentum',
  movers: 'Movers',
  trusted_sellers: 'Trusted Sellers',
  fulfillment_quality: 'Fulfillment Quality',
  newest: 'Newest',
};

/** Headline under the dropdown for the active mode. */
export const FEED_MODE_HEADLINE: Record<FeedSortMode, string> = {
  trending: 'TRENDING MARKET',
  liquidity: 'LIQUIDITY FLOW',
  momentum: 'MOMENTUM SURGE',
  movers: 'MARKET MOVERS',
  trusted_sellers: 'TRUSTED SELLERS',
  fulfillment_quality: 'FULFILLMENT QUALITY',
  newest: 'NEW ARRIVALS',
};

export const DEFAULT_FEED_SORT_MODE: FeedSortMode = 'trending';

export const FEED_SORT_STORAGE_KEY = 'flip_feed_sort_mode_v1';

export type MarketIdentityFeedSlice = {
  liquidity_generated: number;
  fulfilled_shipments: number;
  completed_transactions: number;
  failed_transactions: number;
  items_sold: number;
  total_market_volume: number;
  market_rank_score: number;
  adjusted_market_rank_score: number;
  seller_fulfillment_score: number;
  transaction_reliability_score: number;
  fraud_risk_score: number;
  fraud_risk_level: string;
};

export type FeedRankingInput = {
  flip_item_id: string;
  category: string;
  created_at_ms: number;
  seller_user_id: string;
  /** market_signals */
  trend_percent: number;
  trend_direction: 'up' | 'down' | 'stable';
  velocity_label: string;
  demand_score: number;
  supply_score: number;
  recommended_price: number;
  avg_price: number;
  /** Pre-aggregated intent counts (caller buckets by time windows). */
  intents_save_24h: number;
  intents_buy_24h: number;
  intents_save_7d: number;
  intents_buy_7d: number;
  intents_skip_7d: number;
  /** Watchlist adds (any user) in windows — proxy for watch velocity. */
  watch_adds_24h: number;
  watch_adds_7d: number;
  watch_total_rows: number;
  /** market_identity (seller) */
  identity: MarketIdentityFeedSlice | null;
  /** Seller rep_score (users table) — legacy weight only in trusted mode. */
  rep_score: number;
  /** transactions for this flip_item_id */
  tx_completed: number;
  tx_refunded: number;
  tx_disputed: number;
  tx_delivery_confirmed: number;
  tx_cancelled_proxy: number;
};

export type FeedRankRow = {
  flip_item_id: string;
  final_feed_score: number;
  ranking_reason: string;
  momentum_score: number;
  liquidity_score: number;
  trust_score: number;
  fulfillment_score: number;
  watch_velocity_score: number;
  activity_score: number;
};

export type CategoryHeat = {
  category: string;
  heat_score: number;
  heat_direction: 'up' | 'down' | 'flat';
};

export type CategoryHeatBundle = {
  heatByCategory: Record<string, CategoryHeat>;
  hottest_categories: string[];
};

const MS_H = 3600000;
const MS_D = 86400000;

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

/** Exponential decay weight for an event at `tMs` vs `nowMs` (half-life in hours). */
function decayWeight(nowMs: number, tMs: number, halfLifeH = 36): number {
  const h = (nowMs - tMs) / MS_H;
  if (h < 0) return 1;
  return Math.pow(0.5, h / halfLifeH);
}

/**
 * Watch velocity: rate-of-change of saves + watchlist adds, decayed (not raw totals).
 */
export function computeWatchVelocityScore(
  nowMs: number,
  intentSaveEvents: { t: number }[],
  watchAddEvents: { t: number }[]
): number {
  let s = 0;
  for (const e of intentSaveEvents) {
    s += 1.2 * decayWeight(nowMs, e.t, 18);
  }
  for (const e of watchAddEvents) {
    s += 1.0 * decayWeight(nowMs, e.t, 24);
  }
  return 100 * sigmoid((s - 2) / 4);
}

function liquidityRankScore(i: FeedRankingInput): number {
  const id = i.identity;
  if (!id) {
    return i.recommended_price * 0.01 + i.demand_score;
  }
  const rank = id.adjusted_market_rank_score > 0 ? id.adjusted_market_rank_score : id.market_rank_score;
  const lg = Number(id.liquidity_generated) || 0;
  const sold = Number(id.items_sold) || 0;
  const vol = Number(id.total_market_volume) || 0;
  const fulfilled = Number(id.fulfilled_shipments) || 0;
  const failed = Number(id.failed_transactions) || 0;
  const denom = Math.max(1, fulfilled + failed);
  const cancelRate = failed / denom;
  return (
    0.35 * Math.log1p(lg) +
    0.2 * Math.log1p(vol) +
    0.2 * Math.log1p(sold) +
    0.15 * fulfilled -
    0.25 * cancelRate * 100 +
    0.15 * rank
  );
}

function trustScore(i: FeedRankingInput): number {
  const id = i.identity;
  const fraud = id ? Number(id.fraud_risk_score) || 0 : 50;
  const level = (id?.fraud_risk_level ?? 'LOW').toUpperCase();
  let fraudPenalty = fraud * 0.6;
  if (level === 'HIGH' || level === 'CRITICAL') fraudPenalty += 40;
  const rel = id ? Number(id.transaction_reliability_score) || 0 : 0;
  const done = id ? Number(id.completed_transactions) || 0 : 0;
  const rank = id ? (id.adjusted_market_rank_score > 0 ? id.adjusted_market_rank_score : id.market_rank_score) : 0;
  return clamp(0.45 * rel + 0.25 * done + 0.25 * rank + 0.05 * (100 - i.rep_score) - fraudPenalty, 0, 200);
}

function fulfillmentScore(i: FeedRankingInput): number {
  const id = i.identity;
  const sf = id ? Number(id.seller_fulfillment_score) || 0 : 0;
  const rel = id ? Number(id.transaction_reliability_score) || 0 : 0;
  const del = i.tx_delivery_confirmed;
  const comp = i.tx_completed;
  const ref = i.tx_refunded;
  const bad = i.tx_disputed + ref;
  const denom = Math.max(1, comp + bad);
  const shipRate = comp > 0 ? del / comp : 0;
  const refundRate = ref / denom;
  return clamp(0.35 * sf + 0.3 * rel + 0.25 * shipRate * 100 + 0.2 * comp - 0.4 * refundRate * 100, 0, 200);
}

function momentumScore(i: FeedRankingInput, watchVel: number): number {
  const tp = Math.abs(Number(i.trend_percent) || 0);
  const dir = i.trend_direction === 'up' ? 1 : i.trend_direction === 'down' ? -0.4 : 0.1;
  const velBoost = i.velocity_label === 'fast' ? 18 : i.velocity_label === 'medium' ? 8 : i.velocity_label === 'slow' ? 2 : -4;
  const recent =
    i.intents_buy_24h * 14 +
    i.intents_save_24h * 5 +
    (i.intents_buy_7d - i.intents_buy_24h) * 3 +
    (i.intents_save_7d - i.intents_save_24h) * 1.2;
  const volProxy = i.demand_score - i.supply_score * 0.35;
  return clamp(0.45 * tp * dir + 0.25 * recent + 0.2 * watchVel + 0.1 * velBoost + 0.15 * volProxy, -80, 220);
}

function moversScore(i: FeedRankingInput, watchVel: number): number {
  const tp = Number(i.trend_percent) || 0;
  const mag = Math.abs(tp);
  const spike = i.intents_buy_24h * 20 + i.intents_save_24h * 8 + watchVel * 0.35;
  const liqJump = i.identity ? Math.log1p(Number(i.identity.liquidity_generated) || 0) * 6 : 0;
  return mag * 1.15 + spike + liqJump;
}

function activityScore(i: FeedRankingInput, watchVel: number): number {
  return clamp(
    i.intents_save_7d * 3 +
      i.intents_buy_7d * 6 +
      i.intents_skip_7d * 0.5 +
      watchVel * 0.4 +
      i.watch_total_rows * 0.15,
    0,
    400
  );
}

type ScoreParts = {
  momentum_score: number;
  liquidity_score: number;
  trust_score: number;
  fulfillment_score: number;
  watch_velocity_score: number;
  activity_score: number;
};

function trendingScore(i: FeedRankingInput, p: ScoreParts, nowMs: number): number {
  const recency = Math.exp(-(nowMs - i.created_at_ms) / (14 * MS_D));
  return (
    0.28 * p.watch_velocity_score +
    0.14 * (i.intents_save_7d * 8 + i.intents_buy_7d * 14) +
    0.12 * i.tx_completed * 10 +
    0.14 * p.momentum_score +
    0.12 * p.liquidity_score +
    0.08 * p.trust_score +
    0.06 * p.fulfillment_score +
    0.04 * p.activity_score +
    0.02 * recency * 30
  );
}

/** Build per-category heat from listing inputs (no synthetic market rows). */
export function buildCategoryHeat(inputs: FeedRankingInput[], nowMs = Date.now()): CategoryHeatBundle {
  const byCat: Record<
    string,
    { saveW: number; buyW: number; liq: number; mom: number; n: number; trendSum: number }
  > = {};

  for (const i of inputs) {
    const c = i.category || 'unknown';
    if (!byCat[c]) byCat[c] = { saveW: 0, buyW: 0, liq: 0, mom: 0, n: 0, trendSum: 0 };
    const w = decayWeight(nowMs, i.created_at_ms, 72);
    byCat[c].saveW += w * (i.intents_save_7d + 1);
    byCat[c].buyW += w * (i.intents_buy_7d + 1);
    byCat[c].liq += Math.log1p(i.recommended_price || 1);
    byCat[c].mom += Math.abs(i.trend_percent);
    byCat[c].trendSum += i.trend_percent;
    byCat[c].n += 1;
  }

  const heatByCategory: Record<string, CategoryHeat> = {};
  for (const [cat, v] of Object.entries(byCat)) {
    const density = (v.saveW + v.buyW * 1.4) / Math.max(1, v.n);
    const heat_score = 100 * sigmoid(Math.log1p(density) + Math.log1p(v.mom / Math.max(1, v.n)) - 1.2);
    const avgTrend = v.trendSum / Math.max(1, v.n);
    const heat_direction: CategoryHeat['heat_direction'] =
      avgTrend > 0.35 ? 'up' : avgTrend < -0.35 ? 'down' : 'flat';
    heatByCategory[cat] = { category: cat, heat_score, heat_direction };
  }

  const hottest_categories = Object.values(heatByCategory)
    .sort((a, b) => b.heat_score - a.heat_score)
    .slice(0, 6)
    .map((h) => h.category);

  return { heatByCategory, hottest_categories };
}

function heatBias(i: FeedRankingInput, bundle: CategoryHeatBundle | null): number {
  if (!bundle) return 1;
  const h = bundle.heatByCategory[i.category];
  if (!h) return 1;
  const hot = bundle.hottest_categories.includes(i.category) ? 0.08 : 0;
  return 1 + hot + 0.04 * (h.heat_score / 100) * (h.heat_direction === 'up' ? 1 : h.heat_direction === 'down' ? -0.5 : 0);
}

function rowReason(mode: FeedSortMode, i: FeedRankingInput, p: ScoreParts): string {
  switch (mode) {
    case 'trending':
      return `trending blend · vel=${p.watch_velocity_score.toFixed(0)} mom=${p.momentum_score.toFixed(0)}`;
    case 'liquidity':
      return `liquidity · rank_adj=${i.identity?.adjusted_market_rank_score ?? 0}`;
    case 'momentum':
      return `momentum · Δtrend=${i.trend_percent}% recent=${i.intents_buy_24h + i.intents_save_24h}`;
    case 'movers':
      return `movers · |trend|=${Math.abs(i.trend_percent)} spike=${i.intents_buy_24h}`;
    case 'trusted_sellers':
      return `trust · fulfill=${p.fulfillment_score.toFixed(0)} fraud=${i.identity?.fraud_risk_level ?? 'n/a'}`;
    case 'fulfillment_quality':
      return `fulfillment · del_conf=${i.tx_delivery_confirmed}/${Math.max(1, i.tx_completed)}`;
    case 'newest':
      return 'newest · recency primary';
    default:
      return mode;
  }
}

/**
 * Aggregate raw Supabase-shaped rows into engine inputs (no ranking).
 */
export function aggregateFeedRankingInputs(params: {
  nowMs?: number;
  items: Array<{ id: string; category: string; created_at: string; user_id: string }>;
  signalsById: Record<
    string,
    {
      trend_percent?: number;
      trend_direction?: string;
      velocity?: string;
      demand_score?: number;
      supply_score?: number;
      recommended_price?: number;
      avg_price?: number;
    }
  >;
  intents: Array<{ flip_item_id: string; intent_type: string; created_at: string }>;
  watchAdds: Array<{ flip_item_id: string; added_at: string }>;
  transactions: Array<{ flip_item_id: string; status: string; delivery_confirmed?: boolean | null }>;
  identity: MarketIdentityFeedSlice | null;
  sellerRepScore: number;
}): FeedRankingInput[] {
  const nowMs = params.nowMs ?? Date.now();
  const ms24 = nowMs - MS_D;
  const ms7 = nowMs - 7 * MS_D;

  const intentSaveTs: Record<string, number[]> = {};
  const watchTs: Record<string, number[]> = {};

  for (const row of params.intents) {
    const t = Date.parse(row.created_at);
    if (Number.isNaN(t)) continue;
    if (row.intent_type === 'save') {
      if (!intentSaveTs[row.flip_item_id]) intentSaveTs[row.flip_item_id] = [];
      intentSaveTs[row.flip_item_id].push(t);
    }
  }
  for (const w of params.watchAdds) {
    const t = Date.parse(w.added_at);
    if (Number.isNaN(t)) continue;
    if (!watchTs[w.flip_item_id]) watchTs[w.flip_item_id] = [];
    watchTs[w.flip_item_id].push(t);
  }

  const txAgg: Record<
    string,
    { completed: number; refunded: number; disputed: number; del: number; cancelled: number }
  > = {};

  for (const tx of params.transactions) {
    const fid = tx.flip_item_id;
    if (!fid) continue;
    if (!txAgg[fid]) txAgg[fid] = { completed: 0, refunded: 0, disputed: 0, del: 0, cancelled: 0 };
    const st = (tx.status ?? '').toLowerCase();
    if (st === 'completed') txAgg[fid].completed += 1;
    if (st === 'refunded') txAgg[fid].refunded += 1;
    if (st === 'disputed') txAgg[fid].disputed += 1;
    if (tx.delivery_confirmed) txAgg[fid].del += 1;
  }

  return params.items.map((item) => {
    const sig = params.signalsById[item.id] ?? {};
    const td = (sig.trend_direction ?? 'stable').toLowerCase();
    const trend_direction: FeedRankingInput['trend_direction'] =
      td === 'up' || td === 'down' || td === 'stable' ? td : 'stable';

    const countIntents = (type: string, since: number) =>
      params.intents.filter(
        (r) => r.flip_item_id === item.id && r.intent_type === type && Date.parse(r.created_at) >= since
      ).length;

    const watchAddsSince = (since: number) =>
      params.watchAdds.filter((w) => w.flip_item_id === item.id && Date.parse(w.added_at) >= since).length;

    const saveTs = intentSaveTs[item.id] ?? [];
    const wTs = watchTs[item.id] ?? [];
    const save24 = saveTs.filter((t) => t >= ms24).length;
    const buy24 = countIntents('buy', ms24);
    const save7 = saveTs.filter((t) => t >= ms7).length;
    const buy7 = countIntents('buy', ms7);
    const skip7 = countIntents('skip', ms7);

    const tx = txAgg[item.id] ?? { completed: 0, refunded: 0, disputed: 0, del: 0, cancelled: 0 };

    return {
      flip_item_id: item.id,
      category: item.category,
      created_at_ms: Date.parse(item.created_at) || nowMs,
      seller_user_id: item.user_id,
      trend_percent: Number(sig.trend_percent) || 0,
      trend_direction,
      velocity_label: (sig.velocity ?? 'medium').toLowerCase(),
      demand_score: Number(sig.demand_score) || 0,
      supply_score: Number(sig.supply_score) || 0,
      recommended_price: Number(sig.recommended_price) || 0,
      avg_price: Number(sig.avg_price) || 0,
      intents_save_24h: save24,
      intents_buy_24h: buy24,
      intents_save_7d: save7,
      intents_buy_7d: buy7,
      intents_skip_7d: skip7,
      watch_adds_24h: watchAddsSince(ms24),
      watch_adds_7d: watchAddsSince(ms7),
      watch_total_rows: wTs.length,
      identity: params.identity,
      rep_score: Number(params.sellerRepScore) || 0,
      tx_completed: tx.completed,
      tx_refunded: tx.refunded,
      tx_disputed: tx.disputed,
      tx_delivery_confirmed: tx.del,
      tx_cancelled_proxy: tx.cancelled,
    };
  });
}

function buildWatchEventArrays(
  itemId: string,
  intents: Array<{ flip_item_id: string; intent_type: string; created_at: string }>,
  watchAdds: Array<{ flip_item_id: string; added_at: string }>
): { saves: { t: number }[]; watches: { t: number }[] } {
  const saves: { t: number }[] = [];
  for (const r of intents) {
    if (r.flip_item_id !== itemId || r.intent_type !== 'save') continue;
    const t = Date.parse(r.created_at);
    if (!Number.isNaN(t)) saves.push({ t });
  }
  const watches: { t: number }[] = [];
  for (const w of watchAdds) {
    if (w.flip_item_id !== itemId) continue;
    const t = Date.parse(w.added_at);
    if (!Number.isNaN(t)) watches.push({ t });
  }
  return { saves, watches };
}

function scoreOne(
  mode: FeedSortMode,
  i: FeedRankingInput,
  bundle: CategoryHeatBundle | null,
  intents: Array<{ flip_item_id: string; intent_type: string; created_at: string }>,
  watchAdds: Array<{ flip_item_id: string; added_at: string }>,
  nowMs: number
): FeedRankRow {
  const { saves, watches } = buildWatchEventArrays(i.flip_item_id, intents, watchAdds);
  const watch_velocity_score = computeWatchVelocityScore(nowMs, saves, watches);
  const liquidity_score = liquidityRankScore(i);
  const trust_score = trustScore(i);
  const fulfillment_score = fulfillmentScore(i);
  const momentum_score = momentumScore(i, watch_velocity_score);
  const activity_score = activityScore(i, watch_velocity_score);
  const movers = moversScore(i, watch_velocity_score);

  const parts: ScoreParts = {
    momentum_score,
    liquidity_score,
    trust_score,
    fulfillment_score,
    watch_velocity_score,
    activity_score,
  };

  let final_feed_score = 0;
  let ranking_reason = '';

  switch (mode) {
    case 'trending': {
      const base = trendingScore(i, parts, nowMs);
      final_feed_score = base * heatBias(i, bundle);
      ranking_reason = rowReason(mode, i, parts);
      break;
    }
    case 'liquidity':
      final_feed_score = liquidity_score * 12 + Math.log1p(i.watch_adds_7d + 1) * 3;
      ranking_reason = rowReason(mode, i, parts);
      break;
    case 'momentum':
      final_feed_score = momentum_score * 1.1 + Math.abs(i.trend_percent) * 0.85;
      ranking_reason = rowReason(mode, i, parts);
      break;
    case 'movers':
      final_feed_score = movers;
      ranking_reason = rowReason(mode, i, parts);
      break;
    case 'trusted_sellers': {
      const fraudW =
        (i.identity?.fraud_risk_level ?? '').toUpperCase() === 'CRITICAL'
          ? -80
          : (i.identity?.fraud_risk_level ?? '').toUpperCase() === 'HIGH'
            ? -45
            : 0;
      final_feed_score =
        fulfillment_score * 0.42 +
        trust_score * 0.38 +
        (i.identity?.completed_transactions ?? 0) * 1.8 +
        (i.identity?.adjusted_market_rank_score ?? i.identity?.market_rank_score ?? 0) * 0.12 +
        i.rep_score * 0.04 +
        fraudW;
      ranking_reason = rowReason(mode, i, parts);
      break;
    }
    case 'fulfillment_quality':
      final_feed_score =
        fulfillment_score * 1.25 +
        i.tx_delivery_confirmed * 14 -
        i.tx_refunded * 10 -
        i.tx_disputed * 8 +
        (i.identity?.seller_fulfillment_score ?? 0) * 0.35;
      ranking_reason = rowReason(mode, i, parts);
      break;
    case 'newest':
      final_feed_score = i.created_at_ms / 1000 + i.trend_percent * 0.01;
      ranking_reason = rowReason(mode, i, parts);
      break;
    default:
      final_feed_score = 0;
      ranking_reason = 'unknown_mode';
  }

  return {
    flip_item_id: i.flip_item_id,
    final_feed_score,
    ranking_reason,
    momentum_score,
    liquidity_score,
    trust_score,
    fulfillment_score,
    watch_velocity_score,
    activity_score,
  };
}

export type RankFeedOptions = {
  intents?: Array<{ flip_item_id: string; intent_type: string; created_at: string }>;
  watchAdds?: Array<{ flip_item_id: string; added_at: string }>;
  nowMs?: number;
  useCategoryHeatBias?: boolean;
};

/**
 * Returns flip_item ids in best-first order for the given mode.
 */
export function rankFeedItems(
  mode: FeedSortMode,
  inputs: FeedRankingInput[],
  opts?: RankFeedOptions
): FeedRankRow[] {
  const nowMs = opts?.nowMs ?? Date.now();
  const intents = opts?.intents ?? [];
  const watchAdds = opts?.watchAdds ?? [];
  const bundle = opts?.useCategoryHeatBias === false ? null : buildCategoryHeat(inputs, nowMs);

  const rows = inputs.map((i) => scoreOne(mode, i, bundle, intents, watchAdds, nowMs));
  rows.sort((a, b) => {
    if (b.final_feed_score !== a.final_feed_score) return b.final_feed_score - a.final_feed_score;
    if (mode === 'newest') {
      const ia = inputs.find((x) => x.flip_item_id === a.flip_item_id);
      const ib = inputs.find((x) => x.flip_item_id === b.flip_item_id);
      return (ib?.created_at_ms ?? 0) - (ia?.created_at_ms ?? 0);
    }
    return a.flip_item_id.localeCompare(b.flip_item_id);
  });
  return rows;
}

/** Map ranked rows onto Glasscard list order (memo-friendly). */
export function orderGlasscardsByRank(cards: GlasscardData[], ranked: FeedRankRow[]): GlasscardData[] {
  const m = new Map(cards.map((c) => [c.id, c]));
  const out: GlasscardData[] = [];
  for (const r of ranked) {
    const c = m.get(r.flip_item_id);
    if (c) out.push(c);
  }
  for (const c of cards) {
    if (!out.find((x) => x.id === c.id)) out.push(c);
  }
  return out;
}

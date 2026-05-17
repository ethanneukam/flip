/**
 * Rebuilds `market_identity` from observable signals only.
 *
 * ESTIMATION (no fake orders): until checkout + shipment tracking exist,
 * `fulfilled_shipments` is proxied from **sold listings count** (commerce unit),
 * liquidity uses **sold proceeds + capped intent weights** (not dollars from fake fills),
 * and skip-heavy accounts are damped to reduce swipe-spam gaming.
 *
 * Phase 13.1: overlays `fraudIntegrityEngine` + trust-adjusted rank; persists raw
 * `market_rank_score`, `raw_market_rank_score`, adjusted score, and fraud JSON
 * without deleting raw behavioral metrics.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import {
  assignPercentiles,
  computeMarketRankScore,
  computeMarketRankIntegrityBundle,
  type MarketRankInputs,
} from '../../flip-mobile/lib/marketRankEngine';
import { computeFraudRiskScore, type FraudSignalsInput } from '../../flip-mobile/lib/fraudIntegrityEngine';
import { computeTrustAdjustedMetrics } from '../../flip-mobile/lib/trustAdjustedMetrics';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CRON_SECRET = process.env.CRON_SECRET;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  throw new Error('Missing required env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

type IntentRow = { user_id: string; intent_type: string; created_at: string };
type ListingRow = {
  user_id: string;
  status: string;
  asking_price: number | string | null;
  final_price: number | string | null;
};
type PredRow = { user_id: string; outcome: string | null; status: string };
type ActivityRow = { user_id: string; created_at: string };
type TxRow = {
  buyer_id: string | null;
  seller_id: string | null;
  flip_item_id: string | null;
  status: string | null;
  created_at: string | null;
};

function num(v: number | string | null | undefined): number {
  if (v == null) return 0;
  const n = typeof v === 'string' ? parseFloat(v) : v;
  return Number.isFinite(n) ? n : 0;
}

function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

function buildInputs(
  userId: string,
  intentsByUser: Map<string, Record<string, number>>,
  listingStats: Map<
    string,
    { listed: number; sold: number; cancelled: number; volume: number; soldProceeds: number }
  >,
  predStats: Map<string, { correct: number; incorrect: number }>,
  activeDays: Map<string, Set<string>>,
  skipDampen: number
): MarketRankInputs {
  const intents = intentsByUser.get(userId) ?? {};
  const buy = intents.buy ?? 0;
  const save = intents.save ?? 0;
  const skip = intents.skip ?? 0;
  const inspect = intents.inspect_seller ?? 0;
  const totalIntents = buy + save + skip + inspect + 1;
  const skipRatio = skip / totalIntents;

  const ls = listingStats.get(userId) ?? {
    listed: 0,
    sold: 0,
    cancelled: 0,
    volume: 0,
    soldProceeds: 0,
  };

  const completed_transactions = ls.sold;
  /**
   * PROXY: no shipment confirmations yet — treat each completed sale as one
   * fulfilled commerce unit for identity scoring (not a claim about carriers).
   */
  const fulfilled_shipments = ls.sold;
  const failed_transactions = ls.cancelled;

  const items_listed = ls.listed;
  const items_sold = ls.sold;
  const total_market_volume = ls.volume;

  /**
   * ESTIMATED liquidity signal: realized sold proceeds (when present) plus a
   * small capped contribution from buy/save intents (interest, not checkout).
   */
  let liquidity_generated =
    ls.soldProceeds * 0.55 + Math.min(220, buy * 18 + save * 6);
  if (skipRatio > 0.88) liquidity_generated *= 0.35;

  liquidity_generated *= skipDampen;

  const denom = ls.sold + ls.cancelled;
  let seller_fulfillment_score = 0;
  if (denom > 0) {
    seller_fulfillment_score = Math.round((100 * ls.sold) / denom);
  } else if (ls.listed > 0) {
    seller_fulfillment_score = 38;
  } else {
    seller_fulfillment_score = Math.min(52, Math.round(10 + buy * 1.2 + save * 0.8));
  }

  const transaction_reliability_score = Math.max(
    22,
    Math.min(100, 100 - Math.min(72, failed_transactions * 24))
  );

  const active_days = activeDays.get(userId)?.size ?? 0;

  const ps = predStats.get(userId);
  let predictions_legacy_score = 32;
  if (ps && ps.correct + ps.incorrect > 0) {
    predictions_legacy_score = Math.round(
      (100 * ps.correct) / (ps.correct + ps.incorrect)
    );
  }

  const out: MarketRankInputs = {
    completed_transactions,
    fulfilled_shipments,
    failed_transactions,
    liquidity_generated,
    total_market_volume,
    items_listed,
    items_sold,
    active_days,
    seller_fulfillment_score,
    transaction_reliability_score,
    predictions_legacy_score,
  };
  return out;
}

function intentVelocityForUser(
  userId: string,
  rows: IntentRow[],
  nowMs: number
): { last24h: number; last60m: number } {
  const MS24 = 86_400_000;
  const MS60 = 3_600_000;
  let last24h = 0;
  let last60m = 0;
  for (const r of rows) {
    if (r.user_id !== userId) continue;
    const t = new Date(r.created_at).getTime();
    if (!Number.isFinite(t)) continue;
    const delta = nowMs - t;
    if (delta <= MS24) last24h++;
    if (delta <= MS60) last60m++;
  }
  return { last24h, last60m };
}

function txSignalsForUser(userId: string, txRows: TxRow[]) {
  let buyer_completed_tx = 0;
  const pairCounts = new Map<string, number>();

  for (const t of txRows) {
    if (!t.buyer_id || !t.seller_id) continue;
    if (t.buyer_id === userId && t.status === 'completed') buyer_completed_tx++;
    if (t.buyer_id === userId || t.seller_id === userId) {
      const key = `${t.buyer_id}|${t.seller_id}|${t.flip_item_id ?? ''}`;
      pairCounts.set(key, (pairCounts.get(key) ?? 0) + 1);
    }
  }

  let max_repeat_pair_item_tx = 0;
  for (const [k, c] of pairCounts) {
    const [b, s] = k.split('|');
    if (b === userId || s === userId) max_repeat_pair_item_tx = Math.max(max_repeat_pair_item_tx, c);
  }

  const partnersWhenBuyer = new Set(
    txRows.filter((t) => t.buyer_id === userId && t.seller_id).map((t) => t.seller_id as string)
  );
  let circular_trade_pairs = 0;
  for (const p of partnersWhenBuyer) {
    const hasReverse = txRows.some((t) => t.buyer_id === p && t.seller_id === userId);
    if (hasReverse) circular_trade_pairs++;
  }

  return { buyer_completed_tx, max_repeat_pair_item_tx, circular_trade_pairs };
}

function buildFraudSignals(
  userId: string,
  intentsByUser: Map<string, Record<string, number>>,
  intentRows: IntentRow[],
  listingStats: Map<
    string,
    { listed: number; sold: number; cancelled: number; volume: number; soldProceeds: number }
  >,
  inputs: MarketRankInputs,
  flipItemsCount: number,
  txRows: TxRow[],
  nowMs: number
): FraudSignalsInput {
  const counts = intentsByUser.get(userId) ?? {};
  const vel = intentVelocityForUser(userId, intentRows, nowMs);
  const ls = listingStats.get(userId) ?? {
    listed: 0,
    sold: 0,
    cancelled: 0,
    volume: 0,
    soldProceeds: 0,
  };
  const txS = txSignalsForUser(userId, txRows);

  return {
    user_id: userId,
    intent_type_counts: { ...counts },
    intents_last_24h: vel.last24h,
    intents_last_60m: vel.last60m,
    buy_intents: counts.buy ?? 0,
    save_intents: counts.save ?? 0,
    skip_intents: counts.skip ?? 0,
    buyer_completed_tx: txS.buyer_completed_tx,
    max_repeat_pair_item_tx: txS.max_repeat_pair_item_tx,
    circular_trade_pairs: txS.circular_trade_pairs,
    liquidity_generated: inputs.liquidity_generated,
    completed_transactions: inputs.completed_transactions,
    items_listed: ls.listed,
    items_sold: ls.sold,
    cancelled_listings: ls.cancelled,
    flip_items_count: flipItemsCount,
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization;
  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { data: users, error: usersError } = await supabase.from('users').select('id');
    if (usersError || !users?.length) {
      return res.status(500).json({
        error: 'Failed to load users',
        detail: usersError?.message,
      });
    }

    const userIds = users.map((u) => u.id as string);
    const nowMs = Date.now();

    const [
      { data: intentRowsRaw, error: intentErr },
      { data: listingRows },
      { data: predRows },
      { data: flipRows },
      { data: txRowsRaw, error: txErr },
    ] = await Promise.all([
      supabase.from('market_intents').select('user_id, intent_type, created_at').limit(200_000),
      supabase.from('listings').select('user_id, status, asking_price, final_price').limit(200_000),
      supabase.from('predictions').select('user_id, outcome, status').limit(200_000),
      supabase.from('flip_items').select('user_id, created_at').limit(200_000),
      supabase.from('transactions').select('buyer_id, seller_id, flip_item_id, status, created_at').limit(200_000),
    ]);

    if (intentErr) {
      return res.status(500).json({ error: 'Failed to load intents', detail: intentErr.message });
    }
    if (txErr) {
      console.warn('recompute-market-identity: transactions query', txErr.message);
    }

    const intentRows = (intentRowsRaw ?? []) as IntentRow[];
    const txRows = (txRowsRaw ?? []) as TxRow[];

    const intentsByUser = new Map<string, Record<string, number>>();
    for (const r of intentRows) {
      if (!r.user_id) continue;
      const m = intentsByUser.get(r.user_id) ?? {};
      const k = r.intent_type ?? 'unknown';
      m[k] = (m[k] ?? 0) + 1;
      intentsByUser.set(r.user_id, m);
    }

    const flipItemsByUser = new Map<string, number>();
    for (const row of (flipRows ?? []) as ActivityRow[]) {
      flipItemsByUser.set(row.user_id, (flipItemsByUser.get(row.user_id) ?? 0) + 1);
    }

    const listingStats = new Map<
      string,
      { listed: number; sold: number; cancelled: number; volume: number; soldProceeds: number }
    >();
    for (const uid of userIds) {
      listingStats.set(uid, { listed: 0, sold: 0, cancelled: 0, volume: 0, soldProceeds: 0 });
    }
    for (const row of (listingRows ?? []) as ListingRow[]) {
      const uid = row.user_id;
      if (!listingStats.has(uid)) {
        listingStats.set(uid, { listed: 0, sold: 0, cancelled: 0, volume: 0, soldProceeds: 0 });
      }
      const s = listingStats.get(uid)!;
      s.listed += 1;
      const ask = num(row.asking_price);
      s.volume += ask;
      if (row.status === 'sold') {
        s.sold += 1;
        const fp = num(row.final_price);
        s.soldProceeds += fp > 0 ? fp : ask;
      } else if (row.status === 'cancelled') {
        s.cancelled += 1;
      }
    }

    const predStats = new Map<string, { correct: number; incorrect: number }>();
    for (const row of (predRows ?? []) as PredRow[]) {
      if (row.status !== 'resolved') continue;
      const p = predStats.get(row.user_id) ?? { correct: 0, incorrect: 0 };
      if (row.outcome === 'correct') p.correct += 1;
      else if (row.outcome === 'incorrect') p.incorrect += 1;
      predStats.set(row.user_id, p);
    }

    const activeDays = new Map<string, Set<string>>();
    const addDay = (uid: string, iso: string | null | undefined) => {
      if (!iso) return;
      const d = dayKey(iso);
      if (!activeDays.has(uid)) activeDays.set(uid, new Set());
      activeDays.get(uid)!.add(d);
    };
    for (const row of (flipRows ?? []) as ActivityRow[]) {
      addDay(row.user_id, row.created_at);
    }
    for (const row of intentRows) {
      addDay(row.user_id, row.created_at);
    }

    const inputsByUser = new Map<string, MarketRankInputs>();
    const fraudByUser = new Map<string, ReturnType<typeof computeFraudRiskScore>>();
    const adjustedScoresByUser: Record<string, number> = {};

    for (const uid of userIds) {
      const intents = intentsByUser.get(uid) ?? {};
      const skip = intents.skip ?? 0;
      const buy = intents.buy ?? 0;
      const save = intents.save ?? 0;
      const denom = skip + buy + save + 1;
      const skipDampen = skip / denom > 0.94 ? 0.45 : 1;

      const input = buildInputs(
        uid,
        intentsByUser,
        listingStats,
        predStats,
        activeDays,
        skipDampen
      );
      inputsByUser.set(uid, input);

      const fraudSignals = buildFraudSignals(
        uid,
        intentsByUser,
        intentRows,
        listingStats,
        input,
        flipItemsByUser.get(uid) ?? 0,
        txRows,
        nowMs
      );
      const fraud = computeFraudRiskScore(fraudSignals);
      fraudByUser.set(uid, fraud);

      const rawScore = computeMarketRankScore(input);
      const trust = computeTrustAdjustedMetrics(
        {
          liquidity_generated: input.liquidity_generated,
          market_rank_score: rawScore,
          seller_fulfillment_score: input.seller_fulfillment_score,
          transaction_reliability_score: input.transaction_reliability_score,
        },
        fraud
      );
      adjustedScoresByUser[uid] = trust.adjusted_market_rank;
    }

    const percentiles = assignPercentiles(adjustedScoresByUser);
    const now = new Date().toISOString();

    const rows = userIds.map((uid) => {
      const input = inputsByUser.get(uid)!;
      const fraud = fraudByUser.get(uid)!;
      const pct = percentiles[uid] ?? 0;
      const bundle = computeMarketRankIntegrityBundle(input, pct, fraud);

      return {
        user_id: uid,
        completed_transactions: input.completed_transactions,
        fulfilled_shipments: input.fulfilled_shipments,
        failed_transactions: input.failed_transactions,
        liquidity_generated: input.liquidity_generated,
        total_market_volume: input.total_market_volume,
        items_listed: input.items_listed,
        items_sold: input.items_sold,
        active_days: input.active_days,
        seller_fulfillment_score: input.seller_fulfillment_score,
        transaction_reliability_score: input.transaction_reliability_score,
        market_rank_score: bundle.raw_market_rank_score,
        raw_market_rank_score: bundle.raw_market_rank_score,
        adjusted_market_rank_score: bundle.adjusted_market_rank_score,
        fraud_risk_score: bundle.fraud.fraud_risk_score,
        fraud_risk_level: bundle.fraud.risk_level,
        fraud_flags: bundle.fraud.flags,
        market_percentile: pct,
        updated_at: now,
      };
    });

    const chunk = 40;
    for (let i = 0; i < rows.length; i += chunk) {
      const slice = rows.slice(i, i + chunk);
      const { error: upErr } = await supabase.from('market_identity').upsert(slice, {
        onConflict: 'user_id',
      });
      if (upErr) {
        return res.status(500).json({ error: 'Upsert failed', detail: upErr.message });
      }
    }

    return res.status(200).json({
      success: true,
      processed: rows.length,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error';
    console.error('recompute-market-identity', err);
    return res.status(500).json({ error: message });
  }
}

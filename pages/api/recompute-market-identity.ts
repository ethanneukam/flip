/**
 * Rebuilds `market_identity` from observable signals only.
 *
 * ESTIMATION (no fake orders): until checkout + shipment tracking exist,
 * `fulfilled_shipments` is proxied from **sold listings count** (commerce unit),
 * liquidity uses **sold proceeds + capped intent weights** (not dollars from fake fills),
 * and skip-heavy accounts are damped to reduce swipe-spam gaming.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import {
  assignPercentiles,
  computeMarketRankScore,
  type MarketRankInputs,
} from '../../flip-mobile/lib/marketRankEngine';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CRON_SECRET = process.env.CRON_SECRET;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  throw new Error('Missing required env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

type IntentRow = { user_id: string; intent_type: string };
type ListingRow = {
  user_id: string;
  status: string;
  asking_price: number | string | null;
  final_price: number | string | null;
};
type PredRow = { user_id: string; outcome: string | null; status: string };
type ActivityRow = { user_id: string; created_at: string };

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

    const [{ data: intentRows }, { data: listingRows }, { data: predRows }, { data: flipRows }, { data: intentDates }] =
      await Promise.all([
        supabase.from('market_intents').select('user_id, intent_type').limit(200_000),
        supabase.from('listings').select('user_id, status, asking_price, final_price').limit(200_000),
        supabase.from('predictions').select('user_id, outcome, status').limit(200_000),
        supabase.from('flip_items').select('user_id, created_at').limit(200_000),
        supabase.from('market_intents').select('user_id, created_at').limit(200_000),
      ]);

    const intentsByUser = new Map<string, Record<string, number>>();
    for (const r of (intentRows ?? []) as IntentRow[]) {
      if (!r.user_id) continue;
      const m = intentsByUser.get(r.user_id) ?? {};
      const k = r.intent_type ?? 'unknown';
      m[k] = (m[k] ?? 0) + 1;
      intentsByUser.set(r.user_id, m);
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
    for (const row of (intentDates ?? []) as ActivityRow[]) {
      addDay(row.user_id, row.created_at);
    }

    const inputsByUser = new Map<string, MarketRankInputs>();
    const scoresByUser: Record<string, number> = {};

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
      scoresByUser[uid] = computeMarketRankScore(input);
    }

    const percentiles = assignPercentiles(scoresByUser);
    const now = new Date().toISOString();
    const rows = userIds.map((uid) => {
      const input = inputsByUser.get(uid)!;
      const pct = percentiles[uid] ?? 0;
      const market_rank_score = computeMarketRankScore(input);
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
        market_rank_score,
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

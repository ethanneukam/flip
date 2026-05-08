import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const API_SECRET = process.env.API_SECRET;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  throw new Error('Missing required env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const CONDITION_MULTIPLIERS: Record<string, number> = {
  mint: 1.10,
  excellent: 1.00,
  good: 0.85,
  fair: 0.65,
  poor: 0.45,
};

type SignalResult = {
  avgPrice: number;
  lowPrice: number;
  highPrice: number;
  demandScore: number;
  supplyScore: number;
  trendDirection: 'up' | 'down' | 'stable';
  trendPercent: number;
  dataSources: string[];
  lowConfidence: boolean;
  confidenceReason: 'sufficient_history' | 'category_baseline' | 'ai_estimate_only';
  dataPointsUsed: number;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization;
  if (!API_SECRET || authHeader !== `Bearer ${API_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { flipItemId } = req.body;
  if (!flipItemId) {
    return res.status(400).json({ error: 'Missing flipItemId' });
  }

  try {
    const { data: item, error: itemError } = await supabase
      .from('flip_items')
      .select('id, category, subcategory, brand, model, condition, ai_confidence')
      .eq('id', flipItemId)
      .single();

    if (itemError || !item) {
      return res.status(404).json({ error: 'FlipItem not found', detail: itemError?.message });
    }

    const signal = await resolveSignal(item);

    const liquidityScore = Math.round((signal.demandScore * 0.6) + ((100 - signal.supplyScore) * 0.4));
    const trendScore = signal.trendDirection === 'up' ? 80 : signal.trendDirection === 'down' ? 20 : 50;
    const flipScore = Math.round((signal.demandScore * 0.4) + (liquidityScore * 0.3) + (trendScore * 0.3));

    const conditionMultiplier = CONDITION_MULTIPLIERS[item.condition] ?? 1.0;
    const recommendedPrice = Math.round(signal.avgPrice * conditionMultiplier * 100) / 100;

    const velocity = computeVelocity(signal.demandScore, signal.supplyScore);

    const { error: writeError } = await supabase
      .from('market_signals')
      .upsert({
        flip_item_id: flipItemId,
        avg_price: signal.avgPrice,
        low_price: signal.lowPrice,
        high_price: signal.highPrice,
        recommended_price: recommendedPrice,
        demand_score: signal.demandScore,
        supply_score: signal.supplyScore,
        flip_score: flipScore,
        velocity,
        trend_direction: signal.trendDirection,
        trend_percent: signal.trendPercent,
        data_sources: signal.dataSources,
        low_confidence: signal.lowConfidence,
        confidence_reason: signal.confidenceReason,
        data_points_used: signal.dataPointsUsed,
        computed_at: new Date().toISOString(),
        generated_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      }, { onConflict: 'flip_item_id' });

    if (writeError) {
      return res.status(500).json({ error: 'Failed to write market_signal', detail: writeError.message });
    }

    await supabase
      .from('signal_retry_queue')
      .delete()
      .eq('flip_item_id', flipItemId);

    return res.status(200).json({ success: true, flipItemId, flipScore, lowConfidence: signal.lowConfidence });

  } catch (err: any) {
    console.error('compute-market-signal error:', err);
    return res.status(500).json({ error: 'Internal error', detail: err.message });
  }
}

async function resolveSignal(item: {
  category: string;
  subcategory?: string;
  brand?: string;
  model?: string;
  ai_confidence: number;
}): Promise<SignalResult> {

  // Tier 1: Full match (category + subcategory + brand + model), >= 10 data points
  if (item.brand && item.model) {
    const { data: logs } = await supabase
      .from('price_logs')
      .select('price, source, recorded_at')
      .eq('category', item.category)
      .eq('subcategory', item.subcategory ?? '')
      .eq('brand', item.brand)
      .eq('model', item.model)
      .order('recorded_at', { ascending: false })
      .limit(100);

    if (logs && logs.length >= 10) {
      return computeFromLogs(logs, false, 'sufficient_history');
    }
  }

  // Tier 2: Category + subcategory match (relax brand/model), >= 5 data points
  if (item.subcategory) {
    const { data: logs } = await supabase
      .from('price_logs')
      .select('price, source, recorded_at')
      .eq('category', item.category)
      .eq('subcategory', item.subcategory)
      .order('recorded_at', { ascending: false })
      .limit(100);

    if (logs && logs.length >= 5) {
      return computeFromLogs(logs, true, 'category_baseline');
    }
  }

  // Tier 3: flip_price category baseline
  const { data: baseline } = await supabase
    .from('flip_price')
    .select('avg_price, low_price, high_price')
    .eq('category', item.category)
    .single();

  if (baseline) {
    return {
      avgPrice: Number(baseline.avg_price),
      lowPrice: Number(baseline.low_price),
      highPrice: Number(baseline.high_price),
      demandScore: 50,
      supplyScore: 50,
      trendDirection: 'stable',
      trendPercent: 0,
      dataSources: ['flip_price'],
      lowConfidence: true,
      confidenceReason: 'category_baseline',
      dataPointsUsed: 1,
    };
  }

  // Tier 4: AI estimate only (no market data available)
  const estimatedPrice = item.ai_confidence > 70 ? 50 : 25;
  return {
    avgPrice: estimatedPrice,
    lowPrice: estimatedPrice * 0.7,
    highPrice: estimatedPrice * 1.3,
    demandScore: 50,
    supplyScore: 50,
    trendDirection: 'stable',
    trendPercent: 0,
    dataSources: ['ai_estimate'],
    lowConfidence: true,
    confidenceReason: 'ai_estimate_only',
    dataPointsUsed: 0,
  };
}

function computeFromLogs(
  logs: { price: number; source: string; recorded_at: string }[],
  lowConfidence: boolean,
  confidenceReason: 'sufficient_history' | 'category_baseline'
): SignalResult {
  const prices = logs.map(l => Number(l.price));
  const sources = Array.from(new Set(logs.map(l => l.source)));

  const avgPrice = Math.round((prices.reduce((a, b) => a + b, 0) / prices.length) * 100) / 100;
  const lowPrice = Math.min(...prices);
  const highPrice = Math.max(...prices);

  // Demand score: higher when prices are trending up and spread is narrow
  const recentPrices = prices.slice(0, Math.min(10, prices.length));
  const olderPrices = prices.slice(Math.min(10, prices.length));
  const recentAvg = recentPrices.reduce((a, b) => a + b, 0) / recentPrices.length;
  const olderAvg = olderPrices.length > 0
    ? olderPrices.reduce((a, b) => a + b, 0) / olderPrices.length
    : recentAvg;

  const priceMovement = olderAvg > 0 ? (recentAvg - olderAvg) / olderAvg : 0;

  // Trend calculation (30-day equivalent based on available data)
  let trendDirection: 'up' | 'down' | 'stable' = 'stable';
  let trendPercent = Math.round(priceMovement * 100 * 100) / 100;
  if (priceMovement > 0.03) trendDirection = 'up';
  else if (priceMovement < -0.03) trendDirection = 'down';

  // Demand score: normalized 0-100 based on price trend + volume
  const demandScore = Math.max(0, Math.min(100, Math.round(50 + (priceMovement * 200))));

  // Supply score: inverse of price spread (narrow spread = high supply saturation)
  const spreadRatio = avgPrice > 0 ? (highPrice - lowPrice) / avgPrice : 0.5;
  const supplyScore = Math.max(0, Math.min(100, Math.round(spreadRatio * 100)));

  return {
    avgPrice,
    lowPrice,
    highPrice,
    demandScore,
    supplyScore,
    trendDirection,
    trendPercent,
    dataSources: sources,
    lowConfidence,
    confidenceReason,
    dataPointsUsed: logs.length,
  };
}

function computeVelocity(demandScore: number, supplyScore: number): 'fast' | 'medium' | 'slow' | 'stagnant' {
  const activity = (demandScore + (100 - supplyScore)) / 2;
  if (activity >= 75) return 'fast';
  if (activity >= 50) return 'medium';
  if (activity >= 25) return 'slow';
  return 'stagnant';
}

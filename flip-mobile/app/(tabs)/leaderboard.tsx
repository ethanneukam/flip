import React, { useState, useCallback, useRef, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { computeRank } from '../../services/rankEngine';
import { computeMarketTier, marketIdentityRowToInputs } from '../../lib/marketRankEngine';
import type { MarketIdentityRow, MarketTier } from '../../types/models';

type LeaderboardEntry = {
  id: string;
  username: string | null;
  display_name: string | null;
  rep_score: number;
  total_flips: number;
  created_at: string;
  market_identity?: MarketIdentityRow | MarketIdentityRow[] | null;
};

const MARKET_TIER_COLOR: Record<MarketTier, string> = {
  'Liquidity Leader': '#00FF87',
  'Market Maker': '#44AAFF',
  'Verified Seller': '#C9A227',
  Trader: '#9A9A9A',
  Observer: '#4A4A4A',
};

function normalizeIdentity(
  raw: MarketIdentityRow | MarketIdentityRow[] | null | undefined
): MarketIdentityRow | null {
  if (raw == null) return null;
  if (Array.isArray(raw)) return raw[0] ?? null;
  return raw;
}

function sortKey(entry: LeaderboardEntry): number {
  const mi = normalizeIdentity(entry.market_identity);
  if (mi) {
    const adj = mi.adjusted_market_rank_score;
    if (typeof adj === 'number' && Number.isFinite(adj)) return adj;
    return Number(mi.market_rank_score) || 0;
  }
  return Number(entry.rep_score) || 0;
}

export default function LeaderboardScreen() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useFocusEffect(
    useCallback(() => {
      mountedRef.current = true;
      loadLeaderboard();
      return () => {
        mountedRef.current = false;
      };
    }, [])
  );

  const loadLeaderboard = async () => {
    try {
      setError(null);
      const { data: { user } } = await supabase.auth.getUser();
      if (user && mountedRef.current) setCurrentUserId(user.id);

      const { data, error: fetchError } = await supabase
        .from('users')
        .select(
          'id, username, display_name, rep_score, total_flips, created_at, market_identity(*)'
        )
        .limit(200);

      if (fetchError) {
        throw new Error(fetchError.message);
      }

      const raw = (data ?? []) as LeaderboardEntry[];
      const sorted = [...raw].sort((a, b) => {
        const sb = sortKey(b);
        const sa = sortKey(a);
        if (sb !== sa) return sb - sa;
        const rb = Number(b.rep_score) || 0;
        const ra = Number(a.rep_score) || 0;
        if (rb !== ra) return rb - ra;
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });

      if (mountedRef.current) {
        setEntries(sorted.slice(0, 100));
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to load leaderboard');
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadLeaderboard();
  };

  const getCurrentUserPosition = (): number | null => {
    if (!currentUserId) return null;
    const index = entries.findIndex((e) => e.id === currentUserId);
    return index >= 0 ? index + 1 : null;
  };

  const userPosition = getCurrentUserPosition();

  const userEntry = useMemo(
    () => entries.find((e) => e.id === currentUserId),
    [entries, currentUserId]
  );

  const userMarketLine = useMemo(() => {
    if (!userEntry) return null;
    const mi = normalizeIdentity(userEntry.market_identity);
    if (mi) {
      const inputs = marketIdentityRowToInputs({
        ...mi,
        predictions_legacy_score: 0,
      });
      const tier = computeMarketTier(
        (() => {
          const adj = mi.adjusted_market_rank_score;
          if (typeof adj === 'number' && Number.isFinite(adj)) return adj;
          return Number(mi.market_rank_score) || 0;
        })(),
        Number(mi.market_percentile) || 0,
        inputs
      );
      return { tier, mi };
    }
    return { tier: 'Observer' as MarketTier, mi: null };
  }, [userEntry]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color="#00FF87" size="large" />
        <Text style={styles.loadingText}>LOADING_RANKINGS...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#00FF87"
            colors={['#00FF87']}
          />
        }
      >
        <Text style={styles.headerLabel}>MARKET_LIQUIDITY_RANKINGS</Text>

        {userPosition !== null && (
          <View style={styles.positionBadge}>
            <Text style={styles.positionText}>
              YOUR RANK: #{userPosition} of {entries.length}
            </Text>
            {userMarketLine && userMarketLine.mi && (
              <Text style={styles.percentileText}>
                {userMarketLine.tier} · cohort {Math.round(Number(userMarketLine.mi.market_percentile || 0))}
                /100
              </Text>
            )}
            {userMarketLine && !userMarketLine.mi && (
              <Text style={styles.percentileText}>Market identity pending · sorted by legacy rep</Text>
            )}
          </View>
        )}

        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>⚠ {error}</Text>
            <TouchableOpacity onPress={loadLeaderboard}>
              <Text style={styles.retryText}>[ RETRY ]</Text>
            </TouchableOpacity>
          </View>
        )}

        {entries.length === 0 && !error ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>▲</Text>
            <Text style={styles.emptyTitle}>NO_RANKINGS_YET</Text>
            <Text style={styles.emptyText}>
              No rankings yet — start scanning to earn your first rank
            </Text>
          </View>
        ) : (
          entries.map((entry, index) => {
            const repScore = Number(entry.rep_score) || 0;
            const legacyRank = computeRank(repScore);
            const isCurrentUser = entry.id === currentUserId;
            const displayName = entry.username || entry.display_name || 'Anonymous';
            const mi = normalizeIdentity(entry.market_identity);
            const inputs = mi
              ? marketIdentityRowToInputs({ ...mi, predictions_legacy_score: 0 })
              : marketIdentityRowToInputs({
                  completed_transactions: 0,
                  fulfilled_shipments: 0,
                  failed_transactions: 0,
                  liquidity_generated: 0,
                  total_market_volume: 0,
                  items_listed: 0,
                  items_sold: 0,
                  active_days: 0,
                  seller_fulfillment_score: 0,
                  transaction_reliability_score: 0,
                  predictions_legacy_score: 0,
                });
            const mScore = mi
              ? (() => {
                  const adj = mi.adjusted_market_rank_score;
                  if (typeof adj === 'number' && Number.isFinite(adj)) return adj;
                  return Number(mi.market_rank_score) || 0;
                })()
              : 0;
            const mPct = mi ? Number(mi.market_percentile) || 0 : 0;
            const marketTier = computeMarketTier(mScore, mPct, inputs);
            const tierColor = MARKET_TIER_COLOR[marketTier];

            return (
              <View
                key={entry.id}
                style={[styles.entryCard, isCurrentUser && styles.entryCardHighlight]}
              >
                <View style={styles.entryPosition}>
                  <Text
                    style={[
                      styles.entryPositionNum,
                      index < 3 && { color: '#00FF87', fontWeight: 'bold' },
                    ]}
                  >
                    #{index + 1}
                  </Text>
                </View>

                <View style={styles.entryInfo}>
                  <Text
                    style={[styles.entryUsername, isCurrentUser && { color: '#00FF87' }]}
                    numberOfLines={1}
                  >
                    {displayName}
                  </Text>
                  <View style={styles.entryTierRow}>
                    <View style={[styles.tierDot, { backgroundColor: tierColor }]} />
                    <Text style={[styles.entryTier, { color: tierColor }]}>{marketTier}</Text>
                  </View>
                  <Text style={styles.subMetrics} numberOfLines={2}>
                    Pctl {Math.round(mPct)} · Fulfilled {mi?.fulfilled_shipments ?? 0} · Liq{' '}
                    {mi ? Math.round(Number(mi.liquidity_generated)) : 0}
                  </Text>
                  <Text style={styles.legacyRepMuted}>
                    Legacy rep {repScore.toFixed(1)} · {legacyRank}
                  </Text>
                </View>

                <View style={styles.entryStats}>
                  <Text style={styles.entryScore}>{Math.round(mScore || repScore)}</Text>
                  <Text style={styles.entryFlips}>
                    {mi ? 'MKT' : 'REP'} · {entry.total_flips} preds
                  </Text>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#080808' },
  content: { paddingTop: 56, paddingHorizontal: 20, paddingBottom: 120 },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#080808',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: { color: '#888888', fontFamily: 'monospace', fontSize: 12, marginTop: 12 },
  headerLabel: {
    color: '#888888',
    fontFamily: 'monospace',
    fontSize: 10,
    letterSpacing: 3,
    marginBottom: 16,
  },
  positionBadge: {
    backgroundColor: '#0a1218',
    borderWidth: 1,
    borderColor: '#2A4A5A',
    borderRadius: 4,
    padding: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  positionText: {
    color: '#44AAFF',
    fontFamily: 'monospace',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  percentileText: { color: '#888888', fontFamily: 'monospace', fontSize: 9, marginTop: 4 },
  errorBanner: {
    backgroundColor: 'rgba(255,68,68,0.1)',
    borderWidth: 1,
    borderColor: '#FF4444',
    borderRadius: 4,
    padding: 14,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  errorText: { color: '#FF4444', fontFamily: 'monospace', fontSize: 10, flex: 1 },
  retryText: { color: '#FFFFFF', fontFamily: 'monospace', fontSize: 10, fontWeight: 'bold' },
  emptyState: {
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 4,
    padding: 32,
    alignItems: 'center',
    marginTop: 20,
  },
  emptyIcon: { color: '#888888', fontSize: 32, marginBottom: 12 },
  emptyTitle: {
    color: '#AAAAAA',
    fontFamily: 'monospace',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 2,
    marginBottom: 8,
  },
  emptyText: { color: '#888888', fontFamily: 'monospace', fontSize: 11, textAlign: 'center', lineHeight: 18 },
  entryCard: {
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#252525',
    borderRadius: 4,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  entryCardHighlight: { borderColor: '#00FF87', backgroundColor: '#0a1410' },
  entryPosition: { width: 36, alignItems: 'center' },
  entryPositionNum: { color: '#888888', fontFamily: 'monospace', fontSize: 12 },
  entryInfo: { flex: 1, marginLeft: 10 },
  entryUsername: { color: '#FFFFFF', fontFamily: 'monospace', fontSize: 13, fontWeight: 'bold' },
  entryTierRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  tierDot: { width: 6, height: 6, borderRadius: 3 },
  entryTier: { fontFamily: 'monospace', fontSize: 10, fontWeight: 'bold' },
  subMetrics: {
    color: '#777777',
    fontFamily: 'monospace',
    fontSize: 9,
    marginTop: 6,
    letterSpacing: 0.5,
  },
  legacyRepMuted: {
    color: '#444444',
    fontFamily: 'monospace',
    fontSize: 8,
    marginTop: 4,
  },
  entryStats: { alignItems: 'flex-end', paddingLeft: 6 },
  entryScore: { color: '#FFFFFF', fontFamily: 'monospace', fontSize: 15, fontWeight: 'bold' },
  entryFlips: { color: '#666666', fontFamily: 'monospace', fontSize: 8, marginTop: 2 },
});

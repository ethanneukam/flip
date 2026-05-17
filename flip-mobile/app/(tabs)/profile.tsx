import React, { useState, useCallback, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { computeRank, rankProgressPercent, nextTierName, pointsToNextTier } from '../../services/rankEngine';
import {
  computeMarketTier,
  computeReliabilityScore,
  marketIdentityRowToInputs,
} from '../../lib/marketRankEngine';
import { useStreak } from '../../hooks/useStreak';
import StreakCard from '../../components/StreakCard';
import type { MarketIdentityRow, MarketTier, RankTier } from '../../types/models';

type UserProfile = {
  id: string;
  email: string;
  username: string | null;
  display_name: string | null;
  rep_score: number;
  total_flips: number;
  is_pro: boolean;
  daily_scan_count: number;
  scan_limit: number;
  avatar_url: string | null;
};

type PredictionStats = {
  total: number;
  correct: number;
  incorrect: number;
  pending: number;
};

const RANK_COLORS: Record<RankTier, string> = {
  Oracle: '#00FF87',
  Forecaster: '#00AAFF',
  Analyst: '#FFAA00',
  Rookie: '#888888',
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

export default function ProfileScreen() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [marketIdentity, setMarketIdentity] = useState<MarketIdentityRow | null>(null);
  const [predictionStats, setPredictionStats] = useState<PredictionStats>({
    total: 0,
    correct: 0,
    incorrect: 0,
    pending: 0,
  });
  const [watchlistCount, setWatchlistCount] = useState(0);
  const [portfolioCount, setPortfolioCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const { streak } = useStreak();

  useFocusEffect(
    useCallback(() => {
      mountedRef.current = true;
      loadProfile();
      return () => {
        mountedRef.current = false;
      };
    }, [])
  );

  const loadProfile = async () => {
    try {
      setError(null);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        if (mountedRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
        return;
      }

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select(
          'id, email, username, display_name, rep_score, total_flips, is_pro, daily_scan_count, scan_limit, avatar_url, market_identity(*)'
        )
        .eq('id', user.id)
        .single();

      if (userError) throw new Error(userError.message);

      const [predictionsRes, watchlistRes, portfolioRes] = await Promise.all([
        supabase.from('predictions').select('outcome, status').eq('user_id', user.id),
        supabase.from('watchlist_items').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('portfolio_entries').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      ]);

      if (mountedRef.current) {
        setProfile(userData as UserProfile);
        setMarketIdentity(normalizeIdentity((userData as { market_identity?: unknown }).market_identity as never));

        const predictions = predictionsRes.data ?? [];
        setPredictionStats({
          total: predictions.length,
          correct: predictions.filter((p) => p.outcome === 'correct').length,
          incorrect: predictions.filter((p) => p.outcome === 'incorrect').length,
          pending: predictions.filter((p) => p.status === 'pending').length,
        });

        setWatchlistCount(watchlistRes.count ?? 0);
        setPortfolioCount(portfolioRes.count ?? 0);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to load profile');
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
    loadProfile();
  };

  const handleSignOut = () => {
    Alert.alert('TERMINATE_SESSION', 'Are you sure you want to sign out?', [
      { text: 'CANCEL', style: 'cancel' },
      {
        text: 'SIGN_OUT',
        style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut();
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color="#00FF87" size="large" />
        <Text style={styles.loadingText}>LOADING_PROFILE...</Text>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorTextCenter}>PROFILE_NOT_FOUND</Text>
        <TouchableOpacity onPress={loadProfile} style={{ marginTop: 12 }}>
          <Text style={styles.retryText}>[ RETRY ]</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const repScore = Number(profile.rep_score) || 0;
  const legacyRank = computeRank(repScore);
  const progress = rankProgressPercent(repScore);
  const nextRank = nextTierName(repScore);
  const pointsNeeded = pointsToNextTier(repScore);
  const rankColor = RANK_COLORS[legacyRank];
  const resolved = predictionStats.correct + predictionStats.incorrect;
  const accuracy =
    resolved > 0 ? Math.round((predictionStats.correct / resolved) * 100) : 0;

  const legacyPredictionInput = marketIdentityRowToInputs({
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
    predictions_legacy_score: accuracy,
  });

  const mi = marketIdentity;
  const rankInputs = mi
    ? marketIdentityRowToInputs({
        ...mi,
        predictions_legacy_score: accuracy,
      })
    : legacyPredictionInput;

  const storedRankScore = mi ? Number(mi.market_rank_score) : 0;
  const storedPercentile = mi ? Number(mi.market_percentile) : 0;
  const displayRankScore = mi ? storedRankScore : 0;
  const displayPercentile = mi ? storedPercentile : 0;
  const marketTier = computeMarketTier(displayRankScore, displayPercentile, rankInputs);
  const tierColor = MARKET_TIER_COLOR[marketTier];
  const reliabilityPct = computeReliabilityScore(rankInputs);
  const fulfillmentDisplay = mi ? Number(mi.seller_fulfillment_score) : 0;

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
        <Text style={styles.headerLabel}>MARKET_IDENTITY_TERMINAL</Text>

        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>⚠ {error}</Text>
          </View>
        )}

        {/* Section 1 — Market identity header */}
        <View style={styles.marketHeader}>
          <View style={styles.headerRow}>
            {profile.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarGlyph}>◇</Text>
              </View>
            )}
            <View style={styles.headerTextCol}>
              <Text style={styles.username}>
                {profile.username ?? profile.email?.split('@')[0] ?? 'Operator'}
              </Text>
              {profile.display_name && (
                <Text style={styles.displayName}>{profile.display_name}</Text>
              )}
              {profile.is_pro && (
                <View style={styles.proBadge}>
                  <Text style={styles.proBadgeText}>FLIP PRO</Text>
                </View>
              )}
            </View>
          </View>

          <View style={[styles.tierBadge, { borderColor: tierColor }]}>
            <Text style={[styles.tierTitle, { color: tierColor }]}>{marketTier.toUpperCase()}</Text>
          </View>
          <Text style={styles.percentileLine}>
            {!mi
              ? 'Run market identity recompute (cron) to populate cohort scores.'
              : displayPercentile >= 75
                ? `Top ${Math.max(1, Math.round(100 - displayPercentile))}% of market participants`
                : `Cohort percentile (0–100, higher is stronger): ${Math.round(displayPercentile)}`}
          </Text>
          <Text style={styles.scoreLine}>Market score: {Math.round(displayRankScore)}</Text>
        </View>

        {/* Section 2 — Reliability */}
        <View style={styles.panel}>
          <Text style={styles.sectionLabel}>RELIABILITY</Text>
          <View style={styles.metricGrid}>
            <View style={styles.metricCell}>
              <Text style={styles.metricValue}>{fulfillmentDisplay.toFixed(0)}</Text>
              <Text style={styles.metricKey}>FULFILLMENT SCORE</Text>
            </View>
            <View style={styles.metricCell}>
              <Text style={styles.metricValue}>{mi?.completed_transactions ?? 0}</Text>
              <Text style={styles.metricKey}>COMPLETED TX</Text>
            </View>
            <View style={styles.metricCell}>
              <Text style={[styles.metricValue, { color: '#FF6666' }]}>{mi?.failed_transactions ?? 0}</Text>
              <Text style={styles.metricKey}>FAILED TX</Text>
            </View>
            <View style={styles.metricCell}>
              <Text style={styles.metricValue}>{reliabilityPct.toFixed(1)}%</Text>
              <Text style={styles.metricKey}>RELIABILITY</Text>
            </View>
          </View>
        </View>

        {/* Section 3 — Liquidity */}
        <View style={styles.panel}>
          <Text style={styles.sectionLabel}>LIQUIDITY</Text>
          <View style={styles.metricGrid}>
            <View style={styles.metricCell}>
              <Text style={styles.metricValue}>{(mi?.liquidity_generated ?? 0).toFixed(0)}</Text>
              <Text style={styles.metricKey}>LIQUIDITY INDEX</Text>
            </View>
            <View style={styles.metricCell}>
              <Text style={styles.metricValue}>{(mi?.total_market_volume ?? 0).toFixed(0)}</Text>
              <Text style={styles.metricKey}>LISTING VOLUME</Text>
            </View>
            <View style={styles.metricCell}>
              <Text style={styles.metricValue}>{mi?.items_sold ?? 0}</Text>
              <Text style={styles.metricKey}>ITEMS SOLD</Text>
            </View>
            <View style={styles.metricCell}>
              <Text style={styles.metricValue}>{mi?.active_days ?? 0}</Text>
              <Text style={styles.metricKey}>ACTIVE MARKET DAYS</Text>
            </View>
          </View>
          <Text style={styles.footnote}>
            Liquidity index blends listing outcomes and intent signals until checkout data is live.
          </Text>
        </View>

        {/* Activity strip */}
        <View style={styles.activityRow}>
          <View style={styles.activityItem}>
            <Text style={styles.activityValue}>{portfolioCount}</Text>
            <Text style={styles.activityLabel}>PORTFOLIO</Text>
          </View>
          <View style={styles.activityDivider} />
          <View style={styles.activityItem}>
            <Text style={styles.activityValue}>{watchlistCount}</Text>
            <Text style={styles.activityLabel}>WATCHING</Text>
          </View>
          <View style={styles.activityDivider} />
          <View style={styles.activityItem}>
            <Text style={styles.activityValue}>{predictionStats.pending}</Text>
            <Text style={styles.activityLabel}>PENDING</Text>
          </View>
        </View>

        <StreakCard
          currentStreak={streak.currentStreak}
          longestStreak={streak.longestStreak}
          todayCompleted={streak.todayCompleted}
        />

        <View style={styles.scanLimitSection}>
          <Text style={styles.sectionLabel}>DAILY_SCANS</Text>
          <View style={styles.scanLimitRow}>
            <Text style={styles.scanLimitValue}>
              {profile.daily_scan_count} / {profile.is_pro ? '∞' : profile.scan_limit}
            </Text>
            <Text style={styles.scanLimitLabel}>
              {profile.is_pro ? 'UNLIMITED' : 'SCANS_REMAINING'}
            </Text>
          </View>
          {!profile.is_pro && (
            <View style={styles.scanProgressBar}>
              <View
                style={[
                  styles.scanProgressFill,
                  {
                    width: `${Math.min((profile.daily_scan_count / profile.scan_limit) * 100, 100)}%`,
                  },
                ]}
              />
            </View>
          )}
        </View>

        {/* Section 4 — Legacy prediction reputation */}
        <View style={styles.legacyPanel}>
          <Text style={styles.legacyTitle}>LEGACY PREDICTION REPUTATION</Text>
          <Text style={styles.legacyHint}>
            Prediction accuracy remains on file; market identity is now the primary trust surface.
          </Text>
          <View style={styles.rankRow}>
            <View style={[styles.rankBadge, { borderColor: rankColor }]}>
              <Text style={[styles.rankTierText, { color: rankColor }]}>{legacyRank}</Text>
            </View>
            <View style={styles.rankDetails}>
              <Text style={styles.repScoreValue}>{repScore.toFixed(1)}</Text>
              <Text style={styles.repScoreLabel}>REP SCORE</Text>
            </View>
          </View>
          <View style={styles.progressSection}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: rankColor }]} />
            </View>
            {nextRank && (
              <Text style={styles.progressLabel}>
                {pointsNeeded.toFixed(1)} points to {nextRank}
              </Text>
            )}
            {!nextRank && (
              <Text style={[styles.progressLabel, { color: '#00FF87' }]}>MAX RANK ACHIEVED</Text>
            )}
          </View>
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{predictionStats.total}</Text>
              <Text style={styles.statLabel}>TOTAL</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statValue, { color: '#00FF87' }]}>{predictionStats.correct}</Text>
              <Text style={styles.statLabel}>CORRECT</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statValue, { color: '#FF4444' }]}>{predictionStats.incorrect}</Text>
              <Text style={styles.statLabel}>INCORRECT</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{accuracy}%</Text>
              <Text style={styles.statLabel}>ACCURACY</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutText}>[ TERMINATE_SESSION ]</Text>
        </TouchableOpacity>
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
  errorTextCenter: { color: '#FF4444', fontFamily: 'monospace', fontSize: 14 },
  retryText: { color: '#FFFFFF', fontFamily: 'monospace', fontSize: 11, fontWeight: 'bold' },
  headerLabel: {
    color: '#888888',
    fontFamily: 'monospace',
    fontSize: 10,
    letterSpacing: 4,
    marginBottom: 20,
  },
  errorBanner: {
    backgroundColor: 'rgba(255,68,68,0.1)',
    borderWidth: 1,
    borderColor: '#FF4444',
    borderRadius: 4,
    padding: 12,
    marginBottom: 16,
  },
  errorText: { color: '#FF4444', fontFamily: 'monospace', fontSize: 10 },
  marketHeader: {
    backgroundColor: '#0C0C0C',
    borderWidth: 1,
    borderColor: '#242424',
    borderRadius: 6,
    padding: 18,
    marginBottom: 14,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  avatar: { width: 56, height: 56, borderRadius: 6, borderWidth: 1, borderColor: '#333333' },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#333333',
    backgroundColor: '#141414',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarGlyph: { color: '#555555', fontSize: 22 },
  headerTextCol: { flex: 1, marginLeft: 14 },
  username: { color: '#FFFFFF', fontFamily: 'monospace', fontSize: 20, fontWeight: 'bold' },
  displayName: { color: '#888888', fontFamily: 'monospace', fontSize: 12, marginTop: 4 },
  proBadge: {
    backgroundColor: '#00FF87',
    borderRadius: 2,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 10,
    alignSelf: 'flex-start',
  },
  proBadgeText: {
    color: '#080808',
    fontFamily: 'monospace',
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  tierBadge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
  },
  tierTitle: { fontFamily: 'monospace', fontSize: 13, fontWeight: 'bold', letterSpacing: 2 },
  percentileLine: { color: '#AAAAAA', fontFamily: 'monospace', fontSize: 11, marginBottom: 6 },
  scoreLine: { color: '#FFFFFF', fontFamily: 'monospace', fontSize: 15, fontWeight: 'bold' },
  panel: {
    backgroundColor: '#101010',
    borderWidth: 1,
    borderColor: '#222222',
    borderRadius: 6,
    padding: 16,
    marginBottom: 12,
  },
  sectionLabel: {
    color: '#666666',
    fontFamily: 'monospace',
    fontSize: 9,
    letterSpacing: 3,
    marginBottom: 12,
  },
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metricCell: {
    width: '47%',
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#252525',
    borderRadius: 4,
    padding: 12,
  },
  metricValue: { color: '#FFFFFF', fontFamily: 'monospace', fontSize: 17, fontWeight: 'bold' },
  metricKey: {
    color: '#666666',
    fontFamily: 'monospace',
    fontSize: 8,
    letterSpacing: 1,
    marginTop: 6,
  },
  footnote: {
    color: '#555555',
    fontFamily: 'monospace',
    fontSize: 9,
    marginTop: 12,
    lineHeight: 14,
  },
  activityRow: {
    flexDirection: 'row',
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 4,
    padding: 16,
    marginBottom: 14,
    alignItems: 'center',
  },
  activityItem: { flex: 1, alignItems: 'center' },
  activityValue: { color: '#FFFFFF', fontFamily: 'monospace', fontSize: 16, fontWeight: 'bold' },
  activityLabel: {
    color: '#888888',
    fontFamily: 'monospace',
    fontSize: 8,
    letterSpacing: 1,
    marginTop: 4,
  },
  activityDivider: { width: 1, height: 24, backgroundColor: '#2A2A2A' },
  scanLimitSection: {
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 4,
    padding: 16,
    marginBottom: 16,
  },
  scanLimitRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  scanLimitValue: { color: '#FFFFFF', fontFamily: 'monospace', fontSize: 20, fontWeight: 'bold' },
  scanLimitLabel: { color: '#888888', fontFamily: 'monospace', fontSize: 9, letterSpacing: 1 },
  scanProgressBar: {
    height: 4,
    backgroundColor: '#2A2A2A',
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 12,
  },
  scanProgressFill: { height: '100%', backgroundColor: '#00FF87', borderRadius: 2 },
  legacyPanel: {
    backgroundColor: '#0A0A0A',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 6,
    padding: 16,
    marginBottom: 20,
  },
  legacyTitle: {
    color: '#666666',
    fontFamily: 'monospace',
    fontSize: 10,
    letterSpacing: 3,
    marginBottom: 8,
  },
  legacyHint: {
    color: '#555555',
    fontFamily: 'monospace',
    fontSize: 9,
    marginBottom: 14,
    lineHeight: 14,
  },
  rankRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 12 },
  rankBadge: { borderWidth: 2, borderRadius: 4, paddingHorizontal: 12, paddingVertical: 6 },
  rankTierText: { fontFamily: 'monospace', fontSize: 15, fontWeight: 'bold' },
  rankDetails: { flex: 1 },
  repScoreValue: { color: '#FFFFFF', fontFamily: 'monospace', fontSize: 22, fontWeight: 'bold' },
  repScoreLabel: { color: '#888888', fontFamily: 'monospace', fontSize: 9, marginTop: 2, letterSpacing: 2 },
  progressSection: { marginTop: 4 },
  progressBar: { height: 4, backgroundColor: '#2A2A2A', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },
  progressLabel: { color: '#888888', fontFamily: 'monospace', fontSize: 10, marginTop: 8 },
  statsGrid: { flexDirection: 'row', gap: 8, marginTop: 14 },
  statBox: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 4,
    padding: 10,
    alignItems: 'center',
  },
  statValue: { color: '#FFFFFF', fontFamily: 'monospace', fontSize: 16, fontWeight: 'bold' },
  statLabel: {
    color: '#888888',
    fontFamily: 'monospace',
    fontSize: 8,
    letterSpacing: 1,
    marginTop: 4,
  },
  signOutButton: {
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#FF4444',
    borderRadius: 2,
    padding: 14,
    alignItems: 'center',
  },
  signOutText: { color: '#FF4444', fontFamily: 'monospace', fontSize: 11, fontWeight: 'bold', letterSpacing: 1 },
});

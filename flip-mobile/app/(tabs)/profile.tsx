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
import { useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { computeRank, rankProgressPercent, nextTierName, pointsToNextTier } from '../../services/rankEngine';
import type { RankTier } from '../../types/models';

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

export default function ProfileScreen() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [predictionStats, setPredictionStats] = useState<PredictionStats>({ total: 0, correct: 0, incorrect: 0, pending: 0 });
  const [watchlistCount, setWatchlistCount] = useState(0);
  const [portfolioCount, setPortfolioCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useFocusEffect(
    useCallback(() => {
      mountedRef.current = true;
      loadProfile();
      return () => { mountedRef.current = false; };
    }, [])
  );

  const loadProfile = async () => {
    try {
      setError(null);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        if (mountedRef.current) { setLoading(false); setRefreshing(false); }
        return;
      }

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, email, username, display_name, rep_score, total_flips, is_pro, daily_scan_count, scan_limit')
        .eq('id', user.id)
        .single();

      if (userError) throw new Error(userError.message);

      const [predictionsRes, watchlistRes, portfolioRes] = await Promise.all([
        supabase
          .from('predictions')
          .select('outcome, status')
          .eq('user_id', user.id),
        supabase
          .from('watchlist_items')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id),
        supabase
          .from('portfolio_entries')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id),
      ]);

      if (mountedRef.current) {
        setProfile(userData);

        const predictions = predictionsRes.data ?? [];
        setPredictionStats({
          total: predictions.length,
          correct: predictions.filter(p => p.outcome === 'correct').length,
          incorrect: predictions.filter(p => p.outcome === 'incorrect').length,
          pending: predictions.filter(p => p.status === 'pending').length,
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
    Alert.alert(
      'TERMINATE_SESSION',
      'Are you sure you want to sign out?',
      [
        { text: 'CANCEL', style: 'cancel' },
        {
          text: 'SIGN_OUT',
          style: 'destructive',
          onPress: async () => {
            await supabase.auth.signOut();
          },
        },
      ]
    );
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
  const rank = computeRank(repScore);
  const progress = rankProgressPercent(repScore);
  const nextRank = nextTierName(repScore);
  const pointsNeeded = pointsToNextTier(repScore);
  const rankColor = RANK_COLORS[rank];
  const accuracy = predictionStats.total > 0
    ? Math.round((predictionStats.correct / (predictionStats.correct + predictionStats.incorrect || 1)) * 100)
    : 0;

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
        <Text style={styles.headerLabel}>OPERATOR_PROFILE</Text>

        {/* Error */}
        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>⚠ {error}</Text>
          </View>
        )}

        {/* Identity */}
        <View style={styles.identitySection}>
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

        {/* Rank Section */}
        <View style={styles.rankSection}>
          <Text style={styles.sectionLabel}>PREDICTION_ACCURACY</Text>
          <View style={styles.rankRow}>
            <View style={[styles.rankBadge, { borderColor: rankColor }]}>
              <Text style={[styles.rankTierText, { color: rankColor }]}>{rank}</Text>
            </View>
            <View style={styles.rankDetails}>
              <Text style={styles.repScoreValue}>{repScore.toFixed(1)}</Text>
              <Text style={styles.repScoreLabel}>REP SCORE</Text>
            </View>
          </View>

          {/* Progress bar */}
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
              <Text style={[styles.progressLabel, { color: '#00FF87' }]}>
                MAX RANK ACHIEVED
              </Text>
            )}
          </View>
        </View>

        {/* Stats Grid */}
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

        {/* Activity Counts */}
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

        {/* Scan Limit */}
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
              <View style={[
                styles.scanProgressFill,
                { width: `${Math.min((profile.daily_scan_count / profile.scan_limit) * 100, 100)}%` },
              ]} />
            </View>
          )}
        </View>

        {/* Sign Out */}
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutText}>[ TERMINATE_SESSION ]</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#080808' },
  content: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 120 },
  loadingContainer: { flex: 1, backgroundColor: '#080808', justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#888888', fontFamily: 'monospace', fontSize: 12, marginTop: 12 },
  errorTextCenter: { color: '#FF4444', fontFamily: 'monospace', fontSize: 14 },
  retryText: { color: '#FFFFFF', fontFamily: 'monospace', fontSize: 11, fontWeight: 'bold' },
  headerLabel: { color: '#888888', fontFamily: 'monospace', fontSize: 10, letterSpacing: 4, marginBottom: 24 },
  errorBanner: { backgroundColor: 'rgba(255,68,68,0.1)', borderWidth: 1, borderColor: '#FF4444', borderRadius: 4, padding: 12, marginBottom: 16 },
  errorText: { color: '#FF4444', fontFamily: 'monospace', fontSize: 10 },
  identitySection: { marginBottom: 24 },
  username: { color: '#FFFFFF', fontFamily: 'monospace', fontSize: 22, fontWeight: 'bold' },
  displayName: { color: '#AAAAAA', fontFamily: 'monospace', fontSize: 13, marginTop: 4 },
  proBadge: { backgroundColor: '#00FF87', borderRadius: 2, paddingHorizontal: 8, paddingVertical: 3, marginTop: 10, alignSelf: 'flex-start' },
  proBadgeText: { color: '#080808', fontFamily: 'monospace', fontSize: 9, fontWeight: 'bold', letterSpacing: 2 },
  rankSection: { backgroundColor: '#111111', borderWidth: 1, borderColor: '#2A2A2A', borderRadius: 4, padding: 20, marginBottom: 16 },
  sectionLabel: { color: '#888888', fontFamily: 'monospace', fontSize: 9, letterSpacing: 3, marginBottom: 12 },
  rankRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  rankBadge: { borderWidth: 2, borderRadius: 4, paddingHorizontal: 12, paddingVertical: 6 },
  rankTierText: { fontFamily: 'monospace', fontSize: 16, fontWeight: 'bold' },
  rankDetails: { flex: 1 },
  repScoreValue: { color: '#FFFFFF', fontFamily: 'monospace', fontSize: 24, fontWeight: 'bold' },
  repScoreLabel: { color: '#888888', fontFamily: 'monospace', fontSize: 9, marginTop: 2, letterSpacing: 2 },
  progressSection: { marginTop: 16 },
  progressBar: { height: 4, backgroundColor: '#2A2A2A', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },
  progressLabel: { color: '#888888', fontFamily: 'monospace', fontSize: 10, marginTop: 8 },
  statsGrid: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  statBox: { flex: 1, backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#2A2A2A', borderRadius: 4, padding: 12, alignItems: 'center' },
  statValue: { color: '#FFFFFF', fontFamily: 'monospace', fontSize: 18, fontWeight: 'bold' },
  statLabel: { color: '#888888', fontFamily: 'monospace', fontSize: 8, letterSpacing: 1, marginTop: 4 },
  activityRow: { flexDirection: 'row', backgroundColor: '#111111', borderWidth: 1, borderColor: '#2A2A2A', borderRadius: 4, padding: 16, marginBottom: 16, alignItems: 'center' },
  activityItem: { flex: 1, alignItems: 'center' },
  activityValue: { color: '#FFFFFF', fontFamily: 'monospace', fontSize: 16, fontWeight: 'bold' },
  activityLabel: { color: '#888888', fontFamily: 'monospace', fontSize: 8, letterSpacing: 1, marginTop: 4 },
  activityDivider: { width: 1, height: 24, backgroundColor: '#2A2A2A' },
  scanLimitSection: { backgroundColor: '#111111', borderWidth: 1, borderColor: '#2A2A2A', borderRadius: 4, padding: 16, marginBottom: 24 },
  scanLimitRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  scanLimitValue: { color: '#FFFFFF', fontFamily: 'monospace', fontSize: 20, fontWeight: 'bold' },
  scanLimitLabel: { color: '#888888', fontFamily: 'monospace', fontSize: 9, letterSpacing: 1 },
  scanProgressBar: { height: 4, backgroundColor: '#2A2A2A', borderRadius: 2, overflow: 'hidden', marginTop: 12 },
  scanProgressFill: { height: '100%', backgroundColor: '#00FF87', borderRadius: 2 },
  signOutButton: { backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#FF4444', borderRadius: 2, padding: 14, alignItems: 'center' },
  signOutText: { color: '#FF4444', fontFamily: 'monospace', fontSize: 11, fontWeight: 'bold', letterSpacing: 1 },
});

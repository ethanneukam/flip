import React, { useState, useCallback, useRef } from 'react';
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
import type { RankTier } from '../../types/models';

type LeaderboardEntry = {
  id: string;
  username: string | null;
  display_name: string | null;
  rep_score: number;
  total_flips: number;
  created_at: string;
};

const RANK_COLORS: Record<RankTier, string> = {
  Oracle: '#00FF87',
  Forecaster: '#00AAFF',
  Analyst: '#FFAA00',
  Rookie: '#888888',
};

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
      return () => { mountedRef.current = false; };
    }, [])
  );

  const loadLeaderboard = async () => {
    try {
      setError(null);
      const { data: { user } } = await supabase.auth.getUser();
      if (user && mountedRef.current) setCurrentUserId(user.id);

      const { data, error: fetchError } = await supabase
        .from('users')
        .select('id, username, display_name, rep_score, total_flips, created_at')
        .order('rep_score', { ascending: false })
        .order('total_flips', { ascending: false })
        .order('created_at', { ascending: true })
        .limit(100);

      if (fetchError) {
        throw new Error(fetchError.message);
      }

      if (mountedRef.current) {
        setEntries(data ?? []);
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
    const index = entries.findIndex(e => e.id === currentUserId);
    return index >= 0 ? index + 1 : null;
  };

  const userPosition = getCurrentUserPosition();

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
        <Text style={styles.headerLabel}>MARKET_PREDICTION_RANKING</Text>

        {/* Current User Position */}
        {userPosition !== null && (
          <View style={styles.positionBadge}>
            <Text style={styles.positionText}>
              YOUR RANK: #{userPosition} of {entries.length}
            </Text>
          </View>
        )}

        {/* Error State */}
        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>⚠ {error}</Text>
            <TouchableOpacity onPress={loadLeaderboard}>
              <Text style={styles.retryText}>[ RETRY ]</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Empty State */}
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
            const rank = computeRank(repScore);
            const isCurrentUser = entry.id === currentUserId;
            const rankColor = RANK_COLORS[rank];
            const displayName = entry.username || entry.display_name || 'Anonymous';

            return (
              <View
                key={entry.id}
                style={[styles.entryCard, isCurrentUser && styles.entryCardHighlight]}
              >
                {/* Position */}
                <View style={styles.entryPosition}>
                  <Text style={[
                    styles.entryPositionNum,
                    index < 3 && { color: '#00FF87', fontWeight: 'bold' },
                  ]}>
                    #{index + 1}
                  </Text>
                </View>

                {/* User Info */}
                <View style={styles.entryInfo}>
                  <Text
                    style={[styles.entryUsername, isCurrentUser && { color: '#00FF87' }]}
                    numberOfLines={1}
                  >
                    {displayName}
                  </Text>
                  <View style={styles.entryTierRow}>
                    <View style={[styles.tierDot, { backgroundColor: rankColor }]} />
                    <Text style={[styles.entryTier, { color: rankColor }]}>{rank}</Text>
                  </View>
                </View>

                {/* Stats */}
                <View style={styles.entryStats}>
                  <Text style={styles.entryScore}>{repScore.toFixed(1)}</Text>
                  <Text style={styles.entryFlips}>
                    {entry.total_flips} {entry.total_flips === 1 ? 'pred' : 'preds'}
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
  content: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 120 },
  loadingContainer: { flex: 1, backgroundColor: '#080808', justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#888888', fontFamily: 'monospace', fontSize: 12, marginTop: 12 },
  headerLabel: { color: '#888888', fontFamily: 'monospace', fontSize: 10, letterSpacing: 3, marginBottom: 16 },
  positionBadge: { backgroundColor: '#0a1a0f', borderWidth: 1, borderColor: '#00FF87', borderRadius: 4, padding: 12, marginBottom: 16, alignItems: 'center' },
  positionText: { color: '#00FF87', fontFamily: 'monospace', fontSize: 11, fontWeight: 'bold', letterSpacing: 1 },
  errorBanner: { backgroundColor: 'rgba(255,68,68,0.1)', borderWidth: 1, borderColor: '#FF4444', borderRadius: 4, padding: 14, marginBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  errorText: { color: '#FF4444', fontFamily: 'monospace', fontSize: 10, flex: 1 },
  retryText: { color: '#FFFFFF', fontFamily: 'monospace', fontSize: 10, fontWeight: 'bold' },
  emptyState: { backgroundColor: '#111111', borderWidth: 1, borderColor: '#2A2A2A', borderRadius: 4, padding: 32, alignItems: 'center', marginTop: 20 },
  emptyIcon: { color: '#888888', fontSize: 32, marginBottom: 12 },
  emptyTitle: { color: '#AAAAAA', fontFamily: 'monospace', fontSize: 12, fontWeight: 'bold', letterSpacing: 2, marginBottom: 8 },
  emptyText: { color: '#888888', fontFamily: 'monospace', fontSize: 11, textAlign: 'center', lineHeight: 18 },
  entryCard: { backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#2A2A2A', borderRadius: 4, padding: 14, marginBottom: 8, flexDirection: 'row', alignItems: 'center' },
  entryCardHighlight: { borderColor: '#00FF87', backgroundColor: '#0a1a0f' },
  entryPosition: { width: 36, alignItems: 'center' },
  entryPositionNum: { color: '#888888', fontFamily: 'monospace', fontSize: 12 },
  entryInfo: { flex: 1, marginLeft: 12 },
  entryUsername: { color: '#FFFFFF', fontFamily: 'monospace', fontSize: 13, fontWeight: 'bold' },
  entryTierRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
  tierDot: { width: 6, height: 6, borderRadius: 3 },
  entryTier: { fontFamily: 'monospace', fontSize: 10 },
  entryStats: { alignItems: 'flex-end' },
  entryScore: { color: '#FFFFFF', fontFamily: 'monospace', fontSize: 16, fontWeight: 'bold' },
  entryFlips: { color: '#888888', fontFamily: 'monospace', fontSize: 9, marginTop: 2 },
});

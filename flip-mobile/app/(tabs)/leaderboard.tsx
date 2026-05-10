import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, ActivityIndicator } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { computeRank } from '../../services/rankEngine';

type LeaderboardEntry = {
  id: string;
  username: string;
  rep_score: number;
  total_flips: number;
};

export default function LeaderboardScreen() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const loadLeaderboard = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);

      const { data } = await supabase
        .from('users')
        .select('id, username, rep_score, total_flips')
        .order('rep_score', { ascending: false })
        .limit(50);

      if (data) setEntries(data);
    } catch (err) {
      console.error('Leaderboard load error:', err);
    }
    setLoading(false);
  };

  useFocusEffect(
    useCallback(() => {
      loadLeaderboard();
    }, [])
  );

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.headerLabel}>MARKET_PREDICTION_RANKING</Text>

        {loading ? (
          <ActivityIndicator color="#00FF87" style={{ marginTop: 40 }} />
        ) : entries.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              No rankings yet — start scanning to earn your first rank
            </Text>
          </View>
        ) : (
          entries.map((entry, index) => {
            const rank = computeRank(Number(entry.rep_score));
            const isCurrentUser = entry.id === currentUserId;
            return (
              <View
                key={entry.id}
                style={[styles.entryCard, isCurrentUser && styles.entryCardHighlight]}
              >
                <View style={styles.entryRank}>
                  <Text style={styles.entryRankNum}>#{index + 1}</Text>
                </View>
                <View style={styles.entryInfo}>
                  <Text style={[styles.entryUsername, isCurrentUser && { color: '#00FF87' }]}>
                    {entry.username ?? 'Anonymous'}
                  </Text>
                  <Text style={styles.entryTier}>{rank}</Text>
                </View>
                <View style={styles.entryStats}>
                  <Text style={styles.entryScore}>{Number(entry.rep_score).toFixed(1)}</Text>
                  <Text style={styles.entryFlips}>{entry.total_flips} predictions</Text>
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
  headerLabel: { color: '#888888', fontFamily: 'monospace', fontSize: 10, letterSpacing: 3, marginBottom: 24 },
  emptyState: { backgroundColor: '#111111', borderWidth: 1, borderColor: '#2A2A2A', borderRadius: 4, padding: 24, alignItems: 'center', marginTop: 20 },
  emptyText: { color: '#888888', fontFamily: 'monospace', fontSize: 12, textAlign: 'center', lineHeight: 18 },
  entryCard: { backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#2A2A2A', borderRadius: 4, padding: 14, marginBottom: 8, flexDirection: 'row', alignItems: 'center' },
  entryCardHighlight: { borderColor: '#00FF87', backgroundColor: '#0a1a0f' },
  entryRank: { width: 36, alignItems: 'center' },
  entryRankNum: { color: '#888888', fontFamily: 'monospace', fontSize: 12, fontWeight: 'bold' },
  entryInfo: { flex: 1, marginLeft: 12 },
  entryUsername: { color: '#FFFFFF', fontFamily: 'monospace', fontSize: 13, fontWeight: 'bold' },
  entryTier: { color: '#AAAAAA', fontFamily: 'monospace', fontSize: 10, marginTop: 2 },
  entryStats: { alignItems: 'flex-end' },
  entryScore: { color: '#FFFFFF', fontFamily: 'monospace', fontSize: 16, fontWeight: 'bold' },
  entryFlips: { color: '#888888', fontFamily: 'monospace', fontSize: 9, marginTop: 2 },
});

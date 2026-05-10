import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { computeRank, rankProgressPercent, nextTierName, pointsToNextTier } from '../../services/rankEngine';

type UserProfile = {
  id: string;
  email: string;
  username: string;
  display_name: string | null;
  rep_score: number;
  total_flips: number;
  is_pro: boolean;
  daily_scan_count: number;
  scan_limit: number;
};

export default function ProfileScreen() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from('users')
        .select('id, email, username, display_name, rep_score, total_flips, is_pro, daily_scan_count, scan_limit')
        .eq('id', user.id)
        .single();

      if (data) setProfile(data);
    } catch (err) {
      console.error('Profile load error:', err);
    }
    setLoading(false);
  };

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [])
  );

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color="#00FF87" size="large" />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>PROFILE_NOT_FOUND</Text>
      </View>
    );
  }

  const rank = computeRank(Number(profile.rep_score));
  const progress = rankProgressPercent(Number(profile.rep_score));
  const nextRank = nextTierName(Number(profile.rep_score));
  const pointsNeeded = pointsToNextTier(Number(profile.rep_score));

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.headerLabel}>OPERATOR_PROFILE</Text>

        {/* Identity */}
        <View style={styles.section}>
          <Text style={styles.username}>{profile.username ?? profile.email}</Text>
          {profile.display_name && (
            <Text style={styles.displayName}>{profile.display_name}</Text>
          )}
          {profile.is_pro && (
            <View style={styles.proBadge}>
              <Text style={styles.proBadgeText}>FLIP PRO</Text>
            </View>
          )}
        </View>

        {/* Rank */}
        <View style={styles.rankSection}>
          <Text style={styles.sectionLabel}>PREDICTION_ACCURACY</Text>
          <Text style={styles.rankTier}>{rank}</Text>
          <Text style={styles.repScore}>{Number(profile.rep_score).toFixed(1)} REP</Text>

          {/* Progress bar */}
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          {nextRank && (
            <Text style={styles.progressLabel}>
              {pointsNeeded} points to {nextRank}
            </Text>
          )}
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{profile.total_flips}</Text>
            <Text style={styles.statLabel}>PREDICTIONS</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>
              {profile.daily_scan_count}/{profile.is_pro ? '∞' : profile.scan_limit}
            </Text>
            <Text style={styles.statLabel}>SCANS_TODAY</Text>
          </View>
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
  errorText: { color: '#FF4444', fontFamily: 'monospace', fontSize: 14 },
  headerLabel: { color: '#888888', fontFamily: 'monospace', fontSize: 10, letterSpacing: 4, marginBottom: 24 },
  section: { marginBottom: 28 },
  username: { color: '#FFFFFF', fontFamily: 'monospace', fontSize: 20, fontWeight: 'bold' },
  displayName: { color: '#AAAAAA', fontFamily: 'monospace', fontSize: 13, marginTop: 4 },
  proBadge: { backgroundColor: '#00FF87', borderRadius: 2, paddingHorizontal: 8, paddingVertical: 3, marginTop: 8, alignSelf: 'flex-start' },
  proBadgeText: { color: '#080808', fontFamily: 'monospace', fontSize: 9, fontWeight: 'bold', letterSpacing: 2 },
  rankSection: { backgroundColor: '#111111', borderWidth: 1, borderColor: '#2A2A2A', borderRadius: 4, padding: 20, marginBottom: 20 },
  sectionLabel: { color: '#888888', fontFamily: 'monospace', fontSize: 9, letterSpacing: 3, marginBottom: 12 },
  rankTier: { color: '#00FF87', fontFamily: 'monospace', fontSize: 24, fontWeight: 'bold' },
  repScore: { color: '#AAAAAA', fontFamily: 'monospace', fontSize: 13, marginTop: 4 },
  progressBar: { height: 4, backgroundColor: '#2A2A2A', borderRadius: 2, marginTop: 16, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#00FF87', borderRadius: 2 },
  progressLabel: { color: '#888888', fontFamily: 'monospace', fontSize: 10, marginTop: 8 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 32 },
  statBox: { flex: 1, backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#2A2A2A', borderRadius: 4, padding: 16, alignItems: 'center' },
  statValue: { color: '#FFFFFF', fontFamily: 'monospace', fontSize: 20, fontWeight: 'bold' },
  statLabel: { color: '#888888', fontFamily: 'monospace', fontSize: 9, letterSpacing: 1, marginTop: 4 },
  signOutButton: { backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#FF4444', borderRadius: 2, padding: 14, alignItems: 'center', marginTop: 20 },
  signOutText: { color: '#FF4444', fontFamily: 'monospace', fontSize: 11, fontWeight: 'bold', letterSpacing: 1 },
});

import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import type { GlasscardSellerData } from '../../types/models';
import {
  sellerTrustTier,
  predictionAccuracy,
  predictionAccuracyColor,
  sellerInitials,
} from './utils';

type Props = {
  seller: GlasscardSellerData;
  compact?: boolean;
};

export default function GlasscardSeller({ seller, compact }: Props) {
  const tier = sellerTrustTier(seller.rep_score);
  const accuracy = predictionAccuracy(seller.total_predictions, seller.correct_predictions);
  const accuracyColor = predictionAccuracyColor(seller.total_predictions, seller.correct_predictions);
  const initials = sellerInitials(seller.username);

  if (compact) {
    return (
      <View style={styles.compactRow}>
        {seller.avatar_url ? (
          <Image source={{ uri: seller.avatar_url }} style={styles.avatarCompact} />
        ) : (
          <View style={[styles.avatarCompact, styles.avatarFallback]}>
            <Text style={styles.initialsCompact}>{initials}</Text>
          </View>
        )}
        <Text style={styles.usernameCompact}>{seller.username}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {/* Avatar */}
        {seller.avatar_url ? (
          <Image source={{ uri: seller.avatar_url }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Text style={styles.initials}>{initials}</Text>
          </View>
        )}

        {/* Info */}
        <View style={styles.info}>
          <Text style={styles.username}>{seller.username}</Text>
          <Text style={styles.tier}>{tier}</Text>
        </View>

        {/* Stats */}
        <View style={styles.stats}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{seller.rep_score.toLocaleString()}</Text>
            <Text style={styles.statLabel}>REP</Text>
          </View>
        </View>
      </View>

      {/* Bottom stats row */}
      <View style={styles.bottomRow}>
        <View style={styles.bottomStat}>
          <Text style={[styles.bottomStatValue, { color: accuracyColor }]}>
            {accuracy}
          </Text>
          <Text style={styles.bottomStatLabel}>ACCURACY</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.bottomStat}>
          <Text style={styles.bottomStatValue}>{seller.scan_count}</Text>
          <Text style={styles.bottomStatLabel}>SCANS</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  avatarFallback: {
    backgroundColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  initials: { color: '#9CA3AF', fontSize: 16, fontWeight: 'bold' },
  info: { flex: 1 },
  username: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold' },
  tier: { color: '#6C63FF', fontSize: 11, marginTop: 2 },
  stats: { alignItems: 'flex-end' },
  statItem: { alignItems: 'center' },
  statValue: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  statLabel: { color: '#4B5563', fontSize: 8, letterSpacing: 1, marginTop: 2 },
  bottomRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    paddingTop: 12,
  },
  bottomStat: { flex: 1, alignItems: 'center' },
  bottomStatValue: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold' },
  bottomStatLabel: { color: '#4B5563', fontSize: 8, letterSpacing: 1, marginTop: 2 },
  divider: { width: 1, backgroundColor: 'rgba(255,255,255,0.06)' },
  compactRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  avatarCompact: { width: 20, height: 20, borderRadius: 10 },
  initialsCompact: { color: '#9CA3AF', fontSize: 8, fontWeight: 'bold' },
  usernameCompact: { color: '#9CA3AF', fontSize: 11 },
});

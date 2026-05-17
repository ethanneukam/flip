import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

export type BannerType =
  | 'prediction_resolved'
  | 'item_moved'
  | 'rank_climbed'
  | 'highest_mover'
  | 'biggest_drop'
  | 'low_confidence'
  | 'next_rank'
  | 'accuracy_trend';

type Props = {
  type: BannerType;
  data: Record<string, unknown>;
  onPress?: () => void;
};

const BANNER_CONFIG: Record<BannerType, {
  icon: string;
  color: string;
  buildMessage: (data: Record<string, unknown>) => string;
}> = {
  prediction_resolved: {
    icon: '◎',
    color: '#00FF87',
    buildMessage: (d) => `Your ${d.itemTitle} prediction resolved: ${d.outcome === 'correct' ? '+' : ''}${d.delta} rep`,
  },
  item_moved: {
    icon: '↕',
    color: '#00AAFF',
    buildMessage: (d) => `${d.itemTitle} moved ${Number(d.percent) >= 0 ? '+' : ''}${d.percent}% since last scan`,
  },
  rank_climbed: {
    icon: '▲',
    color: '#00FF87',
    buildMessage: (d) => `You climbed to #${d.position} on the leaderboard`,
  },
  highest_mover: {
    icon: '🔥',
    color: '#00FF87',
    buildMessage: (d) => `Top mover: ${d.itemTitle} (+${d.percent}%)`,
  },
  biggest_drop: {
    icon: '↓',
    color: '#FF4444',
    buildMessage: (d) => `Alert: ${d.itemTitle} dropped ${d.percent}%`,
  },
  low_confidence: {
    icon: '⚠',
    color: '#FFAA00',
    buildMessage: (d) => `${d.count} item${Number(d.count) !== 1 ? 's' : ''} with low confidence signals`,
  },
  next_rank: {
    icon: '◈',
    color: '#00AAFF',
    buildMessage: (d) => `${d.points} points to ${d.nextRank}`,
  },
  accuracy_trend: {
    icon: '📈',
    color: '#00FF87',
    buildMessage: (d) => `Prediction accuracy: ${d.accuracy}% (${d.direction})`,
  },
};

export default function ReengagementBanner({ type, data, onPress }: Props) {
  const config = BANNER_CONFIG[type];
  if (!config) return null;

  const message = config.buildMessage(data);

  return (
    <TouchableOpacity
      style={[styles.container, { borderLeftColor: config.color }]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
    >
      <Text style={[styles.icon, { color: config.color }]}>{config.icon}</Text>
      <Text style={styles.message} numberOfLines={2}>{message}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderLeftWidth: 3,
    borderRadius: 4,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  icon: {
    fontSize: 16,
  },
  message: {
    color: '#FFFFFF',
    fontFamily: 'monospace',
    fontSize: 11,
    flex: 1,
    lineHeight: 16,
  },
});

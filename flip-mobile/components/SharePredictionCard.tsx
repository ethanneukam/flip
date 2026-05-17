import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Share } from 'react-native';
import * as Haptics from 'expo-haptics';

type Props = {
  username: string;
  itemTitle: string;
  predictionType: string;
  outcome?: 'correct' | 'incorrect' | 'inconclusive';
  entryPrice: number;
  resolvedPrice?: number;
  rank: string;
};

export default function SharePredictionCard({
  username,
  itemTitle,
  predictionType,
  outcome,
  entryPrice,
  resolvedPrice,
  rank,
}: Props) {
  const movementPercent = resolvedPrice && entryPrice > 0
    ? (((resolvedPrice - entryPrice) / entryPrice) * 100).toFixed(1)
    : null;

  const handleShare = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const outcomeText = outcome === 'correct' ? '✓ Correct'
      : outcome === 'incorrect' ? '✗ Incorrect'
      : 'Pending';

    const message = [
      `FLIP | ${username} [${rank}]`,
      ``,
      `${predictionType.replace('_', ' ').toUpperCase()} on ${itemTitle}`,
      `Entry: $${entryPrice.toFixed(2)}`,
      resolvedPrice ? `Resolved: $${resolvedPrice.toFixed(2)} (${Number(movementPercent) >= 0 ? '+' : ''}${movementPercent}%)` : '',
      outcome ? `Result: ${outcomeText}` : '',
      ``,
      `Track your market predictions on Flip.`,
    ].filter(Boolean).join('\n');

    try {
      await Share.share({ message });
    } catch {}
  };

  return (
    <TouchableOpacity style={styles.container} onPress={handleShare} activeOpacity={0.8}>
      <View style={styles.header}>
        <Text style={styles.brand}>FLIP</Text>
        <Text style={styles.shareHint}>TAP TO SHARE</Text>
      </View>
      <Text style={styles.prediction}>
        {predictionType.replace('_', ' ').toUpperCase()}
      </Text>
      <Text style={styles.item} numberOfLines={1}>{itemTitle}</Text>
      <View style={styles.priceRow}>
        <Text style={styles.price}>${entryPrice.toFixed(2)}</Text>
        {resolvedPrice && (
          <>
            <Text style={styles.arrow}>→</Text>
            <Text style={[styles.price, {
              color: Number(movementPercent) >= 0 ? '#00FF87' : '#FF4444'
            }]}>
              ${resolvedPrice.toFixed(2)}
            </Text>
          </>
        )}
      </View>
      {outcome && (
        <View style={[styles.outcomeBadge, {
          borderColor: outcome === 'correct' ? '#00FF87' : outcome === 'incorrect' ? '#FF4444' : '#888888'
        }]}>
          <Text style={[styles.outcomeText, {
            color: outcome === 'correct' ? '#00FF87' : outcome === 'incorrect' ? '#FF4444' : '#888888'
          }]}>
            {outcome === 'correct' ? '✓ CORRECT' : outcome === 'incorrect' ? '✗ MISSED' : '⏳ PENDING'}
          </Text>
        </View>
      )}
      <Text style={styles.footer}>{username} · {rank}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: '#00FF87',
    borderRadius: 4,
    padding: 16,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  brand: {
    color: '#00FF87',
    fontFamily: 'monospace',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 3,
  },
  shareHint: {
    color: '#888888',
    fontFamily: 'monospace',
    fontSize: 8,
    letterSpacing: 1,
  },
  prediction: {
    color: '#FFFFFF',
    fontFamily: 'monospace',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 4,
  },
  item: {
    color: '#AAAAAA',
    fontFamily: 'monospace',
    fontSize: 11,
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  price: {
    color: '#FFFFFF',
    fontFamily: 'monospace',
    fontSize: 16,
    fontWeight: 'bold',
  },
  arrow: {
    color: '#888888',
    fontFamily: 'monospace',
    fontSize: 14,
  },
  outcomeBadge: {
    borderWidth: 1,
    borderRadius: 2,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  outcomeText: {
    fontFamily: 'monospace',
    fontSize: 10,
    fontWeight: 'bold',
  },
  footer: {
    color: '#888888',
    fontFamily: 'monospace',
    fontSize: 9,
    letterSpacing: 1,
  },
});

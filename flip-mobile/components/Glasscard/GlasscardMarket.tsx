import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { GlasscardMarketData } from '../../types/models';
import { formatUSD } from './utils';

type Props = {
  market: GlasscardMarketData | null;
  isLoading?: boolean;
  compact?: boolean;
};

function SkeletonBar({ width: w }: { width: number }) {
  return <View style={[styles.skeleton, { width: w }]} />;
}

export default function GlasscardMarket({ market, isLoading, compact }: Props) {
  if (!market || isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Market data loading...</Text>
        <View style={styles.skeletonRow}>
          <SkeletonBar width={100} />
          <SkeletonBar width={80} />
        </View>
        <SkeletonBar width={200} />
      </View>
    );
  }

  const avg = market.avg_price;
  const rp = market.recommended_price;
  const low = market.low_price;
  const high = market.high_price;

  if (compact) {
    return (
      <View style={styles.compactRow}>
        <Text style={styles.compactPrice}>{formatUSD(rp)}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.priceRow}>
        <View style={styles.priceBlock}>
          <Text style={styles.priceLabel}>MARKET VALUE</Text>
          <Text style={styles.priceValue}>{formatUSD(avg)}</Text>
        </View>
        <View style={styles.priceBlock}>
          <Text style={styles.priceLabel}>FLIP PRICE</Text>
          <Text style={[styles.priceValue, { color: '#00FF85' }]}>{formatUSD(rp)}</Text>
        </View>
      </View>

      <View style={styles.rangeSection}>
        <Text style={styles.rangeLabel}>PRICE RANGE (OBSERVED)</Text>
        <View style={styles.rangeRow}>
          <Text style={styles.rangeEdge}>{formatUSD(low)}</Text>
          <Text style={styles.rangeDash}>—</Text>
          <Text style={styles.rangeEdge}>{formatUSD(high)}</Text>
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
  loadingText: {
    color: '#4B5563',
    fontSize: 12,
    marginBottom: 12,
  },
  skeletonRow: { flexDirection: 'row', gap: 16, marginBottom: 8 },
  skeleton: {
    height: 14,
    backgroundColor: '#1A1A1A',
    borderRadius: 4,
  },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  priceBlock: { flex: 1 },
  priceLabel: { color: '#4B5563', fontSize: 10, letterSpacing: 1, marginBottom: 4 },
  priceValue: { color: '#FFFFFF', fontSize: 20, fontWeight: 'bold' },
  rangeSection: { marginBottom: 0 },
  rangeLabel: { color: '#4B5563', fontSize: 10, letterSpacing: 1, marginBottom: 8 },
  rangeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center' },
  rangeEdge: { color: '#9CA3AF', fontSize: 11 },
  rangeDash: { color: '#4B5563', fontSize: 11 },
  compactRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  compactPrice: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
});

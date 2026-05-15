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

  const fmv = market.fair_market_value;
  const rp = market.recommended_price;
  const low = market.price_low;
  const high = market.price_high;

  const margin = (fmv !== null && rp !== null && fmv > 0)
    ? rp - fmv
    : null;
  const marginPct = (fmv !== null && rp !== null && fmv > 0)
    ? ((rp - fmv) / fmv) * 100
    : null;
  const marginPositive = margin !== null && margin >= 0;

  const rangePosition = (low !== null && high !== null && rp !== null && high > low)
    ? Math.max(0, Math.min(1, (rp - low) / (high - low)))
    : 0.5;

  if (compact) {
    return (
      <View style={styles.compactRow}>
        <Text style={styles.compactPrice}>{formatUSD(rp)}</Text>
        {margin !== null && (
          <Text style={[styles.compactMargin, { color: marginPositive ? '#10B981' : '#EF4444' }]}>
            {marginPositive ? '+' : ''}{formatUSD(margin)}
          </Text>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Price row */}
      <View style={styles.priceRow}>
        <View style={styles.priceBlock}>
          <Text style={styles.priceLabel}>MARKET VALUE</Text>
          <Text style={styles.priceValue}>{formatUSD(fmv)}</Text>
        </View>
        <View style={styles.priceBlock}>
          <Text style={styles.priceLabel}>FLIP PRICE</Text>
          <Text style={[styles.priceValue, { color: '#00FF85' }]}>{formatUSD(rp)}</Text>
        </View>
      </View>

      {/* Range bar */}
      <View style={styles.rangeSection}>
        <Text style={styles.rangeLabel}>PRICE RANGE</Text>
        <View style={styles.rangeRow}>
          <Text style={styles.rangeEdge}>{formatUSD(low)}</Text>
          <View style={styles.rangeBarOuter}>
            <View style={styles.rangeBarTrack} />
            <View style={[styles.rangeBarDot, { left: `${rangePosition * 100}%` }]} />
          </View>
          <Text style={styles.rangeEdge}>{formatUSD(high)}</Text>
        </View>
      </View>

      {/* Flip margin */}
      {margin !== null && marginPct !== null && (
        <View style={styles.marginRow}>
          <Text style={styles.marginLabel}>FLIP MARGIN</Text>
          <Text style={[styles.marginValue, { color: marginPositive ? '#10B981' : '#EF4444' }]}>
            {marginPositive ? '+' : ''}{formatUSD(margin)} ({marginPositive ? '+' : ''}{marginPct.toFixed(1)}%)
          </Text>
          {!marginPositive && (
            <Text style={styles.belowMarket}>Below Market</Text>
          )}
        </View>
      )}
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
  rangeSection: { marginBottom: 16 },
  rangeLabel: { color: '#4B5563', fontSize: 10, letterSpacing: 1, marginBottom: 8 },
  rangeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rangeEdge: { color: '#9CA3AF', fontSize: 11 },
  rangeBarOuter: { flex: 1, height: 4, position: 'relative', justifyContent: 'center' },
  rangeBarTrack: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#2A2A2A',
    borderRadius: 1,
  },
  rangeBarDot: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#00FF85',
    marginLeft: -5,
  },
  marginRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  marginLabel: { color: '#4B5563', fontSize: 10, letterSpacing: 1 },
  marginValue: { fontSize: 14, fontWeight: 'bold' },
  belowMarket: { color: '#EF4444', fontSize: 10 },
  compactRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  compactPrice: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  compactMargin: { fontSize: 11 },
});

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { GlasscardMarketData } from '../../types/models';
import { demandLabel, liquidityLabel, volatilityLabel, formatPercent } from './utils';

type Props = {
  market: GlasscardMarketData | null;
};

type MetricConfig = {
  label: string;
  value: number | null;
  barColor: string;
  textFn: (v: number | null) => string;
};

function MetricBar({ label, value, barColor, textFn }: MetricConfig) {
  const isNull = value === null;
  const pct = isNull ? 0 : Math.min(100, Math.max(0, Math.round(value)));

  return (
    <View style={styles.metricRow}>
      <View style={styles.metricLabelRow}>
        <Text style={styles.metricLabel}>{label}</Text>
        {isNull ? (
          <View style={styles.skeletonValue} />
        ) : (
          <Text style={[styles.metricValue, { color: barColor }]}>
            {textFn(value)} · {formatPercent(value)}
          </Text>
        )}
      </View>
      <View style={styles.barOuter}>
        {isNull ? (
          <View style={styles.barSkeleton} />
        ) : (
          <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: barColor }]} />
        )}
      </View>
    </View>
  );
}

function demandColor(v: number): string {
  if (v > 70) return '#10B981';
  if (v >= 30) return '#6EE7B7';
  return '#4B5563';
}

function liquidityColor(v: number): string {
  if (v > 70) return '#3B82F6';
  if (v >= 30) return '#93C5FD';
  return '#4B5563';
}

function volatilityColor(v: number): string {
  if (v > 70) return '#EF4444';
  if (v >= 30) return '#F59E0B';
  return '#4B5563';
}

export default function GlasscardMetrics({ market }: Props) {
  const demand = market?.demand_score ?? null;
  const liquidity = market?.liquidity_score ?? null;
  const volatility = market?.volatility_score ?? null;

  const metrics: MetricConfig[] = [
    {
      label: 'DEMAND',
      value: demand,
      barColor: demand !== null ? demandColor(demand) : '#4B5563',
      textFn: demandLabel,
    },
    {
      label: 'LIQUIDITY',
      value: liquidity,
      barColor: liquidity !== null ? liquidityColor(liquidity) : '#4B5563',
      textFn: liquidityLabel,
    },
    {
      label: 'VOLATILITY',
      value: volatility,
      barColor: volatility !== null ? volatilityColor(volatility) : '#4B5563',
      textFn: volatilityLabel,
    },
  ];

  return (
    <View style={styles.container}>
      {metrics.map((m) => (
        <MetricBar key={m.label} {...m} />
      ))}
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
    gap: 14,
  },
  metricRow: { gap: 6 },
  metricLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metricLabel: { color: '#4B5563', fontSize: 10, letterSpacing: 2 },
  metricValue: { fontSize: 11, fontWeight: '600' },
  skeletonValue: {
    width: 60,
    height: 11,
    backgroundColor: '#1A1A1A',
    borderRadius: 3,
  },
  barOuter: {
    height: 6,
    backgroundColor: '#1A1A1A',
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },
  barSkeleton: {
    height: '100%',
    width: '30%',
    backgroundColor: '#222222',
    borderRadius: 3,
  },
});

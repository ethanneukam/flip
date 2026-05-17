import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

type Props = {
  itemTitle: string;
  percentChange: number;
  direction: 'up' | 'down';
  onPress?: () => void;
};

export default function PriceMovementBanner({ itemTitle, percentChange, direction, onPress }: Props) {
  const color = direction === 'up' ? '#00FF87' : '#FF4444';
  const arrow = direction === 'up' ? '↑' : '↓';
  const sign = direction === 'up' ? '+' : '';

  return (
    <TouchableOpacity
      style={[styles.container, { borderLeftColor: color }]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
    >
      <Text style={[styles.arrow, { color }]}>{arrow}</Text>
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={1}>{itemTitle}</Text>
        <Text style={[styles.percent, { color }]}>
          {sign}{percentChange.toFixed(1)}%
        </Text>
      </View>
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
  arrow: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    color: '#FFFFFF',
    fontFamily: 'monospace',
    fontSize: 11,
    flex: 1,
    marginRight: 8,
  },
  percent: {
    fontFamily: 'monospace',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

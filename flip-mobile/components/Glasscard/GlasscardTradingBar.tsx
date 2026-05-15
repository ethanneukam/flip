import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

type Props = {
  onBuy?: () => void;
  onWatch?: () => void;
  onInspectSeller?: () => void;
  onReject?: () => void;
};

const noop = () => {};

export default function GlasscardTradingBar({
  onBuy = noop,
  onWatch = noop,
  onInspectSeller = noop,
  onReject = noop,
}: Props) {
  return (
    <View style={styles.container}>
      <TouchableOpacity style={[styles.button, styles.rejectBtn]} onPress={onReject} activeOpacity={0.7}>
        <Text style={styles.rejectIcon}>↑</Text>
        <Text style={styles.rejectLabel}>REJECT</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.button, styles.watchBtn]} onPress={onWatch} activeOpacity={0.7}>
        <Text style={styles.watchIcon}>↓</Text>
        <Text style={styles.watchLabel}>WATCH</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.button, styles.sellerBtn]} onPress={onInspectSeller} activeOpacity={0.7}>
        <Text style={styles.sellerIcon}>→</Text>
        <Text style={styles.sellerLabel}>SELLER</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.button, styles.buyBtn]} onPress={onBuy} activeOpacity={0.7}>
        <Text style={styles.buyIcon}>←</Text>
        <Text style={styles.buyLabel}>BUY</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 12,
  },
  button: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
  },
  rejectBtn: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#6B7280' },
  rejectIcon: { color: '#6B7280', fontSize: 16, marginBottom: 2 },
  rejectLabel: { color: '#6B7280', fontSize: 9, fontWeight: 'bold', letterSpacing: 1 },
  watchBtn: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#3B82F6' },
  watchIcon: { color: '#3B82F6', fontSize: 16, marginBottom: 2 },
  watchLabel: { color: '#3B82F6', fontSize: 9, fontWeight: 'bold', letterSpacing: 1 },
  sellerBtn: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#6C63FF' },
  sellerIcon: { color: '#6C63FF', fontSize: 16, marginBottom: 2 },
  sellerLabel: { color: '#6C63FF', fontSize: 9, fontWeight: 'bold', letterSpacing: 1 },
  buyBtn: { backgroundColor: '#00FF85' },
  buyIcon: { color: '#0A0A0A', fontSize: 16, fontWeight: 'bold', marginBottom: 2 },
  buyLabel: { color: '#0A0A0A', fontSize: 9, fontWeight: 'bold', letterSpacing: 1 },
});

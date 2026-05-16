import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';
import { OVERLAY } from './constants';

type Props = {
  buyStyle: object;
  sellerStyle: object;
  skipStyle: object;
  saveStyle: object;
};

export default function GlasscardOverlay({ buyStyle, sellerStyle, skipStyle, saveStyle }: Props) {
  return (
    <View style={styles.root} pointerEvents="none">
      <Animated.View style={[styles.corner, styles.top, skipStyle, { backgroundColor: OVERLAY.skip.color }]}>
        <Text style={styles.label}>{OVERLAY.skip.label}</Text>
      </Animated.View>
      <Animated.View style={[styles.corner, styles.right, buyStyle, { backgroundColor: OVERLAY.buy.color }]}>
        <Text style={styles.label}>{OVERLAY.buy.label}</Text>
      </Animated.View>
      <Animated.View style={[styles.corner, styles.bottom, saveStyle, { backgroundColor: OVERLAY.save.color }]}>
        <Text style={styles.label}>{OVERLAY.save.label}</Text>
      </Animated.View>
      <Animated.View style={[styles.corner, styles.left, sellerStyle, { backgroundColor: OVERLAY.seller.color }]}>
        <Text style={styles.label}>{OVERLAY.seller.label}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 16,
    overflow: 'hidden',
  },
  corner: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 6,
  },
  top: { top: 12, alignSelf: 'center', left: 0, right: 0 },
  bottom: { bottom: 12, alignSelf: 'center', left: 0, right: 0 },
  left: { left: 12, top: 120 },
  right: { right: 12, top: 120 },
  label: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 3,
    fontFamily: 'monospace',
  },
});

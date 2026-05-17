import React from 'react';
import { View, StyleSheet } from 'react-native';
import type { GlasscardData } from '../../types/models';
import GestureGlasscard from './GestureGlasscard';
import GlasscardHeader from './GlasscardHeader';
import GlasscardMarket from './GlasscardMarket';
import GlasscardSeller from './GlasscardSeller';
import { STACK } from './constants';

export type GlasscardStackProps = {
  cards: GlasscardData[];
  isMarketLoading?: (item: GlasscardData) => boolean;
  /** Called after buy/save/skip with the card that exited the stack. */
  onConsumed?: (item: GlasscardData) => void;
  onBuy?: (item: GlasscardData) => void;
  onSave?: (item: GlasscardData) => void;
  onSellerInspect?: (item: GlasscardData) => void;
  onSkip?: (item: GlasscardData) => void;
  /** When true, stack fills the parent (feed page). */
  fill?: boolean;
};

function StackBackCard({ data, depth }: { data: GlasscardData; depth: number }) {
  const scale = 1 - STACK.depthScaleStep * depth;
  const translateY = STACK.depthTranslateY * depth;
  const opacity = 1 - STACK.depthOpacityStep * depth;
  return (
    <View
      style={[
        styles.backShell,
        {
          transform: [{ scale }, { translateY }],
          opacity,
          zIndex: 10 - depth,
        },
      ]}
      pointerEvents="none"
    >
      <GlasscardHeader data={data} compact />
      <GlasscardMarket market={data.market} isLoading={false} compact />
      <View style={styles.backSeller}>
        <GlasscardSeller seller={data.seller} compact />
      </View>
    </View>
  );
}

export default function GlasscardStack({
  cards,
  isMarketLoading,
  onConsumed,
  onBuy,
  onSave,
  onSellerInspect,
  onSkip,
  fill = false,
}: GlasscardStackProps) {
  const visible = cards.slice(0, STACK.maxVisible);
  const top = visible[0];
  const backs = visible.slice(1);

  if (!top) {
    return <View style={styles.emptyStack} />;
  }

  const loadingTop = isMarketLoading ? isMarketLoading(top) : !top.market;

  return (
    <View style={[styles.stackArea, fill && styles.stackAreaFill]}>
      {backs
        .slice()
        .reverse()
        .map((c, idx) => (
          <StackBackCard key={c.id} data={c} depth={backs.length - idx} />
        ))}
      <View style={[styles.topSlot, fill && styles.topSlotFill]}>
        <GestureGlasscard
          key={top.id}
          data={top}
          mode="feed"
          isMarketLoading={loadingTop}
          resetAfterCommit={false}
          onBuy={() => {
            onBuy?.(top);
            onConsumed?.(top);
          }}
          onSave={() => {
            onSave?.(top);
            onConsumed?.(top);
          }}
          onSellerInspect={() => {
            onSellerInspect?.(top);
          }}
          onSkip={() => {
            onSkip?.(top);
            onConsumed?.(top);
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stackArea: {
    minHeight: 440,
    marginBottom: 8,
    position: 'relative',
  },
  stackAreaFill: {
    flex: 1,
    minHeight: 0,
    marginBottom: 0,
  },
  emptyStack: {
    minHeight: 120,
  },
  backShell: {
    position: 'absolute',
    left: 8,
    right: 8,
    top: 16,
    backgroundColor: '#141414',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: 12,
  },
  backSeller: {
    marginTop: 4,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.04)',
  },
  topSlot: {
    zIndex: 20,
    position: 'relative',
  },
  topSlotFill: {
    flex: 1,
    minHeight: 0,
  },
});

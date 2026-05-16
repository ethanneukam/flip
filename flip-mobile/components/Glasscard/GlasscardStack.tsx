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
  onConsumed: () => void;
  onBuy?: (item: GlasscardData) => void;
  onSave?: (item: GlasscardData) => void;
  onSellerInspect?: (item: GlasscardData) => void;
  onSkip?: (item: GlasscardData) => void;
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
}: GlasscardStackProps) {
  const visible = cards.slice(0, STACK.maxVisible);
  const top = visible[0];
  const backs = visible.slice(1);

  if (!top) {
    return <View style={styles.emptyStack} />;
  }

  const loadingTop = isMarketLoading ? isMarketLoading(top) : !top.market;

  return (
    <View style={styles.stackArea}>
      {backs
        .slice()
        .reverse()
        .map((c, idx) => (
          <StackBackCard key={c.id} data={c} depth={backs.length - idx} />
        ))}
      <View style={styles.topSlot}>
        <GestureGlasscard
          key={top.id}
          data={top}
          mode="feed"
          isMarketLoading={loadingTop}
          resetAfterCommit={false}
          onBuy={() => {
            onBuy?.(top);
            onConsumed();
          }}
          onSave={() => {
            onSave?.(top);
            onConsumed();
          }}
          onSellerInspect={() => {
            onSellerInspect?.(top);
          }}
          onSkip={() => {
            onSkip?.(top);
            onConsumed();
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
});

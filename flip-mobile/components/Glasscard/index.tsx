import React from 'react';
import { View, StyleSheet } from 'react-native';
import type { GlasscardProps } from './types';
import GlasscardHeader from './GlasscardHeader';
import GlasscardMarket from './GlasscardMarket';
import GlasscardMetrics from './GlasscardMetrics';
import GlasscardSeller from './GlasscardSeller';
import GlasscardComps from './GlasscardComps';
import GlasscardTradingBar from './GlasscardTradingBar';

export default function Glasscard({
  data,
  onBuy,
  onWatch,
  onInspectSeller,
  onReject,
  mode = 'full',
  isMarketLoading,
}: GlasscardProps) {
  const isFeed = mode === 'feed';

  return (
    <View style={isFeed ? styles.cardFeed : styles.cardFull}>
      <GlasscardHeader data={data} compact={isFeed} />

      <GlasscardMarket
        market={data.market}
        isLoading={isMarketLoading}
        compact={isFeed}
      />

      {!isFeed && (
        <>
          <GlasscardMetrics market={data.market} />
          <GlasscardSeller seller={data.seller} />
          <GlasscardComps comps={data.market?.external_comps ?? null} />
          <GlasscardTradingBar
            onBuy={onBuy}
            onWatch={onWatch}
            onInspectSeller={onInspectSeller}
            onReject={onReject}
          />
        </>
      )}

      {isFeed && (
        <View style={styles.feedBottom}>
          <GlasscardSeller seller={data.seller} compact />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  cardFull: {
    backgroundColor: '#0D0D0D',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  cardFeed: {
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    padding: 14,
    marginBottom: 8,
  },
  feedBottom: {
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.04)',
  },
});

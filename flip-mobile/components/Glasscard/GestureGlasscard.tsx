import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, LayoutChangeEvent } from 'react-native';
import { GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import type { GlasscardMode } from './types';
import type { GlasscardData } from '../../types/models';
import GlasscardHeader from './GlasscardHeader';
import GlasscardMarket from './GlasscardMarket';
import GlasscardMetrics from './GlasscardMetrics';
import GlasscardSeller from './GlasscardSeller';
import GlasscardComps from './GlasscardComps';
import GlasscardTradingBar from './GlasscardTradingBar';
import GlasscardOverlay from './GlasscardOverlay';
import { useGlasscardGesture, useOverlayStyles } from './useGlasscardGesture';
import type { GlasscardIntent } from './gestureUtils';
import { NO_EXIT_ON_INSPECT } from './gestureUtils';

const DEFAULT_NO_EXIT = NO_EXIT_ON_INSPECT;

export type GestureGlasscardProps = {
  data: GlasscardData;
  mode?: GlasscardMode;
  isMarketLoading?: boolean;
  resetAfterCommit?: boolean;
  noExitIntents?: GlasscardIntent[];
  onBuy?: () => void;
  onSave?: () => void;
  onSellerInspect?: () => void;
  onSkip?: () => void;
};

export default function GestureGlasscard({
  data,
  mode = 'full',
  isMarketLoading,
  resetAfterCommit = false,
  noExitIntents = DEFAULT_NO_EXIT,
  onBuy,
  onSave,
  onSellerInspect,
  onSkip,
}: GestureGlasscardProps) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const isFeed = mode === 'feed';

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width > 0 && height > 0) setSize({ w: width, h: height });
  }, []);

  const handleCommit = useCallback(
    (intent: GlasscardIntent) => {
      if (intent === 'buy') onBuy?.();
      else if (intent === 'save') onSave?.();
      else if (intent === 'seller') onSellerInspect?.();
      else if (intent === 'skip') onSkip?.();
    },
    [onBuy, onSave, onSellerInspect, onSkip]
  );

  const { panGesture, cardStyle, reset, triggerProgrammatic, translateX, translateY } =
    useGlasscardGesture({
      cardWidth: size.w,
      cardHeight: size.h,
      onCommit: handleCommit,
      resetAfterCommit,
      noExitIntents,
    });

  const overlay = useOverlayStyles(translateX, translateY);

  useEffect(() => {
    reset();
  }, [data.id, reset]);

  const barBuy = useCallback(() => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      /* noop */
    }
    triggerProgrammatic('buy');
  }, [triggerProgrammatic]);

  const barSave = useCallback(() => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      /* noop */
    }
    triggerProgrammatic('save');
  }, [triggerProgrammatic]);

  const barSeller = useCallback(() => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      /* noop */
    }
    triggerProgrammatic('seller');
  }, [triggerProgrammatic]);

  const barSkip = useCallback(() => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      /* noop */
    }
    triggerProgrammatic('skip');
  }, [triggerProgrammatic]);

  const shell = isFeed ? styles.cardFeed : styles.cardFull;

  return (
    <GestureHandlerRootView style={styles.ghRoot}>
      <View style={styles.outer} onLayout={onLayout}>
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[shell, cardStyle]}>
          <GlasscardOverlay
            buyStyle={overlay.buy}
            sellerStyle={overlay.seller}
            skipStyle={overlay.skip}
            saveStyle={overlay.save}
          />
          <GlasscardHeader data={data} compact={isFeed} />
          <GlasscardMarket market={data.market} isLoading={isMarketLoading} compact={isFeed} />
          {!isFeed && (
            <>
              <GlasscardMetrics market={data.market} />
              <GlasscardSeller seller={data.seller} />
              <GlasscardComps comps={data.market?.external_comps ?? null} />
            </>
          )}
          {isFeed && (
            <View style={styles.feedBottom}>
              <GlasscardSeller seller={data.seller} compact />
            </View>
          )}
          <GlasscardTradingBar
            onBuy={barBuy}
            onWatch={barSave}
            onInspectSeller={barSeller}
            onReject={barSkip}
          />
        </Animated.View>
      </GestureDetector>
    </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  ghRoot: { width: '100%' },
  outer: { width: '100%' },
  cardFull: {
    backgroundColor: '#0D0D0D',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 0,
  },
  cardFeed: {
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    padding: 14,
  },
  feedBottom: {
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.04)',
  },
});

import { useCallback } from 'react';
import { Dimensions } from 'react-native';
import { Gesture } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { safeImpact } from '../../lib/safeHaptics';
import {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import type { GlasscardIntent } from './gestureUtils';
import { exitTarget, resolveIntent, resetHapticGate } from './gestureUtils';
import { EXIT_OVERSHOOT } from './constants';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

function fireHaptic() {
  void safeImpact(Haptics.ImpactFeedbackStyle.Light);
}

type Options = {
  cardWidth: number;
  cardHeight: number;
  onCommit: (intent: GlasscardIntent) => void;
  resetAfterCommit?: boolean;
  /** Intents that snap back instead of exiting the card. */
  noExitIntents?: GlasscardIntent[];
};

export function useGlasscardGesture({
  cardWidth,
  cardHeight,
  onCommit,
  resetAfterCommit = false,
  noExitIntents = [],
}: Options) {
  const noExit = noExitIntents;
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const hapticGate = useSharedValue(0);

  const w = cardWidth > 0 ? cardWidth : SCREEN_W;
  const h = cardHeight > 0 ? cardHeight : SCREEN_H * 0.55;

  const reset = useCallback(() => {
    translateX.value = 0;
    translateY.value = 0;
    hapticGate.value = 0;
  }, [translateX, translateY, hapticGate]);

  const commit = useCallback(
    (intent: GlasscardIntent) => {
      onCommit(intent);
    },
    [onCommit]
  );

  const runExit = useCallback(
    (intent: GlasscardIntent) => {
      if (noExit.includes(intent)) {
        translateX.value = withSpring(0, { damping: 18, stiffness: 220 });
        translateY.value = withSpring(0, { damping: 18, stiffness: 220 });
        runOnJS(commit)(intent);
        return;
      }
      const t = exitTarget(intent, w, h);
      const dx = t.x * EXIT_OVERSHOOT;
      const dy = t.y * EXIT_OVERSHOOT;
      translateX.value = withTiming(dx, { duration: 260 }, (finished) => {
        if (!finished) return;
        runOnJS(commit)(intent);
        if (resetAfterCommit) {
          runOnJS(reset)();
        }
      });
      translateY.value = withTiming(dy, { duration: 260 });
    },
    [commit, h, noExit, reset, resetAfterCommit, translateX, translateY, w]
  );

  const triggerProgrammatic = useCallback(
    (intent: GlasscardIntent) => {
      runExit(intent);
    },
    [runExit]
  );

  const panGesture = Gesture.Pan()
    .activeOffsetX([-12, 12])
    .activeOffsetY([-12, 12])
    .onBegin(() => {
      resetHapticGate(hapticGate);
    })
    .onUpdate((e) => {
      translateX.value = e.translationX;
      translateY.value = e.translationY;
      const intent = resolveIntent(e.translationX, e.translationY);
      if (intent !== null && hapticGate.value === 0) {
        hapticGate.value = 1;
        runOnJS(fireHaptic)();
      }
    })
    .onEnd((e) => {
      const intent = resolveIntent(e.translationX, e.translationY);
      if (intent === null) {
        translateX.value = withSpring(0, { damping: 18, stiffness: 220 });
        translateY.value = withSpring(0, { damping: 18, stiffness: 220 });
        return;
      }
      runExit(intent);
    });

  const cardStyle = useAnimatedStyle(() => {
    const rot = (translateX.value / (w * 2)) * 0.18;
    const s = 1 - Math.min(0.035, (Math.abs(translateX.value) + Math.abs(translateY.value)) / 4500);
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate: `${rot}rad` },
        { scale: s },
      ],
    };
  }, [w]);

  return {
    translateX,
    translateY,
    panGesture,
    cardStyle,
    reset,
    triggerProgrammatic,
  };
}

export function useOverlayStyles(
  translateX: ReturnType<typeof useSharedValue<number>>,
  translateY: ReturnType<typeof useSharedValue<number>>
) {
  const buy = useAnimatedStyle(() => {
    const tx = translateX.value;
    const ty = translateY.value;
    const dominant = Math.abs(tx) >= Math.abs(ty);
    const op = dominant && tx > 0 ? Math.min(1, tx / 120) : 0;
    return { opacity: op };
  });

  const seller = useAnimatedStyle(() => {
    const tx = translateX.value;
    const ty = translateY.value;
    const dominant = Math.abs(tx) >= Math.abs(ty);
    const op = dominant && tx < 0 ? Math.min(1, (-tx) / 120) : 0;
    return { opacity: op };
  });

  const skip = useAnimatedStyle(() => {
    const tx = translateX.value;
    const ty = translateY.value;
    const dominant = Math.abs(ty) > Math.abs(tx);
    const op = dominant && ty < 0 ? Math.min(1, (-ty) / 140) : 0;
    return { opacity: op };
  });

  const save = useAnimatedStyle(() => {
    const tx = translateX.value;
    const ty = translateY.value;
    const dominant = Math.abs(ty) > Math.abs(tx);
    const op = dominant && ty > 0 ? Math.min(1, ty / 140) : 0;
    return { opacity: op };
  });

  return { buy, seller, skip, save };
}

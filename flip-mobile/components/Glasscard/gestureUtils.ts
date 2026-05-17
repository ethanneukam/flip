import type { SharedValue } from 'react-native-reanimated';
import {
  THRESHOLD_BUY_X,
  THRESHOLD_SELLER_X,
  THRESHOLD_SKIP_Y,
  THRESHOLD_SAVE_Y,
} from './constants';

export type GlasscardIntent = 'buy' | 'save' | 'seller' | 'skip';

/** Intents that snap back instead of flying off the stack (seller inspect). */
export const NO_EXIT_ON_INSPECT: GlasscardIntent[] = ['seller'];

export function resolveIntent(tx: number, ty: number): GlasscardIntent | null {
  const ax = Math.abs(tx);
  const ay = Math.abs(ty);
  if (ax >= ay) {
    if (tx >= THRESHOLD_BUY_X) return 'buy';
    if (tx <= THRESHOLD_SELLER_X) return 'seller';
    return null;
  }
  if (ty <= THRESHOLD_SKIP_Y) return 'skip';
  if (ty >= THRESHOLD_SAVE_Y) return 'save';
  return null;
}

/** 0..1 progress toward threshold on dominant axis (for overlay intensity). */
export function overlayProgress(tx: number, ty: number): number {
  const ax = Math.abs(tx);
  const ay = Math.abs(ty);
  if (ax >= ay) {
    if (tx > 0) return Math.min(1, tx / THRESHOLD_BUY_X);
    if (tx < 0) return Math.min(1, (-tx) / (-THRESHOLD_SELLER_X));
    return 0;
  }
  if (ty < 0) return Math.min(1, (-ty) / (-THRESHOLD_SKIP_Y));
  if (ty > 0) return Math.min(1, ty / THRESHOLD_SAVE_Y);
  return 0;
}

export function exitTarget(
  intent: GlasscardIntent,
  width: number,
  height: number
): { x: number; y: number } {
  const w = width * 1.4;
  const h = height * 1.4;
  switch (intent) {
    case 'buy':
      return { x: w, y: 0 };
    case 'seller':
      return { x: -w, y: 0 };
    case 'skip':
      return { x: 0, y: -h };
    case 'save':
      return { x: 0, y: h };
    default:
      return { x: 0, y: 0 };
  }
}

export function resetHapticGate(gate: SharedValue<number>) {
  gate.value = 0;
}

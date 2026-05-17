/** Pan distance (px) before intent commits on release. */
export const THRESHOLD_BUY_X = 120;
export const THRESHOLD_SELLER_X = -120;
export const THRESHOLD_SKIP_Y = -140;
export const THRESHOLD_SAVE_Y = 140;

/** Exit animation distance multiplier (off-screen). */
export const EXIT_OVERSHOOT = 1.4;

export const OVERLAY = {
  buy: { label: 'BUY', color: 'rgba(16, 185, 129, 0.35)' },
  save: { label: 'SAVE', color: 'rgba(59, 130, 246, 0.35)' },
  seller: { label: 'SELLER', color: 'rgba(108, 99, 255, 0.38)' },
  skip: { label: 'SKIP', color: 'rgba(107, 114, 128, 0.45)' },
} as const;

export const STACK = {
  maxVisible: 3,
  depthScaleStep: 0.045,
  depthTranslateY: 11,
  depthOpacityStep: 0.12,
} as const;

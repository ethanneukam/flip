import * as Haptics from 'expo-haptics';

/** Haptics are unsupported on web and some simulators; never throw into gesture handlers. */
export async function safeImpact(style: Haptics.ImpactFeedbackStyle): Promise<void> {
  try {
    await Haptics.impactAsync(style);
  } catch {
    /* noop */
  }
}

export async function safeSelection(): Promise<void> {
  try {
    await Haptics.selectionAsync();
  } catch {
    /* noop */
  }
}

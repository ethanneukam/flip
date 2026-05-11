import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type OnboardingState =
  | 'welcome'
  | 'camera_prompted'
  | 'first_scan_done'
  | 'first_save_done'
  | 'complete';

const STORAGE_KEY = 'onboarding_state';
const STATE_ORDER: OnboardingState[] = [
  'welcome',
  'camera_prompted',
  'first_scan_done',
  'first_save_done',
  'complete',
];

export function useOnboarding() {
  const [state, setState] = useState<OnboardingState | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadState();
  }, []);

  const loadState = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored && STATE_ORDER.includes(stored as OnboardingState)) {
        setState(stored as OnboardingState);
      } else {
        setState('welcome');
      }
    } catch {
      setState('welcome');
    }
    setLoaded(true);
  };

  const advanceTo = useCallback(async (nextState: OnboardingState) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, nextState);
      setState(nextState);
    } catch {}
  }, []);

  const skip = useCallback(async () => {
    await advanceTo('complete');
  }, [advanceTo]);

  const isComplete = state === 'complete';
  const isActive = loaded && state !== null && state !== 'complete';

  return {
    state,
    loaded,
    isActive,
    isComplete,
    advanceTo,
    skip,
  };
}

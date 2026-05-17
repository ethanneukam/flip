import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STREAK_KEY = 'flip_streak_data';

type StreakData = {
  currentStreak: number;
  longestStreak: number;
  lastScanDate: string | null;
  todayCompleted: boolean;
};

const DEFAULT_STREAK: StreakData = {
  currentStreak: 0,
  longestStreak: 0,
  lastScanDate: null,
  todayCompleted: false,
};

function getDateString(date: Date = new Date()): string {
  return date.toISOString().split('T')[0];
}

function daysBetween(dateA: string, dateB: string): number {
  const a = new Date(dateA).getTime();
  const b = new Date(dateB).getTime();
  return Math.floor(Math.abs(b - a) / (1000 * 60 * 60 * 24));
}

export function useStreak() {
  const [streak, setStreak] = useState<StreakData>(DEFAULT_STREAK);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadStreak();
  }, []);

  const loadStreak = async () => {
    try {
      const stored = await AsyncStorage.getItem(STREAK_KEY);
      if (stored) {
        const data: StreakData = JSON.parse(stored);
        const today = getDateString();
        const yesterday = getDateString(new Date(Date.now() - 86400000));

        if (data.lastScanDate === today) {
          setStreak({ ...data, todayCompleted: true });
        } else if (data.lastScanDate === yesterday) {
          setStreak({ ...data, todayCompleted: false });
        } else if (data.lastScanDate && daysBetween(data.lastScanDate, today) > 1) {
          setStreak({ currentStreak: 0, longestStreak: data.longestStreak, lastScanDate: data.lastScanDate, todayCompleted: false });
        } else {
          setStreak(data);
        }
      }
    } catch {}
    setLoaded(true);
  };

  const recordScan = useCallback(async () => {
    const today = getDateString();

    setStreak(prev => {
      if (prev.lastScanDate === today) return prev;

      const yesterday = getDateString(new Date(Date.now() - 86400000));
      const wasYesterday = prev.lastScanDate === yesterday;
      const newCurrent = wasYesterday ? prev.currentStreak + 1 : 1;
      const newLongest = Math.max(prev.longestStreak, newCurrent);

      const updated: StreakData = {
        currentStreak: newCurrent,
        longestStreak: newLongest,
        lastScanDate: today,
        todayCompleted: true,
      };

      AsyncStorage.setItem(STREAK_KEY, JSON.stringify(updated)).catch(() => {});
      return updated;
    });
  }, []);

  return { streak, loaded, recordScan };
}

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

type Props = {
  currentStreak: number;
  longestStreak: number;
  todayCompleted: boolean;
};

export default function StreakCard({ currentStreak, longestStreak, todayCompleted }: Props) {
  if (currentStreak === 0 && !todayCompleted) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.flame}>{todayCompleted ? '🔥' : '○'}</Text>
        <Text style={styles.streakCount}>{currentStreak}</Text>
        <Text style={styles.streakLabel}>DAY STREAK</Text>
      </View>
      {!todayCompleted && currentStreak > 0 && (
        <Text style={styles.nudge}>1 scan today keeps your streak</Text>
      )}
      {longestStreak > currentStreak && (
        <Text style={styles.record}>Record: {longestStreak} days</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 4,
    padding: 14,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  flame: {
    fontSize: 16,
  },
  streakCount: {
    color: '#FFFFFF',
    fontFamily: 'monospace',
    fontSize: 18,
    fontWeight: 'bold',
  },
  streakLabel: {
    color: '#888888',
    fontFamily: 'monospace',
    fontSize: 9,
    letterSpacing: 2,
  },
  nudge: {
    color: '#FFAA00',
    fontFamily: 'monospace',
    fontSize: 10,
    marginTop: 6,
  },
  record: {
    color: '#888888',
    fontFamily: 'monospace',
    fontSize: 9,
    marginTop: 4,
  },
});

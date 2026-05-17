import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Share } from 'react-native';
import * as Haptics from 'expo-haptics';
import type { RankTier } from '../types/models';

type Props = {
  visible: boolean;
  newRank: RankTier;
  repScore: number;
  username: string;
  onDismiss: () => void;
};

const RANK_MESSAGES: Record<RankTier, string> = {
  Rookie: 'Welcome to the market. Every prediction builds your reputation.',
  Analyst: 'Your predictions are beating the crowd. Market intelligence unlocked.',
  Forecaster: 'Institutional-grade accuracy. You see what others miss.',
  Oracle: 'Peak prediction accuracy. The market follows your signal.',
};

const RANK_COLORS: Record<RankTier, string> = {
  Oracle: '#00FF87',
  Forecaster: '#00AAFF',
  Analyst: '#FFAA00',
  Rookie: '#888888',
};

export default function RankProgressModal({ visible, newRank, repScore, username, onDismiss }: Props) {
  const handleShare = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await Share.share({
        message: `I just reached ${newRank} rank on Flip with ${repScore.toFixed(1)} REP score. Track your market predictions on Flip.`,
      });
    } catch {}
  };

  const color = RANK_COLORS[newRank];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.overlay}>
        <View style={[styles.container, { borderColor: color }]}>
          <Text style={styles.label}>RANK_ACHIEVED</Text>
          <Text style={[styles.rank, { color }]}>{newRank}</Text>
          <Text style={styles.score}>{repScore.toFixed(1)} REP</Text>
          <Text style={styles.message}>{RANK_MESSAGES[newRank]}</Text>

          <TouchableOpacity style={[styles.shareButton, { backgroundColor: color }]} onPress={handleShare}>
            <Text style={styles.shareText}>[ SHARE RANK ]</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.dismissButton} onPress={onDismiss}>
            <Text style={styles.dismissText}>Continue</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  container: {
    backgroundColor: '#111111',
    borderWidth: 2,
    borderRadius: 4,
    padding: 32,
    width: '100%',
    alignItems: 'center',
  },
  label: {
    color: '#888888',
    fontFamily: 'monospace',
    fontSize: 9,
    letterSpacing: 3,
    marginBottom: 12,
  },
  rank: {
    fontFamily: 'monospace',
    fontSize: 28,
    fontWeight: 'bold',
    letterSpacing: 2,
    marginBottom: 8,
  },
  score: {
    color: '#AAAAAA',
    fontFamily: 'monospace',
    fontSize: 14,
    marginBottom: 16,
  },
  message: {
    color: '#AAAAAA',
    fontFamily: 'monospace',
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 24,
  },
  shareButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 2,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  shareText: {
    color: '#080808',
    fontFamily: 'monospace',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  dismissButton: {
    padding: 12,
  },
  dismissText: {
    color: '#888888',
    fontFamily: 'monospace',
    fontSize: 10,
  },
});

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import type { OnboardingState } from '../hooks/useOnboarding';

type Props = {
  state: OnboardingState;
  onNext: () => void;
  onSkip: () => void;
};

const STEP_CONTENT: Record<Exclude<OnboardingState, 'complete'>, {
  icon: string;
  title: string;
  message: string;
  cta: string;
}> = {
  welcome: {
    icon: '⊙',
    title: 'WELCOME TO FLIP',
    message: 'Scan any physical item to get AI-powered identification, market valuation, and demand signals.',
    cta: 'GET STARTED',
  },
  camera_prompted: {
    icon: '◎',
    title: 'SCAN YOUR FIRST ITEM',
    message: 'Point your camera at any item — sneakers, electronics, collectibles. AI will identify it instantly.',
    cta: 'GOT IT',
  },
  first_scan_done: {
    icon: '◈',
    title: 'MAKE A PREDICTION',
    message: 'Think this item will go up in value? Record your prediction and track your accuracy over time.',
    cta: 'UNDERSTOOD',
  },
  first_save_done: {
    icon: '▲',
    title: 'YOU\'RE ALL SET',
    message: 'Your portfolio is tracking. Predictions resolve over 30 days. Build your rank from Rookie to Oracle.',
    cta: 'START TRADING',
  },
};

export default function OnboardingOverlay({ state, onNext, onSkip }: Props) {
  if (state === 'complete') return null;

  const content = STEP_CONTENT[state];
  if (!content) return null;

  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onNext();
  };

  const handleSkip = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSkip();
  };

  const currentIndex = ['welcome', 'camera_prompted', 'first_scan_done', 'first_save_done'].indexOf(state);

  return (
    <View style={styles.overlay}>
      <View style={styles.container}>
        {/* Skip */}
        <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
          <Text style={styles.skipText}>SKIP ›</Text>
        </TouchableOpacity>

        {/* Progress dots */}
        <View style={styles.progressDots}>
          {[0, 1, 2, 3].map((i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i <= currentIndex && styles.dotActive,
              ]}
            />
          ))}
        </View>

        {/* Content */}
        <Text style={styles.icon}>{content.icon}</Text>
        <Text style={styles.title}>{content.title}</Text>
        <Text style={styles.message}>{content.message}</Text>

        {/* CTA */}
        <TouchableOpacity style={styles.ctaButton} onPress={handleNext} activeOpacity={0.8}>
          <Text style={styles.ctaText}>[ {content.cta} ]</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(8, 8, 8, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  container: {
    width: '85%',
    padding: 32,
    alignItems: 'center',
  },
  skipButton: {
    position: 'absolute',
    top: 0,
    right: 0,
    padding: 12,
  },
  skipText: {
    color: '#888888',
    fontFamily: 'monospace',
    fontSize: 10,
    letterSpacing: 2,
  },
  progressDots: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 32,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2A2A2A',
  },
  dotActive: {
    backgroundColor: '#00FF87',
  },
  icon: {
    fontSize: 48,
    color: '#00FF87',
    marginBottom: 20,
  },
  title: {
    color: '#FFFFFF',
    fontFamily: 'monospace',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    color: '#AAAAAA',
    fontFamily: 'monospace',
    fontSize: 12,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 32,
  },
  ctaButton: {
    backgroundColor: '#00FF87',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 2,
  },
  ctaText: {
    color: '#080808',
    fontFamily: 'monospace',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
});

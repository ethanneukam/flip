import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';

const { width } = Dimensions.get('window');

const STEPS = [
  {
    id: 1,
    code: 'POINT_CAMERA_AT_ASSET',
    label: 'Step 1: Scanner',
    description: 'Point your camera at any physical item to identify it and pull real-time market data.',
    icon: '⬡',
    highlight: 'scanner',
  },
  {
    id: 2,
    code: 'ANALYZE_MARKET_DATA',
    label: 'Step 2: Market Graph',
    description: 'Read the Flip market graph — price trends, liquidity score, and 90-day range.',
    icon: '◈',
    highlight: 'chart',
  },
  {
    id: 3,
    code: 'SECURE_TO_VAULT',
    label: 'Step 3: Save & List',
    description: 'Save items to your vault and list at the verified Flip market price.',
    icon: '◉',
    highlight: 'vault',
  },
];

interface OnboardingStepperProps {
  onComplete: () => void;
  onStepChange?: (step: number) => void;
}

export default function OnboardingStepper({ onComplete, onStepChange }: OnboardingStepperProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completed, setCompleted] = useState(false);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    animateProgress(currentStep);
    onStepChange?.(currentStep);
  }, [currentStep]);

  const animateProgress = (step: number) => {
    Animated.timing(progressAnim, {
      toValue: ((step + 1) / STEPS.length) * 100,
      duration: 500,
      useNativeDriver: false,
    }).start();
  };

  const goNext = () => {
    if (currentStep < STEPS.length - 1) {
      // Slide out current, slide in next
      Animated.sequence([
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: -20,
            duration: 150,
            useNativeDriver: true,
          }),
        ]),
      ]).start(() => {
        setCurrentStep((prev) => prev + 1);
        slideAnim.setValue(20);
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start();
      });
    } else {
      setCompleted(true);
      setTimeout(onComplete, 600);
    }
  };

  const step = STEPS[currentStep];
  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.overlay}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>FLIP_ONBOARDING</Text>
          <TouchableOpacity onPress={onComplete}>
            <Text style={styles.skipText}>SKIP ›</Text>
          </TouchableOpacity>
        </View>

        {/* Progress bar */}
        <View style={styles.progressBg}>
          <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
        </View>

        {/* Step indicators */}
        <View style={styles.stepDots}>
          {STEPS.map((s, i) => (
            <View
              key={s.id}
              style={[
                styles.dot,
                i < currentStep && styles.dotDone,
                i === currentStep && styles.dotActive,
              ]}
            >
              <Text style={[
                styles.dotText,
                i === currentStep && styles.dotTextActive,
              ]}>
                {i < currentStep ? '✓' : (i + 1).toString()}
              </Text>
            </View>
          ))}
        </View>

        {/* Content */}
        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Text style={styles.stepIcon}>{step.icon}</Text>
          <Text style={styles.stepCode}>{step.code}</Text>
          <Text style={styles.stepLabel}>{step.label}</Text>
          <Text style={styles.stepDescription}>{step.description}</Text>
        </Animated.View>

        {/* CTA */}
        <TouchableOpacity
          style={[styles.button, completed && styles.buttonComplete]}
          onPress={goNext}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>
            {completed
              ? '[ ACCESS GRANTED ]'
              : currentStep === STEPS.length - 1
              ? '[ INITIALIZE ]'
              : '[ NEXT_STEP ] ›'}
          </Text>
        </TouchableOpacity>

        {/* Step count */}
        <Text style={styles.stepCount}>
          {currentStep + 1} / {STEPS.length}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.96)',
    borderTopWidth: 1,
    borderTopColor: '#1a1a1a',
    zIndex: 999,
  },
  container: {
    padding: 24,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    color: '#333',
    fontFamily: 'monospace',
    fontSize: 9,
    letterSpacing: 3,
  },
  skipText: {
    color: '#333',
    fontFamily: 'monospace',
    fontSize: 9,
    letterSpacing: 2,
  },
  progressBg: {
    height: 1,
    backgroundColor: '#111',
    marginBottom: 20,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10b981',
  },
  stepDots: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 28,
  },
  dot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#222',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotActive: {
    borderColor: '#10b981',
    backgroundColor: 'rgba(16,185,129,0.1)',
  },
  dotDone: {
    borderColor: '#10b981',
    backgroundColor: '#10b981',
  },
  dotText: {
    color: '#333',
    fontFamily: 'monospace',
    fontSize: 9,
  },
  dotTextActive: {
    color: '#10b981',
  },
  content: {
    marginBottom: 28,
  },
  stepIcon: {
    fontSize: 28,
    color: '#10b981',
    marginBottom: 12,
  },
  stepCode: {
    color: '#10b981',
    fontFamily: 'monospace',
    fontSize: 10,
    letterSpacing: 3,
    marginBottom: 6,
  },
  stepLabel: {
    color: '#fff',
    fontFamily: 'monospace',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
    letterSpacing: 1,
  },
  stepDescription: {
    color: '#555',
    fontFamily: 'monospace',
    fontSize: 12,
    lineHeight: 20,
  },
  button: {
    backgroundColor: '#10b981',
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonComplete: {
    backgroundColor: '#fff',
  },
  buttonText: {
    color: '#000',
    fontFamily: 'monospace',
    fontWeight: '900',
    fontSize: 12,
    letterSpacing: 2,
  },
  stepCount: {
    color: '#222',
    fontFamily: 'monospace',
    fontSize: 9,
    textAlign: 'center',
    letterSpacing: 2,
  },
});
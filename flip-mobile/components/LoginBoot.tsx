import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';

const STEPS = ['NETWORK', 'HANDSHAKE', 'DECRYPT'];

export default function LoginBoot({ onComplete }: { onComplete: () => void }) {
  const [displayText, setDisplayText] = useState('');
  const [currentStep, setCurrentStep] = useState(-1);
  const [stepComplete, setStepComplete] = useState(false);
  const fullText = '› ESTABLISHING_SECURE_UPLINK...';

  useEffect(() => {
    let i = 0;
    const typingInterval = setInterval(() => {
      setDisplayText(fullText.slice(0, i));
      i++;
      if (i > fullText.length) {
        clearInterval(typingInterval);
        setTimeout(() => startStepper(), 400);
      }
    }, 50);
    return () => clearInterval(typingInterval);
  }, []);

  const startStepper = () => {
    let step = 0;
    setCurrentStep(0);
    const stepInterval = setInterval(() => {
      step++;
      if (step >= STEPS.length) {
        clearInterval(stepInterval);
        setStepComplete(true);
        setTimeout(onComplete, 600);
      } else {
        setCurrentStep(step);
      }
    }, 900);
  };

  const progressPercent = currentStep >= 0
    ? ((currentStep + 1) / STEPS.length) * 100
    : 0;

  return (
    <View style={styles.container}>
      {/* Flip Logo */}
    <Image 
  source={require('../assets/images/logo.png')}// MAKE SURE THIS PATH MATCHES YOUR ASSETS FOLDER
  style={styles.actualLogo} 
/>
      <Text style={styles.logoSub}>PRICING INTELLIGENCE</Text>

      <View style={styles.terminalBox}>
        {/* Typing text */}
        <Text style={styles.typingText}>
          {displayText}
          <Text style={styles.cursor}>█</Text>
        </Text>

        {/* Stepper */}
        {currentStep >= 0 && (
          <View style={styles.stepperContainer}>
            <View style={styles.stepLabels}>
              {STEPS.map((step, index) => (
                <Text
                  key={step}
                  style={[
                    styles.stepLabel,
                    index <= currentStep && styles.stepLabelActive,
                  ]}
                >
                  {index < currentStep ? '✓' : index === currentStep ? '›' : '·'} {step}
                </Text>
              ))}
            </View>

            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${progressPercent}%` },
                  stepComplete && styles.progressComplete,
                ]}
              />
            </View>

            <Text style={styles.progressText}>
              {stepComplete ? 'ACCESS GRANTED' : `[ ${STEPS[currentStep]} ]`}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  logo: {
    color: '#fff',
    fontSize: 52,
    fontStyle: 'italic',
    fontFamily: 'serif',
    letterSpacing: -1,
    marginBottom: 4,
  },
  logoSub: {
    color: '#333',
    fontSize: 10,
    fontFamily: 'monospace',
    letterSpacing: 6,
    marginBottom: 60,
  },
  terminalBox: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#1a1a1a',
    backgroundColor: '#050505',
    padding: 20,
    borderRadius: 2,
  },
  typingText: {
    color: '#10b981',
    fontFamily: 'monospace',
    fontSize: 13,
    marginBottom: 24,
    minHeight: 20,
  },
  actualLogo: {width: 120, height: 40, resizeMode: 'contain', marginBottom: 10 },

  cursor: {
    color: '#10b981',
    opacity: 0.8,
  },
  stepperContainer: {
    marginTop: 8,
  },
  stepLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  stepLabel: {
    color: '#222',
    fontFamily: 'monospace',
    fontSize: 9,
    letterSpacing: 1,
  },
  stepLabelActive: {
    color: '#10b981',
  },
  progressBarBg: {
    height: 2,
    backgroundColor: '#111',
    width: '100%',
    marginBottom: 10,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10b981',
  },
  progressComplete: {
    backgroundColor: '#fff',
  },
  progressText: {
    color: '#333',
    fontFamily: 'monospace',
    fontSize: 9,
    letterSpacing: 2,
    textAlign: 'right',
  },
});
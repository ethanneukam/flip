import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';

export default function TextPressureTitle({ value }: { value: string }) {
  const scale = useRef(new Animated.Value(1)).current;
  const shake = useRef(new Animated.Value(0)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pressure = 1 + value.length * 0.018;
    const shouldShake = value.length > 6;
    const glowTarget = Math.min(value.length / 12, 1);

    Animated.parallel([
      Animated.spring(scale, {
        toValue: pressure,
        useNativeDriver: true,
        tension: 120,
        friction: 8,
      }),
      Animated.timing(glowOpacity, {
        toValue: glowTarget,
        duration: 150,
        useNativeDriver: true,
      }),
      ...(shouldShake
        ? [
            Animated.sequence([
              Animated.timing(shake, {
                toValue: 3,
                duration: 40,
                useNativeDriver: true,
              }),
              Animated.timing(shake, {
                toValue: -3,
                duration: 40,
                useNativeDriver: true,
              }),
              Animated.timing(shake, {
                toValue: 0,
                duration: 40,
                useNativeDriver: true,
              }),
            ]),
          ]
        : []),
    ]).start();
  }, [value]);

  return (
    <Animated.Text
      style={[
        styles.title,
        {
          transform: [{ scale }, { translateX: shake }],
          fontWeight: value.length > 8 ? '900' : value.length > 4 ? '700' : '400',
          opacity: Animated.add(
            new Animated.Value(0.6),
            Animated.multiply(glowOpacity, new Animated.Value(0.4))
          ),
        },
      ]}
    >
      FLIP_OS
    </Animated.Text>
  );
}

const styles = StyleSheet.create({
  title: {
    color: '#fff',
    fontSize: 28,
    fontFamily: 'monospace',
    textAlign: 'center',
    marginBottom: 40,
    letterSpacing: 4,
  },
});
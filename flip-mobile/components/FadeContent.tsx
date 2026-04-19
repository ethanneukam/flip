import React, { useEffect, useRef } from 'react';
import { Animated, ViewStyle } from 'react-native';

interface FadeContentProps {
  children: React.ReactNode;
  duration?: number;
  delay?: number;
  initialOpacity?: number;
  style?: ViewStyle;
  slideUp?: boolean;
}

export default function FadeContent({
  children,
  duration = 1000,
  delay = 0,
  initialOpacity = 0,
  style,
  slideUp = false,
}: FadeContentProps) {
  // Animated value for opacity
  const fadeAnim = useRef(new Animated.Value(initialOpacity)).current;
  // Animated value for a slight "slide up" effect
  const slideAnim = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: duration,
        delay: delay,
        useNativeDriver: true, // Crucial for performance
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: duration,
        delay: delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim, duration, delay]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}
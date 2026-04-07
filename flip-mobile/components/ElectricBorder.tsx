import React from 'react';
import { View, TextInput, StyleSheet, TextInputProps } from 'react-native';
import Animated, { useSharedValue, withRepeat, withTiming, interpolateColor } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

interface ElectricBorderInputProps extends TextInputProps {
  color?: string;
  thickness?: number;
  borderRadius?: number;
}

export default function ElectricBorderInput({
  color = '#7df9ff',
  thickness = 2,
  borderRadius = 16,
  style,
  ...props
}: ElectricBorderInputProps) {
  // Shared value to animate the gradient along the border
  const anim = useSharedValue(0);
  anim.value = withRepeat(
    withTiming(1, { duration: 1500 }),
    -1,
    true
  );

  const animatedStyle = {
    borderColor: color,
    borderWidth: thickness,
    borderRadius,
    shadowColor: color,
    shadowOpacity: 0.7,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  };

  return (
    <Animated.View style={[styles.wrapper, animatedStyle]}>
  <LinearGradient
    colors={[color, 'transparent', color]}
    start={{ x: 0, y: 0 }}
    end={{ x: 1, y: 1 }}
    style={[StyleSheet.absoluteFillObject, { borderRadius }]}
  />
  <TextInput
    {...props}
    style={[styles.input, style, { borderRadius }]} // <- style goes here
    placeholderTextColor="#333"
  />
</Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    overflow: 'hidden',
  },
  input: {
    padding: 12,
    color: '#fff',
    backgroundColor: '#000', // dark terminal look
  },
});
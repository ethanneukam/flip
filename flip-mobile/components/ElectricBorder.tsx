import React, { useEffect } from 'react';
import { View, TextInput, StyleSheet, TextInputProps } from 'react-native';
import Animated, { useSharedValue, withTiming, withRepeat, useAnimatedStyle, interpolate } from 'react-native-reanimated';

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
  const anim = useSharedValue(0);

  useEffect(() => {
    anim.value = withRepeat(withTiming(1, { duration: 1500 }), -1, true);
  }, []);

  // Animated border glow style
  const glowStyle = useAnimatedStyle(() => {
    const opacity = interpolate(anim.value, [0, 0.5, 1], [0.4, 1, 0.4]);
    return {
      shadowOpacity: opacity,
      shadowColor: color,
      shadowRadius: thickness * 2,
      shadowOffset: { width: 0, height: 0 },
    };
  });

  return (
    <Animated.View
      style={[
        {
          borderRadius,
          padding: thickness,
          backgroundColor: 'transparent',
        },
        glowStyle,
        style,
      ]}
    >
      <View
        style={{
          borderRadius,
          borderWidth: thickness,
          borderColor: color,
          overflow: 'hidden',
        }}
      >
        <TextInput
          {...props}
          style={[
            {
              backgroundColor: '#080808', // terminal dark look
              color: '#fff',
              padding: 15,
              borderRadius: borderRadius - thickness,
            },
          ]}
          placeholderTextColor="#333"
        />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({});
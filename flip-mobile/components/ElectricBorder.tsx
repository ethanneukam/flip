import React, { useEffect } from 'react';
import { View, TextInput, StyleSheet, TextInputProps, ViewStyle, StyleProp } from 'react-native'; // Added ViewStyle and StyleProp
import Animated, { useSharedValue, withTiming, withRepeat, useAnimatedStyle, interpolate } from 'react-native-reanimated';

interface ElectricBorderInputProps extends Omit<TextInputProps, 'style'> {
  color?: string;
  thickness?: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>; // Explicitly define style as ViewStyle for the container
  inputStyle?: StyleProp<any>;  // Optional: add this if you want to style the text inside separately
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
        style, // Now TypeScript knows this is a ViewStyle!
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
              backgroundColor: '#080808',
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
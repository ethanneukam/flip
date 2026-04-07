import React from 'react';
import { View, StyleSheet, PanResponder, GestureResponderEvent, PanResponderGestureState } from 'react-native';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, interpolate, Extrapolate } from 'react-native-reanimated';

export default function EliteDock({ state, descriptors, navigation }: BottomTabBarProps) {
  // Shared value for finger X position
  const fingerX = useSharedValue(-1000); // offscreen default

  // PanResponder to track finger movements
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderGrant: (evt: GestureResponderEvent) => {
      fingerX.value = evt.nativeEvent.locationX;
    },
    onPanResponderMove: (evt: GestureResponderEvent) => {
      fingerX.value = evt.nativeEvent.locationX;
    },
    onPanResponderRelease: (evt: GestureResponderEvent, statePan: PanResponderGestureState) => {
      fingerX.value = -1000; // reset offscreen
    },
  });

  return (
    <View style={styles.wrapper}>
  <BlurView intensity={40} tint="dark" style={styles.container} {...panResponder.panHandlers}>
    {state.routes.map((route, index) => {
      const { options } = descriptors[route.key];
      const isFocused = state.index === index;

      const iconX = useSharedValue(0);

      const animatedStyle = useAnimatedStyle(() => {
        const distance = Math.abs(fingerX.value - iconX.value);
        const scale = interpolate(distance, [0, 80], [1.5, 1], Extrapolate.CLAMP);
        const translateY = interpolate(distance, [0, 80], [-10, 0], Extrapolate.CLAMP);
        return {
          transform: [{ scale: withSpring(scale) }, { translateY: withSpring(translateY) }],
        };
      });

      const onLayout = (evt: any) => {
        iconX.value = evt.nativeEvent.layout.x + evt.nativeEvent.layout.width / 2;
      };

      const onPress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        navigation.navigate(route.name);
      };

      return (
        <Animated.View key={route.key} onLayout={onLayout} style={styles.itemWrapper}>
          {isFocused && <View style={styles.activeDot} />}
          <Animated.View style={[styles.iconBox, animatedStyle]} onTouchEnd={onPress}>
            {options.tabBarIcon?.({
              focused: isFocused,
              color: isFocused ? '#fff' : '#aaa',
              size: 28,
            })}
          </Animated.View>
        </Animated.View>
      );
    })}
  </BlurView>
</View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 25,
    width: '100%',
    alignItems: 'center',
  },
  container: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  itemWrapper: {
    alignItems: 'center',
    marginHorizontal: 14,
  },
  iconBox: {
    padding: 10,
    borderRadius: 14,
  },
  activeDot: {
    position: 'absolute',
    top: -6,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#fff',
  },
});
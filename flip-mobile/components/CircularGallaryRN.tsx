import React, { JSX } from 'react';
import { View, Dimensions, Image, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  interpolate,
  Extrapolation,
  SharedValue,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = 120;
const CARD_SPACING = 20;
const STEP = CARD_WIDTH + CARD_SPACING;

interface GalleryItem {
  id: string;
  title: string;
  image_url?: string;
  renderContent?: () => JSX.Element;
}

interface CircularGalleryProps {
  items: GalleryItem[];
  bend?: number;
  scrollSpeed?: number;
  scrollEase?: number;
  borderRadius?: number;
  textColor?: string;
}

// ── Each card is its own component so useAnimatedStyle is called at top level ──
interface CardProps {
  item: GalleryItem;
  index: number;
  translateX: SharedValue<number>;  // ✅ Reanimated v3 type
}

function GalleryCard({ item, index, translateX }: CardProps) {
  const style = useAnimatedStyle(() => {
    const center = SCREEN_WIDTH / 2 - CARD_WIDTH / 2;
    const x = index * STEP + translateX.value;
    const offset = x - center;

    const rotateY = interpolate(
      offset,
      [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
      [50, 0, -50],
      Extrapolation.CLAMP
    );
    const scale = interpolate(
      offset,
      [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
      [0.75, 1, 0.75],
      Extrapolation.CLAMP
    );
    const opacity = interpolate(
      offset,
      [-SCREEN_WIDTH / 1.2, 0, SCREEN_WIDTH / 1.2],
      [0.3, 1, 0.3],
      Extrapolation.CLAMP
    );

    return {
      transform: [
        { perspective: 900 },
        { translateX: x },
        { rotateY: `${rotateY}deg` },
        { scale },
      ],
      opacity,
      zIndex: Math.round(scale * 10),
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: CARD_WIDTH,
          height: 180,
          borderRadius: 10,
          overflow: 'hidden',
          backgroundColor: '#111',
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      {item.renderContent ? (
        item.renderContent()
      ) : item.image_url ? (
        <Image
          source={{ uri: item.image_url }}
          style={{ width: '100%', height: '100%', opacity: 0.9 }}
          resizeMode="cover"
        />
      ) : (
        <Text style={{ color: '#363535', fontSize: 12, fontFamily: 'monospace' }}>
          {item.title}
        </Text>
      )}
    </Animated.View>
  );
}

// ── Main gallery ──
export default function CircularGallaryRN({ items, scrollSpeed = 1 }: CircularGalleryProps) {
  const translateX = useSharedValue(SCREEN_WIDTH / 2 - CARD_WIDTH / 2);
  const startX = useSharedValue(0); // ✅ store drag start as a shared value (stays on UI thread)

  const pan = Gesture.Pan()
    .onBegin(() => {
      startX.value = translateX.value;
    })
    .onUpdate((event) => {
      translateX.value = startX.value + event.translationX * scrollSpeed;
    });

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={{ height: 250, justifyContent: 'center', alignItems: 'center' }}>
        {items.map((item, index) => (
          <GalleryCard
            key={item.id}
            item={item}
            index={index}
            translateX={translateX}
          />
        ))}
      </Animated.View>
    </GestureDetector>
  );
}
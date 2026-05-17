import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Modal,
  Animated,
  ScrollView,
  Dimensions,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import {
  type FeedSortMode,
  FEED_SORT_MODES,
  FEED_SORT_LABELS,
  FEED_MODE_HEADLINE,
} from '../../lib/feedRankingEngine';

export type FeedSortDropdownProps = {
  value: FeedSortMode;
  onChange: (mode: FeedSortMode) => void;
  /** Increment or change from parent to force-close (e.g. outer scroll). */
  collapseSignal?: number;
};

export default function FeedSortDropdown({ value, onChange, collapseSignal = 0 }: FeedSortDropdownProps) {
  const [open, setOpen] = useState(false);
  const anim = useRef(new Animated.Value(0)).current;
  const lastCollapse = useRef(collapseSignal);

  useEffect(() => {
    if (collapseSignal !== lastCollapse.current) {
      lastCollapse.current = collapseSignal;
      if (open) {
        setOpen(false);
        Animated.timing(anim, { toValue: 0, duration: 140, useNativeDriver: true }).start();
      }
    }
  }, [collapseSignal, open, anim]);

  const openMenu = useCallback(() => {
    setOpen(true);
    Animated.spring(anim, { toValue: 1, useNativeDriver: true, friction: 9 }).start();
  }, [anim]);

  const closeMenu = useCallback(() => {
    Animated.timing(anim, { toValue: 0, duration: 160, useNativeDriver: true }).start(({ finished }) => {
      if (finished) setOpen(false);
    });
  }, [anim]);

  const select = useCallback(
    (m: FeedSortMode) => {
      if (m !== value) {
        void Haptics.selectionAsync();
        onChange(m);
      }
      closeMenu();
    },
    [value, onChange, closeMenu]
  );

  const headline = useMemo(() => FEED_MODE_HEADLINE[value], [value]);

  const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [-6, 0] });

  const menuTop = Math.round(Dimensions.get('window').height * 0.12);

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          if (open) closeMenu();
          else openMenu();
        }}
        style={({ pressed }) => [styles.trigger, pressed && styles.triggerPressed]}
        accessibilityRole="button"
        accessibilityLabel="Feed sort mode"
      >
        <View style={styles.triggerRow}>
          <Text style={styles.triggerLabel}>{FEED_SORT_LABELS[value].toUpperCase()}</Text>
          <Text style={styles.chevron}>{open ? '▲' : '▼'}</Text>
        </View>
        <Text style={styles.headline}>{headline}</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="none" onRequestClose={closeMenu}>
        <Pressable style={styles.modalBackdrop} onPress={closeMenu}>
          <Animated.View
            style={[
              styles.menuShell,
              {
                opacity,
                transform: [{ translateY }],
                marginTop: menuTop,
              },
            ]}
          >
            <Pressable onPress={(e) => e.stopPropagation()}>
              <Text style={styles.menuTitle}>SORT_SURFACE</Text>
              <ScrollView style={styles.menuScroll} keyboardShouldPersistTaps="handled" nestedScrollEnabled>
                {FEED_SORT_MODES.map((m) => (
                  <Pressable
                    key={m}
                    onPress={() => select(m)}
                    style={({ pressed }) => [
                      styles.option,
                      m === value && styles.optionActive,
                      pressed && styles.optionPressed,
                    ]}
                  >
                    <Text style={[styles.optionText, m === value && styles.optionTextActive]}>
                      {FEED_SORT_LABELS[m]}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </Pressable>
          </Animated.View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 10,
  },
  trigger: {
    borderWidth: 1,
    borderColor: '#2a2a2a',
    backgroundColor: '#0c0c0c',
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  triggerPressed: {
    borderColor: '#00FF87',
  },
  triggerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  triggerLabel: {
    color: '#cccccc',
    fontFamily: 'monospace',
    fontSize: 11,
    letterSpacing: 2,
  },
  chevron: {
    color: '#00FF87',
    fontSize: 10,
    marginLeft: 8,
  },
  headline: {
    marginTop: 6,
    color: '#00FF87',
    fontFamily: 'monospace',
    fontSize: 10,
    letterSpacing: 2,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    paddingHorizontal: 12,
  },
  menuShell: {
    alignSelf: 'stretch',
    maxHeight: 340,
    borderWidth: 1,
    borderColor: '#1f3d2a',
    backgroundColor: '#0a0f0c',
    borderRadius: 6,
    overflow: 'hidden',
  },
  menuTitle: {
    color: '#557766',
    fontFamily: 'monospace',
    fontSize: 9,
    letterSpacing: 3,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 4,
  },
  menuScroll: {
    maxHeight: 280,
  },
  option: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#1a1a1a',
  },
  optionActive: {
    backgroundColor: '#102218',
  },
  optionPressed: {
    backgroundColor: '#152a1f',
  },
  optionText: {
    color: '#aaaaaa',
    fontFamily: 'monospace',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  optionTextActive: {
    color: '#00FF87',
  },
});

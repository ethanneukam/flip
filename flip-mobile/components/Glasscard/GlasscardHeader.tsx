import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import type { GlasscardData, GlasscardConfidenceTier } from '../../types/models';
import { confidenceTierLabel, confidenceTierColor } from './utils';

type Props = {
  data: GlasscardData;
  compact?: boolean;
};

const CATEGORY_ICONS: Record<string, string> = {
  sneakers: '👟',
  electronics: '📱',
  collectibles: '🃏',
  clothing: '👕',
  accessories: '⌚',
  toys: '🧸',
  books: '📚',
  sports: '⚽',
  automotive: '🔧',
  home: '🏠',
  other: '📦',
};

export default function GlasscardHeader({ data, compact }: Props) {
  const categoryIcon = CATEGORY_ICONS[data.category?.toLowerCase()] ?? '📦';
  const tier = data.market?.confidence_tier ?? null;
  const tierLabel = confidenceTierLabel(tier);
  const tierColor = confidenceTierColor(tier);
  const isPulsing = tier === null;

  return (
    <View style={compact ? styles.containerCompact : styles.container}>
      {/* Image */}
      <View style={compact ? styles.imageWrapperCompact : styles.imageWrapper}>
        {data.image_url ? (
          <Image
            source={{ uri: data.image_url }}
            style={compact ? styles.imageCompact : styles.image}
            resizeMode="cover"
          />
        ) : (
          <View style={[compact ? styles.imageCompact : styles.image, styles.placeholder]}>
            <Text style={styles.placeholderIcon}>{categoryIcon}</Text>
          </View>
        )}
      </View>

      {/* Identity */}
      <View style={styles.identity}>
        <Text
          style={compact ? styles.titleCompact : styles.title}
          numberOfLines={compact ? 1 : 2}
        >
          {data.title}
        </Text>

        {!compact && (
          <View style={styles.metaRow}>
            {/* Category pill */}
            <View style={styles.pill}>
              <Text style={styles.pillText}>{data.category.toUpperCase()}</Text>
            </View>

            {/* Condition */}
            <View style={styles.pill}>
              <Text style={styles.pillText}>
                {data.condition
                  ? data.condition.toUpperCase()
                  : 'INFERRED BY AI'}
              </Text>
            </View>
          </View>
        )}

        {/* Confidence indicator */}
        <View style={styles.confidenceRow}>
          <View style={[styles.confidenceDot, { backgroundColor: tierColor }, isPulsing && styles.pulsing]} />
          <Text style={[styles.confidenceLabel, { color: tierColor }]}>
            {tierLabel}
          </Text>
          {data.ai_confidence !== null && (
            <Text style={styles.confidencePercent}>
              {Math.round(data.ai_confidence)}%
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 16 },
  containerCompact: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  imageWrapper: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    backgroundColor: '#141414',
  },
  imageWrapperCompact: {
    width: 64,
    height: 64,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#141414',
  },
  image: { width: '100%', height: '100%' },
  imageCompact: { width: 64, height: 64 },
  placeholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
  },
  placeholderIcon: { fontSize: 32 },
  identity: { flex: 1 },
  title: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  titleCompact: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  metaRow: { flexDirection: 'row', gap: 6, marginBottom: 8, flexWrap: 'wrap' },
  pill: {
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  pillText: {
    color: '#9CA3AF',
    fontSize: 10,
    letterSpacing: 1,
  },
  confidenceRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  confidenceDot: { width: 6, height: 6, borderRadius: 3 },
  pulsing: { opacity: 0.6 },
  confidenceLabel: { fontSize: 11 },
  confidencePercent: { color: '#4B5563', fontSize: 10 },
});

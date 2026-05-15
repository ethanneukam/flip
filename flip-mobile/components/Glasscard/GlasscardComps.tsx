import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { sourceColor, formatUSD } from './utils';

type Comp = {
  source: string;
  price: number;
  url: string;
};

type Props = {
  comps: Comp[] | null;
};

export default function GlasscardComps({ comps }: Props) {
  if (!comps || comps.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>COMPARABLE SOURCES</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {comps.map((comp, i) => {
          const accent = sourceColor(comp.source);
          return (
            <TouchableOpacity
              key={`${comp.source}-${i}`}
              style={[styles.pill, { borderColor: accent }]}
              onPress={() => Linking.openURL(comp.url)}
              activeOpacity={0.7}
            >
              <Text style={[styles.pillSource, { color: accent }]}>{comp.source}</Text>
              <Text style={styles.pillPrice}>{formatUSD(comp.price)}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 12 },
  label: { color: '#4B5563', fontSize: 10, letterSpacing: 2, marginBottom: 8 },
  scroll: { gap: 8 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#141414',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  pillSource: { fontSize: 11, fontWeight: 'bold' },
  pillPrice: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
});

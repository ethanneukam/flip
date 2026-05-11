import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ActivityIndicator, ScrollView } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { supabase } from '../../lib/supabase';

type FlipItemRow = {
  id: string;
  title: string;
  category: string;
  subcategory: string | null;
  brand: string | null;
  model: string | null;
  condition: string;
  ai_confidence: number;
  image_urls: string[];
  created_at: string;
};

type MarketSignalRow = {
  avg_price: number;
  low_price: number;
  high_price: number;
  recommended_price: number;
  demand_score: number;
  supply_score: number;
  flip_score: number;
  velocity: string;
  trend_direction: string;
  trend_percent: number;
  low_confidence: boolean;
  confidence_reason: string;
  data_points_used: number;
};

export default function ResultScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [item, setItem] = useState<FlipItemRow | null>(null);
  const [signal, setSignal] = useState<MarketSignalRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    loadItem(id);
  }, [id]);

  useEffect(() => {
    if (!id || signal) return;
    const interval = setInterval(() => pollSignal(id), 3000);
    return () => clearInterval(interval);
  }, [id, signal]);

  const loadItem = async (flipItemId: string) => {
    const { data } = await supabase
      .from('flip_items')
      .select('id, title, category, subcategory, brand, model, condition, ai_confidence, image_urls, created_at')
      .eq('id', flipItemId)
      .single();

    if (data) setItem(data);
    setLoading(false);

    pollSignal(flipItemId);
  };

  const pollSignal = async (flipItemId: string) => {
    const { data } = await supabase
      .from('market_signals')
      .select('avg_price, low_price, high_price, recommended_price, demand_score, supply_score, flip_score, velocity, trend_direction, trend_percent, low_confidence, confidence_reason, data_points_used')
      .eq('flip_item_id', flipItemId)
      .single();

    if (data) setSignal(data);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color="#00FF87" size="large" />
        <Text style={styles.loadingText}>LOADING_ITEM...</Text>
      </View>
    );
  }

  if (!item) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>ITEM_NOT_FOUND</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Item Identity */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>ITEM_IDENTITY</Text>
        <Text style={styles.itemTitle}>{item.title}</Text>
        <Text style={styles.itemMeta}>
          {item.category.toUpperCase()}
          {item.subcategory ? ` · ${item.subcategory.toUpperCase()}` : ''}
          {item.brand ? ` · ${item.brand}` : ''}
        </Text>
        <View style={styles.badgeRow}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{item.condition.toUpperCase()}</Text>
          </View>
          <View style={[styles.badge, styles.badgeAccent]}>
            <Text style={styles.badgeTextAccent}>{item.ai_confidence}% AI</Text>
          </View>
        </View>
      </View>

      {/* Market Signal */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>MARKET_INTELLIGENCE</Text>
        {!signal ? (
          <View style={styles.signalLoading}>
            <ActivityIndicator color="#00FF87" size="small" />
            <Text style={styles.signalLoadingText}>Computing market signal...</Text>
          </View>
        ) : (
          <View style={styles.signalGrid}>
            <View style={styles.signalRow}>
              <Text style={styles.signalLabel}>AVG_PRICE</Text>
              <Text style={styles.signalValue}>${signal.avg_price.toFixed(2)}</Text>
            </View>
            <View style={styles.signalRow}>
              <Text style={styles.signalLabel}>RANGE</Text>
              <Text style={styles.signalValue}>
                ${signal.low_price.toFixed(2)} – ${signal.high_price.toFixed(2)}
              </Text>
            </View>
            <View style={styles.signalRow}>
              <Text style={styles.signalLabel}>RECOMMENDED</Text>
              <Text style={[styles.signalValue, { color: '#00FF87' }]}>
                ${signal.recommended_price.toFixed(2)}
              </Text>
            </View>
            <View style={styles.signalRow}>
              <Text style={styles.signalLabel}>FLIP_SCORE</Text>
              <Text style={[styles.signalValue, { color: signal.flip_score >= 70 ? '#00FF87' : signal.flip_score >= 40 ? '#FFAA00' : '#FF4444' }]}>
                {signal.flip_score}
              </Text>
            </View>
            <View style={styles.signalRow}>
              <Text style={styles.signalLabel}>TREND</Text>
              <Text style={[styles.signalValue, { color: signal.trend_direction === 'up' ? '#00FF87' : signal.trend_direction === 'down' ? '#FF4444' : '#888888' }]}>
                {signal.trend_direction === 'up' ? '↑' : signal.trend_direction === 'down' ? '↓' : '→'} {signal.trend_percent.toFixed(1)}%
              </Text>
            </View>
            <View style={styles.signalRow}>
              <Text style={styles.signalLabel}>DEMAND</Text>
              <Text style={styles.signalValue}>{signal.demand_score}</Text>
            </View>
            <View style={styles.signalRow}>
              <Text style={styles.signalLabel}>VELOCITY</Text>
              <Text style={styles.signalValue}>{signal.velocity.toUpperCase()}</Text>
            </View>
            {signal.low_confidence && (
              <View style={styles.confidenceBadge}>
                <Text style={styles.confidenceText}>
                  ⚠ {signal.confidence_reason === 'ai_estimate_only'
                    ? 'AI estimate — limited market data'
                    : signal.confidence_reason === 'category_baseline'
                    ? 'Based on category averages'
                    : 'Based on verified market data'}
                </Text>
              </View>
            )}
          </View>
        )}
      </View>

      {/* Placeholder for prediction buttons + actions (Phase 6) */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>PREDICTION</Text>
        <Text style={styles.comingSoon}>Prediction recording available after full implementation</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#080808' },
  content: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 120 },
  loadingContainer: { flex: 1, backgroundColor: '#080808', justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#888888', fontFamily: 'monospace', fontSize: 12, marginTop: 12 },
  errorText: { color: '#FF4444', fontFamily: 'monospace', fontSize: 14 },
  section: { marginBottom: 28 },
  sectionLabel: { color: '#888888', fontFamily: 'monospace', fontSize: 10, letterSpacing: 3, marginBottom: 12 },
  itemTitle: { color: '#FFFFFF', fontFamily: 'monospace', fontSize: 22, fontWeight: 'bold', marginBottom: 8 },
  itemMeta: { color: '#AAAAAA', fontFamily: 'monospace', fontSize: 11, letterSpacing: 1 },
  badgeRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  badge: { backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#2A2A2A', borderRadius: 2, paddingHorizontal: 8, paddingVertical: 4 },
  badgeAccent: { borderColor: '#00FF87' },
  badgeText: { color: '#AAAAAA', fontFamily: 'monospace', fontSize: 10 },
  badgeTextAccent: { color: '#00FF87', fontFamily: 'monospace', fontSize: 10 },
  signalLoading: { backgroundColor: '#111111', borderRadius: 4, padding: 24, alignItems: 'center' },
  signalLoadingText: { color: '#888888', fontFamily: 'monospace', fontSize: 11, marginTop: 8 },
  signalGrid: { backgroundColor: '#111111', borderWidth: 1, borderColor: '#2A2A2A', borderRadius: 4, padding: 16 },
  signalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#1A1A1A' },
  signalLabel: { color: '#888888', fontFamily: 'monospace', fontSize: 10, letterSpacing: 1 },
  signalValue: { color: '#FFFFFF', fontFamily: 'monospace', fontSize: 14, fontWeight: 'bold' },
  confidenceBadge: { backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#FFAA00', borderRadius: 2, padding: 8, marginTop: 12 },
  confidenceText: { color: '#FFAA00', fontFamily: 'monospace', fontSize: 10 },
  comingSoon: { color: '#888888', fontFamily: 'monospace', fontSize: 11, fontStyle: 'italic' },
});

import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, ActivityIndicator } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';

type PortfolioItem = {
  id: string;
  flip_item_id: string;
  cost_basis: number;
  estimated_value: number;
  status: string;
  added_at: string;
  flip_items: {
    title: string;
    category: string;
    condition: string;
  };
  market_signals: {
    recommended_price: number;
  } | null;
};

export default function PortfolioScreen() {
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadPortfolio = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from('portfolio_entries')
        .select('id, flip_item_id, cost_basis, estimated_value, status, added_at, flip_items(title, category, condition), market_signals:flip_item_id(recommended_price)')
        .eq('user_id', user.id)
        .order('added_at', { ascending: false });

      if (data) setItems(data as unknown as PortfolioItem[]);
    } catch (err) {
      console.error('Portfolio load error:', err);
    }
    setLoading(false);
  };

  useFocusEffect(
    useCallback(() => {
      loadPortfolio();
    }, [])
  );

  const getLiveValue = (item: PortfolioItem): number => {
    if (item.market_signals?.recommended_price) {
      return Number(item.market_signals.recommended_price);
    }
    return Number(item.estimated_value);
  };

  const totalValue = items.reduce((sum, item) => sum + getLiveValue(item), 0);
  const totalCost = items.reduce((sum, item) => sum + Number(item.cost_basis), 0);
  const totalChange = totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : 0;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.headerLabel}>PORTFOLIO</Text>

        {/* Total Value Header */}
        <View style={styles.totalSection}>
          <Text style={styles.totalLabel}>ESTIMATED_VALUE</Text>
          <Text style={styles.totalValue}>${totalValue.toFixed(2)}</Text>
          {totalCost > 0 && (
            <Text style={[styles.totalChange, { color: totalChange >= 0 ? '#00FF87' : '#FF4444' }]}>
              {totalChange >= 0 ? '+' : ''}{totalChange.toFixed(1)}%
            </Text>
          )}
        </View>

        {loading ? (
          <ActivityIndicator color="#00FF87" style={{ marginTop: 40 }} />
        ) : items.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              Start scanning items to build your market profile
            </Text>
          </View>
        ) : (
          items.map((item) => {
            const liveValue = getLiveValue(item);
            const change = Number(item.cost_basis) > 0
              ? ((liveValue - Number(item.cost_basis)) / Number(item.cost_basis)) * 100
              : 0;
            return (
              <View key={item.id} style={styles.itemCard}>
                <View style={styles.itemLeft}>
                  <Text style={styles.itemTitle} numberOfLines={1}>
                    {item.flip_items?.title ?? 'Unknown'}
                  </Text>
                  <Text style={styles.itemMeta}>
                    {item.flip_items?.category?.toUpperCase() ?? ''} · {item.status.toUpperCase()}
                  </Text>
                </View>
                <View style={styles.itemRight}>
                  <Text style={styles.itemValue}>${liveValue.toFixed(2)}</Text>
                  <Text style={[styles.itemChange, { color: change >= 0 ? '#00FF87' : '#FF4444' }]}>
                    {change >= 0 ? '+' : ''}{change.toFixed(1)}%
                  </Text>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#080808' },
  content: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 120 },
  headerLabel: { color: '#888888', fontFamily: 'monospace', fontSize: 10, letterSpacing: 4, marginBottom: 24 },
  totalSection: { backgroundColor: '#111111', borderWidth: 1, borderColor: '#2A2A2A', borderRadius: 4, padding: 24, marginBottom: 24, alignItems: 'center' },
  totalLabel: { color: '#888888', fontFamily: 'monospace', fontSize: 9, letterSpacing: 3, marginBottom: 8 },
  totalValue: { color: '#FFFFFF', fontFamily: 'monospace', fontSize: 32, fontWeight: 'bold' },
  totalChange: { fontFamily: 'monospace', fontSize: 14, marginTop: 4 },
  emptyState: { backgroundColor: '#111111', borderWidth: 1, borderColor: '#2A2A2A', borderRadius: 4, padding: 24, alignItems: 'center', marginTop: 20 },
  emptyText: { color: '#888888', fontFamily: 'monospace', fontSize: 12, textAlign: 'center', lineHeight: 18 },
  itemCard: { backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#2A2A2A', borderRadius: 4, padding: 16, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemLeft: { flex: 1, marginRight: 12 },
  itemTitle: { color: '#FFFFFF', fontFamily: 'monospace', fontSize: 13, fontWeight: 'bold' },
  itemMeta: { color: '#888888', fontFamily: 'monospace', fontSize: 9, marginTop: 4, letterSpacing: 1 },
  itemRight: { alignItems: 'flex-end' },
  itemValue: { color: '#FFFFFF', fontFamily: 'monospace', fontSize: 14, fontWeight: 'bold' },
  itemChange: { fontFamily: 'monospace', fontSize: 11, marginTop: 2 },
});

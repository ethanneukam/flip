import React, { useState, useCallback, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';

type PortfolioItemRow = {
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
  } | null;
};

type MarketSignalLookup = {
  flip_item_id: string;
  recommended_price: number;
  low_confidence: boolean;
};

export default function PortfolioScreen() {
  const router = useRouter();
  const [items, setItems] = useState<PortfolioItemRow[]>([]);
  const [signalMap, setSignalMap] = useState<Map<string, MarketSignalLookup>>(new Map());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useFocusEffect(
    useCallback(() => {
      mountedRef.current = true;
      loadPortfolio();
      return () => { mountedRef.current = false; };
    }, [])
  );

  const loadPortfolio = async () => {
    try {
      setError(null);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        if (mountedRef.current) { setLoading(false); setRefreshing(false); }
        return;
      }

      const { data: entries, error: entriesError } = await supabase
        .from('portfolio_entries')
        .select('id, flip_item_id, cost_basis, estimated_value, status, added_at, flip_items(title, category, condition)')
        .eq('user_id', user.id)
        .order('added_at', { ascending: false });

      if (entriesError) {
        throw new Error(entriesError.message);
      }

      const portfolioItems = (entries ?? []) as unknown as PortfolioItemRow[];

      if (portfolioItems.length > 0) {
        const flipItemIds = portfolioItems.map(e => e.flip_item_id);
        const { data: signals } = await supabase
          .from('market_signals')
          .select('flip_item_id, recommended_price, low_confidence')
          .in('flip_item_id', flipItemIds);

        if (signals && mountedRef.current) {
          const map = new Map<string, MarketSignalLookup>();
          for (const s of signals) {
            map.set(s.flip_item_id, s as MarketSignalLookup);
          }
          setSignalMap(map);
        }
      }

      if (mountedRef.current) {
        setItems(portfolioItems);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to load portfolio');
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadPortfolio();
  };

  const getLiveValue = (item: PortfolioItemRow): number => {
    const signal = signalMap.get(item.flip_item_id);
    if (signal && signal.recommended_price > 0) {
      return Number(signal.recommended_price);
    }
    return Number(item.estimated_value) || 0;
  };

  const isLowConfidence = (item: PortfolioItemRow): boolean => {
    const signal = signalMap.get(item.flip_item_id);
    return signal?.low_confidence ?? true;
  };

  const hasLiveSignal = (item: PortfolioItemRow): boolean => {
    return signalMap.has(item.flip_item_id);
  };

  const totalValue = items.reduce((sum, item) => sum + getLiveValue(item), 0);
  const totalCost = items.reduce((sum, item) => sum + (Number(item.cost_basis) || 0), 0);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color="#00FF87" size="large" />
        <Text style={styles.loadingText}>LOADING_PORTFOLIO...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#00FF87"
            colors={['#00FF87']}
          />
        }
      >
        <Text style={styles.headerLabel}>PORTFOLIO</Text>

        {/* Error State */}
        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>⚠ {error}</Text>
            <TouchableOpacity onPress={loadPortfolio}>
              <Text style={styles.retryText}>[ RETRY ]</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Total Value Header */}
        <View style={styles.totalSection}>
          <Text style={styles.totalLabel}>ESTIMATED_VALUE</Text>
          <Text style={styles.totalValue}>
            ${totalValue.toFixed(2)}
          </Text>
          {totalCost > 0 && (
            <Text style={styles.totalCostLine}>
              COST_BASIS ${totalCost.toFixed(2)}
            </Text>
          )}
          <Text style={styles.totalItemCount}>
            {items.length} {items.length === 1 ? 'item' : 'items'}
          </Text>
        </View>

        {/* Empty State */}
        {items.length === 0 && !error ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>◈</Text>
            <Text style={styles.emptyTitle}>NO_ASSETS_IN_PORTFOLIO</Text>
            <Text style={styles.emptyText}>
              Start scanning items to build your market profile
            </Text>
            <TouchableOpacity
              style={styles.emptyCta}
              onPress={() => router.push('/(tabs)/scanner')}
            >
              <Text style={styles.emptyCtaText}>[ SCAN_FIRST_ITEM ]</Text>
            </TouchableOpacity>
          </View>
        ) : (
          items.map((item) => {
            const liveValue = getLiveValue(item);
            const costBasis = Number(item.cost_basis) || 0;
            const lowConf = isLowConfidence(item);
            const hasSignal = hasLiveSignal(item);

            return (
              <TouchableOpacity
                key={item.id}
                style={styles.itemCard}
                onPress={() => router.push(`/(tabs)/result?id=${item.flip_item_id}`)}
                activeOpacity={0.7}
              >
                <View style={styles.itemLeft}>
                  <Text style={styles.itemTitle} numberOfLines={1}>
                    {item.flip_items?.title ?? 'Unknown Item'}
                  </Text>
                  <Text style={styles.itemMeta}>
                    {(item.flip_items?.category ?? 'other').toUpperCase()} · {item.status.toUpperCase()}
                  </Text>
                  {lowConf && (
                    <Text style={styles.lowConfIndicator}>⚠ Low confidence</Text>
                  )}
                </View>
                <View style={styles.itemRight}>
                  <Text style={styles.itemValue}>${liveValue.toFixed(2)}</Text>
                  {costBasis > 0 && (
                    <Text style={styles.itemCost}>COST ${costBasis.toFixed(2)}</Text>
                  )}
                  {!hasSignal && (
                    <Text style={styles.noSignalIndicator}>NO SIGNAL</Text>
                  )}
                </View>
              </TouchableOpacity>
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
  loadingContainer: { flex: 1, backgroundColor: '#080808', justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#888888', fontFamily: 'monospace', fontSize: 12, marginTop: 12 },
  headerLabel: { color: '#888888', fontFamily: 'monospace', fontSize: 10, letterSpacing: 4, marginBottom: 24 },
  errorBanner: { backgroundColor: 'rgba(255,68,68,0.1)', borderWidth: 1, borderColor: '#FF4444', borderRadius: 4, padding: 14, marginBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  errorText: { color: '#FF4444', fontFamily: 'monospace', fontSize: 10, flex: 1 },
  retryText: { color: '#FFFFFF', fontFamily: 'monospace', fontSize: 10, fontWeight: 'bold' },
  totalSection: { backgroundColor: '#111111', borderWidth: 1, borderColor: '#2A2A2A', borderRadius: 4, padding: 24, marginBottom: 24, alignItems: 'center' },
  totalLabel: { color: '#888888', fontFamily: 'monospace', fontSize: 9, letterSpacing: 3, marginBottom: 8 },
  totalValue: { color: '#FFFFFF', fontFamily: 'monospace', fontSize: 32, fontWeight: 'bold' },
  totalCostLine: { color: '#888888', fontFamily: 'monospace', fontSize: 11, marginTop: 6 },
  totalItemCount: { color: '#888888', fontFamily: 'monospace', fontSize: 10, marginTop: 8 },
  emptyState: { backgroundColor: '#111111', borderWidth: 1, borderColor: '#2A2A2A', borderRadius: 4, padding: 32, alignItems: 'center', marginTop: 20 },
  emptyIcon: { color: '#888888', fontSize: 32, marginBottom: 12 },
  emptyTitle: { color: '#AAAAAA', fontFamily: 'monospace', fontSize: 12, fontWeight: 'bold', letterSpacing: 2, marginBottom: 8 },
  emptyText: { color: '#888888', fontFamily: 'monospace', fontSize: 11, textAlign: 'center', lineHeight: 18 },
  emptyCta: { backgroundColor: '#00FF87', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 2, marginTop: 16 },
  emptyCtaText: { color: '#080808', fontFamily: 'monospace', fontSize: 10, fontWeight: 'bold' },
  itemCard: { backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#2A2A2A', borderRadius: 4, padding: 16, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemLeft: { flex: 1, marginRight: 12 },
  itemTitle: { color: '#FFFFFF', fontFamily: 'monospace', fontSize: 13, fontWeight: 'bold' },
  itemMeta: { color: '#888888', fontFamily: 'monospace', fontSize: 9, marginTop: 4, letterSpacing: 1 },
  lowConfIndicator: { color: '#FFAA00', fontFamily: 'monospace', fontSize: 8, marginTop: 4 },
  itemRight: { alignItems: 'flex-end' },
  itemValue: { color: '#FFFFFF', fontFamily: 'monospace', fontSize: 14, fontWeight: 'bold' },
  itemCost: { color: '#888888', fontFamily: 'monospace', fontSize: 9, marginTop: 4 },
  noSignalIndicator: { color: '#888888', fontFamily: 'monospace', fontSize: 8, marginTop: 2 },
});

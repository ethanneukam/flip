import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import * as Haptics from 'expo-haptics';
import { useOnboarding } from '../../hooks/useOnboarding';
import { useStreak } from '../../hooks/useStreak';
import OnboardingOverlay from '../../components/OnboardingOverlay';
import StreakCard from '../../components/StreakCard';
import ReengagementBanner from '../../components/ReengagementBanner';
import Glasscard from '../../components/Glasscard';
import type { GlasscardData, GlasscardMarketData, GlasscardSellerData } from '../../types/models';

const { width } = Dimensions.get('window');

type RecentItem = {
  id: string;
  title: string;
  category: string;
  condition: string;
  ai_confidence: number;
  created_at: string;
  user_id: string;
  image_urls: string[];
};

type FeedSignal = {
  flip_item_id: string;
  avg_price: number;
  recommended_price: number;
  low_price: number;
  high_price: number;
  demand_score: number;
  supply_score: number;
  confidence_reason: string;
};

export default function HomeScreen() {
  const router = useRouter();
  const [recentItems, setRecentItems] = useState<RecentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState<string | null>(null);
  const { state: onboardingState, isActive: showOnboarding, advanceTo, skip } = useOnboarding();
  const { streak, recordScan } = useStreak();
  const [resolvedPredictions, setResolvedPredictions] = useState<any[]>([]);
  const [feedSignals, setFeedSignals] = useState<Record<string, FeedSignal>>({});
  const [currentUserSeller, setCurrentUserSeller] = useState<GlasscardSellerData | null>(null);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      setUserName(user.email?.split('@')[0] ?? null);

      const { data: sellerRow } = await supabase
        .from('users')
        .select('id, username, avatar_url, rep_score, total_predictions, correct_predictions, scan_count')
        .eq('id', user.id)
        .single();

      if (sellerRow) setCurrentUserSeller(sellerRow);

      const { data: items } = await supabase
        .from('flip_items')
        .select('id, title, category, condition, ai_confidence, created_at, user_id, image_urls')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (items) {
        setRecentItems(items);

        const itemIds = items.map((i: RecentItem) => i.id);
        if (itemIds.length > 0) {
          const { data: signals } = await supabase
            .from('market_signals')
            .select('flip_item_id, avg_price, recommended_price, low_price, high_price, demand_score, supply_score, confidence_reason')
            .in('flip_item_id', itemIds);

          if (signals) {
            const map: Record<string, FeedSignal> = {};
            for (const s of signals) map[s.flip_item_id] = s as FeedSignal;
            setFeedSignals(map);
          }
        }
      }

      const { data: resolved } = await supabase
        .from('predictions')
        .select('flip_item_id, prediction_type, outcome, accuracy_delta, resolved_at, flip_items(title)')
        .eq('user_id', user.id)
        .eq('status', 'resolved')
        .order('resolved_at', { ascending: false })
        .limit(2);

      if (resolved) {
        setResolvedPredictions(resolved);
      }
    } catch (err) {
      console.error('Home load error:', err);
    }
    setLoading(false);
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const handleScanPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    recordScan();
    if (onboardingState === 'welcome') {
      advanceTo('camera_prompted');
    }
    router.push('/(tabs)/scanner');
  };

  const handleOnboardingNext = () => {
    if (onboardingState === 'welcome') advanceTo('camera_prompted');
    else if (onboardingState === 'camera_prompted') advanceTo('first_scan_done');
    else if (onboardingState === 'first_scan_done') advanceTo('first_save_done');
    else if (onboardingState === 'first_save_done') advanceTo('complete');
  };

  return (
    <View style={styles.container}>
      {showOnboarding && onboardingState && (
        <OnboardingOverlay
          state={onboardingState}
          onNext={handleOnboardingNext}
          onSkip={skip}
        />
      )}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerLabel}>FLIP_TERMINAL</Text>
          {userName && (
            <Text style={styles.headerUser}>› {userName.toUpperCase()}</Text>
          )}
        </View>

        {/* Scan CTA */}
        <TouchableOpacity
          style={styles.scanButton}
          onPress={handleScanPress}
          activeOpacity={0.8}
        >
          <View style={styles.scanButtonInner}>
            <Text style={styles.scanIcon}>⊙</Text>
            <Text style={styles.scanButtonText}>SCAN ITEM</Text>
            <Text style={styles.scanButtonSub}>AI identification + market valuation</Text>
          </View>
        </TouchableOpacity>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => router.push('/(tabs)/portfolio')}
          >
            <Text style={styles.quickActionIcon}>◈</Text>
            <Text style={styles.quickActionText}>PORTFOLIO</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => router.push('/(tabs)/leaderboard')}
          >
            <Text style={styles.quickActionIcon}>▲</Text>
            <Text style={styles.quickActionText}>RANKINGS</Text>
          </TouchableOpacity>
        </View>

        {/* Streak + Re-engagement */}
        <StreakCard
          currentStreak={streak.currentStreak}
          longestStreak={streak.longestStreak}
          todayCompleted={streak.todayCompleted}
        />

        {resolvedPredictions.length > 0 && (
          <View style={{ marginBottom: 12 }}>
            {resolvedPredictions.slice(0, 1).map((pred: any) => (
              <ReengagementBanner
                key={pred.flip_item_id}
                type="prediction_resolved"
                data={{
                  itemTitle: pred.flip_items?.title ?? 'Item',
                  outcome: pred.outcome,
                  delta: pred.accuracy_delta ? (Number(pred.accuracy_delta) * 100).toFixed(1) : '0',
                }}
                onPress={() => router.push(`/(tabs)/result?id=${pred.flip_item_id}`)}
              />
            ))}
          </View>
        )}

        {/* Recent Scans */}
        <View style={styles.recentSection}>
          <Text style={styles.sectionLabel}>RECENT_SCANS</Text>

          {loading ? (
            <ActivityIndicator color="#00FF87" style={{ marginTop: 20 }} />
          ) : recentItems.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>
                Scan your first item to start tracking market value
              </Text>
            </View>
          ) : (
            recentItems.map((item) => {
              const sig = feedSignals[item.id];
              const seller = currentUserSeller ?? {
                id: item.user_id,
                username: userName ?? 'user',
                avatar_url: null,
                rep_score: 0,
                total_predictions: 0,
                correct_predictions: 0,
                scan_count: 0,
              };
              const gcData: GlasscardData = {
                id: item.id,
                title: item.title,
                category: item.category,
                condition: item.condition ?? null,
                image_url: item.image_urls?.[0] ?? null,
                ai_confidence: item.ai_confidence != null ? item.ai_confidence / 100 : null,
                created_at: item.created_at,
                market: sig ? {
                  fair_market_value: sig.avg_price,
                  recommended_price: sig.recommended_price,
                  price_low: sig.low_price,
                  price_high: sig.high_price,
                  demand_score: sig.demand_score / 100,
                  liquidity_score: sig.supply_score != null ? (100 - sig.supply_score) / 100 : null,
                  volatility_score: null,
                  confidence_tier: sig.confidence_reason === 'sufficient_history' ? 'exact_match'
                    : sig.confidence_reason === 'category_baseline' ? 'category'
                    : sig.confidence_reason === 'ai_estimate_only' ? 'ai_estimate'
                    : 'baseline',
                  external_comps: null,
                  updated_at: null,
                } : null,
                seller,
                isWatched: false,
                isSaved: false,
              };
              return (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => router.push(`/(tabs)/result?id=${item.id}`)}
                  activeOpacity={0.8}
                >
                  <Glasscard data={gcData} mode="feed" />
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#080808',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  header: {
    marginBottom: 32,
  },
  headerLabel: {
    color: '#888888',
    fontFamily: 'monospace',
    fontSize: 10,
    letterSpacing: 4,
  },
  headerUser: {
    color: '#00FF87',
    fontFamily: 'monospace',
    fontSize: 11,
    marginTop: 4,
  },
  scanButton: {
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: '#00FF87',
    borderRadius: 4,
    marginBottom: 24,
  },
  scanButtonInner: {
    padding: 32,
    alignItems: 'center',
  },
  scanIcon: {
    color: '#00FF87',
    fontSize: 48,
    marginBottom: 12,
  },
  scanButtonText: {
    color: '#FFFFFF',
    fontFamily: 'monospace',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  scanButtonSub: {
    color: '#888888',
    fontFamily: 'monospace',
    fontSize: 11,
    marginTop: 8,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
  },
  quickAction: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 4,
    padding: 16,
    alignItems: 'center',
  },
  quickActionIcon: {
    color: '#AAAAAA',
    fontSize: 20,
    marginBottom: 6,
  },
  quickActionText: {
    color: '#AAAAAA',
    fontFamily: 'monospace',
    fontSize: 10,
    letterSpacing: 2,
  },
  recentSection: {
    marginTop: 8,
  },
  sectionLabel: {
    color: '#888888',
    fontFamily: 'monospace',
    fontSize: 10,
    letterSpacing: 3,
    marginBottom: 16,
  },
  emptyState: {
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 4,
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    color: '#888888',
    fontFamily: 'monospace',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  recentCard: {
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 4,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recentCardLeft: {
    flex: 1,
    marginRight: 12,
  },
  recentTitle: {
    color: '#FFFFFF',
    fontFamily: 'monospace',
    fontSize: 14,
    fontWeight: 'bold',
  },
  recentMeta: {
    color: '#888888',
    fontFamily: 'monospace',
    fontSize: 10,
    marginTop: 4,
    letterSpacing: 1,
  },
  recentCardRight: {
    alignItems: 'center',
  },
  recentConfidence: {
    color: '#00FF87',
    fontFamily: 'monospace',
    fontSize: 16,
    fontWeight: 'bold',
  },
  recentConfidenceLabel: {
    color: '#888888',
    fontFamily: 'monospace',
    fontSize: 8,
    marginTop: 2,
  },
});

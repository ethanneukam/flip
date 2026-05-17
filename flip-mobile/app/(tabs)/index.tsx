import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  Pressable,
  LayoutChangeEvent,
  ListRenderItemInfo,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { FlatList } from 'react-native-gesture-handler';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import * as Haptics from 'expo-haptics';
import { useOnboarding } from '../../hooks/useOnboarding';
import { useStreak } from '../../hooks/useStreak';
import OnboardingOverlay from '../../components/OnboardingOverlay';
import StreakCard from '../../components/StreakCard';
import ReengagementBanner from '../../components/ReengagementBanner';
import { GlasscardStack } from '../../components/Glasscard';
import GlasscardSeller from '../../components/Glasscard/GlasscardSeller';
import type { GlasscardData, GlasscardSellerData } from '../../types/models';
import { glasscardMarketFromSignalRow } from '../../lib/marketTruthMap';

const API_BASE_URL = 'https://flip-black-two.vercel.app';

type MarketIntentType = 'buy' | 'save' | 'skip' | 'inspect_seller';

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
  data_sources: string[] | null;
  computed_at: string;
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
  const [stackIds, setStackIds] = useState<string[]>([]);
  const [sellerInspect, setSellerInspect] = useState<GlasscardData | null>(null);
  const [cartAck, setCartAck] = useState<string | null>(null);
  const [feedPageHeight, setFeedPageHeight] = useState(0);
  const [feedViewIndex, setFeedViewIndex] = useState(0);
  const feedListRef = useRef<FlatList<string>>(null);

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
        .limit(15);

      if (items) {
        setRecentItems(items);

        const itemIds = items.map((i: RecentItem) => i.id);
        if (itemIds.length > 0) {
          const { data: signals } = await supabase
            .from('market_signals')
            .select('flip_item_id, avg_price, recommended_price, low_price, high_price, demand_score, supply_score, confidence_reason, data_sources, computed_at')
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

  useEffect(() => {
    setStackIds(recentItems.map((i) => i.id));
  }, [recentItems]);

  const glassById = useMemo(() => {
    const map: Record<string, GlasscardData> = {};
    for (const item of recentItems) {
      const sig = feedSignals[item.id];
      const seller =
        currentUserSeller ?? {
          id: item.user_id,
          username: userName ?? 'user',
          avatar_url: null,
          rep_score: 0,
          total_predictions: 0,
          correct_predictions: 0,
          scan_count: 0,
        };
      map[item.id] = {
        id: item.id,
        title: item.title,
        category: item.category,
        condition: item.condition ?? null,
        image_url: item.image_urls?.[0] ?? null,
        ai_confidence: item.ai_confidence != null ? item.ai_confidence / 100 : null,
        created_at: item.created_at,
        market: sig ? glasscardMarketFromSignalRow(sig) : null,
        seller,
        isWatched: false,
        isSaved: false,
      };
    }
    return map;
  }, [recentItems, feedSignals, currentUserSeller, userName]);

  const stackCards = useMemo(
    () => stackIds.map((id) => glassById[id]).filter(Boolean) as GlasscardData[],
    [stackIds, glassById]
  );

  const recordMarketIntent = useCallback(async (flip_item_id: string, intent_type: MarketIntentType) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;
      await fetch(`${API_BASE_URL}/api/record-market-intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ flip_item_id, intent_type }),
      });
    } catch {
      /* telemetry best-effort */
    }
  }, []);

  const toggleWatchlist = useCallback(async (item: GlasscardData) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;
      await fetch(`${API_BASE_URL}/api/toggle-watchlist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ flipItemId: item.id }),
      });
    } catch {
      /* deferred: surface error in Phase 12 */
    }
  }, []);

  const onBuyIntent = useCallback((item: GlasscardData) => {
    setCartAck(item.title);
    setTimeout(() => setCartAck(null), 2200);
  }, []);

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

  const onFeedSlotLayout = useCallback((e: LayoutChangeEvent) => {
    const h = Math.floor(e.nativeEvent.layout.height);
    if (h > 0) setFeedPageHeight(h);
  }, []);

  const onFeedMomentumScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (feedPageHeight <= 0 || stackIds.length === 0) return;
      const y = e.nativeEvent.contentOffset.y;
      const idx = Math.round(y / feedPageHeight);
      const clamped = Math.max(0, Math.min(idx, stackIds.length - 1));
      setFeedViewIndex(clamped);
    },
    [feedPageHeight, stackIds.length]
  );

  useEffect(() => {
    if (feedPageHeight <= 0 || stackIds.length === 0) return;
    const maxIdx = stackIds.length - 1;
    if (feedViewIndex > maxIdx) {
      feedListRef.current?.scrollToIndex({ index: maxIdx, animated: true });
      setFeedViewIndex(maxIdx);
    }
  }, [stackIds.length, feedViewIndex, feedPageHeight]);

  const removeCardFromStack = useCallback((item: GlasscardData) => {
    setStackIds((prev) => prev.filter((id) => id !== item.id));
  }, []);

  const renderFeedPage = useCallback(
    ({ index }: ListRenderItemInfo<string>) => {
      const pageCards = stackCards.slice(index);
      return (
        <View style={[styles.feedPage, { height: feedPageHeight }]}>
          <GlasscardStack
            fill
            cards={pageCards}
            isMarketLoading={(c) => !c.market}
            onConsumed={removeCardFromStack}
            onBuy={(item) => {
              void recordMarketIntent(item.id, 'buy');
              onBuyIntent(item);
            }}
            onSave={(item) => {
              void recordMarketIntent(item.id, 'save');
              void toggleWatchlist(item);
            }}
            onSellerInspect={(item) => {
              void recordMarketIntent(item.id, 'inspect_seller');
              setSellerInspect(item);
            }}
            onSkip={(item) => {
              void recordMarketIntent(item.id, 'skip');
            }}
          />
        </View>
      );
    },
    [
      stackCards,
      feedPageHeight,
      removeCardFromStack,
      recordMarketIntent,
      onBuyIntent,
      toggleWatchlist,
    ]
  );

  const getItemLayout = useCallback(
    (_: unknown, index: number) => ({
      length: feedPageHeight,
      offset: feedPageHeight * index,
      index,
    }),
    [feedPageHeight]
  );

  const keyExtractor = useCallback((id: string) => id, []);

  const showFeedList = !loading && stackIds.length > 0 && feedPageHeight > 0;

  return (
    <View style={styles.container}>
      {showOnboarding && onboardingState && (
        <OnboardingOverlay
          state={onboardingState}
          onNext={handleOnboardingNext}
          onSkip={skip}
        />
      )}
      <View style={styles.body}>
        <ScrollView
          style={styles.chromeScroll}
          contentContainerStyle={styles.chromeContent}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={styles.headerLabel}>FLIP_TERMINAL</Text>
            {userName && (
              <Text style={styles.headerUser}>› {userName.toUpperCase()}</Text>
            )}
          </View>

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

          <View style={styles.recentSection}>
            <Text style={styles.sectionLabel}>MARKET_FEED</Text>
            {cartAck && (
              <Text style={styles.cartAck}>CART_INTENT_RECORDED · {cartAck.toUpperCase()}</Text>
            )}
            <Text style={styles.stackHint}>SWIPE UP SKIP · RIGHT BUY · DOWN SAVE · LEFT SELLER</Text>
          </View>
        </ScrollView>

        <View style={styles.feedSlot} onLayout={onFeedSlotLayout}>
          {loading ? (
            <ActivityIndicator color="#00FF87" style={{ marginTop: 20 }} />
          ) : recentItems.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>
                Scan your first item to start tracking market value
              </Text>
            </View>
          ) : showFeedList ? (
            <FlatList
              ref={feedListRef}
              data={stackIds}
              keyExtractor={keyExtractor}
              renderItem={renderFeedPage}
              pagingEnabled
              showsVerticalScrollIndicator={false}
              decelerationRate="fast"
              snapToInterval={feedPageHeight}
              snapToAlignment="start"
              disableIntervalMomentum
              getItemLayout={getItemLayout}
              removeClippedSubviews
              windowSize={5}
              initialNumToRender={2}
              maxToRenderPerBatch={3}
              onMomentumScrollEnd={onFeedMomentumScrollEnd}
            />
          ) : (
            <ActivityIndicator color="#00FF87" style={{ marginTop: 20 }} />
          )}
        </View>
      </View>

      <Modal
        visible={sellerInspect !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSellerInspect(null)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setSellerInspect(null)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>SELLER</Text>
            {sellerInspect && <GlasscardSeller seller={sellerInspect.seller} />}
            <TouchableOpacity style={styles.modalClose} onPress={() => setSellerInspect(null)}>
              <Text style={styles.modalCloseText}>CLOSE</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#080808',
    paddingTop: 56,
  },
  body: {
    flex: 1,
    minHeight: 0,
  },
  chromeScroll: {
    flexGrow: 0,
    flexShrink: 0,
    maxHeight: '44%',
  },
  chromeContent: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  feedSlot: {
    flex: 1,
    minHeight: 0,
    paddingHorizontal: 12,
    paddingBottom: 100,
  },
  feedPage: {
    width: '100%',
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
    marginBottom: 8,
  },
  stackHint: {
    color: '#555555',
    fontFamily: 'monospace',
    fontSize: 9,
    letterSpacing: 1,
    marginBottom: 4,
  },
  cartAck: {
    color: '#00FF87',
    fontFamily: 'monospace',
    fontSize: 10,
    marginBottom: 8,
    letterSpacing: 1,
  },
  emptyState: {
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 4,
    padding: 24,
    alignItems: 'center',
    marginHorizontal: 8,
    marginTop: 12,
  },
  emptyText: {
    color: '#888888',
    fontFamily: 'monospace',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: '#141414',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: 20,
  },
  modalTitle: {
    color: '#FFFFFF',
    fontFamily: 'monospace',
    fontSize: 11,
    letterSpacing: 3,
    marginBottom: 12,
  },
  modalClose: {
    marginTop: 16,
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: '#444444',
    borderRadius: 6,
  },
  modalCloseText: {
    color: '#AAAAAA',
    fontFamily: 'monospace',
    fontSize: 10,
    letterSpacing: 2,
  },
});

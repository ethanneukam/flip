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
import OnboardingOverlay from '../../components/OnboardingOverlay';

const { width } = Dimensions.get('window');

type RecentItem = {
  id: string;
  title: string;
  category: string;
  condition: string;
  ai_confidence: number;
  created_at: string;
};

export default function HomeScreen() {
  const router = useRouter();
  const [recentItems, setRecentItems] = useState<RecentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState<string | null>(null);
  const { state: onboardingState, isActive: showOnboarding, advanceTo, skip } = useOnboarding();

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      setUserName(user.email?.split('@')[0] ?? null);

      const { data: items } = await supabase
        .from('flip_items')
        .select('id, title, category, condition, ai_confidence, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (items) {
        setRecentItems(items);
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
            recentItems.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.recentCard}
                onPress={() => router.push(`/(tabs)/result?id=${item.id}`)}
              >
                <View style={styles.recentCardLeft}>
                  <Text style={styles.recentTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.recentMeta}>
                    {item.category.toUpperCase()} · {item.condition.toUpperCase()}
                  </Text>
                </View>
                <View style={styles.recentCardRight}>
                  <Text style={styles.recentConfidence}>
                    {item.ai_confidence}%
                  </Text>
                  <Text style={styles.recentConfidenceLabel}>AI</Text>
                </View>
              </TouchableOpacity>
            ))
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

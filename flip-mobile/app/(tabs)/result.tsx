import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { supabase } from '../../lib/supabase';
import * as Haptics from 'expo-haptics';
import { useOnboarding } from '../../hooks/useOnboarding';
import Glasscard from '../../components/Glasscard';
import type { GlasscardData } from '../../types/models';
import { glasscardMarketFromSignalRow } from '../../lib/marketTruthMap';

const API_BASE_URL = 'https://flip-black-two.vercel.app';

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
  user_id: string;
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
  trend_direction: 'up' | 'down' | 'stable';
  trend_percent: number;
  low_confidence: boolean;
  confidence_reason: string;
  data_points_used: number;
  data_sources: string[] | null;
  computed_at: string;
};

type PredictionType = 'price_up' | 'price_down' | 'overvalued' | 'undervalued';

export default function ResultScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [item, setItem] = useState<FlipItemRow | null>(null);
  const [signal, setSignal] = useState<MarketSignalRow | null>(null);
  const [loading, setLoading] = useState(true);

  const [predictionSubmitting, setPredictionSubmitting] = useState(false);
  const [submittedPrediction, setSubmittedPrediction] = useState<PredictionType | null>(null);
  const [saveSubmitting, setSaveSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [watchlistSubmitting, setWatchlistSubmitting] = useState(false);
  const [watched, setWatched] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const { state: onboardingState, advanceTo: advanceOnboarding } = useOnboarding();
  const [sellerData, setSellerData] = useState<{
    id: string; username: string; avatar_url: string | null;
    rep_score: number; total_predictions: number; correct_predictions: number; scan_count: number;
  } | null>(null);

  useEffect(() => {
    if (onboardingState === 'camera_prompted') {
      advanceOnboarding('first_scan_done');
    }
  }, []);

  useEffect(() => {
    if (!id) return;
    loadItem(id);
    checkExistingPrediction(id);
  }, [id]);

  useEffect(() => {
    if (!id || signal) return;
    const interval = setInterval(() => pollSignal(id), 3000);
    return () => clearInterval(interval);
  }, [id, signal]);

  const loadItem = async (flipItemId: string) => {
    const { data } = await supabase
      .from('flip_items')
      .select('id, title, category, subcategory, brand, model, condition, ai_confidence, image_urls, created_at, user_id')
      .eq('id', flipItemId)
      .single();

    if (data) {
      setItem(data);
      loadSeller(data.user_id);
    }
    setLoading(false);
    pollSignal(flipItemId);
  };

  const loadSeller = async (userId: string) => {
    const { data } = await supabase
      .from('users')
      .select('id, username, avatar_url, rep_score, total_predictions, correct_predictions, scan_count')
      .eq('id', userId)
      .single();

    if (data) setSellerData(data);
  };

  const pollSignal = async (flipItemId: string) => {
    const { data } = await supabase
      .from('market_signals')
      .select('avg_price, low_price, high_price, recommended_price, demand_score, supply_score, flip_score, velocity, trend_direction, trend_percent, low_confidence, confidence_reason, data_points_used, data_sources, computed_at')
      .eq('flip_item_id', flipItemId)
      .single();

    if (data) setSignal(data as MarketSignalRow);
  };

  const checkExistingPrediction = async (flipItemId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('predictions')
      .select('prediction_type')
      .eq('user_id', user.id)
      .eq('flip_item_id', flipItemId)
      .eq('status', 'pending')
      .single();

    if (data) setSubmittedPrediction(data.prediction_type as PredictionType);
  };

  const getAuthToken = async (): Promise<string | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  };

  const handlePrediction = async (type: PredictionType) => {
    if (predictionSubmitting || !signal || !id) return;

    setPredictionSubmitting(true);
    setActionError(null);

    try {
      const token = await getAuthToken();
      if (!token) {
        setActionError('SESSION_EXPIRED');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/record-prediction`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          flipItemId: id,
          predictionType: type,
          entryPrice: signal.avg_price,
        }),
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(errBody.error || `HTTP ${response.status}`);
      }

      setSubmittedPrediction(type);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    } catch (err) {
      const msg = err instanceof Error ? err.message : 'PREDICTION_FAILED';
      setActionError(msg);
    } finally {
      setPredictionSubmitting(false);
    }
  };

  const handleSave = async () => {
    if (saveSubmitting || saved || !id) return;

    setSaveSubmitting(true);
    setActionError(null);

    try {
      const token = await getAuthToken();
      if (!token) {
        setActionError('SESSION_EXPIRED');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/save-to-portfolio`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          flipItemId: id,
          costBasis: signal?.recommended_price ?? 0,
        }),
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(errBody.error || `HTTP ${response.status}`);
      }

      setSaved(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (onboardingState === 'first_scan_done') {
        advanceOnboarding('first_save_done');
      }

    } catch (err) {
      const msg = err instanceof Error ? err.message : 'SAVE_FAILED';
      setActionError(msg);
    } finally {
      setSaveSubmitting(false);
    }
  };

  const handleWatchlist = async () => {
    if (watchlistSubmitting || !id) return;

    setWatchlistSubmitting(true);
    setActionError(null);

    try {
      const token = await getAuthToken();
      if (!token) {
        setActionError('SESSION_EXPIRED');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/toggle-watchlist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ flipItemId: id }),
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(errBody.error || `HTTP ${response.status}`);
      }

      const result = await response.json();
      setWatched(result.watched);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    } catch (err) {
      const msg = err instanceof Error ? err.message : 'WATCHLIST_FAILED';
      setActionError(msg);
    } finally {
      setWatchlistSubmitting(false);
    }
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

  const glasscardData: GlasscardData = {
    id: item.id,
    title: item.title,
    category: item.category,
    condition: item.condition ?? null,
    image_url: item.image_urls?.[0] ?? null,
    ai_confidence: item.ai_confidence != null ? item.ai_confidence / 100 : null,
    created_at: item.created_at,
    market: signal ? glasscardMarketFromSignalRow(signal) : null,
    seller: sellerData ?? {
      id: item.user_id,
      username: 'loading...',
      avatar_url: null,
      rep_score: 0,
      total_predictions: 0,
      correct_predictions: 0,
      scan_count: 0,
    },
    isWatched: watched,
    isSaved: saved,
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Glasscard — renders identity, market data, metrics, seller, comps, trading bar */}
      <Glasscard
        data={glasscardData}
        mode="full"
        isMarketLoading={!signal}
      />

      {/* Prediction Buttons */}
      {signal && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>YOUR_PREDICTION</Text>
          {submittedPrediction ? (
            <View style={styles.submittedBadge}>
              <Text style={styles.submittedText}>
                ✓ PREDICTION RECORDED: {submittedPrediction.replace('_', ' ').toUpperCase()}
              </Text>
            </View>
          ) : (
            <View style={styles.predictionGrid}>
              {([
                { type: 'price_up' as PredictionType, label: 'Price Will Rise', icon: '↑' },
                { type: 'price_down' as PredictionType, label: 'Price Will Fall', icon: '↓' },
                { type: 'undervalued' as PredictionType, label: 'Undervalued', icon: '⬆' },
                { type: 'overvalued' as PredictionType, label: 'Overvalued', icon: '⬇' },
              ]).map(({ type, label, icon }) => (
                <TouchableOpacity
                  key={type}
                  style={[styles.predictionButton, predictionSubmitting && styles.buttonDisabled]}
                  onPress={() => handlePrediction(type)}
                  disabled={predictionSubmitting}
                  activeOpacity={0.7}
                >
                  <Text style={styles.predictionIcon}>{icon}</Text>
                  <Text style={styles.predictionLabel}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          {predictionSubmitting && (
            <ActivityIndicator color="#00FF87" style={{ marginTop: 8 }} />
          )}
        </View>
      )}

      {/* Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>ACTIONS</Text>
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionButton, styles.saveButton, saved && styles.actionDone]}
            onPress={handleSave}
            disabled={saveSubmitting || saved}
            activeOpacity={0.7}
          >
            {saveSubmitting ? (
              <ActivityIndicator color="#080808" size="small" />
            ) : (
              <Text style={styles.actionButtonText}>
                {saved ? '✓ SAVED' : 'SAVE TO PORTFOLIO'}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.watchButton, watched && styles.watchActive]}
            onPress={handleWatchlist}
            disabled={watchlistSubmitting}
            activeOpacity={0.7}
          >
            {watchlistSubmitting ? (
              <ActivityIndicator color="#00FF87" size="small" />
            ) : (
              <Text style={[styles.watchButtonText, watched && { color: '#080808' }]}>
                {watched ? '✓ WATCHING' : 'ADD TO WATCHLIST'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Error Display */}
      {actionError && (
        <View style={styles.actionErrorBanner}>
          <Text style={styles.actionErrorText}>⚠ {actionError}</Text>
        </View>
      )}
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
  predictionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  predictionButton: { flex: 1, minWidth: '45%', backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#2A2A2A', borderRadius: 4, padding: 14, alignItems: 'center' },
  buttonDisabled: { opacity: 0.5 },
  predictionIcon: { color: '#FFFFFF', fontSize: 20, marginBottom: 4 },
  predictionLabel: { color: '#AAAAAA', fontFamily: 'monospace', fontSize: 9, letterSpacing: 1, textAlign: 'center' },
  submittedBadge: { backgroundColor: '#0a1a0f', borderWidth: 1, borderColor: '#00FF87', borderRadius: 4, padding: 16, alignItems: 'center' },
  submittedText: { color: '#00FF87', fontFamily: 'monospace', fontSize: 11, fontWeight: 'bold' },
  actionRow: { flexDirection: 'row', gap: 12 },
  actionButton: { flex: 1, padding: 14, borderRadius: 4, alignItems: 'center', justifyContent: 'center', minHeight: 44 },
  saveButton: { backgroundColor: '#00FF87' },
  actionDone: { backgroundColor: '#004d29' },
  actionButtonText: { color: '#080808', fontFamily: 'monospace', fontSize: 11, fontWeight: 'bold', letterSpacing: 1 },
  watchButton: { backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#00FF87' },
  watchActive: { backgroundColor: '#00FF87' },
  watchButtonText: { color: '#00FF87', fontFamily: 'monospace', fontSize: 11, fontWeight: 'bold', letterSpacing: 1 },
  actionErrorBanner: { backgroundColor: 'rgba(255, 68, 68, 0.1)', borderWidth: 1, borderColor: '#FF4444', borderRadius: 4, padding: 12, marginBottom: 20 },
  actionErrorText: { color: '#FF4444', fontFamily: 'monospace', fontSize: 10, textAlign: 'center' },
});

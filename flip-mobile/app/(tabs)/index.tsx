import React, { useState, useEffect, useMemo } from 'react';
import { StyleSheet, Text, View, ActivityIndicator, ScrollView, Dimensions, TouchableOpacity } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { LineChart } from "react-native-gifted-charts";
import FadeContent from '../../components/FadeContent';
import ElectricBorderInput from '../../components/ElectricBorder';

// 1. IMPORT ASYNC STORAGE AND THE STEPPER
import AsyncStorage from '@react-native-async-storage/async-storage';
import OnboardingStepper from '../../components/OnboardingStepper';

const { width } = Dimensions.get('window');

export default function DashboardScreen() {
  const { query } = useLocalSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [itemData, setItemData] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [activeOnboardingStep, setActiveOnboardingStep] = useState(-1);
  // 2. ADD ONBOARDING STATE
  const [showOnboarding, setShowOnboarding] = useState(false);
  const isHighlighted = (stepIndex: number) => activeOnboardingStep === stepIndex;

  // 3. CHECK FOR FIRST LAUNCH ON MOUNT
  useEffect(() => {
    checkFirstLaunch();
  }, []);

  const checkFirstLaunch = async () => {
    try {
      const hasLaunched = await AsyncStorage.getItem('flip_onboarded');
      if (!hasLaunched) {
        setShowOnboarding(true);
      }
    } catch {
      setShowOnboarding(true); // Fallback to showing it if error
    }
  };

  const completeOnboarding = async () => {
    try {
      await AsyncStorage.setItem('flip_onboarded', 'true');
    } catch {}
    setShowOnboarding(false);
  };

  useEffect(() => {
    if (query) {
      setSearchQuery(query as string);
      handleSearch(query as string);
    }
  }, [query]);

  const handleSearch = async (name: string) => {
    setLoading(true);
    try {
      const { data: item, error: itemErr } = await supabase
        .from('items')
        .select('*')
        .ilike('title', `%${name}%`)
        .single();

      if (item) {
        setItemData(item);
        
        const { data: logs } = await supabase
          .from('price_logs')
          .select('price, created_at')
          .eq('item_id', item.id)
          .order('created_at', { ascending: true })
          .limit(20);

        if (logs) {
          const formattedData = logs.map(log => ({
            value: log.price,
            label: new Date(log.created_at).toLocaleDateString([], { month: 'numeric', day: 'numeric' }),
            dataPointText: `$${log.price}`
          }));
          setHistory(formattedData);
        }
      }
    } catch (err) {
      console.error("› DATABASE_FETCH_ERROR", err);
    }
    setLoading(false);
  };

  const handleSaveToVault = async () => {
    if (!itemData) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert("› ERROR: UNAUTHORIZED_OPERATOR");
        return;
      }

      const currentPrice = history.length > 0 ? history[history.length - 1].value : 0;

      const { error } = await supabase
        .from('user_items')
        .insert({
          user_id: user.id,
          item_id: itemData.id,
          acquired_price: currentPrice
        });

      if (error) throw error;
      alert("› ASSET_SECURED_IN_VAULT");

    } catch (err) {
      console.error("› VAULT_INSERTION_ERROR", err);
      alert("› ERROR_SAVING_ASSET");
    }
  };

  const change = useMemo(() => {
    if (history.length < 2) return { val: '0%', up: true };
    const first = history[0].value;
    const last = history[history.length - 1].value;
    const diff = ((last - first) / first) * 100;
    return { val: `${diff > 0 ? '+' : ''}${diff.toFixed(1)}%`, up: diff >= 0 };
  }, [history]);

  // 4. WRAP EVERYTHING IN A MASTER VIEW SO THE OVERLAY WORKS
  return (
    <View style={{ flex: 1, backgroundColor: '#0f0f0f' }}>
      <ScrollView style={styles.container}>
        <Text style={styles.terminalHeader}>› TERMINAL_ORACLE_v1.0.2</Text>
        
        {/* STEP 1 HIGHLIGHT: SCANNER */}
        <View style={isHighlighted(0) ? styles.highlightWrapper : null}>
          <ElectricBorderInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="SCAN_OR_TYPE_ASSET..."
            onSubmitEditing={() => handleSearch(searchQuery)}
            style={{ width: '100%' }}
          />
        </View>

        {loading ? (
          <ActivityIndicator color="#e8ff47" style={{ marginTop: 100 }} />
        ) : itemData ? (
          /* STEP 2 HIGHLIGHT: MARKET CHART */
          <View style={[
            styles.marketContainer, 
            isHighlighted(1) && styles.highlightWrapper
          ]}>
            <View style={styles.priceHeader}>
              <Text style={styles.ticker}>{itemData.title.toUpperCase()} // USD</Text>
              <Text style={styles.price}>${history.length > 0 ? history[history.length - 1].value.toLocaleString() : '---'}</Text>
              <View style={styles.deltaRow}>
                <Text style={[styles.delta, { color: change.up ? '#10b981' : '#ef4444' }]}>{change.val}</Text>
                <Text style={styles.deltaLabel}>24H_DELTA</Text>
              </View>
            </View>

            <FadeContent duration={1500} delay={200}>
              <View style={styles.chartWrapper}>
                {history.length > 0 ? (
                  <LineChart
                    data={history}
                    width={width - 60}
                    height={200}
                    color={change.up ? '#10b981' : '#ef4444'}
                    thickness={2}
                    hideDataPoints
                    noOfSections={3}
                    yAxisTextStyle={{ color: '#333', fontSize: 10 }}
                    xAxisLabelTextStyle={{ color: '#333', fontSize: 8 }}
                    backgroundColor="#000"
                    hideRules
                    yAxisColor="#111"
                    xAxisColor="#111"
                    areaChart
                    startFillColor={change.up ? '#10b981' : '#ef4444'}
                    startOpacity={0.2}
                    endOpacity={0}
                  />
                ) : (
                  <Text style={styles.noData}>NO_HISTORICAL_LOGS_FOUND</Text>
                )}
                <TouchableOpacity 
                  style={[
                    styles.vaultButton, 
                    isHighlighted(2) && { borderColor: '#fff', borderWidth: 2 }
                  ]} 
                  onPress={handleSaveToVault}
                >
                  <Text style={styles.vaultButtonText}>[ SAVE_TO_VAULT ]</Text>
                </TouchableOpacity>
              </View>
            </FadeContent>
          </View>
        ) : ( 
          /* If no data, we show a "Ghost" version of the UI for the tutorial */
          isHighlighted(1) || isHighlighted(2) ? (
            <View style={[styles.marketContainer, styles.highlightWrapper, { opacity: 0.5 }]}>
               <Text style={styles.idleText}>[ TUTORIAL_DATA_SIMULATED ]</Text>
            </View>
          ) : (
            <View style={styles.idleState}>
              <Text style={styles.idleText}>› SYSTEM_IDLE: AWAITING_SCAN_DATA</Text>
            </View>
          )
        )}
      </ScrollView>

     {showOnboarding && (
        <OnboardingStepper 
          onComplete={completeOnboarding} 
          onStepChange={(step) => setActiveOnboardingStep(step)} 
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', padding: 20, paddingTop: 60 },
  terminalHeader: { color: '#47daff', fontFamily: 'monospace', fontSize: 12, marginBottom: 20 },
  searchInput: { backgroundColor: '#080808', color: '#fff', padding: 15, fontFamily: 'monospace', borderBottomWidth: 1, borderBottomColor: '#e8ff4733' },
  marketContainer: { marginTop: 30, backgroundColor: '#080808', padding: 20, borderRadius: 10, borderWidth: 1, borderColor: '#111' },
  priceHeader: { marginBottom: 30 },
  ticker: { color: '#444', fontSize: 10, fontFamily: 'monospace', letterSpacing: 2 },
  price: { color: '#fff', fontSize: 42, fontWeight: 'bold', fontFamily: 'monospace' },
  deltaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 5 },
  delta: { fontSize: 14, fontWeight: 'bold', fontFamily: 'monospace' },
  deltaLabel: { color: '#222', fontSize: 10, fontFamily: 'monospace' },
  chartWrapper: { alignItems: 'center', marginTop: 20 },
  noData: { color: '#333', fontFamily: 'monospace', fontSize: 10, marginTop: 50 },
  idleState: { flex: 1, marginTop: 100, alignItems: 'center' },
  idleText: { color: '#222', fontFamily: 'monospace', fontSize: 12 },
  vaultButton: { backgroundColor: '#47daff', padding: 15, borderRadius: 2, marginTop: 20, alignItems: 'center' },
  highlightWrapper: {
    borderWidth: 2,
    borderColor: '#10b981', // Flip Green
    borderRadius: 10,
    padding: 4,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 10, // For Android
  },
  vaultButtonText: { color: '#000', fontFamily: 'monospace', fontWeight: 'bold' }
});
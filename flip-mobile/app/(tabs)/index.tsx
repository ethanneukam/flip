import React, { useState, useEffect, useMemo } from 'react';
import { StyleSheet, Text, View, TextInput, ActivityIndicator, ScrollView, Dimensions, TouchableOpacity } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { LineChart } from "react-native-gifted-charts";
import FadeContent from '../../components/FadeContent';
import ElectricBorderInput from '@/components/ElectricBorder';

const { width } = Dimensions.get('window');

export default function DashboardScreen() {
  const { query } = useLocalSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [itemData, setItemData] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    if (query) {
      setSearchQuery(query as string);
      handleSearch(query as string);
    }
  }, [query]);

  const handleSearch = async (name: string) => {
    setLoading(true);
    try {
      // 1. Find the Item ID from the 'items' table
      const { data: item, error: itemErr } = await supabase
        .from('items')
        .select('*')
        .ilike('title', `%${name}%`)
        .single();

      if (item) {
        setItemData(item);
        
        // 2. Fetch Price History (Price Logs)
        const { data: logs } = await supabase
          .from('price_logs')
          .select('price, created_at')
          .eq('item_id', item.id)
          .order('created_at', { ascending: true })
          .limit(20); // Last 20 data points

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
    // 1. Get the current logged-in user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      alert("› ERROR: UNAUTHORIZED_OPERATOR");
      return;
    }

    // 2. Get current price
    const currentPrice = history.length > 0 ? history[history.length - 1].value : 0;

    // 3. Insert into the vault table
    const { error } = await supabase
      .from('user_items')
      .insert({
        user_id: user.id,
        item_id: itemData.id,
        acquired_price: currentPrice // We'll save it even if you don't use it yet!
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

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.terminalHeader}>› TERMINAL_ORACLE_v1.0.2</Text>
      
      <ElectricBorderInput
  value={searchQuery}
  onChangeText={setSearchQuery}
  placeholder="SCAN_OR_TYPE_ASSET..."
  onSubmitEditing={() => handleSearch(searchQuery)}
/>

      {loading ? (
        <ActivityIndicator color="#e8ff47" style={{ marginTop: 100 }} />
      ) : itemData ? (
        <View style={styles.marketContainer}>
          {/* Header Section */}
          <View style={styles.priceHeader}>
            <Text style={styles.ticker}>{itemData.title.toUpperCase()} // USD</Text>
            <Text style={styles.price}>${history.length > 0 ? history[history.length - 1].value.toLocaleString() : '---'}</Text>
            <View style={styles.deltaRow}>
              <Text style={[styles.delta, { color: change.up ? '#10b981' : '#ef4444' }]}>{change.val}</Text>
              <Text style={styles.deltaLabel}>24H_DELTA</Text>
            </View>
          </View>

          {/* Mobile Chart Section */}
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
                <TouchableOpacity style={styles.vaultButton} onPress={handleSaveToVault}>
              <Text style={styles.vaultButtonText}>[ SAVE_TO_VAULT ]</Text>
            </TouchableOpacity>
          </View>
          </FadeContent>
        </View>
      ) : ( 
        <View style={styles.idleState}>
          <Text style={styles.idleText}>› SYSTEM_IDLE: AWAITING_SCAN_DATA</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', padding: 20, paddingTop: 60 },
  terminalHeader: { color: '#e8ff47', fontFamily: 'monospace', fontSize: 12, marginBottom: 20 },
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
  vaultButton: { backgroundColor: '#e8ff47', padding: 15, borderRadius: 2, marginTop: 20, alignItems: 'center' },
  vaultButtonText: { color: '#000', fontFamily: 'monospace', fontWeight: 'bold' }
});
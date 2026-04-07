import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

export default function DashboardScreen() {
  const { query } = useLocalSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [chartData, setChartData] = useState<any>(null);

  // This effect listens for data coming in from the Scanner!
  useEffect(() => {
    if (query) {
      setSearchQuery(query as string);
      fetchPricingData(query as string);
    }
  }, [query]);

  const fetchPricingData = async (itemName: string) => {
    setIsSearching(true);
    console.log(`› PULLING_CHARTS_FOR: ${itemName}`);
    
    try {
      // Connects to your Python API Endpoint
      const res = await fetch(`https://flip-black-two.vercel.app/api/v1/pricing/${encodeURIComponent(itemName)}`, {
        // Add your API Key headers here if needed
      });
      
      const data = await res.json();
      setChartData(data);
    } catch (error) {
      console.error("› CHART_FETCH_ERROR", error);
    }
    
    setIsSearching(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>› TERMINAL_DASHBOARD</Text>
      
      {/* Search Bar */}
      <TextInput 
        style={styles.searchInput}
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="ENTER_ASSET_NAME..."
        placeholderTextColor="#555"
        onSubmitEditing={() => fetchPricingData(searchQuery)}
      />

      {/* Results Area */}
      <View style={styles.chartArea}>
        {isSearching ? (
          <View style={styles.loader}>
            <ActivityIndicator color="#e8ff47" />
            <Text style={styles.loaderText}>QUERYING_ORACLE...</Text>
          </View>
        ) : chartData ? (
          <View style={styles.card}>
            <Text style={styles.assetTitle}>{chartData.title}</Text>
            <Text style={styles.price}>${chartData.flip_price}</Text>
            <Text style={styles.status}>[{chartData.status}]</Text>
          </View>
        ) : (
          <Text style={styles.idleText}>› AWAITING_INPUT_OR_SCAN</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', padding: 20, paddingTop: 60 },
  header: { color: '#e8ff47', fontFamily: 'monospace', fontSize: 16, marginBottom: 20 },
  searchInput: { backgroundColor: '#111', color: '#e8ff47', padding: 15, fontFamily: 'monospace', borderWidth: 1, borderColor: '#333', borderRadius: 4 },
  chartArea: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 20 },
  loader: { alignItems: 'center', gap: 10 },
  loaderText: { color: '#e8ff47', fontFamily: 'monospace', fontSize: 12 },
  card: { backgroundColor: '#111', padding: 30, borderWidth: 1, borderColor: '#e8ff47', width: '100%', alignItems: 'center' },
  assetTitle: { color: '#fff', fontSize: 20, fontFamily: 'monospace', textAlign: 'center', marginBottom: 10 },
  price: { color: '#e8ff47', fontSize: 40, fontWeight: 'bold', fontFamily: 'monospace', marginBottom: 10 },
  status: { color: '#555', fontSize: 10, fontFamily: 'monospace' },
  idleText: { color: '#555', fontFamily: 'monospace' }
});
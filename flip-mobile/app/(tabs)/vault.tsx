import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, ActivityIndicator, Image, TouchableOpacity, Alert } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import DecryptedText from '../../components/DecryptedText';

// --- SUB-COMPONENT FOR INDIVIDUAL ITEMS ---
function VaultItem({ asset, onDelete }: { asset: any, onDelete: (id: string) => void }) {
  const [flicker, setFlicker] = useState(false);

  // This handles the "Flicker" specifically when THIS asset's price changes
  useEffect(() => {
    if (asset.flip_price) {
      setFlicker(true);
      const timer = setTimeout(() => setFlicker(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [asset.flip_price]);

  return (
    <View style={styles.assetCard}>
      <View style={styles.imageBox}>
        {asset.image_url ? (
          <Image source={{ uri: asset.image_url }} style={styles.image} />
        ) : (
          <Text style={styles.imagePlaceholder}>IMG</Text>
        )}
      </View>
      
      <View style={styles.assetInfo}>
        <Text style={styles.assetTitle} numberOfLines={1}>{asset.title}</Text>
        <Text style={styles.assetSku}>QTY: 1 // {asset.id.substring(0,6)}</Text>
        
        {/* DELETE BUTTON */}
        <TouchableOpacity 
          onPress={() => onDelete(asset.vault_id)}
          style={styles.deleteButton}
        >
          <Text style={styles.deleteText}>[ REMOVE_ASSET ]</Text>
        </TouchableOpacity>
      </View>

     // Inside VaultItem component:
<View style={styles.assetPriceBox}>
  <DecryptedText 
    text={`$${(asset.flip_price || 0).toLocaleString()}`}
    speed={50}
    sequential={false} // Use false here for a "random scramble" look on the list
    style={styles.assetPrice}
  />
  <Text style={styles.assetDelta}>+12%</Text>
</View>
    </View>
  );
}

// --- MAIN VAULT SCREEN ---
export default function VaultScreen() {
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const subscription = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes', 
        { event: 'UPDATE', schema: 'public', table: 'items' }, 
        (payload) => {
          console.log('› PRICE_UPDATE_DETECTED', payload.new);
          loadVaultData();
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(subscription); };
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadVaultData();
    }, [])
  );

  async function loadVaultData() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('user_items')
      .select(`
        id,
        acquired_price,
        items (
          id,
          title,
          flip_price,
          image_url
        )
      `)
      .eq('user_id', user.id);

    if (data) {
      const formattedAssets = data.map((row: any) => ({
        vault_id: row.id,
        acquired_price: row.acquired_price,
        ...row.items
      }));
      setAssets(formattedAssets);
    }
    setLoading(false);
  }

  // DELETE FUNCTION
  async function handleDelete(vaultId: string) {
    Alert.alert("TERMINATE_ASSET", "Confirm permanent removal from Vault?", [
      { text: "CANCEL", style: "cancel" },
      { 
        text: "CONFIRM", 
        style: "destructive",
        onPress: async () => {
          const { error } = await supabase
            .from('user_items')
            .delete()
            .eq('id', vaultId);
          
          if (!error) loadVaultData();
        }
      }
    ]);
  }

  const totalEquity = useMemo(() => {
    return assets.reduce((acc, item) => acc + (item.flip_price || 0), 0);
  }, [assets]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color="#10b981" size="large" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.statusText}>› ENCRYPTED_SESSION</Text>
      </View>

     <View style={styles.equitySection}>
  <Text style={styles.equityLabel}>TOTAL_PERSONAL_EQUITY</Text>
  
  {/* REPLACE THE OLD TEXT WITH THIS: */}
  <DecryptedText 
    text={`$${totalEquity.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
    speed={40}
    maxIterations={12}
    sequential={true}
    style={styles.equityValue}
    encryptedStyle={{ color: '#e8ff47' }} // It flashes yellow while calculating
  />

  <View style={styles.deltaPill}>
    <Text style={styles.deltaText}>+4.2% (24H)</Text>
  </View>
</View>

      <View style={styles.ledgerHeader}>
        <Text style={styles.ledgerTitle}>ASSET_LEDGER</Text>
        <Text style={styles.ledgerCount}>{assets.length} UNITS</Text>
      </View>

      <View style={styles.grid}>
        {assets.map((asset) => (
          <VaultItem key={asset.vault_id} asset={asset} onDelete={handleDelete} />
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#080808' },
  loadingContainer: { flex: 1, backgroundColor: '#080808', justifyContent: 'center', alignItems: 'center' },
  header: { padding: 20, paddingTop: 60, opacity: 0.5 },
  statusText: { color: '#10b981', fontSize: 10, fontFamily: 'monospace', fontWeight: 'bold' },
  equitySection: { padding: 20, alignItems: 'center', marginTop: 20 },
  equityLabel: { color: '#555', fontSize: 10, fontFamily: 'monospace', letterSpacing: 4, marginBottom: 10 },
  equityValue: { color: '#fff', fontSize: 48, fontWeight: '900', fontFamily: 'monospace', letterSpacing: -2 },
  deltaPill: { backgroundColor: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.2)', borderWidth: 1, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, marginTop: 10 },
  deltaText: { color: '#10b981', fontSize: 10, fontFamily: 'monospace', fontWeight: 'bold' },
  ledgerHeader: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, marginTop: 40, marginBottom: 10 },
  ledgerTitle: { color: '#555', fontSize: 10, fontFamily: 'monospace', letterSpacing: 2 },
  ledgerCount: { color: '#777', fontSize: 10, fontFamily: 'monospace' },
  grid: { paddingHorizontal: 20, paddingBottom: 100 },
  assetCard: { backgroundColor: '#111', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', padding: 15, marginBottom: 10, flexDirection: 'row', alignItems: 'center' },
  imageBox: { width: 50, height: 50, backgroundColor: '#000', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  image: { width: '100%', height: '100%', opacity: 0.8 },
  imagePlaceholder: { color: '#333', fontSize: 10, fontFamily: 'monospace' },
  assetInfo: { flex: 1, marginLeft: 15 },
  assetTitle: { color: '#fff', fontSize: 12, fontFamily: 'monospace', fontWeight: 'bold', textTransform: 'uppercase' },
  assetSku: { color: '#666', fontSize: 9, fontFamily: 'monospace', marginTop: 4, fontWeight: 'bold' },
  assetPriceBox: { alignItems: 'flex-end' },
  assetPrice: { color: '#fff', fontSize: 14, fontFamily: 'monospace', fontWeight: '900', fontStyle: 'italic' },
  assetDelta: { color: '#10b981', fontSize: 10, fontFamily: 'monospace', fontWeight: 'bold', marginTop: 4 },
  // NEW STYLES
  deleteButton: { marginTop: 8 },
  deleteText: { color: '#ff4444', fontSize: 8, fontFamily: 'monospace', fontWeight: 'bold' }
});
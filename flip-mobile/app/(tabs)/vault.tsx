import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { StyleSheet, Text, Dimensions, View, ScrollView, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import DecryptedText from '../../components/DecryptedText';
import CircularGallaryRN from '../../components/CircularGallaryRN';

export default function VaultScreen() {
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_SIZE = SCREEN_WIDTH * 0.35;
  // Load vault data
  const loadVaultData = async () => {
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
          flip_price
        )
      `)
      .eq('user_id', user.id);

    if (data) {
      const formattedAssets = data.map((row: any) => ({
        vault_id: row.id,
        ...row.items
      }));
      setAssets(formattedAssets);
    }
    setLoading(false);
  };

  // Listen for price updates
 useEffect(() => {
  const subscription = supabase
    .channel('schema-db-changes')
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'items' },
      () => {
        // wrap async call in a void function
        void loadVaultData();
      }
    )
    .subscribe();

  // Cleanup function
  return () => {
    supabase.removeChannel(subscription);
  };
}, []);

  useFocusEffect(useCallback(() => {
    loadVaultData();
  }, []));

  // Total personal equity
  const totalEquity = useMemo(() => {
    return assets.reduce((acc, item) => acc + (item.flip_price || 0), 0);
  }, [assets]);

  // Delete function
  const handleDelete = async (vaultId: string) => {
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
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color="#10a5b9" size="large" />
      </View>
    );
  }

  // Prepare gallery items
const galleryItems = assets.map(asset => ({
  id: asset.vault_id,
  title: asset.title,
  image_url: undefined,
  renderContent: () => (
    <View style={{
      width: CARD_SIZE,
      height: CARD_SIZE,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#111',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.1)',
      borderRadius: 12,
      padding: 5
    }}>
      <Text style={{
        color: '#fff',
        fontSize: 14,
        fontFamily: 'monospace',
        fontWeight: 'bold',
        textAlign: 'center'
      }}>
        {asset.title}
      </Text>
      <Text style={{
        color: '#10b981',
        fontSize: 12,
        fontFamily: 'monospace',
        fontWeight: '900',
        marginTop: 6
      }}>
        ${asset.flip_price?.toLocaleString() || 0}
      </Text>
      <TouchableOpacity
        onPress={() => handleDelete(asset.vault_id)}
        style={{ marginTop: 8 }}
      >
        <Text style={{ color: '#ff4444', fontSize: 10, fontFamily: 'monospace', fontWeight: 'bold' }}>
          [ REMOVE_ASSET ]
        </Text>
      </TouchableOpacity>
    </View>
  )
}));

  return (
    <ScrollView style={styles.container}>
      <View style={styles.equitySection}>
        <Text style={styles.equityLabel}>TOTAL_PERSONAL_EQUITY</Text>
        <DecryptedText 
          text={`$${totalEquity.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
          speed={40}
          maxIterations={12}
          sequential={true}
          style={styles.equityValue}
          encryptedStyle={{ color: '#e8ff47' }}
        />
      </View>

      <View style={styles.gallerySection}>
       <CircularGallaryRN 
  items={galleryItems}
  bend={1} 
  textColor="#ffffff" 
  borderRadius={0.05} 
  scrollSpeed={1} 
  scrollEase={0.05} 
/>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#080808' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#080808' },
  equitySection: { padding: 20, alignItems: 'center', marginTop: 40 },
  equityLabel: { color: '#555', fontSize: 12, fontFamily: 'monospace', letterSpacing: 4, marginBottom: 10 },
  equityValue: { color: '#fff', fontSize: 48, fontWeight: '900', fontFamily: 'monospace', letterSpacing: -2 },
  gallerySection: { flex: 1, marginTop: 30, paddingHorizontal: 20, paddingBottom: 100 }
});
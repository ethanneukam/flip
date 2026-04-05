import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { supabase } from '../../lib/supabase'; 

export default function HomeScreen() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if we can actually talk to Supabase
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.glitchText}>› TERMINAL_BOOT_SEQUENCE</Text>
      
      <View style={styles.vaultBox}>
        <Text style={styles.label}>DATABASE_STATUS:</Text>
        <Text style={styles.value}>[ CONNECTED ]</Text>
      </View>

      <View style={styles.vaultBox}>
        <Text style={styles.label}>USER_SESSION:</Text>
        <Text style={styles.value}>
          {loading ? 'CHECKING...' : session ? 'AUTHENTICATED' : 'ANONYMOUS_ACCESS'}
        </Text>
      </View>

      {loading && <ActivityIndicator color="#e8ff47" style={{ marginTop: 20 }} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    padding: 30,
    justifyContent: 'center',
  },
  glitchText: {
    color: '#e8ff47',
    fontFamily: 'monospace',
    fontSize: 14,
    marginBottom: 40,
    letterSpacing: 2,
  },
  vaultBox: {
    borderLeftWidth: 2,
    borderLeftColor: '#222',
    paddingLeft: 15,
    marginBottom: 20,
  },
  label: {
    color: '#555',
    fontSize: 10,
    fontFamily: 'monospace',
    textTransform: 'uppercase',
  },
  value: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'monospace',
    marginTop: 4,
  },
});
import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { supabase } from '../../lib/supabase'; // Make sure this path is correct!

export default function AuthScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('› READY_FOR_AUTH');

  async function signInWithEmail() {
    setLoading(true);
    setStatus('› AUTHENTICATING...');
    const { error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) {
      setStatus(`› ERROR: ${error.message}`);
    } else {
      setStatus('› ACCESS_GRANTED');
    }
    setLoading(false);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>TERMINAL_AUTH_v1.0</Text>
      <Text style={styles.status}>{status}</Text>

      <TextInput
        style={styles.input}
        placeholder="EMAIL"
        placeholderTextColor="#444"
        onChangeText={(text) => setEmail(text)}
        value={email}
        autoCapitalize={'none'}
      />
      <TextInput
        style={styles.input}
        placeholder="PASSWORD"
        placeholderTextColor="#444"
        secureTextEntry={true}
        onChangeText={(text) => setPassword(text)}
        value={password}
        autoCapitalize={'none'}
      />

      <TouchableOpacity 
        style={styles.button} 
        onPress={() => signInWithEmail()}
        disabled={loading}
      >
        {loading ? <ActivityIndicator color="#000" /> : <Text style={styles.buttonText}>[ LOGIN ]</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    padding: 40,
    justifyContent: 'center',
  },
  header: {
    color: '#e8ff47',
    fontSize: 18,
    fontFamily: 'Courier',
    fontWeight: 'bold',
    marginBottom: 5,
  },
  status: {
    color: '#555',
    fontSize: 10,
    fontFamily: 'Courier',
    marginBottom: 30,
  },
  input: {
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#333',
    color: '#fff',
    padding: 15,
    marginBottom: 15,
    fontFamily: 'Courier',
  },
  button: {
    backgroundColor: '#e8ff47',
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#000',
    fontWeight: 'bold',
    fontFamily: 'Courier',
  },
});
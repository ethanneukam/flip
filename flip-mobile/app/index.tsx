import React, { useState } from 'react';

import { StyleSheet, Text, View, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';

import { supabase } from '../lib/supabase';



export default function AuthScreen() {

  const [email, setEmail] = useState('');

  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);

  const [isSignUp, setIsSignUp] = useState(false);

  const [message, setMessage] = useState('› SYSTEM_READY');



  async function handleAuth() {

    setLoading(true);

    setMessage(isSignUp ? '› CREATING_ACCOUNT...' : '› VERIFYING_CREDENTIALS...');

   

    const { error } = isSignUp

      ? await supabase.auth.signUp({ email, password })

      : await supabase.auth.signInWithPassword({ email, password });



    if (error) {

      setMessage(`› ERROR: ${error.message.toUpperCase()}`);

    } else {

      setMessage(isSignUp ? '› CHECK_EMAIL_FOR_LINK' : '› ACCESS_GRANTED');

    }

    setLoading(false);

  }



  return (

    <KeyboardAvoidingView

      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}

      style={styles.container}

    >

      <ScrollView contentContainerStyle={styles.scrollContent}>

        <Text style={styles.glitchTitle}>TERMINAL_VAULT_v1.0</Text>

        <Text style={styles.statusText}>{message}</Text>



        <View style={styles.form}>

          <Text style={styles.label}>[ EMAIL_ADDRESS ]</Text>

          <TextInput

            style={styles.input}

            onChangeText={setEmail}

            value={email}

            placeholder="user@network.com"

            placeholderTextColor="#333"

            autoCapitalize="none"

          />



          <Text style={styles.label}>[ ACCESS_CODE ]</Text>

          <TextInput

            style={styles.input}

            onChangeText={setPassword}

            value={password}

            secureTextEntry

            placeholder="••••••••"

            placeholderTextColor="#333"

            autoCapitalize="none"

          />



          <TouchableOpacity style={styles.mainButton} onPress={handleAuth} disabled={loading}>

            <Text style={styles.buttonText}>

              {loading ? 'PROCESSING...' : isSignUp ? 'CREATE_OPERATOR' : 'INITIALIZE_LOGIN'}

            </Text>

          </TouchableOpacity>



          <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)} style={styles.switchButton}>

            <Text style={styles.switchText}>

              {isSignUp ? '› ALREADY_HAVE_ACCESS? LOGIN' : '› NEW_OPERATOR? REGISTER'}

            </Text>

          </TouchableOpacity>

        </View>

      </ScrollView>

    </KeyboardAvoidingView>

  );

}



const styles = StyleSheet.create({

  container: { flex: 1, backgroundColor: '#000' },

  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 30 },

  glitchTitle: { color: '#e8ff47', fontSize: 24, fontWeight: '900', fontFamily: 'monospace', fontStyle: 'italic' },

  statusText: { color: '#444', fontSize: 10, fontFamily: 'monospace', marginTop: 5, marginBottom: 40 },

  form: { gap: 10 },

  label: { color: '#e8ff47', fontSize: 10, fontFamily: 'monospace', marginBottom: 5, opacity: 0.7 },

  input: { backgroundColor: '#0a0a0a', borderBottomWidth: 1, borderBottomColor: '#e8ff4733', color: '#fff', padding: 15, fontFamily: 'monospace', marginBottom: 20 },

  mainButton: { backgroundColor: '#e8ff47', padding: 18, alignItems: 'center', borderRadius: 2 },

  buttonText: { color: '#000', fontWeight: 'bold', fontFamily: 'monospace' },

  switchButton: { marginTop: 20, alignItems: 'center' },

  switchText: { color: '#555', fontSize: 10, fontFamily: 'monospace' }

}); 
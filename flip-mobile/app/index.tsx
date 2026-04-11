import React, { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import LoginBoot from '../components/LoginBoot';
import TextPressureTitle from '../components/TextPressureTitle';
import FadeContent from '../components/FadeContent';
import { supabase } from '../lib/supabase'; 
import { router } from 'expo-router';

export default function LoginScreen() {
  const [booting, setBooting] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [agreed, setAgreed] = useState(false); // New state for TOS

  const handleLogin = async () => {
    if (!email || !password) {
      setError('MISSING_CREDENTIALS');
      return;
    }

    // Check for agreement before proceeding
    if (!agreed) {
      setError('ACCEPTANCE_REQUIRED');
      return;
    }

    setError('');
    setLoading(true);

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    setLoading(false);

    if (authError) {
      setError(authError.message.toUpperCase());
    } else {
      router.replace('/(tabs)');
    }
  };

  if (booting) {
    return (
      <>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <LoginBoot onComplete={() => setBooting(false)} />
      </>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      <FadeContent duration={900} delay={0} slideUp={false}>
        <View style={styles.scanlines} pointerEvents="none" />
        <TextPressureTitle value={password} />
        
        <View style={styles.cornerTL}><Text style={styles.cornerText}>┌─</Text></View>
        <View style={styles.cornerTR}><Text style={styles.cornerText}>─┐</Text></View>
        <View style={styles.cornerBL}><Text style={styles.cornerText}>└─</Text></View>
        <View style={styles.cornerBR}><Text style={styles.cornerText}>─┘</Text></View>
      </FadeContent>

      <FadeContent duration={800} delay={200} slideUp>
        <View style={styles.formContainer}>

          {/* Email */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>› OPERATOR_ID</Text>
            <View style={styles.inputWrapper}>
              <Text style={styles.inputPrefix}>_</Text>
              <TextInput
                style={styles.input}
                placeholder="enter email address"
                placeholderTextColor="#222"
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
                selectionColor="#10b981"
              />
            </View>
            <View style={styles.inputLine} />
          </View>

          {/* Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>› ACCESS_KEY</Text>
            <View style={styles.inputWrapper}>
              <Text style={styles.inputPrefix}>_</Text>
              <TextInput
                style={styles.input}
                placeholder="enter password"
                placeholderTextColor="#222"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                selectionColor="#10b981"
              />
            </View>
            <View style={styles.inputLine} />
          </View>

          {/* TOS & Privacy Policy Checkbox */}
          <View style={styles.tosContainer}>
            <TouchableOpacity 
              style={[styles.checkbox, agreed && styles.checkboxActive]} 
              onPress={() => setAgreed(!agreed)}
            >
              {agreed && <Text style={styles.checkboxCheck}>×</Text>}
            </TouchableOpacity>
            
            <View style={styles.tosTextWrapper}>
              <Text style={styles.tosText}>I AGREE TO THE </Text>
              <TouchableOpacity onPress={() => router.push('/tos')}>
                <Text style={styles.tosLink}>[ TOS ]</Text>
              </TouchableOpacity>
              <Text style={styles.tosText}> AND </Text>
              <TouchableOpacity onPress={() => router.push('/pp')}>
                <Text style={styles.tosLink}>[ PRIVACY_POLICY ]</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Error message */}
          {error ? (
            <Text style={styles.errorText}>⚠ {error}</Text>
          ) : null}

          {/* Submit */}
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonLoading]}
            onPress={handleLogin}
            activeOpacity={0.85}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? '[ AUTHENTICATING... ]' : '[ INITIALIZE_AUTH ]'}
            </Text>
          </TouchableOpacity>

          {/* Footer links */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>FORGOT_KEY</Text>
            <Text style={styles.footerDivider}>|</Text>
            <Text style={styles.footerText}>REQUEST_ACCESS</Text>
          </View>

          <Text style={styles.versionText}>FLIP_OS v1.0.0 · SECURE_CHANNEL</Text>
        </View>
      </FadeContent>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    padding: 30,
  },
  scanlines: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    opacity: 0.03,
    zIndex: 0,
  },
  cornerTL: { position: 'absolute', top: -40, left: -10 },
  cornerTR: { position: 'absolute', top: -40, right: -10 },
  cornerBL: { position: 'absolute', bottom: -10, left: -10 },
  cornerBR: { position: 'absolute', bottom: -10, right: -10 },
  cornerText: {
    color: '#1a1a1a',
    fontFamily: 'monospace',
    fontSize: 12,
  },
  formContainer: {
    width: '100%',
  },
  inputGroup: {
    marginBottom: 28,
  },
  label: {
    color: '#333',
    fontFamily: 'monospace',
    fontSize: 9,
    letterSpacing: 3,
    marginBottom: 10,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputPrefix: {
    color: '#10b981',
    fontFamily: 'monospace',
    fontSize: 14,
    marginRight: 8,
    marginBottom: 2,
  },
  input: {
    flex: 1,
    color: '#10b981',
    fontFamily: 'monospace',
    fontSize: 14,
    paddingVertical: 8,
    letterSpacing: 1,
  },
  inputLine: {
    height: 1,
    backgroundColor: '#111',
    marginTop: 4,
  },
  // --- NEW TOS STYLES ---
  tosContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    marginTop: -8, // Tighter spacing with password field
  },
  checkbox: {
    width: 18,
    height: 18,
    borderWidth: 1,
    borderColor: '#333',
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  checkboxActive: {
    borderColor: '#10b981',
  },
  checkboxCheck: {
    color: '#10b981',
    fontFamily: 'monospace',
    fontSize: 14,
    fontWeight: 'bold',
  },
  tosTextWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    flex: 1,
  },
  tosText: {
    color: '#333',
    fontFamily: 'monospace',
    fontSize: 8,
  },
  tosLink: {
    color: '#10b981',
    fontFamily: 'monospace',
    fontSize: 8,
    textDecorationLine: 'underline',
  },
  // ----------------------
  errorText: {
    color: '#ef4444',
    fontFamily: 'monospace',
    fontSize: 10,
    letterSpacing: 2,
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#10b981',
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  buttonLoading: {
    backgroundColor: '#064e3b',
  },
  buttonText: {
    color: '#000',
    fontFamily: 'monospace',
    fontWeight: '900',
    fontSize: 12,
    letterSpacing: 2,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 28,
  },
  footerText: {
    color: '#222',
    fontFamily: 'monospace',
    fontSize: 9,
    letterSpacing: 2,
  },
  footerDivider: {
    color: '#111',
    fontFamily: 'monospace',
    fontSize: 9,
  },
  versionText: {
    color: '#111',
    fontFamily: 'monospace',
    fontSize: 8,
    textAlign: 'center',
    letterSpacing: 2,
  },
});
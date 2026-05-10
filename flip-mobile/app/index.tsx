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
  ActivityIndicator,
} from 'react-native';
import LoginBoot from '../components/LoginBoot';
import FadeContent from '../components/FadeContent';
import { supabase } from '../lib/supabase';
import { router } from 'expo-router';

export default function AuthScreen() {
  const [booting, setBooting] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [isSignup, setIsSignup] = useState(false);

  const handleAuth = async () => {
    if (!email || !password) {
      setError('MISSING_CREDENTIALS');
      return;
    }

    if (!agreed) {
      setError('ACCEPTANCE_REQUIRED');
      return;
    }

    setError('');
    setLoading(true);

    if (isSignup) {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });
      setLoading(false);
      if (signUpError) {
        setError(signUpError.message.toUpperCase());
      } else {
        router.replace('/(tabs)');
      }
    } else {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      setLoading(false);
      if (authError) {
        setError(authError.message.toUpperCase());
      } else {
        router.replace('/(tabs)');
      }
    }
  };

  if (booting) {
    return (
      <>
        <StatusBar barStyle="light-content" backgroundColor="#080808" />
        <LoginBoot onComplete={() => setBooting(false)} />
      </>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" backgroundColor="#080808" />

      <FadeContent duration={800} delay={200} slideUp>
        <View style={styles.formContainer}>
          {/* Header */}
          <View style={styles.headerSection}>
            <Text style={styles.headerTitle}>
              {isSignup ? 'REGISTER_OPERATOR' : 'IDENTITY_PROTOCOL'}
            </Text>
            <Text style={styles.headerSubtitle}>
              {isSignup ? 'Create new system identity' : 'Authorization required'}
            </Text>
          </View>

          {/* Email */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>› NETWORK_EMAIL</Text>
            <View style={styles.inputWrapper}>
              <Text style={styles.inputPrefix}>_</Text>
              <TextInput
                style={styles.input}
                placeholder="enter email address"
                placeholderTextColor="#333"
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
                selectionColor="#00FF87"
              />
            </View>
            <View style={styles.inputLine} />
          </View>

          {/* Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>› SECURITY_KEY</Text>
            <View style={styles.inputWrapper}>
              <Text style={styles.inputPrefix}>_</Text>
              <TextInput
                style={styles.input}
                placeholder="enter password"
                placeholderTextColor="#333"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                selectionColor="#00FF87"
              />
            </View>
            <View style={styles.inputLine} />
          </View>

          {/* TOS Agreement */}
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

          {/* Error */}
          {error ? (
            <Text style={styles.errorText}>⚠ {error}</Text>
          ) : null}

          {/* Submit */}
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonLoading]}
            onPress={handleAuth}
            activeOpacity={0.85}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#080808" size="small" />
            ) : (
              <Text style={styles.buttonText}>
                {isSignup ? '[ CREATE_IDENTITY ]' : '[ INITIALIZE_SESSION ]'}
              </Text>
            )}
          </TouchableOpacity>

          {/* Toggle Login/Signup */}
          <TouchableOpacity
            style={styles.toggleButton}
            onPress={() => {
              setIsSignup(!isSignup);
              setError('');
            }}
          >
            <Text style={styles.toggleText}>
              {isSignup
                ? 'EXISTING_OPERATOR? → INITIALIZE_SESSION'
                : 'NEW_OPERATOR? → CREATE_IDENTITY'}
            </Text>
          </TouchableOpacity>

          <Text style={styles.versionText}>FLIP_OS v2.0 · SECURE_CHANNEL</Text>
        </View>
      </FadeContent>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#080808',
    justifyContent: 'center',
    padding: 30,
  },
  formContainer: {
    width: '100%',
  },
  headerSection: {
    marginBottom: 36,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontFamily: 'monospace',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  headerSubtitle: {
    color: '#888888',
    fontFamily: 'monospace',
    fontSize: 11,
    marginTop: 6,
  },
  inputGroup: {
    marginBottom: 28,
  },
  label: {
    color: '#888888',
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
    color: '#00FF87',
    fontFamily: 'monospace',
    fontSize: 14,
    marginRight: 8,
  },
  input: {
    flex: 1,
    color: '#00FF87',
    fontFamily: 'monospace',
    fontSize: 14,
    paddingVertical: 8,
    letterSpacing: 1,
  },
  inputLine: {
    height: 1,
    backgroundColor: '#2A2A2A',
    marginTop: 4,
  },
  tosContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    backgroundColor: '#080808',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  checkboxActive: {
    borderColor: '#00FF87',
  },
  checkboxCheck: {
    color: '#00FF87',
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
    color: '#888888',
    fontFamily: 'monospace',
    fontSize: 8,
  },
  tosLink: {
    color: '#00FF87',
    fontFamily: 'monospace',
    fontSize: 8,
  },
  errorText: {
    color: '#FF4444',
    fontFamily: 'monospace',
    fontSize: 10,
    letterSpacing: 2,
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#00FF87',
    padding: 16,
    alignItems: 'center',
    borderRadius: 2,
    marginBottom: 16,
  },
  buttonLoading: {
    backgroundColor: '#004d29',
  },
  buttonText: {
    color: '#080808',
    fontFamily: 'monospace',
    fontWeight: '900',
    fontSize: 12,
    letterSpacing: 2,
  },
  toggleButton: {
    alignItems: 'center',
    padding: 12,
    marginBottom: 24,
  },
  toggleText: {
    color: '#888888',
    fontFamily: 'monospace',
    fontSize: 9,
    letterSpacing: 1,
  },
  versionText: {
    color: '#2A2A2A',
    fontFamily: 'monospace',
    fontSize: 8,
    textAlign: 'center',
    letterSpacing: 2,
  },
});

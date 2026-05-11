import React, { useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { supabase } from '../../lib/supabase';

const { width } = Dimensions.get('window');
const API_BASE_URL = 'https://flip-black-two.vercel.app';

export default function ScannerScreen() {
  const [permissionResponse, requestPermission] = useCameraPermissions();
  const permission = permissionResponse;

  const cameraRef = useRef<any>(null);
  const router = useRouter();

  const [scanning, setScanning] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.message}>› CAMERA_ACCESS_REQUIRED</Text>
        <Text style={styles.permissionSub}>
          Camera permission is needed to scan items
        </Text>
        <TouchableOpacity
          style={styles.permissionButton}
          onPress={async () => {
            try {
              await requestPermission();
            } catch (err) {
              const errorMessage = err instanceof Error ? err.message : 'UNKNOWN_SYSTEM_ERROR';
              setError(errorMessage);
            }
          }}
        >
          <Text style={styles.permissionButtonText}>[ GRANT_ACCESS ]</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleCapture = async () => {
    if (scanning || !cameraRef.current) return;

    setScanning(true);
    setError(null);

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.4,
        base64: true,
      });

      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setError('SESSION_EXPIRED');
        setScanning(false);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/ai-scan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ image: `data:image/jpeg;base64,${photo.base64}` }),
      });

      if (response.status === 429) {
        setShowPaywall(true);
        setScanning(false);
        return;
      }

      if (response.status === 401) {
        setError('AUTHENTICATION_REQUIRED');
        setScanning(false);
        return;
      }

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(errBody.error || `HTTP ${response.status}`);
      }

      const { flipItemId, productName } = await response.json();

      if (!flipItemId) {
        throw new Error('No flipItemId returned from server');
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.push(`/(tabs)/result?id=${flipItemId}`);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'SCAN_FAILED';
      setError(errorMessage);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setScanning(false);
    }
  };

  return (
    <View style={styles.container}>
      <CameraView style={styles.camera} ref={cameraRef}>
        <View style={styles.overlay}>
          {/* Top HUD */}
          <View style={styles.topHud}>
            <Text style={styles.hudText}>
              {scanning ? 'ANALYZING...' : 'SCANNER_ACTIVE'}
            </Text>
            <View style={[styles.pulseDot, scanning && { backgroundColor: '#00FF87' }]} />
          </View>

          {/* Target Box */}
          <View style={styles.targetContainer}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
            {scanning && (
              <View style={styles.scanningOverlay}>
                <ActivityIndicator color="#00FF87" size="large" />
                <Text style={styles.scanningText}>AI_IDENTIFYING_ITEM...</Text>
              </View>
            )}
          </View>

          {/* Error Display */}
          {error && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>⚠ {error}</Text>
            </View>
          )}

          {/* Bottom HUD */}
          <View style={styles.bottomHud}>
            <Text style={styles.instruction}>
              {scanning ? 'PROCESSING_SCAN' : 'CENTER_ITEM_IN_FRAME'}
            </Text>
            <TouchableOpacity
              style={[styles.captureCircle, scanning && styles.captureDisabled]}
              onPress={handleCapture}
              disabled={scanning}
              activeOpacity={0.7}
            >
              {scanning ? (
                <ActivityIndicator color="#080808" size="small" />
              ) : (
                <View style={styles.captureInner} />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </CameraView>

      {/* Paywall Modal (fires on 429 SCAN_LIMIT_REACHED) */}
      <Modal
        visible={showPaywall}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPaywall(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>SCAN_LIMIT_REACHED</Text>
            <Text style={styles.modalBody}>
              You've used all your daily scans. Upgrade to Flip Pro for unlimited scanning.
            </Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setShowPaywall(false)}
            >
              <Text style={styles.modalButtonText}>[ DISMISS ]</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#080808' },
  camera: { flex: 1 },
  permissionContainer: { flex: 1, backgroundColor: '#080808', justifyContent: 'center', alignItems: 'center', padding: 40 },
  message: { color: '#00FF87', fontFamily: 'monospace', fontSize: 14, textAlign: 'center', marginBottom: 12 },
  permissionSub: { color: '#888888', fontFamily: 'monospace', fontSize: 11, textAlign: 'center', marginBottom: 24 },
  permissionButton: { backgroundColor: '#00FF87', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 2 },
  permissionButtonText: { color: '#080808', fontFamily: 'monospace', fontWeight: 'bold', fontSize: 12 },
  overlay: { flex: 1, backgroundColor: 'transparent', justifyContent: 'space-between', padding: 40 },
  topHud: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 20 },
  hudText: { color: '#00FF87', fontFamily: 'monospace', fontSize: 12, letterSpacing: 2 },
  pulseDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF4444' },
  targetContainer: { width: width * 0.7, height: width * 0.7, alignSelf: 'center', position: 'relative', justifyContent: 'center', alignItems: 'center' },
  corner: { position: 'absolute', width: 24, height: 24, borderColor: '#00FF87', borderWidth: 2 },
  topLeft: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
  topRight: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
  bottomLeft: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
  bottomRight: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },
  scanningOverlay: { alignItems: 'center', gap: 12 },
  scanningText: { color: '#00FF87', fontFamily: 'monospace', fontSize: 10, letterSpacing: 2 },
  errorBanner: { backgroundColor: 'rgba(255, 68, 68, 0.15)', borderWidth: 1, borderColor: '#FF4444', borderRadius: 4, padding: 12, marginHorizontal: 20 },
  errorText: { color: '#FF4444', fontFamily: 'monospace', fontSize: 10, textAlign: 'center' },
  bottomHud: { alignItems: 'center', gap: 20 },
  instruction: { color: '#FFFFFF', fontFamily: 'monospace', fontSize: 10, opacity: 0.6, letterSpacing: 2 },
  captureCircle: { width: 70, height: 70, borderRadius: 35, borderWidth: 4, borderColor: '#00FF87', justifyContent: 'center', alignItems: 'center' },
  captureDisabled: { borderColor: '#888888', opacity: 0.5 },
  captureInner: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#00FF87' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 40 },
  modalContent: { backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#FF4444', borderRadius: 4, padding: 32, width: '100%', alignItems: 'center' },
  modalTitle: { color: '#FF4444', fontFamily: 'monospace', fontSize: 14, fontWeight: 'bold', letterSpacing: 2, marginBottom: 16 },
  modalBody: { color: '#AAAAAA', fontFamily: 'monospace', fontSize: 12, textAlign: 'center', lineHeight: 18, marginBottom: 24 },
  modalButton: { backgroundColor: '#2A2A2A', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 2 },
  modalButtonText: { color: '#FFFFFF', fontFamily: 'monospace', fontSize: 11, fontWeight: 'bold' },
});

import React, { useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Dimensions } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Superwall from '@superwall/react-native-superwall';
import Purchases from 'react-native-purchases';

const { width } = Dimensions.get('window');

export default function ScannerScreen() {
  // PROPER PC BYPASS: We keep the hook so the button doesn't crash, 
  // but we force the permission to 'true' for PC testing.
  const [permissionResponse, requestPermission] = useCameraPermissions();
  const permission = { granted: true }; // CHANGE TO `permissionResponse` WHEN ON IPHONE

  const cameraRef = useRef<any>(null);
  const router = useRouter();

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>› CAMERA_ACCESS_REQUIRED</Text>
        <TouchableOpacity 
          style={styles.button} 
          onPress={async () => {
            console.log("› ATTEMPTING_PERMISSION_REQUEST...");
            try {
              const result = await requestPermission();
              console.log("› PERMISSION_RESULT:", result);
            } catch (err) {
              const errorMessage = err instanceof Error ? err.message : 'UNKNOWN_SYSTEM_ERROR';
              console.error("› PERMISSION_ERROR:", errorMessage);
              alert("Camera error: " + errorMessage);
            }
          }}
        >
          <Text style={styles.buttonText}>[ GRANT_ACCESS ]</Text>
        </TouchableOpacity>
      </View>
    );
  }
const handleScanRequest = async () => {
  try {
    // 1. Ask RevenueCat if this user is a 'premium' member
    const customerInfo = await Purchases.getCustomerInfo();
    const isPremium = customerInfo.entitlements.active['premium'] !== undefined;

    if (isPremium) {
      console.log("› VIP_ACCESS_GRANTED");
      takePicture();
      return;
    }

    // 2. If not premium, proceed to your daily limit check
    const today = new Date().toDateString();
    const storageKey = `has_scanned_${today}`;
    const hasScannedToday = await AsyncStorage.getItem(storageKey);

    if (!hasScannedToday) {
      await AsyncStorage.setItem(storageKey, 'true');
      takePicture();
    } else {
      Superwall.shared.register({
        placement: 'scan_limit_reached',
        feature: () => {
          takePicture();
        }
      });
    }
  } catch (e) {
    takePicture(); // Failsafe
  }
};

  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        console.log("› INITIALIZING_SCAN...");
        
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.4, // Small = Fast
          base64: true,
        });

        // Send Base64 to your EXISTING Next.js API
        const response = await fetch('https://flip-black-two.vercel.app/api/ai-scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: `data:image/jpeg;base64,${photo.base64}` }),
        });

        const { productName, error } = await response.json();

        if (productName) {
          console.log(`› IDENTIFIED: ${productName}`);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          
          // Route to the Dashboard and pass the scanned item
          router.push({
            pathname: '/', 
            params: { query: productName } 
          });
        } else {
          console.error("› VISION_SCAN_FAILED", error);
        }

      } catch (err) {
        console.error("› SYSTEM_CRITICAL_FAILURE", err);
      }
    }
  }; // <--- THIS BRACKET WAS MISSING!

  return (
    <View style={styles.container}>
      <CameraView style={styles.camera} ref={cameraRef}>
        <View style={styles.overlay}>
          {/* Top HUD */}
          <View style={styles.topHud}>
            <Text style={styles.hudText}>SCANNER_ACTIVE</Text>
            <View style={styles.pulseDot} />
          </View>

          {/* Target Box */}
          <View style={styles.targetContainer}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
          </View>

          {/* Bottom HUD */}
          <View style={styles.bottomHud}>
            <Text style={styles.instruction}>CENTER_ITEM_IN_FRAME</Text>
            <TouchableOpacity style={styles.captureCircle} onPress={takePicture}>
              <View style={styles.captureInner} />
            </TouchableOpacity>
          </View>
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  message: { color: '#47fff0', fontFamily: 'monospace', textAlign: 'center', marginBottom: 20 },
  overlay: { flex: 1, backgroundColor: 'transparent', justifyContent: 'space-between', padding: 40 },
  topHud: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  hudText: { color: '#47e3ff', fontFamily: 'monospace', fontSize: 12, letterSpacing: 2 },
  pulseDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'red' },
  targetContainer: { width: width * 0.7, height: width * 0.95, alignSelf: 'center', borderWidth: 0, position: 'relative' },
  corner: { position: 'absolute', width: 20, height: 20, borderColor: '#47f3ff', borderWidth: 2 },
  topLeft: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
  topRight: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
  bottomLeft: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
  bottomRight: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },
  bottomHud: { alignItems: 'center', gap: 20 },
  instruction: { color: '#fff', fontFamily: 'monospace', fontSize: 10, opacity: 0.6 },
  captureCircle: { width: 70, height: 70, borderRadius: 35, borderWidth: 4, borderColor: '#47daff', justifyContent: 'center', alignItems: 'center' },
  captureInner: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#47eaff' },
  button: { backgroundColor: '#47bbff', padding: 15, borderRadius: 2 },
  buttonText: { color: '#000', fontFamily: 'monospace', fontWeight: 'bold' },
});
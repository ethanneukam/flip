import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Dimensions } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';

const { width } = Dimensions.get('window');

export default function ScannerScreen() {
  //const [permission, requestPermission] = useCameraPermissions();
  const permission = { granted: true }; // Force it on
  const cameraRef = useRef(null);

  if (!permission) {
    // Camera permissions are still loading.
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    // Camera permissions are not granted yet.
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
  // We check if it's actually an Error object before touching .message
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

  const takePicture = async () => {
    if (cameraRef.current) {
      console.log("› CAPTURING_FRAME...");
      // Logic for Day 8 will go here
    }
  };

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
            <Text style={styles.instruction}>CENTER_CARD_IN_FRAME</Text>
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
  message: { color: '#e8ff47', fontFamily: 'monospace', textAlign: 'center', marginBottom: 20 },
  overlay: { flex: 1, backgroundColor: 'transparent', justifyContent: 'space-between', padding: 40 },
  topHud: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  hudText: { color: '#e8ff47', fontFamily: 'monospace', fontSize: 12, letterSpacing: 2 },
  pulseDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'red' },
  targetContainer: {
    width: width * 0.7,
    height: width * 0.95, // Card aspect ratio
    alignSelf: 'center',
    borderWidth: 0,
    position: 'relative',
  },
  corner: { position: 'absolute', width: 20, height: 20, borderColor: '#e8ff47', borderWidth: 2 },
  topLeft: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
  topRight: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
  bottomLeft: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
  bottomRight: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },
  bottomHud: { alignItems: 'center', gap: 20 },
  instruction: { color: '#fff', fontFamily: 'monospace', fontSize: 10, opacity: 0.6 },
  captureCircle: { width: 70, height: 70, borderRadius: 35, borderWidth: 4, borderColor: '#e8ff47', justifyContent: 'center', alignItems: 'center' },
  captureInner: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#e8ff47' },
  button: { backgroundColor: '#e8ff47', padding: 15, borderRadius: 2 },
  buttonText: { color: '#000', fontFamily: 'monospace', fontWeight: 'bold' },
});
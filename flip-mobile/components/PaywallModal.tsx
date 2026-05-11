import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import * as Haptics from 'expo-haptics';

type Props = {
  visible: boolean;
  onDismiss: () => void;
  onUpgrade?: () => void;
};

export default function PaywallModal({ visible, onDismiss, onUpgrade }: Props) {
  const handleUpgrade = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onUpgrade?.();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerIcon}>⊘</Text>
            <Text style={styles.headerTitle}>SCAN_LIMIT_REACHED</Text>
          </View>

          {/* Body */}
          <Text style={styles.body}>
            You've used all your daily scans. Upgrade to Flip Pro for unlimited access.
          </Text>

          {/* Value Props */}
          <View style={styles.valueProps}>
            <View style={styles.valueProp}>
              <Text style={styles.valueCheck}>✓</Text>
              <Text style={styles.valueText}>Unlimited daily scans</Text>
            </View>
            <View style={styles.valueProp}>
              <Text style={styles.valueCheck}>✓</Text>
              <Text style={styles.valueText}>Advanced market intelligence</Text>
            </View>
            <View style={styles.valueProp}>
              <Text style={styles.valueCheck}>✓</Text>
              <Text style={styles.valueText}>Early trend signals</Text>
            </View>
            <View style={styles.valueProp}>
              <Text style={styles.valueCheck}>✓</Text>
              <Text style={styles.valueText}>Priority AI processing</Text>
            </View>
          </View>

          {/* Upgrade CTA */}
          <TouchableOpacity
            style={styles.upgradeButton}
            onPress={handleUpgrade}
            activeOpacity={0.8}
          >
            <Text style={styles.upgradeText}>[ UPGRADE TO PRO ]</Text>
          </TouchableOpacity>

          {/* Dismiss */}
          <TouchableOpacity style={styles.dismissButton} onPress={onDismiss}>
            <Text style={styles.dismissText}>Maybe later</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  container: {
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: '#00FF87',
    borderRadius: 4,
    padding: 32,
    width: '100%',
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  headerIcon: {
    fontSize: 36,
    color: '#FF4444',
    marginBottom: 12,
  },
  headerTitle: {
    color: '#FF4444',
    fontFamily: 'monospace',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  body: {
    color: '#AAAAAA',
    fontFamily: 'monospace',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 24,
  },
  valueProps: {
    width: '100%',
    marginBottom: 24,
  },
  valueProp: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  valueCheck: {
    color: '#00FF87',
    fontFamily: 'monospace',
    fontSize: 12,
  },
  valueText: {
    color: '#FFFFFF',
    fontFamily: 'monospace',
    fontSize: 11,
  },
  upgradeButton: {
    backgroundColor: '#00FF87',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 2,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  upgradeText: {
    color: '#080808',
    fontFamily: 'monospace',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  dismissButton: {
    padding: 12,
  },
  dismissText: {
    color: '#888888',
    fontFamily: 'monospace',
    fontSize: 10,
  },
});

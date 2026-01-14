/**
 * ScanScreen
 *
 * Main camera scanning screen for component detection.
 * Provides camera preview, scan controls, and claim input.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography } from '../theme';
import { useAppStore, type ParsedClaim } from '../../store';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export interface ScanScreenProps {
  onScanComplete?: (components: unknown[]) => void;
  onNavigateToResult?: () => void;
  onNavigateToHistory?: () => void;
}

/**
 * Parse a raw claim string into structured claim data
 */
function parseClaimString(raw: string): ParsedClaim | null {
  if (!raw.trim()) return null;

  // Simple parsing: extract number and unit
  const match = raw.match(/^([\d,]+(?:\.\d+)?)\s*(.+)$/);
  if (match) {
    const value = parseFloat(match[1].replace(/,/g, ''));
    const unit = match[2].trim().toLowerCase();

    // Determine claim type from unit
    let claimType = 'unknown';
    if (unit.includes('lumen') || unit === 'lm') claimType = 'brightness';
    else if (unit.includes('watt') || unit === 'w') claimType = 'power';
    else if (unit.includes('mah') || unit.includes('ah')) claimType = 'capacity';
    else if (unit.includes('volt') || unit === 'v') claimType = 'voltage';
    else if (unit.includes('amp') || unit === 'a') claimType = 'current';
    else if (unit.includes('hz') || unit.includes('mhz') || unit.includes('ghz')) claimType = 'frequency';

    return {
      raw,
      parsed: { value, unit, claimType },
    };
  }

  return { raw, parsed: { value: 0, unit: 'unknown', claimType: 'unknown' } };
}

export function ScanScreen({
  onScanComplete,
  onNavigateToResult,
  onNavigateToHistory,
}: ScanScreenProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [claimInput, setClaimInput] = useState('');

  const { currentClaim, setCurrentClaim, setDetectedComponents } = useAppStore();

  const handleStartScan = useCallback(() => {
    setIsScanning(true);
    // Simulate component detection after 2 seconds
    setTimeout(() => {
      const mockComponents = [
        { partNumber: 'XHP70.2', manufacturer: 'Cree', category: 'led' },
        { partNumber: 'MP3431', manufacturer: 'MPS', category: 'led-driver' },
      ];
      setDetectedComponents(mockComponents as any);
      setIsScanning(false);
      onScanComplete?.(mockComponents);
      onNavigateToResult?.();
    }, 2000);
  }, [setDetectedComponents, onScanComplete, onNavigateToResult]);

  const handleStopScan = useCallback(() => {
    setIsScanning(false);
  }, []);

  const handleClaimSubmit = useCallback(() => {
    const parsed = parseClaimString(claimInput);
    if (parsed) {
      setCurrentClaim(parsed);
      setClaimInput('');
      setShowClaimModal(false);
    }
  }, [claimInput, setCurrentClaim]);

  const handleClearClaim = useCallback(() => {
    setCurrentClaim(null);
  }, [setCurrentClaim]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Camera Preview Area */}
      <View style={styles.cameraContainer}>
        <View style={styles.cameraPlaceholder}>
          <Ionicons name="camera-outline" size={64} color={colors.gray[700]} />
          <Text style={styles.placeholderText}>Camera Preview</Text>
          <Text style={styles.placeholderSubtext}>
            Point at a circuit board to scan components
          </Text>
        </View>

        {/* Scanning Overlay */}
        {isScanning && (
          <View style={styles.scanOverlay}>
            <View style={styles.scanFrame}>
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
            </View>
            <View style={styles.scanningIndicator}>
              <View style={styles.pulsingDot} />
              <Text style={styles.scanningText}>Scanning for components...</Text>
            </View>
          </View>
        )}

        {/* Detected Components Overlay */}
        {!isScanning && (
          <View style={styles.hintOverlay}>
            <View style={styles.hintBadge}>
              <Ionicons name="information-circle-outline" size={16} color={colors.info} />
              <Text style={styles.hintText}>Tap the scan button to begin</Text>
            </View>
          </View>
        )}
      </View>

      {/* Current Claim Banner */}
      {currentClaim && (
        <View style={styles.claimBanner}>
          <View style={styles.claimInfo}>
            <Text style={styles.claimLabel}>Testing claim:</Text>
            <Text style={styles.claimText}>{currentClaim.raw}</Text>
          </View>
          <TouchableOpacity
            style={styles.clearClaimButton}
            onPress={handleClearClaim}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close-circle" size={22} color={colors.gray[500]} />
          </TouchableOpacity>
        </View>
      )}

      {/* Control Panel */}
      <View style={styles.controls}>
        {/* Enter Claim Button */}
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => setShowClaimModal(true)}
        >
          <Ionicons name="create-outline" size={24} color="#00D4FF" />
          <Text style={styles.secondaryButtonText}>Enter Claim</Text>
        </TouchableOpacity>

        {/* Main Scan Button */}
        <TouchableOpacity
          style={[styles.scanButton, isScanning && styles.scanButtonActive]}
          onPress={isScanning ? handleStopScan : handleStartScan}
          activeOpacity={0.8}
        >
          <Ionicons
            name={isScanning ? 'stop' : 'scan'}
            size={32}
            color={colors.black}
          />
        </TouchableOpacity>

        {/* Quick Test / History Button */}
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={onNavigateToHistory}
        >
          <Ionicons name="flash-outline" size={24} color="#00D4FF" />
          <Text style={styles.secondaryButtonText}>Quick Test</Text>
        </TouchableOpacity>
      </View>

      {/* Claim Input Modal */}
      <Modal
        visible={showClaimModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowClaimModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Enter Product Claim</Text>
              <TouchableOpacity
                onPress={() => setShowClaimModal(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={24} color={colors.gray[400]} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDescription}>
              Enter a manufacturer's claim to verify against detected components
            </Text>

            <TextInput
              style={styles.claimInputField}
              placeholder="e.g., 10,000 lumens, 65W, 5000mAh"
              placeholderTextColor={colors.gray[500]}
              value={claimInput}
              onChangeText={setClaimInput}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleClaimSubmit}
            />

            <View style={styles.exampleClaims}>
              <Text style={styles.exampleLabel}>Examples:</Text>
              {['10,000 lumens', '65W fast charging', '5000mAh battery'].map((example) => (
                <TouchableOpacity
                  key={example}
                  style={styles.exampleChip}
                  onPress={() => setClaimInput(example)}
                >
                  <Text style={styles.exampleChipText}>{example}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.submitButton, !claimInput.trim() && styles.submitButtonDisabled]}
              onPress={handleClaimSubmit}
              disabled={!claimInput.trim()}
            >
              <Text style={styles.submitButtonText}>Verify This Claim</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
  },
  cameraContainer: {
    flex: 1,
    position: 'relative',
  },
  cameraPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0a0a0a',
  },
  placeholderText: {
    color: colors.gray[600],
    fontSize: typography.fontSize.lg,
    marginTop: spacing[4],
    fontWeight: '500',
  },
  placeholderSubtext: {
    color: colors.gray[700],
    fontSize: typography.fontSize.sm,
    marginTop: spacing[2],
    textAlign: 'center',
    paddingHorizontal: spacing[8],
  },
  scanOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  scanFrame: {
    width: SCREEN_WIDTH * 0.75,
    height: SCREEN_WIDTH * 0.75,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: '#00D4FF',
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: borderRadius.sm,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: borderRadius.sm,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: borderRadius.sm,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: borderRadius.sm,
  },
  scanningIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing[6],
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.full,
  },
  pulsingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00D4FF',
    marginRight: spacing[2],
  },
  scanningText: {
    color: '#00D4FF',
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
  },
  hintOverlay: {
    position: 'absolute',
    bottom: spacing[6],
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  hintBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.full,
    gap: spacing[2],
  },
  hintText: {
    color: colors.info,
    fontSize: typography.fontSize.sm,
  },
  claimBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#111',
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    borderTopWidth: 1,
    borderTopColor: '#222',
  },
  claimInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  claimLabel: {
    color: colors.gray[500],
    fontSize: typography.fontSize.sm,
  },
  claimText: {
    color: colors.white,
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    flex: 1,
  },
  clearClaimButton: {
    padding: spacing[1],
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: spacing[6],
    paddingHorizontal: spacing[4],
    backgroundColor: '#111',
    borderTopWidth: 1,
    borderTopColor: '#222',
  },
  scanButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#00D4FF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#00D4FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  scanButtonActive: {
    backgroundColor: colors.error,
    shadowColor: colors.error,
  },
  secondaryButton: {
    alignItems: 'center',
    gap: spacing[1],
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
  },
  secondaryButtonText: {
    color: '#00D4FF',
    fontSize: typography.fontSize.xs,
    fontWeight: '500',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  modalContent: {
    backgroundColor: '#111',
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing[6],
    paddingBottom: spacing[10],
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  modalTitle: {
    color: colors.white,
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
  },
  modalDescription: {
    color: colors.gray[400],
    fontSize: typography.fontSize.sm,
    marginBottom: spacing[5],
    lineHeight: typography.fontSize.sm * 1.5,
  },
  claimInputField: {
    backgroundColor: '#1a1a1a',
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    color: colors.white,
    fontSize: typography.fontSize.base,
    borderWidth: 1,
    borderColor: '#333',
    marginBottom: spacing[4],
  },
  exampleClaims: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    marginBottom: spacing[6],
    alignItems: 'center',
  },
  exampleLabel: {
    color: colors.gray[500],
    fontSize: typography.fontSize.sm,
    marginRight: spacing[1],
  },
  exampleChip: {
    backgroundColor: '#222',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.full,
  },
  exampleChipText: {
    color: colors.gray[300],
    fontSize: typography.fontSize.xs,
  },
  submitButton: {
    backgroundColor: '#00D4FF',
    borderRadius: borderRadius.lg,
    paddingVertical: spacing[4],
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: colors.gray[700],
  },
  submitButtonText: {
    color: colors.black,
    fontSize: typography.fontSize.base,
    fontWeight: '600',
  },
});

import { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../../src/store';
import { OfflineBanner } from '../../src/ui/components/OfflineBanner';
import { getPipeline } from '../../src/pipeline/Pipeline';
import type { PipelineStage } from '../../src/pipeline/Pipeline';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function ScanScreen() {
  const [isScanning, setIsScanning] = useState(false);
  const [pipelineError, setPipelineError] = useState<string | null>(null);
  const [pipelineStage, setPipelineStage] = useState<PipelineStage>('idle');
  const { currentClaim, setCurrentClaim } = useAppStore();

  useEffect(() => {
    const pipeline = getPipeline();
    const unsubscribe = pipeline.subscribe((state) => {
      setPipelineStage(state.stage);
      if (state.stage === 'error' && state.error) {
        setPipelineError(state.error);
        setIsScanning(false);
      } else {
        setPipelineError(null);
      }
    });
    return unsubscribe;
  }, []);

  const handleStartScan = useCallback(() => {
    setIsScanning(true);
    // TODO: Activate camera and ML detection
  }, []);

  const handleStopScan = useCallback(() => {
    setIsScanning(false);
  }, []);

  const handleClaimInput = useCallback(() => {
    // TODO: Open claim input modal
    setCurrentClaim({
      raw: '10,000 lumens',
      parsed: {
        value: 10000,
        unit: 'lumens',
        claimType: 'brightness',
      },
    });
  }, [setCurrentClaim]);

  return (
    <SafeAreaView style={styles.container}>
      <OfflineBanner />

      {/* Pipeline Error Banner */}
      {pipelineError && (
        <View style={styles.errorBanner}>
          <Ionicons name="warning-outline" size={16} color="#FF4444" />
          <Text style={styles.errorText}>{pipelineError}</Text>
          <TouchableOpacity onPress={() => setPipelineError(null)}>
            <Ionicons name="close-circle" size={18} color="#666" />
          </TouchableOpacity>
        </View>
      )}

      {/* Camera Preview Placeholder */}
      <View style={styles.cameraContainer}>
        <View style={styles.cameraPlaceholder}>
          <Ionicons name="camera-outline" size={64} color="#333" />
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
            <Text style={styles.scanningText}>Scanning for components...</Text>
          </View>
        )}
      </View>

      {/* Claim Display */}
      {currentClaim && (
        <View style={styles.claimBanner}>
          <Text style={styles.claimLabel}>Testing claim:</Text>
          <Text style={styles.claimText}>{currentClaim.raw}</Text>
          <TouchableOpacity onPress={() => setCurrentClaim(null)}>
            <Ionicons name="close-circle" size={20} color="#666" />
          </TouchableOpacity>
        </View>
      )}

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity style={styles.secondaryButton} onPress={handleClaimInput}>
          <Ionicons name="create-outline" size={24} color="#00D4FF" />
          <Text style={styles.secondaryButtonText}>Enter Claim</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.scanButton, isScanning && styles.scanButtonActive]}
          onPress={isScanning ? handleStopScan : handleStartScan}
        >
          <Ionicons
            name={isScanning ? 'stop' : 'scan'}
            size={32}
            color="#000"
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => router.push('/history')}
        >
          <Ionicons name="flash-outline" size={24} color="#00D4FF" />
          <Text style={styles.secondaryButtonText}>Quick Test</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
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
    color: '#444',
    fontSize: 18,
    marginTop: 16,
  },
  placeholderSubtext: {
    color: '#333',
    fontSize: 14,
    marginTop: 8,
  },
  scanOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  scanFrame: {
    width: SCREEN_WIDTH * 0.8,
    height: SCREEN_WIDTH * 0.8,
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
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
  },
  scanningText: {
    color: '#00D4FF',
    fontSize: 16,
    marginTop: 20,
  },
  claimBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 8,
  },
  claimLabel: {
    color: '#666',
    fontSize: 14,
  },
  claimText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
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
    shadowRadius: 10,
    elevation: 5,
  },
  scanButtonActive: {
    backgroundColor: '#FF4444',
    shadowColor: '#FF4444',
  },
  secondaryButton: {
    alignItems: 'center',
    gap: 4,
  },
  secondaryButtonText: {
    color: '#00D4FF',
    fontSize: 12,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a0000',
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#330000',
  },
  errorText: {
    color: '#FF4444',
    fontSize: 13,
    flex: 1,
  },
});

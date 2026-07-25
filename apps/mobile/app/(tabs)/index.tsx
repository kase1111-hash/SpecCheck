import { useState, useCallback, useEffect, useRef } from 'react';
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
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { CameraFrame } from '@speccheck/shared-types';
import { useAppStore } from '../../src/store';
import { OfflineBanner } from '../../src/ui/components/OfflineBanner';
import { CameraView } from '../../src/camera/CameraView';
import { useCamera } from '../../src/camera/useCamera';
import { getPipeline } from '../../src/pipeline/Pipeline';
import type { PipelineStage } from '../../src/pipeline/Pipeline';
import { parseClaim, formatClaimValue, validateClaim } from '../../src/analysis';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/** What to tell the user while each pipeline stage runs */
const STAGE_LABELS: Record<PipelineStage, string> = {
  idle: '',
  capturing: 'Capturing frame…',
  detecting: 'Detecting components…',
  extracting: 'Reading chip markings…',
  matching: 'Matching part numbers…',
  retrieving: 'Looking up datasheets…',
  analyzing: 'Walking the constraint chain…',
  complete: '',
  error: '',
};

/** Stages during which the pipeline is actively working */
const BUSY_STAGES: PipelineStage[] = [
  'capturing',
  'detecting',
  'extracting',
  'matching',
  'retrieving',
  'analyzing',
];

export default function ScanScreen() {
  const [stage, setStage] = useState<PipelineStage>('idle');
  const [pipelineError, setPipelineError] = useState<string | null>(null);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [claimInput, setClaimInput] = useState('');
  const [claimWarning, setClaimWarning] = useState<string | null>(null);

  const {
    currentClaim,
    setCurrentClaim,
    setDetectedComponents,
    setCurrentChain,
    setCurrentVerdict,
    addToHistory,
  } = useAppStore();

  const camera = useCamera();

  // Read the claim inside the capture handler without making the handler
  // depend on it — CameraView would otherwise remount mid-scan.
  const claimRef = useRef(currentClaim);
  claimRef.current = currentClaim;

  const isBusy = BUSY_STAGES.includes(stage);

  useEffect(() => {
    const pipeline = getPipeline();

    const unsubscribe = pipeline.subscribe((state) => {
      setStage(state.stage);
      setPipelineError(state.stage === 'error' ? state.error : null);
    });

    pipeline.initialize().catch((error: unknown) => {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setPipelineError(`Could not load the detection model: ${message}`);
    });

    return unsubscribe;
  }, []);

  /**
   * Run a captured frame through the pipeline. With a claim entered we go all
   * the way to a verdict; without one we stop after identifying components.
   */
  const handleFrameCapture = useCallback(
    async (frame: CameraFrame) => {
      const pipeline = getPipeline();
      const claim = claimRef.current;

      try {
        setPipelineError(null);

        const components = await pipeline.processFrame(frame);
        setDetectedComponents(components);

        if (components.length === 0) {
          setPipelineError(
            'No components identified. Try filling the frame with the board and holding steady.'
          );
          return;
        }

        if (!claim) {
          // Components are on screen but there is nothing to verify them
          // against yet, so leave the user on the scan screen.
          setCurrentChain(null);
          setCurrentVerdict(null);
          return;
        }

        const verdict = await pipeline.analyzeClaim(claim);
        const { chain } = pipeline.getState();

        setCurrentChain(chain);
        setCurrentVerdict(verdict);

        addToHistory({
          id: `scan-${verdict.analyzedAt}`,
          timestamp: verdict.analyzedAt,
          claim,
          components,
          verdict,
        });

        router.push('/scan-result');
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        setPipelineError(message);
      }
    },
    [addToHistory, setCurrentChain, setCurrentVerdict, setDetectedComponents]
  );

  const handleClaimSubmit = useCallback(() => {
    const parsed = parseClaim(claimInput);

    if (!parsed) {
      setClaimWarning(
        "Couldn't read that claim. Include a number and a unit, like \"10,000 lumens\"."
      );
      return;
    }

    const { warning } = validateClaim(parsed);
    setCurrentClaim(parsed);
    setClaimInput('');
    setClaimWarning(null);
    setShowClaimModal(false);

    if (warning) {
      setPipelineError(warning);
    }
  }, [claimInput, setCurrentClaim]);

  const handleCloseClaimModal = useCallback(() => {
    setShowClaimModal(false);
    setClaimWarning(null);
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <OfflineBanner />

      {pipelineError && (
        <View style={styles.errorBanner}>
          <Ionicons name="warning-outline" size={16} color="#FF4444" />
          <Text style={styles.errorText}>{pipelineError}</Text>
          <TouchableOpacity onPress={() => setPipelineError(null)}>
            <Ionicons name="close-circle" size={18} color="#666" />
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.cameraContainer}>
        <CameraView
          onFrameCapture={handleFrameCapture}
          config={camera.config}
          isActive={camera.state.isActive && !isBusy}
        >
          {/* Framing guide */}
          <View style={styles.scanFrame} pointerEvents="none">
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
          </View>

          {isBusy && (
            <View style={styles.busyOverlay} pointerEvents="none">
              <ActivityIndicator size="large" color="#00D4FF" />
              <Text style={styles.busyText}>{STAGE_LABELS[stage]}</Text>
            </View>
          )}

          {!isBusy && (
            <View style={styles.hintOverlay} pointerEvents="none">
              <View style={styles.hintBadge}>
                <Ionicons name="information-circle-outline" size={16} color="#3B82F6" />
                <Text style={styles.hintText}>
                  {currentClaim
                    ? 'Tap the shutter to verify this claim'
                    : 'Enter a claim, then tap the shutter'}
                </Text>
              </View>
            </View>
          )}
        </CameraView>
      </View>

      {/* Current claim */}
      {currentClaim && (
        <View style={styles.claimBanner}>
          <Text style={styles.claimLabel}>Testing claim:</Text>
          <Text style={styles.claimText} numberOfLines={1}>
            {formatClaimValue(currentClaim.value, currentClaim.unit)}
          </Text>
          <TouchableOpacity
            onPress={() => setCurrentClaim(null)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close-circle" size={20} color="#666" />
          </TouchableOpacity>
        </View>
      )}

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => setShowClaimModal(true)}
          disabled={isBusy}
        >
          <Ionicons name="create-outline" size={24} color="#00D4FF" />
          <Text style={styles.secondaryButtonText}>
            {currentClaim ? 'Edit Claim' : 'Enter Claim'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={camera.toggleTorch}
          disabled={isBusy}
        >
          <Ionicons
            name={camera.config.torchEnabled ? 'flashlight' : 'flashlight-outline'}
            size={24}
            color="#00D4FF"
          />
          <Text style={styles.secondaryButtonText}>Torch</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => router.push('/history')}
          disabled={isBusy}
        >
          <Ionicons name="time-outline" size={24} color="#00D4FF" />
          <Text style={styles.secondaryButtonText}>History</Text>
        </TouchableOpacity>
      </View>

      {/* Claim input */}
      <Modal
        visible={showClaimModal}
        animationType="slide"
        transparent
        onRequestClose={handleCloseClaimModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Enter Product Claim</Text>
              <TouchableOpacity
                onPress={handleCloseClaimModal}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={24} color="#888" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDescription}>
              Type the seller's claim. It gets checked against what the components
              on the board can physically deliver.
            </Text>

            <TextInput
              style={styles.claimInputField}
              placeholder="e.g. 10,000 lumens, 65W, 20000mAh"
              placeholderTextColor="#666"
              value={claimInput}
              onChangeText={(text) => {
                setClaimInput(text);
                setClaimWarning(null);
              }}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleClaimSubmit}
            />

            {claimWarning && <Text style={styles.claimWarning}>{claimWarning}</Text>}

            <View style={styles.exampleClaims}>
              <Text style={styles.exampleLabel}>Examples:</Text>
              {['10,000 lumens', '65W', '20000mAh'].map((example) => (
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
              style={[
                styles.submitButton,
                !claimInput.trim() && styles.submitButtonDisabled,
              ]}
              onPress={handleClaimSubmit}
              disabled={!claimInput.trim()}
            >
              <Text style={styles.submitButtonText}>Use This Claim</Text>
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
    backgroundColor: '#000',
  },
  cameraContainer: {
    flex: 1,
    position: 'relative',
  },
  scanFrame: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: SCREEN_WIDTH * 0.75,
    height: SCREEN_WIDTH * 0.75,
    marginLeft: -(SCREEN_WIDTH * 0.375),
    marginTop: -(SCREEN_WIDTH * 0.375),
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
    borderTopLeftRadius: 4,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 4,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 4,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 4,
  },
  busyOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    gap: 16,
  },
  busyText: {
    color: '#00D4FF',
    fontSize: 15,
    fontWeight: '500',
  },
  hintOverlay: {
    position: 'absolute',
    bottom: 130,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  hintBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    gap: 8,
  },
  hintText: {
    color: '#3B82F6',
    fontSize: 13,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 68, 68, 0.12)',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  errorText: {
    flex: 1,
    color: '#FF4444',
    fontSize: 13,
  },
  claimBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#111',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#222',
  },
  claimLabel: {
    color: '#888',
    fontSize: 13,
  },
  claimText: {
    flex: 1,
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
    backgroundColor: '#111',
    borderTopWidth: 1,
    borderTopColor: '#222',
  },
  secondaryButton: {
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  secondaryButtonText: {
    color: '#00D4FF',
    fontSize: 12,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  modalContent: {
    backgroundColor: '#111',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  modalDescription: {
    color: '#888',
    fontSize: 13,
    marginBottom: 20,
    lineHeight: 20,
  },
  claimInputField: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    color: '#fff',
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#333',
    marginBottom: 12,
  },
  claimWarning: {
    color: '#EAB308',
    fontSize: 13,
    marginBottom: 12,
  },
  exampleClaims: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
    alignItems: 'center',
  },
  exampleLabel: {
    color: '#666',
    fontSize: 13,
    marginRight: 4,
  },
  exampleChip: {
    backgroundColor: '#222',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  exampleChipText: {
    color: '#ccc',
    fontSize: 12,
  },
  submitButton: {
    backgroundColor: '#00D4FF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#333',
  },
  submitButtonText: {
    color: '#000',
    fontSize: 15,
    fontWeight: '600',
  },
});

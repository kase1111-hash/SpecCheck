/**
 * CameraView Component
 *
 * Main camera component that displays the camera preview
 * and handles frame capture for processing.
 */

import React, { useRef, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { CameraView as ExpoCameraView, useCameraPermissions } from 'expo-camera';
import type { CameraFrame, CameraConfig } from '@speccheck/shared-types';
import { generateFrameId } from './utils';

interface CameraViewProps {
  /** Called when a frame is captured for processing */
  onFrameCapture: (frame: CameraFrame) => void;
  /** Camera configuration */
  config: CameraConfig;
  /** Whether camera is active */
  isActive: boolean;
  /** Children to render as overlay */
  children?: React.ReactNode;
}

export function CameraView({
  onFrameCapture,
  config,
  isActive,
  children,
}: CameraViewProps) {
  const cameraRef = useRef<ExpoCameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();

  /**
   * Capture a full-resolution frame when user taps
   */
  const handleCapture = useCallback(async () => {
    if (!cameraRef.current) return;

    try {
      const photo = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: 0.8,
        skipProcessing: false,
      });

      if (photo && photo.base64) {
        const frame: CameraFrame = {
          id: generateFrameId(),
          imageBase64: photo.base64,
          width: photo.width,
          height: photo.height,
          timestamp: Date.now(),
          orientation: 0, // TODO: Get from device
          isFullResolution: true,
        };

        onFrameCapture(frame);
      }
    } catch (error) {
      console.error('Failed to capture frame:', error);
    }
  }, [onFrameCapture]);

  // Handle permission states
  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>
          Camera access is required to scan components
        </Text>
        <TouchableOpacity
          style={styles.permissionButton}
          onPress={requestPermission}
        >
          <Text style={styles.permissionButtonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ExpoCameraView
        ref={cameraRef}
        style={styles.camera}
        facing={config.facing}
        enableTorch={config.torchEnabled}
        active={isActive}
      >
        {/* Overlay container for AR elements */}
        <View style={styles.overlay}>
          {children}
        </View>

        {/* Capture button */}
        <View style={styles.controls}>
          <TouchableOpacity
            style={styles.captureButton}
            onPress={handleCapture}
            activeOpacity={0.7}
          >
            <View style={styles.captureButtonInner} />
          </TouchableOpacity>
        </View>
      </ExpoCameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  controls: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonInner: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#fff',
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  permissionText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  permissionButton: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

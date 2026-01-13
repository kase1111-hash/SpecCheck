/**
 * useCamera Hook
 *
 * Manages camera state and configuration.
 */

import { useState, useCallback } from 'react';
import type {
  CameraConfig,
  CameraState,
  CameraFrame,
  PermissionStatus,
} from '@speccheck/shared-types';

const DEFAULT_CONFIG: CameraConfig = {
  previewResolution: 'medium',
  captureResolution: 'high',
  torchEnabled: false,
  facing: 'back',
  autoFocus: true,
};

interface UseCameraReturn {
  /** Current camera state */
  state: CameraState;
  /** Current configuration */
  config: CameraConfig;
  /** Toggle torch on/off */
  toggleTorch: () => void;
  /** Switch between front/back camera */
  switchCamera: () => void;
  /** Update camera configuration */
  updateConfig: (partial: Partial<CameraConfig>) => void;
  /** Set camera active/inactive */
  setActive: (active: boolean) => void;
  /** Handle permission change */
  setPermission: (status: PermissionStatus) => void;
  /** Most recent captured frame */
  lastFrame: CameraFrame | null;
  /** Set the last captured frame */
  setLastFrame: (frame: CameraFrame | null) => void;
}

export function useCamera(): UseCameraReturn {
  const [config, setConfig] = useState<CameraConfig>(DEFAULT_CONFIG);
  const [lastFrame, setLastFrame] = useState<CameraFrame | null>(null);
  const [state, setState] = useState<CameraState>({
    isReady: false,
    isActive: true,
    permission: 'undetermined',
    config: DEFAULT_CONFIG,
    error: null,
  });

  const toggleTorch = useCallback(() => {
    setConfig((prev) => ({
      ...prev,
      torchEnabled: !prev.torchEnabled,
    }));
  }, []);

  const switchCamera = useCallback(() => {
    setConfig((prev) => ({
      ...prev,
      facing: prev.facing === 'back' ? 'front' : 'back',
    }));
  }, []);

  const updateConfig = useCallback((partial: Partial<CameraConfig>) => {
    setConfig((prev) => ({
      ...prev,
      ...partial,
    }));
  }, []);

  const setActive = useCallback((active: boolean) => {
    setState((prev) => ({
      ...prev,
      isActive: active,
    }));
  }, []);

  const setPermission = useCallback((status: PermissionStatus) => {
    setState((prev) => ({
      ...prev,
      permission: status,
      isReady: status === 'granted',
    }));
  }, []);

  return {
    state,
    config,
    toggleTorch,
    switchCamera,
    updateConfig,
    setActive,
    setPermission,
    lastFrame,
    setLastFrame,
  };
}

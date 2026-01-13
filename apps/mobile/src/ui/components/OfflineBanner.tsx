/**
 * OfflineBanner
 *
 * Displays when the device is offline.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../theme';
import { isOnline } from '../../utils/network';
import { getOfflineNotice } from '../../datasheet/OfflineMode';

interface OfflineBannerProps {
  /** Force show even when online (for testing) */
  forceShow?: boolean;
}

export function OfflineBanner({ forceShow = false }: OfflineBannerProps) {
  const offline = !isOnline() || forceShow;

  if (!offline) {
    return null;
  }

  const notice = getOfflineNotice() || 'You are offline. Some features may be limited.';

  return (
    <View style={styles.container}>
      <Text style={styles.icon}>📡</Text>
      <Text style={styles.text}>{notice}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warning,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
  },
  icon: {
    fontSize: 16,
    marginRight: spacing[2],
  },
  text: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    color: colors.gray[900],
  },
});

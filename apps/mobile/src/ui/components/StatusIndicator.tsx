/**
 * StatusIndicator
 *
 * Visual indicators for component/analysis status.
 * Green = Success, Yellow = Partial/Warning, Red = Error
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../theme';
import type { MatchStatus, VerdictResult, VerdictConfidence } from '@speccheck/shared-types';

type StatusType = 'success' | 'warning' | 'error' | 'info' | 'neutral';

interface StatusIndicatorProps {
  status: StatusType;
  label?: string;
  size?: 'small' | 'medium' | 'large';
  showIcon?: boolean;
}

/**
 * Color mapping for status types
 */
const STATUS_COLORS: Record<StatusType, string> = {
  success: colors.success,
  warning: colors.warning,
  error: colors.error,
  info: colors.info,
  neutral: colors.gray[400],
};

/**
 * Icon mapping for status types
 */
const STATUS_ICONS: Record<StatusType, string> = {
  success: '✓',
  warning: '!',
  error: '✗',
  info: 'i',
  neutral: '•',
};

/**
 * Size mapping
 */
const SIZES = {
  small: { dot: 8, icon: 10, text: typography.fontSize.xs },
  medium: { dot: 12, icon: 14, text: typography.fontSize.sm },
  large: { dot: 16, icon: 18, text: typography.fontSize.base },
};

export function StatusIndicator({
  status,
  label,
  size = 'medium',
  showIcon = true,
}: StatusIndicatorProps) {
  const color = STATUS_COLORS[status];
  const icon = STATUS_ICONS[status];
  const sizeConfig = SIZES[size];

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.dot,
          {
            width: sizeConfig.dot,
            height: sizeConfig.dot,
            borderRadius: sizeConfig.dot / 2,
            backgroundColor: color,
          },
        ]}
      >
        {showIcon && (
          <Text
            style={[
              styles.icon,
              { fontSize: sizeConfig.icon, color: colors.white },
            ]}
          >
            {icon}
          </Text>
        )}
      </View>
      {label && (
        <Text style={[styles.label, { fontSize: sizeConfig.text }]}>
          {label}
        </Text>
      )}
    </View>
  );
}

/**
 * Convert MatchStatus to StatusType
 */
export function matchStatusToType(status: MatchStatus): StatusType {
  switch (status) {
    case 'confident':
      return 'success';
    case 'partial':
      return 'warning';
    case 'unknown':
      return 'error';
    default:
      return 'neutral';
  }
}

/**
 * Convert VerdictResult to StatusType
 */
export function verdictToType(verdict: VerdictResult): StatusType {
  switch (verdict) {
    case 'plausible':
      return 'success';
    case 'impossible':
      return 'error';
    case 'uncertain':
      return 'warning';
    default:
      return 'neutral';
  }
}

/**
 * Convert VerdictConfidence to StatusType
 */
export function confidenceToType(confidence: VerdictConfidence): StatusType {
  switch (confidence) {
    case 'high':
      return 'success';
    case 'medium':
      return 'warning';
    case 'low':
      return 'error';
    default:
      return 'neutral';
  }
}

/**
 * Get label for MatchStatus
 */
export function getMatchStatusLabel(status: MatchStatus): string {
  switch (status) {
    case 'confident':
      return 'Identified';
    case 'partial':
      return 'Partial Match';
    case 'unknown':
      return 'Not Identified';
    default:
      return 'Unknown';
  }
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    fontWeight: 'bold',
  },
  label: {
    marginLeft: spacing[2],
    color: colors.gray[700],
  },
});

/**
 * RetryButton
 *
 * Button with loading state and retry capability.
 */

import React, { useState } from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  View,
} from 'react-native';
import { colors, spacing, typography } from '../theme';
import type { AppError } from '../../utils/errors';
import { getRecoveryMessage } from '../../utils/errors';

interface RetryButtonProps {
  /** Button label */
  label: string;
  /** Async action to perform */
  onPress: () => Promise<void>;
  /** Error from previous attempt */
  error?: AppError | null;
  /** Whether the button is disabled */
  disabled?: boolean;
  /** Button variant */
  variant?: 'primary' | 'secondary' | 'ghost';
}

export function RetryButton({
  label,
  onPress,
  error,
  disabled = false,
  variant = 'primary',
}: RetryButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const handlePress = async () => {
    if (isLoading || disabled) return;

    setIsLoading(true);
    try {
      await onPress();
      setRetryCount(0); // Reset on success
    } catch {
      setRetryCount((prev) => prev + 1);
    } finally {
      setIsLoading(false);
    }
  };

  const showError = error && !isLoading;
  const buttonLabel = isLoading
    ? 'Please wait...'
    : retryCount > 0
    ? `Retry (${retryCount})`
    : label;

  return (
    <View style={styles.container}>
      {showError && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error.message}</Text>
          {error.recovery && (
            <Text style={styles.recoveryText}>
              {getRecoveryMessage(error.recovery)}
            </Text>
          )}
        </View>
      )}

      <TouchableOpacity
        style={[
          styles.button,
          styles[variant],
          disabled && styles.disabled,
          isLoading && styles.loading,
        ]}
        onPress={handlePress}
        disabled={disabled || isLoading}
        activeOpacity={0.7}
      >
        {isLoading ? (
          <ActivityIndicator color={colors.white} size="small" />
        ) : (
          <Text style={[styles.buttonText, styles[`${variant}Text`]]}>
            {buttonLabel}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  errorContainer: {
    backgroundColor: colors.error + '10',
    borderRadius: 8,
    padding: spacing[3],
    marginBottom: spacing[3],
  },
  errorText: {
    color: colors.error,
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
  },
  recoveryText: {
    color: colors.gray[600],
    fontSize: typography.fontSize.xs,
    marginTop: spacing[1],
  },
  button: {
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[6],
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  primary: {
    backgroundColor: colors.primary,
  },
  secondary: {
    backgroundColor: colors.gray[200],
  },
  ghost: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.gray[300],
  },
  disabled: {
    opacity: 0.5,
  },
  loading: {
    opacity: 0.8,
  },
  buttonText: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
  },
  primaryText: {
    color: colors.white,
  },
  secondaryText: {
    color: colors.gray[900],
  },
  ghostText: {
    color: colors.gray[700],
  },
});

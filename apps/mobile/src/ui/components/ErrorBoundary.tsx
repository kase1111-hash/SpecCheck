/**
 * ErrorBoundary
 *
 * Catches React errors and displays fallback UI.
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../theme';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <View style={styles.container}>
          <Text style={styles.icon}>⚠️</Text>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.message}>
            {this.state.error?.message || 'An unexpected error occurred'}
          </Text>
          <TouchableOpacity style={styles.button} onPress={this.handleRetry}>
            <Text style={styles.buttonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[6],
    backgroundColor: colors.gray[50],
  },
  icon: {
    fontSize: 48,
    marginBottom: spacing[4],
  },
  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: '600',
    color: colors.gray[900],
    marginBottom: spacing[2],
  },
  message: {
    fontSize: typography.fontSize.base,
    color: colors.gray[600],
    textAlign: 'center',
    marginBottom: spacing[6],
  },
  button: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[3],
    borderRadius: 8,
  },
  buttonText: {
    color: colors.white,
    fontSize: typography.fontSize.base,
    fontWeight: '600',
  },
});

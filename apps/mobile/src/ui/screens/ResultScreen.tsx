/**
 * ResultScreen
 *
 * Displays the verdict and analysis results for a claim verification.
 * Shows constraint chain, confidence scores, and actionable information.
 */

import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography } from '../theme';
import { useAppStore } from '../../store';
import type { Verdict, VerdictResult, ComponentSpecs } from '@speccheck/shared-types';

export interface ResultScreenProps {
  /** Optional scan ID if loading from history */
  scanId?: string;
  /** Callback when close button is pressed */
  onClose?: () => void;
  /** Callback when save is pressed */
  onSave?: () => void;
  /** Callback when viewing component details */
  onViewComponent?: (component: ComponentSpecs) => void;
}

/**
 * Mock verdict for UI development
 */
const MOCK_VERDICT: Verdict = {
  result: 'impossible',
  confidence: 'high',
  claimed: 10000,
  maxPossible: 4292,
  unit: 'lumens',
  bottleneck: 'Cree XHP70.2',
  explanation:
    'The claimed 10,000 lumens is not physically achievable with the detected LED and driver components. The Cree XHP70.2 LED has a maximum output of approximately 4,292 lumens at maximum current. Even with perfect thermal management and efficiency, the detected MP3431 driver cannot supply sufficient current to reach the claimed output.',
  details: [
    'LED Maximum Output: Cree XHP70.2 produces max 4,292 lm @ 2.4A drive current',
    'Driver Limitation: MP3431 supports max 3A output, with thermal throttling above 2.5A',
    'Battery Support: NCR18650GA can supply up to 10A continuous discharge',
    'Realistic Maximum: 3,000-4,000 lumens under optimal conditions',
  ],
  analyzedAt: Date.now(),
};

/**
 * Mock detected components for UI development
 */
const MOCK_COMPONENTS: { component: string; constraint: string; limit: string }[] = [
  {
    component: 'Cree XHP70.2',
    constraint: 'Maximum luminous flux: 4,292 lm @ 2.4A',
    limit: 'LED junction temperature limits continuous high-current operation',
  },
  {
    component: 'MP3431 LED Driver',
    constraint: 'Maximum output current: 3A',
    limit: 'Thermal throttling above 2.5A typical',
  },
  {
    component: 'NCR18650GA Battery',
    constraint: 'Maximum continuous discharge: 10A',
    limit: 'Battery can support driver requirements',
  },
];

/**
 * Get color based on verdict result
 */
function getVerdictColor(result: VerdictResult): string {
  switch (result) {
    case 'plausible':
      return colors.success;
    case 'impossible':
      return colors.error;
    case 'uncertain':
      return colors.warning;
    default:
      return colors.gray[500];
  }
}

/**
 * Get icon name based on verdict result
 */
function getVerdictIcon(result: VerdictResult): keyof typeof Ionicons.glyphMap {
  switch (result) {
    case 'plausible':
      return 'checkmark-circle';
    case 'impossible':
      return 'close-circle';
    case 'uncertain':
      return 'help-circle';
    default:
      return 'ellipse';
  }
}

/**
 * Get human-readable label for verdict
 */
function getVerdictLabel(result: VerdictResult): string {
  switch (result) {
    case 'plausible':
      return 'Claim Verified';
    case 'impossible':
      return 'Claim Unlikely';
    case 'uncertain':
      return 'Inconclusive';
    default:
      return 'Unknown';
  }
}

/**
 * Get confidence level display info
 */
function getConfidenceInfo(confidence: Verdict['confidence']): {
  label: string;
  color: string;
  percentage: number;
} {
  switch (confidence) {
    case 'high':
      return { label: 'High Confidence', color: colors.success, percentage: 92 };
    case 'medium':
      return { label: 'Medium Confidence', color: colors.warning, percentage: 65 };
    case 'low':
      return { label: 'Low Confidence', color: colors.error, percentage: 35 };
    default:
      return { label: 'Unknown', color: colors.gray[500], percentage: 0 };
  }
}

export function ResultScreen({
  scanId: _scanId,
  onClose,
  onSave,
  onViewComponent: _onViewComponent,
}: ResultScreenProps) {
  const { currentVerdict, detectedComponents, saveComponent } = useAppStore();

  // Use mock data for UI development or actual data from store
  const verdict = currentVerdict || MOCK_VERDICT;
  const confidenceInfo = getConfidenceInfo(verdict.confidence);

  const handleShare = useCallback(async () => {
    try {
      const shareMessage = `SpecCheck Analysis:\n\nClaim: ${verdict.claimed.toLocaleString()} ${verdict.unit}\nVerdict: ${getVerdictLabel(verdict.result)}\nMax Possible: ${verdict.maxPossible.toLocaleString()} ${verdict.unit}\n\n${verdict.explanation}`;

      await Share.share({
        message: shareMessage,
        title: 'SpecCheck Analysis Result',
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  }, [verdict]);

  const handleSave = useCallback(() => {
    onSave?.();
    // Save each detected component
    detectedComponents.forEach((component) => {
      saveComponent(component);
    });
  }, [detectedComponents, saveComponent, onSave]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={onClose}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close" size={28} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Analysis Result</Text>
        <TouchableOpacity
          style={styles.shareButton}
          onPress={handleShare}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="share-outline" size={24} color="#00D4FF" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        {/* Verdict Card */}
        <View style={styles.verdictCard}>
          <Ionicons
            name={getVerdictIcon(verdict.result)}
            size={64}
            color={getVerdictColor(verdict.result)}
          />
          <Text style={[styles.verdictLabel, { color: getVerdictColor(verdict.result) }]}>
            {getVerdictLabel(verdict.result)}
          </Text>
          <Text style={styles.claimText}>
            "{verdict.claimed.toLocaleString()} {verdict.unit}"
          </Text>
          <View style={styles.confidenceBadge}>
            <View
              style={[styles.confidenceDot, { backgroundColor: confidenceInfo.color }]}
            />
            <Text style={styles.confidenceText}>
              {confidenceInfo.percentage}% confidence
            </Text>
          </View>
        </View>

        {/* Comparison Card */}
        <View style={styles.comparisonCard}>
          <View style={styles.comparisonItem}>
            <Text style={styles.comparisonLabel}>Claimed</Text>
            <Text style={[styles.comparisonValue, { color: colors.error }]}>
              {verdict.claimed.toLocaleString()}
            </Text>
            <Text style={styles.comparisonUnit}>{verdict.unit}</Text>
          </View>
          <View style={styles.comparisonDivider}>
            <Ionicons name="arrow-forward" size={20} color={colors.gray[600]} />
          </View>
          <View style={styles.comparisonItem}>
            <Text style={styles.comparisonLabel}>Max Possible</Text>
            <Text style={[styles.comparisonValue, { color: colors.success }]}>
              {verdict.maxPossible.toLocaleString()}
            </Text>
            <Text style={styles.comparisonUnit}>{verdict.unit}</Text>
          </View>
        </View>

        {/* Realistic Value Card */}
        <View style={styles.realisticCard}>
          <Ionicons name="trending-down-outline" size={24} color="#00D4FF" />
          <View style={styles.realisticContent}>
            <Text style={styles.realisticLabel}>Realistic expectation</Text>
            <Text style={styles.realisticValue}>
              3,000-4,000 {verdict.unit}
            </Text>
          </View>
        </View>

        {/* Summary Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Summary</Text>
          <Text style={styles.summaryText}>{verdict.explanation}</Text>
        </View>

        {/* Constraint Chain Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Analysis Chain</Text>
          {MOCK_COMPONENTS.map((step, index) => (
            <View key={index} style={styles.chainStep}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>{index + 1}</Text>
              </View>
              <View style={styles.stepContent}>
                <View style={styles.stepHeader}>
                  <Text style={styles.stepComponent}>{step.component}</Text>
                  {verdict.bottleneck === step.component && (
                    <View style={styles.bottleneckBadge}>
                      <Ionicons name="warning" size={12} color={colors.error} />
                      <Text style={styles.bottleneckText}>Bottleneck</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.stepConstraint}>{step.constraint}</Text>
                <Text style={styles.stepLimits}>{step.limit}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Details Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Detailed Breakdown</Text>
          {verdict.details.map((detail, index) => (
            <View key={index} style={styles.detailItem}>
              <Ionicons
                name="checkmark-circle-outline"
                size={16}
                color={colors.gray[500]}
              />
              <Text style={styles.detailText}>{detail}</Text>
            </View>
          ))}
        </View>

        {/* Data Quality Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Quality</Text>
          <View style={styles.qualityGrid}>
            <View style={styles.qualityItem}>
              <Text style={styles.qualityValue}>95%</Text>
              <Text style={styles.qualityLabel}>Specs Accuracy</Text>
            </View>
            <View style={styles.qualityItem}>
              <Text style={styles.qualityValue}>88%</Text>
              <Text style={styles.qualityLabel}>Match Confidence</Text>
            </View>
            <View style={styles.qualityItem}>
              <Ionicons name="checkmark" size={20} color={colors.success} />
              <Text style={styles.qualityLabel}>Datasheet</Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.primaryButton}>
            <Ionicons name="document-text-outline" size={20} color={colors.black} />
            <Text style={styles.primaryButtonText}>View Full Report</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={handleSave}>
            <Ionicons name="bookmark-outline" size={20} color="#00D4FF" />
            <Text style={styles.secondaryButtonText}>Save Result</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  closeButton: {
    padding: spacing[1],
  },
  headerTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.white,
  },
  shareButton: {
    padding: spacing[1],
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: spacing[8],
  },
  verdictCard: {
    alignItems: 'center',
    paddingVertical: spacing[8],
    paddingHorizontal: spacing[4],
    backgroundColor: '#111',
    margin: spacing[4],
    borderRadius: borderRadius.xl,
  },
  verdictLabel: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: 'bold',
    marginTop: spacing[4],
  },
  claimText: {
    fontSize: typography.fontSize.lg,
    color: colors.gray[400],
    marginTop: spacing[2],
    fontStyle: 'italic',
  },
  confidenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#222',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.full,
    marginTop: spacing[4],
    gap: spacing[2],
  },
  confidenceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  confidenceText: {
    color: colors.gray[400],
    fontSize: typography.fontSize.sm,
  },
  comparisonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#111',
    marginHorizontal: spacing[4],
    marginBottom: spacing[4],
    padding: spacing[4],
    borderRadius: borderRadius.lg,
  },
  comparisonItem: {
    alignItems: 'center',
    flex: 1,
  },
  comparisonLabel: {
    color: colors.gray[500],
    fontSize: typography.fontSize.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing[1],
  },
  comparisonValue: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: 'bold',
  },
  comparisonUnit: {
    color: colors.gray[500],
    fontSize: typography.fontSize.sm,
    marginTop: spacing[1],
  },
  comparisonDivider: {
    paddingHorizontal: spacing[2],
  },
  realisticCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 212, 255, 0.1)',
    marginHorizontal: spacing[4],
    marginBottom: spacing[6],
    padding: spacing[4],
    borderRadius: borderRadius.lg,
    gap: spacing[3],
  },
  realisticContent: {
    flex: 1,
  },
  realisticLabel: {
    color: colors.gray[400],
    fontSize: typography.fontSize.sm,
  },
  realisticValue: {
    color: '#00D4FF',
    fontSize: typography.fontSize.xl,
    fontWeight: 'bold',
    marginTop: spacing[1],
  },
  section: {
    paddingHorizontal: spacing[4],
    marginBottom: spacing[6],
  },
  sectionTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.gray[500],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing[3],
  },
  summaryText: {
    color: colors.gray[300],
    fontSize: typography.fontSize.base,
    lineHeight: typography.fontSize.base * 1.6,
  },
  chainStep: {
    flexDirection: 'row',
    marginBottom: spacing[4],
    gap: spacing[3],
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#222',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumberText: {
    color: '#00D4FF',
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
  },
  stepContent: {
    flex: 1,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[1],
  },
  stepComponent: {
    color: colors.white,
    fontSize: typography.fontSize.base,
    fontWeight: '600',
  },
  bottleneckBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.sm,
    gap: spacing[1],
  },
  bottleneckText: {
    color: colors.error,
    fontSize: typography.fontSize.xs,
    fontWeight: '500',
  },
  stepConstraint: {
    color: colors.gray[400],
    fontSize: typography.fontSize.sm,
  },
  stepLimits: {
    color: colors.gray[600],
    fontSize: typography.fontSize.sm,
    marginTop: spacing[1],
    fontStyle: 'italic',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[2],
    marginBottom: spacing[3],
  },
  detailText: {
    flex: 1,
    color: colors.gray[400],
    fontSize: typography.fontSize.sm,
    lineHeight: typography.fontSize.sm * 1.5,
  },
  qualityGrid: {
    flexDirection: 'row',
    backgroundColor: '#111',
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    justifyContent: 'space-around',
  },
  qualityItem: {
    alignItems: 'center',
    gap: spacing[1],
  },
  qualityValue: {
    color: colors.white,
    fontSize: typography.fontSize.xl,
    fontWeight: 'bold',
  },
  qualityLabel: {
    color: colors.gray[500],
    fontSize: typography.fontSize.xs,
  },
  actions: {
    paddingHorizontal: spacing[4],
    gap: spacing[3],
  },
  primaryButton: {
    flexDirection: 'row',
    backgroundColor: '#00D4FF',
    paddingVertical: spacing[4],
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing[2],
  },
  primaryButtonText: {
    color: colors.black,
    fontSize: typography.fontSize.base,
    fontWeight: '600',
  },
  secondaryButton: {
    flexDirection: 'row',
    backgroundColor: '#111',
    paddingVertical: spacing[4],
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing[2],
    borderWidth: 1,
    borderColor: '#222',
  },
  secondaryButtonText: {
    color: '#00D4FF',
    fontSize: typography.fontSize.base,
    fontWeight: '600',
  },
});

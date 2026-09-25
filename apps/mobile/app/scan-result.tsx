/**
 * Scan Result
 *
 * Shows the verdict for the claim the user just scanned, together with the
 * constraint chain it was derived from. Everything on this screen comes from
 * the pipeline run held in the store — there is no placeholder data.
 */

import { useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { VerdictResult, VerdictConfidence, ChainLink } from '@speccheck/shared-types';
import { useAppStore } from '../src/store';
import { colors, spacing, borderRadius, typography } from '../src/ui/theme';
import {
  formatClaimValue,
  formatVerdictForShare,
  getConfidenceDescription,
} from '../src/analysis';

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

function getVerdictLabel(result: VerdictResult): string {
  switch (result) {
    case 'plausible':
      return 'Physically Plausible';
    case 'impossible':
      return 'Physically Impossible';
    case 'uncertain':
      return 'Inconclusive';
    default:
      return 'Unknown';
  }
}

function getConfidenceColor(confidence: VerdictConfidence): string {
  switch (confidence) {
    case 'high':
      return colors.success;
    case 'medium':
      return colors.warning;
    default:
      return colors.error;
  }
}

/** Label a chain link by the part it came from, falling back to the match */
function linkPartNumber(link: ChainLink): string {
  return (
    link.component.specs?.partNumber ??
    link.component.match.partNumber ??
    'Unidentified component'
  );
}

export default function ScanResultScreen() {
  const { currentVerdict, currentChain, detectedComponents, saveComponent } = useAppStore();

  const handleShare = useCallback(async () => {
    if (!currentVerdict) return;

    try {
      await Share.share({
        message: formatVerdictForShare(currentVerdict),
        title: 'SpecCheck Analysis Result',
      });
    } catch (error) {
      console.error('[ScanResult] Share failed:', error);
    }
  }, [currentVerdict]);

  const handleSaveComponents = useCallback(() => {
    for (const component of detectedComponents) {
      if (component.specs) {
        saveComponent(component.specs);
      }
    }
    router.dismissTo('/saved');
  }, [detectedComponents, saveComponent]);

  // Reached without a completed scan — e.g. deep link, or back after a reset.
  if (!currentVerdict) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
            <Ionicons name="close" size={28} color={colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Analysis Result</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.emptyState}>
          <Ionicons name="scan-outline" size={64} color={colors.gray[700]} />
          <Text style={styles.emptyTitle}>No analysis yet</Text>
          <Text style={styles.emptyText}>
            Enter a claim and scan a board to see whether the parts can deliver it.
          </Text>
          <TouchableOpacity style={styles.primaryButton} onPress={() => router.dismissTo('/')}>
            <Ionicons name="scan" size={20} color={colors.black} />
            <Text style={styles.primaryButtonText}>Start a Scan</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const verdict = currentVerdict;
  const verdictColor = getVerdictColor(verdict.result);
  const links = currentChain?.links ?? [];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => router.back()}
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
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Verdict */}
        <View style={styles.verdictCard}>
          <Ionicons name={getVerdictIcon(verdict.result)} size={64} color={verdictColor} />
          <Text style={[styles.verdictLabel, { color: verdictColor }]}>
            {getVerdictLabel(verdict.result)}
          </Text>
          <Text style={styles.claimText}>
            &quot;{formatClaimValue(verdict.claimed, verdict.unit)}&quot;
          </Text>
          <View style={styles.confidenceBadge}>
            <View
              style={[
                styles.confidenceDot,
                { backgroundColor: getConfidenceColor(verdict.confidence) },
              ]}
            />
            <Text style={styles.confidenceText}>
              {getConfidenceDescription(verdict.confidence)}
            </Text>
          </View>
        </View>

        {/* Claimed vs achievable */}
        <View style={styles.comparisonCard}>
          <View style={styles.comparisonItem}>
            <Text style={styles.comparisonLabel}>Claimed</Text>
            <Text style={[styles.comparisonValue, { color: colors.gray[300] }]}>
              {verdict.claimed.toLocaleString()}
            </Text>
            <Text style={styles.comparisonUnit}>{verdict.unit}</Text>
          </View>
          <View style={styles.comparisonDivider}>
            <Ionicons name="arrow-forward" size={20} color={colors.gray[600]} />
          </View>
          <View style={styles.comparisonItem}>
            <Text style={styles.comparisonLabel}>Parts can deliver</Text>
            <Text style={[styles.comparisonValue, { color: verdictColor }]}>
              {verdict.maxPossible.toLocaleString(undefined, { maximumFractionDigits: 1 })}
            </Text>
            <Text style={styles.comparisonUnit}>{verdict.unit}</Text>
          </View>
        </View>

        {/* Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Summary</Text>
          <Text style={styles.summaryText}>{verdict.explanation}</Text>
        </View>

        {/* Constraint chain */}
        {links.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Constraint Chain</Text>
            {links.map((link, index) => (
              <View
                key={`${linkPartNumber(link)}-${link.sourceSpec}-${index}`}
                style={styles.chainStep}
              >
                <View
                  style={[
                    styles.stepNumber,
                    link.isBottleneck && { backgroundColor: colors.error },
                  ]}
                >
                  <Text style={styles.stepNumberText}>{index + 1}</Text>
                </View>
                <View style={styles.stepContent}>
                  <View style={styles.stepHeader}>
                    <Text style={styles.stepComponent}>{linkPartNumber(link)}</Text>
                    {link.isBottleneck && (
                      <View style={styles.bottleneckBadge}>
                        <Ionicons name="warning" size={12} color={colors.error} />
                        <Text style={styles.bottleneckText}>Bottleneck</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.stepConstraint}>{link.explanation}</Text>
                  <Text style={styles.stepLimits}>
                    {link.constraintType.replace(/_/g, ' ')} ·{' '}
                    {link.maxValue.toLocaleString()} {link.unit}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Breakdown */}
        {verdict.details.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Detailed Breakdown</Text>
            {verdict.details
              .filter((detail) => detail.trim().length > 0)
              .map((detail, index) => (
                <Text key={index} style={styles.detailText}>
                  {detail}
                </Text>
              ))}
          </View>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.primaryButton} onPress={handleSaveComponents}>
            <Ionicons name="bookmark-outline" size={20} color={colors.black} />
            <Text style={styles.primaryButtonText}>Save Components</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={() => router.dismissTo('/')}>
            <Ionicons name="scan-outline" size={20} color="#00D4FF" />
            <Text style={styles.secondaryButtonText}>Scan Again</Text>
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
  headerSpacer: {
    width: 30,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: spacing[8],
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[8],
    gap: spacing[3],
  },
  emptyTitle: {
    color: colors.white,
    fontSize: typography.fontSize.xl,
    fontWeight: '600',
    marginTop: spacing[2],
  },
  emptyText: {
    color: colors.gray[500],
    fontSize: typography.fontSize.sm,
    textAlign: 'center',
    lineHeight: typography.fontSize.sm * 1.5,
    marginBottom: spacing[4],
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
    textAlign: 'center',
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
    backgroundColor: '#111',
    marginHorizontal: spacing[4],
    borderRadius: borderRadius.xl,
    paddingVertical: spacing[5],
  },
  comparisonItem: {
    flex: 1,
    alignItems: 'center',
  },
  comparisonLabel: {
    color: colors.gray[500],
    fontSize: typography.fontSize.xs,
    marginBottom: spacing[1],
  },
  comparisonValue: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: '700',
  },
  comparisonUnit: {
    color: colors.gray[500],
    fontSize: typography.fontSize.xs,
  },
  comparisonDivider: {
    paddingHorizontal: spacing[2],
  },
  section: {
    paddingHorizontal: spacing[4],
    marginTop: spacing[6],
  },
  sectionTitle: {
    color: colors.white,
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    marginBottom: spacing[3],
  },
  summaryText: {
    color: colors.gray[300],
    fontSize: typography.fontSize.sm,
    lineHeight: typography.fontSize.sm * 1.6,
  },
  chainStep: {
    flexDirection: 'row',
    gap: spacing[3],
    backgroundColor: '#111',
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    marginBottom: spacing[2],
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    color: colors.white,
    fontSize: typography.fontSize.xs,
    fontWeight: '700',
  },
  stepContent: {
    flex: 1,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[2],
  },
  stepComponent: {
    color: colors.white,
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    flexShrink: 1,
  },
  bottleneckBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  bottleneckText: {
    color: colors.error,
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
  },
  stepConstraint: {
    color: colors.gray[300],
    fontSize: typography.fontSize.sm,
    marginTop: spacing[1],
    lineHeight: typography.fontSize.sm * 1.5,
  },
  stepLimits: {
    color: colors.gray[500],
    fontSize: typography.fontSize.xs,
    marginTop: spacing[1],
    textTransform: 'capitalize',
  },
  detailText: {
    color: colors.gray[400],
    fontSize: typography.fontSize.sm,
    lineHeight: typography.fontSize.sm * 1.6,
    marginBottom: spacing[2],
  },
  actions: {
    paddingHorizontal: spacing[4],
    marginTop: spacing[8],
    gap: spacing[3],
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    backgroundColor: '#00D4FF',
    borderRadius: borderRadius.lg,
    paddingVertical: spacing[4],
  },
  primaryButtonText: {
    color: colors.black,
    fontSize: typography.fontSize.base,
    fontWeight: '600',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    borderRadius: borderRadius.lg,
    paddingVertical: spacing[4],
    borderWidth: 1,
    borderColor: '#333',
  },
  secondaryButtonText: {
    color: '#00D4FF',
    fontSize: typography.fontSize.base,
    fontWeight: '600',
  },
});

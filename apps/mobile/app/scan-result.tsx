import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../src/store';
import type { Verdict } from '@speccheck/shared-types';

// Mock verdict for UI development
const MOCK_VERDICT: Verdict = {
  claimText: '10,000 lumens',
  verdictType: 'implausible',
  confidence: 0.92,
  summary: 'The claimed 10,000 lumens is not physically achievable with the detected LED and driver components.',
  explanation: 'The Cree XHP70.2 LED has a maximum output of approximately 4,292 lumens at maximum current. Even with perfect thermal management and efficiency, the detected MP3431 driver cannot supply sufficient current to reach the claimed output.',
  constraintChain: [
    {
      step: 1,
      component: 'Cree XHP70.2',
      constraint: 'Maximum luminous flux: 4,292 lm @ 2.4A',
      limits: 'LED junction temperature limits continuous high-current operation',
    },
    {
      step: 2,
      component: 'MP3431 LED Driver',
      constraint: 'Maximum output current: 3A',
      limits: 'Thermal throttling above 2.5A typical',
    },
    {
      step: 3,
      component: 'NCR18650GA Battery',
      constraint: 'Maximum continuous discharge: 10A',
      limits: 'Battery can support driver requirements',
    },
  ],
  suggestedRealisticValue: '3,000-4,000 lumens',
  dataQuality: {
    specsConfidence: 0.95,
    matchConfidence: 0.88,
    datasheetAvailable: true,
  },
};

function getVerdictColor(verdict: string): string {
  switch (verdict) {
    case 'plausible':
      return '#00FF88';
    case 'implausible':
      return '#FF4444';
    case 'uncertain':
      return '#FFAA00';
    default:
      return '#666';
  }
}

function getVerdictIcon(verdict: string): keyof typeof Ionicons.glyphMap {
  switch (verdict) {
    case 'plausible':
      return 'checkmark-circle';
    case 'implausible':
      return 'close-circle';
    case 'uncertain':
      return 'help-circle';
    default:
      return 'ellipse';
  }
}

function getVerdictLabel(verdict: string): string {
  switch (verdict) {
    case 'plausible':
      return 'Claim Verified';
    case 'implausible':
      return 'Claim Unlikely';
    case 'uncertain':
      return 'Inconclusive';
    default:
      return 'Unknown';
  }
}

export default function ScanResultScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { currentVerdict, detectedComponents } = useAppStore();

  // Use mock data for UI development
  const verdict = MOCK_VERDICT;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
          <Ionicons name="close" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Analysis Result</Text>
        <TouchableOpacity style={styles.shareButton}>
          <Ionicons name="share-outline" size={24} color="#00D4FF" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Verdict Card */}
        <View style={styles.verdictCard}>
          <Ionicons
            name={getVerdictIcon(verdict.verdictType)}
            size={64}
            color={getVerdictColor(verdict.verdictType)}
          />
          <Text style={[styles.verdictLabel, { color: getVerdictColor(verdict.verdictType) }]}>
            {getVerdictLabel(verdict.verdictType)}
          </Text>
          <Text style={styles.claimText}>"{verdict.claimText}"</Text>
          <View style={styles.confidenceBadge}>
            <Text style={styles.confidenceText}>
              {Math.round(verdict.confidence * 100)}% confidence
            </Text>
          </View>
        </View>

        {/* Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Summary</Text>
          <Text style={styles.summaryText}>{verdict.summary}</Text>
        </View>

        {/* Realistic Value */}
        {verdict.suggestedRealisticValue && (
          <View style={styles.realisticCard}>
            <Ionicons name="trending-down-outline" size={24} color="#00D4FF" />
            <View style={styles.realisticContent}>
              <Text style={styles.realisticLabel}>Realistic expectation</Text>
              <Text style={styles.realisticValue}>{verdict.suggestedRealisticValue}</Text>
            </View>
          </View>
        )}

        {/* Constraint Chain */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Analysis Chain</Text>
          {verdict.constraintChain.map((step, index) => (
            <View key={index} style={styles.chainStep}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>{step.step}</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepComponent}>{step.component}</Text>
                <Text style={styles.stepConstraint}>{step.constraint}</Text>
                <Text style={styles.stepLimits}>{step.limits}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Detailed Explanation */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Detailed Explanation</Text>
          <Text style={styles.explanationText}>{verdict.explanation}</Text>
        </View>

        {/* Data Quality */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Quality</Text>
          <View style={styles.qualityGrid}>
            <View style={styles.qualityItem}>
              <Text style={styles.qualityValue}>
                {Math.round(verdict.dataQuality.specsConfidence * 100)}%
              </Text>
              <Text style={styles.qualityLabel}>Specs Accuracy</Text>
            </View>
            <View style={styles.qualityItem}>
              <Text style={styles.qualityValue}>
                {Math.round(verdict.dataQuality.matchConfidence * 100)}%
              </Text>
              <Text style={styles.qualityLabel}>Match Confidence</Text>
            </View>
            <View style={styles.qualityItem}>
              <Ionicons
                name={verdict.dataQuality.datasheetAvailable ? 'checkmark' : 'close'}
                size={20}
                color={verdict.dataQuality.datasheetAvailable ? '#00FF88' : '#FF4444'}
              />
              <Text style={styles.qualityLabel}>Datasheet</Text>
            </View>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.primaryButton}>
            <Ionicons name="document-text-outline" size={20} color="#000" />
            <Text style={styles.primaryButtonText}>View Full Report</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton}>
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
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
  },
  shareButton: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  verdictCard: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
    backgroundColor: '#111',
    margin: 16,
    borderRadius: 16,
  },
  verdictLabel: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 16,
  },
  claimText: {
    fontSize: 18,
    color: '#888',
    marginTop: 8,
    fontStyle: 'italic',
  },
  confidenceBadge: {
    backgroundColor: '#222',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginTop: 16,
  },
  confidenceText: {
    color: '#666',
    fontSize: 14,
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  summaryText: {
    color: '#ccc',
    fontSize: 16,
    lineHeight: 24,
  },
  realisticCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 212, 255, 0.1)',
    marginHorizontal: 16,
    marginBottom: 24,
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  realisticContent: {
    flex: 1,
  },
  realisticLabel: {
    color: '#888',
    fontSize: 13,
  },
  realisticValue: {
    color: '#00D4FF',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 2,
  },
  chainStep: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 12,
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
    fontSize: 14,
    fontWeight: '600',
  },
  stepContent: {
    flex: 1,
  },
  stepComponent: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  stepConstraint: {
    color: '#888',
    fontSize: 14,
    marginTop: 4,
  },
  stepLimits: {
    color: '#555',
    fontSize: 13,
    marginTop: 2,
    fontStyle: 'italic',
  },
  explanationText: {
    color: '#aaa',
    fontSize: 15,
    lineHeight: 22,
  },
  qualityGrid: {
    flexDirection: 'row',
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 16,
    justifyContent: 'space-around',
  },
  qualityItem: {
    alignItems: 'center',
    gap: 4,
  },
  qualityValue: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  qualityLabel: {
    color: '#666',
    fontSize: 12,
  },
  actions: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    gap: 12,
  },
  primaryButton: {
    flexDirection: 'row',
    backgroundColor: '#00D4FF',
    paddingVertical: 16,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  primaryButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    flexDirection: 'row',
    backgroundColor: '#111',
    paddingVertical: 16,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#222',
  },
  secondaryButtonText: {
    color: '#00D4FF',
    fontSize: 16,
    fontWeight: '600',
  },
});

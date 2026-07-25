import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { VerdictResult } from '@speccheck/shared-types';
import { useAppStore, type ScanHistoryEntry } from '../../src/store';
import { formatClaimValue } from '../../src/analysis';

function getVerdictColor(verdict: VerdictResult): string {
  switch (verdict) {
    case 'plausible':
      return '#22C55E';
    case 'impossible':
      return '#EF4444';
    case 'uncertain':
      return '#EAB308';
    default:
      return '#666';
  }
}

function getVerdictIcon(verdict: VerdictResult): keyof typeof Ionicons.glyphMap {
  switch (verdict) {
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

function formatTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  return 'Just now';
}

function HistoryItem({
  entry,
  onOpen,
}: {
  entry: ScanHistoryEntry;
  onOpen: (entry: ScanHistoryEntry) => void;
}) {
  return (
    <TouchableOpacity style={styles.historyItem} onPress={() => onOpen(entry)}>
      <View style={styles.verdictIndicator}>
        <Ionicons
          name={getVerdictIcon(entry.verdict.result)}
          size={28}
          color={getVerdictColor(entry.verdict.result)}
        />
      </View>
      <View style={styles.itemContent}>
        <Text style={styles.claimText}>
          {formatClaimValue(entry.claim.value, entry.claim.unit)}
        </Text>
        <View style={styles.itemMeta}>
          <Text style={styles.metaText}>{entry.components.length} components</Text>
          <Text style={styles.metaDot}>•</Text>
          <Text style={styles.metaText}>{formatTimeAgo(entry.timestamp)}</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#444" />
    </TouchableOpacity>
  );
}

export default function HistoryScreen() {
  const {
    scanHistory,
    clearHistory,
    setCurrentClaim,
    setDetectedComponents,
    setCurrentChain,
    setCurrentVerdict,
  } = useAppStore();

  /**
   * Re-open a past scan by making it the current one. The chain is not
   * persisted, so the result screen falls back to the verdict's own breakdown.
   */
  const handleOpen = (entry: ScanHistoryEntry) => {
    setCurrentClaim(entry.claim);
    setDetectedComponents(entry.components);
    setCurrentChain(null);
    setCurrentVerdict(entry.verdict);
    router.push('/scan-result');
  };

  const handleClearAll = () => {
    Alert.alert('Clear scan history?', 'This removes every saved scan on this device.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear All', style: 'destructive', onPress: clearHistory },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Scan History</Text>
        {scanHistory.length > 0 && (
          <TouchableOpacity style={styles.clearButton} onPress={handleClearAll}>
            <Text style={styles.clearButtonText}>Clear All</Text>
          </TouchableOpacity>
        )}
      </View>

      {scanHistory.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="time-outline" size={64} color="#333" />
          <Text style={styles.emptyTitle}>No scans yet</Text>
          <Text style={styles.emptySubtext}>Your scan history will appear here</Text>
        </View>
      ) : (
        <FlatList
          data={scanHistory}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <HistoryItem entry={item} onOpen={handleOpen} />}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  clearButton: {
    padding: 8,
  },
  clearButtonText: {
    color: '#FF4444',
    fontSize: 14,
  },
  list: {
    padding: 16,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  verdictIndicator: {
    width: 40,
    alignItems: 'center',
  },
  itemContent: {
    flex: 1,
    gap: 4,
  },
  claimText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  itemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    color: '#666',
    fontSize: 13,
  },
  metaDot: {
    color: '#444',
    fontSize: 13,
  },
  separator: {
    height: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  emptyTitle: {
    color: '#444',
    fontSize: 20,
    fontWeight: '600',
  },
  emptySubtext: {
    color: '#333',
    fontSize: 14,
  },
});

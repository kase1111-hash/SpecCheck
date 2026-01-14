import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../../src/store';

interface ScanHistoryItem {
  id: string;
  timestamp: number;
  claimRaw: string;
  verdictType: 'plausible' | 'implausible' | 'uncertain';
  componentCount: number;
}

// Mock data for UI development
const MOCK_HISTORY: ScanHistoryItem[] = [
  {
    id: '1',
    timestamp: Date.now() - 3600000,
    claimRaw: '10,000 lumens',
    verdictType: 'implausible',
    componentCount: 3,
  },
  {
    id: '2',
    timestamp: Date.now() - 86400000,
    claimRaw: '20,000mAh capacity',
    verdictType: 'plausible',
    componentCount: 5,
  },
  {
    id: '3',
    timestamp: Date.now() - 172800000,
    claimRaw: '100W fast charging',
    verdictType: 'uncertain',
    componentCount: 2,
  },
];

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

function formatTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  return 'Just now';
}

function HistoryItem({ item }: { item: ScanHistoryItem }) {
  return (
    <TouchableOpacity
      style={styles.historyItem}
      onPress={() => router.push(`/scan-result?id=${item.id}`)}
    >
      <View style={styles.verdictIndicator}>
        <Ionicons
          name={getVerdictIcon(item.verdictType)}
          size={28}
          color={getVerdictColor(item.verdictType)}
        />
      </View>
      <View style={styles.itemContent}>
        <Text style={styles.claimText}>{item.claimRaw}</Text>
        <View style={styles.itemMeta}>
          <Text style={styles.metaText}>
            {item.componentCount} components
          </Text>
          <Text style={styles.metaDot}>•</Text>
          <Text style={styles.metaText}>{formatTimeAgo(item.timestamp)}</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#444" />
    </TouchableOpacity>
  );
}

export default function HistoryScreen() {
  const { scanHistory } = useAppStore();

  // Use mock data for now, will switch to real data
  const displayHistory = MOCK_HISTORY;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Scan History</Text>
        {displayHistory.length > 0 && (
          <TouchableOpacity style={styles.clearButton}>
            <Text style={styles.clearButtonText}>Clear All</Text>
          </TouchableOpacity>
        )}
      </View>

      {displayHistory.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="time-outline" size={64} color="#333" />
          <Text style={styles.emptyTitle}>No scans yet</Text>
          <Text style={styles.emptySubtext}>
            Your scan history will appear here
          </Text>
        </View>
      ) : (
        <FlatList
          data={displayHistory}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <HistoryItem item={item} />}
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

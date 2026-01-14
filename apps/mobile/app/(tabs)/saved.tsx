import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../../src/store';
import type { ComponentCategory } from '@speccheck/shared-types';

interface SavedComponent {
  id: string;
  partNumber: string;
  manufacturer: string;
  category: ComponentCategory;
  savedAt: number;
  notes?: string;
}

// Mock data for UI development
const MOCK_SAVED: SavedComponent[] = [
  {
    id: '1',
    partNumber: 'XHP70.2',
    manufacturer: 'Cree',
    category: 'led',
    savedAt: Date.now() - 86400000,
    notes: 'Common in high-output flashlights',
  },
  {
    id: '2',
    partNumber: 'NCR18650GA',
    manufacturer: 'Panasonic/Sanyo',
    category: 'battery_cell',
    savedAt: Date.now() - 172800000,
  },
  {
    id: '3',
    partNumber: 'MP2315',
    manufacturer: 'Monolithic Power',
    category: 'dc_dc',
    savedAt: Date.now() - 259200000,
  },
];

function getCategoryIcon(category: ComponentCategory): keyof typeof Ionicons.glyphMap {
  switch (category) {
    case 'led':
      return 'bulb-outline';
    case 'battery_cell':
    case 'bms':
      return 'battery-half-outline';
    case 'led_driver':
    case 'dc_dc':
      return 'flash-outline';
    case 'usb_pd':
    case 'connector':
      return 'git-merge-outline';
    case 'mcu':
    case 'ic_generic':
      return 'hardware-chip-outline';
    case 'audio_amp':
      return 'volume-high-outline';
    case 'motor_driver':
      return 'cog-outline';
    default:
      return 'cube-outline';
  }
}

function formatCategory(category: ComponentCategory): string {
  const categoryNames: Record<ComponentCategory, string> = {
    led: 'LED',
    led_driver: 'LED Driver',
    battery_cell: 'Battery Cell',
    bms: 'BMS',
    usb_pd: 'USB PD',
    dc_dc: 'DC-DC Converter',
    audio_amp: 'Audio Amp',
    motor_driver: 'Motor Driver',
    mcu: 'MCU',
    capacitor: 'Capacitor',
    inductor: 'Inductor',
    resistor: 'Resistor',
    connector: 'Connector',
    ic_generic: 'IC',
    unknown: 'Unknown',
  };
  return categoryNames[category] || category;
}

function SavedItem({ item }: { item: SavedComponent }) {
  return (
    <TouchableOpacity
      style={styles.savedItem}
      onPress={() => router.push(`/component-detail?id=${item.id}`)}
    >
      <View style={styles.iconContainer}>
        <Ionicons
          name={getCategoryIcon(item.category)}
          size={24}
          color="#00D4FF"
        />
      </View>
      <View style={styles.itemContent}>
        <Text style={styles.partNumber}>{item.partNumber}</Text>
        <Text style={styles.manufacturer}>{item.manufacturer}</Text>
        <View style={styles.itemMeta}>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{formatCategory(item.category)}</Text>
          </View>
          {item.notes && (
            <Text style={styles.notesPreview} numberOfLines={1}>
              {item.notes}
            </Text>
          )}
        </View>
      </View>
      <TouchableOpacity style={styles.bookmarkButton}>
        <Ionicons name="bookmark" size={20} color="#00D4FF" />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

export default function SavedScreen() {
  const { savedComponents } = useAppStore();

  // Use mock data for now
  const displaySaved = MOCK_SAVED;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Saved Components</Text>
        <TouchableOpacity style={styles.searchButton}>
          <Ionicons name="search" size={24} color="#666" />
        </TouchableOpacity>
      </View>

      {displaySaved.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="bookmark-outline" size={64} color="#333" />
          <Text style={styles.emptyTitle}>No saved components</Text>
          <Text style={styles.emptySubtext}>
            Save components during scans for quick reference
          </Text>
        </View>
      ) : (
        <FlatList
          data={displaySaved}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <SavedItem item={item} />}
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
  searchButton: {
    padding: 8,
  },
  list: {
    padding: 16,
  },
  savedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 212, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemContent: {
    flex: 1,
    gap: 2,
  },
  partNumber: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  manufacturer: {
    color: '#888',
    fontSize: 14,
  },
  itemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  categoryBadge: {
    backgroundColor: '#222',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  categoryText: {
    color: '#666',
    fontSize: 11,
    fontWeight: '500',
  },
  notesPreview: {
    color: '#444',
    fontSize: 12,
    flex: 1,
  },
  bookmarkButton: {
    padding: 4,
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
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});

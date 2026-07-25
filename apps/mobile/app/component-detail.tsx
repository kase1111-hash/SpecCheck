import { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../src/store';
import type {
  ComponentSpecs,
  DataSource,
  SpecValue,
  ComponentCategory,
} from '@speccheck/shared-types';

/** Where a component's data came from, in words the user can act on */
function formatSource(source: DataSource): string {
  switch (source) {
    case 'cache':
      return 'Cached datasheet';
    case 'api':
      return 'Datasheet API';
    case 'llm':
      return 'Inferred from part number';
    case 'manual':
      return 'Entered manually';
    default:
      return source;
  }
}

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
    default:
      return 'cube-outline';
  }
}

function formatCategory(category: ComponentCategory): string {
  const categoryNames: Record<ComponentCategory, string> = {
    led: 'LED',
    led_driver: 'LED Driver',
    battery_cell: 'Battery Cell',
    bms: 'Battery Management',
    usb_pd: 'USB Power Delivery',
    dc_dc: 'DC-DC Converter',
    audio_amp: 'Audio Amplifier',
    motor_driver: 'Motor Driver',
    mcu: 'Microcontroller',
    capacitor: 'Capacitor',
    inductor: 'Inductor',
    resistor: 'Resistor',
    connector: 'Connector',
    ic_generic: 'Integrated Circuit',
    unknown: 'Unknown',
  };
  return categoryNames[category] || category;
}

function formatSpecName(name: string): string {
  return name
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function SpecRow({ name, spec }: { name: string; spec: SpecValue }) {
  return (
    <View style={styles.specRow}>
      <Text style={styles.specName}>{formatSpecName(name)}</Text>
      <View style={styles.specValues}>
        <Text style={styles.specValue}>
          {spec.value}
          {spec.unit && ` ${spec.unit}`}
        </Text>
        {spec.conditions && (
          <Text style={styles.specConditions}>{spec.conditions}</Text>
        )}
        {(spec.min !== null || spec.max !== null) && (
          <Text style={styles.specRange}>
            Range: {spec.min ?? '—'} to {spec.max ?? '—'}
          </Text>
        )}
      </View>
    </View>
  );
}

export default function ComponentDetailScreen() {
  const { partNumber } = useLocalSearchParams<{ partNumber?: string }>();
  const { detectedComponents, savedComponents, saveComponent, unsaveComponent } =
    useAppStore();

  // Prefer the component from the current scan (it carries match confidence),
  // and fall back to the user's saved list so history links keep working.
  const detected = useMemo(
    () => detectedComponents.find((c) => c.specs?.partNumber === partNumber),
    [detectedComponents, partNumber]
  );

  const savedEntry = useMemo(
    () => savedComponents.find((s) => s.component.partNumber === partNumber),
    [savedComponents, partNumber]
  );

  const component: ComponentSpecs | null =
    detected?.specs ?? savedEntry?.component ?? null;

  if (!component) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Component</Text>
          </View>
        </View>
        <View style={styles.emptyState}>
          <Ionicons name="help-circle-outline" size={64} color="#333" />
          <Text style={styles.emptyTitle}>Component not found</Text>
          <Text style={styles.emptyText}>
            {partNumber
              ? `No specs are loaded for ${partNumber}. Scan the board again or save it from a scan result.`
              : 'No component was selected.'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const isSaved = savedEntry !== undefined;

  const handleToggleSave = () => {
    if (savedEntry) {
      unsaveComponent(savedEntry.id);
    } else {
      saveComponent(component);
    }
  };

  const handleOpenDatasheet = () => {
    if (component.datasheetUrl) {
      Linking.openURL(component.datasheetUrl);
    }
  };

  const specEntries = Object.entries(component.specs);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>{component.partNumber}</Text>
          <Text style={styles.headerSubtitle}>{component.manufacturer}</Text>
        </View>
        <TouchableOpacity style={styles.saveButton} onPress={handleToggleSave}>
          <Ionicons
            name={isSaved ? 'bookmark' : 'bookmark-outline'}
            size={24}
            color="#00D4FF"
          />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Component Card */}
        <View style={styles.componentCard}>
          <View style={styles.iconContainer}>
            <Ionicons
              name={getCategoryIcon(component.category)}
              size={40}
              color="#00D4FF"
            />
          </View>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{formatCategory(component.category)}</Text>
          </View>
        </View>

        {/* Data Source */}
        <View style={styles.sourceCard}>
          <View style={styles.sourceRow}>
            <Text style={styles.sourceLabel}>Data Source</Text>
            <View style={styles.sourceBadge}>
              <Ionicons name="document-text-outline" size={14} color="#00D4FF" />
              <Text style={styles.sourceBadgeText}>{formatSource(component.source)}</Text>
            </View>
          </View>
          {detected && (
            <View style={styles.sourceRow}>
              <Text style={styles.sourceLabel}>Match Confidence</Text>
              <Text style={styles.sourceValue}>
                {Math.round(detected.match.confidence * 100)}%
              </Text>
            </View>
          )}
          <View style={styles.sourceRow}>
            <Text style={styles.sourceLabel}>Last Updated</Text>
            <Text style={styles.sourceValue}>
              {new Date(component.lastUpdated).toLocaleDateString()}
            </Text>
          </View>
        </View>

        {/* Specifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Specifications</Text>
          <View style={styles.specsCard}>
            {specEntries.map(([name, spec]) => (
              <SpecRow key={name} name={name} spec={spec as SpecValue} />
            ))}
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          {component.datasheetUrl && (
            <TouchableOpacity style={styles.primaryButton} onPress={handleOpenDatasheet}>
              <Ionicons name="document-outline" size={20} color="#000" />
              <Text style={styles.primaryButtonText}>View Datasheet</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.secondaryButton}>
            <Ionicons name="copy-outline" size={20} color="#00D4FF" />
            <Text style={styles.secondaryButtonText}>Copy Specs</Text>
          </TouchableOpacity>
        </View>

        {/* Notes Section (for saved components) */}
        {isSaved && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Notes</Text>
            <TouchableOpacity style={styles.notesCard}>
              <Ionicons name="create-outline" size={20} color="#666" />
              <Text style={styles.notesPlaceholder}>Add notes about this component...</Text>
            </TouchableOpacity>
          </View>
        )}
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
    gap: 12,
  },
  backButton: {
    padding: 4,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#888',
  },
  saveButton: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    marginTop: 8,
  },
  emptyText: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
  },
  componentCard: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: '#111',
    margin: 16,
    borderRadius: 16,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0, 212, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  categoryBadge: {
    backgroundColor: '#222',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  categoryText: {
    color: '#888',
    fontSize: 14,
    fontWeight: '500',
  },
  sourceCard: {
    backgroundColor: '#111',
    marginHorizontal: 16,
    marginBottom: 24,
    borderRadius: 12,
    padding: 16,
  },
  sourceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  sourceLabel: {
    color: '#666',
    fontSize: 14,
  },
  sourceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 212, 255, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  sourceBadgeText: {
    color: '#00D4FF',
    fontSize: 12,
    fontWeight: '500',
  },
  sourceValue: {
    color: '#fff',
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
  specsCard: {
    backgroundColor: '#111',
    borderRadius: 12,
    overflow: 'hidden',
  },
  specRow: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  specName: {
    color: '#888',
    fontSize: 13,
    marginBottom: 4,
  },
  specValues: {
    gap: 2,
  },
  specValue: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  specConditions: {
    color: '#555',
    fontSize: 12,
    fontStyle: 'italic',
  },
  specRange: {
    color: '#444',
    fontSize: 12,
  },
  actions: {
    paddingHorizontal: 16,
    marginBottom: 24,
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
  notesCard: {
    flexDirection: 'row',
    backgroundColor: '#111',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    gap: 12,
  },
  notesPlaceholder: {
    color: '#444',
    fontSize: 15,
  },
});

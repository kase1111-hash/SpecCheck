import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../../src/store';
import { VERSION, BUILD_NUMBER, CURRENT_PHASE } from '../../src/config/version';

interface SettingRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  value?: string | boolean;
  onPress?: () => void;
  onToggle?: (value: boolean) => void;
}

function SettingRow({ icon, title, subtitle, value, onPress, onToggle }: SettingRowProps) {
  const isToggle = typeof value === 'boolean';

  return (
    <TouchableOpacity
      style={styles.settingRow}
      onPress={onPress}
      disabled={isToggle}
    >
      <View style={styles.settingIcon}>
        <Ionicons name={icon} size={22} color="#00D4FF" />
      </View>
      <View style={styles.settingContent}>
        <Text style={styles.settingTitle}>{title}</Text>
        {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
      </View>
      {isToggle ? (
        <Switch
          value={value}
          onValueChange={onToggle}
          trackColor={{ false: '#333', true: '#00D4FF' }}
          thumbColor="#fff"
        />
      ) : value ? (
        <Text style={styles.settingValue}>{value}</Text>
      ) : (
        <Ionicons name="chevron-forward" size={20} color="#444" />
      )}
    </TouchableOpacity>
  );
}

function SettingSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionContent}>{children}</View>
    </View>
  );
}

export default function SettingsScreen() {
  const { settings, updateSettings } = useAppStore();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <SettingSection title="Privacy">
          <SettingRow
            icon="shield-checkmark-outline"
            title="Privacy Policy"
            subtitle="How your data is handled"
          />
          <SettingRow
            icon="analytics-outline"
            title="Anonymous Analytics"
            subtitle="Help improve SpecCheck"
            value={settings.analyticsEnabled}
            onToggle={(value) => updateSettings({ analyticsEnabled: value })}
          />
          <SettingRow
            icon="cloud-offline-outline"
            title="Offline Mode"
            subtitle="Process everything on-device"
            value={settings.offlineOnly}
            onToggle={(value) => updateSettings({ offlineOnly: value })}
          />
        </SettingSection>

        <SettingSection title="Scanning">
          <SettingRow
            icon="flash-outline"
            title="Auto-detect Components"
            subtitle="Automatically scan when pointing at PCB"
            value={settings.autoDetect}
            onToggle={(value) => updateSettings({ autoDetect: value })}
          />
          <SettingRow
            icon="volume-high-outline"
            title="Haptic Feedback"
            subtitle="Vibrate when component detected"
            value={settings.hapticFeedback}
            onToggle={(value) => updateSettings({ hapticFeedback: value })}
          />
          <SettingRow
            icon="images-outline"
            title="Save Scan Images"
            subtitle="Keep reference images with scans"
            value={settings.saveScanImages}
            onToggle={(value) => updateSettings({ saveScanImages: value })}
          />
        </SettingSection>

        <SettingSection title="Data">
          <SettingRow
            icon="download-outline"
            title="Offline Database"
            subtitle="Download component specs for offline use"
            value="1.2 GB"
          />
          <SettingRow
            icon="refresh-outline"
            title="Last Updated"
            value="2 days ago"
          />
          <SettingRow
            icon="trash-outline"
            title="Clear Cache"
            subtitle="Free up storage space"
          />
        </SettingSection>

        <SettingSection title="About">
          <SettingRow
            icon="information-circle-outline"
            title="Version"
            value={`${VERSION} (${BUILD_NUMBER})`}
          />
          <SettingRow
            icon="flag-outline"
            title="Release Phase"
            value={CURRENT_PHASE}
          />
          <SettingRow
            icon="document-text-outline"
            title="Terms of Service"
          />
          <SettingRow
            icon="logo-github"
            title="Open Source Licenses"
          />
          <SettingRow
            icon="chatbubble-outline"
            title="Send Feedback"
          />
        </SettingSection>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            SpecCheck - X-ray vision for tech claims
          </Text>
          <Text style={styles.footerSubtext}>
            Made with care for informed consumers
          </Text>
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
  content: {
    flex: 1,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  sectionContent: {
    backgroundColor: '#111',
    borderRadius: 12,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 212, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    color: '#fff',
    fontSize: 16,
  },
  settingSubtitle: {
    color: '#666',
    fontSize: 13,
    marginTop: 2,
  },
  settingValue: {
    color: '#666',
    fontSize: 15,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  footerText: {
    color: '#444',
    fontSize: 14,
  },
  footerSubtext: {
    color: '#333',
    fontSize: 12,
    marginTop: 4,
  },
});

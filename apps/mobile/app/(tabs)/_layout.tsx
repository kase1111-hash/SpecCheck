import { Tabs } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type IconName = keyof typeof Ionicons.glyphMap;

interface TabIconProps {
  name: IconName;
  focused: boolean;
  color: string;
}

function TabIcon({ name, focused, color }: TabIconProps) {
  return (
    <View style={[styles.iconContainer, focused && styles.iconFocused]}>
      <Ionicons name={name} size={24} color={color} />
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: '#00D4FF',
        tabBarInactiveTintColor: '#666',
        tabBarShowLabel: true,
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Scan',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name="scan-outline" focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name="time-outline" focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="saved"
        options={{
          title: 'Saved',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name="bookmark-outline" focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name="settings-outline" focused={focused} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#111',
    borderTopColor: '#222',
    borderTopWidth: 1,
    height: 85,
    paddingTop: 8,
    paddingBottom: 28,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 4,
  },
  iconContainer: {
    padding: 4,
    borderRadius: 8,
  },
  iconFocused: {
    backgroundColor: 'rgba(0, 212, 255, 0.1)',
  },
});

import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import { colors } from '@/theme';

const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
  index: 'sunny-outline',
  transactions: 'swap-vertical-outline',
  plan: 'calendar-outline',
  debt: 'trending-down-outline',
  reports: 'bar-chart-outline',
};

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          height: 82,
          paddingTop: 9,
          paddingBottom: 17,
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
        tabBarIcon: ({ color, size }) => (
          <Ionicons
            accessible={false}
            importantForAccessibility="no-hide-descendants"
            name={icons[route.name] ?? 'ellipse-outline'}
            color={color}
            size={size}
          />
        ),
      })}
    >
      <Tabs.Screen name="index" options={{ title: 'Today', tabBarAccessibilityLabel: 'Today' }} />
      <Tabs.Screen
        name="transactions"
        options={{ title: 'Activity', tabBarAccessibilityLabel: 'Activity' }}
      />
      <Tabs.Screen name="plan" options={{ title: 'Plan', tabBarAccessibilityLabel: 'Plan' }} />
      <Tabs.Screen name="debt" options={{ title: 'Debt', tabBarAccessibilityLabel: 'Debt' }} />
      <Tabs.Screen
        name="reports"
        options={{ title: 'Reports', tabBarAccessibilityLabel: 'Reports' }}
      />
    </Tabs>
  );
}

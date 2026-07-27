import { Suspense } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Stack } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { FinanceProvider } from '@/providers/FinanceProvider';
import { migrateDatabase } from '@/data/migrations';
import { colors } from '@/theme';
import { SecurityProvider } from '@/providers/SecurityProvider';

function LoadingDatabase() {
  return (
    <View style={styles.loading}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

export default function RootLayout() {
  return (
    <Suspense fallback={<LoadingDatabase />}>
      <SecurityProvider>
        <SQLiteProvider databaseName="pesa-plan.db" onInit={migrateDatabase} useSuspense>
          <FinanceProvider>
            <StatusBar style="dark" />
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="onboarding/index" options={{ gestureEnabled: false }} />
              <Stack.Screen
                name="transaction/new"
                options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
              />
              <Stack.Screen name="accounts/index" />
              <Stack.Screen
                name="account/editor"
                options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
              />
              <Stack.Screen
                name="transfer/new"
                options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
              />
              <Stack.Screen
                name="budget/editor"
                options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
              />
              <Stack.Screen name="funds/index" />
              <Stack.Screen
                name="fund/editor"
                options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
              />
              <Stack.Screen name="goals/index" />
              <Stack.Screen
                name="goal/editor"
                options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
              />
              <Stack.Screen
                name="debt/editor"
                options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
              />
              <Stack.Screen name="settings/index" />
            </Stack>
          </FinanceProvider>
        </SQLiteProvider>
      </SecurityProvider>
    </Suspense>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.canvas,
  },
});

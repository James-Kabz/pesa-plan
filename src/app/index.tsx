import { Redirect } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useFinance } from '@/providers/FinanceProvider';
import { colors } from '@/theme';

export default function Index() {
  const { isLoading, preferences } = useFinance();
  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }
  if (preferences.onboardingStatus === 'pending') {
    return <Redirect href="/onboarding" />;
  }
  return <Redirect href="/(tabs)" />;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.canvas,
  },
});

import { StyleSheet, Text } from 'react-native';
import { Screen } from '@/components/Screen';
import { StageCard } from '@/components/StageCard';
import { colors, spacing } from '@/theme';

export default function PlanScreen() {
  return (
    <Screen>
      <Text style={styles.eyebrow}>SPEND WITH INTENTION</Text>
      <Text style={styles.title}>Plan</Text>
      <Text style={styles.subtitle}>Monthly budgets, bills, and sinking funds will live here.</Text>
      <StageCard
        icon="pie-chart-outline"
        title="Budgets are next"
        message="First we are making account balances and transactions dependable. Category limits and bill reminders follow in Stage 2."
        stage="STAGE 2"
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  eyebrow: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginTop: spacing.sm,
  },
  title: {
    color: colors.ink,
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  subtitle: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
});

import { StyleSheet, Text } from 'react-native';
import { Screen } from '@/components/Screen';
import { StageCard } from '@/components/StageCard';
import { colors, spacing } from '@/theme';

export default function DebtScreen() {
  return (
    <Screen>
      <Text style={styles.eyebrow}>SEE THE FINISH LINE</Text>
      <Text style={styles.title}>Debt</Text>
      <Text style={styles.subtitle}>Track balances, repayments, interest, and payoff dates.</Text>
      <StageCard
        icon="trending-down-outline"
        title="Debt payoff, clearly"
        message="Stage 3 adds payment history plus snowball and avalanche comparisons without hiding fees or interest."
        stage="STAGE 3"
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

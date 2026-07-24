import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen } from '@/components/Screen';
import { emergencyFundMonths, formatMoney } from '@/domain/money';
import { useFinance } from '@/providers/FinanceProvider';
import { colors, radius, spacing } from '@/theme';

export default function GoalsScreen() {
  const { savingsGoals, monthlySummary } = useFinance();
  const emergencySaved = savingsGoals
    .filter((goal) => goal.goalType === 'emergency')
    .reduce((sum, goal) => sum + goal.savedMinor, 0);
  const coverage = emergencyFundMonths(emergencySaved, monthlySummary.expenseMinor);

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Go back" style={styles.headerButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={colors.ink} />
        </Pressable>
        <Text style={styles.headerTitle}>Savings goals</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Add savings goal" style={styles.headerButton} onPress={() => router.push('/goal/editor')}>
          <Ionicons name="add" size={24} color={colors.primary} />
        </Pressable>
      </View>
      <View style={styles.coverage}>
        <Text style={styles.coverageLabel}>Emergency coverage estimate</Text>
        <Text style={styles.coverageValue}>{coverage.toFixed(1)} months</Text>
        <Text style={styles.coverageMeta}>Based on this month’s recorded spending</Text>
      </View>
      <Text style={styles.section}>Goals</Text>
      {savingsGoals.map((goal) => {
        const progress = Math.min(1, goal.savedMinor / goal.targetMinor);
        return (
          <Pressable
            key={goal.id}
            style={styles.card}
            onPress={() => router.push({ pathname: '/goal/editor', params: { id: goal.id } })}
          >
            <View style={[styles.icon, { backgroundColor: `${goal.color}18` }]}>
              <Ionicons name={goal.goalType === 'emergency' ? 'shield-checkmark-outline' : 'sparkles-outline'} size={21} color={goal.color} />
            </View>
            <View style={styles.details}>
              <View style={styles.top}><Text style={styles.name}>{goal.name}</Text><Text style={styles.percent}>{Math.round(progress * 100)}%</Text></View>
              <Text style={styles.meta}>{formatMoney(goal.savedMinor)} of {formatMoney(goal.targetMinor)}</Text>
              <View style={styles.track}><View style={[styles.fill, { width: `${progress * 100}%`, backgroundColor: goal.color }]} /></View>
            </View>
          </Pressable>
        );
      })}
      {!savingsGoals.length ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Give your savings a purpose</Text>
          <Text style={styles.emptyText}>Create an emergency fund or another meaningful target.</Text>
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: spacing.sm, marginBottom: spacing.xl },
  headerButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: colors.ink, fontSize: 18, fontWeight: '800' },
  coverage: { backgroundColor: colors.dark, borderRadius: radius.lg, padding: spacing.xl },
  coverageLabel: { color: '#B9CEC4', fontSize: 12 },
  coverageValue: { color: '#FFFFFF', fontSize: 30, fontWeight: '800', marginTop: spacing.sm },
  coverageMeta: { color: '#B9CEC4', fontSize: 11, marginTop: spacing.sm },
  section: { color: colors.ink, fontSize: 18, fontWeight: '800', marginTop: spacing.xl, marginBottom: spacing.md },
  card: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, marginBottom: spacing.md },
  icon: { width: 44, height: 44, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  details: { flex: 1 },
  top: { flexDirection: 'row', justifyContent: 'space-between' },
  name: { color: colors.ink, fontSize: 15, fontWeight: '800' },
  percent: { color: colors.primary, fontSize: 12, fontWeight: '800' },
  meta: { color: colors.muted, fontSize: 11, marginTop: 3 },
  track: { height: 7, backgroundColor: colors.border, borderRadius: radius.pill, overflow: 'hidden', marginTop: spacing.sm },
  fill: { height: 7, borderRadius: radius.pill },
  empty: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.xl },
  emptyTitle: { color: colors.ink, fontSize: 16, fontWeight: '800' },
  emptyText: { color: colors.muted, fontSize: 13, marginTop: spacing.sm, textAlign: 'center' },
});

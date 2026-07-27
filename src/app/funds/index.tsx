import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen } from '@/components/Screen';
import { EmptyState } from '@/components/EmptyState';
import { ProgressBar } from '@/components/ProgressBar';
import { ScreenHeader } from '@/components/ScreenHeader';
import { formatMoney } from '@/domain/money';
import { useFinance } from '@/providers/FinanceProvider';
import { colors, radius, spacing } from '@/theme';

export default function FundsScreen() {
  const { sinkingFunds, preferences } = useFinance();
  const saved = sinkingFunds.reduce((sum, fund) => sum + fund.savedMinor, 0);
  const target = sinkingFunds.reduce((sum, fund) => sum + fund.targetMinor, 0);

  return (
    <Screen>
      <ScreenHeader
        title="Sinking funds"
        onBack={() => router.back()}
        actionIcon="add"
        actionLabel="Add sinking fund"
        onAction={() => router.push('/fund/editor')}
      />
      <View style={styles.summary}>
        <Text style={styles.summaryLabel}>Saved for planned expenses</Text>
        <Text style={styles.summaryValue}>{formatMoney(saved, preferences.mainCurrency)}</Text>
        <Text style={styles.summaryMeta}>toward {formatMoney(target, preferences.mainCurrency)}</Text>
      </View>

      <Text style={styles.section}>Your funds</Text>
      {sinkingFunds.map((fund) => {
        const progress = Math.min(1, fund.savedMinor / fund.targetMinor);
        return (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Open ${fund.name} sinking fund`}
            key={fund.id}
            style={styles.card}
            onPress={() => router.push({ pathname: '/fund/editor', params: { id: fund.id } })}
          >
            <View style={styles.cardTop}>
              <View style={[styles.icon, { backgroundColor: `${fund.color}18` }]}>
                <Ionicons name="flag-outline" size={20} color={fund.color} />
              </View>
              <View style={styles.details}>
                <Text style={styles.name}>{fund.name}</Text>
                <Text style={styles.meta}>
                  {formatMoney(fund.savedMinor, preferences.mainCurrency)} of{' '}
                  {formatMoney(fund.targetMinor, preferences.mainCurrency)}
                </Text>
              </View>
              <Text style={styles.percent}>{Math.round(progress * 100)}%</Text>
            </View>
            <ProgressBar
              value={progress}
              label={`${fund.name} fund progress`}
              color={fund.color}
              style={styles.track}
            />
          </Pressable>
        );
      })}
      {!sinkingFunds.length ? (
        <EmptyState
          icon="flag-outline"
          title="Plan for the non-monthly stuff"
          message="Create a fund for travel, repairs, annual fees, or another future expense."
          actionLabel="Create a sinking fund"
          onAction={() => router.push('/fund/editor')}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  summary: { backgroundColor: colors.dark, borderRadius: radius.lg, padding: spacing.xl },
  summaryLabel: { color: '#B9CEC4', fontSize: 12 },
  summaryValue: { color: '#FFFFFF', fontSize: 30, fontWeight: '800', marginTop: spacing.sm },
  summaryMeta: { color: '#B9CEC4', fontSize: 12, marginTop: spacing.sm },
  section: { color: colors.ink, fontSize: 18, fontWeight: '800', marginTop: spacing.xl, marginBottom: spacing.md },
  card: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, marginBottom: spacing.md },
  cardTop: { flexDirection: 'row', alignItems: 'center' },
  icon: { width: 42, height: 42, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  details: { flex: 1, minWidth: 0 },
  name: { color: colors.ink, fontSize: 15, fontWeight: '800' },
  meta: { color: colors.muted, fontSize: 11, marginTop: 3 },
  percent: { color: colors.primary, fontSize: 14, fontWeight: '800' },
  track: { marginTop: spacing.md },
  emptyTitle: { color: colors.ink, fontSize: 16, fontWeight: '800' },
  emptyText: { color: colors.muted, fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: spacing.sm },
});

import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen } from '@/components/Screen';
import { formatMoney } from '@/domain/money';
import { useFinance } from '@/providers/FinanceProvider';
import { colors, radius, spacing } from '@/theme';

export default function FundsScreen() {
  const { sinkingFunds } = useFinance();
  const saved = sinkingFunds.reduce((sum, fund) => sum + fund.savedMinor, 0);
  const target = sinkingFunds.reduce((sum, fund) => sum + fund.targetMinor, 0);

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Go back" style={styles.headerButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={colors.ink} />
        </Pressable>
        <Text style={styles.headerTitle}>Sinking funds</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Add sinking fund" style={styles.headerButton} onPress={() => router.push('/fund/editor')}>
          <Ionicons name="add" size={24} color={colors.primary} />
        </Pressable>
      </View>
      <View style={styles.summary}>
        <Text style={styles.summaryLabel}>Saved for planned expenses</Text>
        <Text style={styles.summaryValue}>{formatMoney(saved)}</Text>
        <Text style={styles.summaryMeta}>toward {formatMoney(target)}</Text>
      </View>

      <Text style={styles.section}>Your funds</Text>
      {sinkingFunds.map((fund) => {
        const progress = Math.min(1, fund.savedMinor / fund.targetMinor);
        return (
          <Pressable
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
                <Text style={styles.meta}>{formatMoney(fund.savedMinor)} of {formatMoney(fund.targetMinor)}</Text>
              </View>
              <Text style={styles.percent}>{Math.round(progress * 100)}%</Text>
            </View>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${progress * 100}%`, backgroundColor: fund.color }]} />
            </View>
          </Pressable>
        );
      })}
      {!sinkingFunds.length ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Plan for the non-monthly stuff</Text>
          <Text style={styles.emptyText}>Create a fund for travel, repairs, annual fees, or another future expense.</Text>
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: spacing.sm, marginBottom: spacing.xl },
  headerButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: colors.ink, fontSize: 18, fontWeight: '800' },
  summary: { backgroundColor: colors.dark, borderRadius: radius.lg, padding: spacing.xl },
  summaryLabel: { color: '#B9CEC4', fontSize: 12 },
  summaryValue: { color: '#FFFFFF', fontSize: 30, fontWeight: '800', marginTop: spacing.sm },
  summaryMeta: { color: '#B9CEC4', fontSize: 12, marginTop: spacing.sm },
  section: { color: colors.ink, fontSize: 18, fontWeight: '800', marginTop: spacing.xl, marginBottom: spacing.md },
  card: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, marginBottom: spacing.md },
  cardTop: { flexDirection: 'row', alignItems: 'center' },
  icon: { width: 42, height: 42, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  details: { flex: 1 },
  name: { color: colors.ink, fontSize: 15, fontWeight: '800' },
  meta: { color: colors.muted, fontSize: 11, marginTop: 3 },
  percent: { color: colors.primary, fontSize: 14, fontWeight: '800' },
  track: { height: 8, backgroundColor: colors.border, borderRadius: radius.pill, overflow: 'hidden', marginTop: spacing.md },
  fill: { height: 8, borderRadius: radius.pill },
  empty: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.xl },
  emptyTitle: { color: colors.ink, fontSize: 16, fontWeight: '800' },
  emptyText: { color: colors.muted, fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: spacing.sm },
});

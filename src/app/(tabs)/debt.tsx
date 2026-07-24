import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen } from '@/components/Screen';
import { estimatePayoffMonths, formatMoney, orderDebts } from '@/domain/money';
import { useFinance } from '@/providers/FinanceProvider';
import { colors, radius, spacing } from '@/theme';

export default function DebtScreen() {
  const { debts, debtPayments } = useFinance();
  const [strategy, setStrategy] = useState<'snowball' | 'avalanche'>('avalanche');
  const ordered = useMemo(() => orderDebts(debts, strategy), [debts, strategy]);
  const total = debts.reduce((sum, debt) => sum + debt.balanceMinor, 0);
  const minimums = debts.reduce((sum, debt) => sum + debt.minimumPaymentMinor, 0);

  return (
    <Screen>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>SEE THE FINISH LINE</Text>
          <Text style={styles.title}>Debt</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Add debt" style={styles.add} onPress={() => router.push('/debt/editor')}>
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </Pressable>
      </View>

      <View style={styles.summary}>
        <Text style={styles.summaryLabel}>Total remaining</Text>
        <Text style={styles.summaryValue}>{formatMoney(total)}</Text>
        <Text style={styles.summaryMeta}>{formatMoney(minimums)} monthly minimums</Text>
      </View>

      <View style={styles.segment}>
        {(['avalanche', 'snowball'] as const).map((option) => (
          <Pressable
            key={option}
            onPress={() => setStrategy(option)}
            style={[styles.segmentOption, strategy === option && styles.segmentSelected]}
          >
            <Text style={[styles.segmentText, strategy === option && styles.segmentTextSelected]}>
              {option[0].toUpperCase() + option.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.hint}>
        {strategy === 'avalanche'
          ? 'Highest interest first to reduce total interest.'
          : 'Smallest balance first for quicker wins.'}
      </Text>

      {ordered.map((debt, index) => {
        const paid = debt.originalBalanceMinor - debt.balanceMinor;
        const progress = Math.min(1, paid / debt.originalBalanceMinor);
        const payoffMonths = estimatePayoffMonths(
          debt.balanceMinor,
          debt.aprBasisPoints,
          debt.minimumPaymentMinor,
        );
        return (
          <Pressable
            key={debt.id}
            style={styles.card}
            onPress={() => router.push({ pathname: '/debt/editor', params: { id: debt.id } })}
          >
            <View style={styles.rank}><Text style={styles.rankText}>{index + 1}</Text></View>
            <View style={styles.details}>
              <View style={styles.cardTop}>
                <Text style={styles.name}>{debt.name}</Text>
                <Text style={styles.apr}>{(debt.aprBasisPoints / 100).toFixed(2)}% APR</Text>
              </View>
              <Text style={styles.balance}>{formatMoney(debt.balanceMinor)} remaining</Text>
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${progress * 100}%` }]} />
              </View>
              <Text style={styles.meta}>
                Minimum {formatMoney(debt.minimumPaymentMinor)} · {payoffMonths === null ? 'payment too low' : `~${payoffMonths} months`}
              </Text>
            </View>
          </Pressable>
        );
      })}
      {!debts.length ? (
        <View style={styles.empty}>
          <Ionicons name="checkmark-circle-outline" size={38} color={colors.primary} />
          <Text style={styles.emptyTitle}>No active debts</Text>
          <Text style={styles.emptyText}>Add a debt to build a transparent payoff plan.</Text>
        </View>
      ) : null}
      {debtPayments.length ? (
        <>
          <Text style={styles.historyTitle}>Recent payments</Text>
          <View style={styles.history}>
            {debtPayments.slice(0, 5).map((payment) => (
              <View key={payment.id} style={styles.payment}>
                <View>
                  <Text style={styles.name}>{payment.debtName}</Text>
                  <Text style={styles.meta}>{new Date(payment.paidAt).toLocaleDateString('en-KE')}</Text>
                </View>
                <Text style={styles.paymentAmount}>−{formatMoney(payment.amountMinor)}</Text>
              </View>
            ))}
          </View>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: spacing.sm, marginBottom: spacing.xl },
  eyebrow: { color: colors.primary, fontSize: 11, fontWeight: '800', letterSpacing: 1.5 },
  title: { color: colors.ink, fontSize: 30, fontWeight: '800', letterSpacing: -0.8 },
  add: { width: 48, height: 48, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  summary: { backgroundColor: colors.dark, borderRadius: radius.lg, padding: spacing.xl },
  summaryLabel: { color: '#B9CEC4', fontSize: 12 },
  summaryValue: { color: '#FFFFFF', fontSize: 30, fontWeight: '800', marginTop: spacing.sm },
  summaryMeta: { color: '#B9CEC4', fontSize: 12, marginTop: spacing.sm },
  segment: { flexDirection: 'row', backgroundColor: '#E8ECE7', borderRadius: radius.md, padding: 4, marginTop: spacing.xl },
  segmentOption: { flex: 1, alignItems: 'center', paddingVertical: spacing.md, borderRadius: radius.sm },
  segmentSelected: { backgroundColor: colors.surface },
  segmentText: { color: colors.muted, fontSize: 13, fontWeight: '700' },
  segmentTextSelected: { color: colors.primary },
  hint: { color: colors.muted, fontSize: 12, marginVertical: spacing.md },
  card: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, marginBottom: spacing.md },
  rank: { width: 30, height: 30, borderRadius: radius.pill, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  rankText: { color: colors.primary, fontSize: 12, fontWeight: '800' },
  details: { flex: 1 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between' },
  name: { color: colors.ink, fontSize: 15, fontWeight: '800' },
  apr: { color: colors.expense, fontSize: 11, fontWeight: '800' },
  balance: { color: colors.muted, fontSize: 12, marginTop: spacing.xs },
  track: { height: 7, borderRadius: radius.pill, backgroundColor: colors.border, overflow: 'hidden', marginVertical: spacing.sm },
  fill: { height: 7, backgroundColor: colors.primary, borderRadius: radius.pill },
  meta: { color: colors.muted, fontSize: 11 },
  empty: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.xl },
  emptyTitle: { color: colors.ink, fontSize: 16, fontWeight: '800', marginTop: spacing.md },
  emptyText: { color: colors.muted, fontSize: 13, marginTop: spacing.xs },
  historyTitle: { color: colors.ink, fontSize: 18, fontWeight: '800', marginTop: spacing.xl, marginBottom: spacing.md },
  history: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.lg },
  payment: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  paymentAmount: { color: colors.primary, fontSize: 14, fontWeight: '800' },
});

import Ionicons from '@expo/vector-icons/Ionicons';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen } from '@/components/Screen';
import { formatMoney } from '@/domain/money';
import { useFinance } from '@/providers/FinanceProvider';
import { colors, radius, spacing } from '@/theme';

export default function PlanScreen() {
  const { recurring, transactions, addRecurring, recordRecurring } = useFinance();
  const latest = transactions.find((item) => item.type !== 'transfer');

  function repeatLatest() {
    if (!latest) {
      Alert.alert('Add activity first', 'Record an income or expense, then turn it into a schedule.');
      return;
    }
    const next = new Date();
    next.setMonth(next.getMonth() + 1);
    Alert.alert(
      'Repeat monthly?',
      `${latest.note || latest.categoryName} · ${formatMoney(latest.amountMinor)}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Create schedule',
          onPress: () =>
            void addRecurring({
              accountId: latest.accountId,
              categoryId: latest.categoryId,
              type: latest.type as 'income' | 'expense',
              amountMinor: latest.amountMinor,
              note: latest.note ?? latest.categoryName,
              frequency: 'monthly',
              nextDueAt: next.toISOString(),
            }),
        },
      ],
    );
  }

  return (
    <Screen>
      <Text style={styles.eyebrow}>SPEND WITH INTENTION</Text>
      <Text style={styles.title}>Plan</Text>
      <Text style={styles.subtitle}>Upcoming recurring income and expenses.</Text>

      <Pressable style={styles.add} onPress={repeatLatest}>
        <Ionicons name="repeat-outline" size={20} color="#FFFFFF" />
        <Text style={styles.addText}>Repeat latest transaction monthly</Text>
      </Pressable>

      <Text style={styles.section}>Schedules</Text>
      {recurring.length ? (
        <View style={styles.list}>
          {recurring.map((item) => {
            const due = new Intl.DateTimeFormat('en-KE', {
              day: 'numeric',
              month: 'short',
            }).format(new Date(item.nextDueAt));
            return (
              <View key={item.id} style={styles.row}>
                <View style={styles.icon}>
                  <Ionicons name="repeat" size={19} color={colors.primary} />
                </View>
                <View style={styles.details}>
                  <Text style={styles.name}>{item.note || item.categoryName}</Text>
                  <Text style={styles.meta}>{item.accountName} · due {due}</Text>
                </View>
                <View style={styles.right}>
                  <Text style={styles.amount}>{formatMoney(item.amountMinor)}</Text>
                  <Pressable onPress={() => void recordRecurring(item)}>
                    <Text style={styles.post}>Post now</Text>
                  </Pressable>
                </View>
              </View>
            );
          })}
        </View>
      ) : (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No schedules yet</Text>
          <Text style={styles.emptyText}>Recurring items stay manual until you choose to post them.</Text>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  eyebrow: { color: colors.primary, fontSize: 11, fontWeight: '800', letterSpacing: 1.5, marginTop: spacing.sm },
  title: { color: colors.ink, fontSize: 30, fontWeight: '800', letterSpacing: -0.8 },
  subtitle: { color: colors.muted, fontSize: 15, marginTop: spacing.sm, marginBottom: spacing.xl },
  add: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, borderRadius: radius.md, padding: spacing.lg },
  addText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  section: { color: colors.ink, fontSize: 18, fontWeight: '800', marginTop: spacing.xl, marginBottom: spacing.md },
  list: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border },
  icon: { width: 40, height: 40, borderRadius: radius.sm, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  details: { flex: 1 },
  name: { color: colors.ink, fontSize: 14, fontWeight: '800' },
  meta: { color: colors.muted, fontSize: 11, marginTop: 3 },
  right: { alignItems: 'flex-end' },
  amount: { color: colors.ink, fontSize: 13, fontWeight: '800' },
  post: { color: colors.primary, fontSize: 11, fontWeight: '800', marginTop: spacing.xs },
  empty: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.xl, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  emptyTitle: { color: colors.ink, fontSize: 16, fontWeight: '800' },
  emptyText: { color: colors.muted, fontSize: 13, textAlign: 'center', marginTop: spacing.sm },
});

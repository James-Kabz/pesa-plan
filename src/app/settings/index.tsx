import Ionicons from '@expo/vector-icons/Ionicons';
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import { router } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSQLiteContext } from 'expo-sqlite';
import {
  createBackup,
  decryptBackup,
  encryptBackup,
  restoreBackup,
  transactionsToCsv,
} from '@/data/backup';
import { useFinance } from '@/providers/FinanceProvider';
import { useSecurity } from '@/providers/SecurityProvider';
import { colors, radius, spacing } from '@/theme';

export default function SettingsScreen() {
  const db = useSQLiteContext();
  const { transactions, refresh } = useFinance();
  const { hasPin, setPin, removePin, lock } = useSecurity();
  const [pin, setPinValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [backupPassword, setBackupPassword] = useState('');

  async function savePin() {
    if (!/^\d{4}$/.test(pin)) {
      Alert.alert('Use four digits', 'Enter a 4-digit PIN.');
      return;
    }
    await setPin(pin);
    setPinValue('');
    Alert.alert('PIN enabled', 'Pesa Plan will lock after two minutes of inactivity.');
  }

  async function shareFile(name: string, content: string, mimeType: string) {
    const file = new File(Paths.cache, name);
    file.create({ overwrite: true });
    file.write(content);
    if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing unavailable');
    await Sharing.shareAsync(file.uri, { mimeType });
  }

  async function exportCsv() {
    try {
      setBusy(true);
      await shareFile(
        `pesa-plan-transactions-${new Date().toISOString().slice(0, 10)}.csv`,
        transactionsToCsv(transactions),
        'text/csv',
      );
    } catch {
      Alert.alert('Could not export', 'CSV sharing is not available on this device.');
    } finally {
      setBusy(false);
    }
  }

  async function exportBackup() {
    if (backupPassword.length < 8) {
      Alert.alert('Use a stronger backup password', 'Enter at least 8 characters.');
      return;
    }
    try {
      setBusy(true);
      const backup = await createBackup(db);
      await shareFile(
        `pesa-plan-backup-${new Date().toISOString().slice(0, 10)}.ppbackup`,
        await encryptBackup(backup, backupPassword),
        'application/octet-stream',
      );
    } catch {
      Alert.alert('Could not back up', 'The backup file could not be created.');
    } finally {
      setBusy(false);
    }
  }

  async function chooseRestore() {
    if (backupPassword.length < 8) {
      Alert.alert('Enter the backup password', 'Use the password that encrypted the backup.');
      return;
    }
    const result = await DocumentPicker.getDocumentAsync({
      type: '*/*',
      copyToCacheDirectory: true,
    });
    if (result.canceled) return;
    Alert.alert(
      'Replace all local data?',
      'Restore removes the current local ledger and replaces it with the selected backup.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restore',
          style: 'destructive',
          onPress: () =>
            void (async () => {
              try {
                setBusy(true);
                const file = new File(result.assets[0].uri);
                await restoreBackup(db, await decryptBackup(await file.text(), backupPassword));
                await refresh();
                Alert.alert('Restore complete', 'Your local data was replaced successfully.');
              } catch {
                Alert.alert('Restore failed', 'The selected file is not a valid Pesa Plan backup.');
              } finally {
                setBusy(false);
              }
            })(),
        },
      ],
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable style={styles.headerButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={colors.ink} />
        </Pressable>
        <Text style={styles.headerTitle}>Privacy & data</Text>
        <View style={styles.headerButton} />
      </View>
      <View style={styles.content}>
        <Text style={styles.section}>App lock</Text>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{hasPin ? 'PIN protection is on' : 'Set a 4-digit PIN'}</Text>
          <Text style={styles.cardText}>Biometric unlock is available when supported by your device.</Text>
          {!hasPin ? (
            <>
              <TextInput
                value={pin}
                onChangeText={(value) => setPinValue(value.replace(/\D/g, '').slice(0, 4))}
                secureTextEntry
                keyboardType="number-pad"
                placeholder="••••"
                placeholderTextColor="#98A19B"
                style={styles.pin}
              />
              <Action label="Enable app lock" icon="lock-closed-outline" onPress={() => void savePin()} />
            </>
          ) : (
            <>
              <Action label="Lock now" icon="lock-closed-outline" onPress={lock} />
              <Pressable onPress={() => void removePin()}><Text style={styles.danger}>Remove PIN</Text></Pressable>
            </>
          )}
        </View>

        <Text style={styles.section}>Your data</Text>
        <View style={styles.card}>
          <Action label="Export transactions as CSV" icon="document-text-outline" onPress={() => void exportCsv()} disabled={busy} />
          <TextInput
            value={backupPassword}
            onChangeText={setBackupPassword}
            secureTextEntry
            autoCapitalize="none"
            placeholder="Backup password (8+ characters)"
            placeholderTextColor="#98A19B"
            style={styles.backupPassword}
          />
          <Action label="Create full local backup" icon="download-outline" onPress={() => void exportBackup()} disabled={busy} />
          <Action label="Restore from backup" icon="cloud-upload-outline" onPress={() => void chooseRestore()} disabled={busy} />
          <Text style={styles.cardText}>Files are created only when you request them. Automatic cloud sync is not enabled.</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

function Action({ label, icon, onPress, disabled = false }: { label: string; icon: keyof typeof Ionicons.glyphMap; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable disabled={disabled} onPress={onPress} style={[styles.action, disabled && styles.disabled]}>
      <Ionicons name={icon} size={20} color={colors.primary} />
      <Text style={styles.actionText}>{label}</Text>
      <Ionicons name="chevron-forward" size={17} color={colors.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.canvas },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  headerButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: colors.ink, fontSize: 18, fontWeight: '800' },
  content: { paddingHorizontal: spacing.lg },
  section: { color: colors.ink, fontSize: 18, fontWeight: '800', marginTop: spacing.xl, marginBottom: spacing.md },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.lg },
  cardTitle: { color: colors.ink, fontSize: 15, fontWeight: '800' },
  cardText: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: spacing.xs, marginBottom: spacing.md },
  pin: { backgroundColor: colors.canvas, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, color: colors.ink, fontSize: 22, textAlign: 'center', letterSpacing: 12, padding: spacing.md, marginBottom: spacing.md },
  backupPassword: { backgroundColor: colors.canvas, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, color: colors.ink, fontSize: 14, padding: spacing.md, marginTop: spacing.sm },
  action: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, paddingVertical: spacing.lg },
  actionText: { flex: 1, color: colors.ink, fontSize: 13, fontWeight: '700' },
  danger: { color: colors.expense, textAlign: 'center', fontSize: 13, fontWeight: '800', padding: spacing.md },
  disabled: { opacity: 0.45 },
});

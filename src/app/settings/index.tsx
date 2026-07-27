import Ionicons from '@expo/vector-icons/Ionicons';
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import { router } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useEffect, useState } from 'react';
import {
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSQLiteContext } from 'expo-sqlite';
import { ScreenHeader } from '@/components/ScreenHeader';
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
import {
  getReminderPermissionState,
  requestReminderPermission,
  sendTestReminder,
  type ReminderPermissionState,
} from '@/services/localReminders';

export default function SettingsScreen() {
  const db = useSQLiteContext();
  const {
    transactions,
    refresh,
    preferences,
    restartSetup,
    setReminderPreference,
  } = useFinance();
  const { securityAvailable, hasPin, setPin, removePin, lock } = useSecurity();
  const [pin, setPinValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [backupPassword, setBackupPassword] = useState('');
  const [reminderPermission, setReminderPermission] =
    useState<ReminderPermissionState>('undetermined');
  const [reminderBusy, setReminderBusy] = useState(false);

  useEffect(() => {
    void getReminderPermissionState()
      .then(setReminderPermission)
      .catch(() => setReminderPermission('unavailable'));
  }, []);

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

  async function openGuidedSetup() {
    await restartSetup();
    router.push('/onboarding');
  }

  async function toggleReminders(enabled: boolean) {
    if (!enabled) {
      await setReminderPreference('remindersEnabled', false);
      return;
    }
    if (Platform.OS === 'web') {
      Alert.alert(
        'Use the Android or iOS app',
        'Local reminders are available on your phone.',
      );
      return;
    }
    try {
      setReminderBusy(true);
      const granted = await requestReminderPermission();
      setReminderPermission(granted ? 'granted' : 'denied');
      if (!granted) {
        Alert.alert(
          'Notifications are off',
          'Allow notifications in your phone settings when you want Pesa Plan reminders.',
          [
            { text: 'Not now', style: 'cancel' },
            { text: 'Open settings', onPress: () => void Linking.openSettings() },
          ],
        );
        return;
      }
      await setReminderPreference('remindersEnabled', true);
    } catch {
      Alert.alert(
        'Could not enable reminders',
        'Install the latest Pesa Plan build and try again.',
      );
    } finally {
      setReminderBusy(false);
    }
  }

  async function testReminder() {
    try {
      setReminderBusy(true);
      await sendTestReminder();
      Alert.alert(
        'Test scheduled',
        'Put Pesa Plan in the background. The reminder should arrive in about five seconds.',
      );
    } catch {
      Alert.alert(
        'Could not send test',
        'Check that notifications are allowed for Pesa Plan.',
      );
    } finally {
      setReminderBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScreenHeader
        title="Settings"
        onBack={() => router.back()}
        style={styles.header}
      />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text accessibilityRole="header" style={styles.section}>Personalize</Text>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Guided financial setup</Text>
          <Text style={styles.cardText}>
            {preferences.onboardingStatus === 'deferred'
              ? 'Continue setting up your currency, accounts, expected income, and starter budget.'
              : `Review your ${preferences.mainCurrency} setup, accounts, expected income, and starter budget.`}
          </Text>
          <Action
            label={preferences.onboardingStatus === 'deferred' ? 'Continue guided setup' : 'Run guided setup again'}
            icon="sparkles-outline"
            onPress={() => void openGuidedSetup()}
          />
        </View>

        <Text accessibilityRole="header" style={styles.section}>App lock</Text>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {!securityAvailable
              ? 'App lock requires Android or iOS'
              : hasPin
                ? 'PIN protection is on'
                : 'Set a 4-digit PIN'}
          </Text>
          <Text style={styles.cardText}>
            {securityAvailable
              ? 'Biometric unlock is available when supported by your device.'
              : 'Secure storage, biometrics, and screen-capture protection are native-only.'}
          </Text>
          {!securityAvailable ? null : !hasPin ? (
            <>
              <TextInput
                accessibilityLabel="Choose a 4-digit PIN"
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
              <Pressable accessibilityRole="button" accessibilityLabel="Remove PIN" onPress={() => void removePin()}><Text style={styles.danger}>Remove PIN</Text></Pressable>
            </>
          )}
        </View>

        <Text accessibilityRole="header" style={styles.section}>Reminders</Text>
        <View style={styles.card}>
          <PreferenceToggle
            label="Useful local reminders"
            description={
              reminderPermission === 'unavailable'
                ? 'Available in the Android and iOS app.'
                : 'Private, low-noise check-ins that stay on this device.'
            }
            value={preferences.remindersEnabled}
            disabled={reminderBusy || reminderPermission === 'unavailable'}
            onValueChange={(enabled) => void toggleReminders(enabled)}
          />
          {preferences.remindersEnabled ? (
            <>
              <PreferenceToggle
                label="Upcoming schedules"
                description="A check-in before an active schedule is due."
                value={preferences.remindSchedules}
                onValueChange={(enabled) =>
                  void setReminderPreference('remindSchedules', enabled)
                }
              />
              <PreferenceToggle
                label="Payday"
                description="A reminder before expected income is due."
                value={preferences.remindPaydays}
                onValueChange={(enabled) =>
                  void setReminderPreference('remindPaydays', enabled)
                }
              />
              <PreferenceToggle
                label="Weekly money check-in"
                description="One Sunday review for budgets and savings goals."
                value={preferences.remindWeeklyReview}
                onValueChange={(enabled) =>
                  void setReminderPreference('remindWeeklyReview', enabled)
                }
              />
              <Action
                label="Send a test reminder"
                icon="notifications-outline"
                onPress={() => void testReminder()}
                disabled={reminderBusy}
              />
            </>
          ) : null}
          <Text style={styles.cardText}>
            Notification previews never include balances or transaction amounts.
          </Text>
        </View>

        <Text accessibilityRole="header" style={styles.section}>Your data</Text>
        <View style={styles.card}>
          <Action label="Export transactions as CSV" icon="document-text-outline" onPress={() => void exportCsv()} disabled={busy} />
          <TextInput
            accessibilityLabel="Backup password"
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
        <View style={styles.bottomSpace} />
      </ScrollView>
    </SafeAreaView>
  );
}

function PreferenceToggle({
  label,
  description,
  value,
  onValueChange,
  disabled = false,
}: {
  label: string;
  description: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <View style={[styles.preferenceRow, disabled && styles.disabled]}>
      <View style={styles.preferenceCopy}>
        <Text style={styles.preferenceLabel}>{label}</Text>
        <Text style={styles.preferenceDescription}>{description}</Text>
      </View>
      <Switch
        accessibilityLabel={label}
        accessibilityRole="switch"
        accessibilityState={{ checked: value, disabled }}
        disabled={disabled}
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.border, true: colors.primarySoft }}
        thumbColor={value ? colors.primary : '#F7F7F4'}
      />
    </View>
  );
}

function Action({ label, icon, onPress, disabled = false }: { label: string; icon: keyof typeof Ionicons.glyphMap; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={[styles.action, disabled && styles.disabled]}>
      <Ionicons name={icon} size={20} color={colors.primary} />
      <Text style={styles.actionText}>{label}</Text>
      <Ionicons name="chevron-forward" size={17} color={colors.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.canvas },
  header: { paddingHorizontal: spacing.lg },
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
  preferenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: spacing.md,
  },
  preferenceCopy: { flex: 1 },
  preferenceLabel: { color: colors.ink, fontSize: 14, fontWeight: '800' },
  preferenceDescription: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  bottomSpace: { height: spacing.xxl },
});

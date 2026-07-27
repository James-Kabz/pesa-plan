import { Platform } from 'react-native';
import type { LocalReminder } from '@/domain/localReminders';

const CHANNEL_ID = 'pesa-plan-reminders';
const IDENTIFIER_PREFIX = 'pesa-plan:';

export type ReminderPermissionState =
  | 'granted'
  | 'denied'
  | 'undetermined'
  | 'unavailable';

async function notificationModule() {
  if (Platform.OS === 'web') return null;
  return import('expo-notifications');
}

async function ensureAndroidChannel(): Promise<void> {
  const Notifications = await notificationModule();
  if (!Notifications || Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Pesa Plan reminders',
    description: 'Upcoming schedules, payday, and weekly planning check-ins',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 200],
    lightColor: '#175C45',
  });
}

function isGranted(
  permissions: Awaited<
    ReturnType<
      typeof import('expo-notifications')['getPermissionsAsync']
    >
  >,
  iosAuthorizationStatus: typeof import('expo-notifications')['IosAuthorizationStatus'],
): boolean {
  if (permissions.granted) return true;
  const iosStatus = permissions.ios?.status;
  return (
    iosStatus === iosAuthorizationStatus.AUTHORIZED ||
    iosStatus === iosAuthorizationStatus.PROVISIONAL ||
    iosStatus === iosAuthorizationStatus.EPHEMERAL
  );
}

export async function configureLocalNotifications(): Promise<void> {
  const Notifications = await notificationModule();
  if (!Notifications) return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

export async function getReminderPermissionState(): Promise<ReminderPermissionState> {
  const Notifications = await notificationModule();
  if (!Notifications) return 'unavailable';
  const permissions = await Notifications.getPermissionsAsync();
  if (isGranted(permissions, Notifications.IosAuthorizationStatus)) return 'granted';
  return permissions.status === 'denied' ? 'denied' : 'undetermined';
}

export async function requestReminderPermission(): Promise<boolean> {
  const Notifications = await notificationModule();
  if (!Notifications) return false;
  await ensureAndroidChannel();
  const existing = await Notifications.getPermissionsAsync();
  if (isGranted(existing, Notifications.IosAuthorizationStatus)) return true;
  return isGranted(
    await Notifications.requestPermissionsAsync(),
    Notifications.IosAuthorizationStatus,
  );
}

export async function cancelLocalReminders(): Promise<void> {
  const Notifications = await notificationModule();
  if (!Notifications) return;
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter(({ identifier }) => identifier.startsWith(IDENTIFIER_PREFIX))
      .map(({ identifier }) =>
        Notifications.cancelScheduledNotificationAsync(identifier),
      ),
  );
}

export async function syncLocalReminders(
  reminders: LocalReminder[],
): Promise<void> {
  const Notifications = await notificationModule();
  if (!Notifications) return;
  await ensureAndroidChannel();
  await cancelLocalReminders();
  const now = Date.now();
  for (const reminder of reminders) {
    const date = new Date(reminder.scheduledFor);
    if (date.getTime() <= now) continue;
    await Notifications.scheduleNotificationAsync({
      identifier: `${IDENTIFIER_PREFIX}${reminder.key}`,
      content: {
        title: reminder.title,
        body: reminder.body,
        sound: false,
        data: {
          source: 'pesa-plan-reminder',
          route: reminder.route,
        },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date,
        channelId: Platform.OS === 'android' ? CHANNEL_ID : undefined,
      },
    });
  }
}

export async function sendTestReminder(): Promise<void> {
  const Notifications = await notificationModule();
  if (!Notifications) throw new Error('Notifications are unavailable');
  await ensureAndroidChannel();
  await Notifications.scheduleNotificationAsync({
    identifier: `${IDENTIFIER_PREFIX}test:${Date.now()}`,
    content: {
      title: 'Pesa Plan reminders are ready',
      body: 'Your useful money check-ins will appear here.',
      sound: false,
      data: { source: 'pesa-plan-reminder', route: '/' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: new Date(Date.now() + 5_000),
      channelId: Platform.OS === 'android' ? CHANNEL_ID : undefined,
    },
  });
}

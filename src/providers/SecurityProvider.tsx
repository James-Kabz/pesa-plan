import Ionicons from '@expo/vector-icons/Ionicons';
import * as Crypto from 'expo-crypto';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import * as ScreenCapture from 'expo-screen-capture';
import {
  AppState,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { colors, radius, spacing } from '@/theme';

const PIN_KEY = 'pesa-plan-pin-v1';
const LOCK_DELAY_MS = 2 * 60 * 1000;
const SCREEN_CAPTURE_KEY = 'pesa-plan-private';
const SCREEN_CAPTURE_RETRY_MS = 250;
const SCREEN_CAPTURE_MAX_ATTEMPTS = 5;

interface SecurityContextValue {
  securityAvailable: boolean;
  hasPin: boolean;
  setPin: (pin: string) => Promise<void>;
  removePin: () => Promise<void>;
  lock: () => void;
}

const SecurityContext = createContext<SecurityContextValue | null>(null);

async function hashPin(pin: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, pin);
}

export function SecurityProvider({ children }: { children: React.ReactNode }) {
  const securityAvailable = Platform.OS !== 'web';
  const [ready, setReady] = useState(false);
  const [hasPin, setHasPin] = useState(false);
  const [unlocked, setUnlocked] = useState(true);
  const [privacyCover, setPrivacyCover] = useState(false);
  const lockTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!securityAvailable) {
      setReady(true);
      return;
    }
    void SecureStore.getItemAsync(PIN_KEY).then((saved) => {
      setHasPin(Boolean(saved));
      setUnlocked(!saved);
      setReady(true);
    });
  }, [securityAvailable]);

  useEffect(() => {
    if (!securityAvailable) return;

    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const enableScreenCaptureProtection = async (attempt = 1) => {
      try {
        await ScreenCapture.preventScreenCaptureAsync(SCREEN_CAPTURE_KEY);
        if (cancelled) {
          await ScreenCapture.allowScreenCaptureAsync(SCREEN_CAPTURE_KEY).catch(() => undefined);
        }
      } catch {
        // Expo records the key before calling Android. Release it after a rejected
        // call so a foreground retry can reach the native module again.
        await ScreenCapture.allowScreenCaptureAsync(SCREEN_CAPTURE_KEY).catch(() => undefined);
        if (
          !cancelled &&
          AppState.currentState === 'active' &&
          attempt < SCREEN_CAPTURE_MAX_ATTEMPTS
        ) {
          retryTimer = setTimeout(
            () => void enableScreenCaptureProtection(attempt + 1),
            SCREEN_CAPTURE_RETRY_MS,
          );
        }
      }
    };

    if (AppState.currentState === 'active') {
      void enableScreenCaptureProtection();
    }

    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      if (retryTimer) clearTimeout(retryTimer);
      void enableScreenCaptureProtection();
    });

    return () => {
      cancelled = true;
      subscription.remove();
      if (retryTimer) clearTimeout(retryTimer);
      void ScreenCapture.allowScreenCaptureAsync(SCREEN_CAPTURE_KEY).catch(() => undefined);
    };
  }, [securityAvailable]);

  const lock = useCallback(() => {
    if (hasPin) setUnlocked(false);
  }, [hasPin]);

  const noteActivity = useCallback(() => {
    if (!hasPin || !unlocked) return;
    if (lockTimer.current) clearTimeout(lockTimer.current);
    lockTimer.current = setTimeout(lock, LOCK_DELAY_MS);
  }, [hasPin, lock, unlocked]);

  useEffect(() => {
    noteActivity();
    return () => {
      if (lockTimer.current) clearTimeout(lockTimer.current);
    };
  }, [noteActivity]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      setPrivacyCover(state !== 'active');
      if (state !== 'active') lock();
    });
    return () => subscription.remove();
  }, [lock]);

  const setPin = useCallback(async (pin: string) => {
    if (!securityAvailable) throw new Error('App lock is unavailable on web');
    await SecureStore.setItemAsync(PIN_KEY, await hashPin(pin));
    setHasPin(true);
    setUnlocked(true);
  }, [securityAvailable]);

  const removePin = useCallback(async () => {
    if (!securityAvailable) return;
    await SecureStore.deleteItemAsync(PIN_KEY);
    setHasPin(false);
    setUnlocked(true);
  }, [securityAvailable]);

  const value = useMemo(
    () => ({ securityAvailable, hasPin, setPin, removePin, lock }),
    [securityAvailable, hasPin, lock, removePin, setPin],
  );

  if (!ready) return <View style={styles.cover} />;

  return (
    <SecurityContext.Provider value={value}>
      <View style={styles.flex} onTouchStart={noteActivity}>
        {children}
        {hasPin && !unlocked ? <UnlockScreen onUnlock={() => setUnlocked(true)} /> : null}
        {privacyCover ? <View style={styles.cover}><Ionicons name="lock-closed" size={36} color={colors.primary} /></View> : null}
      </View>
    </SecurityContext.Provider>
  );
}

function UnlockScreen({ onUnlock }: { onUnlock: () => void }) {
  const [pin, setPinValue] = useState('');
  const [error, setError] = useState('');
  const pinInput = useRef<TextInput>(null);
  const automaticBiometricAttempted = useRef(false);

  useEffect(() => {
    if (automaticBiometricAttempted.current) return;
    automaticBiometricAttempted.current = true;
    void useBiometric(true).then((unlocked) => {
      if (!unlocked) pinInput.current?.focus();
    });
  }, []);

  async function verify() {
    const saved = await SecureStore.getItemAsync(PIN_KEY);
    if (saved && (await hashPin(pin)) === saved) {
      setPinValue('');
      setError('');
      onUnlock();
    } else {
      setPinValue('');
      setError('Incorrect PIN');
    }
  }

  async function useBiometric(automatic = false): Promise<boolean> {
    try {
      const [hardware, enrolled] = await Promise.all([
        LocalAuthentication.hasHardwareAsync(),
        LocalAuthentication.isEnrolledAsync(),
      ]);
      if (!hardware || !enrolled) {
        if (!automatic) setError('Biometric unlock is not available');
        return false;
      }
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock Pesa Plan',
        cancelLabel: 'Use PIN',
        biometricsSecurityLevel: 'strong',
      });
      if (result.success) {
        setError('');
        onUnlock();
        return true;
      }
      return false;
    } catch {
      if (!automatic) setError('Biometric unlock could not start');
      return false;
    }
  }

  return (
    <View style={styles.unlock}>
      <View style={styles.lockIcon}><Ionicons name="lock-closed" size={28} color={colors.primary} /></View>
      <Text style={styles.unlockTitle}>Pesa Plan is locked</Text>
      <Text style={styles.unlockText}>Enter your 4-digit PIN to continue.</Text>
      <TextInput
        ref={pinInput}
        accessibilityLabel="4-digit PIN"
        secureTextEntry
        value={pin}
        onChangeText={(value) => setPinValue(value.replace(/\D/g, '').slice(0, 4))}
        keyboardType="number-pad"
        style={styles.pin}
        onSubmitEditing={() => void verify()}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable accessibilityRole="button" accessibilityLabel="Unlock app" accessibilityState={{ disabled: pin.length !== 4 }} disabled={pin.length !== 4} style={[styles.unlockButton, pin.length !== 4 && styles.disabled]} onPress={() => void verify()}>
        <Text style={styles.unlockButtonText}>Unlock</Text>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Unlock with biometrics" style={styles.bioButton} onPress={() => void useBiometric()}>
        <Ionicons name="finger-print" size={20} color={colors.primary} />
        <Text style={styles.bioText}>Use biometrics</Text>
      </Pressable>
    </View>
  );
}

export function useSecurity(): SecurityContextValue {
  const value = useContext(SecurityContext);
  if (!value) throw new Error('useSecurity must be used inside SecurityProvider');
  return value;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  cover: { ...StyleSheet.absoluteFill, backgroundColor: colors.canvas, zIndex: 100, alignItems: 'center', justifyContent: 'center' },
  unlock: { ...StyleSheet.absoluteFill, zIndex: 90, backgroundColor: colors.canvas, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  lockIcon: { width: 64, height: 64, borderRadius: radius.lg, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  unlockTitle: { color: colors.ink, fontSize: 24, fontWeight: '800', marginTop: spacing.xl },
  unlockText: { color: colors.muted, fontSize: 14, marginTop: spacing.sm },
  pin: { width: 180, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, color: colors.ink, fontSize: 28, letterSpacing: 16, textAlign: 'center', padding: spacing.lg, marginTop: spacing.xl },
  error: { color: colors.expense, fontSize: 12, marginTop: spacing.sm },
  unlockButton: { width: 180, alignItems: 'center', backgroundColor: colors.primary, borderRadius: radius.md, padding: spacing.lg, marginTop: spacing.lg },
  unlockButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  disabled: { opacity: 0.4 },
  bioButton: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.lg, marginTop: spacing.sm },
  bioText: { color: colors.primary, fontSize: 14, fontWeight: '800' },
});

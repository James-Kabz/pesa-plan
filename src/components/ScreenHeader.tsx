import Ionicons from '@expo/vector-icons/Ionicons';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { colors, radius, spacing } from '@/theme';

export function ScreenHeader({
  title,
  onBack,
  backLabel = 'Go back',
  backIcon = 'arrow-back',
  actionIcon,
  actionLabel,
  onAction,
  style,
}: {
  title: string;
  onBack: () => void;
  backLabel?: string;
  backIcon?: 'arrow-back' | 'close';
  actionIcon?: keyof typeof Ionicons.glyphMap;
  actionLabel?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.header, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={backLabel}
        hitSlop={4}
        onPress={onBack}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      >
        <Ionicons name={backIcon} size={22} color={colors.ink} />
      </Pressable>
      <Text accessibilityRole="header" numberOfLines={2} style={styles.title}>
        {title}
      </Text>
      {actionIcon && actionLabel && onAction ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          hitSlop={4}
          onPress={onAction}
          style={({ pressed }) => [styles.button, pressed && styles.pressed]}
        >
          <Ionicons name={actionIcon} size={24} color={colors.primary} />
        </Pressable>
      ) : (
        <View style={styles.button} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 56,
    paddingTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  button: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    backgroundColor: colors.primarySoft,
  },
  title: {
    flex: 1,
    color: colors.ink,
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 23,
    textAlign: 'center',
    marginHorizontal: spacing.sm,
  },
});

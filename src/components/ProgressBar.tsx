import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radius } from '@/theme';

export function ProgressBar({
  value,
  label,
  color = colors.primary,
  style,
}: {
  value: number;
  label: string;
  color?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const percentage = Math.max(0, Math.min(100, Math.round(value * 100)));
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{
        min: 0,
        max: 100,
        now: percentage,
        text: `${percentage}%`,
      }}
      style={[styles.track, style]}
    >
      <View
        importantForAccessibility="no-hide-descendants"
        style={[
          styles.fill,
          { width: `${percentage}%`, backgroundColor: color },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radius.pill,
  },
});

import { TouchableOpacity, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../../store/theme';

type Props = {
  label: string;
  active?: boolean;
  onPress: () => void;
  style?: ViewStyle;
  accessibilityLabel?: string;
};

export default function FilterChip({ label, active = false, onPress, style, accessibilityLabel }: Props) {
  const t = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={accessibilityLabel ?? label}
      style={[
        styles.chip,
        { backgroundColor: active ? t.upiBlue : t.chipBg },
        style,
      ]}
    >
      <Text style={[styles.label, { color: active ? '#fff' : t.textMuted }]} numberOfLines={1}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    minHeight: 36,
    justifyContent: 'center',
  },
  label: { fontSize: 12, fontWeight: '600' },
});

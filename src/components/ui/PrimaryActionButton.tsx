import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  View,
  type ViewStyle,
  type TextStyle,
} from 'react-native';

type Props = {
  label: string;
  loadingLabel: string;
  loading?: boolean;
  disabled?: boolean;
  onPress: () => void;
  backgroundColor: string;
  style?: ViewStyle;
  textStyle?: TextStyle;
  accessibilityLabel?: string;
  compact?: boolean;
};

export default function PrimaryActionButton({
  label,
  loadingLabel,
  loading = false,
  disabled = false,
  onPress,
  backgroundColor,
  style,
  textStyle,
  accessibilityLabel,
  compact = false,
}: Props) {
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={[
        compact ? styles.compact : styles.default,
        { backgroundColor, opacity: isDisabled && !loading ? 0.5 : 1 },
        style,
      ]}
    >
      {loading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color="#fff" />
          <Text style={[compact ? styles.compactText : styles.text, textStyle]}>{loadingLabel}</Text>
        </View>
      ) : (
        <Text style={[compact ? styles.compactText : styles.text, textStyle]}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  default: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  compact: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  text: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  compactText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
});

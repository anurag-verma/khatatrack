import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { X } from 'lucide-react-native';
import { useTheme } from '../../store/theme';

type Props = {
  label: string;
  onRemove: () => void;
};

export default function ActiveFilterPill({ label, onRemove }: Props) {
  const t = useTheme();
  return (
    <View style={[styles.pill, { backgroundColor: t.upiBlue + '18', borderColor: t.upiBlue + '40' }]}>
      <Text style={[styles.label, { color: t.upiBlue }]} numberOfLines={1}>
        {label}
      </Text>
      <TouchableOpacity
        onPress={onRemove}
        hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}
        accessibilityRole="button"
        accessibilityLabel={`Remove ${label}`}
      >
        <X size={14} color={t.upiBlue} strokeWidth={2.5} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingLeft: 10,
    paddingRight: 6,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    maxWidth: 160,
  },
  label: { fontSize: 12, fontWeight: '600', flexShrink: 1 },
});

import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../store/theme';

type Props = {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  onRightPress?: () => void;
};

export default function ScreenHeader({ title, subtitle, right, onRightPress }: Props) {
  const t = useTheme();
  return (
    <View style={styles.wrap}>
      <View style={styles.textCol}>
        <Text style={[styles.title, { color: t.text }]} accessibilityRole="header">{title}</Text>
        {subtitle ? <Text style={[styles.subtitle, { color: t.textMuted }]}>{subtitle}</Text> : null}
      </View>
      {right ? (
        onRightPress ? (
          <TouchableOpacity onPress={onRightPress} hitSlop={12}>{right}</TouchableOpacity>
        ) : (
          right
        )
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  textCol: { flex: 1 },
  title: { fontSize: 20, fontWeight: '700' },
  subtitle: { fontSize: 12, marginTop: 2 },
});

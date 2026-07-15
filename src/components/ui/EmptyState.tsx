import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../store/theme';

type Props = {
  icon?: React.ReactNode;
  title: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
};

export default function EmptyState({ icon, title, body, actionLabel, onAction }: Props) {
  const t = useTheme();
  return (
    <View style={styles.wrap} accessibilityRole="text">
      {icon ? <View style={styles.icon}>{icon}</View> : null}
      <Text style={[styles.title, { color: t.text }]}>{title}</Text>
      {body ? <Text style={[styles.body, { color: t.textMuted }]}>{body}</Text> : null}
      {actionLabel && onAction ? (
        <TouchableOpacity
          onPress={onAction}
          style={[styles.btn, { backgroundColor: t.upiBlue }]}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
        >
          <Text style={styles.btnText}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 32 },
  icon: { marginBottom: 16, opacity: 0.85 },
  title: { fontSize: 17, fontWeight: '600', textAlign: 'center' },
  body: { fontSize: 14, marginTop: 8, textAlign: 'center', lineHeight: 20 },
  btn: { marginTop: 20, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  btnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});

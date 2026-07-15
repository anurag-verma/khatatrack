import { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../store/theme';

type Props = {
  visible: boolean;
  message: string;
  onDismiss: () => void;
  durationMs?: number;
};

export default function ToastBanner({ visible, message, onDismiss, durationMs = 2500 }: Props) {
  const t = useTheme();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(onDismiss, durationMs);
    return () => clearTimeout(timer);
  }, [visible, message, onDismiss, durationMs]);

  if (!visible) return null;

  return (
    <View style={[styles.container, { bottom: insets.bottom + 24 }]} pointerEvents="none">
      <View style={[styles.banner, { backgroundColor: t.card, borderColor: t.border }, t.shadow]}>
        <Text style={[styles.message, { color: t.text }]} numberOfLines={2}>
          {message}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 200,
    alignItems: 'center',
  },
  banner: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    maxWidth: 400,
    width: '100%',
  },
  message: { fontSize: 14, fontWeight: '500', textAlign: 'center' },
});

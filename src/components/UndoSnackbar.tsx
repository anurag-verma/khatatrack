import { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { useTheme } from '../store/theme';

interface UndoSnackbarProps {
  visible: boolean;
  message: string;
  undoLabel: string;
  onUndo: () => void;
  onDismiss: () => void;
}

export default function UndoSnackbar({ visible, message, undoLabel, onUndo, onDismiss }: UndoSnackbarProps) {
  const t = useTheme();

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(onDismiss, 5000);
    return () => clearTimeout(timer);
  }, [visible, onDismiss]);

  if (!visible) return null;

  return (
    <View style={styles.container}>
      <View style={[styles.snackbar, { backgroundColor: t.card, borderColor: t.border }]}>
        <Text style={[styles.message, { color: t.text }]}>{message}</Text>
        <TouchableOpacity onPress={onUndo}>
          <Text style={[styles.undo, { color: t.upiBlue }]}>{undoLabel}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: 'absolute', bottom: 100, left: 16, right: 16, zIndex: 100 },
  snackbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    elevation: 8,
  },
  message: { fontSize: 14, flex: 1 },
  undo: { fontSize: 14, fontWeight: 'bold', marginLeft: 12 },
});

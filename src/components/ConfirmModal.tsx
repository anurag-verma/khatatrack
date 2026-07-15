import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { useTheme } from '../store/theme';

interface ConfirmModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  visible,
  title,
  message,
  confirmText,
  cancelText,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const t = useTheme();

  return (
    <Modal visible={visible} transparent onRequestClose={onCancel} animationType="fade" statusBarTranslucent>
      <View style={[styles.backdrop, { backgroundColor: 'rgba(0,0,0,0.85)' }]}>
        <View style={[styles.container, { backgroundColor: t.card }]}>
          <View style={[styles.iconWrap, { backgroundColor: t.expenseRed + '20' }]}>
            <Text style={styles.icon}>🗑️</Text>
          </View>
          <Text style={[styles.title, { color: t.text }]}>{title}</Text>
          <Text style={[styles.message, { color: t.textSecondary }]}>{message}</Text>
          <View style={styles.buttons}>
            <TouchableOpacity style={[styles.btn, { backgroundColor: t.chipBg }]} onPress={onCancel}>
              <Text style={[styles.cancelText, { color: t.textSecondary }]}>{cancelText}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, { backgroundColor: t.expenseRed }]} onPress={onConfirm}>
              <Text style={styles.destructiveText}>{confirmText}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    borderRadius: 28,
    padding: 28,
    width: '88%',
    maxWidth: 340,
    alignItems: 'center',
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  icon: {
    fontSize: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  btn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
  },
  destructiveText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../../store/theme';

type Props = {
  children: React.ReactNode;
  style?: ViewStyle;
  elevated?: boolean;
};

export default function SectionCard({ children, style, elevated }: Props) {
  const t = useTheme();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: elevated ? t.surfaceElevated : t.card, borderColor: t.border },
        t.shadow,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
});

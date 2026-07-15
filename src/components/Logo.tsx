import { View, StyleSheet, Image, ImageStyle, StyleProp } from 'react-native';
import { useStore } from '../store/useStore';

/** Light-colored artwork for dark app backgrounds */
const logoOnDarkBg = require('../../assets/logo_dark.png');
/** Dark-colored artwork for light app backgrounds */
const logoOnLightBg = require('../../assets/logo_light.png');

const SIZES = {
  small: { width: 56, height: 24 },
  default: { width: 88, height: 38 },
  large: { width: 130, height: 56 },
  footer: { width: 168, height: 72 },
  hero: { width: 240, height: 104 },
} as const;

export type LogoSize = keyof typeof SIZES;

export default function Logo({
  size = 'default',
  style,
  /** Force asset for fixed backgrounds (e.g. splash on #050505) */
  forBackground,
}: {
  size?: LogoSize;
  style?: StyleProp<ImageStyle>;
  forBackground?: 'dark' | 'light';
}) {
  const theme = useStore((s) => s.theme);
  const bg = forBackground ?? theme;
  const source = bg === 'dark' ? logoOnDarkBg : logoOnLightBg;
  const dimensions = SIZES[size];

  return (
    <View style={[styles.container, { width: dimensions.width, height: dimensions.height }]}>
      <Image
        source={source}
        style={[{ width: dimensions.width, height: dimensions.height }, style]}
        resizeMode="contain"
        accessibilityLabel="KhataTrack"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
});

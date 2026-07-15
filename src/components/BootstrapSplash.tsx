import { useRef, useState } from 'react';
import { View, Image, StyleSheet, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const SPLASH_BG = '#050505';
const GRADIENT_COLORS = ['#050505', '#0a1a28', '#050505'] as const;
const fullSplash = require('../../assets/full_splash_screen.png');

/**
 * Phase 1: dark gradient only (native splash hidden here — no icon/dot).
 * Phase 2: full_splash_screen.png fitted with contain (no crop/zoom).
 */
export default function BootstrapSplash({ onReady }: { onReady?: () => void }) {
  const readyCalled = useRef(false);
  const [showArtwork, setShowArtwork] = useState(false);

  const handleRootLayout = () => {
    if (readyCalled.current) return;
    readyCalled.current = true;
    onReady?.();
    requestAnimationFrame(() => setShowArtwork(true));
  };

  return (
    <LinearGradient colors={[...GRADIENT_COLORS]} style={styles.root} onLayout={handleRootLayout}>
      {showArtwork ? (
        <View style={styles.imageFrame}>
          <Image
            source={fullSplash}
            style={styles.splashImage}
            resizeMode="contain"
            accessibilityLabel="KhataTrack"
          />
        </View>
      ) : null}
      <View style={styles.spinnerWrap} pointerEvents="none">
        <ActivityIndicator color="#00baf2" size="large" />
      </View>
    </LinearGradient>
  );
}

export { SPLASH_BG };

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10000,
    elevation: 10000,
  },
  imageFrame: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  splashImage: {
    width: '100%',
    height: '100%',
  },
  spinnerWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 72,
    alignItems: 'center',
  },
});

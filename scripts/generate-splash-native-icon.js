/**
 * Build assets/splash-native-icon.png — square canvas with logo centered
 * so Android 12+ circular splash mask does not clip the wordmark.
 * Run: node scripts/generate-splash-native-icon.js
 */
const fs = require('fs');
const path = require('path');
const {
  generateImageAsync,
  generateImageBackgroundAsync,
  compositeImagesAsync,
} = require('@expo/image-utils');

const CANVAS = 1024;
/** Logo width as fraction of canvas; ~55% stays inside inscribed circle with margin */
const LOGO_WIDTH = Math.round(CANVAS * 0.55);

const projectRoot = path.join(__dirname, '..');
const logoSrc = path.join(projectRoot, 'assets/logo_dark.png');
const outPath = path.join(projectRoot, 'assets/splash-native-icon.png');

(async () => {
  const background = await generateImageBackgroundAsync({
    width: CANVAS,
    height: CANVAS,
    backgroundColor: 'transparent',
    resizeMode: 'cover',
  });

  const { source: foreground, width: fgW, height: fgH } = await generateImageAsync(
    { projectRoot, cacheType: 'splash-native-icon' },
    {
      src: logoSrc,
      resizeMode: 'contain',
      width: LOGO_WIDTH,
    }
  );

  const composed = await compositeImagesAsync({
    background,
    foreground,
    x: Math.round((CANVAS - fgW) / 2),
    y: Math.round((CANVAS - fgH) / 2),
  });

  fs.writeFileSync(outPath, composed);
  console.log(`Wrote ${outPath} (${CANVAS}x${CANVAS}, logo ${LOGO_WIDTH}px wide)`);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});

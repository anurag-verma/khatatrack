/**
 * Background-only native splash: remove icon PNGs, ensure blank transparent icon + styles.
 * Run: node scripts/regen-android-splash.js
 */
const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname, '..');
const androidMain = path.join(projectRoot, 'android', 'app', 'src', 'main');
const drawableDirs = [
  'res/drawable-mdpi',
  'res/drawable-hdpi',
  'res/drawable-xhdpi',
  'res/drawable-xxhdpi',
  'res/drawable-xxxhdpi',
  'res/drawable-night-mdpi',
  'res/drawable-night-hdpi',
  'res/drawable-night-xhdpi',
  'res/drawable-night-xxhdpi',
  'res/drawable-night-xxxhdpi',
];

for (const dir of drawableDirs) {
  const file = path.join(androidMain, dir, 'splashscreen_logo.png');
  if (fs.existsSync(file)) {
    fs.unlinkSync(file);
    console.log('Removed', file);
  }
}

const stylesPath = path.join(androidMain, 'res/values/styles.xml');
const stylesXml = `<resources xmlns:tools="http://schemas.android.com/tools">
  <style name="AppTheme" parent="Theme.AppCompat.DayNight.NoActionBar">
    <item name="android:enforceNavigationBarContrast" tools:targetApi="29">true</item>
    <item name="android:editTextBackground">@drawable/rn_edit_text_material</item>
    <item name="colorPrimary">@color/colorPrimary</item>
    <item name="android:statusBarColor">#050505</item>
  </style>
  <style name="Theme.App.SplashScreen" parent="Theme.SplashScreen">
    <item name="windowSplashScreenBackground">@color/splashscreen_background</item>
    <item name="windowSplashScreenAnimatedIcon">@drawable/splashscreen_icon_blank</item>
    <item name="windowSplashScreenIconBackgroundColor">@color/splashscreen_background</item>
    <item name="postSplashScreenTheme">@style/AppTheme</item>
  </style>
</resources>
`;
fs.writeFileSync(stylesPath, stylesXml);
console.log('Wrote', stylesPath);

const icLauncherBg = path.join(androidMain, 'res/drawable/ic_launcher_background.xml');
fs.writeFileSync(
  icLauncherBg,
  `<layer-list xmlns:android="http://schemas.android.com/apk/res/android">
  <item android:drawable="@color/splashscreen_background"/>
</layer-list>
`
);
console.log('Native splash: gradient/dark only until JS shows full_splash_screen.png (contain).');

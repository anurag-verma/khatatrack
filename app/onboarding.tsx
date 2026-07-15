import { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  Animated,
  Dimensions,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import Logo from '../src/components/Logo';
import { getLocales } from 'expo-localization';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { changeLanguage } from '../src/i18n';
import { useStore } from '../src/store/useStore';
import { useTheme, type Theme } from '../src/store/theme';
import { requestOnboardingPermissions } from '../src/utils/onboardingPermissions';
import {
  Shield,
  MessageSquare,
  Globe,
  ChevronLeft,
  ArrowRight,
  Check,
  Lock,
  WifiOff,
  IndianRupee,
} from 'lucide-react-native';

const { width: W, height: H } = Dimensions.get('window');
const IS_SMALL = H < 700;

const LANGUAGES = [
  { id: 'en' as const, native: 'English', flag: '🇬🇧' },
  { id: 'hi' as const, native: 'हिंदी', flag: '🇮🇳' },
];

type SlideId = 'welcome' | 'offline' | 'sms' | 'language';

const SLIDES: {
  id: SlideId;
  eyebrowKey?: string;
  titleKey?: string;
  descKey?: string;
  bullets?: string[];
  accent: string;
  gradient: [string, string];
}[] = [
  {
    id: 'welcome',
    accent: '#00baf2',
    gradient: ['#00baf240', '#00baf208'],
  },
  {
    id: 'offline',
    eyebrowKey: 'onboardingEyebrow1',
    titleKey: 'onboardingTitle1',
    descKey: 'onboardingDesc1',
    bullets: ['onboardingBullet1a', 'onboardingBullet1b', 'onboardingBullet1c'],
    accent: '#22c55e',
    gradient: ['#22c55e35', '#22c55e08'],
  },
  {
    id: 'sms',
    eyebrowKey: 'onboardingEyebrow2',
    titleKey: 'onboardingTitle2',
    descKey: 'onboardingDesc2',
    bullets: ['onboardingBullet2a', 'onboardingBullet2b', 'onboardingBullet2c'],
    accent: '#8b5cf6',
    gradient: ['#8b5cf640', '#8b5cf608'],
  },
  {
    id: 'language',
    eyebrowKey: 'onboardingEyebrow3',
    titleKey: 'onboardingTitle3',
    descKey: 'onboardingDesc3',
    accent: '#00baf2',
    gradient: ['#00baf230', '#00baf208'],
  },
];

const LAST = SLIDES.length - 1;

function detectDeviceLanguage(): 'en' | 'hi' {
  try {
    const locales = getLocales();
    return locales[0]?.languageCode?.startsWith('hi') ? 'hi' : 'en';
  } catch {
    return 'en';
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StepSegments({
  current,
  total,
  active,
  inactive,
}: {
  current: number;
  total: number;
  active: string;
  inactive: string;
}) {
  return (
    <View style={styles.segments}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.segment,
            { backgroundColor: i <= current ? active : inactive, opacity: i <= current ? 1 : 0.35 },
          ]}
        />
      ))}
    </View>
  );
}

function WelcomeVisual({ theme }: { theme: Theme }) {
  const orbSize = W * 0.72;
  const ringSize = W * 0.58;

  return (
    <View style={styles.visualWrap}>
      <View style={[styles.heroOrb, { width: orbSize, height: orbSize }]}>
        <LinearGradient
          colors={[theme.upiBlue + '35', theme.upiBlue + '08', 'transparent']}
          style={[styles.heroGradient, { width: orbSize, height: orbSize, borderRadius: orbSize / 2 }]}
        />
        <View
          style={[
            styles.heroRing,
            {
              width: ringSize,
              height: ringSize,
              borderRadius: ringSize / 2,
              borderColor: theme.upiBlue + '40',
            },
          ]}
          pointerEvents="none"
        />
        <View style={styles.heroLogoSlot}>
          <Logo size={IS_SMALL ? 'large' : 'hero'} />
        </View>
        <View style={[styles.floatingChip, styles.chipOnOrbLeft, { backgroundColor: theme.card }]}>
          <IndianRupee size={18} color={theme.incomeGreen} strokeWidth={2.5} />
        </View>
        <View style={[styles.floatingChip, styles.chipOnOrbRight, { backgroundColor: theme.card }]}>
          <Shield size={18} color={theme.upiBlue} strokeWidth={2.5} />
        </View>
      </View>
    </View>
  );
}

function OfflineVisual({ theme }: { theme: Theme }) {
  const rows = [
    { icon: Lock, label: 'Encrypted locally', color: theme.incomeGreen },
    { icon: WifiOff, label: 'No internet needed', color: theme.upiBlue },
    { icon: Shield, label: 'Zero cloud upload', color: '#8b5cf6' },
  ];
  return (
    <View style={styles.visualWrap}>
      <View style={[styles.phoneFrame, styles.phoneFrameCompact, { backgroundColor: theme.card }]}>
        <View style={[styles.phoneBar, styles.phoneBarCompact, { backgroundColor: theme.border }]} />
        <View style={styles.phoneBodyCompact}>
          {rows.map((row, i) => (
            <View key={i} style={[styles.phoneRow, styles.phoneRowCompact, { backgroundColor: theme.bg }]}>
              <View style={[styles.phoneRowIcon, styles.phoneRowIconCompact, { backgroundColor: row.color + '18' }]}>
                <row.icon size={14} color={row.color} />
              </View>
              <Text style={[styles.phoneRowText, styles.phoneRowTextCompact, { color: theme.text }]} numberOfLines={1}>
                {row.label}
              </Text>
              <View style={[styles.phoneCheck, styles.phoneCheckCompact, { backgroundColor: theme.incomeGreen }]}>
                <Check size={10} color="#fff" strokeWidth={3} />
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

function SmsVisual({ theme }: { theme: Theme }) {
  const msgs = [
    { bank: 'HDFC Bank', text: 'Rs.499.00 debited', time: '2m ago', color: '#004c8f' },
    { bank: 'PhonePe', text: 'Paid ₹120 to Swiggy', time: '1h ago', color: '#5f259f' },
    { bank: 'SBI', text: 'INR 15,000 credited', time: 'Yesterday', color: '#22409a' },
  ];
  return (
    <View style={styles.smsVisualWrap}>
      <View style={styles.smsStack}>
        {msgs.map((m, i) => (
          <View
            key={m.bank}
            style={[
              styles.smsCard,
              styles.smsCardStacked,
              {
                backgroundColor: theme.card,
                marginTop: i === 0 ? 0 : 8,
                marginLeft: i * 10,
                zIndex: msgs.length - i,
                transform: [{ scale: 1 - i * 0.04 }],
                opacity: 1 - i * 0.1,
              },
            ]}
          >
            <View style={[styles.smsDot, { backgroundColor: m.color }]} />
            <View style={styles.smsBody}>
              <Text style={[styles.smsBank, { color: theme.text }]}>{m.bank}</Text>
              <Text style={[styles.smsText, { color: theme.textSecondary }]} numberOfLines={1}>
                {m.text}
              </Text>
            </View>
            <Text style={[styles.smsTime, { color: theme.textMuted }]}>{m.time}</Text>
          </View>
        ))}
      </View>
      <View style={[styles.smsBadge, { backgroundColor: theme.upiBlue }]}>
        <MessageSquare size={12} color="#fff" />
        <Text style={styles.smsBadgeText}>Auto-scan</Text>
      </View>
    </View>
  );
}

function LanguageVisual({ theme }: { theme: Theme }) {
  const glow = W * (IS_SMALL ? 0.34 : 0.38);
  const globe = W * (IS_SMALL ? 0.28 : 0.32);
  return (
    <View style={styles.visualWrap}>
      <View
        style={[
          styles.langGlow,
          { width: glow, height: glow, borderRadius: glow / 2, backgroundColor: theme.incomeGreen + '22' },
        ]}
      >
        <View
          style={[
            styles.langGlobe,
            { width: globe, height: globe, borderRadius: globe / 2, backgroundColor: theme.card },
          ]}
        >
          <Globe size={IS_SMALL ? 56 : 68} color={theme.incomeGreen} strokeWidth={2} />
        </View>
      </View>
    </View>
  );
}

function SlideVisual({ id, theme }: { id: SlideId; theme: Theme }) {
  switch (id) {
    case 'welcome':
      return <WelcomeVisual theme={theme} />;
    case 'offline':
      return <OfflineVisual theme={theme} />;
    case 'sms':
      return <SmsVisual theme={theme} />;
    case 'language':
      return <LanguageVisual theme={theme} />;
  }
}

function BulletList({
  items,
  theme,
  tr,
  compact,
}: {
  items: string[];
  theme: Theme;
  tr: (k: string) => string;
  compact?: boolean;
}) {
  return (
    <View style={[styles.bulletList, compact && styles.bulletListCompact]}>
      {items.map((key) => (
        <View key={key} style={styles.bulletRow}>
          <View style={[styles.bulletIcon, { backgroundColor: theme.upiBlue + '18' }]}>
            <Check size={14} color={theme.upiBlue} strokeWidth={2.5} />
          </View>
          <Text style={[styles.bulletText, { color: theme.textSecondary }]}>{tr(key)}</Text>
        </View>
      ))}
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function Onboarding() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t: tr } = useTranslation();
  const setLanguage = useStore((s) => s.setLanguage);
  const isDark = useStore((s) => s.theme) === 'dark';

  const [selected, setSelected] = useState<'en' | 'hi'>(detectDeviceLanguage());
  const [slide, setSlide] = useState(0);
  const [saving, setSaving] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [permissionsRequested, setPermissionsRequested] = useState(false);

  const slideOpacities = useRef(SLIDES.map((_, i) => new Animated.Value(i === 0 ? 1 : 0))).current;
  const contentOpacity = useRef(new Animated.Value(1)).current;
  const isAnimating = useRef(false);

  const current = SLIDES[slide];
  /** Match welcome step hero slot so steps 2–4 align vertically with step 1 */
  const HERO_HEIGHT = IS_SMALL ? H * 0.34 : H * 0.38;
  const isWelcome = current.id === 'welcome';
  const isOffline = current.id === 'offline';
  const isSms = current.id === 'sms';
  const isLanguage = current.id === 'language';
  const isLast = slide === LAST;

  const transitionTo = useCallback(
    (next: number) => {
      if (isAnimating.current || next === slide) return;
      isAnimating.current = true;
      setAnimating(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      Animated.parallel([
        Animated.timing(slideOpacities[slide], { toValue: 0, duration: 160, useNativeDriver: true }),
        Animated.timing(slideOpacities[next], { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.timing(contentOpacity, { toValue: 0, duration: 120, useNativeDriver: true }),
      ]).start(({ finished }) => {
        if (!finished) {
          isAnimating.current = false;
          setAnimating(false);
          return;
        }
        setSlide(next);
        Animated.timing(contentOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start(() => {
          isAnimating.current = false;
          setAnimating(false);
        });
      });
    },
    [slide, slideOpacities, contentOpacity],
  );

  const requestPermissions = useCallback(async () => {
    if (permissionsRequested) return;
    setPermissionsRequested(true);
    const { smsGranted, notificationsGranted } = await requestOnboardingPermissions();
    if (Platform.OS === 'android' && !smsGranted) {
      Alert.alert(tr('smsPermission'), tr('smsPermissionDeniedDesc'));
    }
    if (!notificationsGranted && Platform.OS === 'android') {
      Alert.alert(tr('notificationPermission'), tr('notificationPermissionDesc'));
    }
  }, [permissionsRequested, tr]);

  const finish = async () => {
    setSaving(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      if (!permissionsRequested) {
        await requestPermissions();
      }
      await Promise.all([
        AsyncStorage.setItem('language', selected),
        AsyncStorage.setItem('onboarded', 'true'),
      ]);
      await changeLanguage(selected);
      setLanguage(selected);
      useStore.setState({ onboarded: true });
      router.replace('/(tabs)');
    } catch (e) {
      console.error(e);
      setSaving(false);
    }
  };

  const onPrimary = async () => {
    if (isSms && !permissionsRequested) {
      await requestPermissions();
    }
    if (!isLast) transitionTo(slide + 1);
    else void finish();
  };

  const renderContent = () => {
    if (isWelcome) {
      const chips: { key: string; color: string }[] = [
        { key: 'badgeFree', color: theme.incomeGreen },
        { key: 'badgeOffline', color: theme.upiBlue },
        { key: 'badgePrivate', color: '#8b5cf6' },
      ];
      return (
        <View style={styles.welcomeCopy}>
          <Text style={[styles.welcomeEyebrow, { color: theme.upiBlue }]}>{tr('onboardingWelcomeEyebrow')}</Text>
          <Text style={[styles.welcomeTitle, { color: theme.text }]}>{tr('onboardingWelcomeTitle')}</Text>
          <Text style={[styles.welcomeDesc, { color: theme.textSecondary }]}>{tr('onboardingWelcomeDesc')}</Text>
          <View style={styles.welcomeChips}>
            {chips.map(({ key, color }) => (
              <View key={key} style={[styles.welcomeChip, { backgroundColor: color + '18' }]}>
                <Text style={[styles.welcomeChipText, { color }]}>{tr(key)}</Text>
              </View>
            ))}
          </View>
        </View>
      );
    }

    if (isLanguage) {
      return (
        <View style={styles.langSection}>
          {current.eyebrowKey && (
            <Text style={[styles.eyebrow, styles.langEyebrow, { color: current.accent }]}>{tr(current.eyebrowKey)}</Text>
          )}
          {current.titleKey && (
            <Text style={[styles.title, styles.langTitle, { color: theme.text }]}>{tr(current.titleKey)}</Text>
          )}
          {current.descKey && (
            <Text style={[styles.desc, styles.langDesc, { color: theme.textSecondary }]}>{tr(current.descKey)}</Text>
          )}
          <View style={styles.langList}>
            {LANGUAGES.map((lang) => {
              const active = selected === lang.id;
              return (
                <TouchableOpacity
                  key={lang.id}
                  activeOpacity={0.88}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setSelected(lang.id);
                  }}
                  style={[
                    styles.langCard,
                    {
                      backgroundColor: active ? theme.upiBlue + '14' : theme.card,
                      borderColor: active ? theme.upiBlue : theme.border,
                    },
                  ]}
                >
                  <Text style={styles.langFlag}>{lang.flag}</Text>
                  <View style={styles.langInfo}>
                    <Text style={[styles.langNative, { color: theme.text }]}>{lang.native}</Text>
                    <Text style={[styles.langSub, { color: theme.textMuted }]}>
                      {lang.id === 'en' ? tr('english') : tr('hindi')}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.radio,
                      { borderColor: active ? theme.upiBlue : theme.border },
                      active && { backgroundColor: theme.upiBlue, borderColor: theme.upiBlue },
                    ]}
                  >
                    {active && <View style={styles.radioDot} />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={[styles.privacyHint, { color: theme.textMuted }]}>{tr('privacyNote')}</Text>
        </View>
      );
    }

    return (
      <View style={styles.featureCopy}>
        {current.eyebrowKey && (
          <Text style={[styles.eyebrow, isOffline && styles.featureEyebrow, { color: current.accent }]}>
            {tr(current.eyebrowKey)}
          </Text>
        )}
        {current.titleKey && (
          <Text style={[styles.title, isOffline && styles.featureTitle, { color: theme.text }]}>
            {tr(current.titleKey)}
          </Text>
        )}
        {current.descKey && (
          <Text style={[styles.desc, isOffline && styles.featureDesc, { color: theme.textSecondary }]}>
            {tr(current.descKey)}
          </Text>
        )}
        {current.bullets && (
          <BulletList items={current.bullets} theme={theme} tr={tr} compact={isOffline} />
        )}
        {isSms && (
          <TouchableOpacity
            onPress={() => void requestPermissions()}
            style={[styles.permissionBtn, { borderColor: theme.upiBlue }]}
            activeOpacity={0.85}
          >
            <Text style={[styles.permissionBtnText, { color: theme.upiBlue }]}>
              {permissionsRequested ? tr('permissionsRequested') : tr('allowPermissions')}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const ctaLabel = isLast ? tr('getStarted') : isWelcome ? tr('continue') : tr('next');

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      <LinearGradient
        colors={isDark ? [current.gradient[0], 'transparent'] : [current.gradient[0], theme.bg]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.55 }}
        pointerEvents="none"
      />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === 'android' ? 8 : 4) }]}>
        <StepSegments
          current={slide}
          total={SLIDES.length}
          active={theme.upiBlue}
          inactive={theme.border}
        />
        {!isLast && (
          <TouchableOpacity
            onPress={() => transitionTo(LAST)}
            hitSlop={14}
            style={styles.skipBtn}
          >
            <Text style={[styles.skipLabel, { color: theme.textMuted }]}>{tr('skip')}</Text>
          </TouchableOpacity>
        )}
      </View>

      <Text style={[styles.stepCounter, { color: theme.textMuted }]}>
        {tr('stepOf', { current: slide + 1, total: SLIDES.length })}
      </Text>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollInner}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Hero visual */}
        <View style={[styles.heroStack, { height: HERO_HEIGHT }]}>
          {SLIDES.map((s, i) => (
            <Animated.View
              key={s.id}
              pointerEvents={slide === i ? 'auto' : 'none'}
              style={[styles.heroSlideLayer, { opacity: slideOpacities[i] }]}
            >
              <SlideVisual id={s.id} theme={theme} />
            </Animated.View>
          ))}
        </View>

        {/* Copy */}
        <Animated.View style={[styles.copyZone, { opacity: contentOpacity }]}>
          {renderContent()}
        </Animated.View>
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.footerDots}>
          {SLIDES.map((s, i) => (
            <View
              key={s.id}
              style={[
                styles.footerDot,
                {
                  width: i === slide ? 22 : 6,
                  backgroundColor: i === slide ? theme.upiBlue : theme.border,
                  opacity: i === slide ? 1 : 0.4,
                },
              ]}
            />
          ))}
        </View>

        <View style={styles.footerRow}>
          {slide > 0 && (
            <TouchableOpacity
              onPress={() => transitionTo(slide - 1)}
              disabled={animating}
              style={[styles.backBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
              activeOpacity={0.8}
            >
              <ChevronLeft size={22} color={theme.text} />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={onPrimary}
            disabled={saving || animating}
            activeOpacity={0.92}
            style={[styles.ctaOuter, slide === 0 && { flex: 1 }]}
          >
            <LinearGradient
              colors={[theme.upiBlue, '#0088b8']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.cta}
            >
              {saving ? (
                <View style={styles.ctaLoadingRow}>
                  <ActivityIndicator color="#fff" size="small" />
                  <Text style={styles.ctaLabel}>{tr('saving')}</Text>
                </View>
              ) : (
                <>
                  <Text style={styles.ctaLabel}>{ctaLabel}</Text>
                  <ArrowRight size={20} color="#fff" strokeWidth={2.5} />
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 4,
    gap: 16,
  },
  segments: { flex: 1, flexDirection: 'row', gap: 5 },
  segment: { flex: 1, height: 3, borderRadius: 2 },
  skipBtn: { paddingVertical: 4, paddingHorizontal: 2 },
  skipLabel: { fontSize: 14, fontWeight: '600' },
  stepCounter: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.4,
    paddingHorizontal: 24,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  scroll: { flex: 1 },
  scrollInner: { flexGrow: 1, paddingBottom: 12 },
  heroStack: {
    width: '100%',
    marginBottom: 4,
    paddingHorizontal: 28,
  },
  heroSlideLayer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  visualWrap: { width: '100%', alignItems: 'center', justifyContent: 'center' },
  heroOrb: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroGradient: {
    position: 'absolute',
    zIndex: 0,
  },
  heroRing: {
    position: 'absolute',
    borderWidth: 1.5,
    backgroundColor: 'transparent',
    zIndex: 1,
  },
  heroLogoSlot: {
    zIndex: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingChip: {
    position: 'absolute',
    zIndex: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 12,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 6 },
      android: { elevation: 4 },
    }),
  },
  chipOnOrbLeft: { left: -10, top: '14%' },
  chipOnOrbRight: { right: -10, bottom: '18%' },
  chipText: { fontSize: 13, fontWeight: '700' },
  phoneFrame: {
    width: W * 0.62,
    borderRadius: 28,
    overflow: 'hidden',
  },
  phoneFrameCompact: {
    width: W * 0.52,
    borderRadius: 22,
  },
  phoneBar: { height: 28, width: '40%', alignSelf: 'center', marginTop: 12, borderRadius: 12 },
  phoneBarCompact: { height: 18, marginTop: 6, borderRadius: 10 },
  phoneBody: { padding: 16, gap: 10 },
  phoneBodyCompact: { padding: 10, gap: 6 },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    gap: 10,
  },
  phoneRowCompact: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 12, gap: 8 },
  phoneRowIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  phoneRowIconCompact: { width: 28, height: 28, borderRadius: 8 },
  phoneRowText: { flex: 1, fontSize: 13, fontWeight: '600' },
  phoneRowTextCompact: { fontSize: 12 },
  phoneCheck: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  phoneCheckCompact: { width: 18, height: 18, borderRadius: 9 },
  smsVisualWrap: { width: '100%', alignItems: 'center', overflow: 'visible' },
  smsStack: { width: W * 0.72, alignItems: 'flex-start', marginBottom: 10 },
  smsCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    gap: 10,
  },
  smsCardStacked: { alignSelf: 'flex-start' },
  smsDot: { width: 10, height: 10, borderRadius: 5 },
  smsBody: { flex: 1 },
  smsBank: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  smsText: { fontSize: 12 },
  smsTime: { fontSize: 11 },
  smsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  smsBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  langGlow: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  langGlobe: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  copyZone: { paddingHorizontal: 28, paddingTop: 8 },
  welcomeCopy: { alignItems: 'center', width: '100%' },
  welcomeEyebrow: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.8,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  welcomeTitle: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.8,
    textAlign: 'center',
    lineHeight: 38,
    marginBottom: 14,
  },
  welcomeDesc: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 23,
    maxWidth: 300,
    marginBottom: 22,
    fontWeight: '500',
  },
  welcomeChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  welcomeChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
  welcomeChipText: { fontSize: 12, fontWeight: '700' },
  featureCopy: { width: '100%' },
  eyebrow: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.6,
    lineHeight: 32,
    marginBottom: 10,
  },
  desc: { fontSize: 15, lineHeight: 23, marginBottom: 20 },
  featureEyebrow: { marginBottom: 6 },
  featureTitle: { fontSize: 24, lineHeight: 30, marginBottom: 8 },
  featureDesc: { marginBottom: 12, lineHeight: 22 },
  bulletList: { gap: 12 },
  bulletListCompact: { gap: 8 },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  bulletIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  bulletText: { flex: 1, fontSize: 14, lineHeight: 21, fontWeight: '500' },
  permissionBtn: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    alignSelf: 'flex-start',
  },
  permissionBtnText: { fontSize: 14, fontWeight: '700' },
  langSection: { width: '100%' },
  langEyebrow: { marginBottom: 4 },
  langTitle: { fontSize: 24, lineHeight: 30, marginBottom: 6 },
  langDesc: { marginBottom: 10, lineHeight: 21 },
  langList: { gap: 8, marginTop: 0, marginBottom: 6 },
  langCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  langFlag: { fontSize: 30, marginRight: 14 },
  langInfo: { flex: 1 },
  langNative: { fontSize: 18, fontWeight: '700' },
  langSub: { fontSize: 13, marginTop: 2 },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#fff' },
  privacyHint: { fontSize: 12, textAlign: 'center', lineHeight: 16, marginTop: 2 },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 8,
    gap: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(128,128,128,0.2)',
  },
  footerDots: { flexDirection: 'row', justifyContent: 'center', gap: 5, alignItems: 'center' },
  footerDot: { height: 6, borderRadius: 3 },
  footerRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  backBtn: {
    width: 56,
    height: 56,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaOuter: { flex: 1 },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 17,
    borderRadius: 18,
    minHeight: 56,
  },
  ctaLabel: { color: '#fff', fontSize: 17, fontWeight: '700', letterSpacing: 0.2 },
  ctaLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
});

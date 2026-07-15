export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

export const typography = {
  title: { fontSize: 20, fontWeight: '700' as const },
  headline: { fontSize: 18, fontWeight: '700' as const },
  body: { fontSize: 15, fontWeight: '400' as const },
  bodySemibold: { fontSize: 15, fontWeight: '600' as const },
  caption: { fontSize: 12, fontWeight: '500' as const },
  amount: { fontSize: 15, fontWeight: '700' as const, fontVariant: ['tabular-nums'] as const },
  amountLarge: { fontSize: 36, fontWeight: '700' as const, fontVariant: ['tabular-nums'] as const },
} as const;

export const TAB_BAR_HEIGHT = 88;

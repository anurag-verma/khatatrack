import React, { createContext, useContext } from 'react';
import { useStore } from './useStore';
import { spacing, radii, typography } from '../theme/tokens';

const baseTokens = { spacing, radii, typography };

export const lightTheme = {
  ...baseTokens,
  isDark: false,
  bg: '#f5f5f5',
  card: '#ffffff',
  surface: '#ffffff',
  surfaceElevated: '#ffffff',
  inputBg: '#e5e7eb',
  chipBg: '#e5e7eb',
  text: '#111111',
  textSecondary: '#6b7280',
  textMuted: '#9ca3af',
  upiBlue: '#00baf2',
  incomeGreen: '#22c55e',
  expenseRed: '#ef4444',
  border: '#e5e7eb',
  danger: '#ef4444',
  success: '#22c55e',
  shadow: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
};

export const darkTheme = {
  ...baseTokens,
  isDark: true,
  bg: '#050505',
  card: '#121212',
  surface: '#121212',
  surfaceElevated: '#1a1a1a',
  inputBg: '#1a1a1a',
  chipBg: '#1a1a1a',
  text: '#ffffff',
  textSecondary: '#9ca3af',
  textMuted: '#6b7280',
  upiBlue: '#00baf2',
  incomeGreen: '#22c55e',
  expenseRed: '#ef4444',
  border: '#1f1f1f',
  danger: '#ef4444',
  success: '#22c55e',
  shadow: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
};

export type Theme = typeof darkTheme;

const ThemeContext = createContext<Theme>(darkTheme);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const themeName = useStore((s) => s.theme);
  const currentTheme = themeName === 'light' ? lightTheme : darkTheme;
  return <ThemeContext.Provider value={currentTheme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}

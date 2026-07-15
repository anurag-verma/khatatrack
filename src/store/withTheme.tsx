import React from 'react';
import { useTheme } from './theme';

export function withTheme<P extends object>(
  Component: React.ComponentType<P>
): React.FC<P> {
  return function ThemedComponent(props: P) {
    const theme = useTheme();
    return <Component {...props} theme={theme} />;
  } as React.FC<P>;
}

export function getThemedStyle<P extends object>(
  darkStyle: P,
  lightStyle: P
): (theme: ReturnType<typeof useTheme>) => P {
  return (theme) => {
    const isDark = theme.isDark;
    return isDark ? darkStyle : lightStyle;
  };
}
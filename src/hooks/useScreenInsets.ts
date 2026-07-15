import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TAB_BAR_HEIGHT } from '../theme/tokens';

export function useScreenInsets() {
  const insets = useSafeAreaInsets();
  return {
    insets,
    top: insets.top,
    bottom: insets.bottom,
    tabContentPadding: insets.bottom + TAB_BAR_HEIGHT,
    modalContentPadding: insets.bottom + 24,
  };
}

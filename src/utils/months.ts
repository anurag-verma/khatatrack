import { TFunction } from 'i18next';

export function getMonthLabels(t: TFunction, lang: 'en' | 'hi'): string[] {
  return Array.from({ length: 12 }, (_, i) => t(`months.${i}`));
}

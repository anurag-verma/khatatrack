export type AnalyticsPeriod = 'month' | 'lastMonth' | '3months' | 'all' | 'custom';

export type AnalyticsRange = {
  start?: string;
  end?: string;
  month?: string;
  startMonth?: string;
  endMonth?: string;
  showBudgets?: boolean;
};

export type CustomDateRange = {
  start: Date;
  end: Date;
};

export function currentMonthKey(): string {
  return monthKeyFromDate(new Date());
}

export function lastMonthKey(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return monthKeyFromDate(d);
}

export function threeMonthSpan(): { startMonth: string; endMonth: string } {
  const endMonth = currentMonthKey();
  const d = new Date();
  d.setMonth(d.getMonth() - 2);
  return { startMonth: monthKeyFromDate(d), endMonth };
}

export function monthKeyFromDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function monthBounds(month: string): { start: string; end: string } {
  const [year, mon] = month.split('-').map(Number);
  return {
    start: new Date(year, mon - 1, 1).toISOString(),
    end: new Date(year, mon, 1).toISOString(),
  };
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endExclusive(endDate: Date): string {
  const x = startOfDay(endDate);
  x.setDate(x.getDate() + 1);
  return x.toISOString();
}

export function normalizeCustomRange(start: Date, end: Date): CustomDateRange {
  const a = startOfDay(start);
  const b = startOfDay(end);
  if (a.getTime() <= b.getTime()) return { start: a, end: b };
  return { start: b, end: a };
}

export function defaultCustomRange(): CustomDateRange {
  const end = startOfDay(new Date());
  const start = new Date(end);
  start.setDate(start.getDate() - 29);
  return { start, end };
}

export function formatMonthLabel(monthKey: string, locale: string): string {
  const [year, mon] = monthKey.split('-').map(Number);
  return new Date(year, mon - 1, 1).toLocaleDateString(locale, { month: 'long', year: 'numeric' });
}

export function formatThreeMonthChipLabel(locale: string): string {
  const { startMonth, endMonth } = threeMonthSpan();
  const [y1, m1] = startMonth.split('-').map(Number);
  const [y2, m2] = endMonth.split('-').map(Number);
  const startShort = new Date(y1, m1 - 1, 1).toLocaleDateString(locale, { month: 'short' });
  const endPart = new Date(y2, m2 - 1, 1).toLocaleDateString(locale, {
    month: 'short',
    year: y1 === y2 ? 'numeric' : 'numeric',
  });
  return `${startShort}–${endPart}`;
}

export function getPeriodRangeLabel(
  period: AnalyticsPeriod,
  locale: string,
  labels: { allTime: string; custom: string },
  custom?: CustomDateRange,
): string {
  switch (period) {
    case 'month':
      return formatMonthLabel(currentMonthKey(), locale);
    case 'lastMonth':
      return formatMonthLabel(lastMonthKey(), locale);
    case '3months':
      return formatThreeMonthChipLabel(locale);
    case 'all':
      return labels.allTime;
    case 'custom':
      return custom
        ? formatCustomRangeLabel(custom.start, custom.end, locale)
        : labels.custom;
    default:
      return labels.allTime;
  }
}

export function getAnalyticsRange(period: AnalyticsPeriod, custom?: CustomDateRange): AnalyticsRange {
  switch (period) {
    case 'all':
      return {};
    case 'month': {
      const month = currentMonthKey();
      const bounds = monthBounds(month);
      return { ...bounds, month, showBudgets: true };
    }
    case 'lastMonth': {
      const month = lastMonthKey();
      const bounds = monthBounds(month);
      return { ...bounds, month, showBudgets: true };
    }
    case '3months': {
      const { startMonth, endMonth } = threeMonthSpan();
      return { startMonth, endMonth };
    }
    case 'custom': {
      if (!custom) return {};
      const { start, end } = normalizeCustomRange(custom.start, custom.end);
      return {
        start: start.toISOString(),
        end: endExclusive(end),
      };
    }
    default:
      return {};
  }
}

export function filterMonthlyBarDataByRange<T extends { month: string }>(
  data: T[],
  range: AnalyticsRange,
): T[] {
  if (range.startMonth && range.endMonth) {
    return data.filter((m) => m.month >= range.startMonth! && m.month <= range.endMonth!);
  }
  if (!range.start || !range.end) return data;

  const rangeStart = new Date(range.start).getTime();
  const rangeEnd = new Date(range.end).getTime() - 1;

  return data.filter((m) => {
    const [y, mon] = m.month.split('-').map(Number);
    const monthStart = new Date(y, mon - 1, 1).getTime();
    const monthEnd = new Date(y, mon, 1).getTime() - 1;
    return monthEnd >= rangeStart && monthStart <= rangeEnd;
  });
}

export function formatCustomRangeLabel(start: Date, end: Date, locale: string): string {
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };
  const fmt = (d: Date) => d.toLocaleDateString(locale, opts);
  const { start: a, end: b } = normalizeCustomRange(start, end);
  return `${fmt(a)} – ${fmt(b)}`;
}

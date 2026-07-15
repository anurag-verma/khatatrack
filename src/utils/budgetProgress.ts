export type BudgetProgress = {
  pct: number;
  over: boolean;
  left: number;
  barColor: string;
};

export function computeBudgetProgress(
  used: number,
  budget: number,
  colors: { green: string; amber: string; red: string },
): BudgetProgress {
  const pct = budget > 0 ? Math.min((used / budget) * 100, 100) : 0;
  const over = used > budget;
  const left = Math.max(budget - used, 0);
  const barColor = over ? colors.red : pct > 80 ? colors.amber : colors.green;
  return { pct, over, left, barColor };
}

/** Higher = more urgent (over budget first, then highest % used). */
export function budgetUrgencyScore(used: number, budget: number): number {
  if (budget <= 0) return 0;
  const ratio = used / budget;
  return ratio >= 1 ? 1000 + ratio : ratio;
}

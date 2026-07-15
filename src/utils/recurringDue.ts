/** Days until next occurrence of day_of_month (1–28). */
export function daysUntilDue(dayOfMonth: number, from: Date = new Date()): number {
  const today = from.getDate();
  const thisMonth = new Date(from.getFullYear(), from.getMonth(), dayOfMonth);
  thisMonth.setHours(0, 0, 0, 0);
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  start.setHours(0, 0, 0, 0);

  let due = thisMonth;
  if (today > dayOfMonth) {
    due = new Date(from.getFullYear(), from.getMonth() + 1, dayOfMonth);
    due.setHours(0, 0, 0, 0);
  }

  return Math.round((due.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
}

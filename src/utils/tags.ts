import { Transaction } from '../types';

/** Normalize user input to a canonical tag like `#GoaTrip`. */
export function normalizeTag(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const body = (trimmed.startsWith('#') ? trimmed.slice(1) : trimmed).trim();
  if (!body) return null;
  return `#${body}`;
}

export function formatTagLabel(tag: string): string {
  return tag.startsWith('#') ? tag : `#${tag}`;
}

export function tagsMatch(a: string, b: string): boolean {
  const na = normalizeTag(a);
  const nb = normalizeTag(b);
  return na !== null && na === nb;
}

/** Add pending input as a tag if valid; returns updated list and cleared input. */
export function commitPendingTag(
  tags: string[],
  pending: string,
): { tags: string[]; pending: string } {
  const tag = normalizeTag(pending);
  if (!tag) return { tags, pending: '' };
  if (tags.some((t) => tagsMatch(t, tag))) return { tags, pending: '' };
  return { tags: [...tags, tag], pending: '' };
}

/** Merge any uncommitted tag input before save. */
export function finalizeTags(tags: string[], pending: string): string[] {
  return commitPendingTag(tags, pending).tags;
}

export function getAllTagsFromTransactions(transactions: Transaction[]): string[] {
  const set = new Set<string>();
  for (const txn of transactions) {
    for (const tag of txn.tags) {
      const n = normalizeTag(tag);
      if (n) set.add(n);
    }
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

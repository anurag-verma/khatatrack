import { useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useStore } from '../src/store/useStore';

/** Deep-link / legacy route: opens the transaction sheet and returns to tabs. */
export default function AddTransactionRedirect() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const openTransactionSheet = useStore((s) => s.openTransactionSheet);

  useEffect(() => {
    const editId = id ? parseInt(id, 10) : undefined;
    openTransactionSheet(editId && !Number.isNaN(editId) ? editId : undefined);
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  }, [id, openTransactionSheet, router]);

  return null;
}

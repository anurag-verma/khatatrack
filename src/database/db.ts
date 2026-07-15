import * as SQLite from 'expo-sqlite';
import { Transaction, TransactionInput, Budget, RecurringReminder, SplitGroup, SplitMember } from '../types';
import { normalizeTag } from '../utils/tags';

let db: SQLite.SQLiteDatabase | null = null;
let readyPromise: Promise<SQLite.SQLiteDatabase> | null = null;

function sqlBind(value: string | number | null | undefined): string | number | null {
  if (value === undefined || value === null) return null;
  return value;
}

async function resetConnection(): Promise<void> {
  if (db) {
    try {
      await db.closeAsync();
    } catch {
      /* already closed */
    }
  }
  db = null;
  readyPromise = null;
}

async function openAndMigrate(): Promise<SQLite.SQLiteDatabase> {
  const database = await SQLite.openDatabaseAsync('khatatrack.db');
  db = database;
  await runSchemaMigrations(database);
  return database;
}

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!readyPromise) {
    readyPromise = openAndMigrate();
  }
  try {
    return await readyPromise;
  } catch (err) {
    await resetConnection();
    readyPromise = openAndMigrate();
    return readyPromise;
  }
}

/** Runs a DB operation; reconnects and retries once if the native handle was invalid. */
async function withDb<T>(fn: (database: SQLite.SQLiteDatabase) => Promise<T>): Promise<T> {
  try {
    return await fn(await getDb());
  } catch (err) {
    await resetConnection();
    return await fn(await getDb());
  }
}

async function tableHasColumn(
  database: SQLite.SQLiteDatabase,
  table: string,
  column: string
): Promise<boolean> {
  const cols = await database.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`);
  return cols.some((c) => c.name === column);
}

async function migrateTransactionsTable(database: SQLite.SQLiteDatabase): Promise<void> {
  if (!(await tableHasColumn(database, 'transactions', 'sms_hash'))) {
    await database.execAsync(`ALTER TABLE transactions ADD COLUMN sms_hash TEXT DEFAULT NULL`);
  }
}

async function runSchemaMigrations(database: SQLite.SQLiteDatabase): Promise<void> {
  // Base tables (works for fresh install and upgrades from older schema)
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      amount REAL NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
      category TEXT NOT NULL DEFAULT 'other',
      payment_mode TEXT NOT NULL DEFAULT 'UPI' CHECK(payment_mode IN ('UPI', 'Cash', 'Bank', 'Credit Card')),
      note TEXT DEFAULT '',
      tags TEXT DEFAULT '[]',
      date TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS budgets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL DEFAULT 'all',
      amount REAL NOT NULL,
      month TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS recurring_reminders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      amount REAL NOT NULL,
      type TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'other',
      payment_mode TEXT NOT NULL DEFAULT 'UPI',
      day_of_month INTEGER NOT NULL DEFAULT 1,
      enabled INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS split_groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      total_amount REAL NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS split_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      share_amount REAL NOT NULL,
      paid INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (group_id) REFERENCES split_groups(id) ON DELETE CASCADE
    );
  `);

  await migrateTransactionsTable(database);

  await database.execAsync(`
    CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
    CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
    CREATE INDEX IF NOT EXISTS idx_transactions_payment_mode ON transactions(payment_mode);
  `);

  try {
    await database.execAsync(
      `CREATE INDEX IF NOT EXISTS idx_transactions_sms_hash ON transactions(sms_hash)`,
    );
  } catch {
    await migrateTransactionsTable(database);
    await database.execAsync(
      `CREATE INDEX IF NOT EXISTS idx_transactions_sms_hash ON transactions(sms_hash)`,
    );
  }
}

export async function initDatabase(): Promise<void> {
  await getDb();
}

export async function getAllTransactions(): Promise<Transaction[]> {
  return withDb(async (database) => {
  const rows = await database.getAllAsync<{
    id: number;
    amount: number;
    type: string;
    category: string;
    payment_mode: string;
    note: string;
    tags: string;
    date: string;
    sms_hash: string | null;
  }>('SELECT * FROM transactions ORDER BY date DESC, id DESC');
  return rows.map(mapRow);
  });
}

export async function getTransactionById(id: number): Promise<Transaction | null> {
  return withDb(async (database) => {
  const row = await database.getFirstAsync<{
    id: number;
    amount: number;
    type: string;
    category: string;
    payment_mode: string;
    note: string;
    tags: string;
    date: string;
    sms_hash: string | null;
  }>('SELECT * FROM transactions WHERE id = ?', [id]);
  return row ? mapRow(row) : null;
  });
}

export async function addTransaction(input: TransactionInput): Promise<number> {
  return withDb(async (database) => {
    const result = await database.runAsync(
      `INSERT INTO transactions (amount, type, category, payment_mode, note, tags, date, sms_hash)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        Number(input.amount),
        String(input.type),
        String(input.category),
        String(input.payment_mode),
        String(input.note ?? ''),
        JSON.stringify(input.tags ?? []),
        String(input.date),
        sqlBind(input.sms_hash),
      ],
    );
    return result.lastInsertRowId;
  });
}

export async function updateTransaction(id: number, input: TransactionInput): Promise<void> {
  return withDb(async (database) => {
    await database.runAsync(
      `UPDATE transactions SET amount=?, type=?, category=?, payment_mode=?, note=?, tags=?, date=?, sms_hash=?
       WHERE id=?`,
      [
        Number(input.amount),
        String(input.type),
        String(input.category),
        String(input.payment_mode),
        String(input.note ?? ''),
        JSON.stringify(input.tags ?? []),
        String(input.date),
        sqlBind(input.sms_hash),
        Number(id),
      ],
    );
  });
}

export async function deleteTransaction(id: number): Promise<void> {
  return withDb(async (database) => {
    await database.runAsync('DELETE FROM transactions WHERE id = ?', [Number(id)]);
  });
}

export async function getSmsHashes(): Promise<Set<string>> {
  const database = await getDb();
  const rows = await database.getAllAsync<{ sms_hash: string }>(
    `SELECT sms_hash FROM transactions WHERE sms_hash IS NOT NULL`
  );
  return new Set(rows.map((r) => r.sms_hash).filter(Boolean));
}

export async function getBalanceSummary(): Promise<{
  available: number;
  totalSpent: number;
  totalIncome: number;
  thisMonthSpent: number;
  thisMonthIncome: number;
}> {
  const database = await getDb();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const income = await database.getFirstAsync<{ total: number }>(
    `SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'income'`
  );
  const expense = await database.getFirstAsync<{ total: number }>(
    `SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'expense'`
  );
  const monthIncome = await database.getFirstAsync<{ total: number }>(
    `SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'income' AND date >= ?`,
    [monthStart]
  );
  const monthExpense = await database.getFirstAsync<{ total: number }>(
    `SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'expense' AND date >= ?`,
    [monthStart]
  );

  const totalIncome = income?.total || 0;
  const totalSpent = expense?.total || 0;

  return {
    available: totalIncome - totalSpent,
    totalSpent,
    totalIncome,
    thisMonthSpent: monthExpense?.total || 0,
    thisMonthIncome: monthIncome?.total || 0,
  };
}

export async function getExpenseByCategory(): Promise<{ category: string; total: number }[]> {
  const database = await getDb();
  return database.getAllAsync<{ category: string; total: number }>(
    `SELECT category, COALESCE(SUM(amount), 0) as total
     FROM transactions WHERE type = 'expense'
     GROUP BY category ORDER BY total DESC`
  );
}

function monthRange(month: string): { start: string; end: string } {
  const [year, mon] = month.split('-').map(Number);
  const start = new Date(year, mon - 1, 1).toISOString();
  const end = new Date(year, mon, 1).toISOString();
  return { start, end };
}

const MONTH_LOCAL = "strftime('%Y-%m', date, 'localtime')";

export async function getExpenseByCategoryForMonth(
  month: string,
): Promise<{ category: string; total: number }[]> {
  const database = await getDb();
  return database.getAllAsync<{ category: string; total: number }>(
    `SELECT category, COALESCE(SUM(amount), 0) as total
     FROM transactions WHERE type = 'expense' AND ${MONTH_LOCAL} = ?
     GROUP BY category ORDER BY total DESC`,
    [month],
  );
}

export async function getExpenseByCategoryForMonthSpan(
  startMonth: string,
  endMonth: string,
): Promise<{ category: string; total: number }[]> {
  const database = await getDb();
  return database.getAllAsync<{ category: string; total: number }>(
    `SELECT category, COALESCE(SUM(amount), 0) as total
     FROM transactions WHERE type = 'expense'
       AND ${MONTH_LOCAL} >= ? AND ${MONTH_LOCAL} <= ?
     GROUP BY category ORDER BY total DESC`,
    [startMonth, endMonth],
  );
}

export async function getTotalExpenseForMonth(month: string): Promise<number> {
  const database = await getDb();
  const row = await database.getFirstAsync<{ total: number }>(
    `SELECT COALESCE(SUM(amount), 0) as total
     FROM transactions WHERE type = 'expense' AND ${MONTH_LOCAL} = ?`,
    [month],
  );
  return row?.total ?? 0;
}

export async function getExpenseByPaymentMode(): Promise<{ payment_mode: string; total: number }[]> {
  const database = await getDb();
  return database.getAllAsync<{ payment_mode: string; total: number }>(
    `SELECT payment_mode, COALESCE(SUM(amount), 0) as total
     FROM transactions WHERE type = 'expense'
     GROUP BY payment_mode ORDER BY total DESC`
  );
}

export async function getExpenseByPaymentModeForMonth(
  month: string,
): Promise<{ payment_mode: string; total: number }[]> {
  const database = await getDb();
  return database.getAllAsync<{ payment_mode: string; total: number }>(
    `SELECT payment_mode, COALESCE(SUM(amount), 0) as total
     FROM transactions WHERE type = 'expense' AND ${MONTH_LOCAL} = ?
     GROUP BY payment_mode ORDER BY total DESC`,
    [month],
  );
}

export async function getExpenseByPaymentModeForMonthSpan(
  startMonth: string,
  endMonth: string,
): Promise<{ payment_mode: string; total: number }[]> {
  const database = await getDb();
  return database.getAllAsync<{ payment_mode: string; total: number }>(
    `SELECT payment_mode, COALESCE(SUM(amount), 0) as total
     FROM transactions WHERE type = 'expense'
       AND ${MONTH_LOCAL} >= ? AND ${MONTH_LOCAL} <= ?
     GROUP BY payment_mode ORDER BY total DESC`,
    [startMonth, endMonth],
  );
}

export async function getIncomeExpenseForMonth(month: string): Promise<{ income: number; expense: number }> {
  const database = await getDb();
  const income = await database.getFirstAsync<{ total: number }>(
    `SELECT COALESCE(SUM(amount), 0) as total
     FROM transactions WHERE type = 'income' AND ${MONTH_LOCAL} = ?`,
    [month],
  );
  const expense = await database.getFirstAsync<{ total: number }>(
    `SELECT COALESCE(SUM(amount), 0) as total
     FROM transactions WHERE type = 'expense' AND ${MONTH_LOCAL} = ?`,
    [month],
  );
  return { income: income?.total ?? 0, expense: expense?.total ?? 0 };
}

export async function getIncomeExpenseForMonthSpan(
  startMonth: string,
  endMonth: string,
): Promise<{ income: number; expense: number }> {
  const database = await getDb();
  const income = await database.getFirstAsync<{ total: number }>(
    `SELECT COALESCE(SUM(amount), 0) as total
     FROM transactions WHERE type = 'income'
       AND ${MONTH_LOCAL} >= ? AND ${MONTH_LOCAL} <= ?`,
    [startMonth, endMonth],
  );
  const expense = await database.getFirstAsync<{ total: number }>(
    `SELECT COALESCE(SUM(amount), 0) as total
     FROM transactions WHERE type = 'expense'
       AND ${MONTH_LOCAL} >= ? AND ${MONTH_LOCAL} <= ?`,
    [startMonth, endMonth],
  );
  return { income: income?.total ?? 0, expense: expense?.total ?? 0 };
}

export async function getExpenseByCategoryInRange(
  start: string,
  end: string,
): Promise<{ category: string; total: number }[]> {
  const database = await getDb();
  return database.getAllAsync<{ category: string; total: number }>(
    `SELECT category, COALESCE(SUM(amount), 0) as total
     FROM transactions WHERE type = 'expense' AND date >= ? AND date < ?
     GROUP BY category ORDER BY total DESC`,
    [start, end],
  );
}

export async function getExpenseByPaymentModeInRange(
  start: string,
  end: string,
): Promise<{ payment_mode: string; total: number }[]> {
  const database = await getDb();
  return database.getAllAsync<{ payment_mode: string; total: number }>(
    `SELECT payment_mode, COALESCE(SUM(amount), 0) as total
     FROM transactions WHERE type = 'expense' AND date >= ? AND date < ?
     GROUP BY payment_mode ORDER BY total DESC`,
    [start, end],
  );
}

export async function getIncomeExpenseInRange(
  start: string,
  end: string,
): Promise<{ income: number; expense: number }> {
  const database = await getDb();
  const income = await database.getFirstAsync<{ total: number }>(
    `SELECT COALESCE(SUM(amount), 0) as total
     FROM transactions WHERE type = 'income' AND date >= ? AND date < ?`,
    [start, end],
  );
  const expense = await database.getFirstAsync<{ total: number }>(
    `SELECT COALESCE(SUM(amount), 0) as total
     FROM transactions WHERE type = 'expense' AND date >= ? AND date < ?`,
    [start, end],
  );
  return { income: income?.total ?? 0, expense: expense?.total ?? 0 };
}

export async function getMonthlyIncomeExpense(): Promise<{
  month: string;
  income: number;
  expense: number;
}[]> {
  const database = await getDb();
  const rows = await database.getAllAsync<{ month: string; type: string; total: number }>(
    `SELECT ${MONTH_LOCAL} as month, type,
            COALESCE(SUM(amount), 0) as total
     FROM transactions
     GROUP BY month, type
     ORDER BY month ASC`,
  );

  const monthMap = new Map<string, { month: string; income: number; expense: number }>();
  for (const row of rows) {
    if (!monthMap.has(row.month)) {
      monthMap.set(row.month, { month: row.month, income: 0, expense: 0 });
    }
    const entry = monthMap.get(row.month)!;
    if (row.type === 'income') entry.income += row.total;
    if (row.type === 'expense') entry.expense += row.total;
  }
  return Array.from(monthMap.values());
}

export async function getTransactionsByTag(tag: string): Promise<Transaction[]> {
  const database = await getDb();
  const rows = await database.getAllAsync<{
    id: number;
    amount: number;
    type: string;
    category: string;
    payment_mode: string;
    note: string;
    tags: string;
    date: string;
    sms_hash: string | null;
  }>(`SELECT * FROM transactions WHERE tags LIKE ? ORDER BY date DESC`, [`%"${tag}"%`]);
  return rows.map(mapRow);
}

export async function getTransactionsByPaymentMode(mode: string): Promise<Transaction[]> {
  const database = await getDb();
  const rows = await database.getAllAsync<{
    id: number;
    amount: number;
    type: string;
    category: string;
    payment_mode: string;
    note: string;
    tags: string;
    date: string;
    sms_hash: string | null;
  }>('SELECT * FROM transactions WHERE payment_mode = ? ORDER BY date DESC', [mode]);
  return rows.map(mapRow);
}

export async function exportAllData(): Promise<{
  transactions: Transaction[];
  budgets: Budget[];
  recurring: RecurringReminder[];
  splits: SplitGroup[];
  splitMembers: SplitMember[];
}> {
  const database = await getDb();
  const [transactions, budgets, recurring, splits, splitMembers] = await Promise.all([
    getAllTransactions(),
    database.getAllAsync<Budget>('SELECT * FROM budgets'),
    database.getAllAsync<RecurringReminder>('SELECT * FROM recurring_reminders'),
    database.getAllAsync<SplitGroup>('SELECT * FROM split_groups'),
    database.getAllAsync<SplitMember>('SELECT * FROM split_members'),
  ]);
  return { transactions, budgets, recurring, splits, splitMembers };
}

export async function importAllData(data: {
  transactions?: TransactionInput[];
  budgets?: Omit<Budget, 'id'>[];
  recurring?: Omit<RecurringReminder, 'id'>[];
}): Promise<void> {
  const database = await getDb();
  await database.execAsync('DELETE FROM transactions');
  await database.execAsync('DELETE FROM budgets');
  await database.execAsync('DELETE FROM recurring_reminders');
  await database.execAsync('DELETE FROM split_members');
  await database.execAsync('DELETE FROM split_groups');

  if (data.transactions) {
    for (const t of data.transactions) {
      await addTransaction(t);
    }
  }
  if (data.budgets) {
    for (const b of data.budgets) {
      await database.runAsync(
        'INSERT INTO budgets (category, amount, month) VALUES (?, ?, ?)',
        [b.category, b.amount, b.month]
      );
    }
  }
  if (data.recurring) {
    for (const r of data.recurring) {
      await database.runAsync(
        `INSERT INTO recurring_reminders (title, amount, type, category, payment_mode, day_of_month, enabled)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [r.title, r.amount, r.type, r.category, r.payment_mode, r.day_of_month, r.enabled]
      );
    }
  }
}

// Budgets
export async function getBudgets(month: string): Promise<Budget[]> {
  const database = await getDb();
  return database.getAllAsync<Budget>('SELECT * FROM budgets WHERE month = ?', [month]);
}

export async function setBudget(category: string, amount: number, month: string): Promise<void> {
  const database = await getDb();
  const existing = await database.getFirstAsync<{ id: number }>(
    'SELECT id FROM budgets WHERE category = ? AND month = ?',
    [category, month]
  );
  if (existing) {
    await database.runAsync('UPDATE budgets SET amount = ? WHERE id = ?', [amount, existing.id]);
  } else {
    await database.runAsync(
      'INSERT INTO budgets (category, amount, month) VALUES (?, ?, ?)',
      [category, amount, month]
    );
  }
}

export async function deleteBudget(id: number): Promise<void> {
  const database = await getDb();
  await database.runAsync('DELETE FROM budgets WHERE id = ?', [id]);
}

// Recurring
export async function getRecurringReminders(): Promise<RecurringReminder[]> {
  const database = await getDb();
  return database.getAllAsync<RecurringReminder>(
    'SELECT * FROM recurring_reminders ORDER BY day_of_month ASC'
  );
}

export async function addRecurringReminder(
  input: Omit<RecurringReminder, 'id'>
): Promise<number> {
  const database = await getDb();
  const result = await database.runAsync(
    `INSERT INTO recurring_reminders (title, amount, type, category, payment_mode, day_of_month, enabled)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [input.title, input.amount, input.type, input.category, input.payment_mode, input.day_of_month, input.enabled]
  );
  return result.lastInsertRowId;
}

export async function deleteRecurringReminder(id: number): Promise<void> {
  const database = await getDb();
  await database.runAsync('DELETE FROM recurring_reminders WHERE id = ?', [id]);
}

export async function toggleRecurringReminder(id: number, enabled: number): Promise<void> {
  const database = await getDb();
  await database.runAsync('UPDATE recurring_reminders SET enabled = ? WHERE id = ?', [enabled, id]);
}

// Splits
export async function getSplitGroups(): Promise<SplitGroup[]> {
  const database = await getDb();
  return database.getAllAsync<SplitGroup>('SELECT * FROM split_groups ORDER BY created_at DESC');
}

export async function getSplitMembers(groupId: number): Promise<SplitMember[]> {
  const database = await getDb();
  return database.getAllAsync<SplitMember>(
    'SELECT * FROM split_members WHERE group_id = ?',
    [groupId]
  );
}

export async function addSplitGroup(
  title: string,
  totalAmount: number,
  members: { name: string; share_amount: number }[]
): Promise<number> {
  const database = await getDb();
  const result = await database.runAsync(
    'INSERT INTO split_groups (title, total_amount, created_at) VALUES (?, ?, ?)',
    [title, totalAmount, new Date().toISOString()]
  );
  const groupId = result.lastInsertRowId;
  for (const m of members) {
    await database.runAsync(
      'INSERT INTO split_members (group_id, name, share_amount, paid) VALUES (?, ?, ?, 0)',
      [groupId, m.name, m.share_amount]
    );
  }
  return groupId;
}

export async function deleteSplitGroup(id: number): Promise<void> {
  const database = await getDb();
  await database.runAsync('DELETE FROM split_members WHERE group_id = ?', [id]);
  await database.runAsync('DELETE FROM split_groups WHERE id = ?', [id]);
}

function mapRow(row: {
  id: number;
  amount: number;
  type: string;
  category: string;
  payment_mode: string;
  note: string;
  tags: string;
  date: string;
  sms_hash?: string | null;
}): Transaction {
  return {
    id: row.id,
    amount: row.amount,
    type: row.type as Transaction['type'],
    category: row.category,
    payment_mode: row.payment_mode as Transaction['payment_mode'],
    note: row.note || '',
    tags: safeParseTags(row.tags),
    date: row.date,
    sms_hash: row.sms_hash ?? null,
  };
}

function safeParseTags(tags: string): string[] {
  try {
    const parsed = JSON.parse(tags);
    if (!Array.isArray(parsed)) return [];
    const out: string[] = [];
    for (const item of parsed) {
      if (typeof item !== 'string') continue;
      const n = normalizeTag(item);
      if (n && !out.includes(n)) out.push(n);
    }
    return out;
  } catch {
    return [];
  }
}

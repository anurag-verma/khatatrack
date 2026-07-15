import { TransactionInput, PaymentMode, TransactionType } from '../types';

interface ParsedSms {
  amount: number;
  type: TransactionType;
  payment_mode: PaymentMode;
  note: string;
  category: string;
  confidence: number;
}

const bankPatterns: { regex: RegExp; bank: string }[] = [
  { regex: /(?:Rs\.?\s*|INR\s*|₹\s*)([\d,]+\.?\d*)\s*(?:debited|deducted|spent|paid)/i, bank: '' },
  { regex: /(?:Rs\.?\s*|INR\s*|₹\s*)([\d,]+\.?\d*)\s*credited/i, bank: '' },
  { regex: /(?:debited|deducted)\s+(?:by|with|from)\s+(?:Rs\.?|INR|₹)?\s*([\d,]+\.?\d*)/i, bank: '' },
  { regex: /(?:credited|received)\s+(?:with|by|to)\s+(?:Rs\.?|INR|₹)?\s*([\d,]+\.?\d*)/i, bank: '' },
  { regex: /(?:VPA|UPI).*?(?:paid|sent|received)\s+(?:Rs\.?|INR|₹)?\s*([\d,]+\.?\d*)/i, bank: 'UPI' },
  { regex: /(?:spent|paid)\s+(?:on|at|to)\s+[\w\s]+.*?(?:Rs\.?|INR|₹)?\s*([\d,]+\.?\d*)/i, bank: '' },
  { regex: /(?:A\/c|Acct|Account)\s+[\wX*]+\s+(?:debited|credited)\s+(?:by|with|for)?\s*(?:Rs\.?|INR|₹)?\s*([\d,]+\.?\d*)/i, bank: '' },
  { regex: /(?:Txn|Transaction)\s+(?:of|amt)\s+(?:Rs\.?|INR|₹)?\s*([\d,]+\.?\d*)/i, bank: '' },
  { regex: /(?:Rs\.?|INR|₹)\s*([\d,]+\.?\d*)\s+(?:has been|is)\s+(?:debited|credited)/i, bank: '' },
];

const debitKeywords = /(?:debited|deducted|spent|paid|withdrawal|sent|purchase|dr\b)/i;
const creditKeywords = /(?:credited|received|deposited|added|refund|cr\b)/i;

const BANK_SENDERS = [
  'HDFC', 'SBI', 'ICICI', 'AXIS', 'KOTAK', 'YESBNK', 'PNB', 'BOB', 'CANBNK',
  'FEDBNK', 'IDFC', 'INDUS', 'PAYTM', 'PHONEPE', 'GPAY', 'AMAZON', 'CRED',
  'BHIM', 'BAJAJ', 'RBL', 'CITI', 'SCB', 'DBS', 'UNION', 'IOB', 'CENT',
];

const MERCHANT_CATEGORY: { pattern: RegExp; category: string }[] = [
  { pattern: /swiggy|zomato|dominos|mcdonald|kfc|food/i, category: 'food' },
  { pattern: /blinkit|zepto|bigbasket|dmart|kirana|grocery|grofers/i, category: 'groceries' },
  { pattern: /uber|ola|rapido|metro|irctc|petrol|fuel|indian oil|hpcl|bpcl/i, category: 'fuel' },
  { pattern: /amazon|flipkart|myntra|ajio|meesho|shopping/i, category: 'shopping' },
  { pattern: /netflix|spotify|hotstar|prime|entertainment|bookmyshow/i, category: 'entertainment' },
  { pattern: /jio|airtel|vi\b|bsnl|recharge|electricity|bescom|bill/i, category: 'utilities' },
  { pattern: /pharmacy|medplus|apollo|health|hospital/i, category: 'health' },
  { pattern: /rent|housing|nobroker/i, category: 'rent' },
  { pattern: /chai|tea|coffee|starbucks/i, category: 'tea' },
];

export function isBankSender(address: string): boolean {
  const upper = address.toUpperCase();
  return BANK_SENDERS.some((b) => upper.includes(b));
}

function detectPaymentMode(text: string): PaymentMode {
  if (/upi|vpa|paytm|phonepe|gpay|google\s*pay|bhim|amazonpay/i.test(text)) return 'UPI';
  if (/credit\s*card|cc\s*|card\s*purchase|card\s*ending/i.test(text)) return 'Credit Card';
  if (/cash|withdrawal|atm|wdl/i.test(text)) return 'Cash';
  if (/hdfc|sbi|icici|axis|kotak|yes\s*bank|bank|neft|imps|rtgs/i.test(text)) return 'Bank';
  return 'UPI';
}

function detectType(text: string): TransactionType {
  if (creditKeywords.test(text) && !debitKeywords.test(text)) return 'income';
  if (debitKeywords.test(text)) return 'expense';
  return 'expense';
}

function detectCategory(text: string): string {
  for (const { pattern, category } of MERCHANT_CATEGORY) {
    if (pattern.test(text)) return category;
  }
  return 'other';
}

function extractAmount(text: string): number | null {
  for (const { regex } of bankPatterns) {
    const match = text.match(regex);
    if (match?.[1]) {
      const num = parseFloat(match[1].replace(/,/g, ''));
      if (!isNaN(num) && num > 0) return num;
    }
  }
  return null;
}

function computeConfidence(text: string, amount: number): number {
  let score = 0.5;
  if (/(?:Rs|INR|₹)/i.test(text)) score += 0.15;
  if (/(?:debited|credited|UPI|VPA)/i.test(text)) score += 0.15;
  if (BANK_SENDERS.some((b) => text.toUpperCase().includes(b))) score += 0.1;
  if (amount >= 1 && amount <= 10000000) score += 0.1;
  return Math.min(score, 1);
}

export function parseSms(text: string): ParsedSms | null {
  const amount = extractAmount(text);
  if (!amount) return null;

  const type = detectType(text);
  const payment_mode = detectPaymentMode(text);
  const category = detectCategory(text);
  const note = text.substring(0, 120);
  const confidence = computeConfidence(text, amount);

  return { amount, type, payment_mode, note, category, confidence };
}

export function smsToTransaction(parsed: ParsedSms, smsHash: string): TransactionInput {
  return {
    amount: parsed.amount,
    type: parsed.type,
    category: parsed.category,
    payment_mode: parsed.payment_mode,
    note: parsed.note,
    tags: ['#SMS'],
    date: new Date().toISOString(),
    sms_hash: smsHash,
  };
}

export function hashSms(text: string, amount: number): string {
  const normalized = text.replace(/\s+/g, ' ').trim().toLowerCase().substring(0, 200);
  let hash = 0;
  const str = `${normalized}|${amount}`;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return `sms_${Math.abs(hash)}`;
}

export async function requestSmsPermission(): Promise<boolean> {
  const { Platform, PermissionsAndroid } = await import('react-native');
  if (Platform.OS !== 'android') return false;

  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.READ_SMS,
      {
        title: 'SMS Permission',
        message: 'KhataTrack needs SMS access to read bank messages for expense tracking. All data stays on your device.',
        buttonPositive: 'Allow',
        buttonNegative: 'Deny',
      }
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch {
    return false;
  }
}

export interface RawSmsMessage {
  _id: string;
  address: string;
  body: string;
  date: string;
}

export async function fetchBankSms(daysBack = 30): Promise<RawSmsMessage[]> {
  const { Platform } = await import('react-native');
  if (Platform.OS !== 'android') return [];

  try {
    const SmsAndroid = require('react-native-get-sms-android');
    const filter = {
      box: 'inbox',
      minDate: Date.now() - daysBack * 24 * 60 * 60 * 1000,
    };

    return new Promise((resolve) => {
      SmsAndroid.list(
        JSON.stringify(filter),
        (fail: string) => {
          console.warn('SMS fetch failed:', fail);
          resolve([]);
        },
        (_count: number, smsList: string) => {
          try {
            const messages: RawSmsMessage[] = JSON.parse(smsList);
            resolve(
              messages.filter(
                (m) => m.body && (isBankSender(m.address) || parseSms(m.body) !== null)
              )
            );
          } catch {
            resolve([]);
          }
        }
      );
    });
  } catch (e) {
    console.warn('SMS module not available:', e);
    return [];
  }
}

export function parseSmsList(
  messages: RawSmsMessage[],
  existingHashes: Set<string>
): import('../types').ParsedSmsItem[] {
  const results: import('../types').ParsedSmsItem[] = [];
  const seen = new Set<string>();

  for (const msg of messages) {
    const parsed = parseSms(msg.body);
    if (!parsed) continue;

    const smsHash = hashSms(msg.body, parsed.amount);
    if (existingHashes.has(smsHash) || seen.has(smsHash)) continue;
    seen.add(smsHash);

    results.push({
      ...parsed,
      smsHash,
      rawText: msg.body,
      selected: parsed.confidence >= 0.7,
    });
  }

  return results.sort((a, b) => b.confidence - a.confidence);
}

import type { ExpenseCategory } from '@/types';

export const CURRENCY_OPTIONS = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'MXN', 'BRL'];

export const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  'Food & Dining':   '#f59e0b',
  'Transportation':  '#3b82f6',
  'Shopping':        '#8b5cf6',
  'Entertainment':   '#ec4899',
  'Healthcare':      '#10b981',
  'Housing':         '#6366f1',
  'Travel':          '#06b6d4',
  'Education':       '#84cc16',
  'Business':        '#f97316',
  'Other':           '#6b7280',
};

export const SPREADSHEET_HEADERS = [
  'id', 'user_id', 'timestamp', 'amount', 'currency',
  'category', 'merchant', 'description',
  'location_lat', 'location_lng', 'city',
  'receipt_url', 'ai_confidence', 'created_at', 'synced',
];

export const SHEETS_TAB_NAME = 'Expenses';
export const SHEETS_API_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';
export const DRIVE_API_BASE  = 'https://www.googleapis.com/drive/v3';

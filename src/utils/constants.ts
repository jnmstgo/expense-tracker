import type { ExpenseCategory } from '@/types';

export const CURRENCY_OPTIONS = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'MXN', 'BRL'];

export const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  'Gasto fijo':      '#ef4444',
  'Dietetica':       '#f59e0b',
  'Verdu':           '#10b981',
  'Bohe':            '#ec4899',
  'Formación':       '#3b82f6',
  'Gasto extra':     '#8b5cf6',
  'Pendiente':       '#f97316',
  'Azu/Vida':        '#06b6d4',
  'Perris':          '#eab308',
  'Tarjetas':        '#6366f1',
  'Salud integral':  '#14b8a6',
  'Super':           '#a855f7',
  'Transferencia':   '#6b7280',
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

// ─── Google Identity Services global types ───────────────────────────────────

export interface GoogleCredentialResponse {
  credential: string;
  select_by: string;
}

export interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
  error?: string;
}

export interface GoogleTokenClient {
  requestAccessToken: (options?: { prompt?: string }) => void;
  callback: (response: GoogleTokenResponse) => void;
}

declare global {
  interface Window {
    google: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: GoogleCredentialResponse) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
          }) => void;
          prompt: (notification?: (n: { isNotDisplayed(): boolean; isSkippedMoment(): boolean }) => void) => void;
          renderButton: (element: HTMLElement, config: Record<string, unknown>) => void;
          disableAutoSelect: () => void;
        };
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: GoogleTokenResponse) => void;
            error_callback?: (error: { type: string }) => void;
          }) => GoogleTokenClient;
        };
      };
    };
  }
}

// ─── Domain types ─────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  name: string;
  picture: string;
  accessToken: string;
  tokenExpiry: number;
  spreadsheetId: string | null;
}

export const EXPENSE_CATEGORIES = [
  'Food & Dining',
  'Transportation',
  'Shopping',
  'Entertainment',
  'Healthcare',
  'Housing',
  'Travel',
  'Education',
  'Business',
  'Other',
] as const;

export type ExpenseCategory = typeof EXPENSE_CATEGORIES[number];

export interface Expense {
  id: string;
  userId: string;
  timestamp: string;
  amount: number;
  currency: string;
  category: ExpenseCategory;
  merchant: string;
  description: string;
  locationLat: number | null;
  locationLng: number | null;
  city: string | null;
  receiptUrl: string | null;
  aiConfidence: number | null;
  createdAt: string;
  synced: boolean;
}

export interface ExpenseFormData {
  amount: string;
  currency: string;
  category: ExpenseCategory;
  merchant: string;
  description: string;
}

export interface ReceiptData {
  merchant: string;
  date: string;
  total: number;
  currency: string;
  items: Array<{ name: string; price: number }>;
  confidence: number;
}

export interface GeoLocation {
  lat: number;
  lng: number;
  city: string;
}

export interface ExpenseFilters {
  startDate: string;
  endDate: string;
  category: ExpenseCategory | '';
  search: string;
}

export interface MonthlySummary {
  total: number;
  count: number;
  byCategory: Partial<Record<ExpenseCategory, number>>;
  currency: string;
}

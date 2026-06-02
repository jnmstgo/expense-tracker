import { create } from 'zustand';
import type { Expense, ExpenseFilters, MonthlySummary, Merchant } from '@/types';
import { EXPENSE_CATEGORIES } from '@/types';
import { startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';

interface ExpenseState {
  expenses: Expense[];
  merchants: Merchant[];
  customCategories: string[];
  filters: ExpenseFilters;
  isLoading: boolean;
  isSyncing: boolean;
  error: string | null;
  setExpenses: (expenses: Expense[]) => void;
  addExpense: (expense: Expense) => void;
  removeExpense: (id: string) => void;
  markSynced: (id: string) => void;
  setFilters: (filters: Partial<ExpenseFilters>) => void;
  resetFilters: () => void;
  setLoading: (v: boolean) => void;
  setSyncing: (v: boolean) => void;
  setError: (e: string | null) => void;
  getFiltered: () => Expense[];
  getMonthlySummary: (year: number, month: number) => MonthlySummary;
  
  // Merchants & Categories actions
  setMerchants: (merchants: Merchant[]) => void;
  addMerchant: (merchant: Merchant) => void;
  setCustomCategories: (categories: string[]) => void;
  addCustomCategory: (category: string) => void;
  removeCustomCategory: (category: string) => void;
}

const DEFAULT_FILTERS: ExpenseFilters = {
  startDate: '',
  endDate: '',
  categories: [],
  currencies: [],
  minAmount: '',
  maxAmount: '',
  search: '',
  hasReceiptDetails: null,
  sortBy: 'date_desc',
};

export const useExpenseStore = create<ExpenseState>()((set, get) => ({
  expenses: [],
  merchants: [],
  customCategories: [...EXPENSE_CATEGORIES],
  filters: DEFAULT_FILTERS,
  isLoading: false,
  isSyncing: false,
  error: null,

  setExpenses: expenses => set({ expenses }),

  addExpense: expense =>
    set(s => ({ expenses: [expense, ...s.expenses] })),

  removeExpense: id =>
    set(s => ({ expenses: s.expenses.filter(e => e.id !== id) })),

  markSynced: id =>
    set(s => ({
      expenses: s.expenses.map(e => e.id === id ? { ...e, synced: true } : e),
    })),

  setFilters: filters =>
    set(s => ({ filters: { ...s.filters, ...filters } })),

  resetFilters: () => set({ filters: DEFAULT_FILTERS }),

  setLoading: isLoading => set({ isLoading }),
  setSyncing: isSyncing => set({ isSyncing }),
  setError: error => set({ error }),

  setMerchants: merchants => set({ merchants }),
  addMerchant: merchant => set(s => {
    const exists = s.merchants.some(m => m.name.toLowerCase() === merchant.name.toLowerCase());
    if (exists) return {};
    return { merchants: [...s.merchants, merchant] };
  }),
  setCustomCategories: customCategories => set({ customCategories }),
  addCustomCategory: category => set(s => {
    if (s.customCategories.includes(category)) return {};
    return { customCategories: [...s.customCategories, category] };
  }),
  removeCustomCategory: category => set(s => ({
    customCategories: s.customCategories.filter(c => c !== category)
  })),

  getFiltered: () => {
    const { expenses, filters } = get();
    const filtered = expenses.filter(e => {
      // 1. Category Filter (multi-select)
      if (filters.categories && filters.categories.length > 0) {
        if (!filters.categories.includes(e.category)) return false;
      }
      // 2. Currency Filter (multi-select)
      if (filters.currencies && filters.currencies.length > 0) {
        if (!filters.currencies.includes(e.currency)) return false;
      }
      // 3. Min Amount Filter
      if (filters.minAmount) {
        const minVal = parseFloat(filters.minAmount);
        if (!isNaN(minVal) && e.amount < minVal) return false;
      }
      // 4. Max Amount Filter
      if (filters.maxAmount) {
        const maxVal = parseFloat(filters.maxAmount);
        if (!isNaN(maxVal) && e.amount > maxVal) return false;
      }
      // 5. Search Filter (matches merchant, description, address, or item names)
      if (filters.search && filters.search.length >= 3) {
        const q = filters.search.toLowerCase();
        const matchesMerchant = e.merchant.toLowerCase().includes(q);
        const matchesDescription = e.description.toLowerCase().includes(q);
        const matchesAddress = e.address?.toLowerCase().includes(q) ?? false;
        const matchesItems = e.items?.some(item => item.name.toLowerCase().includes(q)) ?? false;
        if (!matchesMerchant && !matchesDescription && !matchesAddress && !matchesItems) return false;
      }
      // 6. Start Date Filter
      if (filters.startDate) {
        if (e.timestamp < filters.startDate) return false;
      }
      // 7. End Date Filter
      if (filters.endDate) {
        if (e.timestamp > filters.endDate + 'T23:59:59') return false;
      }
      // 8. Has Receipt Details
      if (filters.hasReceiptDetails !== null) {
        const hasDetails = !!(e.items && e.items.length > 0);
        if (filters.hasReceiptDetails !== hasDetails) return false;
      }
      return true;
    });

    // 9. Sorting
    return [...filtered].sort((a, b) => {
      if (filters.sortBy === 'date_desc') {
        return b.timestamp.localeCompare(a.timestamp);
      }
      if (filters.sortBy === 'date_asc') {
        return a.timestamp.localeCompare(b.timestamp);
      }
      if (filters.sortBy === 'amount_desc') {
        return b.amount - a.amount;
      }
      if (filters.sortBy === 'amount_asc') {
        return a.amount - b.amount;
      }
      return 0;
    });
  },

  getMonthlySummary: (year, month) => {
    const { expenses } = get();
    const start = startOfMonth(new Date(year, month - 1));
    const end   = endOfMonth(new Date(year, month - 1));

    const inMonth = expenses.filter(e => {
      try {
        return isWithinInterval(parseISO(e.timestamp), { start, end });
      } catch { return false; }
    });

    const byCategory: MonthlySummary['byCategory'] = {};
    let total = 0;

    for (const e of inMonth) {
      total += e.amount;
      byCategory[e.category] = (byCategory[e.category] ?? 0) + e.amount;
    }

    return {
      total,
      count: inMonth.length,
      byCategory,
      currency: inMonth[0]?.currency ?? 'USD',
    };
  },
}));

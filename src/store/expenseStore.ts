import { create } from 'zustand';
import type { Expense, ExpenseFilters, MonthlySummary } from '@/types';
import { startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';

interface ExpenseState {
  expenses: Expense[];
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
}

const DEFAULT_FILTERS: ExpenseFilters = {
  startDate: '', endDate: '', category: '', search: '',
};

export const useExpenseStore = create<ExpenseState>()((set, get) => ({
  expenses: [],
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

  getFiltered: () => {
    const { expenses, filters } = get();
    return expenses.filter(e => {
      if (filters.category && e.category !== filters.category) return false;
      if (filters.search) {
        const q = filters.search.toLowerCase();
        if (!e.merchant.toLowerCase().includes(q) &&
            !e.description.toLowerCase().includes(q)) return false;
      }
      if (filters.startDate) {
        if (e.timestamp < filters.startDate) return false;
      }
      if (filters.endDate) {
        if (e.timestamp > filters.endDate + 'T23:59:59') return false;
      }
      return true;
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

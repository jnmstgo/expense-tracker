import { useCallback, useEffect } from 'react';
import { v4 as uuid } from 'uuid';
import { useAuthStore } from '@/store/authStore';
import { useExpenseStore } from '@/store/expenseStore';
import { useUiStore } from '@/store/uiStore';
import { appendExpense, fetchExpenses, deleteExpenseRow, fetchMerchants, saveMerchant, fetchCustomCategories, saveCustomCategories, ensureSheetsInitialized } from '@/services/googleSheets';
import { savePendingExpense, flushPendingExpenses, getCachedExpenses, setCachedExpenses, getPendingExpenses } from '@/services/offlineManager';
import type { Expense, ExpenseFormData, GeoLocation, Merchant } from '@/types';

/**
 * Merges Google Sheets data and locally stored pending offline expenses.
 * Prevents duplications and keeps pending items at the top of the list.
 */
function mergeExpenses(pending: Expense[], list: Expense[]): Expense[] {
  const pendingIds = new Set(pending.map(e => e.id));
  const filteredList = list.filter(e => !pendingIds.has(e.id));
  return [...pending, ...filteredList];
}

export function useExpenses() {
  const { user, isTokenValid } = useAuthStore();
  const {
    expenses, isLoading, isSyncing,
    setExpenses, addExpense, removeExpense, markSynced,
    setLoading, setSyncing,
  } = useExpenseStore();
  const { showNotification } = useUiStore();

  // Load expenses, merchants, and categories from Sheets (or cache) on mount
  const loadExpenses = useCallback(async () => {
    const cached = getCachedExpenses();
    const pending = getPendingExpenses();
    
    // Set initial merged state from local storage immediately for speed
    setExpenses(mergeExpenses(pending, cached));

    // Load merchants and categories from localStorage if present
    try {
      const cachedMerchants = JSON.parse(localStorage.getItem('expense_tracker_merchants') ?? '[]');
      const cachedCategories = JSON.parse(localStorage.getItem('expense_tracker_categories') ?? '[]');
      if (cachedMerchants.length > 0) useExpenseStore.getState().setMerchants(cachedMerchants);
      if (cachedCategories.length > 0) useExpenseStore.getState().setCustomCategories(cachedCategories);
    } catch (e) {}

    if (!user?.spreadsheetId || !isTokenValid()) {
      return;
    }
    
    setLoading(true);
    try {
      // Ensure sheets are initialized and names normalized (e.g. Spanish "Hoja 1" -> "Sheet1") first
      await ensureSheetsInitialized(user.accessToken, user.spreadsheetId);

      const [expensesData, merchantsData, categoriesData] = await Promise.all([
        fetchExpenses(user.accessToken, user.spreadsheetId, user.id),
        fetchMerchants(user.accessToken, user.spreadsheetId).catch(() => []),
        fetchCustomCategories(user.accessToken, user.spreadsheetId).catch(() => [])
      ]);

      setCachedExpenses(expensesData);
      setExpenses(mergeExpenses(getPendingExpenses(), expensesData));

      if (merchantsData.length > 0) {
        useExpenseStore.getState().setMerchants(merchantsData);
        localStorage.setItem('expense_tracker_merchants', JSON.stringify(merchantsData));
      }
      if (categoriesData.length > 0) {
        useExpenseStore.getState().setCustomCategories(categoriesData);
        localStorage.setItem('expense_tracker_categories', JSON.stringify(categoriesData));
      }
    } catch (err) {
      console.error('Load expenses error:', err);
      showNotification('Using cached data (offline mode)', 'info');
    } finally {
      setLoading(false);
    }
  }, [user, isTokenValid, setExpenses, setLoading, showNotification]);

  useEffect(() => { if (user) loadExpenses(); }, [user?.spreadsheetId]);

  // Add a new expense
  const addNewExpense = useCallback(async (
    formData: ExpenseFormData,
    location: GeoLocation | null,
    receiptUrl: string | null,
    aiConfidence: number | null,
    items?: Array<{ name: string; price: number }>
  ) => {
    if (!user) return;

    const expense: Expense = {
      id:           uuid(),
      userId:       user.id,
      timestamp:    new Date().toISOString(),
      amount:       parseFloat(formData.amount),
      currency:     formData.currency,
      category:     formData.category,
      merchant:     formData.merchant.trim(),
      description:  formData.description.trim(),
      locationLat:  location?.lat ?? null,
      locationLng:  location?.lng ?? null,
      city:         location?.city ?? null,
      receiptUrl,
      aiConfidence,
      createdAt:    new Date().toISOString(),
      synced:       false,
      items:        items || [],
      address:      formData.address?.trim() || null,
      userName:     user.name || null
    };

    // Prepend to active store list
    addExpense(expense);
    
    // Update local cache immediately so it's not lost on navigation/reload
    const currentCached = getCachedExpenses();
    setCachedExpenses([expense, ...currentCached]);

    if (!navigator.onLine || !user.spreadsheetId || !isTokenValid()) {
      savePendingExpense(expense);
      showNotification('Saved offline. Will sync when connected.', 'info');
      return;
    }

    try {
      await appendExpense(user.accessToken, user.spreadsheetId, { ...expense, synced: true });
      markSynced(expense.id);
      
      // Update cache to reflect synced status
      const updatedCache = getCachedExpenses().map(e => e.id === expense.id ? { ...e, synced: true } : e);
      setCachedExpenses(updatedCache);
      
      showNotification('Expense saved!', 'success');
    } catch (err) {
      savePendingExpense(expense);
      showNotification('Saved offline due to error.', 'info');
      console.error(err);
    }
  }, [user, isTokenValid, addExpense, showNotification]);

  // Delete expense
  const deleteExpense = useCallback(async (id: string) => {
    removeExpense(id);
    
    // Remove from local cache as well
    const filteredCache = getCachedExpenses().filter(e => e.id !== id);
    setCachedExpenses(filteredCache);

    if (!user?.spreadsheetId || !isTokenValid()) return;
    try {
      await deleteExpenseRow(user.accessToken, user.spreadsheetId, id);
      showNotification('Expense deleted.', 'success');
    } catch (err) {
      console.error('Delete error:', err);
      showNotification('Failed to delete from sheet.', 'error');
      loadExpenses();
    }
  }, [user, isTokenValid, removeExpense, showNotification, loadExpenses]);

  // Sync pending offline expenses
  const syncPending = useCallback(async () => {
    if (!user?.spreadsheetId || !isTokenValid() || !navigator.onLine) return;
    setSyncing(true);
    try {
      const { synced } = await flushPendingExpenses(
        exp => appendExpense(user.accessToken, user.spreadsheetId!, exp),
        id  => {
          markSynced(id);
          // Also mark as synced in cached storage
          const updatedCache = getCachedExpenses().map(e => e.id === id ? { ...e, synced: true } : e);
          setCachedExpenses(updatedCache);
        }
      );
      if (synced > 0) {
        showNotification(`Synced ${synced} expense(s).`, 'success');
        // Reload list to align everything perfectly
        loadExpenses();
      }
    } catch (err) {
      console.error('Sync error:', err);
    } finally {
      setSyncing(false);
    }
  }, [user, isTokenValid, setSyncing, showNotification, loadExpenses]);

  // Save new merchant
  const addMerchantToSheets = useCallback(async (merchant: Merchant) => {
    useExpenseStore.getState().addMerchant(merchant);
    const current = useExpenseStore.getState().merchants;
    localStorage.setItem('expense_tracker_merchants', JSON.stringify(current));
    if (!user?.spreadsheetId || !isTokenValid()) return;
    try {
      await saveMerchant(user.accessToken, user.spreadsheetId, merchant);
    } catch (e) {
      console.warn('Failed to save merchant to sheets:', e);
    }
  }, [user, isTokenValid]);

  // Save custom categories
  const updateCategories = useCallback(async (newCategories: string[]) => {
    useExpenseStore.getState().setCustomCategories(newCategories);
    localStorage.setItem('expense_tracker_categories', JSON.stringify(newCategories));
    if (!user?.spreadsheetId || !isTokenValid()) return;
    try {
      await saveCustomCategories(user.accessToken, user.spreadsheetId, newCategories);
    } catch (e) {
      console.warn('Failed to save categories to sheets:', e);
    }
  }, [user, isTokenValid]);

  return { 
    expenses, 
    isLoading, 
    isSyncing, 
    addNewExpense, 
    deleteExpense, 
    syncPending, 
    loadExpenses,
    addMerchantToSheets,
    updateCategories
  };
}

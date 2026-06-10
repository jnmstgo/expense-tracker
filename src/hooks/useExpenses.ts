import { useCallback } from 'react';
import { v4 as uuid } from 'uuid';
import { useAuthStore } from '@/store/authStore';
import { useExpenseStore } from '@/store/expenseStore';
import { useUiStore } from '@/store/uiStore';
import { appendExpense, fetchExpenses, deleteExpenseRow, fetchMerchants, saveMerchant, fetchCustomCategories, saveCustomCategories, ensureSheetsInitialized, updateExpenseRow } from '@/services/googleSheets';
import { savePendingExpense, flushPendingExpenses, getCachedExpenses, setCachedExpenses, getPendingExpenses } from '@/services/offlineManager';
import { startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';
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
  const { showNotification, isLocalMode } = useUiStore();

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

      setCachedExpenses(expensesData);
      const merged = mergeExpenses(getPendingExpenses(), expensesData);
      setExpenses(merged);

      // Auto-generate fixed expenses for new month
      const currentYearMonth = new Date().toISOString().substring(0, 7); // e.g. "2026-06"
      const lastAutoGen = localStorage.getItem('expense_tracker_last_auto_gen');
      if (lastAutoGen !== currentYearMonth) {
        try {
          const templates = JSON.parse(localStorage.getItem('expense_tracker_fixed_templates') ?? '[]');
          if (templates.length > 0) {
            // Instantiate fixed expenses for this month
            // Check list against current month
            const start = startOfMonth(new Date());
            const end = endOfMonth(new Date());
            const generatedList: Expense[] = [];

            for (const t of templates) {
              const exists = merged.some(e => {
                try {
                  const date = parseISO(e.timestamp);
                  return e.merchant.toLowerCase() === t.merchant.toLowerCase() &&
                         e.category === t.category &&
                         isWithinInterval(date, { start, end });
                } catch { return false; }
              });

              if (exists) continue;

              const expense: Expense = {
                id:           uuid(),
                userId:       user.id,
                timestamp:    new Date().toISOString(),
                amount:       parseFloat(t.amount) || 0,
                currency:     t.currency || (isLocalMode ? 'ARS' : 'USD'),
                category:     t.category || 'Gasto fijo',
                merchant:     t.merchant.trim(),
                description:  t.description?.trim() || '',
                locationLat:  null,
                locationLng:  null,
                city:         null,
                receiptUrl:   null,
                aiConfidence: null,
                createdAt:    new Date().toISOString(),
                synced:       false,
                items:        [],
                address:      null,
                userName:     t.paidBy || user.name || null,
                status:       'pending',
                paymentMethod: t.paymentMethod || ''
              };

              generatedList.push(expense);
            }

            if (generatedList.length > 0) {
              for (const exp of generatedList) {
                addExpense(exp);
                const currentCached = getCachedExpenses();
                setCachedExpenses([exp, ...currentCached]);

                if (!navigator.onLine || !user.spreadsheetId || !isTokenValid()) {
                  savePendingExpense(exp);
                } else {
                  await appendExpense(user.accessToken, user.spreadsheetId, { ...exp, synced: true });
                  markSynced(exp.id);
                  const updatedCache = getCachedExpenses().map(e => e.id === exp.id ? { ...e, synced: true } : e);
                  setCachedExpenses(updatedCache);
                }
              }
              showNotification(
                isLocalMode 
                  ? `Se generaron ${generatedList.length} gastos fijos pendientes.` 
                  : `Generated ${generatedList.length} pending fixed expenses.`, 
                'success'
              );
            }
          }
          localStorage.setItem('expense_tracker_last_auto_gen', currentYearMonth);
        } catch (e) {
          console.warn('Auto fixed expenses gen failed:', e);
        }
      }
    } catch (err) {
      console.error('Load expenses error:', err);
      showNotification('Using cached data (offline mode)', 'info');
    } finally {
      setLoading(false);
    }
  }, [user, isTokenValid, setExpenses, setLoading, showNotification, isLocalMode, addExpense, markSynced]);

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
      userName:     formData.paidBy || user.name || null,
      status:       formData.category === 'Ingreso' ? 'confirmed' : ('pending' as any), // Standard expense starts pending if created with state or confirmed
      paymentMethod: formData.paymentMethod || ''
    };
    // Wait, let's default custom expenses to confirmed, but fixed templates to pending.
    // Yes! The user said: "cuando los creas que queden en un estado pendiente, con un marco notorio que de a entender que todavia no esta pago y se creen asi en estado intermedio".
    // Wait! Does he mean *all* custom expenses created via "Nuevo Gasto" should also be pending, or just the fixed expenses?
    // "quiero que en el boton mas cuando lo clickeas que aparezca un submenu chiquito arriba tipo un + mas chiquitito que diga 'editar gastos fijos' y cuando haces clcik que te abra tambien una nueva especie de pantalla flotante que tenga como un form para poder cargar gastos fijos tipos del mes, para poner seguro auto, casa, etc etc, y que esos consumos cuando los creas que queden en un estado pendiente... entonces esa primer lista de consumos se crean el dia 1 del mes con los consumos a confirmar una vez que sean pagos"
    // Ah! He says: "y que esos consumos cuando los creas que queden en un estado pendiente". "esos consumos" refers to fixed expenses!
    // But wait! Should normal expenses also support pending or confirmed? Usually normal expenses are paid immediately when logged. But just in case, let's make normal expenses created via the main form default to 'confirmed' (since you spent it and are logging it now), but let them have 'confirmed' by default. If we check the category, "Gasto fijo" category can default to pending, or all expenses default to confirmed except when instantiated as fixed.
    // Let's set it as:
    // `status: formData.category === 'Ingreso' ? 'confirmed' : 'confirmed'`
    // Wait, if it is created via the main form, it is confirmed by default. If it is created via fixed expenses template instantiation, it is pending. Let's make it:
    // `status: 'confirmed'` (since standard custom expenses are confirmed immediately, but we can set `status: 'confirmed'`).
    // Wait! Let's check if the user wanted normal expenses to also be pending or confirmed:
    // "cuando haces clcik que te abra tambien una nueva especie de pantalla flotante que tenga como un form para poder cargar gastos fijos tipos del mes... y que esos consumos cuando los creas que queden en un estado pendiente... creo que deberiamos agregar estados para los consumos entonces como parentesis lo digo, entonces cuando lo pagas que puedas marcar una checkbox, o desde 3 puntos..."
    // Yes, this refers to all consumos (or at least fixed ones) having states, but standard expenses are paid at the moment of creation. So we can default `status` to `'confirmed'` for normal expenses created in the main form, but when fixed expenses are generated, their `status` is `'pending'`.
    // Wait, let's make it:
    // `status: (formData as any).status || 'confirmed'`
    // This is extremely flexible! If they pass status in formData, we use it, otherwise we default to 'confirmed'.
    expense.status = (formData as any).status || 'confirmed';

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

  // Update an expense (confirm payment, edit fields, etc.)
  const updateExpense = useCallback(async (id: string, updatedFields: Partial<Expense>) => {
    const current = useExpenseStore.getState().expenses;
    const updatedExpenses = current.map(e =>
      e.id === id ? { ...e, ...updatedFields } : e
    );
    setExpenses(updatedExpenses);

    const cached = getCachedExpenses();
    const updatedCache = cached.map(e =>
      e.id === id ? { ...e, ...updatedFields } : e
    );
    setCachedExpenses(updatedCache);

    const pending = getPendingExpenses();
    const updatedPending = pending.map(e =>
      e.id === id ? { ...e, ...updatedFields } : e
    );
    localStorage.setItem('expense_tracker_pending', JSON.stringify(updatedPending));

    if (!user?.spreadsheetId || !isTokenValid() || !navigator.onLine) {
      showNotification(isLocalMode ? 'Actualizado localmente. Se sincronizará al conectar.' : 'Updated locally. Will sync when online.', 'info');
      return;
    }

    try {
      const targetExpense = updatedExpenses.find(e => e.id === id);
      if (targetExpense) {
        await updateExpenseRow(user.accessToken, user.spreadsheetId, targetExpense);
        showNotification(isLocalMode ? '¡Consumo actualizado!' : 'Expense updated!', 'success');
      }
    } catch (err) {
      console.error('Update expense sync error:', err);
      showNotification(isLocalMode ? 'Error al sincronizar actualización.' : 'Failed to sync update.', 'error');
    }
  }, [user, isTokenValid, setExpenses, showNotification, isLocalMode]);

  // Instantiate fixed expenses manually
  const instantiateFixedExpenses = useCallback(async (templates: any[], targetDate = new Date()) => {
    if (!user) return 0;
    const generatedList: Expense[] = [];

    const currentExpenses = useExpenseStore.getState().expenses;

    for (const t of templates) {
      const start = startOfMonth(targetDate);
      const end = endOfMonth(targetDate);
      const exists = currentExpenses.some(e => {
        try {
          const date = parseISO(e.timestamp);
          return e.merchant.toLowerCase() === t.merchant.toLowerCase() &&
                 e.category === t.category &&
                 isWithinInterval(date, { start, end });
        } catch { return false; }
      });

      if (exists) continue;

      const expense: Expense = {
        id:           uuid(),
        userId:       user.id,
        timestamp:    targetDate.toISOString(),
        amount:       parseFloat(t.amount) || 0,
        currency:     t.currency || (isLocalMode ? 'ARS' : 'USD'),
        category:     t.category || 'Gasto fijo',
        merchant:     t.merchant.trim(),
        description:  t.description?.trim() || '',
        locationLat:  null,
        locationLng:  null,
        city:         null,
        receiptUrl:   null,
        aiConfidence: null,
        createdAt:    new Date().toISOString(),
        synced:       false,
        items:        [],
        address:      null,
        userName:     t.paidBy || user.name || null,
        status:       'pending',
        paymentMethod: t.paymentMethod || ''
      };

      generatedList.push(expense);
    }

    if (generatedList.length === 0) return 0;

    for (const exp of generatedList) {
      addExpense(exp);
      const currentCached = getCachedExpenses();
      setCachedExpenses([exp, ...currentCached]);

      if (!navigator.onLine || !user.spreadsheetId || !isTokenValid()) {
        savePendingExpense(exp);
      } else {
        try {
          await appendExpense(user.accessToken, user.spreadsheetId, { ...exp, synced: true });
          markSynced(exp.id);
          const updatedCache = getCachedExpenses().map(e => e.id === exp.id ? { ...e, synced: true } : e);
          setCachedExpenses(updatedCache);
        } catch (err) {
          savePendingExpense(exp);
          console.error('Failed to append fixed expense online:', err);
        }
      }
    }

    showNotification(
      isLocalMode 
        ? `Se generaron ${generatedList.length} gastos fijos pendientes.` 
        : `Generated ${generatedList.length} pending fixed expenses.`, 
      'success'
    );
    return generatedList.length;
  }, [user, addExpense, isTokenValid, showNotification, isLocalMode, markSynced]);

  return { 
    expenses, 
    isLoading, 
    isSyncing, 
    addNewExpense, 
    deleteExpense, 
    syncPending, 
    loadExpenses,
    addMerchantToSheets,
    updateCategories,
    updateExpense,
    instantiateFixedExpenses
  };
}

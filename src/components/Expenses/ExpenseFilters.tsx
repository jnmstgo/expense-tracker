import { useState, useMemo } from 'react';
import { useExpenseStore } from '@/store/expenseStore';
import { useUiStore } from '@/store/uiStore';
import { CATEGORY_COLORS } from '@/utils/constants';
import Button from '@/components/UI/Button';

// Category translations in Spanish (Argentina)
const CATEGORY_TRANSLATIONS: Record<string, string> = {
  'Food & Dining':   'Comida y Restaurantes',
  'Transportation':  'Transporte',
  'Shopping':        'Compras',
  'Entertainment':   'Entretenimiento',
  'Healthcare':      'Salud',
  'Housing':         'Alquiler y Vivienda',
  'Travel':          'Viajes y Turismo',
  'Education':       'Educación',
  'Business':        'Negocios',
  'Other':           'Otros / Varios',
};

const LABELS = {
  es: {
    searchPlaceholder: 'Buscar por comercio, notas, dirección o artículos...',
    filtersBtn: 'Filtros Avanzados',
    categories: 'Categorías',
    currencies: 'Monedas',
    amountRange: 'Rango de Montos',
    minAmount: 'Mínimo',
    maxAmount: 'Máximo',
    receiptDetails: 'Detalle de Ticket',
    all: 'Todos',
    withDetails: 'Con Detalle 🧾',
    withoutDetails: 'Sin Detalle',
    dateRange: 'Rango de Fechas',
    startDate: 'Desde',
    endDate: 'Hasta',
    sortBy: 'Ordenar Por',
    clearFilters: 'Limpiar Filtros ✕',
    close: 'Cerrar',
    dateDesc: 'Fecha: Más recientes',
    dateAsc: 'Fecha: Más antiguos',
    amountDesc: 'Monto: Mayor a menor',
    amountAsc: 'Monto: Menor a mayor',
  },
  en: {
    searchPlaceholder: 'Search by merchant, notes, address, or items...',
    filtersBtn: 'Advanced Filters',
    categories: 'Categories',
    currencies: 'Currencies',
    amountRange: 'Amount Range',
    minAmount: 'Min',
    maxAmount: 'Max',
    receiptDetails: 'Receipt Details',
    all: 'All',
    withDetails: 'With Details 🧾',
    withoutDetails: 'Without Details',
    dateRange: 'Date Range',
    startDate: 'Start Date',
    endDate: 'End Date',
    sortBy: 'Sort By',
    clearFilters: 'Clear Filters ✕',
    close: 'Close',
    dateDesc: 'Date: Newest first',
    dateAsc: 'Date: Oldest first',
    amountDesc: 'Amount: Highest first',
    amountAsc: 'Amount: Lowest first',
  }
};

export default function ExpenseFilters() {
  const isLocalMode = useUiStore(s => s.isLocalMode);
  const lang = isLocalMode ? 'es' : 'en';
  const t = LABELS[lang];

  const { expenses, filters, setFilters, resetFilters, customCategories } = useExpenseStore();
  const [isOpen, setIsOpen] = useState(false);

  // Compute active filters count
  const activeCount = useMemo(() => {
    let count = 0;
    if (filters.search) count++;
    if (filters.categories && filters.categories.length > 0) count++;
    if (filters.currencies && filters.currencies.length > 0) count++;
    if (filters.minAmount) count++;
    if (filters.maxAmount) count++;
    if (filters.startDate) count++;
    if (filters.endDate) count++;
    if (filters.hasReceiptDetails !== null) count++;
    if (filters.sortBy !== 'date_desc') count++;
    return count;
  }, [filters]);

  // Extract all currencies dynamically present in the expenses, fallback to standard ARS/USD
  const availableCurrencies = useMemo(() => {
    const list = new Set(['ARS', 'USD']);
    expenses.forEach(e => {
      if (e.currency) list.add(e.currency);
    });
    return Array.from(list);
  }, [expenses]);

  const handleCategoryToggle = (cat: string) => {
    const current = filters.categories || [];
    if (current.includes(cat)) {
      setFilters({ categories: current.filter(c => c !== cat) });
    } else {
      setFilters({ categories: [...current, cat] });
    }
  };

  const handleCurrencyToggle = (cur: string) => {
    const current = filters.currencies || [];
    if (current.includes(cur)) {
      setFilters({ currencies: current.filter(c => c !== cur) });
    } else {
      setFilters({ currencies: [...current, cur] });
    }
  };

  return (
    <div className="space-y-3">
      {/* Primary search bar + Filter toggle row */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-white/40">🔍</span>
          <input
            type="text"
            placeholder={t.searchPlaceholder}
            value={filters.search}
            onChange={e => setFilters({ search: e.target.value })}
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-white placeholder-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-colors"
          />
          {filters.search && (
            <button
              onClick={() => setFilters({ search: '' })}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white text-xs cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`px-4 py-2.5 rounded-xl border text-sm font-medium transition-all duration-200 flex items-center gap-2 cursor-pointer
            ${isOpen 
              ? 'bg-indigo-500/10 border-indigo-500/50 text-indigo-300' 
              : activeCount > 0
                ? 'bg-indigo-500/20 border-indigo-500/30 text-white'
                : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
            }`}
        >
          <span>⚡</span>
          <span>{t.filtersBtn}</span>
          {activeCount > 0 && (
            <span className="bg-indigo-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-5 text-center animate-pulse-soft">
              {activeCount}
            </span>
          )}
        </button>
      </div>

      {/* Advanced collapsible panel */}
      {isOpen && (
        <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-5 space-y-5 shadow-2xl shadow-black/40 animate-fade-in">
          {/* Section 1: Categories (Chips) */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider">{t.categories}</h3>
            <div className="flex flex-wrap gap-1.5">
              {customCategories.map(cat => {
                const isActive = filters.categories?.includes(cat);
                const color = CATEGORY_COLORS[cat] || '#6b7280';
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => handleCategoryToggle(cat)}
                    style={{
                      borderColor: isActive ? `${color}50` : 'transparent',
                      backgroundColor: isActive ? `${color}20` : 'rgba(255,255,255,0.03)',
                      color: isActive ? color : 'rgba(255,255,255,0.6)',
                    }}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-medium transition-all duration-150 hover:bg-white/5 cursor-pointer`}
                  >
                    <span>{isLocalMode ? (CATEGORY_TRANSLATIONS[cat] || cat) : cat}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2: Currencies & Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Currencies */}
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider">{t.currencies}</h3>
              <div className="flex flex-wrap gap-2">
                {availableCurrencies.map(cur => {
                  const isActive = filters.currencies?.includes(cur);
                  return (
                    <button
                      key={cur}
                      type="button"
                      onClick={() => handleCurrencyToggle(cur)}
                      className={`px-4 py-1.5 rounded-xl border text-xs font-semibold transition-all duration-150 cursor-pointer
                        ${isActive 
                          ? 'bg-emerald-500/25 border-emerald-500/50 text-emerald-300' 
                          : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                        }`}
                    >
                      {cur}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Receipt Details Toggle */}
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider">{t.receiptDetails}</h3>
              <div className="flex rounded-xl bg-black/20 p-1 border border-white/5 max-w-sm">
                <button
                  type="button"
                  onClick={() => setFilters({ hasReceiptDetails: null })}
                  className={`flex-1 text-center py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer
                    ${filters.hasReceiptDetails === null 
                      ? 'bg-white/10 text-white' 
                      : 'text-white/60 hover:text-white'
                    }`}
                >
                  {t.all}
                </button>
                <button
                  type="button"
                  onClick={() => setFilters({ hasReceiptDetails: true })}
                  className={`flex-1 text-center py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer
                    ${filters.hasReceiptDetails === true 
                      ? 'bg-white/10 text-white' 
                      : 'text-white/60 hover:text-white'
                    }`}
                >
                  {t.withDetails}
                </button>
                <button
                  type="button"
                  onClick={() => setFilters({ hasReceiptDetails: false })}
                  className={`flex-1 text-center py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer
                    ${filters.hasReceiptDetails === false 
                      ? 'bg-white/10 text-white' 
                      : 'text-white/60 hover:text-white'
                    }`}
                >
                  {t.withoutDetails}
                </button>
              </div>
            </div>
          </div>

          {/* Section 3: Amount Range & Date Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Amount Range */}
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider">{t.amountRange}</h3>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-white/30">$</span>
                  <input
                    type="number"
                    placeholder={t.minAmount}
                    value={filters.minAmount}
                    onChange={e => setFilters({ minAmount: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-7 pr-3 py-2 text-white placeholder-white/20 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                  />
                </div>
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-white/30">$</span>
                  <input
                    type="number"
                    placeholder={t.maxAmount}
                    value={filters.maxAmount}
                    onChange={e => setFilters({ maxAmount: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-7 pr-3 py-2 text-white placeholder-white/20 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                  />
                </div>
              </div>
            </div>

            {/* Date Range */}
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider">{t.dateRange}</h3>
              <div className="flex gap-2">
                <div className="flex-1 flex items-center gap-1.5">
                  <span className="text-[10px] text-white/40 uppercase font-mono">{t.startDate}</span>
                  <input
                    type="date"
                    value={filters.startDate}
                    onChange={e => setFilters({ startDate: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-2 py-1.5 text-white text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                  />
                </div>
                <div className="flex-1 flex items-center gap-1.5">
                  <span className="text-[10px] text-white/40 uppercase font-mono">{t.endDate}</span>
                  <input
                    type="date"
                    value={filters.endDate}
                    onChange={e => setFilters({ endDate: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-2 py-1.5 text-white text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Sort options & Footer Buttons */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-3 border-t border-white/10">
            {/* Sorting */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-white/50 uppercase tracking-wider">{t.sortBy}:</span>
              <select
                value={filters.sortBy}
                onChange={e => setFilters({ sortBy: e.target.value as any })}
                className="bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-white text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500/50 cursor-pointer"
              >
                <option value="date_desc" className="bg-[#14122d]">{t.dateDesc}</option>
                <option value="date_asc" className="bg-[#14122d]">{t.dateAsc}</option>
                <option value="amount_desc" className="bg-[#14122d]">{t.amountDesc}</option>
                <option value="amount_asc" className="bg-[#14122d]">{t.amountAsc}</option>
              </select>
            </div>

            {/* Clear & Close */}
            <div className="flex items-center gap-2 self-end sm:self-auto">
              {activeCount > 0 && (
                <Button variant="ghost" size="sm" onClick={resetFilters}>
                  {t.clearFilters}
                </Button>
              )}
              <Button variant="secondary" size="sm" onClick={() => setIsOpen(false)}>
                {t.close}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

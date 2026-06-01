import { useExpenseStore } from '@/store/expenseStore';
import { useUiStore } from '@/store/uiStore';
import { Input, Select } from '@/components/UI/Input';
import { EXPENSE_CATEGORIES } from '@/types';
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

export default function ExpenseFilters() {
  const isLocalMode = useUiStore(s => s.isLocalMode);
  const { filters, setFilters, resetFilters } = useExpenseStore();

  const hasActive = filters.search || filters.category || filters.startDate || filters.endDate;

  return (
    <div className="space-y-3">
      <Input
        placeholder={isLocalMode ? 'Buscar por comercio o nota...' : 'Search merchant or description...'}
        value={filters.search}
        onChange={e => setFilters({ search: e.target.value })}
        icon="🔍"
      />
      <div className="grid grid-cols-2 gap-3">
        <Select
          value={filters.category}
          onChange={v => setFilters({ category: v as typeof filters.category })}
          options={[
            { value: '', label: isLocalMode ? 'Todas las categorías' : 'All categories' },
            ...EXPENSE_CATEGORIES.map(c => ({ 
              value: c, 
              label: isLocalMode ? (CATEGORY_TRANSLATIONS[c] || c) : c 
            })),
          ]}
        />
        <div className="flex gap-2">
          <Input
            type="date"
            value={filters.startDate}
            onChange={e => setFilters({ startDate: e.target.value })}
            className="text-xs"
          />
        </div>
      </div>
      {hasActive && (
        <Button variant="ghost" size="sm" onClick={resetFilters}>
          {isLocalMode ? 'Limpiar filtros ✕' : 'Clear filters ✕'}
        </Button>
      )}
    </div>
  );
}

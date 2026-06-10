import { useState, useMemo } from 'react';
import { useUiStore } from '@/store/uiStore';
import { useAuthStore } from '@/store/authStore';
import { useExpenseStore } from '@/store/expenseStore';
import { CURRENCY_OPTIONS } from '@/utils/constants';
import { Input, Select } from '@/components/UI/Input';
import Button from '@/components/UI/Button';
import { formatCurrency, formatDate } from '@/utils/formatters';
import LoadingSpinner from '@/components/UI/LoadingSpinner';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  selectedMonth: number;
  selectedYear: number;
  onAddIncome: (data: { amount: string; currency: string; merchant: string; paidBy: string }) => Promise<void>;
  onDeleteIncome: (id: string) => Promise<void>;
}

export default function IncomeModal({
  isOpen,
  onClose,
  selectedMonth,
  selectedYear,
  onAddIncome,
  onDeleteIncome
}: Props) {
  const isLocalMode = useUiStore(s => s.isLocalMode);
  const { user } = useAuthStore();
  const expenses = useExpenseStore(s => s.expenses);

  const [merchant, setMerchant] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState(isLocalMode ? 'ARS' : 'USD');
  const [paidBy, setPaidBy] = useState(user?.name || '');
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Filter incomes and compute totals for selected month/year
  const { incomes, totalIncome, totalSpentConfirmed, available } = useMemo(() => {
    const start = new Date(selectedYear, selectedMonth, 1);
    const end = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59);

    const monthExpenses = expenses.filter(e => {
      try {
        const d = new Date(e.timestamp);
        return d >= start && d <= end;
      } catch {
        return false;
      }
    });

    const monthIncomes = monthExpenses.filter(e => e.category === 'Ingreso');
    const spentConfirmed = monthExpenses.filter(e => e.category !== 'Ingreso' && e.status !== 'pending');

    const totalInc = monthIncomes.reduce((sum, e) => sum + e.amount, 0);
    const totalSpentConf = spentConfirmed.reduce((sum, e) => sum + e.amount, 0);

    return {
      incomes: monthIncomes,
      totalIncome: totalInc,
      totalSpentConfirmed: totalSpentConf,
      available: totalInc - totalSpentConf
    };
  }, [expenses, selectedMonth, selectedYear]);

  // Compute family members list for dropdown
  const familyMembers = useMemo(() => {
    const names = new Set<string>();
    if (user?.name) names.add(user.name);
    expenses.forEach(e => {
      if (e.userName) names.add(e.userName);
    });
    return Array.from(names);
  }, [expenses, user?.name]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount.trim() || !merchant.trim()) return;

    setLoading(true);
    try {
      await onAddIncome({
        amount: amount.trim(),
        currency,
        merchant: merchant.trim(),
        paidBy: paidBy || user?.name || 'Tú'
      });
      setAmount('');
      setMerchant('');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await onDeleteIncome(id);
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto backdrop-blur-2xl bg-slate-900/90 border border-white/10 rounded-3xl shadow-2xl p-6 flex flex-col space-y-6 text-white animate-scale-up">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold bg-gradient-to-r from-emerald-300 to-teal-400 bg-clip-text text-transparent">
              {isLocalMode ? 'Gestión de Ingresos' : 'Income & Budget'}
            </h2>
            <p className="text-xs text-white/40 mt-1">
              {isLocalMode 
                ? 'Administrá tus ingresos del mes para calcular el disponible.'
                : 'Manage your monthly incomes to calculate the available budget.'}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="h-8 w-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Dashboard Financial Summary */}
        <div className="grid grid-cols-3 gap-3 p-4 bg-white/5 border border-white/5 rounded-3xl text-center">
          <div>
            <p className="text-[10px] uppercase font-bold text-white/40">{isLocalMode ? 'Ingresos' : 'Income'}</p>
            <p className="text-sm font-bold text-emerald-400 mt-1">
              {formatCurrency(totalIncome, currency)}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-white/40">{isLocalMode ? 'Gastos Pagos' : 'Paid Expenses'}</p>
            <p className="text-sm font-bold text-red-400 mt-1">
              -{formatCurrency(totalSpentConfirmed, currency)}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-white/40">{isLocalMode ? 'Disponible' : 'Available'}</p>
            <p className={`text-sm font-bold mt-1 ${available >= 0 ? 'text-indigo-300' : 'text-rose-400'}`}>
              {formatCurrency(available, currency)}
            </p>
          </div>
        </div>

        {/* Incomes List */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-white/50">
            {isLocalMode ? 'Ingresos Registrados' : 'Registered Incomes'} ({incomes.length})
          </h3>
          {incomes.length === 0 ? (
            <div className="bg-white/5 border border-white/5 rounded-2xl p-6 text-center text-white/30 text-xs">
              <p className="text-2xl mb-1">💵</p>
              <p>{isLocalMode ? 'No cargaste ningún ingreso este mes.' : 'No income registered this month.'}</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
              {incomes.map(inc => (
                <div key={inc.id} className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-2xl">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-white/95 truncate">{inc.merchant}</p>
                    <p className="text-[10px] text-white/40 mt-0.5 flex flex-wrap gap-x-2">
                      <span>👤 {inc.userName || inc.paidBy}</span>
                      <span>📅 {formatDate(inc.timestamp)}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-3 ml-2">
                    <p className="text-sm font-bold text-emerald-400 whitespace-nowrap">
                      + {formatCurrency(inc.amount, inc.currency)}
                    </p>
                    <button
                      disabled={deletingId === inc.id}
                      onClick={() => handleDelete(inc.id)}
                      className="text-white/30 hover:text-red-400 p-1 transition-colors"
                      title={isLocalMode ? 'Eliminar' : 'Delete'}
                    >
                      {deletingId === inc.id ? <LoadingSpinner size="sm" /> : '🗑️'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add New Income Form */}
        <form onSubmit={handleSubmit} className="bg-white/5 border border-white/5 rounded-3xl p-4 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-white/50">
            {isLocalMode ? 'Nuevo Ingreso' : 'New Income'}
          </h3>
          
          <div className="grid grid-cols-2 gap-3">
            <Input
              label={isLocalMode ? 'Detalle' : 'Detail'}
              placeholder={isLocalMode ? 'Ej. Sueldo, Freelance' : 'e.g. Salary, Freelance'}
              value={merchant}
              onChange={e => setMerchant(e.target.value)}
              required
            />
            <div className="grid grid-cols-2 gap-2">
              <Input
                label={isLocalMode ? 'Monto' : 'Amount'}
                type="number"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                required
              />
              <Select
                label={isLocalMode ? 'Moneda' : 'Currency'}
                value={currency}
                onChange={setCurrency}
                options={CURRENCY_OPTIONS.map(c => ({ value: c, label: c }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Select
              label={isLocalMode ? 'Recibido por:' : 'Received By:'}
              value={paidBy}
              onChange={setPaidBy}
              options={[
                ...familyMembers.map(name => ({ value: name, label: name })),
                { value: 'custom', label: isLocalMode ? '+ Agregar otro...' : '+ Add other...' }
              ]}
            />
          </div>

          {paidBy === 'custom' && (
            <div className="animate-fade-in">
              <Input
                label={isLocalMode ? 'Nombre de persona' : 'Person Name'}
                placeholder={isLocalMode ? 'Nombre...' : 'Name...'}
                value=""
                onChange={e => setPaidBy(e.target.value)}
                required
              />
            </div>
          )}

          <Button type="submit" variant="primary" className="w-full" loading={loading}>
            {isLocalMode ? '＋ Cargar Ingreso' : '＋ Load Income'}
          </Button>
        </form>
      </div>
    </div>
  );
}

import { useState, useMemo } from 'react';
import { useUiStore } from '@/store/uiStore';
import { useAuthStore } from '@/store/authStore';
import { useExpenseStore } from '@/store/expenseStore';
import { CURRENCY_OPTIONS } from '@/utils/constants';
import { Input, Select } from '@/components/UI/Input';
import Button from '@/components/UI/Button';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (templates: any[]) => Promise<number>;
}

export default function FixedExpensesModal({ isOpen, onClose, onGenerate }: Props) {
  const isLocalMode = useUiStore(s => s.isLocalMode);
  const { user } = useAuthStore();
  const expenses = useExpenseStore(s => s.expenses);
  const customCategories = useExpenseStore(s => s.customCategories);

  // Load templates from localStorage
  const [templates, setTemplates] = useState<any[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('expense_tracker_fixed_templates') ?? '[]');
    } catch {
      return [];
    }
  });

  // Form states
  const [merchant, setMerchant] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState(isLocalMode ? 'ARS' : 'USD');
  const [category, setCategory] = useState('Gasto fijo');
  const [paidBy, setPaidBy] = useState(user?.name || '');
  const [paymentMethod, setPaymentMethod] = useState('Debito');
  const [isGenerating, setIsGenerating] = useState(false);

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

  const handleAddTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!merchant.trim() || !amount.trim()) return;

    const newTemplate = {
      id: Math.random().toString(36).substring(2, 9),
      merchant: merchant.trim(),
      amount: amount.trim(),
      currency,
      category,
      paidBy: paidBy || user?.name || '',
      paymentMethod
    };

    const updated = [...templates, newTemplate];
    setTemplates(updated);
    localStorage.setItem('expense_tracker_fixed_templates', JSON.stringify(updated));

    // Reset form fields
    setMerchant('');
    setAmount('');
  };

  const handleDeleteTemplate = (id: string) => {
    const updated = templates.filter(t => t.id !== id);
    setTemplates(updated);
    localStorage.setItem('expense_tracker_fixed_templates', JSON.stringify(updated));
  };

  const handleGenerateClick = async () => {
    if (templates.length === 0) return;
    setIsGenerating(true);
    try {
      await onGenerate(templates);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsGenerating(false);
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
            <h2 className="text-xl font-bold bg-gradient-to-r from-indigo-200 to-indigo-400 bg-clip-text text-transparent">
              {isLocalMode ? 'Configurar Gastos Fijos' : 'Manage Fixed Expenses'}
            </h2>
            <p className="text-xs text-white/40 mt-1">
              {isLocalMode 
                ? 'Definí los gastos recurrentes mensuales para cargarlos en estado pendiente.'
                : 'Define recurring monthly expenses to initialize them as pending.'}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="h-8 w-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Templates List */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-white/50">
            {isLocalMode ? 'Gastos Fijos Guardados' : 'Saved Fixed Expenses'} ({templates.length})
          </h3>
          {templates.length === 0 ? (
            <div className="bg-white/5 border border-white/5 rounded-2xl p-6 text-center text-white/30 text-xs">
              <p className="text-2xl mb-1">🏠</p>
              <p>{isLocalMode ? 'No hay gastos fijos configurados aún.' : 'No fixed expenses configured yet.'}</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {templates.map(t => (
                <div key={t.id} className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-2xl">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-white/90 truncate">{t.merchant}</p>
                    <p className="text-[10px] text-white/40 mt-0.5 flex flex-wrap gap-x-2">
                      <span>📂 {t.category}</span>
                      <span>👤 {t.paidBy}</span>
                      <span>💳 {t.paymentMethod}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-3 ml-2">
                    <p className="text-sm font-bold text-indigo-300 whitespace-nowrap">
                      {t.currency} {parseFloat(t.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>
                    <button
                      onClick={() => handleDeleteTemplate(t.id)}
                      className="text-white/30 hover:text-red-400 p-1 transition-colors"
                      title={isLocalMode ? 'Eliminar' : 'Delete'}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Form to Add New Template */}
        <form onSubmit={handleAddTemplate} className="bg-white/5 border border-white/5 rounded-3xl p-4 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-white/50">
            {isLocalMode ? 'Nuevo Gasto Fijo Template' : 'New Fixed Expense Template'}
          </h3>
          
          <div className="grid grid-cols-2 gap-3">
            <Input
              label={isLocalMode ? 'Comercio / Detalle' : 'Merchant / Detail'}
              placeholder={isLocalMode ? 'Ej. Seguro Auto' : 'e.g. Car Insurance'}
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

          <div className="grid grid-cols-3 gap-3">
            <Select
              label={isLocalMode ? 'Categoría' : 'Category'}
              value={category}
              onChange={setCategory}
              options={customCategories.filter(c => c !== 'Ingreso').map(c => ({ value: c, label: c }))}
            />
            <Select
              label={isLocalMode ? 'Paga:' : 'Paid By:'}
              value={paidBy}
              onChange={setPaidBy}
              options={[
                ...familyMembers.map(name => ({ value: name, label: name })),
                { value: 'custom', label: isLocalMode ? '+ Agregar otro...' : '+ Add other...' }
              ]}
            />
            <Select
              label={isLocalMode ? 'Medio Pago:' : 'Payment Method:'}
              value={paymentMethod}
              onChange={setPaymentMethod}
              options={[
                { value: 'Tarjeta P', label: 'Tarjeta P' },
                { value: 'Tarjeta S', label: 'Tarjeta S' },
                { value: 'Transferencia', label: 'Transferencia' },
                { value: 'Cash', label: 'Cash' },
                { value: 'Debito', label: 'Débito' }
              ]}
            />
          </div>

          {/* Custom user name input if 'custom' is selected */}
          {paidBy === 'custom' && (
            <div className="animate-fade-in">
              <Input
                label={isLocalMode ? 'Nombre de persona' : 'Person Name'}
                placeholder={isLocalMode ? 'Nombre...' : 'Name...'}
                value=""
                onChange={e => {
                  const val = e.target.value;
                  setPaidBy(val);
                }}
                required
              />
            </div>
          )}

          <Button type="submit" variant="secondary" className="w-full">
            {isLocalMode ? '＋ Agregar a la lista' : '＋ Add to list'}
          </Button>
        </form>

        {/* Generate Button */}
        {templates.length > 0 && (
          <Button
            type="button"
            variant="primary"
            className="w-full py-3 text-base"
            loading={isGenerating}
            onClick={handleGenerateClick}
          >
            🚀 {isLocalMode ? 'Generar Consumos Pendientes este Mes' : 'Generate Pending Expenses for this Month'}
          </Button>
        )}
      </div>
    </div>
  );
}

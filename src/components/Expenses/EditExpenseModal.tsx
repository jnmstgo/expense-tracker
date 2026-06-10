import { useState, useMemo } from 'react';
import { useUiStore } from '@/store/uiStore';
import { useAuthStore } from '@/store/authStore';
import { useExpenseStore } from '@/store/expenseStore';
import { CURRENCY_OPTIONS } from '@/utils/constants';
import { Input, Select, TextArea } from '@/components/UI/Input';
import Button from '@/components/UI/Button';
import type { Expense } from '@/types';

interface Props {
  isOpen: boolean;
  expense: Expense;
  onClose: () => void;
  onSave: (id: string, updatedFields: any) => Promise<void>;
}

export default function EditExpenseModal({ isOpen, expense, onClose, onSave }: Props) {
  const isLocalMode = useUiStore(s => s.isLocalMode);
  const { user } = useAuthStore();
  const expenses = useExpenseStore(s => s.expenses);
  const customCategories = useExpenseStore(s => s.customCategories);

  // Form states initialized from existing expense
  const [merchant, setMerchant] = useState(expense.merchant);
  const [amount, setAmount] = useState(String(expense.amount));
  const [currency, setCurrency] = useState(expense.currency);
  const [category, setCategory] = useState(expense.category);
  const [description, setDescription] = useState(expense.description || '');
  const [paidBy, setPaidBy] = useState(expense.userName || expense.paidBy || '');
  const [paymentMethod, setPaymentMethod] = useState(expense.paymentMethod || 'Cash');
  const [saving, setSaving] = useState(false);
  const [isCustomPaidBy, setIsCustomPaidBy] = useState(false);

  // Compute family members list for dropdown
  const familyMembers = useMemo(() => {
    const names = new Set<string>();
    if (user?.name) names.add(user.name);
    expenses.forEach(e => {
      if (e.userName) names.add(e.userName);
      if (e.paidBy) names.add(e.paidBy);
    });
    return Array.from(names);
  }, [expenses, user?.name]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!merchant.trim() || !amount.trim()) return;

    setSaving(true);
    try {
      const updatedFields = {
        merchant: merchant.trim(),
        amount: parseFloat(amount),
        currency,
        category,
        description: description.trim(),
        userName: paidBy || user?.name || null,
        paidBy: paidBy || user?.name || null,
        paymentMethod
      };
      await onSave(expense.id, updatedFields);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handlePaidByChange = (val: string) => {
    if (val === 'custom') {
      setIsCustomPaidBy(true);
      setPaidBy('');
    } else {
      setIsCustomPaidBy(false);
      setPaidBy(val);
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
      <div className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto backdrop-blur-2xl bg-slate-900/95 border border-white/10 rounded-3xl shadow-2xl p-6 flex flex-col space-y-6 text-white animate-scale-up">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold bg-gradient-to-r from-indigo-200 to-indigo-400 bg-clip-text text-transparent">
              {isLocalMode ? 'Editar Consumo' : 'Edit Expense'}
            </h2>
            <p className="text-xs text-white/40 mt-1">
              {isLocalMode ? 'Modificá los detalles del consumo registrado.' : 'Modify the details of the logged expense.'}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="h-8 w-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Edit Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
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

          <Input
            label={isLocalMode ? 'Comercio / Proveedor' : 'Merchant'}
            placeholder={isLocalMode ? '¿Dónde gastaste?' : 'Where did you spend?'}
            value={merchant}
            onChange={e => setMerchant(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Select
              label={isLocalMode ? 'Categoría' : 'Category'}
              value={category}
              onChange={setCategory}
              options={customCategories.filter(c => c !== 'Ingreso').map(c => ({ value: c, label: c }))}
            />
            <Select
              label={isLocalMode ? 'Medio de Pago:' : 'Payment Method:'}
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

          <div className="grid grid-cols-2 gap-3">
            <Select
              label={isLocalMode ? 'Pago:' : 'Paid By:'}
              value={isCustomPaidBy ? 'custom' : paidBy}
              onChange={handlePaidByChange}
              options={[
                ...familyMembers.map(name => ({ value: name, label: name })),
                { value: 'custom', label: isLocalMode ? '+ Agregar miembro...' : '+ Add member...' }
              ]}
            />
          </div>

          {isCustomPaidBy && (
            <div className="animate-fade-in">
              <Input
                label={isLocalMode ? 'Nombre del miembro' : 'Member Name'}
                placeholder={isLocalMode ? 'Ingresá el nombre...' : 'Enter name...'}
                value={paidBy}
                onChange={e => setPaidBy(e.target.value)}
                required
              />
            </div>
          )}

          <TextArea
            label={isLocalMode ? 'Descripción (opcional)' : 'Description (optional)'}
            placeholder={isLocalMode ? 'Agregar notas...' : 'Add notes...'}
            value={description}
            onChange={e => setDescription(e.target.value)}
          />

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-white/10">
            <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
              {isLocalMode ? 'Cancelar' : 'Cancel'}
            </Button>
            <Button type="submit" variant="primary" className="flex-1" loading={saving}>
              {isLocalMode ? 'Guardar Cambios' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

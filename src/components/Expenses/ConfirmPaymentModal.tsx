import { useUiStore } from '@/store/uiStore';
import type { Expense } from '@/types';
import { formatCurrency, formatDate } from '@/utils/formatters';
import Button from '@/components/UI/Button';

interface Props {
  isOpen: boolean;
  expense: Expense;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

const CATEGORY_EMOJIS: Record<string, string> = {
  'Gasto fijo':      '🏠',
  'Dietetica':       '🌾',
  'Verdu':           '🥦',
  'Bohe':            '🍻',
  'Formación':       '🎓',
  'Gasto extra':     '🎁',
  'Pendiente':       '⏳',
  'Azu/Vida':        '💙',
  'Perris':          '🐶',
  'Tarjetas':        '💳',
  'Salud integral':  '🌱',
  'Super':           '🛒',
  'Transferencia':   '💸',
  'Ingreso':         '💵'
};

export default function ConfirmPaymentModal({ isOpen, expense, onClose, onConfirm }: Props) {
  const isLocalMode = useUiStore(s => s.isLocalMode);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    try {
      await onConfirm();
      onClose();
    } catch (err) {
      console.error(err);
    }
  };

  const emoji = CATEGORY_EMOJIS[expense.category] ?? '💳';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Content */}
      <div className="relative w-full max-w-sm backdrop-blur-2xl bg-slate-900/95 border border-white/10 rounded-3xl shadow-2xl p-6 flex flex-col items-center text-center text-white animate-scale-up">
        <div className="h-16 w-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-3xl mb-4 animate-pulse">
          ⏳
        </div>

        <h3 className="text-lg font-bold text-white/90">
          {isLocalMode ? 'Confirmar Pago de Consumo' : 'Confirm Payment'}
        </h3>
        <p className="text-xs text-white/40 mt-1">
          {isLocalMode ? 'Marcá este gasto como pago para descontarlo del disponible.' : 'Mark this expense as paid.'}
        </p>

        {/* Expense Details */}
        <div className="w-full bg-white/5 border border-white/5 rounded-2xl p-4 my-5 text-left space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-white/40">{isLocalMode ? 'Concepto' : 'Merchant'}</span>
            <span className="font-semibold text-white/95">{expense.merchant}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/40">{isLocalMode ? 'Monto' : 'Amount'}</span>
            <span className="font-bold text-indigo-300">
              {formatCurrency(expense.amount, expense.currency)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/40">{isLocalMode ? 'Categoría' : 'Category'}</span>
            <span className="text-white/80">{emoji} {expense.category}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/40">{isLocalMode ? 'Pagado por' : 'Paid By'}</span>
            <span className="text-white/80">{expense.userName || expense.paidBy || (isLocalMode ? 'Tú' : 'You')}</span>
          </div>
          {expense.paymentMethod && (
            <div className="flex justify-between">
              <span className="text-white/40">{isLocalMode ? 'Medio de Pago' : 'Payment Method'}</span>
              <span className="text-white/80">💳 {expense.paymentMethod}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-white/40">{isLocalMode ? 'Fecha' : 'Date'}</span>
            <span className="text-white/80">{formatDate(expense.timestamp)}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="w-full flex flex-col gap-2">
          <Button
            type="button"
            variant="primary"
            className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-600 border-none text-base"
            onClick={handleConfirm}
          >
            ✅ {isLocalMode ? 'Confirmar Pago' : 'Confirm Payment'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={onClose}
          >
            {isLocalMode ? 'Cancelar' : 'Cancel'}
          </Button>
        </div>
      </div>
    </div>
  );
}

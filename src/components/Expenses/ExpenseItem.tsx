import { useState } from 'react';
import type { Expense } from '@/types';
import { formatCurrency, formatRelative } from '@/utils/formatters';
import { CATEGORY_COLORS } from '@/utils/constants';
import Button from '@/components/UI/Button';
import GlassCard from '@/components/UI/GlassCard';
import { useUiStore } from '@/store/uiStore';

interface Props {
  expense: Expense;
  onDelete: (id: string) => void;
}

const EMOJI: Partial<Record<string, string>> = {
  'Food & Dining': '🍔', 'Transportation': '🚗', 'Shopping': '🛍️',
  'Entertainment': '🎬', 'Healthcare': '🏥', 'Housing': '🏠',
  'Travel': '✈️', 'Education': '📚', 'Business': '💼', 'Other': '💳',
};

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

export default function ExpenseItem({ expense, onDelete }: Props) {
  const isLocalMode = useUiStore(s => s.isLocalMode);
  const [confirming, setConfirming] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  return (
    <GlassCard className="p-4 animate-fade-in">
      <div className="flex flex-col">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div
              className="h-10 w-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
              style={{ background: `${CATEGORY_COLORS[expense.category]}20` }}
            >
              {EMOJI[expense.category] ?? '💳'}
            </div>
            <div>
              <p className="text-sm font-semibold text-white/90">
                {expense.merchant || (isLocalMode ? 'Comercio desconocido' : 'Unknown merchant')}
              </p>
              <p className="text-xs text-white/40 mt-0.5">
                {isLocalMode ? (CATEGORY_TRANSLATIONS[expense.category] || expense.category) : expense.category}
              </p>
              {expense.description && (
                <p className="text-xs text-white/50 mt-1">{expense.description}</p>
              )}
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5">
                <span className="text-xs text-white/30">{formatRelative(expense.timestamp)}</span>
                {expense.city && (
                  <span className="text-xs text-white/30">· 📍 {expense.city}</span>
                )}
                {expense.aiConfidence != null && (
                  <span className="text-xs text-purple-400">· AI {Math.round(expense.aiConfidence * 100)}%</span>
                )}
                {!expense.synced && (
                  <span className="text-xs text-amber-400">
                    · ⏳ {isLocalMode ? 'pendiente' : 'pending'}
                  </span>
                )}
                {expense.items && expense.items.length > 0 && (
                  <button
                    onClick={() => setShowDetails(!showDetails)}
                    className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    · 🧾 {showDetails ? (isLocalMode ? 'Ocultar detalle' : 'Hide details') : (isLocalMode ? 'Ver detalle' : 'View details')}
                  </button>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <p className="text-base font-bold" style={{ color: CATEGORY_COLORS[expense.category] ?? '#fff' }}>
              {formatCurrency(expense.amount, expense.currency)}
            </p>
            {confirming ? (
              <div className="flex gap-1">
                <Button variant="danger" size="sm" onClick={() => onDelete(expense.id)}>
                  {isLocalMode ? 'Eliminar' : 'Delete'}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>
                  {isLocalMode ? 'Cancelar' : 'Cancel'}
                </Button>
              </div>
            ) : (
              <button
                onClick={() => setConfirming(true)}
                className="text-white/30 hover:text-red-400 p-1 rounded transition-colors"
                aria-label="Delete"
              >
                🗑️
              </button>
            )}
          </div>
        </div>

        {/* Collapsible Receipt Items */}
        {showDetails && expense.items && expense.items.length > 0 && (
          <div className="mt-4 pt-3 border-t border-white/10 space-y-2 animate-fade-in">
            <p className="text-xs font-bold text-white/40 uppercase tracking-wider">
              {isLocalMode ? 'Detalle del Ticket' : 'Receipt Details'}
            </p>
            <div className="bg-black/35 rounded-xl p-3 border border-white/5 space-y-1.5 text-xs text-white/80 font-mono">
              {expense.items.map((item, idx) => (
                <div key={idx} className="flex justify-between gap-4">
                  <span className="truncate max-w-[70%]">{item.name}</span>
                  <span className="flex-shrink-0">{formatCurrency(item.price, expense.currency)}</span>
                </div>
               ))}
              <div className="border-t border-dashed border-white/20 my-2 pt-1.5 flex justify-between font-bold text-white">
                <span>TOTAL</span>
                <span>{formatCurrency(expense.amount, expense.currency)}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </GlassCard>
  );
}

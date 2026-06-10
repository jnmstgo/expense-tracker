import { useState } from 'react';
import type { Expense } from '@/types';
import { formatCurrency, formatRelative } from '@/utils/formatters';
import { CATEGORY_COLORS } from '@/utils/constants';
import Button from '@/components/UI/Button';
import GlassCard from '@/components/UI/GlassCard';
import { useUiStore } from '@/store/uiStore';
import { useExpenses } from '@/hooks/useExpenses';
import ConfirmPaymentModal from './ConfirmPaymentModal';
import EditExpenseModal from './EditExpenseModal';

interface Props {
  expense: Expense;
  onDelete: (id: string) => void;
}

const EMOJI: Partial<Record<string, string>> = {
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
  'Ingreso':         '💵',
};

function getMemberEmoji(name: string | null | undefined): string {
  if (!name) return '👤';
  const clean = name.trim().toLowerCase();
  if (clean.includes('juan')) return '🙋‍♂️';
  if (clean.includes('sofi') || clean.includes('sofía')) return '🙋‍♀️';
  if (clean.includes('papa') || clean.includes('papá') || clean.includes('dad')) return '👴';
  if (clean.includes('mama') || clean.includes('mamá') || clean.includes('mom')) return '👩';

  const emojis = ['🧑‍💻', '👩‍💻', '🧑‍🎨', '👩‍🎨', '🧑‍🚀', '👩‍🚀', '🦸‍♂️', '🦸‍♀️', '🥷', '🧙‍♂️', '🧙‍♀️', '🧑‍🍳', '👩‍🍳'];
  let hash = 0;
  for (let i = 0; i < clean.length; i++) {
    hash = clean.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % emojis.length;
  return emojis[index];
}

const CATEGORY_TRANSLATIONS: Record<string, string> = {};

export default function ExpenseItem({ expense, onDelete }: Props) {
  const isLocalMode = useUiStore(s => s.isLocalMode);
  const { updateExpense } = useExpenses();
  const [confirming, setConfirming] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [isConfirmPayModalOpen, setIsConfirmPayModalOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const isPending = expense.status === 'pending';

  return (
    <GlassCard 
      className={[
        "p-4 animate-fade-in transition-all duration-200",
        isPending 
          ? "border-2 border-dashed border-amber-500/60 bg-amber-500/5 hover:bg-amber-500/10 cursor-pointer" 
          : ""
      ].join(" ")}
      onClick={() => {
        if (isPending) {
          setIsConfirmPayModalOpen(true);
        }
      }}
    >
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
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowDetails(!showDetails);
                    }}
                    className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    · 🧾 {showDetails ? (isLocalMode ? 'Ocultar detalle' : 'Hide details') : (isLocalMode ? 'Ver detalle' : 'View details')}
                  </button>
                )}
              </div>

              {/* Paid By & Payment Method Badges */}
              <div className="flex flex-wrap gap-2 mt-2">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[10px] text-white/70">
                  <span>{getMemberEmoji(expense.userName || expense.paidBy)}</span>
                  <span>{expense.userName || expense.paidBy || (isLocalMode ? 'Tú' : 'You')}</span>
                </span>
                {expense.paymentMethod && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-[10px] text-indigo-300">
                    <span>💳</span>
                    <span>{expense.paymentMethod}</span>
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
            {expense.category === 'Ingreso' ? (
              <p className="text-base font-bold text-emerald-400">
                + {formatCurrency(expense.amount, expense.currency)}
              </p>
            ) : (
              <p className="text-base font-bold text-white/95">
                - {formatCurrency(expense.amount, expense.currency)}
              </p>
            )}
            
            {isPending && (
              <span className="text-[10px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                {isLocalMode ? 'Pendiente' : 'Pending'}
              </span>
            )}

            {confirming ? (
              <div className="flex gap-1 mt-1">
                <Button variant="danger" size="sm" onClick={() => onDelete(expense.id)}>
                  {isLocalMode ? 'Eliminar' : 'Delete'}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>
                  {isLocalMode ? 'Cancelar' : 'Cancel'}
                </Button>
              </div>
            ) : (
              <div className="relative">
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="text-white/40 hover:text-white/80 p-1 rounded transition-colors text-lg font-bold w-8 h-8 flex items-center justify-center cursor-pointer"
                  aria-label="Options"
                >
                  ⋮
                </button>

                {isMenuOpen && (
                  <>
                    {/* Click-away backdrop */}
                    <div className="fixed inset-0 z-10" onClick={() => setIsMenuOpen(false)} />
                    
                    <div className="absolute right-0 mt-1 w-44 bg-slate-900 border border-white/10 rounded-xl shadow-2xl py-1.5 z-20 backdrop-blur-xl animate-fade-in font-sans">
                      {/* Edit Option */}
                      <button
                        onClick={() => {
                          setIsMenuOpen(false);
                          setIsEditModalOpen(true);
                        }}
                        className="w-full text-left px-4 py-2 text-xs font-semibold text-white/80 hover:bg-white/5 flex items-center gap-2 cursor-pointer"
                      >
                        ✏️ {isLocalMode ? 'Editar consumo' : 'Edit expense'}
                      </button>

                      {/* Pending/Confirmed Toggle Option */}
                      {expense.category !== 'Ingreso' && (
                        <button
                          onClick={() => {
                            setIsMenuOpen(false);
                            updateExpense(expense.id, { status: isPending ? 'confirmed' : 'pending' });
                          }}
                          className="w-full text-left px-4 py-2 text-xs font-semibold text-white/80 hover:bg-white/5 flex items-center gap-2 cursor-pointer"
                        >
                          {isPending 
                            ? '✅ ' + (isLocalMode ? 'Confirmar Pago' : 'Confirm Payment') 
                            : '⏳ ' + (isLocalMode ? 'Marcar pendiente' : 'Set as Pending')}
                        </button>
                      )}

                      <div className="h-[1px] bg-white/10 my-1" />

                      {/* Delete Option */}
                      <button
                        onClick={() => {
                          setIsMenuOpen(false);
                          setConfirming(true);
                        }}
                        className="w-full text-left px-4 py-2 text-xs font-semibold text-rose-400 hover:bg-rose-500/10 flex items-center gap-2 cursor-pointer"
                      >
                        🗑️ {isLocalMode ? 'Eliminar' : 'Delete'}
                      </button>
                    </div>
                  </>
                )}
              </div>
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

      <ConfirmPaymentModal
        isOpen={isConfirmPayModalOpen}
        expense={expense}
        onClose={() => setIsConfirmPayModalOpen(false)}
        onConfirm={() => updateExpense(expense.id, { status: 'confirmed' })}
      />

      <EditExpenseModal
        isOpen={isEditModalOpen}
        expense={expense}
        onClose={() => setIsEditModalOpen(false)}
        onSave={updateExpense}
      />
    </GlassCard>
  );
}

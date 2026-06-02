import { useEffect } from 'react';
import { useUiStore } from '@/store/uiStore';
import { useExpenses } from '@/hooks/useExpenses';
import ExpenseForm from './ExpenseForm';
import type { ExpenseFormData, GeoLocation } from '@/types';

export default function AddExpenseModal() {
  const { isAddModalOpen, closeAddModal } = useUiStore();
  const { addNewExpense } = useExpenses();

  // Close on Escape
  useEffect(() => {
    if (!isAddModalOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') closeAddModal(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isAddModalOpen, closeAddModal]);

  if (!isAddModalOpen) return null;

  const handleSubmit = async (
    data: ExpenseFormData,
    location: GeoLocation | null,
    receiptUrl: string | null,
    aiConfidence: number | null,
    items?: Array<{ name: string; price: number }>
  ) => {
    await addNewExpense(data, location, receiptUrl, aiConfidence, items);
    closeAddModal();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={closeAddModal}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg backdrop-blur-xl bg-white/5 border border-white/10
                      rounded-3xl shadow-2xl shadow-black/50 p-6 animate-slide-up
                      max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-white">Add Expense</h2>
          <button
            onClick={closeAddModal}
            className="text-white/40 hover:text-white/80 transition-colors text-xl leading-none"
          >
            ✕
          </button>
        </div>

        <ExpenseForm onSubmit={handleSubmit} onCancel={closeAddModal} />
      </div>
    </div>
  );
}

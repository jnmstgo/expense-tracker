import { useState } from 'react';
import { useExpenseStore } from '@/store/expenseStore';
import { useExpenses } from '@/hooks/useExpenses';
import { useUiStore } from '@/store/uiStore';
import Button from '@/components/UI/Button';
import { Input } from '@/components/UI/Input';

interface Props {
  onClose: () => void;
}

export default function CategoryManager({ onClose }: Props) {
  const isLocalMode = useUiStore(s => s.isLocalMode);
  const { customCategories } = useExpenseStore();
  const { updateCategories } = useExpenses();
  const [newCat, setNewCat] = useState('');
  const [error, setError] = useState('');

  const handleAdd = () => {
    const trimmed = newCat.trim();
    if (!trimmed) return;
    if (customCategories.includes(trimmed)) {
      setError(isLocalMode ? 'La categoría ya existe' : 'Category already exists');
      return;
    }
    const updated = [...customCategories, trimmed];
    updateCategories(updated);
    setNewCat('');
    setError('');
  };

  const handleDelete = (catName: string) => {
    if (customCategories.length <= 1) {
      setError(isLocalMode ? 'Debes mantener al menos una categoría' : 'Must keep at least one category');
      return;
    }
    const updated = customCategories.filter(c => c !== catName);
    updateCategories(updated);
    setError('');
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4 animate-fade-in">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />

      {/* Modal Container */}
      <div className="relative w-full max-w-md backdrop-blur-2xl bg-slate-950/95 border border-white/10
                      rounded-3xl shadow-2xl shadow-black/85 p-6 animate-slide-up flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <h3 className="text-base font-bold text-white">
            {isLocalMode ? 'Editar Categorías' : 'Edit Categories'}
          </h3>
          <button onClick={onClose} className="text-white/40 hover:text-white/80 transition-colors">
            ✕
          </button>
        </div>

        {/* Add Input */}
        <div className="flex gap-2 mb-4 flex-shrink-0 items-start">
          <div className="flex-1">
            <Input
              placeholder={isLocalMode ? 'Nueva categoría...' : 'New category...'}
              value={newCat}
              onChange={e => setNewCat(e.target.value)}
              error={error}
            />
          </div>
          <Button onClick={handleAdd} className="h-[42px] px-4">
            {isLocalMode ? 'Agregar' : 'Add'}
          </Button>
        </div>

        {/* Scrollable list */}
        <div className="overflow-y-auto flex-1 pr-1 space-y-2 scrollbar-thin">
          {customCategories.map(cat => (
            <div key={cat} className="flex items-center justify-between p-2.5 bg-white/5 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
              <span className="text-sm text-white/90">{cat}</span>
              <button
                onClick={() => handleDelete(cat)}
                className="text-white/30 hover:text-red-400 p-1 text-xs"
                title={isLocalMode ? 'Eliminar' : 'Delete'}
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-3 border-t border-white/10 flex-shrink-0">
          <Button variant="secondary" className="w-full" onClick={onClose}>
            {isLocalMode ? 'Listo' : 'Done'}
          </Button>
        </div>
      </div>
    </div>
  );
}

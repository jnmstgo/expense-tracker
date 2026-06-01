import { useState } from 'react';
import type { ExpenseFormData, ReceiptData, GeoLocation } from '@/types';
import { EXPENSE_CATEGORIES } from '@/types';
import { CURRENCY_OPTIONS } from '@/utils/constants';
import { isValidAmount } from '@/utils/validators';
import { Input, Select, TextArea } from '@/components/UI/Input';
import Button from '@/components/UI/Button';
import ReceiptScanner from './ReceiptScanner';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useUiStore } from '@/store/uiStore';

interface Props {
  onSubmit: (data: ExpenseFormData, location: GeoLocation | null, receiptUrl: string | null, aiConfidence: number | null) => Promise<void>;
  onCancel: () => void;
}

// Translations for expense categories in Spanish (Argentina)
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

export default function ExpenseForm({ onSubmit, onCancel }: Props) {
  const isLocalMode = useUiStore(s => s.isLocalMode);
  const { showNotification } = useUiStore();
  
  // Set default currency to ARS in Local Mode, USD otherwise
  const [form, setForm] = useState<ExpenseFormData>(() => ({
    amount: '',
    currency: isLocalMode ? 'ARS' : 'USD',
    category: 'Other',
    merchant: '',
    description: '',
  }));

  const [errors, setErrors] = useState<Partial<ExpenseFormData>>({});
  const [saving, setSaving] = useState(false);
  const [scanError, setScanErr] = useState<string | null>(null);
  const [aiConfidence, setAiConf] = useState<number | null>(null);
  const { location, isLoading: geoLoading, capture: captureGeo } = useGeolocation();

  const set = (field: keyof ExpenseFormData) =>
    (value: string) => setForm(prev => ({ ...prev, [field]: value }));

  const validate = (): boolean => {
    const errs: Partial<ExpenseFormData> = {};
    if (!isValidAmount(form.amount)) {
      errs.amount = isLocalMode ? 'Ingresá un monto válido' : 'Enter a valid amount';
    }
    if (!form.merchant.trim()) {
      errs.merchant = isLocalMode ? 'El comercio es requerido' : 'Merchant is required';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleScanned = (data: ReceiptData) => {
    setForm(prev => ({
      ...prev,
      merchant:    data.merchant || prev.merchant,
      amount:      String(data.total || prev.amount),
      currency:    data.currency || prev.currency,
    }));
    setAiConf(data.confidence);
    showNotification(
      isLocalMode 
        ? '¡Recibo escaneado! Revisá los campos a continuación.' 
        : 'Receipt scanned! Review the fields below.', 
      'success'
    );
    setScanErr(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      await onSubmit(form, location, null, aiConfidence);
    } finally {
      setSaving(false);
    }
  };

  // Limit currencies to ARS and USD in Local Mode, otherwise show all
  const currencyOptions = isLocalMode ? ['ARS', 'USD'] : CURRENCY_OPTIONS;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Receipt scanner */}
      <div>
        <p className="text-xs font-medium text-white/60 uppercase tracking-wide mb-2">
          {isLocalMode ? 'Escanear Recibo (opcional)' : 'Scan Receipt (optional)'}
        </p>
        <ReceiptScanner
          onScanned={handleScanned}
          onError={msg => setScanErr(msg)}
        />
        {scanError && <p className="text-xs text-red-400 mt-1">{scanError}</p>}
        {aiConfidence != null && (
          <p className="text-xs text-purple-300 mt-1">
            {isLocalMode
              ? `✨ La IA autocompletó los campos con ${Math.round(aiConfidence * 100)}% de confianza`
              : `✨ AI filled fields with ${Math.round(aiConfidence * 100)}% confidence`}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Input
          label={isLocalMode ? 'Monto' : 'Amount'}
          type="number"
          step="0.01"
          min="0.01"
          placeholder="0.00"
          value={form.amount}
          onChange={e => set('amount')(e.target.value)}
          error={errors.amount}
          icon="💰"
        />
        <Select
          label={isLocalMode ? 'Moneda' : 'Currency'}
          value={form.currency}
          onChange={set('currency')}
          options={currencyOptions.map(c => ({ value: c, label: c }))}
        />
      </div>

      <Input
        label={isLocalMode ? 'Comercio / Proveedor' : 'Merchant'}
        placeholder={isLocalMode ? '¿Dónde gastaste?' : 'Where did you spend?'}
        value={form.merchant}
        onChange={e => set('merchant')(e.target.value)}
        error={errors.merchant}
        icon="🏪"
      />

      <Select
        label={isLocalMode ? 'Categoría' : 'Category'}
        value={form.category}
        onChange={v => set('category')(v)}
        options={EXPENSE_CATEGORIES.map(c => ({ 
          value: c, 
          label: isLocalMode ? (CATEGORY_TRANSLATIONS[c] || c) : c 
        }))}
      />

      <TextArea
        label={isLocalMode ? 'Descripción (opcional)' : 'Description (optional)'}
        placeholder={isLocalMode ? 'Agregar notas...' : 'Add notes...'}
        value={form.description}
        onChange={e => set('description')(e.target.value)}
      />

      {/* Geolocation */}
      <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10">
        <div>
          <p className="text-sm text-white/70">
            {location 
              ? `📍 ${location.city}` 
              : (isLocalMode ? '📍 Agregar ubicación' : '📍 Add location')}
          </p>
          {location && (
            <p className="text-xs text-white/30">
              {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
            </p>
          )}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={captureGeo}
          loading={geoLoading}
        >
          {location 
            ? (isLocalMode ? 'Actualizar' : 'Refresh') 
            : (isLocalMode ? 'Obtener ubicación' : 'Get location')}
        </Button>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <Button type="button" variant="secondary" className="flex-1" onClick={onCancel}>
          {isLocalMode ? 'Cancelar' : 'Cancel'}
        </Button>
        <Button type="submit" variant="primary" className="flex-1" loading={saving}>
          {isLocalMode ? 'Guardar Gasto' : 'Save Expense'}
        </Button>
      </div>
    </form>
  );
}

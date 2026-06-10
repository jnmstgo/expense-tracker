import { useState, useEffect, useRef, useMemo } from 'react';
import type { ExpenseFormData, ReceiptData, GeoLocation, Merchant } from '@/types';
import { useExpenseStore } from '@/store/expenseStore';
import { useAuthStore } from '@/store/authStore';
import { useExpenses } from '@/hooks/useExpenses';
import { CURRENCY_OPTIONS } from '@/utils/constants';
import { isValidAmount } from '@/utils/validators';
import { Input, Select, TextArea } from '@/components/UI/Input';
import Button from '@/components/UI/Button';
import ReceiptScanner from './ReceiptScanner';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useUiStore } from '@/store/uiStore';
import CategoryManager from './CategoryManager';

interface Props {
  onSubmit: (
    data: ExpenseFormData,
    location: GeoLocation | null,
    receiptUrl: string | null,
    aiConfidence: number | null,
    items?: Array<{ name: string; price: number }>
  ) => Promise<void>;
  onCancel: () => void;
}

// Translations for expense categories in Spanish (Argentina)
const CATEGORY_TRANSLATIONS: Record<string, string> = {};

export default function ExpenseForm({ onSubmit, onCancel }: Props) {
  const isLocalMode = useUiStore(s => s.isLocalMode);
  const { showNotification } = useUiStore();
  const { merchants, customCategories } = useExpenseStore();
  const { addMerchantToSheets } = useExpenses();
  
  const { user } = useAuthStore();
  const expenses = useExpenseStore(s => s.expenses);
  const familyMembers = useMemo(() => {
    const names = new Set<string>();
    if (user?.name) names.add(user.name);
    expenses.forEach(e => {
      if (e.userName) names.add(e.userName);
      if (e.paidBy) names.add(e.paidBy);
    });
    return Array.from(names);
  }, [expenses, user?.name]);

  const [isCustomPaidBy, setIsCustomPaidBy] = useState(false);

  // Set default currency to ARS in Local Mode, USD otherwise
  const [form, setForm] = useState<ExpenseFormData>(() => ({
    amount: '',
    currency: isLocalMode ? 'ARS' : 'USD',
    category: 'Gasto fijo',
    merchant: '',
    description: '',
    address: '',
    paidBy: user?.name || '',
    paymentMethod: 'Cash',
  }));

  const handlePaidByChange = (val: string) => {
    if (val === 'custom') {
      setIsCustomPaidBy(true);
      setForm(prev => ({ ...prev, paidBy: '' }));
    } else {
      setIsCustomPaidBy(false);
      setForm(prev => ({ ...prev, paidBy: val }));
    }
  };

  const [errors, setErrors] = useState<Partial<ExpenseFormData>>({});
  const [saving, setSaving] = useState(false);
  const [scanError, setScanErr] = useState<string | null>(null);
  const [aiConfidence, setAiConf] = useState<number | null>(null);
  const [items, setItems] = useState<Array<{ name: string; price: number }>>([]);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  
  // Dynamic categories modal state
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);

  // Location states
  const { location: geoLoc, isLoading: geoLoading, capture: captureGeo, clear: clearGeo } = useGeolocation();
  const [selectedLocation, setSelectedLocation] = useState<GeoLocation | null>(null);

  // Autocomplete states
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [filteredMerchants, setFilteredMerchants] = useState<Merchant[]>([]);
  const [saveMerchantCheckbox, setSaveMerchantCheckbox] = useState(true);
  
  const autocompleteRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (geoLoc) {
      setSelectedLocation(geoLoc);
    }
  }, [geoLoc]);

  // Handle click outside to close autocomplete
  useEffect(() => {
    const clickOutside = (e: MouseEvent) => {
      if (autocompleteRef.current && !autocompleteRef.current.contains(e.target as Node)) {
        setShowAutocomplete(false);
      }
    };
    document.addEventListener('mousedown', clickOutside);
    return () => document.removeEventListener('mousedown', clickOutside);
  }, []);

  const set = (field: keyof ExpenseFormData) =>
    (value: string) => {
      setForm(prev => ({ ...prev, [field]: value }));
      
      if (field === 'merchant') {
        const query = value.toLowerCase().trim();
        if (query.length > 0) {
          const matched = merchants.filter(m => m.name.toLowerCase().includes(query));
          setFilteredMerchants(matched);
          setShowAutocomplete(true);
          
          // Check if exact merchant already exists
          const exists = merchants.some(m => m.name.toLowerCase() === query);
          setSaveMerchantCheckbox(!exists);
        } else {
          setFilteredMerchants([]);
          setShowAutocomplete(false);
          setSaveMerchantCheckbox(true);
        }
      }
    };

  const selectMerchant = (m: Merchant) => {
    setForm(prev => ({
      ...prev,
      merchant: m.name,
      category: m.defaultCategory || prev.category
    }));
    if (m.locationLat && m.locationLng) {
      setSelectedLocation({
        lat: m.locationLat,
        lng: m.locationLng,
        city: m.city || ''
      });
    }
    setShowAutocomplete(false);
    setSaveMerchantCheckbox(false);
  };

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
      address:     data.address || prev.address || '',
    }));
    setAiConf(data.confidence);
    if (data.items) {
      setItems(data.items);
    }
    if (data.receiptUrl) {
      setReceiptUrl(data.receiptUrl);
    }
    
    // Check if scanned merchant is new
    if (data.merchant) {
      const exists = merchants.some(m => m.name.toLowerCase() === data.merchant.toLowerCase());
      setSaveMerchantCheckbox(!exists);
    }
    
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
      // Save merchant if needed
      if (saveMerchantCheckbox && form.merchant.trim()) {
        const newMerchant: Merchant = {
          name: form.merchant.trim(),
          defaultCategory: form.category,
          locationLat: selectedLocation?.lat ?? null,
          locationLng: selectedLocation?.lng ?? null,
          city: selectedLocation?.city ?? null
        };
        await addMerchantToSheets(newMerchant);
      }
      
      await onSubmit(form, selectedLocation, receiptUrl, aiConfidence, items);
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
          defaultCurrency={form.currency}
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

      {/* Autocomplete Merchant Input */}
      <div className="relative" ref={autocompleteRef}>
        <Input
          label={isLocalMode ? 'Comercio / Proveedor' : 'Merchant'}
          placeholder={isLocalMode ? '¿Dónde gastaste?' : 'Where did you spend?'}
          value={form.merchant}
          onChange={e => set('merchant')(e.target.value)}
          onFocus={() => {
            if (form.merchant.trim().length > 0) {
              setShowAutocomplete(true);
            }
          }}
          error={errors.merchant}
          icon="🏪"
        />
        {showAutocomplete && filteredMerchants.length > 0 && (
          <div className="absolute z-30 w-full mt-1 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl max-h-48 overflow-y-auto backdrop-blur-xl">
            {filteredMerchants.map(m => (
              <button
                key={m.name}
                type="button"
                onClick={() => selectMerchant(m)}
                className="w-full px-4 py-2.5 hover:bg-white/5 text-sm text-white/90 text-left flex justify-between items-center border-b border-white/5 last:border-b-0"
              >
                <span>{m.name}</span>
                <span className="text-xs text-white/40">
                  {isLocalMode ? (CATEGORY_TRANSLATIONS[m.defaultCategory] || m.defaultCategory) : m.defaultCategory}
                  {m.city && ` · 📍 ${m.city}`}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {saveMerchantCheckbox && form.merchant.trim() && (
        <label className="flex items-center gap-2 text-xs text-white/60 select-none cursor-pointer pl-1 mt-[-8px]">
          <input
            type="checkbox"
            checked={saveMerchantCheckbox}
            onChange={e => setSaveMerchantCheckbox(e.target.checked)}
            className="rounded border-white/20 bg-black/40 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-black"
          />
          {isLocalMode ? 'Guardar comercio para futuras compras' : 'Save merchant for future purchases'}
        </label>
      )}

      {/* Address Input Field */}
      <Input
        label={isLocalMode ? 'Dirección (opcional)' : 'Address (optional)'}
        placeholder={isLocalMode ? 'Dirección del comercio...' : 'Store address...'}
        value={form.address || ''}
        onChange={e => set('address')(e.target.value)}
        icon="📍"
      />

      {/* Select Category with Pencil Edit Button */}
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <Select
            label={isLocalMode ? 'Categoría' : 'Category'}
            value={form.category}
            onChange={v => set('category')(v)}
            options={customCategories.filter(c => c !== 'Ingreso').map(c => ({ 
              value: c, 
              label: isLocalMode ? (CATEGORY_TRANSLATIONS[c] || c) : c 
            }))}
          />
        </div>
        <button
          type="button"
          onClick={() => setIsCategoryManagerOpen(true)}
          className="h-[42px] px-3.5 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl text-white/70 hover:text-white transition-colors"
          title={isLocalMode ? 'Editar Categorías' : 'Edit Categories'}
        >
          ✏️
        </button>
      </div>

      <TextArea
        label={isLocalMode ? 'Descripción (opcional)' : 'Description (optional)'}
        placeholder={isLocalMode ? 'Agregar notas...' : 'Add notes...'}
        value={form.description}
        onChange={e => set('description')(e.target.value)}
      />

      {/* Paid By & Payment Method */}
      <div className="grid grid-cols-2 gap-3">
        <Select
          label={isLocalMode ? 'Pago:' : 'Paid By:'}
          value={isCustomPaidBy ? 'custom' : (form.paidBy || '')}
          onChange={handlePaidByChange}
          options={[
            ...familyMembers.map(name => ({ value: name, label: name })),
            { value: 'custom', label: isLocalMode ? '+ Agregar miembro...' : '+ Add member...' }
          ]}
        />
        <Select
          label={isLocalMode ? 'Medio de Pago:' : 'Payment Method:'}
          value={form.paymentMethod || ''}
          onChange={v => set('paymentMethod')(v)}
          options={[
            { value: 'Tarjeta P', label: 'Tarjeta P' },
            { value: 'Tarjeta S', label: 'Tarjeta S' },
            { value: 'Transferencia', label: 'Transferencia' },
            { value: 'Cash', label: 'Cash' },
            { value: 'Debito', label: 'Débito' }
          ]}
        />
      </div>

      {isCustomPaidBy && (
        <div className="animate-fade-in">
          <Input
            label={isLocalMode ? 'Nombre del miembro' : 'Member Name'}
            placeholder={isLocalMode ? 'Ingresá el nombre...' : 'Enter name...'}
            value={form.paidBy || ''}
            onChange={e => set('paidBy')(e.target.value)}
            icon="👤"
            required
          />
        </div>
      )}

      {/* Geolocation */}
      <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10">
        <div>
          <p className="text-sm text-white/70">
            {selectedLocation 
              ? `📍 ${selectedLocation.city}` 
              : (isLocalMode ? '📍 Agregar ubicación' : '📍 Add location')}
          </p>
          {selectedLocation && (
            <p className="text-xs text-white/30">
              {selectedLocation.lat.toFixed(4)}, {selectedLocation.lng.toFixed(4)}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {selectedLocation && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedLocation(null);
                clearGeo();
              }}
              className="text-red-400 hover:text-red-300"
            >
              ✕
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={captureGeo}
            loading={geoLoading}
          >
            {selectedLocation 
              ? (isLocalMode ? 'Actualizar' : 'Refresh') 
              : (isLocalMode ? 'Obtener ubicación' : 'Get location')}
          </Button>
        </div>
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

      {isCategoryManagerOpen && (
        <CategoryManager onClose={() => setIsCategoryManagerOpen(false)} />
      )}
    </form>
  );
}

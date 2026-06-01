#!/bin/bash

echo "🛠️ Aplicando parche: Offline-first, $ARS, y argentinización..."

# 1. Actualizamos el Store para manejar una "Cola de Sincronización" (Sync Queue)
cat << 'EOF' > src/store/useExpenseStore.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface User {
  name: string;
  email: string;
  picture: string;
  accessToken: string;
  tokenExpiry: number;
}

export interface Expense {
  id: string;
  date: string;
  user: string;
  concept: string;
  amount: number;
  paymentMethod: string;
  itemsJSON: string;
}

interface ExpenseState {
  user: User | null;
  expenses: Expense[];
  syncQueue: Expense[]; // Nueva cola para lo que falta subir a Sheets
  setUser: (user: User | null) => void;
  addExpense: (expense: Expense) => void;
  setExpenses: (expenses: Expense[]) => void;
  removeFromQueue: (ids: string[]) => void;
  logout: () => void;
}

export const useExpenseStore = create<ExpenseState>()(
  persist(
    (set) => ({
      user: null,
      expenses: [],
      syncQueue: [],
      setUser: (user) => set({ user }),
      addExpense: (expense) => set((state) => ({ 
        expenses: [...state.expenses, expense],
        syncQueue: [...state.syncQueue, expense] // Lo mandamos a la cola también
      })),
      setExpenses: (expenses) => set({ expenses }),
      removeFromQueue: (ids) => set((state) => ({
        syncQueue: state.syncQueue.filter(e => !ids.includes(e.id))
      })),
      logout: () => set({ user: null, expenses: [], syncQueue: [] }),
    }),
    { name: 'expense-tracker-storage' }
  )
)
EOF

# 2. Actualizamos el servicio de Sheets para subir en lote y mostrar mejor el error
cat << 'EOF' > src/services/googleSheets.ts
import { Expense } from '@/store/useExpenseStore';

const SHEET_ID = import.meta.env.VITE_GOOGLE_SHEET_ID;

export const appendMultipleExpensesToSheet = async (expenses: Expense[], accessToken: string) => {
  if (expenses.length === 0) return;

  const range = 'Sheet1!A:G'; 
  const values = expenses.map(exp => [
    exp.id, 
    exp.date, 
    exp.user, 
    exp.concept, 
    exp.amount, 
    exp.paymentMethod, 
    exp.itemsJSON
  ]);
  
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${range}:append?valueInputOption=USER_ENTERED`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error('❌ DETALLE DEL ERROR DE GOOGLE SHEETS:', errorData);
    throw new Error(`Error de Sheets: ${errorData.error?.message || 'Desconocido'}`);
  }
  return response.json();
};
EOF

# 3. App.tsx - Agregamos el loop de sincronización cada 5 minutos
cat << 'EOF' > src/App.tsx
import { useState, useEffect } from 'react';
import { useExpenseStore } from '@/store/useExpenseStore';
import Login from '@/components/Login';
import Dashboard from '@/components/Dashboard';
import ExpenseModal from '@/components/ExpenseModal';
import { appendMultipleExpensesToSheet } from '@/services/googleSheets';
import { Plus } from 'lucide-react';

function App() {
  const { user, syncQueue, removeFromQueue } = useExpenseStore();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const isTokenValid = user && user.tokenExpiry > Date.now();

  // Sincronización en segundo plano cada 5 minutos (300000 ms)
  useEffect(() => {
    if (!isTokenValid || syncQueue.length === 0) return;

    const syncData = async () => {
      console.log(`⏳ Intentando sincronizar ${syncQueue.length} gastos con Sheets...`);
      try {
        await appendMultipleExpensesToSheet(syncQueue, user.accessToken);
        // Si sale bien, los sacamos de la cola
        removeFromQueue(syncQueue.map(e => e.id));
        console.log('✅ Sincronización exitosa con Sheets');
      } catch (error) {
        console.error('❌ Falló la sincronización de fondo. Se reintentará luego.', error);
      }
    };

    // Ejecutar al inicio si hay cosas pendientes
    syncData();

    // Luego cada 5 minutos
    const interval = setInterval(syncData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [syncQueue, isTokenValid, user, removeFromQueue]);

  if (!isTokenValid) {
    return <Login />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 relative">
      <Dashboard />
      
      <button 
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-8 right-8 p-4 bg-indigo-600 text-white rounded-2xl shadow-2xl hover:bg-indigo-700 hover:scale-105 hover:-translate-y-1 transition-all z-40"
      >
        <Plus size={32} />
      </button>

      {isModalOpen && <ExpenseModal onClose={() => setIsModalOpen(false)} />}
    </div>
  );
}

export default App;
EOF

# 4. Dashboard.tsx - Traducido y con formato ARS
cat << 'EOF' > src/components/Dashboard.tsx
import { useExpenseStore } from '@/store/useExpenseStore';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { CloudOff, CloudUpload } from 'lucide-react';

export default function Dashboard() {
  const { user, expenses, syncQueue, logout } = useExpenseStore();

  const total = expenses.reduce((acc, curr) => acc + curr.amount, 0);
  
  const dataMap = expenses.reduce((acc, exp) => {
    acc[exp.paymentMethod] = (acc[exp.paymentMethod] || 0) + exp.amount;
    return acc;
  }, {} as Record<string, number>);

  const chartData = Object.keys(dataMap).map(key => ({ name: key, value: dataMap[key] }));
  const COLORS = ['#6366f1', '#ec4899', '#10b981'];

  return (
    <div className="p-6 max-w-4xl mx-auto pb-24">
      <header className="flex justify-between items-center mb-8 bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-4">
          <img src={user?.picture} alt="Perfil" className="w-12 h-12 rounded-full border-2 border-indigo-500" referrerPolicy="no-referrer" />
          <div>
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">Hola, {user?.name}</h2>
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              {syncQueue.length > 0 ? (
                <span className="flex items-center gap-1 text-amber-500"><CloudOff size={14} /> {syncQueue.length} por subir</span>
              ) : (
                <span className="flex items-center gap-1 text-green-500"><CloudUpload size={14} /> Todo sincronizado</span>
              )}
            </div>
          </div>
        </div>
        <button onClick={logout} className="text-sm px-4 py-2 text-red-600 font-semibold bg-red-50 dark:bg-red-500/10 rounded-lg hover:bg-red-100 transition">Cerrar Sesión</button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-8 rounded-3xl shadow-lg text-white flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-medium text-white/80 mb-2">Total Gastos</h3>
            {/* Formato ARS puro */}
            <p className="text-5xl font-bold">$ {total.toLocaleString('es-AR')} ARS</p>
          </div>
          <div className="mt-6 pt-6 border-t border-white/20">
            <p className="text-sm text-white/70">Registros totales: {expenses.length}</p>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 h-64 flex flex-col">
          <h3 className="text-lg font-semibold mb-2 text-gray-800 dark:text-white">Por Medio de Pago</h3>
          {expenses.length === 0 ? (
             <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">Sin datos aún</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={chartData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {chartData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip formatter={(value: number) => `$ ${value.toLocaleString('es-AR')}`} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
EOF

# 5. ExpenseModal.tsx - Sacamos el currency, guardamos solo local y cerramos rápido
cat << 'EOF' > src/components/ExpenseModal.tsx
import React, { useState, useRef } from 'react';
import { Camera, X, Loader2, Save } from 'lucide-react';
import { useExpenseStore, Expense } from '@/store/useExpenseStore';

interface Props {
  onClose: () => void;
}

export default function ExpenseModal({ onClose }: Props) {
  const user = useExpenseStore(state => state.user);
  const addExpense = useExpenseStore(state => state.addExpense);
  
  const [concept, setConcept] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [paymentMethod, setPaymentMethod] = useState('Tarjeta');
  const [itemsJSON, setItemsJSON] = useState('[]');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onloadend = async () => {
        const base64data = reader.result?.toString().split(',')[1];
        
        const response = await fetch('/api/parse-receipt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: base64data })
        });
        
        if (!response.ok) throw new Error('API Error');
        const data = await response.json();
        
        if (data.total) setAmount(data.total);
        if (data.items) setItemsJSON(JSON.stringify(data.items));
        if (data.concept) setConcept(data.concept);
      };
    } catch (error) {
      console.error('Error procesando ticket:', error);
      alert('Error procesando el ticket con IA.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !amount) return;

    const newExpense: Expense = {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      user: user.name,
      concept,
      amount: Number(amount),
      paymentMethod,
      itemsJSON,
    };

    // Guardamos en Zustand (que impacta LocalStorage y lo manda a la cola de sincronización)
    addExpense(newExpense);
    
    // Cerramos el modal inmediatamente, sin esperar a internet
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-3xl p-6 relative shadow-2xl border border-gray-200 dark:border-gray-700">
        <button onClick={onClose} className="absolute top-5 right-5 text-gray-400 hover:text-gray-900 dark:hover:text-white transition">
          <X size={24} />
        </button>
        <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">Nuevo Gasto</h2>
        
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-1.5 text-gray-600 dark:text-gray-300">¿Qué compraste?</label>
            <input required type="text" value={concept} onChange={e => setConcept(e.target.value)} className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-white" placeholder="Ej. Cena, Supermercado, Nafta..." />
          </div>

          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1.5 text-gray-600 dark:text-gray-300">Monto</label>
              {/* Sin el span del $ para que quede limpio como pediste */}
              <input required type="number" step="0.01" value={amount} onChange={e => setAmount(Number(e.target.value))} className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-white" placeholder="0.00" />
            </div>
            <div className="pb-0">
              <button type="button" onClick={() => fileInputRef.current?.click()} className="h-[50px] px-4 rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400 hover:bg-indigo-200 dark:hover:bg-indigo-800 transition flex items-center justify-center font-medium gap-2" disabled={loading}>
                {loading ? <Loader2 className="animate-spin" size={20} /> : <><Camera size={20} /> IA</>}
              </button>
              <input type="file" accept="image/*" capture="environment" ref={fileInputRef} className="hidden" onChange={handleCapture} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5 text-gray-600 dark:text-gray-300">Medio de Pago</label>
            <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-white">
              <option value="Efectivo">💵 Efectivo</option>
              <option value="Tarjeta">💳 Tarjeta</option>
              <option value="Transferencia">🏦 Transferencia / MercadoPago</option>
            </select>
          </div>

          <button type="submit" className="w-full py-3.5 mt-2 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-2">
            <Save size={20} /> Guardar Gasto
          </button>
        </form>
      </div>
    </div>
  );
}
EOF

echo "✅ Listo. Todo actualizado."
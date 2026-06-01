#!/bin/bash

echo "🔄 Ejecutando Hard Reset a los 5 archivos modificados..."

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
  setUser: (user: User | null) => void;
  addExpense: (expense: Expense) => void;
  setExpenses: (expenses: Expense[]) => void;
  logout: () => void;
}

export const useExpenseStore = create<ExpenseState>()(
  persist(
    (set) => ({
      user: null,
      expenses: [],
      setUser: (user) => set({ user }),
      addExpense: (expense) => set((state) => ({ expenses: [...state.expenses, expense] })),
      setExpenses: (expenses) => set({ expenses }),
      logout: () => set({ user: null, expenses: [] }),
    }),
    {
      name: 'expense-tracker-storage',
    }
  )
)
EOF

cat << 'EOF' > src/services/googleSheets.ts
import { Expense } from '@/store/useExpenseStore';

const SHEET_ID = import.meta.env.VITE_GOOGLE_SHEET_ID;

export const appendExpenseToSheet = async (expense: Expense, accessToken: string) => {
  const range = 'Sheet1!A:G'; 
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${range}:append?valueInputOption=USER_ENTERED`;
  
  const body = {
    values: [
      [expense.id, expense.date, expense.user, expense.concept, expense.amount, expense.paymentMethod, expense.itemsJSON]
    ]
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error('Error al guardar en Google Sheets');
  }
  return response.json();
};
EOF

cat << 'EOF' > src/components/Dashboard.tsx
import { useExpenseStore } from '@/store/useExpenseStore';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';

export default function Dashboard() {
  const { user, expenses, logout } = useExpenseStore();

  const total = expenses.reduce((acc, curr) => acc + curr.amount, 0);
  
  // Agrupar por método de pago para el gráfico
  const dataMap = expenses.reduce((acc, exp) => {
    acc[exp.paymentMethod] = (acc[exp.paymentMethod] || 0) + exp.amount;
    return acc;
  }, {} as Record<string, number>);

  const chartData = Object.keys(dataMap).map(key => ({ name: key, value: dataMap[key] }));
  const COLORS = ['#6366f1', '#ec4899', '#10b981'];

  return (
    <div className="p-6 max-w-4xl mx-auto pb-24">
      <header className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <img src={user?.picture} alt="Profile" className="w-12 h-12 rounded-full border-2 border-indigo-500" />
          <div>
            <h2 className="text-xl font-bold">Hola, {user?.name}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Tus finanzas al día</p>
          </div>
        </div>
        <button onClick={logout} className="text-sm text-red-500 font-semibold hover:underline">Salir</button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glassmorphism p-6 rounded-3xl">
          <h3 className="text-lg font-medium mb-2">Total Gastos</h3>
          <p className="text-4xl font-bold text-indigo-600 dark:text-indigo-400">${total.toFixed(2)}</p>
        </div>
        
        <div className="glassmorphism p-6 rounded-3xl h-64 flex flex-col">
          <h3 className="text-lg font-medium mb-2">Por Medio de Pago</h3>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={chartData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                {chartData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <RechartsTooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
EOF

cat << 'EOF' > src/components/ExpenseModal.tsx
import React, { useState, useRef } from 'react';
import { Camera, X, Loader2 } from 'lucide-react';
import { useExpenseStore, Expense } from '@/store/useExpenseStore';
import { appendExpenseToSheet } from '@/services/googleSheets';

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
        
        const data = await response.json();
        if (data.total) setAmount(data.total);
        if (data.items) setItemsJSON(JSON.stringify(data.items));
      };
    } catch (error) {
      console.error('Error parsing receipt:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
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

    try {
      addExpense(newExpense); // Optimistic UI update
      await appendExpenseToSheet(newExpense, user.accessToken);
      onClose();
    } catch (error) {
      console.error('Save failed', error);
      alert('Error guardando en Sheets. Revisa tu token.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="glassmorphism w-full max-w-md rounded-2xl p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 dark:text-gray-300 hover:text-gray-900">
          <X size={24} />
        </button>
        <h2 className="text-2xl font-bold mb-6">Nuevo Gasto</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Concepto</label>
            <input required type="text" value={concept} onChange={e => setConcept(e.target.value)} className="w-full p-2 rounded-lg bg-white/50 dark:bg-black/50 border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Cena, Supermercado..." />
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">Monto</label>
              <input required type="number" step="0.01" value={amount} onChange={e => setAmount(Number(e.target.value))} className="w-full p-2 rounded-lg bg-white/50 dark:bg-black/50 border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="0.00" />
            </div>
            <div className="flex items-end pb-1">
              <button type="button" onClick={() => fileInputRef.current?.click()} className="p-3 rounded-lg bg-indigo-500 text-white hover:bg-indigo-600 transition flex items-center justify-center" disabled={loading}>
                {loading ? <Loader2 className="animate-spin" size={20} /> : <Camera size={20} />}
              </button>
              <input type="file" accept="image/*" capture="environment" ref={fileInputRef} className="hidden" onChange={handleCapture} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Medio de Pago</label>
            <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="w-full p-2 rounded-lg bg-white/50 dark:bg-black/50 border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-indigo-500 outline-none">
              <option value="Efectivo">Efectivo</option>
              <option value="Tarjeta">Tarjeta</option>
              <option value="Transferencia">Transferencia</option>
            </select>
          </div>

          <button type="submit" className="w-full py-3 mt-4 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition shadow-lg">
            Guardar Gasto
          </button>
        </form>
      </div>
    </div>
  );
}
EOF

cat << 'EOF' > src/App.tsx
import { useState } from 'react';
import { useExpenseStore } from '@/store/useExpenseStore';
import Login from '@/components/Login';
import Dashboard from '@/components/Dashboard';
import ExpenseModal from '@/components/ExpenseModal';
import { Plus } from 'lucide-react';

function App() {
  const user = useExpenseStore(state => state.user);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Validación de expiración de token simple
  const isTokenValid = user && user.tokenExpiry > Date.now();

  if (!isTokenValid) {
    return <Login />;
  }

  return (
    <div className="min-h-screen relative">
      <Dashboard />
      
      {/* Floating Action Button */}
      <button 
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-6 right-6 p-4 bg-indigo-600 text-white rounded-full shadow-2xl hover:bg-indigo-700 hover:scale-105 transition-all z-40"
      >
        <Plus size={32} />
      </button>

      {isModalOpen && <ExpenseModal onClose={() => setIsModalOpen(false)} />}
    </div>
  );
}

export default App;
EOF

echo "✅ Listo. Proyecto restaurado a su estado original sin cortes."
import { useMemo, useState, useEffect } from 'react';
import { startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';
import { useExpenseStore } from '@/store/expenseStore';
import { useAuthStore } from '@/store/authStore';
import { useUiStore } from '@/store/uiStore';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { CATEGORY_COLORS } from '@/utils/constants';
import SummaryCard from './SummaryCard';
import GlassCard from '@/components/UI/GlassCard';
import LoadingSpinner from '@/components/UI/LoadingSpinner';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, AreaChart, Area } from 'recharts';

const MONTH_NAMES_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const MONTH_NAMES_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

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
};

export default function Dashboard() {
  const isLocalMode = useUiStore(s => s.isLocalMode);
  const isFamilyMode = useUiStore(s => s.isFamilyMode);
  const toggleFamilyMode = useUiStore(s => s.toggleFamilyMode);
  const setTab = useUiStore(s => s.setTab);
  const { user } = useAuthStore();
  const { expenses, isLoading, setFilters } = useExpenseStore();

  // Date selection states (defaults to current month and year)
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth()); // 0-indexed
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  const [chartDimension, setChartDimension] = useState<'category' | 'member' | 'daily'>('category');
  const [chartType, setChartType] = useState<'pie' | 'bar' | 'area'>('pie');

  useEffect(() => {
    if (!isFamilyMode && chartDimension === 'member') {
      setChartDimension('category');
      setChartType('pie');
    }
  }, [isFamilyMode, chartDimension]);

  const handleDimensionChange = (dim: 'category' | 'member' | 'daily') => {
    setChartDimension(dim);
    if (dim === 'daily') {
      setChartType('bar');
    } else {
      setChartType('pie');
    }
  };

  const monthsList = isLocalMode ? MONTH_NAMES_ES : MONTH_NAMES_EN;
  const yearsList = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return [currentYear - 2, currentYear - 1, currentYear];
  }, []);

  // Filter expenses by current user if Family Mode is inactive
  const filteredExpenses = useMemo(() => {
    if (isFamilyMode) return expenses;
    return expenses.filter(e => e.userId === user?.id);
  }, [expenses, isFamilyMode, user?.id]);

  // Compute monthly statistics based on filtered expenses for selected month & year
  const summary = useMemo(() => {
    const start = startOfMonth(new Date(selectedYear, selectedMonth));
    const end   = endOfMonth(new Date(selectedYear, selectedMonth));

    const inMonth = filteredExpenses.filter(e => {
      try {
        return isWithinInterval(parseISO(e.timestamp), { start, end });
      } catch { return false; }
    });

    const byCategory: Record<string, number> = {};
    let total = 0;

    for (const e of inMonth) {
      total += e.amount;
      byCategory[e.category] = (byCategory[e.category] ?? 0) + e.amount;
    }

    return {
      total,
      count: inMonth.length,
      byCategory,
      currency: inMonth[0]?.currency ?? (isLocalMode ? 'ARS' : 'USD'),
    };
  }, [filteredExpenses, selectedMonth, selectedYear, isLocalMode]);

  // Group members spending for Family Mode chart (filtered by selected month & year)
  const familyChartData = useMemo(() => {
    if (!isFamilyMode) return [];

    const start = startOfMonth(new Date(selectedYear, selectedMonth));
    const end   = endOfMonth(new Date(selectedYear, selectedMonth));

    const inMonth = filteredExpenses.filter(e => {
      try {
        return isWithinInterval(parseISO(e.timestamp), { start, end });
      } catch { return false; }
    });
    
    const groups: Record<string, number> = {};
    for (const e of inMonth) {
      const label = e.userName || (e.userId === user?.id ? user.name : (isLocalMode ? 'Familiar' : 'Family Member'));
      groups[label] = (groups[label] ?? 0) + e.amount;
    }
    
    return Object.entries(groups)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredExpenses, isFamilyMode, selectedMonth, selectedYear, user?.id, user?.name, isLocalMode]);

  const recent = useMemo(
    () => [...filteredExpenses].sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 5),
    [filteredExpenses]
  );

  const categoryData = useMemo(() => {
    return Object.entries(summary.byCategory)
      .map(([name, value]) => ({ name, value: value ?? 0 }))
      .sort((a, b) => b.value - a.value);
  }, [summary.byCategory]);

  const memberData = useMemo(() => {
    return familyChartData;
  }, [familyChartData]);

  const dailyData = useMemo(() => {
    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    const dailyMap: Record<number, number> = {};
    for (let i = 1; i <= daysInMonth; i++) {
      dailyMap[i] = 0;
    }

    const start = startOfMonth(new Date(selectedYear, selectedMonth));
    const end   = endOfMonth(new Date(selectedYear, selectedMonth));

    filteredExpenses.forEach(e => {
      try {
        const date = parseISO(e.timestamp);
        if (isWithinInterval(date, { start, end })) {
          const day = date.getDate();
          dailyMap[day] = (dailyMap[day] ?? 0) + e.amount;
        }
      } catch {}
    });

    return Object.entries(dailyMap).map(([day, value]) => ({
      day: parseInt(day),
      value
    }));
  }, [filteredExpenses, selectedMonth, selectedYear]);

  const MEMBER_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899'];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Label card header dynamically depending on selected month/year vs current date
  const isCurrentMonth = selectedMonth === now.getMonth() && selectedYear === now.getFullYear();
  const summaryLabel = isCurrentMonth
    ? (isLocalMode ? 'Este Mes' : 'This Month')
    : `${monthsList[selectedMonth]} ${selectedYear}`;

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Month / Year Selectors */}
      <div className="grid grid-cols-2 gap-3 p-3 backdrop-blur-xl bg-white/5 rounded-2xl border border-white/10 shadow-lg">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase font-bold text-white/40 tracking-wider">
            {isLocalMode ? 'Mes' : 'Month'}
          </label>
          <select
            value={selectedMonth}
            onChange={e => setSelectedMonth(parseInt(e.target.value))}
            className="bg-black/30 border border-white/10 rounded-xl px-3 py-1.5 text-sm text-white/80 focus:outline-none focus:border-indigo-500"
          >
            {monthsList.map((m, idx) => (
              <option key={m} value={idx} className="bg-slate-900 text-white">
                {m}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase font-bold text-white/40 tracking-wider">
            {isLocalMode ? 'Año' : 'Year'}
          </label>
          <select
            value={selectedYear}
            onChange={e => setSelectedYear(parseInt(e.target.value))}
            className="bg-black/30 border border-white/10 rounded-xl px-3 py-1.5 text-sm text-white/80 focus:outline-none focus:border-indigo-500"
          >
            {yearsList.map(y => (
              <option key={y} value={y} className="bg-slate-900 text-white">
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Family Toggle Selector */}
      <div className="flex items-center justify-between p-3.5 backdrop-blur-xl bg-white/5 rounded-2xl border border-white/10 shadow-lg">
        <div className="flex items-center gap-2">
          <span className="text-lg">👥</span>
          <div>
            <p className="text-xs text-white/40">{isLocalMode ? 'Vista de Gastos' : 'Expense View'}</p>
            <p className="text-sm font-semibold text-white/95">
              {isLocalMode 
                ? (isFamilyMode ? 'Gastos Familiares (Grupal)' : 'Mis Gastos (Individual)') 
                : (isFamilyMode ? 'Family Expenses (Grouped)' : 'My Expenses (Individual)')}
            </p>
          </div>
        </div>
        <button
          onClick={toggleFamilyMode}
          className="px-4 py-1.5 text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-xl hover:bg-indigo-500/30 transition-all duration-300 active:scale-95"
        >
          🔄 {isLocalMode ? 'Cambiar Vista' : 'Switch View'}
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3">
        <SummaryCard
          label={summaryLabel}
          value={formatCurrency(summary.total, summary.currency)}
          sub={
            isLocalMode
              ? `${summary.count} ${summary.count === 1 ? 'transacción' : 'transacciones'}`
              : `${summary.count} transaction${summary.count !== 1 ? 's' : ''}`
          }
          icon="💰"
          color="text-indigo-300"
        />
        <SummaryCard
          label={isLocalMode ? 'Promedio' : 'Avg / Transaction'}
          value={summary.count > 0 ? formatCurrency(summary.total / summary.count, summary.currency) : '—'}
          sub={isLocalMode ? 'este mes' : 'this month'}
          icon="📊"
          color="text-purple-300"
        />
      </div>

      {/* Dynamic Graph Panel with Multiple Visualizations */}
      <GlassCard className="p-4 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="text-xs font-bold text-white/70 uppercase tracking-wide">
            {isLocalMode ? 'Resumen Gráfico' : 'Visual Summary'}
          </h3>
          
          {/* Dimension Controls */}
          <div className="flex bg-white/5 border border-white/10 rounded-xl p-0.5 text-[10px]">
            <button
              onClick={() => handleDimensionChange('category')}
              className={`px-2 py-1 rounded-lg font-semibold transition-all cursor-pointer ${chartDimension === 'category' ? 'bg-indigo-600 text-white shadow' : 'text-white/40 hover:text-white/70'}`}
            >
              🗂️ {isLocalMode ? 'Categorías' : 'Categories'}
            </button>
            {isFamilyMode && (
              <button
                onClick={() => handleDimensionChange('member')}
                className={`px-2 py-1 rounded-lg font-semibold transition-all cursor-pointer ${chartDimension === 'member' ? 'bg-indigo-600 text-white shadow' : 'text-white/40 hover:text-white/70'}`}
              >
                👥 {isLocalMode ? 'Integrantes' : 'Members'}
              </button>
            )}
            <button
              onClick={() => handleDimensionChange('daily')}
              className={`px-2 py-1 rounded-lg font-semibold transition-all cursor-pointer ${chartDimension === 'daily' ? 'bg-indigo-600 text-white shadow' : 'text-white/40 hover:text-white/70'}`}
            >
              📅 {isLocalMode ? 'Diario' : 'Daily'}
            </button>
          </div>

          {/* Chart Type Controls */}
          <div className="flex bg-white/5 border border-white/10 rounded-xl p-0.5 text-[10px]">
            {chartDimension !== 'daily' && (
              <button
                onClick={() => setChartType('pie')}
                className={`px-2 py-1 rounded-lg font-semibold transition-all cursor-pointer ${chartType === 'pie' ? 'bg-indigo-600 text-white shadow font-bold' : 'text-white/40 hover:text-white/70'}`}
              >
                🍰 {isLocalMode ? 'Torta' : 'Pie'}
              </button>
            )}
            <button
              onClick={() => setChartType('bar')}
              className={`px-2 py-1 rounded-lg font-semibold transition-all cursor-pointer ${chartType === 'bar' ? 'bg-indigo-600 text-white shadow font-bold' : 'text-white/40 hover:text-white/70'}`}
            >
              📊 {isLocalMode ? 'Barras' : 'Bars'}
            </button>
            {chartDimension === 'daily' && (
              <button
                onClick={() => setChartType('area')}
                className={`px-2 py-1 rounded-lg font-semibold transition-all cursor-pointer ${chartType === 'area' ? 'bg-indigo-600 text-white shadow font-bold' : 'text-white/40 hover:text-white/70'}`}
              >
                📈 {isLocalMode ? 'Área' : 'Area'}
              </button>
            )}
          </div>
        </div>

        {/* Render Chart */}
        <div className="h-56 relative flex items-center justify-center">
          {chartDimension === 'category' && categoryData.length === 0 ? (
            <p className="text-white/30 text-xs text-center py-6">
              {isLocalMode ? 'Sin gastos registrados este mes' : 'No expenses recorded this month'}
            </p>
          ) : chartDimension === 'member' && memberData.length === 0 ? (
            <p className="text-white/30 text-xs text-center py-6">
              {isLocalMode ? 'Sin gastos registrados este mes' : 'No expenses recorded this month'}
            </p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              {chartDimension === 'category' && chartType === 'pie' ? (
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={2}
                    dataKey="value"
                    onClick={(data) => {
                      if (data && data.name) {
                        setFilters({ categories: [data.name] });
                        setTab('expenses');
                      }
                    }}
                    className="cursor-pointer focus:outline-none"
                  >
                    {categoryData.map(entry => (
                      <Cell key={entry.name} fill={CATEGORY_COLORS[entry.name] ?? '#6b7280'} className="hover:opacity-80 transition-opacity" />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => [`${formatCurrency(value, summary.currency)} (${summary.total > 0 ? ((value / summary.total) * 100).toFixed(1) : 0}%)`, '']}
                    contentStyle={{ background: 'rgba(15,12,41,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: 'white', fontSize: '11px' }}
                  />
                  <Legend iconType="circle" iconSize={6} formatter={(v) => <span className="text-[10px] text-white/50">{v}</span>} />
                </PieChart>
              ) : chartDimension === 'category' && chartType === 'bar' ? (
                <BarChart data={categoryData} margin={{ top: 10, right: 5, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" stroke="rgba(255,255,255,0.4)" fontSize={9} />
                  <YAxis stroke="rgba(255,255,255,0.4)" fontSize={9} />
                  <Tooltip
                    formatter={(value: number) => [`${formatCurrency(value, summary.currency)}`, '']}
                    contentStyle={{ background: 'rgba(15,12,41,0.95)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '12px', color: 'white', fontSize: '11px' }}
                  />
                  <Bar
                    dataKey="value"
                    radius={[6, 6, 0, 0]}
                    onClick={(data) => {
                      if (data && data.name) {
                        setFilters({ categories: [data.name] });
                        setTab('expenses');
                      }
                    }}
                    className="cursor-pointer focus:outline-none"
                  >
                    {categoryData.map(entry => (
                      <Cell key={entry.name} fill={CATEGORY_COLORS[entry.name] ?? '#6b7280'} className="hover:opacity-85 transition-opacity" />
                    ))}
                  </Bar>
                </BarChart>
              ) : chartDimension === 'member' && chartType === 'pie' ? (
                <PieChart>
                  <Pie
                    data={memberData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {memberData.map((entry, idx) => (
                      <Cell key={entry.name} fill={MEMBER_COLORS[idx % MEMBER_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => [`${formatCurrency(value, summary.currency)} (${summary.total > 0 ? ((value / summary.total) * 100).toFixed(1) : 0}%)`, '']}
                    contentStyle={{ background: 'rgba(15,12,41,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: 'white', fontSize: '11px' }}
                  />
                  <Legend iconType="circle" iconSize={6} formatter={(v) => <span className="text-[10px] text-white/50">{v}</span>} />
                </PieChart>
              ) : chartDimension === 'member' && chartType === 'bar' ? (
                <BarChart data={memberData} margin={{ top: 10, right: 5, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" stroke="rgba(255,255,255,0.4)" fontSize={9} />
                  <YAxis stroke="rgba(255,255,255,0.4)" fontSize={9} />
                  <Tooltip
                    formatter={(value: number) => [`${formatCurrency(value, summary.currency)}`, '']}
                    contentStyle={{ background: 'rgba(15,12,41,0.95)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '12px', color: 'white', fontSize: '11px' }}
                  />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {memberData.map((entry, idx) => (
                      <Cell key={entry.name} fill={MEMBER_COLORS[idx % MEMBER_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              ) : chartDimension === 'daily' && chartType === 'bar' ? (
                <BarChart data={dailyData} margin={{ top: 10, right: 5, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="day" stroke="rgba(255,255,255,0.4)" fontSize={9} />
                  <YAxis stroke="rgba(255,255,255,0.4)" fontSize={9} />
                  <Tooltip
                    formatter={(value: number) => [`${formatCurrency(value, summary.currency)}`, '']}
                    contentStyle={{ background: 'rgba(15,12,41,0.95)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '12px', color: 'white', fontSize: '11px' }}
                  />
                  <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              ) : (
                <AreaChart data={dailyData} margin={{ top: 10, right: 5, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorDailyPrice" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="day" stroke="rgba(255,255,255,0.4)" fontSize={9} />
                  <YAxis stroke="rgba(255,255,255,0.4)" fontSize={9} />
                  <Tooltip
                    formatter={(value: number) => [`${formatCurrency(value, summary.currency)}`, '']}
                    contentStyle={{ background: 'rgba(15,12,41,0.95)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '12px', color: 'white', fontSize: '11px' }}
                  />
                  <Area type="monotone" dataKey="value" stroke="#6366f1" fillOpacity={1} fill="url(#colorDailyPrice)" strokeWidth={2} />
                </AreaChart>
              )}
            </ResponsiveContainer>
          )}
        </div>
      </GlassCard>

      {/* Recent expenses */}
      <GlassCard className="p-4">
        <h3 className="text-sm font-semibold text-white/70 mb-3 uppercase tracking-wide">
          {isLocalMode ? 'Actividad Reciente' : 'Recent Activity'}
        </h3>
        {recent.length === 0 ? (
          <p className="text-white/30 text-sm text-center py-4">
            {isLocalMode 
              ? 'Sin gastos registrados. ¡Agregá tu primer consumo!' 
              : 'No expenses yet. Add your first one!'}
          </p>
        ) : (
          <ul className="space-y-2">
            {recent.map(e => (
              <li key={e.id} className="flex items-center justify-between py-1.5">
                <div className="flex items-center gap-3">
                  <span className="text-lg">
                    {CATEGORY_EMOJIS[e.category] ?? '💳'}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-white/90">
                      {e.merchant || (isLocalMode ? 'Desconocido' : 'Unknown')}
                    </p>
                    <p className="text-xs text-white/40">{formatDate(e.timestamp)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold" style={{ color: CATEGORY_COLORS[e.category] ?? '#fff' }}>
                    {formatCurrency(e.amount, e.currency)}
                  </p>
                  {!e.synced && (
                    <p className="text-xs text-amber-400">
                      {isLocalMode ? 'Pendiente' : 'Pending sync'}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </GlassCard>
    </div>
  );
}

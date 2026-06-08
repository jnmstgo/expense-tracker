import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { CATEGORY_COLORS } from '@/utils/constants';
import { formatCurrency } from '@/utils/formatters';
import type { MonthlySummary } from '@/types';
import GlassCard from '@/components/UI/GlassCard';
import { useUiStore } from '@/store/uiStore';
import { useExpenseStore } from '@/store/expenseStore';

interface Props { summary: MonthlySummary }

export default function CategoryChart({ summary }: Props) {
  const isLocalMode = useUiStore(s => s.isLocalMode);
  const { setTab } = useUiStore();
  const { setFilters } = useExpenseStore();

  const data = Object.entries(summary.byCategory)
    .map(([name, value]) => ({ name, value: value ?? 0 }))
    .sort((a, b) => b.value - a.value);

  const handleSliceClick = (categoryName: string) => {
    setFilters({ categories: [categoryName] });
    setTab('expenses');
  };

  if (data.length === 0) {
    return (
      <GlassCard className="p-6 flex items-center justify-center min-h-[200px]">
        <p className="text-white/30 text-sm">
          {isLocalMode ? 'Sin gastos registrados este mes' : 'No expenses this month'}
        </p>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="p-4">
      <h3 className="text-sm font-semibold text-white/70 mb-3 uppercase tracking-wide">
        {isLocalMode ? 'Gastos por Categoría' : 'Spending by Category'}
      </h3>
      <div className="relative h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={85}
              paddingAngle={3}
              dataKey="value"
              onClick={(clickData) => {
                if (clickData && clickData.name) {
                  handleSliceClick(clickData.name);
                }
              }}
              className="cursor-pointer focus:outline-none"
            >
              {data.map(entry => (
                <Cell
                  key={entry.name}
                  fill={CATEGORY_COLORS[entry.name] ?? '#6b7280'}
                  className="hover:opacity-85 transition-opacity"
                />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => {
                const pct = summary.total > 0 ? ((value / summary.total) * 100).toFixed(1) : '0.0';
                return [`${formatCurrency(value, summary.currency)} (${pct}%)`, ''];
              }}
              contentStyle={{
                background: 'rgba(15,12,41,0.9)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
                color: 'white',
                fontSize: '12px',
              }}
            />
            <Legend
              iconType="circle"
              iconSize={8}
              formatter={(value: string) => {
                return (
                  <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '11px' }}>{value}</span>
                );
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </GlassCard>
  );
}

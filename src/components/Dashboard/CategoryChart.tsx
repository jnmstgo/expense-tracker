import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { CATEGORY_COLORS } from '@/utils/constants';
import { formatCurrency } from '@/utils/formatters';
import type { MonthlySummary } from '@/types';
import GlassCard from '@/components/UI/GlassCard';
import { useUiStore } from '@/store/uiStore';

interface Props { summary: MonthlySummary }

// Category translations mapping for chart legend in Spanish (Argentina)
const CATEGORY_TRANSLATIONS: Record<string, string> = {
  'Food & Dining':   'Comida',
  'Transportation':  'Transporte',
  'Shopping':        'Compras',
  'Entertainment':   'Entretenimiento',
  'Healthcare':      'Salud',
  'Housing':         'Alquiler',
  'Travel':          'Viajes',
  'Education':       'Educación',
  'Business':        'Negocios',
  'Other':           'Otros/Varios',
};

export default function CategoryChart({ summary }: Props) {
  const isLocalMode = useUiStore(s => s.isLocalMode);

  const data = Object.entries(summary.byCategory)
    .map(([name, value]) => ({ name, value: value ?? 0 }))
    .sort((a, b) => b.value - a.value);

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
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={85}
            paddingAngle={3}
            dataKey="value"
          >
            {data.map(entry => (
              <Cell
                key={entry.name}
                fill={CATEGORY_COLORS[entry.name as keyof typeof CATEGORY_COLORS] ?? '#6b7280'}
              />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number) => [formatCurrency(value, summary.currency), '']}
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
              const label = isLocalMode ? (CATEGORY_TRANSLATIONS[value] || value) : value;
              return (
                <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '11px' }}>{label}</span>
              );
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </GlassCard>
  );
}

import GlassCard from '@/components/UI/GlassCard';

interface Props {
  label: string;
  value: string;
  sub?: string;
  icon: string;
  color?: string;
  onClick?: () => void;
}

export default function SummaryCard({ label, value, sub, icon, color = 'text-indigo-400', onClick }: Props) {
  return (
    <GlassCard 
      className={[
        "p-4",
        onClick ? "cursor-pointer hover:bg-white/10 active:scale-[0.98] transition-all duration-200 select-none" : ""
      ].join(" ")}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-white/50 uppercase tracking-wider mb-1">{label}</p>
          <p className={`text-2xl font-bold ${color}`}>{value}</p>
          {sub && <p className="text-xs text-white/40 mt-0.5">{sub}</p>}
        </div>
        <span className="text-2xl">{icon}</span>
      </div>
    </GlassCard>
  );
}

import { useState, useMemo } from 'react';
import { useExpenseStore } from '@/store/expenseStore';
import { useAuthStore } from '@/store/authStore';
import { useUiStore } from '@/store/uiStore';
import GlassCard from '@/components/UI/GlassCard';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface HistoricalItem {
  name: string;
  price: number;
  currency: string;
  date: string;
  merchant: string;
  userName: string | null;
  city: string | null;
  lat: number | null;
  lng: number | null;
}

export default function PriceSearch() {
  const isLocalMode = useUiStore(s => s.isLocalMode);
  const { user } = useAuthStore();
  const { expenses } = useExpenseStore();
  const [searchQuery, setSearchQuery] = useState('');

  // 1. Compute list of popular product names dynamically
  const popularProducts = useMemo(() => {
    const counts: Record<string, number> = {};
    expenses.forEach(e => {
      e.items?.forEach(item => {
        const name = item.name.trim();
        if (name) {
          counts[name] = (counts[name] ?? 0) + 1;
        }
      });
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(entry => entry[0]);
  }, [expenses]);

  // 2. Perform case-insensitive search on items
  const searchResults = useMemo(() => {
    if (searchQuery.trim().length < 2) return [];
    const q = searchQuery.toLowerCase().trim();
    const results: HistoricalItem[] = [];

    expenses.forEach(e => {
      e.items?.forEach(item => {
        if (item.name.toLowerCase().includes(q)) {
          results.push({
            name: item.name,
            price: item.price,
            currency: e.currency,
            date: e.timestamp,
            merchant: e.merchant,
            userName: e.userName || (e.userId === user?.id ? user?.name : null),
            city: e.city || e.address || null,
            lat: e.locationLat,
            lng: e.locationLng
          });
        }
      });
    });

    // Sort by date ascending for chronologically sound charts
    return results.sort((a, b) => a.date.localeCompare(b.date));
  }, [expenses, searchQuery, user]);

  // 3. Format data for recharts
  const chartData = useMemo(() => {
    return searchResults.map(r => ({
      date: formatDate(r.date).split(',')[0], // Short date
      price: r.price,
      merchant: r.merchant
    }));
  }, [searchResults]);

  // Handle click on suggestions
  const handleSuggestionClick = (name: string) => {
    setSearchQuery(name);
  };

  const hasChart = searchResults.length > 1;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white mb-1">
          {isLocalMode ? '🔍 Historial de Precios' : '🔍 Price History'}
        </h2>
        <p className="text-xs text-white/50 leading-relaxed">
          {isLocalMode 
            ? 'Buscá artículos escaneados para analizar su evolución de precio y comparar comercios.' 
            : 'Search scanned items to analyze price evolution and compare merchants.'}
        </p>
      </div>

      {/* Search Bar */}
      <GlassCard className="p-4 flex flex-col gap-3">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={isLocalMode ? 'Escribí un producto... (ej: Coca, Leche)' : 'Search product... (e.g., Coke, Milk)'}
            className="w-full bg-black/40 border border-white/10 rounded-2xl pl-10 pr-10 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
          />
          <span className="absolute left-3.5 top-3.5 text-white/30 text-sm">🔍</span>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-3.5 h-5 w-5 bg-white/10 hover:bg-white/20 text-white/60 rounded-full flex items-center justify-center text-[10px] transition-colors cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>

        {/* Suggestion Chips */}
        {popularProducts.length > 0 && (
          <div className="space-y-1.5 mt-1">
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider">
              {isLocalMode ? 'Búsquedas sugeridas' : 'Popular searches'}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {popularProducts.map(name => (
                <button
                  key={name}
                  onClick={() => handleSuggestionClick(name)}
                  className="px-3 py-1 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 rounded-full text-xs text-white/70 hover:text-white transition-all cursor-pointer select-none"
                >
                  {name}
                </button>
              ))}
            </div>
          </div>
        )}
      </GlassCard>

      {searchQuery.trim().length >= 2 ? (
        searchResults.length === 0 ? (
          <div className="text-center py-12 text-white/30">
            <p className="text-4xl mb-2">🔎</p>
            <p className="text-sm">
              {isLocalMode ? 'No se encontraron registros de este producto' : 'No price records found for this product'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Chart Panel */}
            {hasChart && (
              <GlassCard className="p-4 space-y-3">
                <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                  {isLocalMode ? 'Tendencia de Precios' : 'Price Trend'}
                </h3>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 5, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="date" stroke="rgba(255,255,255,0.4)" fontSize={9} />
                      <YAxis stroke="rgba(255,255,255,0.4)" fontSize={9} />
                      <Tooltip 
                        contentStyle={{
                          background: 'rgba(15,12,41,0.95)',
                          border: '1px solid rgba(255,255,255,0.15)',
                          borderRadius: '16px',
                          color: 'white',
                          fontSize: '11px',
                          backdropFilter: 'blur(10px)'
                        }}
                        formatter={(value: number, _name: any, props: any) => {
                          const merchant = props.payload.merchant;
                          return [`${formatCurrency(value, searchResults[0].currency)}`, `Local: ${merchant}`];
                        }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="price" 
                        stroke="#8b5cf6" 
                        fillOpacity={1} 
                        fill="url(#colorPrice)" 
                        strokeWidth={2} 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </GlassCard>
            )}

            {/* List Table */}
            <GlassCard className="overflow-hidden">
              <div className="p-4 border-b border-white/15">
                <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                  {isLocalMode ? 'Registros Históricos' : 'Historical Purchases'}
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-white/5 border-b border-white/10 text-white/50">
                      <th className="p-3 font-semibold">{isLocalMode ? 'Artículo' : 'Item'}</th>
                      <th className="p-3 font-semibold">{isLocalMode ? 'Fecha' : 'Date'}</th>
                      <th className="p-3 font-semibold">{isLocalMode ? 'Comercio' : 'Merchant'}</th>
                      <th className="p-3 font-semibold">{isLocalMode ? 'Por' : 'By'}</th>
                      <th className="p-3 font-semibold">{isLocalMode ? 'Ubicación' : 'Location'}</th>
                      <th className="p-3 font-semibold text-right">{isLocalMode ? 'Precio' : 'Price'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {searchResults.map((item, idx) => (
                      <tr key={idx} className="hover:bg-white/5 transition-colors">
                        <td className="p-3 font-medium text-white/90">{item.name}</td>
                        <td className="p-3 text-white/60">{formatDate(item.date).split(',')[0]}</td>
                        <td className="p-3 text-white/70 font-semibold">{item.merchant}</td>
                        <td className="p-3">
                          {item.userName ? (
                            <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-[10px] font-semibold text-indigo-300">
                              {item.userName}
                            </span>
                          ) : (
                            <span className="text-white/30">—</span>
                          )}
                        </td>
                        <td className="p-3">
                          {item.lat && item.lng ? (
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${item.lat},${item.lng}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-indigo-400 hover:underline"
                            >
                              📍 {item.city || (isLocalMode ? 'Ver mapa' : 'Map')}
                            </a>
                          ) : item.city ? (
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.city)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-indigo-400 hover:underline truncate max-w-[120px] block"
                            >
                              📍 {item.city}
                            </a>
                          ) : (
                            <span className="text-white/30">—</span>
                          )}
                        </td>
                        <td className="p-3 text-right font-bold text-emerald-400">
                          {formatCurrency(item.price, item.currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </GlassCard>
          </div>
        )
      ) : (
        <div className="text-center py-12 text-white/20">
          <p className="text-5xl mb-3">🔍</p>
          <p className="text-sm">
            {isLocalMode ? 'Escribí al menos 2 letras para comenzar a buscar' : 'Type at least 2 letters to start searching'}
          </p>
        </div>
      )}
    </div>
  );
}

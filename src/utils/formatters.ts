import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { useUiStore } from '@/store/uiStore';

/**
 * Formats currencies dynamically. 
 * Supports Local Mode ($ 1.500,00 ARS) using es-AR,
 * and falls back to standard en-US formatting when disabled.
 */
export function formatCurrency(amount: number, currency = 'USD'): string {
  const isLocal = useUiStore.getState().isLocalMode;

  if (isLocal) {
    const formatted = new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
    
    // Add currency code suffix if it is not already included cleanly
    return `${formatted} ${currency}`;
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Formats ISO timestamps to standard or localized Spanish dates.
 */
export function formatDate(iso: string): string {
  const isLocal = useUiStore.getState().isLocalMode;
  try {
    return format(parseISO(iso), isLocal ? "d 'de' MMMM, yyyy" : 'MMM d, yyyy', {
      locale: isLocal ? es : undefined
    });
  } catch {
    return iso;
  }
}

/**
 * Formats ISO timestamps to standard or localized relative terms (e.g. "hace 3 horas").
 */
export function formatRelative(iso: string): string {
  const isLocal = useUiStore.getState().isLocalMode;
  try {
    return formatDistanceToNow(parseISO(iso), {
      addSuffix: true,
      locale: isLocal ? es : undefined
    });
  } catch {
    return iso;
  }
}

export function formatPercent(value: number, total: number): string {
  if (total === 0) return '0%';
  return `${((value / total) * 100).toFixed(1)}%`;
}

export function decodeJwt(token: string): Record<string, unknown> {
  try {
    const payload = token.split('.')[1];
    const padded  = payload.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(padded));
  } catch {
    return {};
  }
}

export function truncate(str: string, max: number): string {
  return str.length <= max ? str : str.slice(0, max - 1) + '…';
}

import { useUserSettingsStore } from '../stores/useUserSettingsStore';
import { getIntlLocale } from '../i18n';

function getSettings() {
  return useUserSettingsStore.getState().settings;
}

export function formatCurrency(value: number, currency?: string, locale?: string): string {
  const settings = getSettings();
  const cur = currency || settings?.currency || 'BRL';
  const loc = locale || getIntlLocale(settings?.language || 'pt-BR');
  return new Intl.NumberFormat(loc, {
    style: 'currency',
    currency: cur,
  }).format(value);
}

export function formatPercent(value: number, decimals = 1): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}%`;
}

export function formatDate(dateStr: string, dateFormat?: string, _locale?: string): string {
  if (!dateStr) return '—';
  const raw = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
  const [year, month, day] = raw.split('-').map(Number);
  const settings = getSettings();
  const fmt = dateFormat || settings?.dateFormat || 'DD/MM/YYYY';

  if (fmt === 'YYYY-MM-DD') return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  if (fmt === 'MM/DD/YYYY') return `${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}/${year}`;
  return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
}

export function formatMonthYear(monthStr: string): string {
  const settings = getSettings();
  const loc = getIntlLocale(settings?.language || 'pt-BR');
  const [year, month] = monthStr.split('-').map(Number);
  const d = new Date(year, month - 1, 1);
  return d.toLocaleDateString(loc, { month: 'short', year: 'numeric' });
}

export function formatMonthYearLong(monthStr: string): string {
  const settings = getSettings();
  const loc = getIntlLocale(settings?.language || 'pt-BR');
  const [year, month] = monthStr.split('-').map(Number);
  const d = new Date(year, month - 1, 1);
  const formatted = d.toLocaleDateString(loc, { month: 'long', year: 'numeric' });
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

// Keep backward compat alias
export const formatMonthYearPtBR = formatMonthYearLong;

export function getCurrentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function getPreviousMonths(count: number, fromMonth?: string): string[] {
  const months: string[] = [];
  const base = fromMonth ? new Date(fromMonth + '-01') : new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(base.getFullYear(), base.getMonth() - i, 1);
    months.unshift(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return months;
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function getMonthFromDate(date: string): string {
  return date.slice(0, 7); // YYYY-MM
}

export function navigateMonth(current: string, direction: -1 | 1): string {
  const [year, month] = current.split('-').map(Number);
  const d = new Date(year, month - 1 + direction, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  trend?: { value: number; label: string };
  color?: string;
}

export default function StatCard({ label, value, icon: Icon, trend, color = 'text-primary-500' }: StatCardProps) {
  return (
    <div className="bg-white dark:bg-surface-800 rounded-xl shadow-sm border border-surface-200 dark:border-surface-700 p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-surface-500 dark:text-surface-400 uppercase tracking-wide">{label}</span>
        <Icon className={`h-5 w-5 ${color}`} />
      </div>
      <p className="text-2xl font-bold text-surface-900 dark:text-white">{value}</p>
      {trend && (
        <p className={`text-xs mt-1 ${trend.value >= 0 ? 'text-red-500' : 'text-green-500'}`}>
          {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value).toFixed(1)}% {trend.label}
        </p>
      )}
    </div>
  );
}

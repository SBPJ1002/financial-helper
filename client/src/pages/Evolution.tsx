import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { TrendingUp, TrendingDown, Minus, AlertTriangle, Target, Plus, Trash2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { useToast } from '../components/ui/Toast';
import { useFinanceStore } from '../stores/useFinanceStore';
import { formatCurrency, formatMonthYear, getCurrentMonth } from '../utils/format';
import { currencyFormatter } from '../utils/chartHelpers';
import { getAverage, getVariationPercent, getTrend, getWeightedMovingAverage } from '../utils/calculations';

const LINE_COLORS = ['#10b981', '#14b8a6', '#ec4899', '#f59e0b'];

interface HistoryEntry {
  id: string;
  month: string;
  amount: number;
}

interface GroupedExpense {
  key: string;
  description: string;
  expenseIds: string[];
  amount: number;
  history: HistoryEntry[];
  goal: { id: string; limit: number } | null;
}

export default function Evolution() {
  const { t } = useTranslation();
  const { expenses, fixedExpenses, fetchExpenses, addExpenseHistory, setExpenseGoal, deleteExpense } = useFinanceStore();
  const { toast } = useToast();

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const tracked = useMemo(() => {
    const fixed = fixedExpenses();
    const groups = new Map<string, GroupedExpense>();

    for (const exp of fixed) {
      const key = exp.description.trim().toLowerCase();
      const existing = groups.get(key);

      if (existing) {
        existing.expenseIds.push(exp.id);
        existing.amount = exp.amount;
        if (!existing.goal && exp.goal) existing.goal = exp.goal;

        // Merge histories by month (keep first seen per month)
        for (const h of exp.history) {
          if (!existing.history.some(eh => eh.month === h.month)) {
            existing.history.push(h);
          }
        }
      } else {
        groups.set(key, {
          key,
          description: exp.description,
          expenseIds: [exp.id],
          amount: exp.amount,
          history: [...exp.history],
          goal: exp.goal,
        });
      }
    }

    // Sort histories and filter groups with history
    return Array.from(groups.values())
      .map(g => ({ ...g, history: g.history.sort((a, b) => a.month.localeCompare(b.month)) }))
      .filter(g => g.history.length > 0);
  }, [expenses]);  // eslint-disable-line react-hooks/exhaustive-deps

  const [selectedExpense, setSelectedExpense] = useState<GroupedExpense | null>(null);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [showCompare, setShowCompare] = useState(false);
  const [limitModal, setLimitModal] = useState<GroupedExpense | null>(null);
  const [limitValue, setLimitValue] = useState('');
  const [addValueModal, setAddValueModal] = useState<GroupedExpense | null>(null);
  const [newMonth, setNewMonth] = useState(getCurrentMonth());
  const [newAmount, setNewAmount] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<GroupedExpense | null>(null);

  function toggleCompare(key: string) {
    setCompareIds(prev =>
      prev.includes(key) ? prev.filter(x => x !== key) : prev.length < 4 ? [...prev, key] : prev
    );
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    for (const id of deleteTarget.expenseIds) {
      await deleteExpense(id);
    }
    toast(t('evolution.deleted'));
    setDeleteTarget(null);
    if (selectedExpense?.key === deleteTarget.key) setSelectedExpense(null);
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">{t('evolution.title')}</h1>
        <div className="flex gap-2">
          {compareIds.length >= 2 && (
            <Button size="sm" onClick={() => setShowCompare(true)}>{t('evolution.compareCount', { count: compareIds.length })}</Button>
          )}
        </div>
      </div>

      {tracked.length === 0 ? (
        <Card><p className="text-center text-surface-500 py-8">{t('evolution.noData')}</p></Card>
      ) : (
        <>
          {/* Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {tracked.map(group => {
              const trend = getTrend(group.history);
              const avg6 = getAverage(group.history.slice(-6).map(h => h.amount));
              const lastEntry = group.history[group.history.length - 1];
              const prevEntry = group.history.length >= 2 ? group.history[group.history.length - 2] : null;
              const currentAmount = lastEntry?.amount ?? group.amount;
              const variation = prevEntry ? getVariationPercent(currentAmount, prevEntry.amount) : 0;
              const overLimit = group.goal && currentAmount > group.goal.limit;
              const projection = getWeightedMovingAverage(group.history);
              const isComparing = compareIds.includes(group.key);

              return (
                <Card key={group.key} onClick={() => setSelectedExpense(group)}
                  className={`relative cursor-pointer ${isComparing ? 'ring-2 ring-primary-500' : ''}`}>
                  {overLimit && (
                    <div className="absolute top-3 right-3">
                      <AlertTriangle className="h-5 w-5 text-red-500" />
                    </div>
                  )}
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-sm">{group.description}</h3>
                    <button onClick={(e) => { e.stopPropagation(); toggleCompare(group.key); }}
                      className={`text-xs px-2 py-0.5 rounded border transition-colors ${isComparing ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-600' : 'border-surface-300 dark:border-surface-600 text-surface-500 hover:border-primary-500'}`}
                    >{t('evolution.compare')}</button>
                  </div>
                  <p className="text-2xl font-bold mb-1">{formatCurrency(currentAmount)}</p>
                  <div className="space-y-1 text-xs text-surface-500 dark:text-surface-400">
                    <p>{t('evolution.sixMonthAvg', { value: formatCurrency(avg6) })}</p>
                    <div className="flex items-center gap-1">
                      {variation > 0 ? <TrendingUp className="h-3 w-3 text-red-500" /> : variation < 0 ? <TrendingDown className="h-3 w-3 text-green-500" /> : <Minus className="h-3 w-3" />}
                      <span className={variation > 0 ? 'text-red-500' : variation < 0 ? 'text-green-500' : ''}>{variation > 0 ? '+' : ''}{variation.toFixed(1)}% {t('evolution.vsPrevious')}</span>
                    </div>
                    <Badge variant={trend === 'increasing' ? 'danger' : trend === 'decreasing' ? 'success' : 'default'}>
                      {trend === 'increasing' ? t('evolution.increasing') : trend === 'decreasing' ? t('evolution.decreasing') : t('evolution.stable')}
                    </Badge>
                    <p className="text-surface-400">{t('evolution.projection', { value: formatCurrency(projection) })}</p>
                    {group.goal && <p className={overLimit ? 'text-red-500 font-medium' : 'text-surface-400'}>{t('evolution.limit', { value: formatCurrency(group.goal.limit) })}</p>}
                  </div>
                  <div className="flex gap-1 mt-3">
                    <button onClick={(e) => { e.stopPropagation(); setLimitModal(group); setLimitValue(group.goal ? String(group.goal.limit) : ''); }}
                      className="text-xs px-2 py-1 rounded bg-surface-100 dark:bg-surface-700 hover:bg-surface-200 dark:hover:bg-surface-600 text-surface-600 dark:text-surface-300 transition-colors">
                      <Target className="h-3 w-3 inline mr-1" />{t('evolution.setLimit')}
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); setAddValueModal(group); setNewAmount(String(group.amount)); setNewMonth(getCurrentMonth()); }}
                      className="text-xs px-2 py-1 rounded bg-surface-100 dark:bg-surface-700 hover:bg-surface-200 dark:hover:bg-surface-600 text-surface-600 dark:text-surface-300 transition-colors">
                      <Plus className="h-3 w-3 inline mr-1" />{t('evolution.addValue')}
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(group); }}
                      className="text-xs px-2 py-1 rounded bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 transition-colors">
                      <Trash2 className="h-3 w-3 inline mr-1" />{t('evolution.delete')}
                    </button>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Detail Chart */}
          {selectedExpense && (
            <ExpenseDetailChart expense={selectedExpense} />
          )}

          {/* Compare Chart */}
          {showCompare && compareIds.length >= 2 && (
            <CompareChart expenses={tracked.filter(e => compareIds.includes(e.key))} onClose={() => setShowCompare(false)} />
          )}
        </>
      )}

      {/* Set Limit Modal */}
      <Modal open={!!limitModal} onClose={() => setLimitModal(null)} title={t('evolution.setLimitTitle', { name: limitModal?.description })} maxWidth="max-w-sm">
        <div className="space-y-4">
          <Input label={t('evolution.limitLabel')} type="number" min="0" step="0.01" value={limitValue} onChange={e => setLimitValue(e.target.value)} />
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setLimitModal(null)}>{t('common.cancel')}</Button>
            <Button onClick={async () => {
              if (limitModal && limitValue) {
                await setExpenseGoal(limitModal.expenseIds[0], parseFloat(limitValue));
                toast(t('evolution.limitSaved'));
                setLimitModal(null);
              }
            }}>{t('common.save')}</Button>
          </div>
        </div>
      </Modal>

      {/* Add Monthly Value Modal */}
      <Modal open={!!addValueModal} onClose={() => setAddValueModal(null)} title={t('evolution.addValueTitle', { name: addValueModal?.description })} maxWidth="max-w-sm">
        <div className="space-y-4">
          <Input label={t('evolution.monthLabel')} type="month" value={newMonth} onChange={e => setNewMonth(e.target.value)} />
          <Input label={t('evolution.amountLabel')} type="number" min="0" step="0.01" value={newAmount} onChange={e => setNewAmount(e.target.value)} />
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setAddValueModal(null)}>{t('common.cancel')}</Button>
            <Button onClick={async () => {
              if (addValueModal && newAmount) {
                await addExpenseHistory(addValueModal.expenseIds[0], newMonth, parseFloat(newAmount));
                toast(t('evolution.valueSaved'));
                setAddValueModal(null);
              }
            }}>{t('common.save')}</Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={t('evolution.deleteConfirmTitle')}
        message={t('evolution.deleteConfirmMsg', { name: deleteTarget?.description })}
        confirmLabel={t('evolution.delete')}
      />
    </div>
  );
}

function ExpenseDetailChart({ expense }: { expense: GroupedExpense }) {
  const { t } = useTranslation();

  const data = useMemo(() => {
    const projection = getWeightedMovingAverage(expense.history);
    const avg = getAverage(expense.history.map(h => h.amount));
    return expense.history.map(h => ({
      month: formatMonthYear(h.month),
      value: h.amount,
      average: avg,
      ...(expense.goal ? { limit: expense.goal.limit } : {}),
    })).concat([{
      month: t('evolution.projectionLabel'),
      value: projection,
      average: avg,
      ...(expense.goal ? { limit: expense.goal.limit } : {}),
    }]);
  }, [expense, t]);

  return (
    <Card>
      <h2 className="text-lg font-semibold mb-4">{expense.description} — {t('evolution.history')}</h2>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-surface-200 dark:stroke-surface-700" />
          <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 12 }} />
          <YAxis tick={{ fill: '#94a3b8' }} />
          <Tooltip formatter={currencyFormatter} />
          <Line type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
          <Line type="monotone" dataKey="average" stroke="#94a3b8" strokeDasharray="5 5" strokeWidth={1} dot={false} />
          {expense.goal && <Line type="monotone" dataKey="limit" stroke="#ef4444" strokeDasharray="3 3" strokeWidth={1} dot={false} />}
          <Legend />
        </LineChart>
      </ResponsiveContainer>

      {/* History Table */}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-200 dark:border-surface-700 text-left text-xs text-surface-500 uppercase">
              <th className="px-4 py-2">{t('evolution.month')}</th><th className="px-4 py-2">{t('evolution.amount')}</th><th className="px-4 py-2">{t('evolution.vsPreviousCol')}</th><th className="px-4 py-2">{t('evolution.vsAverage')}</th>
            </tr>
          </thead>
          <tbody>
            {expense.history.map((h, i) => {
              const prev = i > 0 ? expense.history[i - 1].amount : h.amount;
              const avg = getAverage(expense.history.map(x => x.amount));
              const vsPrev = getVariationPercent(h.amount, prev);
              const vsAvg = getVariationPercent(h.amount, avg);
              return (
                <tr key={h.id} className="border-b border-surface-100 dark:border-surface-700/50">
                  <td className="px-4 py-2">{formatMonthYear(h.month)}</td>
                  <td className="px-4 py-2 font-medium">{formatCurrency(h.amount)}</td>
                  <td className={`px-4 py-2 ${vsPrev > 0 ? 'text-red-500' : vsPrev < 0 ? 'text-green-500' : ''}`}>{vsPrev > 0 ? '+' : ''}{vsPrev.toFixed(1)}%</td>
                  <td className={`px-4 py-2 ${vsAvg > 0 ? 'text-red-500' : vsAvg < 0 ? 'text-green-500' : ''}`}>{vsAvg > 0 ? '+' : ''}{vsAvg.toFixed(1)}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function CompareChart({ expenses, onClose }: { expenses: GroupedExpense[]; onClose: () => void }) {
  const { t } = useTranslation();

  const allMonths = useMemo(() => {
    const months = new Set<string>();
    expenses.forEach(e => e.history.forEach(h => months.add(h.month)));
    return [...months].sort();
  }, [expenses]);

  const data = useMemo(() => {
    return allMonths.map(m => {
      const point: Record<string, string | number> = { month: formatMonthYear(m) };
      expenses.forEach(e => {
        const entry = e.history.find(h => h.month === m);
        point[e.description] = entry?.amount ?? 0;
      });
      return point;
    });
  }, [allMonths, expenses]);

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">{t('evolution.comparison')}</h2>
        <Button variant="ghost" size="sm" onClick={onClose}>{t('common.close')}</Button>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-surface-200 dark:stroke-surface-700" />
          <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 12 }} />
          <YAxis tick={{ fill: '#94a3b8' }} />
          <Tooltip formatter={currencyFormatter} />
          <Legend />
          {expenses.map((e, i) => (
            <Line key={e.key} type="monotone" dataKey={e.description} stroke={LINE_COLORS[i]} strokeWidth={2} dot={{ r: 3 }} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
}

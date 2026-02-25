import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { DollarSign, TrendingDown, TrendingUp, Wallet, PiggyBank, Landmark, ArrowRight } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import StatCard from '../components/ui/StatCard';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { useFinanceStore } from '../stores/useFinanceStore';
import { useBankingStore } from '../stores/useBankingStore';
import { formatCurrency, formatMonthYear, getPreviousMonths } from '../utils/format';
import { translateCategoryName } from '../utils/categoryTranslation';
import { currencyFormatter } from '../utils/chartHelpers';

const CHART_COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#ef4444', '#6366f1', '#84cc16', '#f97316'];

export default function Dashboard() {
  const { t } = useTranslation();
  const { dashboard, incomes, expenses, investments, fetchAll, isLoading } = useFinanceStore();
  const { isAvailable: bankingAvailable, accounts, checkAvailability, fetchAccounts } = useBankingStore();
  const navigate = useNavigate();

  useEffect(() => {
    fetchAll();
    checkAvailability();
    fetchAccounts();
  }, [fetchAll, checkAvailability, fetchAccounts]);

  const totalInvested = useMemo(
    () => investments.filter(i => i.status === 'ACTIVE').reduce((s, i) => s + (i.currentValue ?? i.amountInvested), 0),
    [investments],
  );

  const pieData = useMemo(() => {
    if (!dashboard) return [];
    return dashboard.categoryBreakdown
      .filter(c => c.total > 0)
      .map(c => ({ name: translateCategoryName(c.name, t), value: c.total }))
      .sort((a, b) => b.value - a.value);
  }, [dashboard]);

  const months6 = useMemo(() => getPreviousMonths(6), []);

  const barData = useMemo(() => {
    return months6.map(month => {
      const incomeTotal = incomes.reduce((sum, inc) => {
        if (inc.recurrence === 'monthly' || inc.date.slice(0, 7) === month) return sum + inc.amount;
        return sum;
      }, 0);

      const fixedTotal = expenses
        .filter(e => e.type === 'FIXED')
        .reduce((sum, e) => sum + e.amount, 0);
      const variableTotal = expenses
        .filter(e => e.type === 'VARIABLE' && e.date.slice(0, 7) === month)
        .reduce((sum, e) => sum + e.amount, 0);

      return {
        month: formatMonthYear(month),
        [t('dashboard.income')]: incomeTotal,
        [t('dashboard.fixed')]: fixedTotal,
        [t('dashboard.variable')]: variableTotal,
      };
    });
  }, [incomes, expenses, months6, t]);

  if (isLoading || !dashboard) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold">{t('dashboard.title')}</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard label={t('dashboard.monthlyIncome')} value={formatCurrency(dashboard.totalIncome)} icon={DollarSign} color="text-green-500" />
        <StatCard label={t('dashboard.fixedExpenses')} value={formatCurrency(dashboard.totalFixed)} icon={TrendingDown} color="text-red-500" />
        <StatCard label={t('dashboard.variableExpenses')} value={formatCurrency(dashboard.totalVariable)} icon={Wallet} color="text-amber-500" />
        <StatCard label={t('dashboard.availableBalance')} value={formatCurrency(dashboard.balance)} icon={TrendingUp} color={dashboard.balance >= 0 ? 'text-green-500' : 'text-red-500'} />
        <StatCard label={t('dashboard.totalInvested')} value={formatCurrency(totalInvested)} icon={PiggyBank} color="text-accent-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h2 className="text-lg font-semibold mb-4">{t('dashboard.expensesByCategory')}</h2>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={110} paddingAngle={2} dataKey="value">
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={currencyFormatter} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-surface-500 py-12 text-center">{t('dashboard.noExpensesThisMonth')}</p>
          )}
        </Card>

        <Card>
          <h2 className="text-lg font-semibold mb-4">{t('dashboard.incomeVsExpenses')}</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-surface-200 dark:stroke-surface-700" />
              <XAxis dataKey="month" className="text-xs" tick={{ fill: '#94a3b8' }} />
              <YAxis tick={{ fill: '#94a3b8' }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={currencyFormatter} />
              <Legend />
              <Bar dataKey={t('dashboard.income')} fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey={t('dashboard.fixed')} stackId="expenses" fill="#ef4444" />
              <Bar dataKey={t('dashboard.variable')} stackId="expenses" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h2 className="text-lg font-semibold mb-4">{t('dashboard.top5Expenses')}</h2>
          {dashboard.topExpenses.length > 0 ? (
            <div className="space-y-3">
              {dashboard.topExpenses.map((exp, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-surface-100 dark:border-surface-700 last:border-0">
                  <div>
                    <p className="text-sm font-medium">{exp.description}</p>
                    <p className="text-xs text-surface-500">{translateCategoryName(exp.category, t)}</p>
                  </div>
                  <p className="text-sm font-semibold">{formatCurrency(exp.amount)}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-surface-500 text-center py-6">{t('dashboard.noExpensesRecorded')}</p>
          )}
        </Card>

        {bankingAvailable && (
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Landmark className="h-5 w-5" /> {t('dashboard.bankAccounts')}
              </h2>
              <Button variant="ghost" size="sm" onClick={() => navigate('/banking')}>
                {t('dashboard.viewAll')} <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
            {accounts.length > 0 ? (
              <div className="space-y-3">
                {accounts.map((acc) => (
                  <div key={acc.id} className="flex items-center justify-between py-2 border-b border-surface-100 dark:border-surface-700 last:border-0">
                    <div>
                      <p className="text-sm font-medium">{acc.name}</p>
                      <p className="text-xs text-surface-500">{acc.bankConnection.connectorName} · {acc.type}</p>
                    </div>
                    <p className={`text-sm font-semibold ${acc.balance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {formatCurrency(acc.balance)}
                    </p>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-2">
                  <p className="text-sm font-medium text-surface-500">{t('dashboard.totalBalance')}</p>
                  <p className="text-sm font-bold">
                    {formatCurrency(accounts.reduce((s, a) => s + a.balance, 0))}
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-sm text-surface-500 mb-3">{t('dashboard.noBankAccounts')}</p>
                <Button size="sm" onClick={() => navigate('/banking')}>
                  <Landmark className="h-4 w-4" /> {t('dashboard.connectBank')}
                </Button>
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}

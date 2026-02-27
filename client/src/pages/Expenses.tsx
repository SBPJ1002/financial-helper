import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Search, Download, DollarSign, ArrowUpCircle, ArrowDownCircle, Trash2, Edit2, ChevronLeft, ChevronRight, ArrowLeftRight, Settings, Check, X, RefreshCw, ClipboardCheck } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Modal from '../components/ui/Modal';
import Badge from '../components/ui/Badge';
import StatCard from '../components/ui/StatCard';
import { useToast } from '../components/ui/Toast';
import { useFinanceStore } from '../stores/useFinanceStore';
import { useBankingStore } from '../stores/useBankingStore';
import { useUserSettingsStore } from '../stores/useUserSettingsStore';
import { formatCurrency, formatDate, getCurrentMonth, getMonthFromDate, formatMonthYearLong, navigateMonth } from '../utils/format';
import { translateCategoryName } from '../utils/categoryTranslation';
import { CURRENCIES } from '../i18n';
import DeclarationList from '../components/declarations/DeclarationList';

type Tab = 'income' | 'fixed' | 'variable';

interface IncomeRow {
  id: string;
  description: string;
  amount: number;
  date: string;
  recurrence: string;
  currency?: string;
  categoryId?: string;
  category?: { id: string; name: string };
  recurrenceDay?: number;
  contractMonths?: number;
  contractStartDate?: string;
}

interface ExpenseRow {
  id: string;
  description: string;
  amount: number;
  type: 'FIXED' | 'VARIABLE';
  currency?: string;
  categoryId: string;
  category: { id: string; name: string };
  date: string;
  dueDay: number | null;
  status: string;
  paymentMethod: string | null;
  fixedAmountType?: 'FIXED_AMOUNT' | 'VARIABLE_AMOUNT' | null;
  installmentNumber: number | null;
  totalInstallments: number | null;
  installmentGroupId: string | null;
  history?: Array<{ id: string; month: string; amount: number }>;
  needsInput?: boolean;
}

export default function Expenses() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const {
    incomes, expenses, categories, incomeCategories,
    fetchIncomes, fetchExpenses, fetchCategories, fetchIncomeCategories,
    addIncome, updateIncome, deleteIncome,
    addExpense, updateExpense, deleteExpense, toggleExpenseType, generateRecurring,
    deleteFutureExpenses, updateFutureAmount,
    updateCategory, deleteCategory,
    fixedExpenses, variableExpenses,
  } = useFinanceStore();

  const { importTransactions: importBankTransactions } = useBankingStore();
  const [isSyncing, setIsSyncing] = useState(false);

  const [month, setMonth] = useState(getCurrentMonth);
  const isCurrentMonth = month === getCurrentMonth();
  const [tab, setTab] = useState<Tab>('income');
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [sortBy, setSortBy] = useState('date');

  // Modals
  const [incomeModal, setIncomeModal] = useState(false);
  const [expenseModal, setExpenseModal] = useState(false);
  const [editingIncome, setEditingIncome] = useState<IncomeRow | null>(null);
  const [editingExpense, setEditingExpense] = useState<ExpenseRow | null>(null);
  const [categoryManagerModal, setCategoryManagerModal] = useState(false);
  const [declarationsModal, setDeclarationsModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: Tab; id: string } | null>(null);
  const [pendingUpdate, setPendingUpdate] = useState<{ id: string; data: Record<string, unknown>; months?: number } | null>(null);

  useEffect(() => {
    Promise.all([fetchIncomes(), fetchExpenses(), fetchCategories(), fetchIncomeCategories()]);
  }, [fetchIncomes, fetchExpenses, fetchCategories, fetchIncomeCategories]);

  const filteredIncomes = useMemo(() =>
    incomes.filter(inc =>
      inc.recurrence === 'MONTHLY' || getMonthFromDate(inc.date) === month
    ),
    [incomes, month],
  );

  // Multi-currency totals for income
  const incomeByCurrency = useMemo(() => {
    const groups: Record<string, number> = {};
    filteredIncomes.forEach(inc => {
      const cur = inc.currency || 'BRL';
      groups[cur] = (groups[cur] || 0) + inc.amount;
    });
    return Object.entries(groups);
  }, [filteredIncomes]);

  // Fixed expenses for the selected month
  const fixedForMonth = useMemo(() =>
    fixedExpenses().filter(e =>
      !e.date || getMonthFromDate(e.date) === month
    ),
    [expenses, month],
  );

  // Multi-currency totals for fixed expenses
  const fixedByCurrency = useMemo(() => {
    const groups: Record<string, number> = {};
    fixedForMonth.forEach(e => {
      const cur = e.currency || 'BRL';
      groups[cur] = (groups[cur] || 0) + e.amount;
    });
    return Object.entries(groups);
  }, [fixedForMonth]);

  const variableForMonth = useMemo(() =>
    variableExpenses().filter(e => getMonthFromDate(e.date) === month),
    [expenses, month],
  );

  // Multi-currency totals for variable expenses
  const variableByCurrency = useMemo(() => {
    const groups: Record<string, number> = {};
    variableForMonth.forEach(e => {
      const cur = e.currency || 'BRL';
      groups[cur] = (groups[cur] || 0) + e.amount;
    });
    return Object.entries(groups);
  }, [variableForMonth]);

  const categoryOptions = [
    { value: 'all', label: t('common.allCategories') },
    ...categories.map(c => ({ value: c.id, label: translateCategoryName(c.name, t) })),
  ];

  function exportCSV() {
    const rows = [[t('expenses.csvHeaders.type'), t('expenses.csvHeaders.description'), t('expenses.csvHeaders.amount'), t('expenses.csvHeaders.date'), t('expenses.csvHeaders.category'), t('expenses.csvHeaders.statusPayment')]];
    incomes.forEach(i => rows.push([t('expenses.income'), i.description, String(i.amount), i.date, '', i.recurrence]));
    fixedExpenses().forEach(e => rows.push([t('expenses.fixedExpenses'), e.description, String(e.amount), `${t('expenses.day')} ${e.dueDay ?? '-'}`, translateCategoryName(e.category.name, t), e.status]));
    variableExpenses()
      .filter(e => getMonthFromDate(e.date) === month)
      .forEach(e => rows.push([t('expenses.variableExpenses'), e.description, String(e.amount), e.date, translateCategoryName(e.category.name, t), e.paymentMethod || '']));
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expenses-${month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast(t('expenses.csvExported'));
  }

  async function handleSyncOpenFinance() {
    setIsSyncing(true);
    try {
      const result = await importBankTransactions('all');
      if (result.expenses === 0 && result.incomes === 0) {
        toast(t('expenses.syncUpToDate'));
      } else {
        toast(t('expenses.syncSuccess', { expenses: result.expenses, incomes: result.incomes }));
        await Promise.all([fetchIncomes(), fetchExpenses()]);
      }
    } catch {
      toast(t('expenses.syncError'));
    } finally {
      setIsSyncing(false);
    }
  }

  async function handleDeleteSingle() {
    if (!deleteTarget) return;
    if (deleteTarget.type === 'income') await deleteIncome(deleteTarget.id);
    else await deleteExpense(deleteTarget.id);
    toast(t('expenses.itemDeleted'));
    setDeleteTarget(null);
  }

  async function handleDeleteFuture() {
    if (!deleteTarget) return;
    try {
      const result = await deleteFutureExpenses(deleteTarget.id);
      toast(t('expenses.expensesDeleted', { count: result.deleted }));
    } catch {
      toast(t('expenses.deleteFailed'));
    }
    setDeleteTarget(null);
  }

  async function handleUpdateThisMonth() {
    if (!pendingUpdate) return;
    const { months, ...rest } = pendingUpdate;
    await updateExpense(rest.id, rest.data);
    if (months && months > 0) {
      const result = await generateRecurring(rest.id, months);
      toast(t('expenses.expenseUpdatedRecurring', { count: result.created }));
    } else {
      toast(t('expenses.expenseUpdated'));
    }
    setPendingUpdate(null);
    setExpenseModal(false);
  }

  async function handleUpdateThisAndFuture() {
    if (!pendingUpdate) return;
    const { months, ...rest } = pendingUpdate;
    const newAmount = rest.data.amount as number;
    await updateExpense(rest.id, rest.data);
    await updateFutureAmount(rest.id, newAmount);
    if (months && months > 0) {
      const result = await generateRecurring(rest.id, months);
      toast(t('expenses.amountUpdatedFutureRecurring', { count: result.created }));
    } else {
      toast(t('expenses.amountUpdatedFuture'));
    }
    setPendingUpdate(null);
    setExpenseModal(false);
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'income', label: t('expenses.income') },
    { key: 'fixed', label: t('expenses.fixedExpenses') },
    { key: 'variable', label: t('expenses.variableExpenses') },
  ];

  // Render StatCards for multi-currency totals
  function renderCurrencyStatCards(
    byCurrency: [string, number][],
    label: string,
    icon: typeof ArrowUpCircle,
    color: string,
  ) {
    if (byCurrency.length <= 1) {
      const total = byCurrency[0]?.[1] || 0;
      const cur = byCurrency[0]?.[0];
      return <StatCard label={label} value={formatCurrency(total, cur)} icon={icon} color={color} />;
    }
    return byCurrency.map(([cur, total]) => (
      <StatCard key={cur} label={`${label} (${cur})`} value={formatCurrency(total, cur)} icon={icon} color={color} />
    ));
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">{t('expenses.title')}</h1>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={handleSyncOpenFinance} disabled={isSyncing}>
            <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? t('expenses.syncing') : t('expenses.syncOpenFinance')}
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setDeclarationsModal(true)}>
            <ClipboardCheck className="h-4 w-4" /> {t('settings.declarations')}
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setCategoryManagerModal(true)}>
            <Settings className="h-4 w-4" /> {t('expenses.manageCategories')}
          </Button>
          <Button variant="secondary" size="sm" onClick={exportCSV}><Download className="h-4 w-4" /> CSV</Button>
          <Button size="sm" onClick={() => {
            if (tab === 'income') { setEditingIncome(null); setIncomeModal(true); }
            else { setEditingExpense(null); setExpenseModal(true); }
          }}>
            <Plus className="h-4 w-4" /> {t('common.add')}
          </Button>
        </div>
      </div>

      {/* Month Navigation */}
      <div className="flex items-center justify-center gap-4">
        <button onClick={() => setMonth(m => navigateMonth(m, -1))}
          className="p-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700 text-surface-500 hover:text-surface-900 dark:hover:text-white transition-colors">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="text-center min-w-[200px]">
          <span className="text-lg font-semibold">{formatMonthYearLong(month)}</span>
          {!isCurrentMonth && (
            <button onClick={() => setMonth(getCurrentMonth())}
              className="ml-3 text-xs text-primary-500 hover:text-primary-600 font-medium">
              {t('common.today')}
            </button>
          )}
        </div>
        <button onClick={() => setMonth(m => navigateMonth(m, 1))}
          className="p-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700 text-surface-500 hover:text-surface-900 dark:hover:text-white transition-colors">
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {renderCurrencyStatCards(incomeByCurrency, t('expenses.totalIncome'), ArrowUpCircle, 'text-green-500')}
        {renderCurrencyStatCards(fixedByCurrency, t('expenses.fixedExpenses'), ArrowDownCircle, 'text-red-500')}
        {renderCurrencyStatCards(variableByCurrency, t('expenses.variableExpenses'), DollarSign, 'text-amber-500')}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface-100 dark:bg-surface-800 rounded-lg p-1">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors
              ${tab === t.key ? 'bg-white dark:bg-surface-700 shadow-sm text-surface-900 dark:text-white' : 'text-surface-500 hover:text-surface-700 dark:hover:text-surface-300'}`}
          >{t.label}</button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400" />
            <input
              type="text" placeholder={t('common.search')} value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-700 text-sm text-surface-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
            />
          </div>
        </div>
        {tab !== 'income' && (
          <Select options={categoryOptions} value={filterCategory} onChange={e => setFilterCategory(e.target.value)} />
        )}
        <Select options={[{ value: 'date', label: t('common.sortByDate') }, { value: 'amount', label: t('common.sortByAmount') }, { value: 'category', label: t('common.sortByCategory') }]}
          value={sortBy} onChange={e => setSortBy(e.target.value)} />
      </div>

      {/* Content */}
      <Card className="!p-0">
        {tab === 'income' && (
          <IncomeTable incomes={filteredIncomes} search={search} sortBy={sortBy}
            onEdit={i => { setEditingIncome(i); setIncomeModal(true); }}
            onDelete={id => setDeleteTarget({ type: 'income', id })} />
        )}
        {tab === 'fixed' && (
          <ExpenseTable expenses={fixedForMonth} search={search} sortBy={sortBy} filterCategory={filterCategory}
            showDueDay showDate showStatus showPayment
            onEdit={e => { setEditingExpense(e); setExpenseModal(true); }}
            onDelete={id => setDeleteTarget({ type: 'fixed', id })}
            onToggleType={async (id) => { await toggleExpenseType(id); toast(t('expenses.typeChanged')); }} />
        )}
        {tab === 'variable' && (
          <ExpenseTable expenses={variableForMonth}
            search={search} sortBy={sortBy} filterCategory={filterCategory}
            showDate showPayment showStatus
            onEdit={e => { setEditingExpense(e); setExpenseModal(true); }}
            onDelete={id => setDeleteTarget({ type: 'variable', id })}
            onToggleType={async (id) => { await toggleExpenseType(id); toast(t('expenses.typeChanged')); }} />
        )}
      </Card>

      {/* Income Modal */}
      <IncomeFormModal open={incomeModal} onClose={() => setIncomeModal(false)} editing={editingIncome}
        categories={incomeCategories}
        onSave={async (data) => {
          if (editingIncome) await updateIncome(editingIncome.id, data);
          else await addIncome(data as any);
          toast(editingIncome ? t('expenses.incomeUpdated') : t('expenses.incomeAdded'));
          setIncomeModal(false);
        }} />

      {/* Expense Modal */}
      <ExpenseFormModal open={expenseModal} onClose={() => setExpenseModal(false)}
        editing={editingExpense} type={tab === 'variable' ? 'VARIABLE' : 'FIXED'}
        categories={categories}
        onSave={async (data) => {
          const months = data._recurringMonths as number | undefined;
          delete data._recurringMonths;
          if (editingExpense) {
            const amountChanged = (data.amount as number) !== editingExpense.amount;
            if (amountChanged && editingExpense.type === 'FIXED') {
              setPendingUpdate({ id: editingExpense.id, data, months });
              return;
            }
            await updateExpense(editingExpense.id, data);
            if (months && months > 0) {
              const result = await generateRecurring(editingExpense.id, months);
              toast(t('expenses.expenseUpdatedRecurring', { count: result.created }));
            } else {
              toast(t('expenses.expenseUpdated'));
            }
          } else {
            const expense = await addExpense(data as any);
            if (months && months > 0 && expense?.id) {
              const result = await generateRecurring(expense.id, months);
              toast(t('expenses.expenseCreatedRecurring', { count: result.created }));
            } else {
              toast(t('expenses.expenseAdded'));
            }
          }
          setExpenseModal(false);
        }} />

      {/* Declarations Modal */}
      <Modal open={declarationsModal} onClose={() => setDeclarationsModal(false)} title={t('settings.declarations')} maxWidth="max-w-2xl">
        <DeclarationList />
      </Modal>

      {/* Category Manager Modal */}
      <CategoryManagerModal
        open={categoryManagerModal}
        onClose={() => setCategoryManagerModal(false)}
        categories={categories}
        incomeCategories={incomeCategories}
        onUpdate={updateCategory}
        onDelete={deleteCategory}
        onCreate={async (data) => { await useFinanceStore.getState().addCategory(data); }}
      />

      {/* Delete Modal */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title={t('expenses.deleteItem')}>
        <div className="space-y-4">
          <p className="text-sm text-surface-500">{t('expenses.deleteConfirm')}</p>
          <div className="flex flex-col gap-2">
            <Button variant="secondary" onClick={handleDeleteSingle} className="justify-center">
              {deleteTarget?.type === 'fixed' ? t('expenses.deleteThisMonth') : t('common.delete')}
            </Button>
            {deleteTarget?.type === 'fixed' && (
              <Button variant="secondary" onClick={handleDeleteFuture}
                className="justify-center text-red-500 hover:text-red-600">
                {t('expenses.deleteThisAndFuture')}
              </Button>
            )}
          </div>
          <div className="flex justify-end">
            <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(null)}>{t('common.cancel')}</Button>
          </div>
        </div>
      </Modal>

      {/* Confirm amount change scope for fixed expenses */}
      <Modal open={!!pendingUpdate} onClose={() => setPendingUpdate(null)} title={t('expenses.changeAmount')}>
        <div className="space-y-4">
          <p className="text-sm text-surface-500">
            {t('expenses.changeAmountDesc')}
          </p>
          <div className="flex flex-col gap-2">
            <Button variant="secondary" onClick={handleUpdateThisMonth} className="justify-center">
              {t('expenses.changeThisMonth')}
            </Button>
            <Button variant="secondary" onClick={handleUpdateThisAndFuture} className="justify-center">
              {t('expenses.changeThisAndFuture')}
            </Button>
          </div>
          <div className="flex justify-end">
            <Button variant="ghost" size="sm" onClick={() => setPendingUpdate(null)}>{t('common.cancel')}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ---- Tables ----

function IncomeTable({ incomes, search, sortBy, onEdit, onDelete }: {
  incomes: IncomeRow[]; search: string; sortBy: string;
  onEdit: (i: IncomeRow) => void; onDelete: (id: string) => void;
}) {
  const { t } = useTranslation();
  const filtered = useMemo(() => {
    let list = incomes.filter(i => i.description.toLowerCase().includes(search.toLowerCase()));
    if (sortBy === 'amount') list = [...list].sort((a, b) => b.amount - a.amount);
    else if (sortBy === 'category') list = [...list].sort((a, b) => (a.category?.name || '').localeCompare(b.category?.name || ''));
    else list = [...list].sort((a, b) => b.date.localeCompare(a.date));
    return list;
  }, [incomes, search, sortBy]);

  function recurrenceBadge(inc: IncomeRow) {
    if (inc.recurrence === 'CONTRACT') {
      return <Badge variant="warning">{t('expenses.contractLabel')}{inc.contractMonths ? ` (${inc.contractMonths}m)` : ''}</Badge>;
    }
    if (inc.recurrence === 'MONTHLY') {
      return <Badge variant="info">{t('expenses.monthly')}{inc.recurrenceDay ? ` (${t('expenses.day').toLowerCase()} ${inc.recurrenceDay})` : ''}</Badge>;
    }
    return <Badge variant="default">{t('expenses.oneTime')}</Badge>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-surface-200 dark:border-surface-700 text-left text-xs text-surface-500 uppercase tracking-wide">
            <th className="px-5 py-3">{t('common.description')}</th><th className="px-5 py-3">{t('common.category')}</th><th className="px-5 py-3">{t('common.amount')}</th><th className="px-5 py-3">{t('common.date')}</th><th className="px-5 py-3">{t('expenses.recurrence')}</th><th className="px-5 py-3 w-24">{t('common.actions')}</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map(i => (
            <tr key={i.id} className="border-b border-surface-100 dark:border-surface-700/50 hover:bg-surface-50 dark:hover:bg-surface-800/50">
              <td className="px-5 py-3 font-medium">{i.description}</td>
              <td className="px-5 py-3 text-surface-500">{i.category ? translateCategoryName(i.category.name, t) : '—'}</td>
              <td className="px-5 py-3 text-green-600 dark:text-green-400 font-semibold">{formatCurrency(i.amount, i.currency)}</td>
              <td className="px-5 py-3 text-surface-500">{formatDate(i.date)}</td>
              <td className="px-5 py-3">{recurrenceBadge(i)}</td>
              <td className="px-5 py-3">
                <div className="flex gap-1">
                  <button onClick={() => onEdit(i)} className="p-1.5 rounded hover:bg-surface-100 dark:hover:bg-surface-700 text-surface-400 hover:text-primary-500"><Edit2 className="h-4 w-4" /></button>
                  <button onClick={() => onDelete(i.id)} className="p-1.5 rounded hover:bg-surface-100 dark:hover:bg-surface-700 text-surface-400 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
                </div>
              </td>
            </tr>
          ))}
          {filtered.length === 0 && <tr><td colSpan={6} className="px-5 py-8 text-center text-surface-500">{t('expenses.noIncome')}</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

function ExpenseTable({ expenses, search, sortBy, filterCategory, showDueDay, showDate, showPayment, showStatus, onEdit, onDelete, onToggleType }: {
  expenses: ExpenseRow[]; search: string; sortBy: string; filterCategory: string;
  showDueDay?: boolean; showDate?: boolean; showPayment?: boolean; showStatus?: boolean;
  onEdit: (e: ExpenseRow) => void; onDelete: (id: string) => void; onToggleType?: (id: string) => void;
}) {
  const { t } = useTranslation();
  const paymentLabels: Record<string, string> = {
    CASH: t('expenses.cash'),
    CREDIT: t('expenses.credit'),
    DEBIT: t('expenses.debit'),
    PIX: t('expenses.pix'),
  };
  const statusLabels: Record<string, string> = {
    PAID: t('expenses.paid'),
    PENDING: t('expenses.pending'),
  };

  const filtered = useMemo(() => {
    let list = expenses.filter(e => e.description.toLowerCase().includes(search.toLowerCase()));
    if (filterCategory !== 'all') list = list.filter(e => e.categoryId === filterCategory);
    if (sortBy === 'amount') list = [...list].sort((a, b) => b.amount - a.amount);
    else if (sortBy === 'category') list = [...list].sort((a, b) => a.category.name.localeCompare(b.category.name));
    else if (showDueDay && !showDate) list = [...list].sort((a, b) => (a.dueDay ?? 0) - (b.dueDay ?? 0));
    else list = [...list].sort((a, b) => b.date.localeCompare(a.date));
    return list;
  }, [expenses, search, sortBy, filterCategory, showDueDay, showDate]);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-surface-200 dark:border-surface-700 text-left text-xs text-surface-500 uppercase tracking-wide">
            <th className="px-5 py-3">{t('common.description')}</th>
            <th className="px-5 py-3">{t('common.amount')}</th>
            {showDate && <th className="px-5 py-3">{t('common.date')}</th>}
            {showDueDay && <th className="px-5 py-3">{t('expenses.dueDayShort')}</th>}
            <th className="px-5 py-3">{t('common.category')}</th>
            {showStatus && <th className="px-5 py-3">{t('common.status')}</th>}
            {showPayment && <th className="px-5 py-3">{t('expenses.payment')}</th>}
            <th className="px-5 py-3 w-24">{t('common.actions')}</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map(e => (
            <tr key={e.id} className="border-b border-surface-100 dark:border-surface-700/50 hover:bg-surface-50 dark:hover:bg-surface-800/50">
              <td className="px-5 py-3 font-medium">
                {e.description}
                {e.totalInstallments && e.totalInstallments > 1 && (
                  <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400">
                    {e.installmentNumber}/{e.totalInstallments}
                  </span>
                )}
                {e.fixedAmountType === 'VARIABLE_AMOUNT' && (
                  <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                    {t('expenses.variableAmountTag')}
                  </span>
                )}
              </td>
              <td className="px-5 py-3 text-red-500 font-semibold">{formatCurrency(e.amount, e.currency)}</td>
              {showDate && <td className="px-5 py-3 text-surface-500">{formatDate(e.date)}</td>}
              {showDueDay && <td className="px-5 py-3 text-surface-500">{t('expenses.day')} {e.dueDay ?? '—'}</td>}
              <td className="px-5 py-3">{translateCategoryName(e.category.name, t)}</td>
              {showStatus && (
                <td className="px-5 py-3">
                  <Badge variant={e.status === 'PAID' ? 'success' : 'warning'}>
                    {statusLabels[e.status] || e.status}
                  </Badge>
                </td>
              )}
              {showPayment && (
                <td className="px-5 py-3">
                  <Badge>{paymentLabels[e.paymentMethod || ''] || e.paymentMethod}</Badge>
                </td>
              )}
              <td className="px-5 py-3">
                <div className="flex gap-1">
                  {onToggleType && (
                    <button onClick={() => onToggleType(e.id)}
                      title={e.type === 'FIXED' ? t('expenses.changeToVariable') : t('expenses.changeToFixed')}
                      className="p-1.5 rounded hover:bg-surface-100 dark:hover:bg-surface-700 text-surface-400 hover:text-amber-500">
                      <ArrowLeftRight className="h-4 w-4" />
                    </button>
                  )}
                  <button onClick={() => onEdit(e)} className="p-1.5 rounded hover:bg-surface-100 dark:hover:bg-surface-700 text-surface-400 hover:text-primary-500"><Edit2 className="h-4 w-4" /></button>
                  <button onClick={() => onDelete(e.id)} className="p-1.5 rounded hover:bg-surface-100 dark:hover:bg-surface-700 text-surface-400 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
                </div>
              </td>
            </tr>
          ))}
          {filtered.length === 0 && (
            <tr><td colSpan={10} className="px-5 py-8 text-center text-surface-500">{t('expenses.noExpense')}</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ---- Form Modals ----

function CurrencySelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { t } = useTranslation();
  return (
    <Select
      label={t('common.currency')}
      value={value}
      onChange={e => onChange(e.target.value)}
      options={CURRENCIES.map(c => ({
        value: c.code,
        label: `${c.flag} ${c.code}`,
      }))}
    />
  );
}

function IncomeFormModal({ open, onClose, editing, categories, onSave }: {
  open: boolean; onClose: () => void; editing: IncomeRow | null;
  categories: Array<{ id: string; name: string }>;
  onSave: (data: Record<string, unknown>) => void;
}) {
  const { t } = useTranslation();
  const defaultCurrency = useUserSettingsStore(s => s.settings?.currency || 'BRL');
  const { addCategory } = useFinanceStore();
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState(defaultCurrency);
  const [date, setDate] = useState('');
  const [recurrence, setRecurrence] = useState('MONTHLY');
  const [categoryId, setCategoryId] = useState('');
  const [recurrenceDay, setRecurrenceDay] = useState('');
  const [contractMonths, setContractMonths] = useState('');
  const [contractStartDate, setContractStartDate] = useState('');
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  useMemo(() => {
    if (open) {
      setDesc(editing?.description || '');
      setAmount(editing ? String(editing.amount) : '');
      setCurrency(editing?.currency || defaultCurrency);
      setDate(editing?.date?.slice(0, 10) || new Date().toISOString().slice(0, 10));
      setRecurrence(editing?.recurrence?.toUpperCase() || 'MONTHLY');
      setCategoryId(editing?.categoryId || categories[0]?.id || '');
      setRecurrenceDay(editing?.recurrenceDay ? String(editing.recurrenceDay) : '');
      setContractMonths(editing?.contractMonths ? String(editing.contractMonths) : '');
      setContractStartDate(editing?.contractStartDate?.slice(0, 10) || '');
      setCreatingCategory(false);
      setNewCategoryName('');
    }
  }, [open, editing, categories]);

  async function handleCreateCategory() {
    if (!newCategoryName.trim()) return;
    const newCat = await addCategory({ name: newCategoryName.trim(), type: 'INCOME' });
    setCategoryId(newCat.id);
    setCreatingCategory(false);
    setNewCategoryName('');
  }

  function handleSave() {
    if (!desc || !amount) return;
    const data: Record<string, unknown> = {
      description: desc,
      amount: parseFloat(amount),
      currency,
      date,
      recurrence,
      categoryId: categoryId || undefined,
    };
    if (recurrence === 'MONTHLY' && recurrenceDay) {
      data.recurrenceDay = parseInt(recurrenceDay);
    }
    if (recurrence === 'CONTRACT') {
      if (contractMonths) data.contractMonths = parseInt(contractMonths);
      if (contractStartDate) data.contractStartDate = contractStartDate;
    }
    onSave(data);
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? t('expenses.editIncome') : t('expenses.addIncome')}>
      <div className="space-y-4">
        <Input label={t('common.description')} value={desc} onChange={e => setDesc(e.target.value)} placeholder={t('expenses.descriptionPlaceholder')} required />
        <div className="flex gap-3">
          <div className="flex-1">
            <Input label={t('expenses.valueLabel')} type="number" min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} required />
          </div>
          <div className="w-32">
            <CurrencySelect value={currency} onChange={setCurrency} />
          </div>
        </div>
        <div>
          <Select label={t('common.category')} value={categoryId} onChange={e => {
            if (e.target.value === '__new__') { setCreatingCategory(true); return; }
            setCategoryId(e.target.value);
          }}
            options={[{ value: '', label: t('expenses.noCategory') }, ...categories.map(c => ({ value: c.id, label: translateCategoryName(c.name, t) })), { value: '__new__', label: t('expenses.newCategory') }]} />
          {creatingCategory && (
            <div className="flex gap-2 mt-2">
              <Input value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)}
                placeholder={t('expenses.categoryNamePlaceholder')} className="flex-1" />
              <Button size="sm" onClick={handleCreateCategory} disabled={!newCategoryName.trim()}>{t('common.create')}</Button>
              <Button size="sm" variant="ghost" onClick={() => { setCreatingCategory(false); setNewCategoryName(''); }}>X</Button>
            </div>
          )}
        </div>
        <Select label={t('expenses.recurrence')} value={recurrence} onChange={e => setRecurrence(e.target.value)}
          options={[
            { value: 'MONTHLY', label: t('expenses.monthly') },
            { value: 'ONE_TIME', label: t('expenses.oneTime') },
            { value: 'CONTRACT', label: t('expenses.contract') },
          ]} />
        <Input label={t('common.date')} type="date" value={date} onChange={e => setDate(e.target.value)} required />
        {recurrence === 'MONTHLY' && (
          <Input label={t('expenses.recurrenceDay')} type="number" min="1" max="31" value={recurrenceDay}
            onChange={e => setRecurrenceDay(e.target.value)} placeholder={t('expenses.recurrenceDayPlaceholder')} />
        )}
        {recurrence === 'CONTRACT' && (
          <>
            <Input label={t('expenses.contractStartDate')} type="date" value={contractStartDate}
              onChange={e => setContractStartDate(e.target.value)} />
            <Input label={t('expenses.contractDuration')} type="number" min="1" max="120" value={contractMonths}
              onChange={e => setContractMonths(e.target.value)} placeholder={t('expenses.contractDurationPlaceholder')} />
          </>
        )}
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
          <Button onClick={handleSave} disabled={!desc || !amount}>{t('common.save')}</Button>
        </div>
      </div>
    </Modal>
  );
}

function ExpenseFormModal({ open, onClose, editing, type, categories, onSave }: {
  open: boolean; onClose: () => void;
  editing: ExpenseRow | null;
  type: 'FIXED' | 'VARIABLE';
  categories: Array<{ id: string; name: string }>;
  onSave: (data: Record<string, unknown>) => void;
}) {
  const { t } = useTranslation();
  const defaultCurrency = useUserSettingsStore(s => s.settings?.currency || 'BRL');
  const { addCategory } = useFinanceStore();
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState(defaultCurrency);
  const [categoryId, setCategoryId] = useState('');
  const [dueDay, setDueDay] = useState('1');
  const [status, setStatus] = useState('PENDING');
  const [date, setDate] = useState('');
  const [payment, setPayment] = useState('PIX');
  const [fixedAmountType, setFixedAmountType] = useState<'FIXED_AMOUNT' | 'VARIABLE_AMOUNT'>('FIXED_AMOUNT');
  const [recurring, setRecurring] = useState(false);
  const [recurringMonths, setRecurringMonths] = useState('6');
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const isFixed = editing ? editing.type === 'FIXED' : type === 'FIXED';

  useMemo(() => {
    if (open) {
      setDesc(editing?.description || '');
      setAmount(editing ? String(editing.amount) : '');
      setCurrency(editing?.currency || defaultCurrency);
      setCategoryId(editing?.categoryId || categories[0]?.id || '');
      setDueDay(editing?.dueDay ? String(editing.dueDay) : '1');
      setStatus(editing?.status || 'PENDING');
      setDate(editing?.date?.slice(0, 10) || new Date().toISOString().slice(0, 10));
      setPayment(editing?.paymentMethod || 'PIX');
      setFixedAmountType((editing as any)?.fixedAmountType || 'FIXED_AMOUNT');
      setRecurring(false);
      setRecurringMonths('6');
      setCreatingCategory(false);
      setNewCategoryName('');
    }
  }, [open, editing, categories]);

  async function handleCreateCategory() {
    if (!newCategoryName.trim()) return;
    const newCat = await addCategory({ name: newCategoryName.trim(), type: 'EXPENSE' });
    setCategoryId(newCat.id);
    setCreatingCategory(false);
    setNewCategoryName('');
  }

  function handleSave() {
    if (!desc || !amount) return;
    const data: Record<string, unknown> = {
      description: desc,
      amount: parseFloat(amount),
      currency,
      type: isFixed ? 'FIXED' : 'VARIABLE',
      categoryId,
      date,
    };
    if (isFixed) {
      data.dueDay = parseInt(dueDay);
      data.status = status;
      data.fixedAmountType = fixedAmountType;
      if (recurring) {
        data._recurringMonths = parseInt(recurringMonths) || 6;
      }
    } else {
      data.paymentMethod = payment;
    }
    onSave(data);
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? t('expenses.editExpense') : (isFixed ? t('expenses.addFixedExpense') : t('expenses.addVariableExpense'))}>
      <div className="space-y-4">
        <Input label={t('common.description')} value={desc} onChange={e => setDesc(e.target.value)} placeholder={isFixed ? t('expenses.fixedPlaceholder') : t('expenses.variablePlaceholder')} required />
        <div className="flex gap-3">
          <div className="flex-1">
            <Input label={t('expenses.valueLabel')} type="number" min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} required />
          </div>
          <div className="w-32">
            <CurrencySelect value={currency} onChange={setCurrency} />
          </div>
        </div>
        {isFixed && (
          <Input label={t('expenses.dueDay')} type="number" min="1" max="31" value={dueDay} onChange={e => setDueDay(e.target.value)} />
        )}
        <Input label={t('common.date')} type="date" value={date} onChange={e => setDate(e.target.value)} required />
        <div>
          <Select label={t('common.category')} value={categoryId} onChange={e => {
            if (e.target.value === '__new__') { setCreatingCategory(true); return; }
            setCategoryId(e.target.value);
          }}
            options={[...categories.map(c => ({ value: c.id, label: translateCategoryName(c.name, t) })), { value: '__new__', label: t('expenses.newCategory') }]} />
          {creatingCategory && (
            <div className="flex gap-2 mt-2">
              <Input value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)}
                placeholder={t('expenses.categoryNamePlaceholder')} className="flex-1" />
              <Button size="sm" onClick={handleCreateCategory} disabled={!newCategoryName.trim()}>{t('common.create')}</Button>
              <Button size="sm" variant="ghost" onClick={() => { setCreatingCategory(false); setNewCategoryName(''); }}>X</Button>
            </div>
          )}
        </div>
        {isFixed && (
          <Select label={t('expenses.amountType')} value={fixedAmountType} onChange={e => setFixedAmountType(e.target.value as any)}
            options={[
              { value: 'FIXED_AMOUNT', label: t('expenses.fixedAmount') },
              { value: 'VARIABLE_AMOUNT', label: t('expenses.variableAmount') },
            ]} />
        )}
        {isFixed && (
          <Select label={t('common.status')} value={status} onChange={e => setStatus(e.target.value)}
            options={[{ value: 'PENDING', label: t('expenses.pending') }, { value: 'PAID', label: t('expenses.paid') }]} />
        )}
        {isFixed && (
          <div className="space-y-3 rounded-lg border border-surface-200 dark:border-surface-700 p-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={recurring} onChange={e => setRecurring(e.target.checked)}
                className="rounded accent-primary-500" />
              <span className="text-sm font-medium">{t('expenses.recurring')}</span>
            </label>
            {recurring && (
              <>
                <Input label={t('expenses.recurringMonths')} type="number" min="1" max="24" value={recurringMonths}
                  onChange={e => setRecurringMonths(e.target.value)} />
                <p className="text-xs text-surface-400">
                  {fixedAmountType === 'FIXED_AMOUNT'
                    ? t('expenses.recurringFixedDesc', { months: recurringMonths, amount: formatCurrency(parseFloat(amount) || 0, currency) })
                    : t('expenses.recurringVariableDesc', { months: recurringMonths })}
                </p>
              </>
            )}
          </div>
        )}
        {!isFixed && (
          <Select label={t('expenses.paymentMethod')} value={payment} onChange={e => setPayment(e.target.value)}
            options={[{ value: 'CASH', label: t('expenses.cash') }, { value: 'CREDIT', label: t('expenses.credit') }, { value: 'DEBIT', label: t('expenses.debit') }, { value: 'PIX', label: t('expenses.pix') }]} />
        )}
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
          <Button onClick={handleSave} disabled={!desc || !amount}>{t('common.save')}</Button>
        </div>
      </div>
    </Modal>
  );
}

// ---- Category Manager Modal ----

function CategoryManagerModal({ open, onClose, categories, incomeCategories, onUpdate, onDelete, onCreate }: {
  open: boolean; onClose: () => void;
  categories: Array<{ id: string; name: string; emoji: string; isDefault: boolean; type: string }>;
  incomeCategories: Array<{ id: string; name: string; emoji: string; isDefault: boolean; type: string }>;
  onUpdate: (id: string, data: { name?: string; emoji?: string }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onCreate: (data: { name: string; emoji?: string; type: string }) => Promise<void>;
}) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmoji, setEditEmoji] = useState('');
  const [tab, setTab] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmoji, setNewEmoji] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const allCategories = useMemo(() => {
    const expenseCats = categories.map(c => ({ ...c, source: 'EXPENSE' as const }));
    const incomeCats = incomeCategories
      .filter(c => !categories.some(ec => ec.id === c.id))
      .map(c => ({ ...c, source: 'INCOME' as const }));
    return [...expenseCats, ...incomeCats];
  }, [categories, incomeCategories]);

  const filtered = allCategories.filter(c => {
    if (tab === 'EXPENSE') return c.type === 'EXPENSE' || c.type === 'BOTH';
    return c.type === 'INCOME' || c.type === 'BOTH';
  });

  function startEdit(cat: typeof allCategories[0]) {
    setEditingId(cat.id);
    setEditName(cat.name);
    setEditEmoji(cat.emoji);
  }

  async function saveEdit() {
    if (!editingId || !editName.trim()) return;
    try {
      await onUpdate(editingId, { name: editName.trim(), emoji: editEmoji });
      toast(t('expenses.categoryUpdated'));
      setEditingId(null);
    } catch {
      toast(t('expenses.categoryUpdateFailed'));
    }
  }

  async function handleDelete(id: string) {
    try {
      await onDelete(id);
      toast(t('expenses.categoryDeleted'));
    } catch {
      toast(t('expenses.categoryInUse'));
    }
    setDeleteConfirmId(null);
  }

  async function handleCreate() {
    if (!newName.trim()) return;
    try {
      await onCreate({ name: newName.trim(), emoji: newEmoji || undefined, type: tab });
      toast(t('expenses.categoryCreated'));
      setNewName('');
      setNewEmoji('');
      setCreating(false);
    } catch {
      toast(t('expenses.categoryCreateFailed'));
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={t('expenses.manageCategories')}>
      <div className="space-y-4">
        <div className="flex gap-1 bg-surface-100 dark:bg-surface-800 rounded-lg p-1">
          {(['EXPENSE', 'INCOME'] as const).map(t2 => (
            <button key={t2} onClick={() => { setTab(t2); setCreating(false); setDeleteConfirmId(null); }}
              className={`flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors
                ${tab === t2 ? 'bg-white dark:bg-surface-700 shadow-sm text-surface-900 dark:text-white' : 'text-surface-500 hover:text-surface-700 dark:hover:text-surface-300'}`}
            >{t2 === 'EXPENSE' ? t('expenses.expenseCategories') : t('expenses.incomeCategories')}</button>
          ))}
        </div>

        <div className="space-y-1 max-h-80 overflow-y-auto">
          {filtered.map(cat => (
            <div key={cat.id} className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-surface-50 dark:hover:bg-surface-800/50 group">
              {editingId === cat.id ? (
                <>
                  <input value={editEmoji} onChange={e => setEditEmoji(e.target.value)}
                    className="w-10 text-center rounded border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-700 text-sm p-1"
                    maxLength={4} />
                  <input value={editName} onChange={e => setEditName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditingId(null); }}
                    className="flex-1 rounded border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-700 text-sm px-2 py-1 focus:ring-2 focus:ring-primary-500 focus:outline-none"
                    autoFocus />
                  <button onClick={saveEdit} className="p-1 rounded hover:bg-green-100 dark:hover:bg-green-900/30 text-green-600">
                    <Check className="h-4 w-4" />
                  </button>
                  <button onClick={() => setEditingId(null)} className="p-1 rounded hover:bg-surface-100 dark:hover:bg-surface-700 text-surface-400">
                    <X className="h-4 w-4" />
                  </button>
                </>
              ) : deleteConfirmId === cat.id ? (
                <div className="flex items-center gap-2 flex-1">
                  <span className="text-xs text-surface-500 flex-1">{t('expenses.deleteCategoryConfirm')}</span>
                  <Button size="sm" variant="secondary" onClick={() => handleDelete(cat.id)}
                    className="!text-red-500 !text-xs !px-2 !py-1">{t('common.delete')}</Button>
                  <Button size="sm" variant="ghost" onClick={() => setDeleteConfirmId(null)}
                    className="!text-xs !px-2 !py-1">{t('common.cancel')}</Button>
                </div>
              ) : (
                <>
                  <span className="w-8 text-center">{cat.emoji || '📁'}</span>
                  <span className="flex-1 text-sm text-surface-900 dark:text-white">{translateCategoryName(cat.name, t)}</span>
                  {cat.type === 'BOTH' && (
                    <Badge variant="info" className="text-[10px]">{t('common.all')}</Badge>
                  )}
                  {cat.isDefault && (
                    <Badge variant="default" className="text-[10px]">{t('expenses.defaultCategory')}</Badge>
                  )}
                  <button onClick={() => startEdit(cat)}
                    className="p-1 rounded hover:bg-surface-100 dark:hover:bg-surface-700 text-surface-400 hover:text-primary-500 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => setDeleteConfirmId(cat.id)}
                    className="p-1 rounded hover:bg-surface-100 dark:hover:bg-surface-700 text-surface-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </>
              )}
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="text-sm text-surface-500 text-center py-4">{t('common.noResults')}</p>
          )}
        </div>

        {creating ? (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-primary-200 dark:border-primary-800 bg-primary-50/50 dark:bg-primary-900/10">
            <input value={newEmoji} onChange={e => setNewEmoji(e.target.value)}
              placeholder="📁"
              className="w-10 text-center rounded border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-700 text-sm p-1"
              maxLength={4} />
            <input value={newName} onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') { setCreating(false); setNewName(''); setNewEmoji(''); } }}
              placeholder={t('expenses.categoryNamePlaceholder')}
              className="flex-1 rounded border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-700 text-sm px-2 py-1 focus:ring-2 focus:ring-primary-500 focus:outline-none"
              autoFocus />
            <button onClick={handleCreate} disabled={!newName.trim()}
              className="p-1 rounded hover:bg-green-100 dark:hover:bg-green-900/30 text-green-600 disabled:opacity-40">
              <Check className="h-4 w-4" />
            </button>
            <button onClick={() => { setCreating(false); setNewName(''); setNewEmoji(''); }}
              className="p-1 rounded hover:bg-surface-100 dark:hover:bg-surface-700 text-surface-400">
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button onClick={() => setCreating(true)}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-dashed border-surface-300 dark:border-surface-600 text-sm text-surface-500 hover:text-primary-500 hover:border-primary-400 transition-colors">
            <Plus className="h-4 w-4" /> {t('expenses.newCategory')}
          </button>
        )}

        <div className="flex justify-end pt-2">
          <Button variant="secondary" onClick={onClose}>{t('common.close')}</Button>
        </div>
      </div>
    </Modal>
  );
}

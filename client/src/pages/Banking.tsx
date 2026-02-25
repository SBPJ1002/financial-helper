import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Landmark, RefreshCw, Trash2, Wallet, ArrowDownLeft, ArrowUpRight, Loader2, Plus, Download,
  Edit2, ArrowLeftRight, Check,
} from 'lucide-react';
import { PluggyConnect } from 'react-pluggy-connect';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { useToast } from '../components/ui/Toast';
import { useBankingStore } from '../stores/useBankingStore';
import { formatCurrency, formatDate } from '../utils/format';
import { translateCategoryName } from '../utils/categoryTranslation';

export default function Banking() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const {
    connections, accounts, transactions, totalPages,
    isLoading, isImporting, fetchConnections, fetchAccounts, fetchTransactions,
    getConnectToken, createConnection, syncConnection, deleteConnection,
    importTransactions, fetchImportBatch, bulkRename, toggleExpenseType, renameItem,
  } = useBankingStore();
  const [page, setPage] = useState(1);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [connectToken, setConnectToken] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  // Import options
  const [importModal, setImportModal] = useState(false);
  const [importMode, setImportMode] = useState('all');

  // Post-import review
  const [reviewModal, setReviewModal] = useState(false);
  const [reviewBatchId, setReviewBatchId] = useState<string | null>(null);
  const [reviewIncomes, setReviewIncomes] = useState<Array<{ id: string; description: string; amount: number; date: string; recurrence: string }>>([]);
  const [reviewExpenses, setReviewExpenses] = useState<Array<{ id: string; description: string; amount: number; type: string; date: string; category: { name: string; emoji: string } }>>([]);
  const [editingDesc, setEditingDesc] = useState<{ type: string; id: string; desc: string } | null>(null);

  useEffect(() => {
    fetchConnections();
    fetchAccounts();
    fetchTransactions();
  }, [fetchConnections, fetchAccounts, fetchTransactions]);

  useEffect(() => {
    fetchTransactions(page);
  }, [page, fetchTransactions]);

  async function handleConnectBank() {
    setConnecting(true);
    try {
      const token = await getConnectToken();
      setConnectToken(token);
    } catch {
      toast(t('banking.connectionFailed'));
    }
    setConnecting(false);
  }

  async function handleSync(id: string) {
    setSyncing(id);
    try {
      const result = await syncConnection(id);
      const parts: string[] = [];
      if (result.investments.synced > 0) {
        parts.push(t('banking.syncedInvestments', { count: result.investments.synced }));
      }
      if (result.transactions.newCount > 0) {
        parts.push(t('banking.syncedNewTransactions', { count: result.transactions.newCount }));
      }
      if (parts.length > 0) {
        toast(`${t('banking.syncSuccess')} — ${parts.join(', ')}`);
      } else {
        toast(t('banking.syncSuccess'));
      }
      fetchConnections();
      fetchAccounts();
      fetchTransactions(page);
    } catch {
      toast(t('banking.syncFailed'));
    }
    setSyncing(null);
  }

  async function handleDelete() {
    if (!deleteId) return;
    try {
      await deleteConnection(deleteId);
      toast(t('banking.connectionRemoved'));
      fetchConnections();
      fetchAccounts();
    } catch {
      toast(t('banking.connectionRemoveFailed'));
    }
    setDeleteId(null);
  }

  async function handleImport() {
    setImportModal(false);
    try {
      const result = await importTransactions(importMode);
      if (result.total === 0) {
        toast(t('banking.importNoNew'));
        setImportMode('all');
        return;
      }
      const parts = [];
      if (result.expenses > 0) parts.push(t('banking.importedExpenses', { count: result.expenses }));
      if (result.incomes > 0) parts.push(t('banking.importedIncomes', { count: result.incomes }));
      if (result.skipped > 0) parts.push(t('banking.importedSkipped', { count: result.skipped }));
      toast(t('banking.importedSummary', { summary: parts.join(', ') }));
      fetchTransactions(page);

      // Open review modal
      if (result.batchId && result.total > 0) {
        try {
          const batch = await fetchImportBatch(result.batchId);
          setReviewBatchId(result.batchId);
          setReviewIncomes(batch.incomes || []);
          setReviewExpenses(batch.expenses || []);
          setReviewModal(true);
        } catch {
          // Review fetch failed, not critical
        }
      }
    } catch {
      toast(t('banking.importFailed'));
    }
    setImportMode('all');
  }

  async function handleToggleType(expenseId: string) {
    try {
      await toggleExpenseType(expenseId);
      setReviewExpenses(prev => prev.map(e => {
        if (e.id !== expenseId) return e;
        return { ...e, type: e.type === 'FIXED' ? 'VARIABLE' : 'FIXED' };
      }));
      toast(t('banking.typeUpdated'));
    } catch {
      toast(t('banking.typeUpdateFailed'));
    }
  }

  async function handleRenameItem(type: string, id: string, newDescription: string) {
    try {
      await renameItem(type, id, newDescription);
      if (type === 'income') {
        setReviewIncomes(prev => prev.map(i => i.id === id ? { ...i, description: newDescription } : i));
      } else {
        setReviewExpenses(prev => prev.map(e => e.id === id ? { ...e, description: newDescription } : e));
      }
      setEditingDesc(null);
      toast(t('banking.descriptionUpdated'));
    } catch {
      toast(t('banking.renameFailed'));
    }
  }

  async function handleBulkRename(oldDesc: string, newDesc: string) {
    if (!reviewBatchId) return;
    try {
      const result = await bulkRename(oldDesc, newDesc, 'batch', reviewBatchId);
      const total = result.updatedExpenses + result.updatedIncomes;
      setReviewIncomes(prev => prev.map(i => i.description === oldDesc ? { ...i, description: newDesc } : i));
      setReviewExpenses(prev => prev.map(e => e.description === oldDesc ? { ...e, description: newDesc } : e));
      setEditingDesc(null);
      toast(t('banking.bulkRenameSuccess', { count: total }));
    } catch {
      toast(t('banking.bulkRenameFailed'));
    }
  }

  function getDescriptionCount(desc: string): number {
    const incomeCount = reviewIncomes.filter(i => i.description === desc).length;
    const expenseCount = reviewExpenses.filter(e => e.description === desc).length;
    return incomeCount + expenseCount;
  }

  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <Landmark className="h-6 w-6" /> {t('banking.title')}
        </h1>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" onClick={() => setImportModal(true)}
            disabled={isImporting || connections.length === 0}>
            {isImporting
              ? <><Loader2 className="h-4 w-4 animate-spin" /> {t('banking.importing')}</>
              : <><Download className="h-4 w-4" /> {t('banking.importTransactions')}</>}
          </Button>
          <Button size="sm" onClick={handleConnectBank} disabled={connecting || !!connectToken}>
            {connecting
              ? <><Loader2 className="h-4 w-4 animate-spin" /> {t('banking.connecting')}</>
              : <><Plus className="h-4 w-4" /> {t('banking.connect')}</>}
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <p className="text-sm text-surface-500">{t('banking.connectedBanks')}</p>
          <p className="text-2xl font-bold mt-1">{connections.length}</p>
        </Card>
        <Card>
          <p className="text-sm text-surface-500">{t('banking.accounts')}</p>
          <p className="text-2xl font-bold mt-1">{accounts.length}</p>
        </Card>
        <Card>
          <p className="text-sm text-surface-500">{t('banking.totalBalance')}</p>
          <p className="text-2xl font-bold mt-1">{formatCurrency(totalBalance)}</p>
        </Card>
      </div>

      {/* Connections */}
      <Card>
        <h2 className="text-lg font-semibold mb-4">{t('banking.bankConnections')}</h2>
        {connections.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-sm text-surface-500 mb-3">
              {t('banking.noConnectionsHint')}
            </p>
            <Button size="sm" onClick={handleConnectBank} disabled={connecting || !!connectToken}>
              {connecting
                ? <><Loader2 className="h-4 w-4 animate-spin" /> {t('banking.connecting')}</>
                : <><Plus className="h-4 w-4" /> {t('banking.connect')}</>}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {connections.map(conn => (
              <div key={conn.id}
                className="flex items-center justify-between p-3 rounded-lg bg-surface-50 dark:bg-surface-700/50">
                <div className="flex items-center gap-3">
                  <Wallet className="h-5 w-5 text-surface-400" />
                  <div>
                    <p className="font-medium text-sm">{conn.connectorName}</p>
                    <p className="text-xs text-surface-500">
                      {t('banking.accountCount', { count: conn.accounts.length })}
                      {conn.lastSyncAt && ` · ${t('banking.lastSync')}: ${formatDate(conn.lastSyncAt)}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={conn.status === 'ACTIVE' ? 'success' : conn.status === 'ERROR' ? 'danger' : 'default'}>
                    {conn.status}
                  </Badge>
                  <Button variant="ghost" size="sm" onClick={() => handleSync(conn.id)}
                    disabled={syncing === conn.id}>
                    {syncing === conn.id
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <RefreshCw className="h-4 w-4" />}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setDeleteId(conn.id)}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Transactions */}
      <Card>
        <h2 className="text-lg font-semibold mb-4">{t('banking.recentTransactions')}</h2>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : transactions.length === 0 ? (
          <p className="text-sm text-surface-500 text-center py-6">{t('banking.noTransactionsYet')}</p>
        ) : (
          <>
            <div className="space-y-2">
              {transactions.map(tx => (
                <div key={tx.id}
                  className="flex items-center justify-between py-2 border-b border-surface-100 dark:border-surface-700/50 last:border-0">
                  <div className="flex items-center gap-3">
                    {tx.type === 'CREDIT'
                      ? <ArrowDownLeft className="h-4 w-4 text-green-500" />
                      : <ArrowUpRight className="h-4 w-4 text-red-500" />}
                    <div>
                      <p className="text-sm font-medium">{tx.description}</p>
                      <p className="text-xs text-surface-400">
                        {tx.bankAccount.bankConnection.connectorName} · {tx.bankAccount.name}
                        {tx.category && ` · ${tx.category}`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-medium ${tx.type === 'CREDIT' ? 'text-green-500' : 'text-red-500'}`}>
                      {tx.type === 'CREDIT' ? '+' : '-'}
                      {formatCurrency(Math.abs(tx.amount))}
                    </p>
                    <p className="text-xs text-surface-400">
                      {formatDate(tx.date)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-4">
                <Button variant="secondary" size="sm" disabled={page <= 1}
                  onClick={() => setPage(p => p - 1)}>{t('banking.previous')}</Button>
                <span className="flex items-center text-sm text-surface-500">
                  {t('banking.pageOf', { page, total: totalPages })}
                </span>
                <Button variant="secondary" size="sm" disabled={page >= totalPages}
                  onClick={() => setPage(p => p + 1)}>{t('common.next')}</Button>
              </div>
            )}
          </>
        )}
      </Card>

      {/* Pluggy Connect Widget (official SDK) */}
      {connectToken && (
        <PluggyConnect
          connectToken={connectToken}
          includeSandbox
          onSuccess={async (data) => {
            console.log('[Pluggy] Success:', data);
            try {
              const connectorName = (data.item as any).connector?.name || 'Unknown Bank';
              await createConnection(data.item.id, connectorName);
              toast(t('banking.connectionSaved'));
              fetchConnections();
              fetchAccounts();
              fetchTransactions();
            } catch {
              toast(t('banking.connectionSaveFailed'));
            }
            setConnectToken(null);
          }}
          onError={(error) => {
            console.error('[Pluggy] Error:', error);
            toast(t('banking.connectionPluggyFailed'));
            setConnectToken(null);
          }}
          onClose={() => {
            setConnectToken(null);
          }}
        />
      )}

      {/* Import Options Modal */}
      <Modal open={importModal} onClose={() => { setImportModal(false); setImportMode('all'); }}
        title={t('banking.importTitle')}>
        <div className="space-y-4">
          <p className="text-sm text-surface-500">{t('banking.importPrompt')}</p>
          <div className="space-y-2">
            {([
              ['all', t('banking.importAll'), t('banking.importAllDesc')],
              ['expenses_only', t('banking.importExpensesOnly'), t('banking.importExpensesOnlyDesc')],
              ['incomes_only', t('banking.importIncomesOnly'), t('banking.importIncomesOnlyDesc')],
            ] as const).map(([value, label, desc]) => (
              <label key={value}
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  importMode === value
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                    : 'border-surface-200 dark:border-surface-600 hover:border-surface-300'
                }`}>
                <input type="radio" name="importMode" value={value}
                  checked={importMode === value}
                  onChange={() => setImportMode(value)}
                  className="mt-0.5 accent-primary-500" />
                <div>
                  <p className="text-sm font-medium">{label}</p>
                  <p className="text-xs text-surface-400">{desc}</p>
                </div>
              </label>
            ))}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" size="sm" onClick={() => { setImportModal(false); setImportMode('all'); }}>
              {t('common.cancel')}
            </Button>
            <Button size="sm" onClick={handleImport} disabled={isImporting}>
              {isImporting
                ? <><Loader2 className="h-4 w-4 animate-spin" /> {t('banking.importing')}</>
                : <><Download className="h-4 w-4" /> {t('banking.import')}</>}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Post-Import Review Modal */}
      <Modal open={reviewModal} onClose={() => { setReviewModal(false); setEditingDesc(null); }}
        title={t('banking.reviewTitle')} maxWidth="max-w-2xl">
        <div className="space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Imported Incomes */}
          {reviewIncomes.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <ArrowDownLeft className="h-4 w-4 text-green-500" />
                {t('banking.reviewImportedIncomes', { count: reviewIncomes.length })}
              </h3>
              <div className="space-y-2">
                {reviewIncomes.map(income => {
                  const isEditing = editingDesc?.type === 'income' && editingDesc.id === income.id;
                  const dupCount = getDescriptionCount(income.description);
                  return (
                    <div key={income.id}
                      className="flex items-center justify-between gap-2 p-2 rounded-lg bg-surface-50 dark:bg-surface-700/50">
                      <div className="flex-1 min-w-0">
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <Input value={editingDesc.desc}
                              onChange={e => setEditingDesc({ ...editingDesc, desc: e.target.value })}
                              className="text-sm h-8" />
                            <Button variant="ghost" size="sm"
                              onClick={() => handleRenameItem('income', income.id, editingDesc.desc)}>
                              <Check className="h-4 w-4 text-green-500" />
                            </Button>
                            {dupCount > 1 && (
                              <Button variant="ghost" size="sm"
                                onClick={() => handleBulkRename(income.description, editingDesc.desc)}
                                title={t('banking.renameAllTitle', { count: dupCount })}>
                                <span className="text-xs text-primary-500 whitespace-nowrap">{t('banking.renameAll', { count: dupCount })}</span>
                              </Button>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium truncate">{income.description}</p>
                            <button onClick={() => setEditingDesc({ type: 'income', id: income.id, desc: income.description })}
                              className="text-surface-400 hover:text-surface-600 shrink-0">
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                        <p className="text-xs text-surface-400">
                          {formatDate(income.date)} · {income.recurrence === 'MONTHLY' ? t('banking.recurrenceMonthly') : income.recurrence === 'CONTRACT' ? t('banking.recurrenceContract') : t('banking.recurrenceOneTime')}
                        </p>
                      </div>
                      <p className="text-sm font-medium text-green-500 shrink-0">
                        +{formatCurrency(income.amount)}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Imported Expenses */}
          {reviewExpenses.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <ArrowUpRight className="h-4 w-4 text-red-500" />
                {t('banking.reviewImportedExpenses', { count: reviewExpenses.length })}
              </h3>
              <div className="space-y-2">
                {reviewExpenses.map(expense => {
                  const isEditing = editingDesc?.type === 'expense' && editingDesc.id === expense.id;
                  const dupCount = getDescriptionCount(expense.description);
                  return (
                    <div key={expense.id}
                      className="flex items-center justify-between gap-2 p-2 rounded-lg bg-surface-50 dark:bg-surface-700/50">
                      <div className="flex-1 min-w-0">
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <Input value={editingDesc.desc}
                              onChange={e => setEditingDesc({ ...editingDesc, desc: e.target.value })}
                              className="text-sm h-8" />
                            <Button variant="ghost" size="sm"
                              onClick={() => handleRenameItem('expense', expense.id, editingDesc.desc)}>
                              <Check className="h-4 w-4 text-green-500" />
                            </Button>
                            {dupCount > 1 && (
                              <Button variant="ghost" size="sm"
                                onClick={() => handleBulkRename(expense.description, editingDesc.desc)}
                                title={t('banking.renameAllTitle', { count: dupCount })}>
                                <span className="text-xs text-primary-500 whitespace-nowrap">{t('banking.renameAll', { count: dupCount })}</span>
                              </Button>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium truncate">{expense.description}</p>
                            <button onClick={() => setEditingDesc({ type: 'expense', id: expense.id, desc: expense.description })}
                              className="text-surface-400 hover:text-surface-600 shrink-0">
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-xs text-surface-400">
                            {formatDate(expense.date)} · {translateCategoryName(expense.category.name, t)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button onClick={() => handleToggleType(expense.id)}
                          className="flex items-center gap-1 text-xs px-2 py-1 rounded-full border border-surface-200 dark:border-surface-600 hover:border-primary-400 transition-colors"
                          title={expense.type === 'FIXED' ? t('banking.changeToVariable') : t('banking.changeToFixed')}>
                          <ArrowLeftRight className="h-3 w-3" />
                          <Badge variant={expense.type === 'FIXED' ? 'default' : 'warning'} className="text-[10px]">
                            {expense.type === 'FIXED' ? t('banking.fixed') : t('banking.variable')}
                          </Badge>
                        </button>
                        <p className="text-sm font-medium text-red-500">
                          -{formatCurrency(expense.amount)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {reviewIncomes.length === 0 && reviewExpenses.length === 0 && (
            <p className="text-sm text-surface-500 text-center py-4">{t('banking.reviewNoItems')}</p>
          )}
        </div>
        <div className="flex justify-end pt-4 border-t border-surface-100 dark:border-surface-700 mt-4">
          <Button size="sm" onClick={() => { setReviewModal(false); setEditingDesc(null); }}>
            <Check className="h-4 w-4" /> {t('banking.reviewDone')}
          </Button>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title={t('banking.removeConnection')}
        message={t('banking.removeConnectionConfirm')}
        confirmLabel={t('banking.removeLabel')}
      />
    </div>
  );
}

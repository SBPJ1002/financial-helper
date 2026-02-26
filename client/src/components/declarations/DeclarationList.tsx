import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Pencil, Trash2, Play, Loader2, CreditCard, Banknote, Zap, Building2 } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import Modal from '../ui/Modal';
import ConfirmDialog from '../ui/ConfirmDialog';
import DeclarationForm from './DeclarationForm';
import { useDeclarationStore, type Declaration, type CreateDeclarationInput } from '../../stores/useDeclarationStore';
import { useBankingStore } from '../../stores/useBankingStore';
import { useFinanceStore } from '../../stores/useFinanceStore';
import { formatCurrency } from '../../utils/format';
import { useToast } from '../ui/Toast';

const METHOD_ICONS: Record<string, typeof CreditCard> = {
  PIX: Zap,
  BOLETO: Banknote,
  AUTO_DEBIT: Building2,
  CREDIT_CARD: CreditCard,
};

function confidenceBadge(score: number) {
  if (score >= 0.80) return 'success' as const;
  if (score >= 0.60) return 'warning' as const;
  return 'default' as const;
}

export default function DeclarationList() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const {
    declarations, isLoading, fetchDeclarations,
    createDeclaration, updateDeclaration, deleteDeclaration, triggerMatching,
  } = useDeclarationStore();
  const { accounts, fetchAccounts } = useBankingStore();
  const { categories } = useFinanceStore();

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Declaration | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [isMatching, setIsMatching] = useState(false);

  useEffect(() => {
    fetchDeclarations();
    fetchAccounts();
  }, [fetchDeclarations, fetchAccounts]);

  const creditAccounts = accounts.filter(a => a.type === 'CREDIT').map(a => ({ id: a.id, name: a.name }));
  const categoryList = categories.map(c => ({ name: c.name }));

  async function handleCreate(data: CreateDeclarationInput) {
    await createDeclaration(data);
    setShowForm(false);
    toast(t('declarations.created'));
  }

  async function handleUpdate(data: CreateDeclarationInput) {
    if (!editing) return;
    await updateDeclaration(editing.id, data);
    setEditing(null);
    toast(t('declarations.updated'));
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await deleteDeclaration(deleteTarget);
    setDeleteTarget(null);
    toast(t('declarations.deleted'));
  }

  async function handleRunMatching() {
    setIsMatching(true);
    try {
      const result = await triggerMatching();
      toast(t('declarations.matchingDone', { matched: result.matched.length, unmatched: result.unmatched.length }));
    } catch {
      toast(t('declarations.matchingFailed'));
    } finally {
      setIsMatching(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">{t('declarations.title')}</h2>
          <p className="text-xs text-surface-500">{t('declarations.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={handleRunMatching} disabled={isMatching || declarations.length === 0}>
            {isMatching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            {t('declarations.runMatching')}
          </Button>
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4" /> {t('declarations.add')}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary-500" />
        </div>
      ) : declarations.length === 0 ? (
        <Card>
          <div className="text-center py-8">
            <p className="text-sm text-surface-500 mb-3">{t('declarations.empty')}</p>
            <Button size="sm" onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4" /> {t('declarations.addFirst')}
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-2">
          {declarations.map(decl => {
            const MethodIcon = METHOD_ICONS[decl.paymentMethod] || Banknote;
            const latestMatch = decl.matches[0];

            return (
              <Card key={decl.id}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-lg bg-surface-100 dark:bg-surface-700">
                      <MethodIcon className="h-4 w-4 text-surface-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{decl.label}</p>
                      <div className="flex items-center gap-2 text-xs text-surface-500">
                        <span>{t(`declarations.method_${decl.paymentMethod}`)}</span>
                        {decl.expectedDay && <span>· {t('declarations.day')} {decl.expectedDay}</span>}
                        {decl.categoryName && <span>· {decl.categoryName}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <p className="text-sm font-semibold">{formatCurrency(decl.estimatedAmount)}</p>
                      {latestMatch && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-surface-500">
                            {formatCurrency(latestMatch.matchedAmount)}
                          </span>
                          <Badge variant={confidenceBadge(latestMatch.confidenceScore)}>
                            {Math.round(latestMatch.confidenceScore * 100)}%
                          </Badge>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => setEditing(decl)}
                        className="p-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700 text-surface-400 hover:text-surface-600 transition-colors">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => setDeleteTarget(decl.id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-surface-400 hover:text-red-500 transition-colors">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create modal */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title={t('declarations.addTitle')}>
        <DeclarationForm
          onSubmit={handleCreate}
          onCancel={() => setShowForm(false)}
          creditAccounts={creditAccounts}
          categories={categoryList}
        />
      </Modal>

      {/* Edit modal */}
      <Modal open={!!editing} onClose={() => setEditing(null)} title={t('declarations.editTitle')}>
        {editing && (
          <DeclarationForm
            onSubmit={handleUpdate}
            onCancel={() => setEditing(null)}
            initial={editing}
            creditAccounts={creditAccounts}
            categories={categoryList}
          />
        )}
      </Modal>

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={t('declarations.deleteTitle')}
        message={t('declarations.deleteMessage')}
        confirmLabel={t('common.delete')}
      />
    </div>
  );
}

import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import CurrencySelect from './CurrencySelect';
import { useUserSettingsStore } from '../../stores/useUserSettingsStore';
import { useFinanceStore } from '../../stores/useFinanceStore';
import { translateCategoryName } from '../../utils/categoryTranslation';
import { formatCurrency } from '../../utils/format';

export interface ExpenseRow {
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

export default function ExpenseFormModal({ open, onClose, editing, type, categories, onSave }: {
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

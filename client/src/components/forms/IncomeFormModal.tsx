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

export interface IncomeRow {
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

export default function IncomeFormModal({ open, onClose, editing, categories, onSave }: {
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

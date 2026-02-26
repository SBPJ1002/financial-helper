import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronUp } from 'lucide-react';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Button from '../ui/Button';
import type { CreateDeclarationInput, Declaration } from '../../stores/useDeclarationStore';

const PAYMENT_METHODS = [
  { value: 'PIX', label: 'PIX' },
  { value: 'BOLETO', label: 'Boleto' },
  { value: 'AUTO_DEBIT', label: 'Auto Debit' },
  { value: 'CREDIT_CARD', label: 'Credit Card' },
] as const;

interface DeclarationFormProps {
  onSubmit: (data: CreateDeclarationInput) => Promise<void>;
  onCancel: () => void;
  initial?: Declaration | null;
  creditAccounts?: Array<{ id: string; name: string }>;
  categories?: Array<{ name: string }>;
}

export default function DeclarationForm({ onSubmit, onCancel, initial, creditAccounts = [], categories = [] }: DeclarationFormProps) {
  const { t } = useTranslation();
  const [label, setLabel] = useState(initial?.label ?? '');
  const [paymentMethod, setPaymentMethod] = useState<CreateDeclarationInput['paymentMethod']>(initial?.paymentMethod ?? 'PIX');
  const [estimatedAmount, setEstimatedAmount] = useState(initial?.estimatedAmount?.toString() ?? '');
  const [categoryName, setCategoryName] = useState(initial?.categoryName ?? '');
  const [creditAccountId, setCreditAccountId] = useState(initial?.creditAccountId ?? '');
  const [expectedDay, setExpectedDay] = useState(initial?.expectedDay?.toString() ?? '');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [amountTolerance, setAmountTolerance] = useState((initial?.amountTolerance ?? 0.15).toString());
  const [dayTolerance, setDayTolerance] = useState((initial?.dayTolerance ?? 5).toString());
  const [matchKeywords, setMatchKeywords] = useState(initial?.matchKeywords?.join(', ') ?? '');
  const [matchCnpj, setMatchCnpj] = useState(initial?.matchCounterpartDocument ?? '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const data: CreateDeclarationInput = {
        label,
        paymentMethod,
        estimatedAmount: parseFloat(estimatedAmount),
        ...(categoryName && { categoryName }),
        ...(paymentMethod === 'CREDIT_CARD' && creditAccountId && { creditAccountId }),
        ...(expectedDay && { expectedDay: parseInt(expectedDay) }),
        amountTolerance: parseFloat(amountTolerance) || 0.15,
        dayTolerance: parseInt(dayTolerance) || 5,
        ...(matchKeywords.trim() && { matchKeywords: matchKeywords.split(',').map(k => k.trim()).filter(Boolean) }),
        ...(matchCnpj.trim() && { matchCounterpartDocument: matchCnpj.trim() }),
      };
      await onSubmit(data);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label={t('declarations.label')}
        value={label}
        onChange={e => setLabel(e.target.value)}
        placeholder={t('declarations.labelPlaceholder')}
        required
      />

      {categories.length > 0 && (
        <Select
          label={t('declarations.category')}
          value={categoryName}
          onChange={e => setCategoryName(e.target.value)}
          options={[
            { value: '', label: t('declarations.selectCategory') },
            ...categories.map(c => ({ value: c.name, label: c.name })),
          ]}
        />
      )}

      <div>
        <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
          {t('declarations.paymentMethod')}
        </label>
        <div className="flex flex-wrap gap-2">
          {PAYMENT_METHODS.map(pm => (
            <button
              key={pm.value}
              type="button"
              onClick={() => setPaymentMethod(pm.value)}
              className={`py-1.5 px-3 rounded-full text-sm border transition-all ${
                paymentMethod === pm.value
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 font-medium'
                  : 'border-surface-200 dark:border-surface-600 text-surface-600 dark:text-surface-400 hover:border-surface-300'
              }`}
            >
              {t(`declarations.method_${pm.value}`)}
            </button>
          ))}
        </div>
      </div>

      {paymentMethod === 'CREDIT_CARD' && creditAccounts.length > 0 && (
        <Select
          label={t('declarations.creditAccount')}
          value={creditAccountId}
          onChange={e => setCreditAccountId(e.target.value)}
          options={[
            { value: '', label: t('declarations.selectAccount') },
            ...creditAccounts.map(a => ({ value: a.id, label: a.name })),
          ]}
        />
      )}

      <div className="grid grid-cols-2 gap-3">
        <Input
          label={t('declarations.estimatedAmount')}
          type="number"
          step="0.01"
          min="0"
          value={estimatedAmount}
          onChange={e => setEstimatedAmount(e.target.value)}
          required
        />
        <Input
          label={t('declarations.expectedDay')}
          type="number"
          min="1"
          max="31"
          value={expectedDay}
          onChange={e => setExpectedDay(e.target.value)}
          placeholder="1-31"
        />
      </div>

      {/* Advanced section */}
      <button
        type="button"
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="flex items-center gap-1 text-sm text-surface-500 hover:text-surface-700 dark:hover:text-surface-300 transition-colors"
      >
        {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        {t('declarations.advanced')}
      </button>

      {showAdvanced && (
        <div className="space-y-3 pl-2 border-l-2 border-surface-200 dark:border-surface-700">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label={t('declarations.amountTolerance')}
              type="number"
              step="0.01"
              min="0"
              max="1"
              value={amountTolerance}
              onChange={e => setAmountTolerance(e.target.value)}
            />
            <Input
              label={t('declarations.dayTolerance')}
              type="number"
              min="0"
              max="15"
              value={dayTolerance}
              onChange={e => setDayTolerance(e.target.value)}
            />
          </div>
          <Input
            label={t('declarations.matchKeywords')}
            value={matchKeywords}
            onChange={e => setMatchKeywords(e.target.value)}
            placeholder={t('declarations.keywordsPlaceholder')}
          />
          <Input
            label={t('declarations.matchCnpj')}
            value={matchCnpj}
            onChange={e => setMatchCnpj(e.target.value)}
            placeholder="00.000.000/0001-00"
          />
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={isSubmitting || !label || !estimatedAmount}>
          {initial ? t('common.save') : t('declarations.create')}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          {t('common.cancel')}
        </Button>
      </div>
    </form>
  );
}

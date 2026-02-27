import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  PiggyBank, CreditCard, TrendingDown, Shield, Landmark,
  ChevronLeft, ChevronRight, Check, Briefcase, User, Building2,
  Wallet, Home, Users, Loader2, DollarSign, ArrowRight, Plus, Trash2,
} from 'lucide-react';
import { PluggyConnect } from 'react-pluggy-connect';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { useToast } from '../components/ui/Toast';
import { useOnboardingStore } from '../stores/useOnboardingStore';
import { useBankingStore } from '../stores/useBankingStore';
import { useFinanceStore } from '../stores/useFinanceStore';
import ExpenseFormModal from '../components/forms/ExpenseFormModal';
import IncomeFormModal from '../components/forms/IncomeFormModal';
import { formatCurrency } from '../utils/format';

const TOTAL_STEPS = 6;

interface OnboardingItem {
  id: string;
  description: string;
  amount: number;
  currency?: string;
  dueDay?: number | null;
  recurrence?: string;
}

export default function Onboarding() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isLoading, isSaving, fetchProfile, updateProfile, completeOnboarding } = useOnboardingStore();
  const { getConnectToken, createConnection, importTransactions, fetchConnections } = useBankingStore();
  const { categories, incomeCategories, fetchCategories, fetchIncomeCategories, addExpense, addIncome, deleteExpense, deleteIncome, generateRecurring } = useFinanceStore();

  const [step, setStep] = useState(0);
  const [initialized, setInitialized] = useState(false);

  // Step 1 state
  const [primaryGoal, setPrimaryGoal] = useState<string | null>(null);
  const [controlScore, setControlScore] = useState(3);

  // Step 2 state
  const [bankAccountCount, setBankAccountCount] = useState<number | null>(null);
  const [creditCardCount, setCreditCardCount] = useState<number | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<string[]>([]);

  // Step 3 state
  const [incomeType, setIncomeType] = useState<string | null>(null);
  const [expectedIncomeDay, setExpectedIncomeDay] = useState<number | null>(null);
  const [incomeRange, setIncomeRange] = useState<string | null>(null);
  const [incomeIsVariable, setIncomeIsVariable] = useState(false);

  // Step 4 state
  const [housingType, setHousingType] = useState<string | null>(null);
  const [hasDependents, setHasDependents] = useState(false);
  const [dependentTypes, setDependentTypes] = useState<string[]>([]);

  // Step 4: Expense & Income lists (items created via modals)
  const [onboardingExpenses, setOnboardingExpenses] = useState<OnboardingItem[]>([]);
  const [onboardingIncomes, setOnboardingIncomes] = useState<OnboardingItem[]>([]);
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [incomeModalOpen, setIncomeModalOpen] = useState(false);

  // Step 5 state
  const [connectToken, setConnectToken] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [bankConnected, setBankConnected] = useState(false);
  const [importResult, setImportResult] = useState<{ expenses: number; incomes: number; skipped: number } | null>(null);

  // Load profile on mount
  useEffect(() => {
    fetchProfile().then((p) => {
      if (p) {
        if (p.primaryGoal) setPrimaryGoal(p.primaryGoal);
        if (p.financialControlScore) setControlScore(p.financialControlScore);
        if (p.bankAccountCount !== null) setBankAccountCount(p.bankAccountCount);
        if (p.creditCardCount !== null) setCreditCardCount(p.creditCardCount);
        if (p.preferredPaymentMethods?.length) setPaymentMethods(p.preferredPaymentMethods);
        if (p.incomeType) setIncomeType(p.incomeType);
        if (p.expectedIncomeDay !== null) setExpectedIncomeDay(p.expectedIncomeDay);
        if (p.incomeRange) setIncomeRange(p.incomeRange);
        if (p.incomeIsVariable) setIncomeIsVariable(p.incomeIsVariable);
        if (p.housingType) setHousingType(p.housingType);
        if (p.hasDependents) setHasDependents(p.hasDependents);
        if (p.dependentTypes?.length) setDependentTypes(p.dependentTypes);
        if (p.onboardingStepReached > 0) setStep(p.onboardingStepReached);
      }
    }).finally(() => {
      setInitialized(true);
    });
    fetchConnections();
    fetchCategories();
    fetchIncomeCategories();
  }, []);

  function getStepData() {
    switch (step) {
      case 0: return { primaryGoal, financialControlScore: controlScore };
      case 1: return { bankAccountCount, creditCardCount, preferredPaymentMethods: paymentMethods };
      case 2: return { incomeType, expectedIncomeDay, incomeRange, incomeIsVariable };
      case 3: return { housingType, hasDependents, dependentTypes: hasDependents ? dependentTypes : [] };
      default: return {};
    }
  }

  async function handleNext() {
    if (step < 4) {
      await updateProfile({ ...getStepData(), onboardingStepReached: step + 1 });
    }
    setStep(s => s + 1);
  }

  async function handleBack() {
    setStep(s => s - 1);
  }

  async function handleSkip() {
    await completeOnboarding();
    navigate('/dashboard', { replace: true });
  }

  async function handleComplete() {
    await completeOnboarding();
    navigate('/dashboard', { replace: true });
  }

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

  async function handleAddExpense(data: Record<string, unknown>) {
    try {
      const months = data._recurringMonths as number | undefined;
      delete data._recurringMonths;
      const expense = await addExpense(data as any);
      if (months && months > 0 && expense?.id) {
        await generateRecurring(expense.id, months);
      }
      setOnboardingExpenses(prev => [...prev, {
        id: expense.id,
        description: data.description as string,
        amount: data.amount as number,
        currency: data.currency as string | undefined,
        dueDay: data.dueDay as number | undefined,
      }]);
      setExpenseModalOpen(false);
      toast(t('expenses.expenseAdded'));
    } catch {
      toast(t('expenses.addFailed'));
    }
  }

  async function handleAddIncome(data: Record<string, unknown>) {
    try {
      await addIncome(data as any);
      // addIncome doesn't return the id, so use a generated key for display
      setOnboardingIncomes(prev => [...prev, {
        id: crypto.randomUUID(),
        description: data.description as string,
        amount: data.amount as number,
        currency: data.currency as string | undefined,
        recurrence: data.recurrence as string | undefined,
      }]);
      setIncomeModalOpen(false);
      toast(t('expenses.incomeAdded'));
    } catch {
      toast(t('expenses.addFailed'));
    }
  }

  async function handleDeleteExpenseItem(id: string) {
    try {
      await deleteExpense(id);
      setOnboardingExpenses(prev => prev.filter(e => e.id !== id));
      toast(t('expenses.itemDeleted'));
    } catch {
      toast(t('expenses.deleteFailed'));
    }
  }

  async function handleDeleteIncomeItem(item: OnboardingItem) {
    try {
      // Find the matching income in the store by description+amount
      const storeIncomes = useFinanceStore.getState().incomes;
      const match = storeIncomes.find(i => i.description === item.description && i.amount === item.amount);
      if (match) {
        await deleteIncome(match.id);
      }
      setOnboardingIncomes(prev => prev.filter(i => i.id !== item.id));
      toast(t('expenses.itemDeleted'));
    } catch {
      toast(t('expenses.deleteFailed'));
    }
  }

  if (isLoading || !initialized) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-surface-50 dark:bg-surface-900">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const GOALS = [
    { value: 'SAVE_MORE', icon: PiggyBank, label: t('onboarding.goals.saveMore'), desc: t('onboarding.goals.saveMoreDesc') },
    { value: 'PAY_OFF_DEBT', icon: CreditCard, label: t('onboarding.goals.payOffDebt'), desc: t('onboarding.goals.payOffDebtDesc') },
    { value: 'CONTROL_SPENDING', icon: TrendingDown, label: t('onboarding.goals.controlSpending'), desc: t('onboarding.goals.controlSpendingDesc') },
    { value: 'INVEST_MORE', icon: TrendingDown, label: t('onboarding.goals.investMore'), desc: t('onboarding.goals.investMoreDesc') },
    { value: 'BUILD_EMERGENCY_FUND', icon: Shield, label: t('onboarding.goals.emergencyFund'), desc: t('onboarding.goals.emergencyFundDesc') },
  ];

  const INCOME_TYPES = [
    { value: 'CLT', icon: Briefcase, label: t('onboarding.income.clt') },
    { value: 'SELF_EMPLOYED', icon: User, label: t('onboarding.income.selfEmployed') },
    { value: 'FREELANCER', icon: Wallet, label: t('onboarding.income.freelancer') },
    { value: 'BUSINESS_OWNER', icon: Building2, label: t('onboarding.income.businessOwner') },
    { value: 'RETIREMENT', icon: Users, label: t('onboarding.income.retirement') },
    { value: 'OTHER_INCOME', icon: DollarSign, label: t('onboarding.income.other') },
  ];

  const HOUSING_TYPES = [
    { value: 'OWN_PAID', icon: Home, label: t('onboarding.housing.ownPaid') },
    { value: 'OWN_MORTGAGE', icon: Home, label: t('onboarding.housing.ownMortgage') },
    { value: 'RENT', icon: Home, label: t('onboarding.housing.rent') },
    { value: 'FAMILY', icon: Users, label: t('onboarding.housing.family') },
  ];

  const PAYMENT_METHODS = [
    { value: 'PIX', label: 'PIX' },
    { value: 'CREDIT', label: t('onboarding.payment.credit') },
    { value: 'DEBIT', label: t('onboarding.payment.debit') },
    { value: 'CASH', label: t('onboarding.payment.cash') },
    { value: 'BOLETO', label: t('onboarding.payment.boleto') },
  ];

  const DEPENDENT_TYPES = [
    { value: 'children', label: t('onboarding.dependents.children') },
    { value: 'spouse', label: t('onboarding.dependents.spouse') },
    { value: 'parents', label: t('onboarding.dependents.parents') },
    { value: 'other', label: t('onboarding.dependents.other') },
  ];

  const INCOME_RANGES = [
    { value: 'UP_TO_2K', label: t('onboarding.incomeRange.upTo2k') },
    { value: 'FROM_2K_TO_5K', label: t('onboarding.incomeRange.from2kTo5k') },
    { value: 'FROM_5K_TO_10K', label: t('onboarding.incomeRange.from5kTo10k') },
    { value: 'FROM_10K_TO_20K', label: t('onboarding.incomeRange.from10kTo20k') },
    { value: 'ABOVE_20K', label: t('onboarding.incomeRange.above20k') },
  ];

  function toggleArrayItem(arr: string[], item: string): string[] {
    return arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item];
  }

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-900 flex flex-col">
      {/* Header */}
      <div className="w-full max-w-2xl mx-auto px-4 pt-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-primary-600 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold text-surface-900 dark:text-white">FinHelper</span>
          </div>
          <button
            onClick={handleSkip}
            className="text-sm text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 transition-colors"
          >
            {t('onboarding.skipToDashboard')} <ArrowRight className="inline h-3 w-3" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="flex gap-1.5 mb-8">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                i < step ? 'bg-primary-500' : i === step ? 'bg-primary-400' : 'bg-surface-200 dark:bg-surface-700'
              }`}
            />
          ))}
        </div>
        <p className="text-xs text-surface-400 text-center mb-4">
          {t('onboarding.stepOf', { current: step + 1, total: TOTAL_STEPS })}
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 w-full max-w-2xl mx-auto px-4 pb-8">
        {/* Step 0: Welcome & Goals */}
        {step === 0 && (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-surface-900 dark:text-white">{t('onboarding.welcome.title')}</h1>
              <p className="text-sm text-surface-500 mt-2">{t('onboarding.welcome.subtitle')}</p>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-surface-700 dark:text-surface-300 mb-3">{t('onboarding.welcome.goalQuestion')}</h3>
              <div className="grid grid-cols-1 gap-2">
                {GOALS.map(g => (
                  <button
                    key={g.value}
                    onClick={() => setPrimaryGoal(g.value)}
                    className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                      primaryGoal === g.value
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 ring-1 ring-primary-500'
                        : 'border-surface-200 dark:border-surface-600 hover:border-surface-300 dark:hover:border-surface-500'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                      primaryGoal === g.value ? 'bg-primary-100 dark:bg-primary-800 text-primary-600' : 'bg-surface-100 dark:bg-surface-700 text-surface-400'
                    }`}>
                      <g.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-surface-900 dark:text-white">{g.label}</p>
                      <p className="text-xs text-surface-400">{g.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-surface-700 dark:text-surface-300 mb-3">{t('onboarding.welcome.controlQuestion')}</h3>
              <div className="flex items-center gap-4">
                <span className="text-xs text-surface-400">{t('onboarding.welcome.controlLow')}</span>
                <input
                  type="range" min={1} max={5} value={controlScore}
                  onChange={e => setControlScore(Number(e.target.value))}
                  className="flex-1 accent-primary-500"
                />
                <span className="text-xs text-surface-400">{t('onboarding.welcome.controlHigh')}</span>
              </div>
              <p className="text-center text-sm font-medium text-primary-500 mt-1">{controlScore}/5</p>
            </div>
          </div>
        )}

        {/* Step 1: Financial Profile */}
        {step === 1 && (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-surface-900 dark:text-white">{t('onboarding.financial.title')}</h1>
              <p className="text-sm text-surface-500 mt-2">{t('onboarding.financial.subtitle')}</p>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-surface-700 dark:text-surface-300 mb-3">{t('onboarding.financial.bankAccounts')}</h3>
              <div className="flex gap-2">
                {[{ v: 1, l: '1' }, { v: 2, l: '2' }, { v: 3, l: '3+' }].map(opt => (
                  <button
                    key={opt.v}
                    onClick={() => setBankAccountCount(opt.v)}
                    className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium border transition-all ${
                      bankAccountCount === opt.v
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-600'
                        : 'border-surface-200 dark:border-surface-600 text-surface-600 dark:text-surface-400 hover:border-surface-300'
                    }`}
                  >
                    {opt.l}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-surface-700 dark:text-surface-300 mb-3">{t('onboarding.financial.creditCards')}</h3>
              <div className="flex gap-2">
                {[{ v: 0, l: '0' }, { v: 1, l: '1' }, { v: 2, l: '2+' }].map(opt => (
                  <button
                    key={opt.v}
                    onClick={() => setCreditCardCount(opt.v)}
                    className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium border transition-all ${
                      creditCardCount === opt.v
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-600'
                        : 'border-surface-200 dark:border-surface-600 text-surface-600 dark:text-surface-400 hover:border-surface-300'
                    }`}
                  >
                    {opt.l}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-surface-700 dark:text-surface-300 mb-3">{t('onboarding.financial.paymentMethods')}</h3>
              <div className="flex flex-wrap gap-2">
                {PAYMENT_METHODS.map(m => (
                  <button
                    key={m.value}
                    onClick={() => setPaymentMethods(toggleArrayItem(paymentMethods, m.value))}
                    className={`py-1.5 px-3 rounded-full text-sm font-medium border transition-all ${
                      paymentMethods.includes(m.value)
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-600'
                        : 'border-surface-200 dark:border-surface-600 text-surface-600 dark:text-surface-400 hover:border-surface-300'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Income & Work */}
        {step === 2 && (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-surface-900 dark:text-white">{t('onboarding.incomeWork.title')}</h1>
              <p className="text-sm text-surface-500 mt-2">{t('onboarding.incomeWork.subtitle')}</p>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-surface-700 dark:text-surface-300 mb-3">{t('onboarding.incomeWork.typeQuestion')}</h3>
              <div className="grid grid-cols-2 gap-2">
                {INCOME_TYPES.map(it => (
                  <button
                    key={it.value}
                    onClick={() => setIncomeType(it.value)}
                    className={`flex items-center gap-2 p-3 rounded-xl border text-left transition-all ${
                      incomeType === it.value
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 ring-1 ring-primary-500'
                        : 'border-surface-200 dark:border-surface-600 hover:border-surface-300'
                    }`}
                  >
                    <it.icon className={`h-5 w-5 shrink-0 ${incomeType === it.value ? 'text-primary-500' : 'text-surface-400'}`} />
                    <span className="text-sm font-medium text-surface-900 dark:text-white">{it.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {(incomeType === 'CLT' || incomeType === 'RETIREMENT') && (
              <div>
                <h3 className="text-sm font-semibold text-surface-700 dark:text-surface-300 mb-3">{t('onboarding.incomeWork.incomeDay')}</h3>
                <div className="flex flex-wrap gap-2">
                  {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                    <button
                      key={day}
                      onClick={() => setExpectedIncomeDay(expectedIncomeDay === day ? null : day)}
                      className={`w-10 h-10 rounded-lg text-sm font-medium border transition-all ${
                        expectedIncomeDay === day
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-600'
                          : 'border-surface-200 dark:border-surface-600 text-surface-600 dark:text-surface-400 hover:border-surface-300'
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h3 className="text-sm font-semibold text-surface-700 dark:text-surface-300 mb-3">{t('onboarding.incomeWork.rangeQuestion')}</h3>
              <div className="space-y-2">
                {INCOME_RANGES.map(r => (
                  <button
                    key={r.value}
                    onClick={() => setIncomeRange(r.value)}
                    className={`w-full py-2.5 px-4 rounded-lg text-sm font-medium border text-left transition-all ${
                      incomeRange === r.value
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-600'
                        : 'border-surface-200 dark:border-surface-600 text-surface-600 dark:text-surface-400 hover:border-surface-300'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border border-surface-200 dark:border-surface-600">
              <span className="text-sm text-surface-700 dark:text-surface-300">{t('onboarding.incomeWork.variableIncome')}</span>
              <button
                onClick={() => setIncomeIsVariable(!incomeIsVariable)}
                className={`relative w-11 h-6 rounded-full transition-colors ${incomeIsVariable ? 'bg-primary-500' : 'bg-surface-300 dark:bg-surface-600'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${incomeIsVariable ? 'translate-x-5' : ''}`} />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Housing, Expenses & Incomes */}
        {step === 3 && (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-surface-900 dark:text-white">{t('onboarding.housingExpenses.title')}</h1>
              <p className="text-sm text-surface-500 mt-2">{t('onboarding.housingExpenses.subtitle')}</p>
            </div>

            {/* Housing type */}
            <div>
              <h3 className="text-sm font-semibold text-surface-700 dark:text-surface-300 mb-3">{t('onboarding.housingExpenses.housingQuestion')}</h3>
              <div className="grid grid-cols-2 gap-2">
                {HOUSING_TYPES.map(ht => (
                  <button
                    key={ht.value}
                    onClick={() => setHousingType(ht.value)}
                    className={`flex items-center gap-2 p-3 rounded-xl border text-left transition-all ${
                      housingType === ht.value
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 ring-1 ring-primary-500'
                        : 'border-surface-200 dark:border-surface-600 hover:border-surface-300'
                    }`}
                  >
                    <ht.icon className={`h-5 w-5 shrink-0 ${housingType === ht.value ? 'text-primary-500' : 'text-surface-400'}`} />
                    <span className="text-sm font-medium text-surface-900 dark:text-white">{ht.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Fixed Expenses */}
            <div>
              <h3 className="text-sm font-semibold text-surface-700 dark:text-surface-300 mb-3">{t('expenses.fixedExpenses')}</h3>
              <div className="space-y-2">
                {onboardingExpenses.map(item => (
                  <div key={item.id} className="flex items-center justify-between p-3 rounded-lg border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-surface-900 dark:text-white truncate">{item.description}</p>
                      <p className="text-xs text-surface-500">
                        {formatCurrency(item.amount, item.currency)}
                        {item.dueDay ? ` - ${t('expenses.day')} ${item.dueDay}` : ''}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteExpenseItem(item.id)}
                      className="p-1.5 rounded hover:bg-surface-100 dark:hover:bg-surface-700 text-surface-400 hover:text-red-500 ml-2 shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => setExpenseModalOpen(true)}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg border border-dashed border-surface-300 dark:border-surface-600 text-sm text-surface-500 hover:text-primary-500 hover:border-primary-400 transition-colors"
                >
                  <Plus className="h-4 w-4" /> {t('expenses.addFixedExpense')}
                </button>
              </div>
            </div>

            {/* Incomes */}
            <div>
              <h3 className="text-sm font-semibold text-surface-700 dark:text-surface-300 mb-3">{t('expenses.income')}</h3>
              <div className="space-y-2">
                {onboardingIncomes.map(item => (
                  <div key={item.id} className="flex items-center justify-between p-3 rounded-lg border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-surface-900 dark:text-white truncate">{item.description}</p>
                      <p className="text-xs text-surface-500">
                        {formatCurrency(item.amount, item.currency)}
                        {item.recurrence === 'MONTHLY' ? ` - ${t('expenses.monthly')}` : ''}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteIncomeItem(item)}
                      className="p-1.5 rounded hover:bg-surface-100 dark:hover:bg-surface-700 text-surface-400 hover:text-red-500 ml-2 shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => setIncomeModalOpen(true)}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg border border-dashed border-surface-300 dark:border-surface-600 text-sm text-surface-500 hover:text-primary-500 hover:border-primary-400 transition-colors"
                >
                  <Plus className="h-4 w-4" /> {t('expenses.addIncome')}
                </button>
              </div>
            </div>

            {/* Dependents */}
            <div>
              <div className="flex items-center justify-between p-3 rounded-lg border border-surface-200 dark:border-surface-600">
                <span className="text-sm text-surface-700 dark:text-surface-300">{t('onboarding.housingExpenses.hasDependents')}</span>
                <button
                  onClick={() => setHasDependents(!hasDependents)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${hasDependents ? 'bg-primary-500' : 'bg-surface-300 dark:bg-surface-600'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${hasDependents ? 'translate-x-5' : ''}`} />
                </button>
              </div>
              {hasDependents && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {DEPENDENT_TYPES.map(dt => (
                    <button
                      key={dt.value}
                      onClick={() => setDependentTypes(toggleArrayItem(dependentTypes, dt.value))}
                      className={`py-1.5 px-3 rounded-full text-sm border transition-all ${
                        dependentTypes.includes(dt.value)
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-600 font-medium'
                          : 'border-surface-200 dark:border-surface-600 text-surface-600 dark:text-surface-400 hover:border-surface-300'
                      }`}
                    >
                      {dt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 4: Connect Bank */}
        {step === 4 && (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-surface-900 dark:text-white">{t('onboarding.connectBank.title')}</h1>
              <p className="text-sm text-surface-500 mt-2">{t('onboarding.connectBank.subtitle')}</p>
            </div>

            <Card>
              <div className="text-center py-6 space-y-4">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                  <Landmark className="h-8 w-8 text-primary-500" />
                </div>
                {bankConnected ? (
                  <>
                    <div className="flex items-center justify-center gap-2 text-green-500">
                      <Check className="h-5 w-5" />
                      <p className="font-medium">{t('onboarding.connectBank.connected')}</p>
                    </div>
                    {importResult && (
                      <p className="text-sm text-surface-500">
                        {t('onboarding.connectBank.importSummary', {
                          expenses: importResult.expenses,
                          incomes: importResult.incomes,
                        })}
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <p className="text-sm text-surface-500">{t('onboarding.connectBank.description')}</p>
                    <Button onClick={handleConnectBank} disabled={connecting || !!connectToken}>
                      {connecting
                        ? <><Loader2 className="h-4 w-4 animate-spin" /> {t('banking.connecting')}</>
                        : <><Plus className="h-4 w-4" /> {t('onboarding.connectBank.connectButton')}</>}
                    </Button>
                  </>
                )}
              </div>
            </Card>

            {connectToken && (
              <PluggyConnect
                connectToken={connectToken}
                includeSandbox
                onSuccess={async (data) => {
                  try {
                    const connectorName = (data.item as any).connector?.name || 'Unknown Bank';
                    await createConnection(data.item.id, connectorName);
                    setBankConnected(true);
                    toast(t('banking.connectionSaved'));
                    // Auto-import
                    try {
                      const result = await importTransactions('all');
                      setImportResult({ expenses: result.expenses, incomes: result.incomes, skipped: result.skipped });
                    } catch {
                      // Import failed, not critical
                    }
                  } catch {
                    toast(t('banking.connectionSaveFailed'));
                  }
                  setConnectToken(null);
                }}
                onError={() => {
                  toast(t('banking.connectionPluggyFailed'));
                  setConnectToken(null);
                }}
                onClose={() => setConnectToken(null)}
              />
            )}
          </div>
        )}

        {/* Step 5: Review */}
        {step === 5 && (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-surface-900 dark:text-white">{t('onboarding.review.title')}</h1>
              <p className="text-sm text-surface-500 mt-2">{t('onboarding.review.subtitle')}</p>
            </div>

            <Card>
              <div className="space-y-4">
                {primaryGoal && (
                  <div className="flex justify-between items-center py-2 border-b border-surface-100 dark:border-surface-700">
                    <span className="text-sm text-surface-500">{t('onboarding.review.goal')}</span>
                    <span className="text-sm font-medium text-surface-900 dark:text-white">
                      {GOALS.find(g => g.value === primaryGoal)?.label}
                    </span>
                  </div>
                )}
                {incomeType && (
                  <div className="flex justify-between items-center py-2 border-b border-surface-100 dark:border-surface-700">
                    <span className="text-sm text-surface-500">{t('onboarding.review.incomeType')}</span>
                    <span className="text-sm font-medium text-surface-900 dark:text-white">
                      {INCOME_TYPES.find(it => it.value === incomeType)?.label}
                    </span>
                  </div>
                )}
                {incomeRange && (
                  <div className="flex justify-between items-center py-2 border-b border-surface-100 dark:border-surface-700">
                    <span className="text-sm text-surface-500">{t('onboarding.review.incomeRange')}</span>
                    <span className="text-sm font-medium text-surface-900 dark:text-white">
                      {INCOME_RANGES.find(r => r.value === incomeRange)?.label}
                    </span>
                  </div>
                )}
                {housingType && (
                  <div className="flex justify-between items-center py-2 border-b border-surface-100 dark:border-surface-700">
                    <span className="text-sm text-surface-500">{t('onboarding.review.housing')}</span>
                    <span className="text-sm font-medium text-surface-900 dark:text-white">
                      {HOUSING_TYPES.find(ht => ht.value === housingType)?.label}
                    </span>
                  </div>
                )}
                {onboardingExpenses.length > 0 && (
                  <div className="flex justify-between items-start py-2 border-b border-surface-100 dark:border-surface-700">
                    <span className="text-sm text-surface-500">{t('expenses.fixedExpenses')}</span>
                    <span className="text-sm font-medium text-surface-900 dark:text-white text-right max-w-[60%]">
                      {onboardingExpenses.map(e => e.description).join(', ')}
                    </span>
                  </div>
                )}
                {onboardingIncomes.length > 0 && (
                  <div className="flex justify-between items-start py-2 border-b border-surface-100 dark:border-surface-700">
                    <span className="text-sm text-surface-500">{t('expenses.income')}</span>
                    <span className="text-sm font-medium text-surface-900 dark:text-white text-right max-w-[60%]">
                      {onboardingIncomes.map(i => i.description).join(', ')}
                    </span>
                  </div>
                )}
                {bankConnected && importResult && (
                  <div className="flex justify-between items-center py-2 border-b border-surface-100 dark:border-surface-700">
                    <span className="text-sm text-surface-500">{t('onboarding.review.bankImport')}</span>
                    <span className="text-sm font-medium text-green-500">
                      {t('onboarding.review.importedCount', {
                        expenses: importResult.expenses,
                        incomes: importResult.incomes,
                      })}
                    </span>
                  </div>
                )}
                {!bankConnected && (
                  <p className="text-sm text-surface-400 text-center py-2">
                    {t('onboarding.review.noBankMessage')}
                  </p>
                )}
              </div>
            </Card>
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-3 mt-8">
          {step > 0 && (
            <Button variant="secondary" onClick={handleBack}>
              <ChevronLeft className="h-4 w-4" /> {t('common.back')}
            </Button>
          )}
          <div className="flex-1" />
          {step < TOTAL_STEPS - 1 ? (
            <Button onClick={handleNext} disabled={isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {t('common.next')} <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleComplete} disabled={isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {t('onboarding.complete')}
            </Button>
          )}
        </div>
      </div>

      {/* Expense Form Modal */}
      <ExpenseFormModal
        open={expenseModalOpen}
        onClose={() => setExpenseModalOpen(false)}
        editing={null}
        type="FIXED"
        categories={categories}
        onSave={handleAddExpense}
      />

      {/* Income Form Modal */}
      <IncomeFormModal
        open={incomeModalOpen}
        onClose={() => setIncomeModalOpen(false)}
        editing={null}
        categories={incomeCategories}
        onSave={handleAddIncome}
      />
    </div>
  );
}

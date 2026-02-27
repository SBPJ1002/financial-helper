import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Settings, Moon, Sun, Monitor, Info, Trash2, User, Palette,
  Bot, Bell, Database, Wallet, Loader2, Crown, Sparkles, Lock,
} from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Select from '../components/ui/Select';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { useToast } from '../components/ui/Toast';
import { useSettingsStore } from '../stores/useSettingsStore';
import { useUserSettingsStore } from '../stores/useUserSettingsStore';
import { useChatStore } from '../stores/useChatStore';
import { useOnboardingStore, type FinancialProfile } from '../stores/useOnboardingStore';
import api from '../services/api';
import { useAuthStore } from '../stores/useAuthStore';
import { CURRENCIES } from '../i18n';
import { getIntlLocale } from '../i18n';

export default function SettingsPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { theme, toggleTheme } = useSettingsStore();
  const { settings, fetchSettings, updateSettings } = useUserSettingsStore();
  const { clearHistory } = useChatStore();
  const { user } = useAuthStore();

  const [clearChatConfirm, setClearChatConfirm] = useState(false);
  const [activeSection, setActiveSection] = useState('profile');

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  function handleClearChat() {
    clearHistory();
    toast(t('settings.chatCleared'));
    setClearChatConfirm(false);
  }

  async function handleCurrencyChange(currency: string) {
    await updateSettings({ currency } as any);
  }

  async function handleDateFormatChange(dateFormat: string) {
    await updateSettings({ dateFormat } as any);
  }

  const isFreePlan = !user?.plan || user.plan === 'FREE';

  const sections = [
    { id: 'profile', label: t('settings.profileAndFinancial'), icon: User },
    { id: 'appearance', label: t('settings.appearance'), icon: Palette },
    { id: 'currency', label: t('settings.currencySection'), icon: Wallet },
    ...(!isFreePlan ? [{ id: 'ai', label: t('settings.ai'), icon: Bot }] : []),
    { id: 'notifications', label: t('settings.notifications'), icon: Bell },
    { id: 'data', label: t('settings.data'), icon: Database },
    { id: 'about', label: t('settings.about'), icon: Info },
  ];

  const effectiveSection = (activeSection === 'ai' && isFreePlan) ? 'profile' : activeSection;

  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-bold flex items-center gap-3 mb-6">
        <Settings className="h-6 w-6" /> {t('settings.title')}
      </h1>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar nav */}
        <nav className="lg:w-48 flex lg:flex-col gap-1 overflow-x-auto pb-2 lg:pb-0">
          {sections.map(s => (
            <button key={s.id} onClick={() => setActiveSection(s.id)}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors
                ${effectiveSection === s.id
                  ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                  : 'text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-700/50'}`}>
              <s.icon className="h-4 w-4 shrink-0" />
              {s.label}
            </button>
          ))}
        </nav>

        {/* Content */}
        <div className="flex-1 max-w-2xl space-y-6">
          {/* Profile + Financial Profile (merged) */}
          {effectiveSection === 'profile' && (
            <>
              <Card>
                <h2 className="text-lg font-semibold mb-4">{t('settings.profile')}</h2>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between"><span className="text-surface-500">{t('settings.profileName')}</span><span className="font-medium">{user?.fullName}</span></div>
                  <div className="flex justify-between"><span className="text-surface-500">{t('settings.profileEmail')}</span><span className="font-medium">{user?.email}</span></div>
                  <div className="flex justify-between">
                    <span className="text-surface-500">{t('settings.plan')}</span>
                    <Badge variant="success">
                      {user?.plan === 'AI_AGENT' ? t('settings.planAiAgent') : user?.plan === 'FULL' ? t('settings.planInvestments') : t('settings.planFree')}
                    </Badge>
                  </div>
                  <div className="flex justify-between"><span className="text-surface-500">{t('settings.memberSince')}</span><span className="font-medium">{user?.createdAt ? new Date(user.createdAt).toLocaleDateString(getIntlLocale(settings?.language || 'pt-BR')) : '—'}</span></div>
                </div>
              </Card>

              {/* Plan tiers */}
              <Card>
                <h2 className="text-lg font-semibold mb-1">{t('settings.planTitle')}</h2>
                <p className="text-xs text-surface-500 mb-4">{t('settings.planDesc')}</p>
                <div className="space-y-3">
                  {/* Free tier */}
                  <div className={`p-4 rounded-xl ${user?.plan === 'FREE' || !user?.plan ? 'border-2 border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border border-surface-200 dark:border-surface-600'}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <Crown className="h-4 w-4 text-primary-500" />
                      <span className={`text-sm font-semibold ${user?.plan === 'FREE' || !user?.plan ? 'text-primary-600 dark:text-primary-400' : 'text-surface-900 dark:text-white'}`}>{t('settings.planFree')}</span>
                      {(user?.plan === 'FREE' || !user?.plan) && <Badge variant="success" className="ml-auto">{t('settings.planCurrent')}</Badge>}
                    </div>
                    <p className="text-xs text-surface-500">{t('settings.planFreeDesc')}</p>
                  </div>

                  {/* AI Agent tier */}
                  <div className={`p-4 rounded-xl ${user?.plan === 'AI_AGENT' ? 'border-2 border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border border-surface-200 dark:border-surface-600 hover:border-surface-300 dark:hover:border-surface-500 transition-colors'}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <Sparkles className="h-4 w-4 text-amber-500" />
                      <span className={`text-sm font-semibold ${user?.plan === 'AI_AGENT' ? 'text-primary-600 dark:text-primary-400' : 'text-surface-900 dark:text-white'}`}>{t('settings.planAiAgent')}</span>
                      {user?.plan === 'AI_AGENT' && <Badge variant="success" className="ml-auto">{t('settings.planCurrent')}</Badge>}
                    </div>
                    <p className="text-xs text-surface-500">{t('settings.planAiAgentDesc')}</p>
                  </div>

                  {/* Investments tier (coming soon) */}
                  <div className={`p-4 rounded-xl ${user?.plan === 'FULL' ? 'border-2 border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border border-surface-200 dark:border-surface-600 opacity-60'}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <Lock className="h-4 w-4 text-surface-400" />
                      <span className={`text-sm font-semibold ${user?.plan === 'FULL' ? 'text-primary-600 dark:text-primary-400' : 'text-surface-900 dark:text-white'}`}>{t('settings.planInvestments')}</span>
                      {user?.plan === 'FULL' ? <Badge variant="success" className="ml-auto">{t('settings.planCurrent')}</Badge> : <Badge variant="default" className="ml-auto">{t('settings.planComingSoon')}</Badge>}
                    </div>
                    <p className="text-xs text-surface-500">{t('settings.planInvestmentsDesc')}</p>
                  </div>
                </div>
              </Card>

              <FinancialProfileSection />
            </>
          )}

          {/* Appearance */}
          {effectiveSection === 'appearance' && (
            <Card>
              <h2 className="text-lg font-semibold mb-4">{t('settings.theme')}</h2>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: 'dark', icon: Moon, label: t('settings.dark') },
                  { value: 'light', icon: Sun, label: t('settings.light') },
                  { value: 'system', icon: Monitor, label: t('settings.system') },
                ].map(opt => (
                  <button key={opt.value} onClick={() => { if (opt.value !== 'system') toggleTheme(); }}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-colors
                      ${theme === opt.value ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-surface-200 dark:border-surface-700 hover:border-surface-400'}`}>
                    <opt.icon className="h-6 w-6" />
                    <span className="text-sm font-medium">{opt.label}</span>
                  </button>
                ))}
              </div>
            </Card>
          )}

          {/* Currency & Date Format */}
          {effectiveSection === 'currency' && (
            <>
              <Card>
                <h2 className="text-lg font-semibold mb-4">{t('settings.defaultCurrency')}</h2>
                <Select
                  value={settings?.currency || 'BRL'}
                  onChange={e => handleCurrencyChange(e.target.value)}
                  options={CURRENCIES.map(c => ({
                    value: c.code,
                    label: `${c.flag} ${c.code} — ${c.name}`,
                  }))}
                />
              </Card>

              <Card>
                <h2 className="text-lg font-semibold mb-4">{t('settings.dateFormat')}</h2>
                <Select
                  value={settings?.dateFormat || 'DD/MM/YYYY'}
                  onChange={e => handleDateFormatChange(e.target.value)}
                  options={[
                    { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (31/12/2026)' },
                    { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (12/31/2026)' },
                    { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (2026-12-31)' },
                  ]}
                />
              </Card>
            </>
          )}

          {/* AI Assistant */}
          {effectiveSection === 'ai' && (
            <>
              <Card>
                <h2 className="text-lg font-semibold mb-4">{t('settings.aiContext')}</h2>
                <div className="space-y-3">
                  <ToggleItem label={t('settings.includeExpenses')}
                    description={t('settings.expensesDesc')}
                    checked={settings?.aiIncludeExpenses ?? true}
                    onChange={v => updateSettings({ aiIncludeExpenses: v } as any)} />
                </div>
              </Card>

              <Card>
                <h2 className="text-lg font-semibold mb-4">{t('settings.chat')}</h2>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{t('settings.clearChatHistory')}</p>
                    <p className="text-xs text-surface-500">{t('settings.clearChatDesc')}</p>
                  </div>
                  <Button variant="danger" size="sm" onClick={() => setClearChatConfirm(true)}>
                    <Trash2 className="h-4 w-4" /> {t('settings.clearHistory')}
                  </Button>
                </div>
              </Card>
            </>
          )}

          {/* Notifications */}
          {effectiveSection === 'notifications' && (
            <Card>
              <h2 className="text-lg font-semibold mb-4">{t('settings.alerts')}</h2>
              <div className="space-y-3">
                <ToggleItem label={t('settings.alertExpense')}
                  checked={settings?.alertExpenseAbove ?? true}
                  onChange={v => updateSettings({ alertExpenseAbove: v } as any)} />
                <ToggleItem label={t('settings.alertInvestment')}
                  checked={settings?.alertInvestmentDrop ?? true}
                  onChange={v => updateSettings({ alertInvestmentDrop: v } as any)} />
                <ToggleItem label={t('settings.alertBill')}
                  checked={settings?.alertBillDue ?? true}
                  onChange={v => updateSettings({ alertBillDue: v } as any)} />
              </div>
            </Card>
          )}

          {/* Data & Privacy */}
          {effectiveSection === 'data' && (
            <Card>
              <h2 className="text-lg font-semibold mb-4">{t('settings.dataPrivacy')}</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{t('settings.exportJson')}</p>
                    <p className="text-xs text-surface-500">{t('settings.exportJsonDesc')}</p>
                  </div>
                  <Button variant="secondary" size="sm" onClick={async () => {
                    try {
                      const { data } = await api.get('/export', { params: { format: 'json' }, responseType: 'blob' });
                      const url = URL.createObjectURL(data);
                      const a = document.createElement('a');
                      a.href = url; a.download = 'finhelper-export.json'; a.click();
                      URL.revokeObjectURL(url);
                      toast(t('settings.exportSuccess'));
                    } catch { toast(t('settings.exportFailed')); }
                  }}>{t('settings.exportJson')}</Button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{t('settings.exportCsv')}</p>
                    <p className="text-xs text-surface-500">{t('settings.exportCsvDesc')}</p>
                  </div>
                  <Button variant="secondary" size="sm" onClick={async () => {
                    try {
                      const { data } = await api.get('/export', { params: { format: 'csv' }, responseType: 'blob' });
                      const url = URL.createObjectURL(data);
                      const a = document.createElement('a');
                      a.href = url; a.download = 'finhelper-export.csv'; a.click();
                      URL.revokeObjectURL(url);
                      toast(t('settings.exportSuccess'));
                    } catch { toast(t('settings.exportFailed')); }
                  }}>{t('settings.exportCsv')}</Button>
                </div>
              </div>
            </Card>
          )}

          {/* About */}
          {effectiveSection === 'about' && (
            <Card>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2"><Info className="h-5 w-5" /> {t('settings.aboutTitle')}</h2>
              <div className="text-sm text-surface-500 space-y-1">
                <p><strong className="text-surface-700 dark:text-surface-300">FinHelper</strong> — {t('settings.aboutApp')}</p>
                <p>{t('settings.aboutBuilt')}</p>
                <p>{t('settings.aboutAi')}</p>
                <p>{t('settings.aboutData')}</p>
              </div>
            </Card>
          )}
        </div>
      </div>

      <ConfirmDialog open={clearChatConfirm} onClose={() => setClearChatConfirm(false)} onConfirm={handleClearChat}
        title={t('settings.clearChatConfirmTitle')} message={t('settings.clearChatConfirmMsg')}
        confirmLabel={t('settings.clearHistory')} />
    </div>
  );
}

// ============================================================
// Financial Profile Section — Editable onboarding data
// ============================================================

function FinancialProfileSection() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { profile, isLoading, isSaving, fetchProfile, updateProfile } = useOnboardingStore();
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!loaded) {
      fetchProfile().then(() => setLoaded(true));
    }
  }, [loaded, fetchProfile]);

  async function save(data: Partial<FinancialProfile>) {
    try {
      await updateProfile(data);
      toast(t('settings.fpSaved'));
    } catch {
      toast(t('settings.fpSaveFailed'));
    }
  }

  function toggleArray(field: 'preferredPaymentMethods' | 'expectedFixedExpenses' | 'dependentTypes', value: string) {
    if (!profile) return;
    const arr = profile[field] as string[];
    const updated = arr.includes(value) ? arr.filter(x => x !== value) : [...arr, value];
    save({ [field]: updated });
  }

  const GOALS = [
    { value: 'SAVE_MORE', label: t('onboarding.goals.saveMore') },
    { value: 'PAY_OFF_DEBT', label: t('onboarding.goals.payOffDebt') },
    { value: 'CONTROL_SPENDING', label: t('onboarding.goals.controlSpending') },
    { value: 'INVEST_MORE', label: t('onboarding.goals.investMore') },
    { value: 'BUILD_EMERGENCY_FUND', label: t('onboarding.goals.emergencyFund') },
  ];

  const INCOME_TYPES = [
    { value: 'CLT', label: t('onboarding.income.clt') },
    { value: 'SELF_EMPLOYED', label: t('onboarding.income.selfEmployed') },
    { value: 'FREELANCER', label: t('onboarding.income.freelancer') },
    { value: 'BUSINESS_OWNER', label: t('onboarding.income.businessOwner') },
    { value: 'RETIREMENT', label: t('onboarding.income.retirement') },
    { value: 'OTHER_INCOME', label: t('onboarding.income.other') },
  ];

  const INCOME_RANGES = [
    { value: 'UP_TO_2K', label: t('onboarding.incomeRange.upTo2k') },
    { value: 'FROM_2K_TO_5K', label: t('onboarding.incomeRange.from2kTo5k') },
    { value: 'FROM_5K_TO_10K', label: t('onboarding.incomeRange.from5kTo10k') },
    { value: 'FROM_10K_TO_20K', label: t('onboarding.incomeRange.from10kTo20k') },
    { value: 'ABOVE_20K', label: t('onboarding.incomeRange.above20k') },
  ];

  const HOUSING_TYPES = [
    { value: 'OWN_PAID', label: t('onboarding.housing.ownPaid') },
    { value: 'OWN_MORTGAGE', label: t('onboarding.housing.ownMortgage') },
    { value: 'RENT', label: t('onboarding.housing.rent') },
    { value: 'FAMILY', label: t('onboarding.housing.family') },
  ];

  const PAYMENT_METHODS = [
    { value: 'PIX', label: 'PIX' },
    { value: 'CREDIT', label: t('onboarding.payment.credit') },
    { value: 'DEBIT', label: t('onboarding.payment.debit') },
    { value: 'CASH', label: t('onboarding.payment.cash') },
    { value: 'BOLETO', label: t('onboarding.payment.boleto') },
  ];

  const FIXED_EXPENSES = [
    { value: 'rent_mortgage', label: t('onboarding.fixedExpenses.rentMortgage') },
    { value: 'condo', label: t('onboarding.fixedExpenses.condo') },
    { value: 'electricity', label: t('onboarding.fixedExpenses.electricity') },
    { value: 'water', label: t('onboarding.fixedExpenses.water') },
    { value: 'internet', label: t('onboarding.fixedExpenses.internet') },
    { value: 'cellphone', label: t('onboarding.fixedExpenses.cellphone') },
    { value: 'health_insurance', label: t('onboarding.fixedExpenses.healthInsurance') },
    { value: 'insurance', label: t('onboarding.fixedExpenses.insurance') },
    { value: 'gym', label: t('onboarding.fixedExpenses.gym') },
    { value: 'streaming', label: t('onboarding.fixedExpenses.streaming') },
    { value: 'education', label: t('onboarding.fixedExpenses.education') },
    { value: 'alimony', label: t('onboarding.fixedExpenses.alimony') },
  ];

  const DEPENDENT_TYPES = [
    { value: 'children', label: t('onboarding.dependents.children') },
    { value: 'spouse', label: t('onboarding.dependents.spouse') },
    { value: 'parents', label: t('onboarding.dependents.parents') },
    { value: 'other', label: t('onboarding.dependents.other') },
  ];

  if (isLoading || !loaded) {
    return (
      <Card>
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary-500" />
        </div>
      </Card>
    );
  }

  const chipClass = (active: boolean) =>
    `py-1.5 px-3 rounded-full text-sm border transition-all cursor-pointer ${
      active
        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 font-medium'
        : 'border-surface-200 dark:border-surface-600 text-surface-600 dark:text-surface-400 hover:border-surface-300 dark:hover:border-surface-500'
    }`;

  const cardSelectClass = (active: boolean) =>
    `flex items-center gap-2 p-3 rounded-xl border text-left transition-all cursor-pointer ${
      active
        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 ring-1 ring-primary-500'
        : 'border-surface-200 dark:border-surface-600 hover:border-surface-300 dark:hover:border-surface-500'
    }`;

  return (
    <>
      {/* Goal */}
      <Card>
        <h2 className="text-lg font-semibold mb-1">{t('settings.fpGoalTitle')}</h2>
        <p className="text-xs text-surface-500 mb-4">{t('settings.fpGoalDesc')}</p>
        <div className="grid grid-cols-1 gap-2">
          {GOALS.map(g => (
            <button key={g.value} onClick={() => save({ primaryGoal: g.value })}
              className={cardSelectClass(profile?.primaryGoal === g.value)}>
              <span className="text-sm font-medium text-surface-900 dark:text-white">{g.label}</span>
            </button>
          ))}
        </div>

        <div className="mt-5">
          <h3 className="text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">{t('settings.fpControlScore')}</h3>
          <div className="flex items-center gap-4">
            <span className="text-xs text-surface-400">{t('onboarding.welcome.controlLow')}</span>
            <input type="range" min={1} max={5} value={profile?.financialControlScore ?? 3}
              onChange={e => save({ financialControlScore: Number(e.target.value) })}
              className="flex-1 accent-primary-500" />
            <span className="text-xs text-surface-400">{t('onboarding.welcome.controlHigh')}</span>
          </div>
          <p className="text-center text-sm font-medium text-primary-500 mt-1">{profile?.financialControlScore ?? 3}/5</p>
        </div>
      </Card>

      {/* Income */}
      <Card>
        <h2 className="text-lg font-semibold mb-1">{t('settings.fpIncomeTitle')}</h2>
        <p className="text-xs text-surface-500 mb-4">{t('settings.fpIncomeDesc')}</p>

        <h3 className="text-xs font-semibold text-surface-500 uppercase tracking-wide mb-2">{t('onboarding.incomeWork.typeQuestion')}</h3>
        <div className="grid grid-cols-2 gap-2 mb-5">
          {INCOME_TYPES.map(it => (
            <button key={it.value} onClick={() => save({ incomeType: it.value })}
              className={cardSelectClass(profile?.incomeType === it.value)}>
              <span className="text-sm font-medium text-surface-900 dark:text-white">{it.label}</span>
            </button>
          ))}
        </div>

        {(profile?.incomeType === 'CLT' || profile?.incomeType === 'RETIREMENT') && (
          <div className="mb-5">
            <h3 className="text-xs font-semibold text-surface-500 uppercase tracking-wide mb-2">{t('onboarding.incomeWork.incomeDay')}</h3>
            <div className="flex flex-wrap gap-1.5">
              {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                <button key={day} onClick={() => save({ expectedIncomeDay: profile?.expectedIncomeDay === day ? null : day })}
                  className={`w-9 h-9 rounded-lg text-xs font-medium border transition-all ${
                    profile?.expectedIncomeDay === day
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-600'
                      : 'border-surface-200 dark:border-surface-600 text-surface-600 dark:text-surface-400 hover:border-surface-300'
                  }`}>
                  {day}
                </button>
              ))}
            </div>
          </div>
        )}

        <h3 className="text-xs font-semibold text-surface-500 uppercase tracking-wide mb-2">{t('onboarding.incomeWork.rangeQuestion')}</h3>
        <div className="space-y-1.5 mb-5">
          {INCOME_RANGES.map(r => (
            <button key={r.value} onClick={() => save({ incomeRange: r.value })}
              className={`w-full py-2 px-4 rounded-lg text-sm font-medium border text-left transition-all ${
                profile?.incomeRange === r.value
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-600'
                  : 'border-surface-200 dark:border-surface-600 text-surface-600 dark:text-surface-400 hover:border-surface-300'
              }`}>
              {r.label}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between p-3 rounded-lg border border-surface-200 dark:border-surface-600">
          <span className="text-sm text-surface-700 dark:text-surface-300">{t('onboarding.incomeWork.variableIncome')}</span>
          <button onClick={() => save({ incomeIsVariable: !profile?.incomeIsVariable })}
            className={`relative w-12 h-6 rounded-full transition-colors ${profile?.incomeIsVariable ? 'bg-primary-600' : 'bg-surface-300 dark:bg-surface-600'}`}>
            <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${profile?.incomeIsVariable ? 'translate-x-6' : 'translate-x-0.5'}`} />
          </button>
        </div>
      </Card>

      {/* Banking Profile */}
      <Card>
        <h2 className="text-lg font-semibold mb-1">{t('settings.fpBankingTitle')}</h2>
        <p className="text-xs text-surface-500 mb-4">{t('settings.fpBankingDesc')}</p>

        <div className="grid grid-cols-2 gap-6 mb-5">
          <div>
            <h3 className="text-xs font-semibold text-surface-500 uppercase tracking-wide mb-2">{t('onboarding.financial.bankAccounts')}</h3>
            <div className="flex gap-2">
              {[{ v: 1, l: '1' }, { v: 2, l: '2' }, { v: 3, l: '3+' }].map(opt => (
                <button key={opt.v} onClick={() => save({ bankAccountCount: opt.v })}
                  className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium border transition-all ${
                    profile?.bankAccountCount === opt.v
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-600'
                      : 'border-surface-200 dark:border-surface-600 text-surface-600 dark:text-surface-400'
                  }`}>
                  {opt.l}
                </button>
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-xs font-semibold text-surface-500 uppercase tracking-wide mb-2">{t('onboarding.financial.creditCards')}</h3>
            <div className="flex gap-2">
              {[{ v: 0, l: '0' }, { v: 1, l: '1' }, { v: 2, l: '2+' }].map(opt => (
                <button key={opt.v} onClick={() => save({ creditCardCount: opt.v })}
                  className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium border transition-all ${
                    profile?.creditCardCount === opt.v
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-600'
                      : 'border-surface-200 dark:border-surface-600 text-surface-600 dark:text-surface-400'
                  }`}>
                  {opt.l}
                </button>
              ))}
            </div>
          </div>
        </div>

        <h3 className="text-xs font-semibold text-surface-500 uppercase tracking-wide mb-2">{t('onboarding.financial.paymentMethods')}</h3>
        <div className="flex flex-wrap gap-2">
          {PAYMENT_METHODS.map(m => (
            <button key={m.value}
              onClick={() => toggleArray('preferredPaymentMethods', m.value)}
              className={chipClass(profile?.preferredPaymentMethods?.includes(m.value) ?? false)}>
              {m.label}
            </button>
          ))}
        </div>
      </Card>

      {/* Housing & Fixed Expenses */}
      <Card>
        <h2 className="text-lg font-semibold mb-1">{t('onboarding.housingExpenses.title')}</h2>
        <p className="text-xs text-surface-500 mb-4">{t('settings.fpHousingDesc')}</p>

        <h3 className="text-xs font-semibold text-surface-500 uppercase tracking-wide mb-2">{t('onboarding.housingExpenses.housingQuestion')}</h3>
        <div className="grid grid-cols-2 gap-2 mb-5">
          {HOUSING_TYPES.map(ht => (
            <button key={ht.value} onClick={() => save({ housingType: ht.value })}
              className={cardSelectClass(profile?.housingType === ht.value)}>
              <span className="text-sm font-medium text-surface-900 dark:text-white">{ht.label}</span>
            </button>
          ))}
        </div>

        <h3 className="text-xs font-semibold text-surface-500 uppercase tracking-wide mb-2">{t('onboarding.housingExpenses.fixedExpensesQuestion')}</h3>
        <p className="text-xs text-surface-400 mb-3">{t('settings.fpFixedExpensesHint')}</p>
        <div className="flex flex-wrap gap-2 mb-5">
          {FIXED_EXPENSES.map(fe => (
            <button key={fe.value}
              onClick={() => toggleArray('expectedFixedExpenses', fe.value)}
              className={chipClass(profile?.expectedFixedExpenses?.includes(fe.value) ?? false)}>
              {fe.label}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between p-3 rounded-lg border border-surface-200 dark:border-surface-600 mb-3">
          <span className="text-sm text-surface-700 dark:text-surface-300">{t('onboarding.housingExpenses.hasDependents')}</span>
          <button onClick={() => {
            const next = !profile?.hasDependents;
            save({ hasDependents: next, ...(!next ? { dependentTypes: [] } : {}) });
          }}
            className={`relative w-12 h-6 rounded-full transition-colors ${profile?.hasDependents ? 'bg-primary-600' : 'bg-surface-300 dark:bg-surface-600'}`}>
            <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${profile?.hasDependents ? 'translate-x-6' : 'translate-x-0.5'}`} />
          </button>
        </div>

        {profile?.hasDependents && (
          <div className="flex flex-wrap gap-2">
            {DEPENDENT_TYPES.map(dt => (
              <button key={dt.value}
                onClick={() => toggleArray('dependentTypes', dt.value)}
                className={chipClass(profile?.dependentTypes?.includes(dt.value) ?? false)}>
                {dt.label}
              </button>
            ))}
          </div>
        )}
      </Card>

      {/* Info box */}
      <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-sm text-blue-700 dark:text-blue-300">
        <p className="font-semibold mb-1">{t('settings.fpInfoTitle')}</p>
        <p className="text-xs leading-relaxed">{t('settings.fpInfoDesc')}</p>
      </div>

      {isSaving && (
        <div className="flex items-center gap-2 text-xs text-surface-400">
          <Loader2 className="h-3 w-3 animate-spin" /> {t('common.loading')}
        </div>
      )}
    </>
  );
}

// ============================================================
// Shared Components
// ============================================================

function ToggleItem({ label, description, checked, onChange }: {
  label: string; description?: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="font-medium text-sm">{label}</p>
        {description && <p className="text-xs text-surface-500">{description}</p>}
      </div>
      <button onClick={() => onChange(!checked)}
        className={`relative w-12 h-6 rounded-full transition-colors ${checked ? 'bg-primary-600' : 'bg-surface-300 dark:bg-surface-600'}`}>
        <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-6' : 'translate-x-0.5'}`} />
      </button>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Settings, Moon, Sun, Monitor, Info, Trash2, User, Palette,
  Bot, Bell, Database, Eye, EyeOff, ExternalLink, CheckCircle, XCircle, Loader2,
  Landmark, Globe,
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
import api from '../services/api';
import { useAuthStore } from '../stores/useAuthStore';
import { useBankingStore } from '../stores/useBankingStore';
import { LANGUAGES, CURRENCIES } from '../i18n';
import { getIntlLocale } from '../i18n';

const ACCENT_COLORS = [
  { value: 'blue', label: 'Blue', class: 'bg-blue-500' },
  { value: 'purple', label: 'Purple', class: 'bg-purple-500' },
  { value: 'green', label: 'Green', class: 'bg-green-500' },
  { value: 'red', label: 'Red', class: 'bg-red-500' },
  { value: 'orange', label: 'Orange', class: 'bg-orange-500' },
  { value: 'pink', label: 'Pink', class: 'bg-pink-500' },
  { value: 'teal', label: 'Teal', class: 'bg-teal-500' },
  { value: 'indigo', label: 'Indigo', class: 'bg-indigo-500' },
];

export default function SettingsPage() {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const { theme, toggleTheme } = useSettingsStore();
  const { settings, fetchSettings, updateSettings, testAiConnection } = useUserSettingsStore();
  const { clearHistory } = useChatStore();
  const { user } = useAuthStore();
  const { isAvailable: bankingAvailable, connections, checkAvailability, fetchConnections } = useBankingStore();
  const navigate = useNavigate();

  const [clearChatConfirm, setClearChatConfirm] = useState(false);
  const [activeSection, setActiveSection] = useState('profile');

  // AI form state
  const [aiApiKey, setAiApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [detectedModel, setDetectedModel] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings();
    checkAvailability();
    fetchConnections();
  }, [fetchSettings, checkAvailability, fetchConnections]);

  useEffect(() => {
    if (settings) {
      setAiApiKey(settings.aiApiKey || '');
    }
  }, [settings]);

  async function handleSaveAi() {
    try {
      await updateSettings({
        aiProvider: 'google',
        aiApiKey: aiApiKey === '••••••••' ? undefined : aiApiKey,
        aiModel: detectedModel || 'auto',
      } as any);
      toast(t('settings.aiSaved'));
    } catch {
      toast(t('settings.aiSaveFailed'));
    }
  }

  async function handleTestConnection() {
    if (!aiApiKey || aiApiKey === '••••••••') return;
    setTestStatus('testing');
    setDetectedModel(null);
    try {
      const result = await testAiConnection('google', aiApiKey, 'auto');
      setTestStatus(result.success ? 'success' : 'error');
      if (result.model) {
        setDetectedModel(result.model);
      }
    } catch {
      setTestStatus('error');
    }
  }

  function handleClearChat() {
    clearHistory();
    toast(t('settings.chatCleared'));
    setClearChatConfirm(false);
  }

  async function handleLanguageChange(lang: string) {
    await updateSettings({ language: lang } as any);
    i18n.changeLanguage(lang);
  }

  async function handleCurrencyChange(currency: string) {
    await updateSettings({ currency } as any);
  }

  async function handleDateFormatChange(dateFormat: string) {
    await updateSettings({ dateFormat } as any);
  }

  const sections = [
    { id: 'profile', label: t('settings.profile'), icon: User },
    { id: 'appearance', label: t('settings.appearance'), icon: Palette },
    { id: 'language', label: t('settings.languageCurrency'), icon: Globe },
    { id: 'ai', label: t('settings.ai'), icon: Bot },
    { id: 'banking', label: t('settings.banking'), icon: Landmark },
    { id: 'notifications', label: t('settings.notifications'), icon: Bell },
    { id: 'data', label: t('settings.data'), icon: Database },
    { id: 'about', label: t('settings.about'), icon: Info },
  ];

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
                ${activeSection === s.id
                  ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                  : 'text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-700/50'}`}>
              <s.icon className="h-4 w-4 shrink-0" />
              {s.label}
            </button>
          ))}
        </nav>

        {/* Content */}
        <div className="flex-1 max-w-2xl space-y-6">
          {/* Profile */}
          {activeSection === 'profile' && (
            <Card>
              <h2 className="text-lg font-semibold mb-4">{t('settings.profile')}</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-surface-500">{t('settings.profileName')}</span><span className="font-medium">{user?.fullName}</span></div>
                <div className="flex justify-between"><span className="text-surface-500">{t('settings.profileEmail')}</span><span className="font-medium">{user?.email}</span></div>
                <div className="flex justify-between"><span className="text-surface-500">{t('settings.profileRole')}</span><span className="font-medium">{user?.role}</span></div>
                <div className="flex justify-between"><span className="text-surface-500">{t('settings.memberSince')}</span><span className="font-medium">{user?.createdAt ? new Date(user.createdAt).toLocaleDateString(getIntlLocale(settings?.language || 'pt-BR')) : '—'}</span></div>
              </div>
            </Card>
          )}

          {/* Appearance */}
          {activeSection === 'appearance' && (
            <>
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

              <Card>
                <h2 className="text-lg font-semibold mb-4">{t('settings.accentColor')}</h2>
                <div className="flex flex-wrap gap-3">
                  {ACCENT_COLORS.map(c => (
                    <button key={c.value} onClick={() => updateSettings({ accentColor: c.value } as any).then(() => toast(`Accent: ${c.label}`))}
                      className={`w-10 h-10 rounded-full ${c.class} transition-transform hover:scale-110
                        ${settings?.accentColor === c.value ? 'ring-2 ring-offset-2 ring-primary-500 dark:ring-offset-surface-800' : ''}`}
                      title={c.label} />
                  ))}
                </div>
                <p className="text-xs text-surface-500 mt-3">{t('settings.accentApply')}</p>
              </Card>
            </>
          )}

          {/* Language & Currency */}
          {activeSection === 'language' && (
            <>
              <Card>
                <h2 className="text-lg font-semibold mb-4">{t('settings.language')}</h2>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {LANGUAGES.map(lang => (
                    <button key={lang.code} onClick={() => handleLanguageChange(lang.code)}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-colors text-center
                        ${(settings?.language || 'pt-BR') === lang.code
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                          : 'border-surface-200 dark:border-surface-700 hover:border-surface-400'}`}>
                      <span className="text-2xl">{lang.flag}</span>
                      <span className="text-xs font-medium leading-tight">{lang.name}</span>
                    </button>
                  ))}
                </div>
              </Card>

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
          {activeSection === 'ai' && (
            <>
              <Card>
                <h2 className="text-lg font-semibold mb-1">{t('settings.aiTitle')}</h2>
                <p className="text-xs text-surface-500 mb-4">{t('settings.aiSubtitle')}</p>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">{t('settings.apiKey')}</label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input type={showApiKey ? 'text' : 'password'} value={aiApiKey}
                          onChange={e => { setAiApiKey(e.target.value); setTestStatus('idle'); }}
                          placeholder={t('settings.apiKeyPlaceholder')}
                          className="w-full px-4 py-2 pr-10 rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                        <button onClick={() => setShowApiKey(!showApiKey)}
                          className="absolute right-3 top-2.5 text-surface-400 hover:text-surface-600">
                          {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-surface-500 mt-1.5 flex items-center gap-1">
                      <ExternalLink className="h-3 w-3" />
                      {t('settings.getApiKey')}{' '}
                      <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer"
                        className="text-primary-500 hover:underline">aistudio.google.com/apikey</a>
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">{t('settings.model')}</label>
                    <div className="px-4 py-2.5 rounded-lg border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800/50 text-sm text-surface-500 dark:text-surface-400">
                      {detectedModel
                        ? <span className="text-surface-700 dark:text-surface-200 font-medium">{detectedModel}</span>
                        : t('settings.modelAutoDetect')}
                    </div>
                    <p className="text-xs text-surface-500 mt-1.5 flex items-center gap-1">
                      <Info className="h-3 w-3" />
                      {t('settings.modelTip')}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <Button size="sm" onClick={handleTestConnection}
                      disabled={!aiApiKey || aiApiKey === '••••••••' || testStatus === 'testing'}>
                      {testStatus === 'testing' ? <><Loader2 className="h-4 w-4 animate-spin" /> {t('settings.testing')}</>
                        : t('settings.testConnection')}
                    </Button>

                    {testStatus === 'success' && (
                      <span className="text-sm text-green-500 flex items-center gap-1">
                        <CheckCircle className="h-4 w-4" />
                        {t('settings.connected')}{detectedModel ? ` — ${detectedModel}` : ''}
                      </span>
                    )}
                    {testStatus === 'error' && (
                      <span className="text-sm text-red-500 flex items-center gap-1"><XCircle className="h-4 w-4" /> {t('settings.connectionFailed')}</span>
                    )}
                    {settings?.hasAiApiKey && testStatus === 'idle' && (
                      <span className="text-sm text-green-500 flex items-center gap-1"><CheckCircle className="h-4 w-4" /> {t('common.configured')}</span>
                    )}
                  </div>

                  <div className="flex justify-end pt-2">
                    <Button onClick={handleSaveAi}>{t('settings.saveAiSettings')}</Button>
                  </div>
                </div>
              </Card>

              <Card>
                <h2 className="text-lg font-semibold mb-4">{t('settings.aiContext')}</h2>
                <div className="space-y-3">
                  <ToggleItem label={t('settings.includeInvestments')}
                    description={t('settings.investmentsDesc')}
                    checked={settings?.aiIncludeInvestments ?? true}
                    onChange={v => updateSettings({ aiIncludeInvestments: v } as any)} />
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

          {/* Open Finance / Pluggy */}
          {activeSection === 'banking' && (
            <>
              <Card>
                <h2 className="text-lg font-semibold mb-1">{t('settings.openFinanceTitle')}</h2>
                <p className="text-xs text-surface-500 mb-4">
                  {t('settings.openFinanceDesc')}
                </p>

                <div className="flex items-center gap-3 mb-4">
                  <span className="text-sm font-medium">{t('settings.pluggyStatus')}</span>
                  {bankingAvailable ? (
                    <Badge variant="success">{t('settings.pluggyEnabled')}</Badge>
                  ) : (
                    <Badge variant="default">{t('settings.pluggyNotConfigured')}</Badge>
                  )}
                </div>

                {bankingAvailable ? (
                  <div className="space-y-3">
                    <p className="text-sm text-surface-500">
                      {connections.length > 0
                        ? t('settings.banksConnected', { count: connections.length })
                        : t('settings.noBanksConnected')}
                    </p>
                    <Button size="sm" onClick={() => navigate('/banking')}>
                      <Landmark className="h-4 w-4" /> {t('settings.manageConnections')}
                    </Button>
                  </div>
                ) : (
                  <div className="p-4 rounded-lg bg-surface-50 dark:bg-surface-700/30 text-sm text-surface-600 dark:text-surface-300 space-y-2">
                    <p className="font-medium">{t('settings.pluggyNotAvailable')}</p>
                    <p className="text-surface-500">{t('settings.pluggyAskAdmin')}</p>
                  </div>
                )}
              </Card>

              <Card>
                <h2 className="text-lg font-semibold mb-4">{t('settings.setupGuide')}</h2>
                <div className="text-sm text-surface-600 dark:text-surface-300 space-y-4">
                  <div>
                    <p className="font-medium mb-1">{t('settings.setupStep1Title')}</p>
                    <p className="text-surface-500">
                      {t('settings.setupStep1Desc').split('pluggy.ai')[0]}
                      <a href="https://pluggy.ai" target="_blank" rel="noopener noreferrer"
                        className="text-primary-500 hover:underline inline-flex items-center gap-1">
                        pluggy.ai <ExternalLink className="h-3 w-3" />
                      </a>
                      {t('settings.setupStep1Desc').split('pluggy.ai')[1] || ''}
                    </p>
                  </div>
                  <div>
                    <p className="font-medium mb-1">{t('settings.setupStep2Title')}</p>
                    <p className="text-surface-500">
                      {t('settings.setupStep2Desc')}
                    </p>
                  </div>
                  <div>
                    <p className="font-medium mb-1">{t('settings.setupStep3Title')}</p>
                    <p className="text-surface-500">
                      {t('settings.setupStep3Desc')}
                    </p>
                    <pre className="mt-2 p-3 rounded-lg bg-surface-100 dark:bg-surface-800 text-xs font-mono overflow-x-auto">
{`PLUGGY_CLIENT_ID=your_client_id_here
PLUGGY_CLIENT_SECRET=your_client_secret_here`}
                    </pre>
                  </div>
                  <div>
                    <p className="font-medium mb-1">{t('settings.setupStep4Title')}</p>
                    <p className="text-surface-500">
                      {t('settings.setupStep4Desc')}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-xs">
                    {t('settings.pluggyNote')}
                  </div>
                </div>
              </Card>
            </>
          )}

          {/* Notifications */}
          {activeSection === 'notifications' && (
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
          {activeSection === 'data' && (
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
          {activeSection === 'about' && (
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

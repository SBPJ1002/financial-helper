import { useState, useMemo, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Plus, PiggyBank, Trash2, Edit2, Search, TrendingUp, TrendingDown,
  Minus, Clock, Building2, BarChart3, RefreshCw, Zap,
} from 'lucide-react';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Modal from '../components/ui/Modal';
import Badge from '../components/ui/Badge';
import StatCard from '../components/ui/StatCard';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import EmptyState from '../components/ui/EmptyState';
import { useToast } from '../components/ui/Toast';
import { useFinanceStore } from '../stores/useFinanceStore';
import { formatCurrency, formatDate, formatPercent } from '../utils/format';
import { currencyFormatter } from '../utils/chartHelpers';
import api from '../services/api';

const CHART_COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#ef4444', '#6366f1'];

/* ── Investment type definitions per category ── */
const INVESTMENT_TYPES_BY_CATEGORY: Record<string, string[]> = {
  FIXED_INCOME: [
    'Treasury Selic', 'Treasury IPCA+', 'Treasury Prefixed', 'Treasury Renda+',
    'CDB', 'LCI', 'LCA', 'Debentures',
  ],
  VARIABLE_INCOME: [
    'Stocks', 'FII', 'ETF', 'BDR', 'Crypto',
  ],
  OTHER: [
    'Investment Funds', 'Private Pension', 'Savings', 'COE',
  ],
};

/* ── Treasury title options per type ── */
const TREASURY_TITLES_MAP: Record<string, string[]> = {
  'Treasury Selic': ['Treasury Selic 2027', 'Treasury Selic 2029', 'Treasury Selic 2031'],
  'Treasury IPCA+': [
    'Treasury IPCA+ 2029', 'Treasury IPCA+ 2035', 'Treasury IPCA+ 2045',
    'Treasury IPCA+ Semiannual 2035', 'Treasury IPCA+ Semiannual 2040',
    'Treasury IPCA+ Semiannual 2055',
  ],
  'Treasury Prefixed': [
    'Treasury Prefixed 2027', 'Treasury Prefixed 2031',
    'Treasury Prefixed Semiannual 2035',
  ],
  'Treasury Renda+': [
    'Treasury Renda+ Extra Retirement 2030', 'Treasury Renda+ Extra Retirement 2035',
    'Treasury Renda+ Extra Retirement 2040', 'Treasury Renda+ Extra Retirement 2050',
    'Treasury Renda+ Extra Retirement 2065',
  ],
};

const TREASURY_RATE_CONFIG: Record<string, { label: string; placeholder: string; index: string }> = {
  'Treasury Selic': { label: 'Spread over SELIC (% p.a.)', placeholder: '0.0546', index: 'SELIC' },
  'Treasury IPCA+': { label: 'Rate above IPCA (% p.a.)', placeholder: '6.50', index: 'IPCA' },
  'Treasury Prefixed': { label: 'Fixed annual rate (% p.a.)', placeholder: '14.50', index: 'PREFIXADO' },
  'Treasury Renda+': { label: 'Rate above IPCA (% p.a.)', placeholder: '6.30', index: 'IPCA' },
};

/* ── Asset type mapping ── */
const VARIABLE_ASSET_TYPE_MAP: Record<string, string> = {
  'Stocks': 'STOCK',
  'FII': 'FII',
  'ETF': 'ETF',
  'BDR': 'BDR',
  'Crypto': 'CRYPTO',
};

function getPnlBadge(invested: number, current: number | null) {
  if (current === null || current === undefined) return { label: 'Recent', variant: 'default' as const, icon: Clock };
  const diff = current - invested;
  const pct = invested > 0 ? (diff / invested) * 100 : 0;
  if (Math.abs(pct) < 0.5) return { label: 'Neutral', variant: 'default' as const, icon: Minus };
  if (diff > 0) return { label: `+${formatPercent(pct, 1)}`, variant: 'success' as const, icon: TrendingUp };
  return { label: formatPercent(pct, 1), variant: 'danger' as const, icon: TrendingDown };
}

export default function Investments() {
  const { t } = useTranslation();
  const {
    investments, investmentTypes,
    fetchInvestments, fetchInvestmentTypes,
    addInvestment, updateInvestment, deleteInvestment,
  } = useFinanceStore();
  const { toast } = useToast();
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<typeof investments[number] | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');

  // Price update modals
  const [priceModalAsset, setPriceModalAsset] = useState<{ id: string; ticker: string; lastPrice: number } | null>(null);
  const [batchPriceModal, setBatchPriceModal] = useState(false);

  const categoryLabels: Record<string, string> = {
    FIXED_INCOME: t('investments.fixedIncome'),
    VARIABLE_INCOME: t('investments.variableIncome'),
    OTHER: t('investments.other'),
  };

  useEffect(() => {
    fetchInvestments();
    fetchInvestmentTypes();
  }, [fetchInvestments, fetchInvestmentTypes]);

  const active = useMemo(() => investments.filter(i => i.status === 'ACTIVE'), [investments]);
  const totalInvested = active.reduce((s, i) => s + i.amountInvested, 0);
  const totalCurrentValue = active.reduce((s, i) => s + (i.currentValue ?? i.amountInvested), 0);
  const totalPnl = totalCurrentValue - totalInvested;
  const pnlPercent = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;

  const pieData = useMemo(() => {
    const byType: Record<string, number> = {};
    active.forEach(i => {
      const name = i.investmentType.name;
      byType[name] = (byType[name] || 0) + (i.currentValue ?? i.amountInvested);
    });
    return Object.entries(byType).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [active]);

  const barData = useMemo(() => {
    const byType: Record<string, number> = {};
    active.forEach(i => {
      const name = i.investmentType.name;
      byType[name] = (byType[name] || 0) + (i.currentValue ?? i.amountInvested);
    });
    return Object.entries(byType).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [active]);

  const filtered = useMemo(() => {
    let list = [...investments];
    if (filterType !== 'all') list = list.filter(i => i.investmentTypeId === filterType);
    if (filterStatus !== 'all') list = list.filter(i => i.status === filterStatus);
    if (filterCategory !== 'all') list = list.filter(i => i.investmentType.category === filterCategory);
    return list;
  }, [investments, filterType, filterStatus, filterCategory]);

  // Collect unique assets from variable income investments for batch price update
  const variableAssets = useMemo(() => {
    const map = new Map<string, { id: string; ticker: string; name: string }>();
    investments.forEach(inv => {
      if (inv.asset && inv.assetId) {
        map.set(inv.assetId, { id: inv.assetId, ticker: inv.asset.ticker, name: inv.asset.name });
      }
    });
    return Array.from(map.values());
  }, [investments]);

  const typeOptions = [{ value: 'all', label: t('common.all') + ' ' + t('investments.type') }, ...investmentTypes.map(t => ({ value: t.id, label: t.name }))];

  // Empty state
  if (investments.length === 0) {
    return (
      <div className="animate-fade-in">
        <h1 className="text-2xl font-bold mb-6">{t('investments.title')}</h1>
        <EmptyState
          icon={PiggyBank}
          title={t('investments.noInvestments')}
          description={t('investments.noInvestments')}
          actionLabel={`+ ${t('investments.addInvestment')}`}
          onAction={() => { setEditing(null); setModal(true); }}
        />
        <InvestmentFormModal open={modal} onClose={() => setModal(false)} editing={null}
          investmentTypes={investmentTypes}
          onSave={async (data) => {
            await addInvestment(data as any);
            toast(t('investments.investmentAdded'));
            setModal(false);
          }} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">{t('investments.title')}</h1>
        <div className="flex gap-2">
          {variableAssets.length > 0 && (
            <Button variant="secondary" size="sm" onClick={() => setBatchPriceModal(true)}>
              <RefreshCw className="h-4 w-4" /> {t('common.edit')}
            </Button>
          )}
          <Button size="sm" onClick={() => { setEditing(null); setModal(true); }}>
            <Plus className="h-4 w-4" /> {t('investments.addInvestment')}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label={t('investments.totalInvested')} value={formatCurrency(totalInvested)} icon={PiggyBank} color="text-accent-500" />
        <StatCard label={t('investments.currentValue')} value={formatCurrency(totalCurrentValue)} icon={Building2} color="text-green-500" />
        <StatCard
          label={t('investments.totalProfit')}
          value={`${totalPnl >= 0 ? '+' : ''}${formatCurrency(totalPnl)}`}
          icon={totalPnl >= 0 ? TrendingUp : TrendingDown}
          color={totalPnl >= 0 ? 'text-green-500' : 'text-red-500'}
        />
        <StatCard
          label={t('investments.profitPercent')}
          value={formatPercent(pnlPercent, 2)}
          icon={BarChart3}
          color={pnlPercent >= 0 ? 'text-green-500' : 'text-red-500'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h2 className="text-lg font-semibold mb-4">{t('investments.portfolio')}</h2>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={100} paddingAngle={2} dataKey="value">
                  {pieData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={currencyFormatter} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-surface-500 text-center py-12">{t('investments.noInvestments')}</p>}
        </Card>
        <Card>
          <h2 className="text-lg font-semibold mb-4">{t('investments.invested')}</h2>
          {barData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={barData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-surface-200 dark:stroke-surface-700" />
                <XAxis type="number" tick={{ fill: '#94a3b8' }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} width={120} />
                <Tooltip formatter={currencyFormatter} />
                <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-surface-500 text-center py-12">{t('investments.noInvestments')}</p>}
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select options={typeOptions} value={filterType} onChange={e => setFilterType(e.target.value)} />
        <Select options={[
          { value: 'all', label: t('common.allCategories') },
          { value: 'FIXED_INCOME', label: t('investments.fixedIncome') },
          { value: 'VARIABLE_INCOME', label: t('investments.variableIncome') },
          { value: 'OTHER', label: t('investments.other') },
        ]} value={filterCategory} onChange={e => setFilterCategory(e.target.value)} />
        <Select options={[
          { value: 'all', label: t('common.all') + ' ' + t('common.status') },
          { value: 'ACTIVE', label: t('investments.active') },
          { value: 'REDEEMED', label: t('investments.redeemed') },
        ]}
          value={filterStatus} onChange={e => setFilterStatus(e.target.value)} />
      </div>

      {/* Table */}
      <Card className="!p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-200 dark:border-surface-700 text-left text-xs text-surface-500 uppercase tracking-wide">
                <th className="px-5 py-3">{t('investments.name')}</th>
                <th className="px-5 py-3">{t('investments.type')}</th>
                <th className="px-5 py-3">{t('investments.invested')}</th>
                <th className="px-5 py-3">{t('investments.currentValue')}</th>
                <th className="px-5 py-3">{t('investments.totalProfit')}</th>
                <th className="px-5 py-3">{t('investments.yieldDesc')}</th>
                <th className="px-5 py-3">{t('investments.status')}</th>
                <th className="px-5 py-3 w-28">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(inv => {
                const pnl = getPnlBadge(inv.amountInvested, inv.currentValue);
                const PnlIcon = pnl.icon;
                const isVariable = inv.investmentType.category === 'VARIABLE_INCOME';
                const isTreasury = inv.treasuryTitle != null;
                return (
                  <tr key={inv.id} className="border-b border-surface-100 dark:border-surface-700/50 hover:bg-surface-50 dark:hover:bg-surface-800/50">
                    <td className="px-5 py-3">
                      <p className="font-medium">{inv.name}</p>
                      <p className="text-xs text-surface-500">
                        {formatDate(inv.applicationDate)}
                        {inv.maturityDate ? ` — ${formatDate(inv.maturityDate)}` : ''}
                      </p>
                      {inv.asset && (
                        <p className="text-xs text-primary-500 font-medium mt-0.5">
                          {inv.asset.ticker}
                          {inv.quantity ? ` · ${inv.asset.type === 'CRYPTO' ? inv.quantity.toFixed(8) : inv.quantity} units` : ''}
                          {inv.averagePrice ? ` @ ${formatCurrency(inv.averagePrice)}` : ''}
                        </p>
                      )}
                      {isTreasury && (
                        <p className="text-xs text-accent-500 font-medium mt-0.5">
                          {inv.treasuryTitle}
                          {inv.treasuryRate ? ` · ${inv.treasuryRate}%` : ''}
                          {inv.treasuryIndex ? ` (${inv.treasuryIndex})` : ''}
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <p className="text-sm">{inv.investmentType.name}</p>
                      <Badge variant={
                        isVariable ? 'warning'
                        : inv.investmentType.category === 'FIXED_INCOME' ? 'info'
                        : 'default'
                      }>
                        {categoryLabels[inv.investmentType.category] || inv.investmentType.category}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 font-semibold">{formatCurrency(inv.amountInvested)}</td>
                    <td className="px-5 py-3 font-semibold text-green-600 dark:text-green-400">
                      {inv.currentValue != null ? formatCurrency(inv.currentValue) : '—'}
                    </td>
                    <td className="px-5 py-3">
                      <Badge variant={pnl.variant} className="gap-1">
                        <PnlIcon className="h-3 w-3" />
                        {pnl.label}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-surface-500 text-xs">
                      <p>{inv.yieldDescription || '—'}</p>
                      <p>{inv.institution}</p>
                    </td>
                    <td className="px-5 py-3">
                      <Badge variant={inv.status === 'ACTIVE' ? 'success' : 'default'}>
                        {inv.status === 'ACTIVE' ? t('investments.active') : t('investments.redeemed')}
                      </Badge>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex gap-1">
                        {inv.asset && inv.assetId && (
                          <button onClick={() => setPriceModalAsset({ id: inv.assetId!, ticker: inv.asset!.ticker, lastPrice: inv.averagePrice ?? 0 })}
                            className="p-1.5 rounded hover:bg-surface-100 dark:hover:bg-surface-700 text-surface-400 hover:text-green-500" title={t('common.edit')}>
                            <RefreshCw className="h-4 w-4" />
                          </button>
                        )}
                        <button onClick={() => { setEditing(inv); setModal(true); }} className="p-1.5 rounded hover:bg-surface-100 dark:hover:bg-surface-700 text-surface-400 hover:text-primary-500"><Edit2 className="h-4 w-4" /></button>
                        <button onClick={() => setDeleteId(inv.id)} className="p-1.5 rounded hover:bg-surface-100 dark:hover:bg-surface-700 text-surface-400 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && <tr><td colSpan={8} className="px-5 py-8 text-center text-surface-500">{t('investments.noInvestments')}</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>

      <InvestmentFormModal open={modal} onClose={() => setModal(false)} editing={editing}
        investmentTypes={investmentTypes}
        onSave={async (data) => {
          if (editing) await updateInvestment(editing.id, data);
          else await addInvestment(data as any);
          toast(editing ? t('investments.investmentUpdated') : t('investments.investmentAdded'));
          setModal(false);
        }} />

      {/* Single price update modal */}
      <UpdatePriceModal
        asset={priceModalAsset}
        onClose={() => setPriceModalAsset(null)}
        onSave={async (assetId, price) => {
          await api.post(`/assets/${assetId}/price`, { price });
          toast(t('investments.investmentUpdated'));
          setPriceModalAsset(null);
          fetchInvestments();
        }}
      />

      {/* Batch price update modal */}
      <BatchPriceModal
        open={batchPriceModal}
        assets={variableAssets}
        onClose={() => setBatchPriceModal(false)}
        onSave={async (updates) => {
          await api.post('/assets/prices/batch', { updates });
          toast(t('investments.investmentUpdated'));
          setBatchPriceModal(false);
          fetchInvestments();
        }}
      />

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)}
        onConfirm={async () => { if (deleteId) { await deleteInvestment(deleteId); toast(t('investments.investmentDeleted')); } setDeleteId(null); }}
        title={t('common.delete')} message={t('investments.deleteConfirm')} />
    </div>
  );
}

/* ── Asset search result type ── */
interface AssetResult {
  id: string;
  ticker: string;
  name: string;
  type: string;
  sector: string | null;
  currency: string;
  priceHistory: Array<{ price: number; date: string }>;
}

/* ── Investment Form Modal (Dynamic) ── */
type InvCategory = 'FIXED_INCOME' | 'VARIABLE_INCOME' | 'OTHER';

function InvestmentFormModal({ open, onClose, editing, investmentTypes, onSave }: {
  open: boolean;
  onClose: () => void;
  editing: {
    id: string;
    name: string; investmentTypeId: string; amountInvested: number;
    applicationDate: string; maturityDate: string | null; yieldDescription: string;
    institution: string; status: string;
    assetId: string | null; asset: { id: string; ticker: string; name: string; type: string } | null;
    quantity: number | null; averagePrice: number | null; purchaseDate: string | null;
    treasuryTitle: string | null; treasuryRate: number | null; treasuryIndex: string | null;
    investmentType: { id: string; name: string; category: string };
  } | null;
  investmentTypes: Array<{ id: string; name: string; category: string }>;
  onSave: (data: Record<string, unknown>) => void;
}) {
  const { t } = useTranslation();

  // Step state
  const [selectedCategory, setSelectedCategory] = useState<InvCategory>('FIXED_INCOME');
  const [selectedTypeName, setSelectedTypeName] = useState('');

  // Common fields
  const [name, setName] = useState('');
  const [typeId, setTypeId] = useState('');
  const [amount, setAmount] = useState('');
  const [appDate, setAppDate] = useState('');
  const [matDate, setMatDate] = useState('');
  const [yieldStr, setYieldStr] = useState('');
  const [institution, setInstitution] = useState('');
  const [status, setStatus] = useState('ACTIVE');

  // Variable income
  const [assetSearch, setAssetSearch] = useState('');
  const [assetResults, setAssetResults] = useState<AssetResult[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<AssetResult | null>(null);
  const [showAssetDropdown, setShowAssetDropdown] = useState(false);
  const [quantity, setQuantity] = useState('');
  const [avgPrice, setAvgPrice] = useState('');

  // Treasury
  const [treasuryTitle, setTreasuryTitle] = useState('');
  const [treasuryRate, setTreasuryRate] = useState('');
  const [_treasuryIndex, setTreasuryIndex] = useState('');

  // CDB/LCI/LCA
  const [cdiPercent, setCdiPercent] = useState('100');

  // Private Pension
  const [previdenciaType, setPrevidenciaType] = useState('PGBL');
  const [monthlyContribution, setMonthlyContribution] = useState('');
  const [managementFee, setManagementFee] = useState('');

  // Investment Funds
  const [expectedYield, setExpectedYield] = useState('');

  // Detect types
  const isTreasury = ['Treasury Selic', 'Treasury IPCA+', 'Treasury Prefixed', 'Treasury Renda+'].includes(selectedTypeName);
  const isCdbLciLca = ['CDB', 'LCI', 'LCA'].includes(selectedTypeName);
  const isVariable = selectedCategory === 'VARIABLE_INCOME';
  const isCrypto = selectedTypeName === 'Crypto';
  const assetType = VARIABLE_ASSET_TYPE_MAP[selectedTypeName] || '';

  // Determine the matching investmentType id from the database
  function findTypeId(typeName: string): string {
    const match = investmentTypes.find(t => t.name === typeName);
    return match?.id || investmentTypes[0]?.id || '';
  }

  // Initialize form when opening
  useMemo(() => {
    if (open) {
      if (editing) {
        // Editing mode - populate from existing investment
        const cat = editing.investmentType.category as InvCategory;
        setSelectedCategory(cat);
        setSelectedTypeName(editing.investmentType.name);
        setName(editing.name);
        setTypeId(editing.investmentTypeId);
        setAmount(String(editing.amountInvested));
        setAppDate(editing.applicationDate?.slice(0, 10) || new Date().toISOString().slice(0, 10));
        setMatDate(editing.maturityDate?.slice(0, 10) || '');
        setYieldStr(editing.yieldDescription || '');
        setInstitution(editing.institution || '');
        setStatus(editing.status || 'ACTIVE');

        // Variable income
        if (editing.asset) {
          setSelectedAsset({ ...editing.asset, sector: null, currency: 'BRL', priceHistory: [] } as AssetResult);
          setAssetSearch(editing.asset.ticker);
        } else {
          setSelectedAsset(null);
          setAssetSearch('');
        }
        setQuantity(editing.quantity ? String(editing.quantity) : '');
        setAvgPrice(editing.averagePrice ? String(editing.averagePrice) : '');

        // Treasury
        setTreasuryTitle(editing.treasuryTitle || '');
        setTreasuryRate(editing.treasuryRate ? String(editing.treasuryRate) : '');
        setTreasuryIndex(editing.treasuryIndex || '');

        // CDB/LCI/LCA: parse yield description for CDI%
        if (['CDB', 'LCI', 'LCA'].includes(editing.investmentType.name)) {
          const match = editing.yieldDescription?.match(/^(\d+(?:\.\d+)?)/);
          setCdiPercent(match ? match[1] : '100');
        }
      } else {
        // New - reset everything
        setSelectedCategory('FIXED_INCOME');
        setSelectedTypeName('');
        setName('');
        setTypeId('');
        setAmount('');
        setAppDate(new Date().toISOString().slice(0, 10));
        setMatDate('');
        setYieldStr('');
        setInstitution('');
        setStatus('ACTIVE');
        setSelectedAsset(null);
        setAssetSearch('');
        setQuantity('');
        setAvgPrice('');
        setTreasuryTitle('');
        setTreasuryRate('');
        setTreasuryIndex('');
        setCdiPercent('100');
        setPrevidenciaType('PGBL');
        setMonthlyContribution('');
        setManagementFee('');
        setExpectedYield('');
      }
      setAssetResults([]);
      setShowAssetDropdown(false);
    }
  }, [open, editing, investmentTypes]);

  // Update typeId when selecting type name
  useEffect(() => {
    if (selectedTypeName) {
      setTypeId(findTypeId(selectedTypeName));
    }
  }, [selectedTypeName, investmentTypes]);

  // Asset search
  const searchAssets = useCallback(async (q: string) => {
    if (q.length < 2) {
      setAssetResults([]);
      setShowAssetDropdown(false);
      return;
    }
    try {
      const params: Record<string, string> = { q };
      if (assetType) params.type = assetType;
      const { data } = await api.get('/assets/search', { params });
      setAssetResults(data);
      setShowAssetDropdown(data.length > 0);
    } catch {
      setAssetResults([]);
    }
  }, [assetType]);

  useEffect(() => {
    if (!assetSearch || selectedAsset?.ticker === assetSearch) return;
    const timer = setTimeout(() => searchAssets(assetSearch), 300);
    return () => clearTimeout(timer);
  }, [assetSearch, selectedAsset, searchAssets]);

  // Auto-fill amount for variable income when quantity & avgPrice are set
  useEffect(() => {
    if (isVariable && quantity && avgPrice && !amount) {
      const calc = parseFloat(quantity) * parseFloat(avgPrice);
      if (!isNaN(calc) && calc > 0) setAmount(String(Math.round(calc * 100) / 100));
    }
  }, [quantity, avgPrice]);

  function selectAsset(asset: AssetResult) {
    setSelectedAsset(asset);
    setAssetSearch(asset.ticker);
    setShowAssetDropdown(false);
    if (!name) setName(`${asset.ticker} - ${asset.name}`);
    if (asset.priceHistory[0]) {
      setAvgPrice(String(asset.priceHistory[0].price));
    }
  }

  // Build yield description from form fields
  function buildYieldDescription(): string {
    if (isTreasury) {
      const rateConfig = TREASURY_RATE_CONFIG[selectedTypeName];
      if (rateConfig?.index === 'SELIC') return treasuryRate ? `SELIC + ${treasuryRate}%` : 'SELIC';
      if (rateConfig?.index === 'IPCA') return `IPCA + ${treasuryRate || '0'}%`;
      if (rateConfig?.index === 'PREFIXADO') return `${treasuryRate || '0'}% a.a.`;
    }
    if (isCdbLciLca) return `${cdiPercent}% CDI`;
    if (selectedTypeName === 'Savings') return 'Savings';
    if (selectedTypeName === 'Private Pension') return managementFee ? `Fee ${managementFee}% p.a.` : 'Pension';
    if (selectedTypeName === 'Investment Funds') return expectedYield ? `${expectedYield}% p.a.` : 'Fund';
    if (isVariable) return 'Variable';
    return yieldStr || 'Variable';
  }

  function handleSave() {
    if (!amount) return;
    const resolvedTypeId = typeId || findTypeId(selectedTypeName);
    if (!resolvedTypeId) return;

    const finalYieldDesc = buildYieldDescription();
    const finalName = name || selectedTypeName;

    const data: Record<string, unknown> = {
      name: finalName,
      investmentTypeId: resolvedTypeId,
      amountInvested: parseFloat(amount),
      applicationDate: appDate,
      maturityDate: matDate || undefined,
      yieldDescription: finalYieldDesc,
      institution,
      status,
    };

    // Variable income fields
    if (isVariable && selectedAsset) {
      data.assetId = selectedAsset.id;
      data.quantity = parseFloat(quantity) || undefined;
      data.averagePrice = parseFloat(avgPrice) || undefined;
      data.purchaseDate = appDate;
    }

    // Treasury fields
    if (isTreasury) {
      data.treasuryTitle = treasuryTitle || undefined;
      data.treasuryRate = parseFloat(treasuryRate) || undefined;
      data.treasuryIndex = TREASURY_RATE_CONFIG[selectedTypeName]?.index || undefined;
    }

    onSave(data);
  }

  const typesForCategory = INVESTMENT_TYPES_BY_CATEGORY[selectedCategory] || [];

  return (
    <Modal open={open} onClose={onClose} title={editing ? t('investments.editInvestment') : t('investments.addInvestment')} maxWidth="max-w-2xl">
      <div className="space-y-5">
        {/* Step 1: Category Selection */}
        {!editing && (
          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">{t('common.category')}</label>
            <div className="grid grid-cols-3 gap-3">
              {([
                { key: 'FIXED_INCOME' as InvCategory, label: t('investments.fixedIncome'), desc: 'Bonds, CDB, Treasury', Icon: BarChart3 },
                { key: 'VARIABLE_INCOME' as InvCategory, label: t('investments.variableIncome'), desc: 'Stocks, FIIs, Crypto', Icon: TrendingUp },
                { key: 'OTHER' as InvCategory, label: t('investments.other'), desc: 'Funds, Pension, Savings', Icon: PiggyBank },
              ]).map(cat => (
                <button key={cat.key} onClick={() => { setSelectedCategory(cat.key); setSelectedTypeName(''); }}
                  className={`flex flex-col items-center gap-1.5 p-4 rounded-xl border-2 transition-all text-center
                    ${selectedCategory === cat.key
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 shadow-sm'
                      : 'border-surface-200 dark:border-surface-700 hover:border-surface-400 dark:hover:border-surface-500'}`}>
                  <cat.Icon className="h-6 w-6" />
                  <span className="text-sm font-semibold">{cat.label}</span>
                  <span className="text-xs text-surface-500">{cat.desc}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Type Selection */}
        {!editing && (
          <Select label={t('investments.type')} value={selectedTypeName}
            onChange={e => {
              setSelectedTypeName(e.target.value);
              setName('');
              setYieldStr('');
              setTreasuryTitle('');
              setTreasuryRate('');
              setCdiPercent('100');
            }}
            options={[
              { value: '', label: 'Select a type...' },
              ...typesForCategory.map(t => ({ value: t, label: t })),
            ]} />
        )}

        {/* Step 3: Dynamic fields based on type */}
        {(selectedTypeName || editing) && (
          <>
            {/* Treasury Direct fields */}
            {isTreasury && (
              <div className="space-y-3 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800/30">
                <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide">
                  Treasury Direct — {selectedTypeName}
                </p>
                <Select label={t('investments.treasuryTitle')} value={treasuryTitle}
                  onChange={e => {
                    setTreasuryTitle(e.target.value);
                    if (!name || name.startsWith('Treasury')) setName(e.target.value);
                  }}
                  options={[
                    { value: '', label: 'Select a title...' },
                    ...(TREASURY_TITLES_MAP[selectedTypeName] || []).map(t => ({ value: t, label: t })),
                  ]} />
                <Input label={t('investments.invested')} type="number" min="0" step="0.01" value={amount}
                  onChange={e => setAmount(e.target.value)} placeholder="1000.00" required />
                <Input label={t('investments.purchaseDate')} type="date" value={appDate} onChange={e => setAppDate(e.target.value)} />
                <Input
                  label={TREASURY_RATE_CONFIG[selectedTypeName]?.label || t('investments.treasuryRate')}
                  type="number" min="0" step="0.01"
                  value={treasuryRate} onChange={e => setTreasuryRate(e.target.value)}
                  placeholder={TREASURY_RATE_CONFIG[selectedTypeName]?.placeholder || '6.50'} />
                <Input label={t('investments.institution')} value={institution} onChange={e => setInstitution(e.target.value)}
                  placeholder="e.g. Nubank, XP" />
              </div>
            )}

            {/* CDB / LCI / LCA fields */}
            {isCdbLciLca && (
              <div className="space-y-3 p-4 rounded-lg bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800/30">
                <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
                  {selectedTypeName}
                </p>
                {(selectedTypeName === 'LCI' || selectedTypeName === 'LCA') && (
                  <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/20 px-3 py-2 rounded-lg">
                    <span>Income Tax Exempt</span>
                  </div>
                )}
                <Input label={t('investments.name')} value={name} onChange={e => setName(e.target.value)}
                  placeholder={`e.g. ${selectedTypeName} Nubank`} required />
                <Input label={t('investments.invested')} type="number" min="0" step="0.01" value={amount}
                  onChange={e => setAmount(e.target.value)} placeholder="5000.00" required />
                <div className="grid grid-cols-2 gap-3">
                  <Input label={t('investments.purchaseDate')} type="date" value={appDate} onChange={e => setAppDate(e.target.value)} />
                  <Input label={t('investments.maturityDate')} type="date" value={matDate} onChange={e => setMatDate(e.target.value)} />
                </div>
                <Input label={t('investments.yieldType')} type="number" min="0" step="1" value={cdiPercent}
                  onChange={e => setCdiPercent(e.target.value)} placeholder="100" />
                <Input label={t('investments.institution')} value={institution} onChange={e => setInstitution(e.target.value)}
                  placeholder="e.g. Nubank, Inter" />
              </div>
            )}

            {/* Debentures */}
            {selectedTypeName === 'Debentures' && (
              <div className="space-y-3 p-4 rounded-lg bg-violet-50 dark:bg-violet-900/10 border border-violet-200 dark:border-violet-800/30">
                <p className="text-xs font-semibold text-violet-600 dark:text-violet-400 uppercase tracking-wide">Debentures</p>
                <Input label={t('investments.name')} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Debenture XYZ" required />
                <Input label={t('investments.invested')} type="number" min="0" step="0.01" value={amount}
                  onChange={e => setAmount(e.target.value)} required />
                <div className="grid grid-cols-2 gap-3">
                  <Input label={t('investments.purchaseDate')} type="date" value={appDate} onChange={e => setAppDate(e.target.value)} />
                  <Input label={t('investments.maturityDate')} type="date" value={matDate} onChange={e => setMatDate(e.target.value)} />
                </div>
                <Input label={t('investments.yieldDesc')} value={yieldStr} onChange={e => setYieldStr(e.target.value)}
                  placeholder={t('investments.yieldPlaceholder')} />
                <Input label={t('investments.institution')} value={institution} onChange={e => setInstitution(e.target.value)} />
              </div>
            )}

            {/* Variable Income (Stocks, FIIs, ETFs, BDRs, Crypto) */}
            {isVariable && (
              <div className="space-y-3 p-4 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30">
                <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide">
                  {selectedTypeName}
                </p>
                {isCrypto && (
                  <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/20 px-3 py-2 rounded-lg">
                    <Zap className="h-3 w-3" /> High volatility
                  </div>
                )}
                {/* Asset search */}
                <div className="relative">
                  <Input label={`${t('common.search').replace('...', '')} ${selectedTypeName}`} value={assetSearch}
                    onChange={e => { setAssetSearch(e.target.value); setSelectedAsset(null); }}
                    placeholder="Type ticker or name..."
                    icon={<Search className="h-4 w-4" />} />
                  {showAssetDropdown && (
                    <div className="absolute z-50 mt-1 w-full bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {assetResults.map(a => (
                        <button key={a.id} onClick={() => selectAsset(a)}
                          className="w-full text-left px-3 py-2 hover:bg-surface-100 dark:hover:bg-surface-700 flex items-center justify-between text-sm">
                          <div>
                            <span className="font-semibold">{a.ticker}</span>
                            <span className="text-surface-500 ml-2">{a.name}</span>
                            {a.sector && <span className="text-surface-400 ml-1 text-xs">({a.sector})</span>}
                          </div>
                          <div className="text-right">
                            <Badge variant="default">{a.type}</Badge>
                            {a.priceHistory[0] && (
                              <span className="text-xs text-surface-500 ml-2">{formatCurrency(a.priceHistory[0].price)}</span>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {selectedAsset && (
                  <div className="flex items-center gap-2 text-xs text-surface-500">
                    <Badge variant="info">{selectedAsset.type}</Badge>
                    <span>{selectedAsset.name}</span>
                    {selectedAsset.priceHistory[0] && (
                      <span className="ml-auto font-medium text-green-500">{formatCurrency(selectedAsset.priceHistory[0].price)}</span>
                    )}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <Input label={t('investments.quantity')} type="number" min="0"
                    step={isCrypto ? '0.00000001' : '1'}
                    value={quantity} onChange={e => setQuantity(e.target.value)}
                    placeholder={isCrypto ? '0.00150000' : '100'} />
                  <Input label={t('investments.averagePrice')} type="number" min="0" step="0.01"
                    value={avgPrice} onChange={e => setAvgPrice(e.target.value)} />
                </div>
                <Input label={t('investments.purchaseDate')} type="date" value={appDate} onChange={e => setAppDate(e.target.value)} />
                <Input label={t('investments.institution')} value={institution} onChange={e => setInstitution(e.target.value)}
                  placeholder="e.g. XP, Clear, Rico, Binance" />
                {/* Summary */}
                {selectedAsset && quantity && avgPrice && (
                  <div className="mt-2 p-3 bg-white dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-700 text-sm">
                    <p className="font-medium text-surface-700 dark:text-surface-300">Summary:</p>
                    <p className="text-surface-500">
                      {isCrypto ? parseFloat(quantity).toFixed(8) : quantity} units of{' '}
                      <span className="font-semibold text-surface-700 dark:text-surface-200">{selectedAsset.ticker}</span>{' '}
                      × {formatCurrency(parseFloat(avgPrice))} ={' '}
                      <span className="font-semibold text-primary-600 dark:text-primary-400">
                        {formatCurrency(parseFloat(quantity) * parseFloat(avgPrice))}
                      </span>
                    </p>
                  </div>
                )}
                {selectedTypeName === 'FII' && (
                  <Input label="Monthly dividends (R$) — optional" type="number" min="0" step="0.01"
                    value="" onChange={() => {}} placeholder="e.g. 50.00" />
                )}
              </div>
            )}

            {/* Savings */}
            {selectedTypeName === 'Savings' && (
              <div className="space-y-3 p-4 rounded-lg bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800/30">
                <p className="text-xs font-semibold text-green-600 dark:text-green-400 uppercase tracking-wide">Savings Account</p>
                <Input label={t('investments.name')} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Savings Itau" required />
                <Input label={t('investments.invested')} type="number" min="0" step="0.01" value={amount}
                  onChange={e => setAmount(e.target.value)} required />
                <Input label={t('investments.applicationDate')} type="date" value={appDate} onChange={e => setAppDate(e.target.value)} />
                <Input label={t('investments.institution')} value={institution} onChange={e => setInstitution(e.target.value)}
                  placeholder="e.g. Itau, Bradesco" />
              </div>
            )}

            {/* Private Pension */}
            {selectedTypeName === 'Private Pension' && (
              <div className="space-y-3 p-4 rounded-lg bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-200 dark:border-indigo-800/30">
                <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">Private Pension</p>
                <Input label={t('investments.name')} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Pension XP" required />
                <Select label={t('investments.type')} value={previdenciaType} onChange={e => setPrevidenciaType(e.target.value)}
                  options={[{ value: 'PGBL', label: 'PGBL' }, { value: 'VGBL', label: 'VGBL' }]} />
                <Input label={t('investments.invested')} type="number" min="0" step="0.01" value={amount}
                  onChange={e => setAmount(e.target.value)} required />
                <Input label={t('investments.applicationDate')} type="date" value={appDate} onChange={e => setAppDate(e.target.value)} />
                <Input label="Monthly contribution (R$) — optional" type="number" min="0" step="0.01"
                  value={monthlyContribution} onChange={e => setMonthlyContribution(e.target.value)} placeholder="e.g. 500" />
                <Input label="Management fee (% a.a.)" type="number" min="0" step="0.01"
                  value={managementFee} onChange={e => setManagementFee(e.target.value)} placeholder="e.g. 1.5" />
                <Input label={t('investments.institution')} value={institution} onChange={e => setInstitution(e.target.value)} />
              </div>
            )}

            {/* Investment Funds */}
            {selectedTypeName === 'Investment Funds' && (
              <div className="space-y-3 p-4 rounded-lg bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-800/30">
                <p className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wide">Investment Fund</p>
                <Input label={t('investments.name')} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. XP Macro Fund" required />
                <Input label={t('investments.invested')} type="number" min="0" step="0.01" value={amount}
                  onChange={e => setAmount(e.target.value)} required />
                <Input label={t('investments.applicationDate')} type="date" value={appDate} onChange={e => setAppDate(e.target.value)} />
                <Input label="Management fee (% a.a.)" type="number" min="0" step="0.01"
                  value={managementFee} onChange={e => setManagementFee(e.target.value)} placeholder="e.g. 2.0" />
                <Input label="Expected yield (% a.a.)" type="number" min="0" step="0.01"
                  value={expectedYield} onChange={e => setExpectedYield(e.target.value)} placeholder="e.g. 12.0" />
                <Input label={t('investments.institution')} value={institution} onChange={e => setInstitution(e.target.value)} />
              </div>
            )}

            {/* COE */}
            {selectedTypeName === 'COE' && (
              <div className="space-y-3 p-4 rounded-lg bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800/30">
                <p className="text-xs font-semibold text-orange-600 dark:text-orange-400 uppercase tracking-wide">COE</p>
                <Input label={t('investments.name')} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. COE S&P500" required />
                <Input label={t('investments.invested')} type="number" min="0" step="0.01" value={amount}
                  onChange={e => setAmount(e.target.value)} required />
                <div className="grid grid-cols-2 gap-3">
                  <Input label={t('investments.applicationDate')} type="date" value={appDate} onChange={e => setAppDate(e.target.value)} />
                  <Input label={t('investments.maturityDate')} type="date" value={matDate} onChange={e => setMatDate(e.target.value)} />
                </div>
                <Input label={t('investments.yieldDesc')} value={yieldStr} onChange={e => setYieldStr(e.target.value)}
                  placeholder={t('investments.yieldPlaceholder')} />
                <Input label={t('investments.institution')} value={institution} onChange={e => setInstitution(e.target.value)} />
              </div>
            )}

            {/* Editing mode - show generic fields if type not covered above */}
            {editing && !isTreasury && !isCdbLciLca && !isVariable &&
              selectedTypeName !== 'Savings' && selectedTypeName !== 'Private Pension' &&
              selectedTypeName !== 'Investment Funds' && selectedTypeName !== 'COE' &&
              selectedTypeName !== 'Debentures' && (
              <div className="space-y-3">
                <Input label={t('investments.name')} value={name} onChange={e => setName(e.target.value)} required />
                <Input label={t('investments.invested')} type="number" min="0" step="0.01" value={amount}
                  onChange={e => setAmount(e.target.value)} required />
                <div className="grid grid-cols-2 gap-4">
                  <Input label={t('investments.applicationDate')} type="date" value={appDate} onChange={e => setAppDate(e.target.value)} />
                  <Input label={t('investments.maturityDate')} type="date" value={matDate} onChange={e => setMatDate(e.target.value)} />
                </div>
                <Input label={t('investments.yieldDesc')} value={yieldStr} onChange={e => setYieldStr(e.target.value)}
                  placeholder={t('investments.yieldPlaceholder')} />
                <Input label={t('investments.institution')} value={institution} onChange={e => setInstitution(e.target.value)} />
              </div>
            )}

            {/* Status (only for editing) */}
            {editing && (
              <Select label={t('investments.status')} value={status} onChange={e => setStatus(e.target.value)}
                options={[{ value: 'ACTIVE', label: t('investments.active') }, { value: 'REDEEMED', label: t('investments.redeemed') }]} />
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
              <Button onClick={handleSave} disabled={!amount || (!name && !selectedAsset)}>{t('common.save')}</Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

/* ── Update Price Modal (Single Asset) ── */
function UpdatePriceModal({ asset, onClose, onSave }: {
  asset: { id: string; ticker: string; lastPrice: number } | null;
  onClose: () => void;
  onSave: (assetId: string, price: number) => void;
}) {
  const { t } = useTranslation();
  const [price, setPrice] = useState('');

  useEffect(() => {
    if (asset) setPrice(asset.lastPrice ? String(asset.lastPrice) : '');
  }, [asset]);

  if (!asset) return null;

  return (
    <Modal open={!!asset} onClose={onClose} title={`${t('common.edit')} — ${asset.ticker}`}>
      <div className="space-y-4">
        <Input label={`${asset.ticker}`} type="number" min="0" step="0.01"
          value={price} onChange={e => setPrice(e.target.value)} placeholder="0.00" required />
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
          <Button onClick={() => { if (price) onSave(asset.id, parseFloat(price)); }} disabled={!price}>{t('common.save')}</Button>
        </div>
      </div>
    </Modal>
  );
}

/* ── Batch Price Update Modal ── */
function BatchPriceModal({ open, assets, onClose, onSave }: {
  open: boolean;
  assets: Array<{ id: string; ticker: string; name: string }>;
  onClose: () => void;
  onSave: (updates: Array<{ assetId: string; price: number }>) => void;
}) {
  const { t } = useTranslation();
  const [prices, setPrices] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      const initial: Record<string, string> = {};
      assets.forEach(a => { initial[a.id] = ''; });
      setPrices(initial);
    }
  }, [open, assets]);

  function handleSave() {
    const updates: Array<{ assetId: string; price: number }> = [];
    for (const [assetId, val] of Object.entries(prices)) {
      const price = parseFloat(val);
      if (!isNaN(price) && price > 0) {
        updates.push({ assetId, price });
      }
    }
    if (updates.length > 0) onSave(updates);
  }

  return (
    <Modal open={open} onClose={onClose} title={t('common.edit')} maxWidth="max-w-lg">
      <div className="space-y-3">
        <p className="text-sm text-surface-500">{t('common.edit')}</p>
        {assets.map(a => (
          <div key={a.id} className="flex items-center gap-3">
            <span className="text-sm font-semibold w-20">{a.ticker}</span>
            <span className="text-xs text-surface-500 flex-1 truncate">{a.name}</span>
            <input type="number" min="0" step="0.01" placeholder="R$"
              value={prices[a.id] || ''} onChange={e => setPrices(p => ({ ...p, [a.id]: e.target.value }))}
              className="w-28 px-3 py-1.5 rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-700 text-sm text-right focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
        ))}
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
          <Button onClick={handleSave}>{t('common.save')}</Button>
        </div>
      </div>
    </Modal>
  );
}

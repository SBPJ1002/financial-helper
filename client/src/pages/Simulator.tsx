import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, Copy, Calculator, LineChart as LineChartIcon } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import EmptyState from '../components/ui/EmptyState';
import { useToast } from '../components/ui/Toast';
import { useScenarioStore, type Scenario } from '../stores/useScenarioStore';
import { formatCurrency } from '../utils/format';
import { currencyFormatter } from '../utils/chartHelpers';
import { simulateInvestment } from '../utils/calculations';
import api from '../services/api';

const DEFAULT_RATES: Record<string, number> = {
  savings: 6.17,
  SELIC: 13.25,
  CDI: 13.15,
  IPCA: 4.5,
};

const LINE_COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4'];

export default function Simulator() {
  const { t } = useTranslation();
  const { scenarios, isLoading, fetchScenarios, createScenario, updateScenario, deleteScenario, duplicateScenario } = useScenarioStore();
  const { toast } = useToast();
  const [referenceRates, setReferenceRates] = useState<Record<string, number>>(DEFAULT_RATES);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingScenario, setEditingScenario] = useState<Scenario | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [compareIds, setCompareIds] = useState<string[]>([]);

  useEffect(() => {
    fetchScenarios();
    api.get('/rates/current').then(({ data }) => {
      const rates: Record<string, number> = { savings: 6.17 };
      for (const [name, info] of Object.entries(data) as [string, { value: number }][]) {
        rates[name] = info.value;
      }
      setReferenceRates(rates);
    }).catch(() => {});
  }, [fetchScenarios]);

  const scenariosToCompare = useMemo(() => {
    if (compareIds.length >= 2) {
      return scenarios.filter(s => compareIds.includes(s.id));
    }
    return scenarios.slice(0, 3);
  }, [scenarios, compareIds]);

  const results = useMemo(() => {
    return scenariosToCompare.map(s => ({
      ...s,
      data: simulateInvestment(s.initialAmount, s.monthlyDeposit, s.annualRate, s.periodMonths, s.interestType === 'COMPOUND' ? 'compound' : 'simple'),
    }));
  }, [scenariosToCompare]);

  const maxPeriod = Math.max(...results.map(r => r.periodMonths), 1);

  const chartData = useMemo(() => {
    const months = Array.from({ length: maxPeriod }, (_, i) => i + 1);
    return months.map(m => {
      const point: Record<string, number> = { month: m };
      results.forEach(r => {
        const row = r.data.find(d => d.month === m);
        if (row) point[r.name] = row.total;
      });
      return point;
    });
  }, [results, maxPeriod]);

  function toggleCompare(id: string) {
    setCompareIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  async function handleDelete() {
    if (deleteId) {
      await deleteScenario(deleteId);
      toast(t('simulator.scenarioDeleted'));
      setDeleteId(null);
    }
  }

  // Empty state
  if (!isLoading && scenarios.length === 0) {
    return (
      <div className="animate-fade-in">
        <h1 className="text-2xl font-bold mb-6">{t('simulator.title')}</h1>
        <EmptyState
          icon={Calculator}
          title={t('simulator.noScenarios')}
          description={t('simulator.noScenarios')}
          actionLabel={`+ ${t('simulator.save')}`}
          onAction={() => setShowCreateModal(true)}
        />
        <ScenarioFormModal
          open={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          referenceRates={referenceRates}
          onSave={async (data) => {
            await createScenario(data);
            toast(t('simulator.scenarioSaved'));
            setShowCreateModal(false);
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">{t('simulator.title')}</h1>
        <Button size="sm" onClick={() => { setEditingScenario(null); setShowCreateModal(true); }}>
          <Plus className="h-4 w-4" /> {t('simulator.save')}
        </Button>
      </div>

      {/* Reference Rates */}
      <Card>
        <h3 className="text-sm font-semibold mb-3">{t('simulator.referenceIndex')}</h3>
        <div className="flex flex-wrap gap-2">
          {Object.entries(referenceRates).map(([key, rate]) => (
            <span key={key} className="px-3 py-1.5 rounded-lg text-xs font-medium border border-surface-300 dark:border-surface-600 text-surface-500">
              {key.toUpperCase()}: {rate}% p.a.
            </span>
          ))}
        </div>
      </Card>

      {/* Scenario Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {scenarios.map((s) => {
          const isComparing = compareIds.includes(s.id);
          return (
            <Card key={s.id} className={isComparing ? '!border-primary-500' : ''}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold truncate">{s.name}</h3>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => { setEditingScenario(s); setShowCreateModal(true); }}
                    className="p-1.5 rounded text-surface-400 hover:text-primary-500 hover:bg-surface-100 dark:hover:bg-surface-700"
                    title={t('common.edit')}>
                    <LineChartIcon className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => duplicateScenario(s.id).then(() => toast(t('simulator.scenarioSaved')))}
                    className="p-1.5 rounded text-surface-400 hover:text-accent-500 hover:bg-surface-100 dark:hover:bg-surface-700"
                    title={t('simulator.compare')}>
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => setDeleteId(s.id)}
                    className="p-1.5 rounded text-surface-400 hover:text-red-500 hover:bg-surface-100 dark:hover:bg-surface-700"
                    title={t('common.delete')}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between"><span className="text-surface-500">{t('simulator.initialAmount')}</span><span>{formatCurrency(s.initialAmount)}</span></div>
                <div className="flex justify-between"><span className="text-surface-500">{t('simulator.monthlyDeposit')}</span><span>{formatCurrency(s.monthlyDeposit)}</span></div>
                <div className="flex justify-between"><span className="text-surface-500">{t('simulator.annualRate')}</span><span>{s.annualRate}% p.a.</span></div>
                <div className="flex justify-between"><span className="text-surface-500">{t('simulator.period')}</span><span>{s.periodMonths} {t('simulator.month')}</span></div>
                <div className="flex justify-between"><span className="text-surface-500">{t('simulator.interestType')}</span><span>{s.interestType}</span></div>
              </div>

              {s.totalAmount && (
                <div className="mt-3 pt-3 border-t border-surface-200 dark:border-surface-700 space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-surface-500">{t('simulator.total')}</span>
                    <span className="font-bold text-green-600 dark:text-green-400">{formatCurrency(s.totalAmount)}</span>
                  </div>
                  {s.totalYield !== null && (
                    <div className="flex justify-between">
                      <span className="text-surface-500">{t('simulator.yield')}</span>
                      <span className="font-medium text-accent-500">{formatCurrency(s.totalYield)}</span>
                    </div>
                  )}
                </div>
              )}

              {scenarios.length > 1 && (
                <button
                  onClick={() => toggleCompare(s.id)}
                  className={`mt-3 w-full text-xs py-1.5 rounded-lg border transition-colors ${
                    isComparing
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                      : 'border-surface-300 dark:border-surface-600 text-surface-500 hover:border-primary-400'
                  }`}
                >
                  {isComparing ? t('simulator.compare') : t('simulator.compare')}
                </button>
              )}
            </Card>
          );
        })}
      </div>

      {/* Chart */}
      {results.length > 0 && (
        <Card>
          <h2 className="text-lg font-semibold mb-4">{t('simulator.monthlyEvolution')}</h2>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-surface-200 dark:stroke-surface-700" />
              <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 11 }} label={{ value: t('simulator.month'), position: 'bottom', fill: '#94a3b8' }} />
              <YAxis tick={{ fill: '#94a3b8' }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={currencyFormatter} />
              <Legend />
              {results.map((r, i) => (
                <Line key={r.id} type="monotone" dataKey={r.name}
                  stroke={LINE_COLORS[i % LINE_COLORS.length]} strokeWidth={2} dot={false} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </Card>
      )}

      <ScenarioFormModal
        open={showCreateModal}
        onClose={() => { setShowCreateModal(false); setEditingScenario(null); }}
        editing={editingScenario}
        referenceRates={referenceRates}
        onSave={async (data) => {
          if (editingScenario) {
            await updateScenario(editingScenario.id, data);
            toast(t('simulator.scenarioSaved'));
          } else {
            await createScenario(data);
            toast(t('simulator.scenarioSaved'));
          }
          setShowCreateModal(false);
          setEditingScenario(null);
        }}
      />

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete}
        title={t('common.delete')} message={t('simulator.scenarioDeleted')} confirmLabel={t('common.delete')} />
    </div>
  );
}

function ScenarioFormModal({ open, onClose, editing, referenceRates, onSave }: {
  open: boolean;
  onClose: () => void;
  editing?: Scenario | null;
  referenceRates: Record<string, number>;
  onSave: (data: {
    name: string; initialAmount: number; monthlyDeposit: number;
    annualRate: number; periodMonths: number; interestType: string; referenceIndex: string | null;
  }) => void;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [initial, setInitial] = useState('10000');
  const [monthly, setMonthly] = useState('500');
  const [rate, setRate] = useState('13.15');
  const [period, setPeriod] = useState('60');
  const [periodUnit, setPeriodUnit] = useState<'months' | 'years'>('months');
  const [interestType, setInterestType] = useState('COMPOUND');
  const [refIndex, setRefIndex] = useState('CDI');

  useMemo(() => {
    if (open) {
      setName(editing?.name || '');
      setInitial(editing ? String(editing.initialAmount) : '10000');
      setMonthly(editing ? String(editing.monthlyDeposit) : '500');
      setRate(editing ? String(editing.annualRate) : String(referenceRates.CDI || 13.15));
      setPeriod(editing ? String(editing.periodMonths) : '60');
      setInterestType(editing?.interestType || 'COMPOUND');
      setRefIndex(editing?.referenceIndex || 'CDI');
    }
  }, [open, editing, referenceRates]);

  function applyRate(key: string) {
    setRefIndex(key);
    setRate(String(referenceRates[key] || 10));
  }

  const periodMonths = periodUnit === 'years' ? (parseInt(period) || 1) * 12 : parseInt(period) || 1;

  return (
    <Modal open={open} onClose={onClose} title={editing ? t('common.edit') : t('simulator.save')} maxWidth="max-w-lg">
      <div className="space-y-4">
        <Input label={t('simulator.scenarioName')} value={name} onChange={e => setName(e.target.value)}
          placeholder="e.g. Tesouro Selic agressivo" required />

        {/* Rate shortcuts */}
        <div>
          <label className="text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5 block">{t('simulator.referenceIndex')}</label>
          <div className="flex flex-wrap gap-2">
            {Object.entries(referenceRates).map(([key, val]) => (
              <button key={key} onClick={() => applyRate(key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors
                  ${refIndex === key ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400' : 'border-surface-300 dark:border-surface-600 text-surface-500 hover:border-primary-400'}`}>
                {key.toUpperCase()}: {val}%
              </button>
            ))}
          </div>
        </div>

        <Input label={t('simulator.initialAmount')} type="number" min="0" step="100" value={initial}
          onChange={e => setInitial(e.target.value)} />
        <Input label={t('simulator.monthlyDeposit')} type="number" min="0" step="50" value={monthly}
          onChange={e => setMonthly(e.target.value)} />
        <Input label={t('simulator.annualRate')} type="number" min="0" step="0.1" value={rate}
          onChange={e => setRate(e.target.value)} />

        <div className="flex gap-2">
          <div className="flex-1">
            <Input label={t('simulator.period')} type="number" min="1"
              value={period} onChange={e => setPeriod(e.target.value)} />
          </div>
          <div className="pt-6">
            <button onClick={() => setPeriodUnit(p => p === 'months' ? 'years' : 'months')}
              className="px-3 py-2 text-xs rounded-lg border border-surface-300 dark:border-surface-600 text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-700">
              {periodUnit === 'months' ? 'M→Y' : 'Y→M'}
            </button>
          </div>
        </div>

        <Select label={t('simulator.interestType')} value={interestType}
          onChange={e => setInterestType(e.target.value)}
          options={[{ value: 'COMPOUND', label: t('simulator.compound') }, { value: 'SIMPLE', label: t('simulator.simple') }]} />

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
          <Button onClick={() => {
            if (!name.trim()) return;
            onSave({
              name: name.trim(),
              initialAmount: parseFloat(initial) || 0,
              monthlyDeposit: parseFloat(monthly) || 0,
              annualRate: parseFloat(rate) || 0,
              periodMonths,
              interestType,
              referenceIndex: refIndex,
            });
          }} disabled={!name.trim()}>{t('common.save')}</Button>
        </div>
      </div>
    </Modal>
  );
}

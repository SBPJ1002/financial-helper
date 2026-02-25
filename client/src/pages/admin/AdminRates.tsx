import { useEffect, useState } from 'react';
import { RefreshCw, TrendingUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { useToast } from '../../components/ui/Toast';
import api from '../../services/api';

interface RateData {
  value: number;
  date: string;
}

export default function AdminRates() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [rates, setRates] = useState<Record<string, RateData>>({});
  const [refreshing, setRefreshing] = useState(false);

  async function fetchRates() {
    const { data } = await api.get('/rates/current');
    setRates(data);
  }

  useEffect(() => {
    fetchRates();
  }, []);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await api.post('/admin/rates/refresh');
      await fetchRates();
      toast(t('admin.ratesRefreshed'));
    } catch {
      toast(t('admin.refreshFailed'), 'error');
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <TrendingUp className="h-6 w-6 text-green-500" /> {t('admin.rates')}
        </h1>
        <Button onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? t('admin.refreshing') : t('admin.refreshFromBCB')}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Object.entries(rates).map(([name, data]) => (
          <Card key={name}>
            <div className="text-center">
              <p className="text-sm text-surface-500 mb-1">{name}</p>
              <p className="text-3xl font-bold text-primary-600 dark:text-primary-400">{data.value}%</p>
              <p className="text-xs text-surface-400 mt-2">{t('admin.lastUpdated', { date: data.date })}</p>
            </div>
          </Card>
        ))}
      </div>

      {Object.keys(rates).length === 0 && (
        <Card>
          <div className="text-center py-8 text-surface-500">
            <p>{t('admin.noRates')}</p>
          </div>
        </Card>
      )}
    </div>
  );
}

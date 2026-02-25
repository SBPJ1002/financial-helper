import { useEffect, useState } from 'react';
import { FileText } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Select from '../../components/ui/Select';
import api from '../../services/api';

interface LogEntry {
  id: string;
  key: string;
  value: string;
  metadata: string | null;
  createdAt: string;
}

interface LogsResponse {
  logs: LogEntry[];
  total: number;
  page: number;
  pages: number;
}

export default function AdminLogs() {
  const { t } = useTranslation();

  const LOG_TYPES = [
    { value: '', label: t('admin.filterAll') },
    { value: 'bcb_rate_fetch', label: t('admin.rateFetches') },
    { value: 'snapshot_creation', label: t('admin.snapshots') },
    { value: 'chat_message', label: t('admin.chatMessages') },
  ];

  const [data, setData] = useState<LogsResponse | null>(null);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    const params: Record<string, string | number> = { page };
    if (filter) params.key = filter;
    api.get('/admin/logs', { params }).then(({ data }) => setData(data));
  }, [page, filter]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <FileText className="h-6 w-6 text-purple-500" /> {t('admin.logs')}
        </h1>
        <div className="w-48">
          <Select value={filter} onChange={(e) => { setFilter(e.target.value); setPage(1); }} options={LOG_TYPES} />
        </div>
      </div>

      <Card>
        {data && data.logs.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-200 dark:border-surface-700 text-left text-xs text-surface-500 uppercase">
                    <th className="px-4 py-2">{t('admin.key')}</th>
                    <th className="px-4 py-2">{t('admin.value')}</th>
                    <th className="px-4 py-2">{t('admin.metadata')}</th>
                    <th className="px-4 py-2">{t('admin.date')}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.logs.map(log => (
                    <tr key={log.id} className="border-b border-surface-100 dark:border-surface-700/50">
                      <td className="px-4 py-2 font-medium">{log.key}</td>
                      <td className="px-4 py-2 text-surface-500 max-w-[200px] truncate">{log.value}</td>
                      <td className="px-4 py-2 text-xs text-surface-400 max-w-[300px] truncate">{log.metadata || '-'}</td>
                      <td className="px-4 py-2 text-surface-400 whitespace-nowrap">{new Date(log.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {data.pages > 1 && (
              <div className="flex justify-center gap-2 mt-4">
                <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                  {t('admin.previous')}
                </Button>
                <span className="flex items-center text-sm text-surface-500">
                  {t('admin.pageOfTotal', { page: data.page, pages: data.pages, total: data.total })}
                </span>
                <Button variant="secondary" size="sm" disabled={page >= data.pages} onClick={() => setPage(p => p + 1)}>
                  {t('admin.next')}
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-8 text-surface-500">
            {data ? t('admin.noLogs') : t('common.loading')}
          </div>
        )}
      </Card>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Users, BarChart3, Activity, FileText } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Card from '../../components/ui/Card';
import StatCard from '../../components/ui/StatCard';
import api from '../../services/api';

interface Metrics {
  users: { total: number; active: number };
  data: { incomes: number; expenses: number; investments: number; chatMessages: number };
  activity: { sessionsLast7Days: number; messagesLast7Days: number };
  recentMetrics: Array<{ id: string; key: string; value: string; createdAt: string }>;
}

export default function AdminDashboard() {
  const { t } = useTranslation();
  const [metrics, setMetrics] = useState<Metrics | null>(null);

  useEffect(() => {
    api.get('/admin/metrics').then(({ data }) => setMetrics(data));
  }, []);

  if (!metrics) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold flex items-center gap-3">
        <Shield className="h-6 w-6 text-amber-500" /> {t('admin.dashboard')}
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label={t('admin.totalUsers')} value={String(metrics.users.total)} color="text-blue-500" />
        <StatCard icon={Users} label={t('admin.activeUsers')} value={String(metrics.users.active)} color="text-green-500" />
        <StatCard icon={Activity} label={t('admin.sessions7d')} value={String(metrics.activity.sessionsLast7Days)} color="text-purple-500" />
        <StatCard icon={BarChart3} label={t('admin.messages7d')} value={String(metrics.activity.messagesLast7Days)} color="text-amber-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h2 className="text-lg font-semibold mb-4">{t('admin.dataOverview')}</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-surface-500">{t('admin.incomes')}</span>
              <span className="font-medium">{metrics.data.incomes}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-surface-500">{t('admin.expenses')}</span>
              <span className="font-medium">{metrics.data.expenses}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-surface-500">{t('admin.investments')}</span>
              <span className="font-medium">{metrics.data.investments}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-surface-500">{t('admin.chatMessages')}</span>
              <span className="font-medium">{metrics.data.chatMessages}</span>
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold mb-4">{t('admin.quickLinks')}</h2>
          <div className="space-y-2">
            <Link to="/admin/users"
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-surface-50 dark:hover:bg-surface-700/50 transition-colors">
              <Users className="h-5 w-5 text-blue-500" />
              <span className="text-sm font-medium">{t('admin.userManagement')}</span>
            </Link>
            <Link to="/admin/rates"
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-surface-50 dark:hover:bg-surface-700/50 transition-colors">
              <BarChart3 className="h-5 w-5 text-green-500" />
              <span className="text-sm font-medium">{t('admin.economicRates')}</span>
            </Link>
            <Link to="/admin/logs"
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-surface-50 dark:hover:bg-surface-700/50 transition-colors">
              <FileText className="h-5 w-5 text-purple-500" />
              <span className="text-sm font-medium">{t('admin.systemLogs')}</span>
            </Link>
          </div>
        </Card>
      </div>

      {/* Recent metrics */}
      {metrics.recentMetrics.length > 0 && (
        <Card>
          <h2 className="text-lg font-semibold mb-4">{t('admin.recentEvents')}</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-200 dark:border-surface-700 text-left text-xs text-surface-500 uppercase">
                  <th className="px-4 py-2">{t('admin.key')}</th>
                  <th className="px-4 py-2">{t('admin.value')}</th>
                  <th className="px-4 py-2">{t('admin.date')}</th>
                </tr>
              </thead>
              <tbody>
                {metrics.recentMetrics.map(m => (
                  <tr key={m.id} className="border-b border-surface-100 dark:border-surface-700/50">
                    <td className="px-4 py-2 font-medium">{m.key}</td>
                    <td className="px-4 py-2 text-surface-500">{m.value}</td>
                    <td className="px-4 py-2 text-surface-400">{new Date(m.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

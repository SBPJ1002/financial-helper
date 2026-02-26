import { useEffect, useState } from 'react';
import { Shield, ToggleLeft, ToggleRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { useToast } from '../../components/ui/Toast';
import api from '../../services/api';

interface UserRow {
  id: string;
  fullName: string;
  email: string;
  role: 'USER' | 'ADMIN';
  isActive: boolean;
  createdAt: string;
  _count: { incomes: number; expenses: number; chatMessages: number };
}

interface UsersResponse {
  users: UserRow[];
  total: number;
  page: number;
  pages: number;
}

export default function AdminUsers() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [data, setData] = useState<UsersResponse | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    api.get('/admin/users', { params: { page } }).then(({ data }) => setData(data));
  }, [page]);

  async function toggleActive(userId: string, isActive: boolean) {
    await api.patch(`/admin/users/${userId}`, { isActive: !isActive });
    toast(isActive ? t('admin.userDeactivated') : t('admin.userActivated'));
    const { data } = await api.get('/admin/users', { params: { page } });
    setData(data);
  }

  async function toggleRole(userId: string, currentRole: string) {
    const newRole = currentRole === 'ADMIN' ? 'USER' : 'ADMIN';
    await api.patch(`/admin/users/${userId}`, { role: newRole });
    toast(t('admin.roleChangedTo', { role: newRole }));
    const { data } = await api.get('/admin/users', { params: { page } });
    setData(data);
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold flex items-center gap-3">
        <Shield className="h-6 w-6 text-amber-500" /> {t('admin.userManagement')}
      </h1>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-200 dark:border-surface-700 text-left text-xs text-surface-500 uppercase">
                <th className="px-4 py-2">{t('admin.name')}</th>
                <th className="px-4 py-2">{t('admin.email')}</th>
                <th className="px-4 py-2">{t('admin.role')}</th>
                <th className="px-4 py-2">{t('admin.status')}</th>
                <th className="px-4 py-2">{t('admin.data')}</th>
                <th className="px-4 py-2">{t('admin.joined')}</th>
                <th className="px-4 py-2">{t('admin.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {data.users.map(user => (
                <tr key={user.id} className="border-b border-surface-100 dark:border-surface-700/50">
                  <td className="px-4 py-3 font-medium">{user.fullName}</td>
                  <td className="px-4 py-3 text-surface-500">{user.email}</td>
                  <td className="px-4 py-3">
                    <Badge variant={user.role === 'ADMIN' ? 'warning' : 'default'}>
                      {user.role}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={user.isActive ? 'success' : 'danger'}>
                      {user.isActive ? t('admin.active') : t('admin.inactive')}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-surface-400">
                    {user._count.incomes}i / {user._count.expenses}e / {user._count.chatMessages}msg
                  </td>
                  <td className="px-4 py-3 text-surface-400">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => toggleActive(user.id, user.isActive)}
                        title={user.isActive ? t('admin.deactivate') : t('admin.activate')}>
                        {user.isActive ? <ToggleRight className="h-4 w-4 text-green-500" /> : <ToggleLeft className="h-4 w-4 text-surface-400" />}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => toggleRole(user.id, user.role)}
                        title={t('admin.changeTo', { role: user.role === 'ADMIN' ? 'USER' : 'ADMIN' })}>
                        <Shield className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
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
              {t('admin.pageOf', { page: data.page, pages: data.pages })}
            </span>
            <Button variant="secondary" size="sm" disabled={page >= data.pages} onClick={() => setPage(p => p + 1)}>
              {t('admin.next')}
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}

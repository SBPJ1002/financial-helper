import { NavLink, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard, Wallet, TrendingUp, PiggyBank, Calculator,
  Bot, Settings, Menu, X, Sun, Moon, DollarSign, LogOut, Shield, Landmark,
  Bell, CheckCheck, AlertTriangle, FileText, Clock,
} from 'lucide-react';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { useBankingStore } from '../../stores/useBankingStore';
import { useNotificationStore } from '../../stores/useNotificationStore';

const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, labelKey: 'sidebar.dashboard' },
  { to: '/expenses', icon: Wallet, labelKey: 'sidebar.expenses' },
  { to: '/evolution', icon: TrendingUp, labelKey: 'sidebar.evolution' },
  { to: '/investments', icon: PiggyBank, labelKey: 'sidebar.investments' },
  { to: '/simulator', icon: Calculator, labelKey: 'sidebar.simulator' },
  { to: '/assistant', icon: Bot, labelKey: 'sidebar.assistant' },
  { to: '/settings', icon: Settings, labelKey: 'sidebar.settings' },
];

const NOTIF_ICONS: Record<string, typeof Bell> = {
  BILL_DUE: Clock,
  EXPENSE_ABOVE: AlertTriangle,
  VARIABLE_AMOUNT_NEEDED: FileText,
  CONTRACT_ENDING: DollarSign,
};

export default function Sidebar() {
  const { t } = useTranslation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const { theme, toggleTheme } = useSettingsStore();
  const { user, logout } = useAuthStore();
  const { isAvailable: bankingAvailable, checkAvailability } = useBankingStore();
  const { notifications, unreadCount, fetchNotifications, fetchUnreadCount, markAsRead, markAllAsRead } = useNotificationStore();
  const navigate = useNavigate();

  useEffect(() => {
    checkAvailability();
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [checkAvailability, fetchUnreadCount]);

  useEffect(() => {
    if (notifOpen) fetchNotifications();
  }, [notifOpen, fetchNotifications]);

  // Close notification panel on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }
    if (notifOpen) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [notifOpen]);

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  const navContent = (
    <>
      <div className="flex items-center gap-3 px-4 py-5 border-b border-surface-200 dark:border-surface-700">
        <div className="w-9 h-9 rounded-lg bg-primary-600 flex items-center justify-center">
          <DollarSign className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-base font-bold text-surface-900 dark:text-white">{t('sidebar.finhelper')}</h1>
          <p className="text-xs text-surface-500 dark:text-surface-400">{t('sidebar.financialOrganizer')}</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/dashboard'}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
              ${isActive
                ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                : 'text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-700/50'
              }`
            }
          >
            <item.icon className="h-5 w-5 shrink-0" />
            {t(item.labelKey)}
          </NavLink>
        ))}

        {bankingAvailable && (
          <NavLink
            to="/banking"
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
              ${isActive
                ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                : 'text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-700/50'
              }`
            }
          >
            <Landmark className="h-5 w-5 shrink-0" />
            {t('sidebar.banking')}
          </NavLink>
        )}

        {user?.role === 'ADMIN' && (
          <NavLink
            to="/admin"
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors mt-2 border-t border-surface-200 dark:border-surface-700 pt-3
              ${isActive
                ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400'
                : 'text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-700/50'
              }`
            }
          >
            <Shield className="h-5 w-5 shrink-0" />
            {t('sidebar.adminPanel')}
          </NavLink>
        )}
      </nav>

      <div className="px-3 py-4 border-t border-surface-200 dark:border-surface-700 space-y-1">
        {user && (
          <div className="px-3 py-2 mb-1">
            <p className="text-sm font-medium text-surface-900 dark:text-white truncate">{user.fullName}</p>
            <p className="text-xs text-surface-500 truncate">{user.email}</p>
          </div>
        )}

        {/* Notification Bell */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setNotifOpen(o => !o)}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium
              text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-700/50 transition-colors"
          >
            <div className="relative">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] flex items-center justify-center
                  rounded-full bg-red-500 text-white text-[10px] font-bold px-1">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </div>
            {t('sidebar.notifications')}
          </button>

          {notifOpen && (
            <div className="absolute bottom-full left-0 mb-2 w-72 max-h-80 overflow-y-auto
              bg-white dark:bg-surface-800 rounded-xl shadow-xl border border-surface-200 dark:border-surface-700 z-50">
              <div className="flex items-center justify-between p-3 border-b border-surface-200 dark:border-surface-700">
                <span className="text-sm font-semibold">{t('sidebar.notifications')}</span>
                {unreadCount > 0 && (
                  <button
                    onClick={() => markAllAsRead()}
                    className="text-xs text-primary-500 hover:text-primary-600 flex items-center gap-1"
                  >
                    <CheckCheck className="h-3.5 w-3.5" /> {t('sidebar.markAllRead')}
                  </button>
                )}
              </div>
              {notifications.length === 0 ? (
                <p className="text-sm text-surface-400 text-center py-6">{t('sidebar.noNotifications')}</p>
              ) : (
                <div className="divide-y divide-surface-100 dark:divide-surface-700">
                  {notifications.map(n => {
                    const Icon = NOTIF_ICONS[n.type] || Bell;
                    return (
                      <button key={n.id}
                        onClick={() => { if (!n.read) markAsRead(n.id); }}
                        className={`w-full text-left p-3 hover:bg-surface-50 dark:hover:bg-surface-700/50 transition-colors
                          ${!n.read ? 'bg-primary-50/50 dark:bg-primary-900/10' : ''}`}>
                        <div className="flex gap-2.5">
                          <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${!n.read ? 'text-primary-500' : 'text-surface-400'}`} />
                          <div className="min-w-0">
                            <p className={`text-sm ${!n.read ? 'font-semibold' : 'font-medium text-surface-600 dark:text-surface-300'}`}>
                              {n.title}
                            </p>
                            <p className="text-xs text-surface-400 mt-0.5 line-clamp-2">{n.message}</p>
                            <p className="text-[10px] text-surface-300 mt-1">
                              {new Date(n.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        <button
          onClick={toggleTheme}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium
            text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-700/50 transition-colors"
        >
          {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          {theme === 'dark' ? t('sidebar.lightMode') : t('sidebar.darkMode')}
        </button>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium
            text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
        >
          <LogOut className="h-5 w-5" />
          {t('sidebar.logout')}
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-40 p-2 rounded-lg bg-white dark:bg-surface-800 shadow-md border border-surface-200 dark:border-surface-700 lg:hidden"
        aria-label={t('sidebar.openMenu')}
      >
        <Menu className="h-5 w-5 text-surface-600 dark:text-surface-300" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Mobile sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-surface-800 border-r border-surface-200 dark:border-surface-700
        flex flex-col transform transition-transform lg:hidden
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700 text-surface-500"
          aria-label={t('sidebar.closeMenu')}
        >
          <X className="h-5 w-5" />
        </button>
        {navContent}
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 lg:w-64
        bg-white dark:bg-surface-800 border-r border-surface-200 dark:border-surface-700">
        {navContent}
      </aside>
    </>
  );
}

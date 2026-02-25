import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ToastProvider } from './components/ui/Toast';
import AppLayout from './components/layout/AppLayout';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import Expenses from './pages/Expenses';
import Evolution from './pages/Evolution';
import Investments from './pages/Investments';
import Simulator from './pages/Simulator';
import Assistant from './pages/Assistant';
import SettingsPage from './pages/SettingsPage';
import Login from './pages/Login';
import Register from './pages/Register';
import Banking from './pages/Banking';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import AdminRates from './pages/admin/AdminRates';
import AdminLogs from './pages/admin/AdminLogs';
import { useSettingsStore } from './stores/useSettingsStore';
import { useAuthStore } from './stores/useAuthStore';
import { useUserSettingsStore } from './stores/useUserSettingsStore';
import { RTL_LANGUAGES } from './i18n';

export default function App() {
  const theme = useSettingsStore((s) => s.theme);
  const initialize = useAuthStore((s) => s.initialize);
  const language = useUserSettingsStore((s) => s.settings?.language);
  const { i18n } = useTranslation();

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (language && language !== i18n.language) {
      i18n.changeLanguage(language);
    }
    const isRtl = RTL_LANGUAGES.includes(language || '');
    document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
  }, [language, i18n]);

  return (
    <BrowserRouter>
      <ToastProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/expenses" element={<Expenses />} />
              <Route path="/evolution" element={<Evolution />} />
              <Route path="/investments" element={<Investments />} />
              <Route path="/simulator" element={<Simulator />} />
              <Route path="/assistant" element={<Assistant />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/banking" element={<Banking />} />

              {/* Admin routes */}
              <Route element={<AdminRoute />}>
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/users" element={<AdminUsers />} />
                <Route path="/admin/rates" element={<AdminRates />} />
                <Route path="/admin/logs" element={<AdminLogs />} />
              </Route>
            </Route>
          </Route>
        </Routes>
      </ToastProvider>
    </BrowserRouter>
  );
}

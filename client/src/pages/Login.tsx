import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { DollarSign, Mail, Lock, LogIn } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card from '../components/ui/Card';
import { useAuthStore } from '../stores/useAuthStore';

export default function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { login, isLoading } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await login(email, password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const message = (err as { response?: { data?: { error?: string } } }).response?.data?.error
        || t('auth.loginFailed');
      setError(message);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-50 dark:bg-surface-900 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-primary-600 flex items-center justify-center mx-auto mb-4">
            <DollarSign className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-white">{t('auth.loginTitle')}</h1>
          <p className="text-sm text-surface-500 mt-1">{t('auth.signInToApp')}</p>
        </div>

        <Card>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
                {error}
              </div>
            )}
            <Input
              label={t('auth.email')}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('auth.emailPlaceholder')}
              required
              icon={<Mail className="h-4 w-4" />}
            />
            <Input
              label={t('auth.password')}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('auth.passwordPlaceholder')}
              required
              icon={<Lock className="h-4 w-4" />}
            />
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? t('auth.loggingIn') : <><LogIn className="h-4 w-4" /> {t('auth.loginButton')}</>}
            </Button>
          </form>

          <p className="text-center text-sm text-surface-500 mt-4">
            {t('auth.noAccount')}{' '}
            <Link to="/register" className="text-primary-500 hover:underline font-medium">
              {t('auth.signUp')}
            </Link>
          </p>
        </Card>

      </div>
    </div>
  );
}

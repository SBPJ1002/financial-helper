import { Link } from 'react-router-dom';
import { DollarSign } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function LandingFooter() {
  const { t } = useTranslation();

  const PLATFORM_LINKS = [
    { label: t('landing.footerDashboard'), to: '/register' },
    { label: t('landing.footerExpenses'), to: '/register' },
    { label: t('landing.footerAiAssistant'), to: '/register' },
  ];

  const RESOURCE_LINKS = [
    { label: t('landing.footerSecurity'), href: '#security' },
    { label: t('landing.footerBcbApi'), href: '#features' },
    { label: t('landing.footerExportData'), href: '#features' },
  ];

  const ACCOUNT_LINKS = [
    { label: t('landing.footerCreateAccount'), to: '/register' },
    { label: t('landing.footerLogin'), to: '/login' },
  ];

  function handleAnchorClick(e: React.MouseEvent<HTMLAnchorElement>, href: string) {
    e.preventDefault();
    document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' });
  }

  return (
    <footer className="border-t border-surface-700/50 bg-surface-900/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary-500 to-accent-600 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-white" />
              </div>
              <span className="text-lg font-bold text-white">FinHelper</span>
            </div>
            <p className="text-sm text-surface-400 leading-relaxed">
              {t('landing.platformDesc')}
            </p>
          </div>

          {/* Platform */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-4">{t('landing.platform')}</h4>
            <ul className="space-y-2.5">
              {PLATFORM_LINKS.map(link => (
                <li key={link.label}>
                  <Link to={link.to} className="text-sm text-surface-400 hover:text-white transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-4">{t('landing.resources')}</h4>
            <ul className="space-y-2.5">
              {RESOURCE_LINKS.map(link => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    onClick={(e) => handleAnchorClick(e, link.href)}
                    className="text-sm text-surface-400 hover:text-white transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Account */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-4">{t('landing.account')}</h4>
            <ul className="space-y-2.5">
              {ACCOUNT_LINKS.map(link => (
                <li key={link.label}>
                  <Link to={link.to} className="text-sm text-surface-400 hover:text-white transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-12 pt-8 border-t border-surface-700/50 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-surface-500">
            &copy; {new Date().getFullYear()} {t('landing.footer')}
          </p>
        </div>
      </div>
    </footer>
  );
}

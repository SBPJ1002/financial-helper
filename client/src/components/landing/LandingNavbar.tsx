import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { DollarSign, Menu, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function LandingNavbar() {
  const { t } = useTranslation();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const NAV_LINKS = [
    { href: '#features', label: t('landing.navFeatures') },
    { href: '#how-it-works', label: t('landing.navHowItWorks') },
    { href: '#investments', label: t('landing.navInvestments') },
    { href: '#ai-assistant', label: t('landing.navAiAssistant') },
    { href: '#security', label: t('landing.navSecurity') },
  ];

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 20);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  function handleNavClick(e: React.MouseEvent<HTMLAnchorElement>, href: string) {
    e.preventDefault();
    setMobileOpen(false);
    const el = document.querySelector(href);
    el?.scrollIntoView({ behavior: 'smooth' });
  }

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300
        ${scrolled
          ? 'bg-surface-900/80 backdrop-blur-xl border-b border-surface-700/50 shadow-lg'
          : 'bg-transparent'
        }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <a href="#" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary-500 to-accent-600 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold text-white">FinHelper</span>
          </a>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map(link => (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => handleNavClick(e, link.href)}
                className="px-3 py-2 text-sm font-medium text-surface-300 hover:text-white transition-colors rounded-lg hover:bg-white/5"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Desktop buttons */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              to="/login"
              className="px-4 py-2 text-sm font-medium text-surface-300 hover:text-white transition-colors rounded-lg border border-surface-600 hover:border-surface-500"
            >
              {t('landing.login')}
            </Link>
            <Link
              to="/register"
              className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-primary-600 to-accent-600 hover:from-primary-500 hover:to-accent-500 rounded-lg transition-all shadow-lg shadow-primary-500/25"
            >
              {t('landing.createFreeAccount')}
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(true)}
            className="md:hidden p-2 text-surface-300 hover:text-white"
            aria-label={t('landing.openMenu')}
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Mobile drawer */}
      <aside
        className={`fixed inset-y-0 right-0 z-50 w-72 bg-surface-900 border-l border-surface-700 transform transition-transform duration-300 md:hidden
          ${mobileOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex items-center justify-between p-4 border-b border-surface-700">
          <span className="text-lg font-bold text-white">{t('landing.menu')}</span>
          <button onClick={() => setMobileOpen(false)} className="p-2 text-surface-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex flex-col p-4 gap-1">
          {NAV_LINKS.map(link => (
            <a
              key={link.href}
              href={link.href}
              onClick={(e) => handleNavClick(e, link.href)}
              className="px-4 py-3 text-sm font-medium text-surface-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
            >
              {link.label}
            </a>
          ))}
          <div className="border-t border-surface-700 mt-4 pt-4 space-y-2">
            <Link
              to="/login"
              className="block px-4 py-3 text-sm font-medium text-surface-300 hover:text-white rounded-lg border border-surface-600 text-center"
            >
              {t('landing.login')}
            </Link>
            <Link
              to="/register"
              className="block px-4 py-3 text-sm font-medium text-white bg-gradient-to-r from-primary-600 to-accent-600 rounded-lg text-center"
            >
              {t('landing.createFreeAccount')}
            </Link>
          </div>
        </nav>
      </aside>
    </header>
  );
}

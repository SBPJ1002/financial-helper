import { Check, TrendingUp, BarChart3 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import ScrollReveal from './ScrollReveal';
import { usePublicRates } from '../../hooks/usePublicRates';

const FIXED_INCOME = [
  { type: 'Treasury Selic', yield: 'Current SELIC rate', auto: true },
  { type: 'Treasury IPCA+', yield: 'IPCA + spread', auto: true },
  { type: 'Treasury Prefixed', yield: 'Fixed rate', auto: true },
  { type: 'CDB', yield: '% of CDI', auto: true },
  { type: 'LCI / LCA', yield: '% of CDI (tax-exempt)', auto: true },
  { type: 'Savings', yield: 'BCB rule', auto: true },
];

const VARIABLE_INCOME = [
  { type: 'Stocks', update: 'Manual / Quote' },
  { type: 'Real Estate Funds (FIIs)', update: 'Manual / Quote' },
  { type: 'ETFs / BDRs', update: 'Manual / Quote' },
  { type: 'Crypto', update: 'Manual' },
];

export default function InvestmentsShowcase() {
  const { t } = useTranslation();
  const { rates, isLoading, error } = usePublicRates();

  const selicStr = rates?.selic ? `${rates.selic.value.toFixed(2)}%` : '—';
  const cdiStr = rates?.cdi ? `${rates.cdi.value.toFixed(2)}%` : '—';
  const ipcaStr = rates?.ipca ? `${rates.ipca.value.toFixed(2)}%` : '—';

  return (
    <section id="investments" className="py-20 lg:py-28 relative">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-1/4 w-80 h-80 bg-primary-500/5 rounded-full blur-[120px]" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollReveal>
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white">
              {t('landing.investmentsTitle')}
            </h2>
            <p className="mt-4 text-lg text-surface-400 max-w-2xl mx-auto">
              {t('landing.investmentsSubtitle')}
            </p>
          </div>
        </ScrollReveal>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Fixed Income */}
          <ScrollReveal delay={100}>
            <div className="bg-surface-800/50 backdrop-blur border border-primary-500/20 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-primary-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">{t('landing.fixedIncome')}</h3>
              </div>
              <div className="space-y-3">
                {FIXED_INCOME.map((item) => (
                  <div key={item.type} className="flex items-center justify-between py-2.5 px-4 rounded-xl bg-surface-900/40 border border-surface-700/30">
                    <div>
                      <span className="text-sm font-medium text-white">{item.type}</span>
                      <span className="text-xs text-surface-400 ml-2">— {item.yield}</span>
                    </div>
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-green-400 bg-green-500/10 px-2.5 py-1 rounded-full">
                      <Check className="h-3 w-3" /> {t('landing.automatic')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </ScrollReveal>

          {/* Variable Income */}
          <ScrollReveal delay={200}>
            <div className="bg-surface-800/50 backdrop-blur border border-accent-500/20 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-accent-500/10 flex items-center justify-center">
                  <BarChart3 className="h-5 w-5 text-accent-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">{t('landing.variableIncome')}</h3>
              </div>
              <div className="space-y-3">
                {VARIABLE_INCOME.map((item) => (
                  <div key={item.type} className="flex items-center justify-between py-2.5 px-4 rounded-xl bg-surface-900/40 border border-surface-700/30">
                    <span className="text-sm font-medium text-white">{item.type}</span>
                    <span className="text-xs text-surface-400">{item.update}</span>
                  </div>
                ))}
              </div>

              <div className="mt-6" />
            </div>
          </ScrollReveal>
        </div>

        {/* Rate badge */}
        <ScrollReveal delay={300}>
          <div className="mt-8 text-center">
            <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-gradient-to-r from-primary-500/10 to-accent-500/10 border border-primary-500/20">
              {isLoading ? (
                <div className="h-4 w-64 bg-surface-700/50 rounded animate-pulse" />
              ) : error ? (
                <span className="text-sm text-surface-500">{t('landing.ratesUnavailable')}</span>
              ) : (
                <span className="text-sm text-surface-300">
                  {t('landing.updatedRates')}{' '}
                  <span className="font-semibold text-primary-400">SELIC {selicStr}</span>{' · '}
                  <span className="font-semibold text-primary-400">CDI {cdiStr}</span>{' · '}
                  <span className="font-semibold text-accent-400">IPCA {ipcaStr}</span>
                </span>
              )}
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}

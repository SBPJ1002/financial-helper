import { useTranslation } from 'react-i18next';
import ScrollReveal from './ScrollReveal';
import { usePublicRates } from '../../hooks/usePublicRates';

export default function CredibilityBar() {
  const { t } = useTranslation();
  const { rates, isLoading, error } = usePublicRates();

  const BADGES = [
    { icon: '🏦', label: t('landing.credibilityBcb') },
    { icon: '🔒', label: t('landing.credibilityEncryption') },
    { icon: '📊', label: t('landing.credibilityRealtime') },
    { icon: '🤖', label: t('landing.credibilityAi') },
  ];

  return (
    <section className="relative border-y border-surface-700/50 bg-surface-800/50 backdrop-blur">
      <ScrollReveal>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <p className="text-center text-sm text-surface-400 mb-4">
            {t('landing.credibilityText')}
          </p>

          {/* Real rates */}
          <div className="text-center mb-5">
            {isLoading ? (
              <div className="flex justify-center gap-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-5 w-32 bg-surface-700/50 rounded animate-pulse" />
                ))}
              </div>
            ) : error ? (
              <p className="text-xs text-surface-500">{t('landing.credibilityRatesUnavailable')}</p>
            ) : rates ? (
              <>
                <p className="text-sm font-medium text-surface-200">
                  {rates.selic && <span>SELIC <span className="text-primary-400">{rates.selic.value.toFixed(2)}% a.a.</span></span>}
                  {rates.cdi && <span> · CDI <span className="text-primary-400">{rates.cdi.value.toFixed(2)}% a.a.</span></span>}
                  {rates.ipca && <span> · IPCA <span className="text-accent-400">{rates.ipca.value.toFixed(2)}% a.a.</span></span>}
                  {rates.dolar && <span> · Dólar <span className="text-green-400">R$ {rates.dolar.value.toFixed(2)}</span></span>}
                </p>
                {rates.selic?.date && (
                  <p className="text-xs text-surface-500 mt-1">
                    {t('landing.credibilityUpdatedAt', { date: new Date(rates.selic.date + 'T00:00:00').toLocaleDateString('pt-BR') })}
                  </p>
                )}
              </>
            ) : null}
          </div>

          <div className="flex flex-wrap justify-center gap-6 sm:gap-10">
            {BADGES.map((badge) => (
              <div key={badge.label} className="flex items-center gap-2.5 text-surface-300">
                <span className="text-xl">{badge.icon}</span>
                <span className="text-sm font-medium">{badge.label}</span>
              </div>
            ))}
          </div>
        </div>
      </ScrollReveal>
    </section>
  );
}

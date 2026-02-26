import { Wallet, TrendingUp, RefreshCcw, Bot } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import ScrollReveal from './ScrollReveal';

export default function FeaturesSection() {
  const { t } = useTranslation();

  const FEATURES = [
    {
      icon: Wallet,
      title: t('landing.expenseTracking'),
      description: t('landing.expenseTrackingDesc'),
      color: 'from-green-500 to-emerald-600',
    },
    {
      icon: TrendingUp,
      title: t('landing.billEvolution'),
      description: t('landing.billEvolutionDesc'),
      color: 'from-orange-500 to-amber-600',
    },
    {
      icon: RefreshCcw,
      title: t('landing.realTimeRates'),
      description: t('landing.realTimeRatesDesc'),
      color: 'from-cyan-500 to-blue-600',
    },
    {
      icon: Bot,
      title: t('landing.aiAssistant'),
      description: t('landing.aiAssistantDesc'),
      color: 'from-pink-500 to-rose-600',
    },
  ];

  return (
    <section id="features" className="py-20 lg:py-28 relative">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-0 w-72 h-72 bg-primary-500/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-72 h-72 bg-accent-500/5 rounded-full blur-[120px]" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollReveal>
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white">
              {t('landing.featuresTitle')}
            </h2>
            <p className="mt-4 text-lg text-surface-400 max-w-2xl mx-auto">
              {t('landing.featuresSubtitle')}
            </p>
          </div>
        </ScrollReveal>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((feature, i) => (
            <ScrollReveal key={feature.title} delay={i * 100}>
              <div className="group relative bg-surface-800/50 backdrop-blur border border-surface-700/50 rounded-2xl p-6
                hover:border-surface-600 hover:shadow-xl hover:shadow-primary-500/5 transition-all duration-300 h-full">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4
                  shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-sm text-surface-400 leading-relaxed">{feature.description}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}

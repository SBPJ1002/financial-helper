import { UserPlus, Database, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import ScrollReveal from './ScrollReveal';

export default function HowItWorksSection() {
  const { t } = useTranslation();

  const STEPS = [
    {
      number: 1,
      icon: UserPlus,
      title: t('landing.step1Title'),
      description: t('landing.step1Desc'),
    },
    {
      number: 2,
      icon: Database,
      title: t('landing.step2Title'),
      description: t('landing.step2Desc'),
    },
    {
      number: 3,
      icon: Sparkles,
      title: t('landing.step3Title'),
      description: t('landing.step3Desc'),
    },
  ];

  return (
    <section id="how-it-works" className="py-20 lg:py-28 relative bg-surface-800/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollReveal>
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white">
              {t('landing.howItWorksTitle')}
            </h2>
          </div>
        </ScrollReveal>

        <div className="relative grid md:grid-cols-3 gap-10 md:gap-8">
          {/* Connecting line (desktop) */}
          <div className="hidden md:block absolute top-16 left-[20%] right-[20%] h-0.5 bg-gradient-to-r from-primary-500/50 via-accent-500/50 to-primary-500/50" style={{ backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 8px, var(--color-primary-500) 8px, var(--color-primary-500) 16px)' }} />

          {STEPS.map((step, i) => (
            <ScrollReveal key={step.number} delay={i * 150}>
              <div className="relative flex flex-col items-center text-center">
                {/* Number circle */}
                <div className="relative z-10 w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-600 flex items-center justify-center shadow-xl shadow-primary-500/20 mb-6">
                  <span className="text-2xl font-bold text-white">{step.number}</span>
                </div>

                {/* Icon */}
                <div className="w-10 h-10 rounded-lg bg-surface-700/50 flex items-center justify-center mb-4">
                  <step.icon className="h-5 w-5 text-primary-400" />
                </div>

                <h3 className="text-xl font-semibold text-white mb-3">{step.title}</h3>
                <p className="text-sm text-surface-400 leading-relaxed max-w-xs">{step.description}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}

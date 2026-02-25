import { Lock, Landmark, ShieldCheck, HardDrive } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import ScrollReveal from './ScrollReveal';

export default function SecuritySection() {
  const { t } = useTranslation();

  const ITEMS = [
    {
      icon: Lock,
      title: t('landing.secEncryption'),
      description: t('landing.secEncryptionDesc'),
      color: 'from-green-500 to-emerald-600',
    },
    {
      icon: Landmark,
      title: t('landing.secOfficialData'),
      description: t('landing.secOfficialDataDesc'),
      color: 'from-primary-500 to-primary-700',
    },
    {
      icon: ShieldCheck,
      title: t('landing.secJwt'),
      description: t('landing.secJwtDesc'),
      color: 'from-accent-500 to-accent-700',
    },
    {
      icon: HardDrive,
      title: t('landing.secBackup'),
      description: t('landing.secBackupDesc'),
      color: 'from-cyan-500 to-blue-600',
    },
  ];

  return (
    <section id="security" className="py-20 lg:py-28 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollReveal>
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white">
              {t('landing.securityTitle')}
            </h2>
          </div>
        </ScrollReveal>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {ITEMS.map((item, i) => (
            <ScrollReveal key={item.title} delay={i * 100}>
              <div className="text-center bg-surface-800/50 backdrop-blur border border-surface-700/50 rounded-2xl p-6 h-full">
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center mx-auto mb-4 shadow-lg`}>
                  <item.icon className="h-7 w-7 text-white" />
                </div>
                <h3 className="text-base font-semibold text-white mb-2">{item.title}</h3>
                <p className="text-sm text-surface-400">{item.description}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}

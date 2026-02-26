import { Wallet, TrendingDown, DollarSign } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import ScrollReveal from './ScrollReveal';

export default function DashboardPreview() {
  const { t } = useTranslation();

  const months = [
    t('landing.preview.monthJul'),
    t('landing.preview.monthAug'),
    t('landing.preview.monthSep'),
    t('landing.preview.monthOct'),
    t('landing.preview.monthNov'),
    t('landing.preview.monthDec'),
  ];

  return (
    <section className="py-20 lg:py-28 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary-500/5 rounded-full blur-[160px]" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollReveal>
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white">
              {t('landing.dashboardPreviewTitle')}
            </h2>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={150}>
          <div className="flex justify-center">
            <div className="relative w-full max-w-4xl" style={{ perspective: '1200px' }}>
              {/* Glow */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary-500/15 to-accent-500/15 rounded-3xl blur-3xl scale-105" />

              {/* Dashboard mockup */}
              <div
                className="relative bg-surface-800/90 backdrop-blur border border-surface-700/50 rounded-3xl p-8 shadow-2xl"
                style={{ transform: 'rotateX(2deg)' }}
              >
                {/* Top bar */}
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500/60" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                    <div className="w-3 h-3 rounded-full bg-green-500/60" />
                  </div>
                  <span className="text-xs text-surface-500">FinHelper — Dashboard</span>
                  <div className="w-20" />
                </div>

                {/* Stat cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
                  <PreviewStatCard icon={<Wallet className="h-4 w-4" />} label={t('landing.preview.income')} value={t('landing.preview.incomeValue')} iconColor="text-green-400" bgColor="bg-green-500/10" />
                  <PreviewStatCard icon={<TrendingDown className="h-4 w-4" />} label={t('landing.preview.expenses')} value={t('landing.preview.expensesValue')} iconColor="text-red-400" bgColor="bg-red-500/10" />
                  <PreviewStatCard icon={<DollarSign className="h-4 w-4" />} label={t('landing.preview.balance')} value={t('landing.preview.balanceValue')} iconColor="text-primary-400" bgColor="bg-primary-500/10" />
                </div>

                <div className="grid sm:grid-cols-2 gap-6">
                  {/* Pie chart mock */}
                  <div className="bg-surface-900/50 rounded-xl p-5">
                    <div className="text-xs text-surface-400 mb-4 font-medium">{t('landing.preview.expensesByCategory')}</div>
                    <div className="flex justify-center">
                      <svg width="120" height="120" viewBox="0 0 120 120">
                        <circle cx="60" cy="60" r="50" fill="none" stroke="var(--color-primary-600)" strokeWidth="20" strokeDasharray="100 214" strokeDashoffset="0" />
                        <circle cx="60" cy="60" r="50" fill="none" stroke="var(--color-accent-500)" strokeWidth="20" strokeDasharray="70 244" strokeDashoffset="-100" />
                        <circle cx="60" cy="60" r="50" fill="none" stroke="#22c55e" strokeWidth="20" strokeDasharray="50 264" strokeDashoffset="-170" />
                        <circle cx="60" cy="60" r="50" fill="none" stroke="#f59e0b" strokeWidth="20" strokeDasharray="40 274" strokeDashoffset="-220" />
                        <circle cx="60" cy="60" r="50" fill="none" stroke="#64748b" strokeWidth="20" strokeDasharray="54 260" strokeDashoffset="-260" />
                      </svg>
                    </div>
                    <div className="mt-4 space-y-1.5">
                      <LegendItem color="bg-primary-600" label={t('landing.preview.catHousing')} value="35%" />
                      <LegendItem color="bg-accent-500" label={t('landing.preview.catFood')} value="22%" />
                      <LegendItem color="bg-green-500" label={t('landing.preview.catTransport')} value="16%" />
                      <LegendItem color="bg-amber-500" label={t('landing.preview.catLeisure')} value="13%" />
                      <LegendItem color="bg-surface-500" label={t('landing.preview.catOther')} value="14%" />
                    </div>
                  </div>

                  {/* Bar chart mock */}
                  <div className="bg-surface-900/50 rounded-xl p-5">
                    <div className="text-xs text-surface-400 mb-4 font-medium">{t('landing.preview.incomeVsExpenses')}</div>
                    <div className="flex items-end gap-3 h-32">
                      {[
                        { r: 75, g: 60 },
                        { r: 80, g: 55 },
                        { r: 78, g: 65 },
                        { r: 85, g: 58 },
                        { r: 82, g: 62 },
                        { r: 90, g: 52 },
                      ].map((d, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1">
                          <div className="w-full flex gap-0.5">
                            <div className="flex-1 bg-primary-500/70 rounded-t transition-all" style={{ height: `${d.r}%` }} />
                            <div className="flex-1 bg-red-500/50 rounded-t transition-all" style={{ height: `${d.g}%` }} />
                          </div>
                          <span className="text-[9px] text-surface-500">{months[i]}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}

function PreviewStatCard({ icon, label, value, iconColor, bgColor }: {
  icon: React.ReactNode; label: string; value: string; iconColor: string; bgColor: string;
}) {
  return (
    <div className={`${bgColor} rounded-xl p-4`}>
      <div className={`flex items-center gap-1.5 mb-1.5 ${iconColor}`}>
        {icon}
        <span className="text-xs text-surface-400">{label}</span>
      </div>
      <div className="text-base font-bold text-white">{value}</div>
    </div>
  );
}

function LegendItem({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <div className="flex items-center gap-2">
        <div className={`w-2.5 h-2.5 rounded-sm ${color}`} />
        <span className="text-surface-400">{label}</span>
      </div>
      <span className="text-surface-300 font-medium">{value}</span>
    </div>
  );
}


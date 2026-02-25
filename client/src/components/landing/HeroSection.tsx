import { Link } from 'react-router-dom';
import { ArrowRight, Wallet, TrendingUp, PiggyBank } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function HeroSection() {
  const { t } = useTranslation();

  function scrollToFeatures(e: React.MouseEvent) {
    e.preventDefault();
    document.querySelector('#features')?.scrollIntoView({ behavior: 'smooth' });
  }

  return (
    <section className="relative min-h-screen flex items-center pt-16 overflow-hidden">
      {/* Background decorative blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary-500/20 rounded-full blur-[128px]" />
        <div className="absolute top-1/2 -left-40 w-96 h-96 bg-accent-500/15 rounded-full blur-[128px]" />
        <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-primary-600/10 rounded-full blur-[96px]" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left — Text */}
          <div className="text-center lg:text-left">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight tracking-tight">
              {t('landing.heroTitle').split(t('landing.heroHighlight'))[0]}
              <span className="bg-gradient-to-r from-primary-400 to-accent-400 bg-clip-text text-transparent">
                {t('landing.heroHighlight')}
              </span>
              {t('landing.heroTitle').split(t('landing.heroHighlight'))[1] || ''}
            </h1>

            <p className="mt-6 text-lg sm:text-xl text-surface-300 leading-relaxed max-w-xl mx-auto lg:mx-0">
              {t('landing.heroSubtitle')}
            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Link
                to="/register"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-semibold text-white
                  bg-gradient-to-r from-primary-600 to-accent-600 hover:from-primary-500 hover:to-accent-500
                  rounded-xl transition-all shadow-xl shadow-primary-500/25 hover:shadow-primary-500/40"
              >
                {t('landing.getStarted')}
                <ArrowRight className="h-5 w-5" />
              </Link>
              <a
                href="#features"
                onClick={scrollToFeatures}
                className="inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-semibold
                  text-surface-300 hover:text-white border border-surface-600 hover:border-surface-500
                  rounded-xl transition-all hover:bg-white/5"
              >
                {t('landing.learnMore')}
              </a>
            </div>

            <p className="mt-6 text-sm text-surface-400 flex flex-wrap justify-center lg:justify-start gap-x-4 gap-y-1">
              <span>&#10003; {t('landing.noCreditCard')}</span>
              <span>&#10003; {t('landing.secureData')}</span>
              <span>&#10003; {t('landing.quickSetup')}</span>
            </p>
          </div>

          {/* Right — Dashboard Mockup */}
          <div className="relative flex justify-center lg:justify-end">
            <div className="relative w-full max-w-lg animate-landing-float">
              {/* Glow behind mockup */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary-500/20 to-accent-500/20 rounded-2xl blur-2xl scale-105" />

              {/* Dashboard card */}
              <div className="relative bg-surface-800/90 backdrop-blur border border-surface-700/50 rounded-2xl p-6 shadow-2xl">
                {/* Top bar */}
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-3 h-3 rounded-full bg-red-500/60" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                  <div className="w-3 h-3 rounded-full bg-green-500/60" />
                  <span className="ml-3 text-xs text-surface-500">Dashboard — FinHelper</span>
                </div>

                {/* Stat cards row */}
                <div className="grid grid-cols-3 gap-3 mb-5">
                  <MockStatCard icon={<Wallet className="h-4 w-4 text-green-400" />} label="Receita" value="R$ 8.000" color="green" />
                  <MockStatCard icon={<TrendingUp className="h-4 w-4 text-red-400" />} label="Gastos" value="R$ 4.545" color="red" />
                  <MockStatCard icon={<PiggyBank className="h-4 w-4 text-primary-400" />} label="Investido" value="R$ 23.000" color="blue" />
                </div>

                {/* Chart area */}
                <div className="bg-surface-900/50 rounded-xl p-4 mb-4">
                  <div className="text-xs text-surface-400 mb-3">Receita vs Gastos</div>
                  <div className="flex items-end gap-2 h-24">
                    {[65, 45, 70, 50, 80, 55].map((h, i) => (
                      <div key={i} className="flex-1 flex gap-0.5">
                        <div className="flex-1 bg-primary-500/60 rounded-t" style={{ height: `${h}%` }} />
                        <div className="flex-1 bg-accent-500/40 rounded-t" style={{ height: `${h * 0.65}%` }} />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Mini pie placeholder */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-surface-900/50 rounded-xl p-3">
                    <div className="text-xs text-surface-400 mb-2">Categorias</div>
                    <div className="w-16 h-16 mx-auto rounded-full border-4 border-primary-500 border-t-accent-500 border-r-green-500" />
                  </div>
                  <div className="bg-surface-900/50 rounded-xl p-3">
                    <div className="text-xs text-surface-400 mb-2">Rendimento</div>
                    <div className="text-xl font-bold text-green-400 mt-2">+R$ 1.450</div>
                    <div className="text-xs text-surface-500">este mês</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function MockStatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  const bgMap: Record<string, string> = {
    green: 'bg-green-500/10',
    red: 'bg-red-500/10',
    blue: 'bg-primary-500/10',
  };

  return (
    <div className={`${bgMap[color]} rounded-xl p-3`}>
      <div className="flex items-center gap-1.5 mb-1">{icon}<span className="text-[10px] text-surface-400">{label}</span></div>
      <div className="text-sm font-bold text-white">{value}</div>
    </div>
  );
}

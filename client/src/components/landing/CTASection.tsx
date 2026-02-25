import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import ScrollReveal from './ScrollReveal';

export default function CTASection() {
  const { t } = useTranslation();

  return (
    <section className="py-20 lg:py-28 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollReveal>
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-600 via-primary-700 to-accent-700 p-12 sm:p-16 text-center">
            {/* Decorative circles */}
            <div className="absolute top-0 left-0 w-64 h-64 bg-white/5 rounded-full -translate-x-1/3 -translate-y-1/3" />
            <div className="absolute bottom-0 right-0 w-80 h-80 bg-white/5 rounded-full translate-x-1/3 translate-y-1/3" />

            <div className="relative">
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                {t('landing.ctaTitle')}
              </h2>
              <p className="text-lg text-primary-100 mb-8 max-w-xl mx-auto">
                {t('landing.ctaSubtitle')}
              </p>
              <Link
                to="/register"
                className="inline-flex items-center gap-2 px-10 py-4 text-lg font-semibold text-primary-700
                  bg-white hover:bg-primary-50 rounded-xl transition-all shadow-xl hover:shadow-2xl"
              >
                {t('landing.ctaButton')}
                <ArrowRight className="h-5 w-5" />
              </Link>
              <p className="mt-5 text-sm text-primary-200">
                {t('landing.ctaNote')}
              </p>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}

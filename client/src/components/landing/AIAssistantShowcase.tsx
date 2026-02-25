import { Link } from 'react-router-dom';
import { Bot, User, ArrowRight, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import ScrollReveal from './ScrollReveal';

export default function AIAssistantShowcase() {
  const { t } = useTranslation();

  const CAPABILITIES = [
    t('landing.capability1'),
    t('landing.capability2'),
    t('landing.capability3'),
    t('landing.capability4'),
    t('landing.capability5'),
    t('landing.capability6'),
    t('landing.capability7'),
  ];

  return (
    <section id="ai-assistant" className="py-20 lg:py-28 relative bg-surface-800/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollReveal>
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white">
              {t('landing.meetFinley')}
            </h2>
          </div>
        </ScrollReveal>

        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Chat mockup */}
          <ScrollReveal delay={100}>
            <div className="bg-surface-800/80 backdrop-blur border border-surface-700/50 rounded-2xl shadow-2xl overflow-hidden">
              {/* Chat header */}
              <div className="flex items-center gap-3 px-5 py-4 border-b border-surface-700/50 bg-surface-800">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-accent-600 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-white" />
                </div>
                <div>
                  <span className="text-sm font-semibold text-white">Finley</span>
                  <span className="block text-xs text-green-400">{t('landing.finleyOnline')}</span>
                </div>
              </div>

              {/* Messages */}
              <div className="p-5 space-y-4">
                {/* User message */}
                <div className="flex justify-end">
                  <div className="flex items-end gap-2 max-w-[80%]">
                    <div className="bg-primary-600 text-white text-sm rounded-2xl rounded-br-md px-4 py-3">
                      Quero comprar um notebook de R$ 4.000. Como me planejar?
                    </div>
                    <div className="w-7 h-7 rounded-full bg-surface-600 flex items-center justify-center shrink-0">
                      <User className="h-3.5 w-3.5 text-surface-300" />
                    </div>
                  </div>
                </div>

                {/* Bot response */}
                <div className="flex items-start gap-2 max-w-[85%]">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary-500 to-accent-600 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="h-3.5 w-3.5 text-white" />
                  </div>
                  <div className="bg-surface-700/50 text-surface-200 text-sm rounded-2xl rounded-bl-md px-4 py-3 space-y-2">
                    <p>Com base nos seus dados, seu saldo livre mensal é de <span className="font-semibold text-primary-400">R$ 1.725</span>.</p>
                    <p>Se separar <span className="font-semibold text-white">R$ 800/mês</span>, você consegue em 5 meses!</p>
                    <p className="text-surface-400">Sugiro reduzir:</p>
                    <ul className="text-surface-300 space-y-1 ml-1">
                      <li>• Restaurantes: de R$ 300 para R$ 150 <span className="text-green-400">(-R$ 150)</span></li>
                      <li>• Uber: de R$ 200 para R$ 100 <span className="text-green-400">(-R$ 100)</span></li>
                    </ul>
                    <p>Isso libera R$ 250 extras. Com R$ 800/mês, você compra o notebook em <span className="font-semibold text-accent-400">abril</span>! 🎯</p>
                  </div>
                </div>
              </div>

              {/* Input bar */}
              <div className="px-5 py-3 border-t border-surface-700/50">
                <div className="flex items-center gap-2 bg-surface-900/50 rounded-xl px-4 py-2.5">
                  <span className="text-sm text-surface-500 flex-1">{t('landing.askFinley')}</span>
                  <div className="w-8 h-8 rounded-lg bg-primary-600/50 flex items-center justify-center">
                    <ArrowRight className="h-4 w-4 text-primary-300" />
                  </div>
                </div>
              </div>
            </div>
          </ScrollReveal>

          {/* Capabilities list */}
          <ScrollReveal delay={200}>
            <div className="space-y-5">
              {CAPABILITIES.map((cap) => (
                <div key={cap} className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-green-500/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="h-3.5 w-3.5 text-green-400" />
                  </div>
                  <span className="text-surface-300">{cap}</span>
                </div>
              ))}

              <div className="pt-4">
                <Link
                  to="/register"
                  className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white
                    bg-gradient-to-r from-primary-600 to-accent-600 hover:from-primary-500 hover:to-accent-500
                    rounded-xl transition-all shadow-lg shadow-primary-500/25"
                >
                  {t('landing.tryFinley')}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}

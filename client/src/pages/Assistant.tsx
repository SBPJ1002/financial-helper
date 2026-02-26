import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Send, Trash2, Bot, User } from 'lucide-react';
import Button from '../components/ui/Button';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { useChatStore } from '../stores/useChatStore';

export default function Assistant() {
  const { t } = useTranslation();
  const { messages, isLoading, sendMessage, clearHistory, fetchHistory } = useChatStore();
  const [input, setInput] = useState('');
  const [clearConfirm, setClearConfirm] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const QUICK_ACTIONS = [
    { emoji: '📊', label: t('assistant.quickAnalyze') },
    { emoji: '💡', label: t('assistant.quickSave') },
    { emoji: '🎯', label: t('assistant.quickPlan') },
    { emoji: '🏦', label: t('assistant.quickEmergency') },
    { emoji: '📉', label: t('assistant.quickIncreasing') },
  ];

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  async function handleSend(text?: string) {
    const msg = text || input.trim();
    if (!msg || isLoading) return;
    setInput('');
    await sendMessage(msg);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="animate-fade-in flex flex-col h-[calc(100vh-6rem)] lg:h-[calc(100vh-3rem)]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent-500 to-primary-600 flex items-center justify-center">
            <Bot className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold">{t('assistant.finley')}</h1>
            <p className="text-xs text-surface-500">{t('assistant.subtitle')}</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setClearConfirm(true)}>
          <Trash2 className="h-4 w-4" /> {t('assistant.clear')}
        </Button>
      </div>

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto rounded-xl bg-surface-100 dark:bg-surface-900 border border-surface-200 dark:border-surface-700 p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent-500 to-primary-600 flex items-center justify-center shrink-0">
              <Bot className="h-4 w-4 text-white" />
            </div>
            <div className="bg-white dark:bg-surface-800 rounded-2xl rounded-tl-md px-4 py-3 max-w-[80%] shadow-sm border border-surface-200 dark:border-surface-700">
              <p className="text-sm leading-relaxed">{t('assistant.greeting')}</p>
            </div>
          </div>
        )}

        {messages.map(msg => (
          <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent-500 to-primary-600 flex items-center justify-center shrink-0">
                <Bot className="h-4 w-4 text-white" />
              </div>
            )}
            <div className={`rounded-2xl px-4 py-3 max-w-[80%] shadow-sm text-sm leading-relaxed
              ${msg.role === 'user'
                ? 'bg-primary-600 text-white rounded-tr-md'
                : 'bg-white dark:bg-surface-800 rounded-tl-md border border-surface-200 dark:border-surface-700'
              }`}>
              {msg.role === 'assistant' ? (
                <div className="prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: simpleMarkdown(msg.content) }} />
              ) : (
                <p className="whitespace-pre-wrap">{msg.content}</p>
              )}
            </div>
            {msg.role === 'user' && (
              <div className="w-8 h-8 rounded-full bg-surface-200 dark:bg-surface-700 flex items-center justify-center shrink-0">
                <User className="h-4 w-4 text-surface-600 dark:text-surface-300" />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent-500 to-primary-600 flex items-center justify-center shrink-0">
              <Bot className="h-4 w-4 text-white" />
            </div>
            <div className="bg-white dark:bg-surface-800 rounded-2xl rounded-tl-md px-4 py-3 shadow-sm border border-surface-200 dark:border-surface-700">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-surface-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-surface-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-surface-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick actions */}
      {messages.length === 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {QUICK_ACTIONS.map(action => (
            <button key={action.label} onClick={() => handleSend(action.label)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium
                bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700
                hover:bg-surface-50 dark:hover:bg-surface-700 hover:border-primary-300 dark:hover:border-primary-600
                text-surface-600 dark:text-surface-300 transition-colors">
              <span>{action.emoji}</span>
              {action.label}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="mt-3 flex gap-2">
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t('assistant.placeholder')}
          rows={1}
          className="flex-1 px-4 py-3 rounded-xl border border-surface-300 dark:border-surface-600
            bg-white dark:bg-surface-800 text-sm text-surface-900 dark:text-white
            placeholder:text-surface-400 dark:placeholder:text-surface-500
            focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
        />
        <Button onClick={() => handleSend()} disabled={!input.trim() || isLoading} className="self-end">
          <Send className="h-4 w-4" />
        </Button>
      </div>

      <ConfirmDialog open={clearConfirm} onClose={() => setClearConfirm(false)}
        onConfirm={() => { clearHistory(); setClearConfirm(false); }}
        title={t('assistant.clearTitle')} message={t('assistant.clearMessage')} confirmLabel={t('assistant.clearConfirmLabel')} />
    </div>
  );
}

function simpleMarkdown(text: string): string {
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code class="bg-surface-100 dark:bg-surface-700 px-1 rounded text-xs">$1</code>')
    .replace(/^### (.*$)/gm, '<h3 class="font-semibold text-base mt-3 mb-1">$1</h3>')
    .replace(/^## (.*$)/gm, '<h2 class="font-semibold text-lg mt-3 mb-1">$1</h2>')
    .replace(/^# (.*$)/gm, '<h1 class="font-bold text-xl mt-3 mb-1">$1</h1>')
    .replace(/^- (.*$)/gm, '<li class="ml-4 list-disc">$1</li>')
    .replace(/^(\d+)\. (.*$)/gm, '<li class="ml-4 list-decimal">$2</li>')
    .replace(/\n/g, '<br>');
}

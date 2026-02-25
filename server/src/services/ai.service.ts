import { prisma } from '../config/prisma.js';
import { decrypt } from '../utils/encryption.js';
import { ApiError } from '../utils/apiError.js';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface AIAdapter {
  sendMessage(systemPrompt: string, messages: ChatMessage[]): Promise<string>;
  testConnection(): Promise<boolean>;
}

// --- Google Gemini (with auto-detect & free-tier support) ---

// Preferred models for general text chat (best → fallback)
const GEMINI_MODEL_PREFERENCE = [
  'gemini-3-flash-preview',
  'gemini-3-pro-preview',
  'gemini-2.5-flash',
  'gemini-2.5-pro',
  'gemini-2.5-flash-lite',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-1.5-flash',
  'gemini-1.5-pro',
];

// Skip specialized models that aren't suitable for text chat
const GEMINI_SKIP_KEYWORDS = ['tts', 'image', 'robotics', 'computer-use', 'nano', 'deep-research', 'gemma', 'embedding'];

// Module-level cache for detected model (avoids re-detection on every request)
let geminiModelCache: { key: string; model: string; expiry: number } | null = null;

async function detectGeminiModel(apiKey: string): Promise<string> {
  // Check cache (keyed by first/last 4 chars of API key, 5-minute TTL)
  const cacheKey = apiKey.slice(0, 4) + apiKey.slice(-4);
  if (geminiModelCache && geminiModelCache.key === cacheKey && Date.now() < geminiModelCache.expiry) {
    console.log(`[Gemini] Using cached model: ${geminiModelCache.model}`);
    return geminiModelCache.model;
  }

  console.log('[Gemini] Detecting available models...');
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
    { signal: AbortSignal.timeout(15000) },
  );

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    if (res.status === 400 || text.includes('API_KEY_INVALID')) {
      throw new Error('Invalid Google API key. Get yours at aistudio.google.com/apikey');
    }
    throw new Error(`Failed to list Gemini models (HTTP ${res.status})`);
  }

  const data = (await res.json()) as {
    models: Array<{ name: string; supportedGenerationMethods?: string[] }>;
  };

  const allModels = data.models
    .filter((m) => m.supportedGenerationMethods?.includes('generateContent'))
    .map((m) => m.name.replace('models/', ''));

  // Filter out specialized models (TTS, image gen, robotics, etc.)
  const available = allModels.filter(
    (name) => !GEMINI_SKIP_KEYWORDS.some((kw) => name.includes(kw)),
  );

  console.log('[Gemini] Available models:', available.join(', '));

  // Pick best model using exact match against preference list
  for (const preferred of GEMINI_MODEL_PREFERENCE) {
    if (available.includes(preferred)) {
      console.log(`[Gemini] Selected model: ${preferred}`);
      geminiModelCache = { key: cacheKey, model: preferred, expiry: Date.now() + 5 * 60 * 1000 };
      return preferred;
    }
  }

  // Fallback to first available model
  if (available.length > 0) {
    console.log(`[Gemini] Fallback model: ${available[0]}`);
    geminiModelCache = { key: cacheKey, model: available[0], expiry: Date.now() + 5 * 60 * 1000 };
    return available[0];
  }

  throw new Error('No Gemini models available for your API key.');
}

class GoogleAdapter implements AIAdapter {
  detectedModel: string | null = null;

  constructor(
    private apiKey: string,
    private model: string,
  ) {}

  private async resolveModel(): Promise<string> {
    if (this.model && this.model !== 'auto') {
      return this.model;
    }
    if (!this.detectedModel) {
      this.detectedModel = await detectGeminiModel(this.apiKey);
    }
    return this.detectedModel;
  }

  async sendMessage(systemPrompt: string, messages: ChatMessage[]): Promise<string> {
    const model = await this.resolveModel();

    const contents = messages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const generationConfig = {
      temperature: 0.7,
      maxOutputTokens: 2048,
      topP: 0.95,
      topK: 40,
    };

    const safetySettings = [
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
    ];

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`;
    console.log(`[Gemini] Sending message to model: ${model}`);

    // Attempt 1: with systemInstruction
    let res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents, systemInstruction: { parts: [{ text: systemPrompt }] }, generationConfig, safetySettings }),
      signal: AbortSignal.timeout(60000),
    });

    // If systemInstruction is not supported (400), retry with system prompt prepended as messages
    if (res.status === 400) {
      const errorText = await res.text().catch(() => '');
      console.log(`[Gemini] 400 with systemInstruction, retrying without. Error: ${errorText.slice(0, 200)}`);

      if (errorText.includes('API_KEY_INVALID')) {
        throw new Error('Invalid API key. Please check your key at aistudio.google.com/apikey');
      }

      const contentsWithSystem = [
        { role: 'user', parts: [{ text: `System instructions: ${systemPrompt}` }] },
        { role: 'model', parts: [{ text: 'Understood. I will follow these instructions.' }] },
        ...contents,
      ];

      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: contentsWithSystem, generationConfig, safetySettings }),
        signal: AbortSignal.timeout(60000),
      });
    }

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      const status = res.status;
      console.log(`[Gemini] Error ${status}: ${text.slice(0, 300)}`);

      if (status === 400 && text.includes('API_KEY_INVALID')) {
        throw new Error('Invalid API key. Please check your key at aistudio.google.com/apikey');
      }
      if (status === 429) {
        throw new Error('Rate limit reached. Free tier allows ~15 requests/minute. Please wait a moment and try again.');
      }
      if (status === 403) {
        throw new Error('Access denied. Your API key may not have access to this model.');
      }

      try {
        const errorData = JSON.parse(text);
        if (errorData?.error?.message?.includes('safety')) {
          throw new Error('The response was blocked by safety filters. Please rephrase your question.');
        }
      } catch (parseErr) {
        if (parseErr instanceof Error && (parseErr.message.includes('safety') || parseErr.message.includes('rephrase'))) throw parseErr;
      }

      throw new Error(`Gemini API error ${status}: ${text.slice(0, 200)}`);
    }

    const data = (await res.json()) as {
      candidates: Array<{
        content: { parts: Array<{ text: string }> };
        finishReason?: string;
      }>;
    };

    if (data.candidates?.[0]?.finishReason === 'SAFETY') {
      throw new Error('The response was blocked by safety filters. Please rephrase your question.');
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      console.log('[Gemini] Empty response:', JSON.stringify(data).slice(0, 500));
      throw new Error('Empty response from Gemini');
    }

    return text;
  }

  async testConnection(): Promise<boolean> {
    try {
      const model = await this.resolveModel();
      console.log(`[Gemini] Testing connection with model: ${model}`);

      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: 'Say OK' }] }],
          generationConfig: { maxOutputTokens: 10 },
        }),
        signal: AbortSignal.timeout(15000),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        console.log(`[Gemini] Test failed (${res.status}): ${text.slice(0, 200)}`);
        return false;
      }

      console.log(`[Gemini] Test successful with model: ${model}`);
      return true;
    } catch (err) {
      console.log('[Gemini] Test error:', err instanceof Error ? err.message : err);
      return false;
    }
  }
}

// --- Factory ---

function createAdapter(apiKey: string, model: string): AIAdapter {
  return new GoogleAdapter(apiKey, model || 'auto');
}

export async function getAdapterForUser(userId: string): Promise<AIAdapter> {
  const settings = await prisma.userSettings.findUnique({ where: { userId } });

  if (settings?.aiApiKey) {
    try {
      const decryptedKey = decrypt(settings.aiApiKey);
      return createAdapter(decryptedKey, settings.aiModel);
    } catch {
      throw ApiError.badRequest('Failed to decrypt AI API key. Please reconfigure in Settings.');
    }
  }

  // Fallback to server env vars
  const envKey = process.env.DEFAULT_AI_API_KEY || process.env.GOOGLE_AI_API_KEY;
  if (!envKey) {
    throw ApiError.badRequest('AI not configured. Please set your API key in Settings.');
  }

  const envModel = process.env.DEFAULT_AI_MODEL || 'auto';

  return createAdapter(envKey, envModel);
}

export async function testProviderConnection(
  provider: string,
  apiKey: string,
  model: string,
): Promise<{ success: boolean; model?: string }> {
  const adapter = new GoogleAdapter(apiKey, 'auto');
  const success = await adapter.testConnection();
  return { success, model: adapter.detectedModel || undefined };
}

export { type AIAdapter, type ChatMessage as AIChatMessage };

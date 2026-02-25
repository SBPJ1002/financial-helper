import { create } from 'zustand';
import api from '../services/api';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

interface ChatState {
  messages: ChatMessage[];
  isLoading: boolean;

  fetchHistory: () => Promise<void>;
  sendMessage: (message: string) => Promise<void>;
  clearHistory: () => Promise<void>;
}

export const useChatStore = create<ChatState>()((set, get) => ({
  messages: [],
  isLoading: false,

  fetchHistory: async () => {
    const { data } = await api.get('/chat/history');
    set({ messages: data });
  },

  sendMessage: async (message) => {
    // Optimistically add user message
    const tempUserMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: message,
      createdAt: new Date().toISOString(),
    };
    set((s) => ({ messages: [...s.messages, tempUserMsg], isLoading: true }));

    try {
      const { data } = await api.post('/chat/send', { message });
      // Refetch to get accurate server state
      await get().fetchHistory();
      // Ensure the response is included
      set((s) => {
        const hasResponse = s.messages.some((m) => m.id === data.id);
        if (!hasResponse) {
          return { messages: [...s.messages, data] };
        }
        return {};
      });
    } catch (err) {
      const errorMsg = (err as { response?: { data?: { error?: string } } }).response?.data?.error
        || 'An error occurred. Please try again.';
      set((s) => ({
        messages: [
          ...s.messages,
          {
            id: `error-${Date.now()}`,
            role: 'assistant' as const,
            content: `Sorry, ${errorMsg}`,
            createdAt: new Date().toISOString(),
          },
        ],
      }));
    } finally {
      set({ isLoading: false });
    }
  },

  clearHistory: async () => {
    await api.delete('/chat/history');
    set({ messages: [] });
  },
}));

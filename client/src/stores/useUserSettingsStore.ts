import { create } from 'zustand';
import api from '../services/api';

export interface UserSettings {
  id: string;
  userId: string;
  aiProvider: string;
  aiApiKey: string | null;
  hasAiApiKey: boolean;
  aiModel: string;
  theme: string;
  accentColor: string;
  language: string;
  fontSize: string;
  currency: string;
  dateFormat: string;
  startDayOfMonth: number;
  alertExpenseAbove: boolean;
  alertInvestmentDrop: boolean;
  alertBillDue: boolean;
  aiIncludeInvestments: boolean;
  aiIncludeExpenses: boolean;
}

interface UserSettingsState {
  settings: UserSettings | null;
  isLoading: boolean;
  fetchSettings: () => Promise<void>;
  updateSettings: (data: Partial<UserSettings>) => Promise<void>;
  testAiConnection: (provider: string, apiKey: string, model: string) => Promise<{ success: boolean; model?: string }>;
}

export const useUserSettingsStore = create<UserSettingsState>()((set, _get) => ({
  settings: null,
  isLoading: false,

  fetchSettings: async () => {
    set({ isLoading: true });
    try {
      const { data } = await api.get('/settings');
      set({ settings: data });
    } catch {
      // Settings not available (not logged in)
    } finally {
      set({ isLoading: false });
    }
  },

  updateSettings: async (data) => {
    const { data: updated } = await api.put('/settings', data);
    set({ settings: updated });
  },

  testAiConnection: async (provider, apiKey, model) => {
    const { data } = await api.post('/settings/ai/test', { provider, apiKey, model });
    return { success: data.success, model: data.model };
  },
}));

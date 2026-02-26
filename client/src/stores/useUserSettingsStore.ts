import { create } from 'zustand';
import api from '../services/api';

export interface UserSettings {
  id: string;
  userId: string;
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
  aiIncludeExpenses: boolean;
}

interface UserSettingsState {
  settings: UserSettings | null;
  isLoading: boolean;
  fetchSettings: () => Promise<void>;
  updateSettings: (data: Partial<UserSettings>) => Promise<void>;
}

export const useUserSettingsStore = create<UserSettingsState>()((set) => ({
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
}));

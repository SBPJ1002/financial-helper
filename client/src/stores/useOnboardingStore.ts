import { create } from 'zustand';
import api from '../services/api';
import { useAuthStore } from './useAuthStore';

export interface FinancialProfile {
  id: string;
  userId: string;
  primaryGoal: string | null;
  financialControlScore: number | null;
  bankAccountCount: number | null;
  creditCardCount: number | null;
  preferredPaymentMethods: string[];
  incomeType: string | null;
  expectedIncomeDay: number | null;
  incomeRange: string | null;
  incomeIsVariable: boolean;
  housingType: string | null;
  hasDependents: boolean;
  dependentTypes: string[];
  expectedFixedExpenses: string[];
  onboardingCompleted: boolean;
  onboardingCompletedAt: string | null;
  onboardingStepReached: number;
}

interface OnboardingState {
  profile: FinancialProfile | null;
  isLoading: boolean;
  isSaving: boolean;
  fetchProfile: () => Promise<FinancialProfile>;
  updateProfile: (data: Partial<FinancialProfile>) => Promise<void>;
  completeOnboarding: () => Promise<void>;
}

export const useOnboardingStore = create<OnboardingState>()((set) => ({
  profile: null,
  isLoading: false,
  isSaving: false,

  fetchProfile: async () => {
    set({ isLoading: true });
    try {
      const { data } = await api.get('/onboarding/profile');
      set({ profile: data });
      return data;
    } finally {
      set({ isLoading: false });
    }
  },

  updateProfile: async (data) => {
    set({ isSaving: true });
    try {
      const { data: updated } = await api.put('/onboarding/profile', data);
      set({ profile: updated });
    } finally {
      set({ isSaving: false });
    }
  },

  completeOnboarding: async () => {
    set({ isSaving: true });
    try {
      const { data: updated } = await api.post('/onboarding/complete');
      set({ profile: updated });
      // Update auth store
      const authState = useAuthStore.getState();
      if (authState.user) {
        useAuthStore.setState({
          user: { ...authState.user, onboardingCompleted: true },
        });
      }
    } finally {
      set({ isSaving: false });
    }
  },
}));

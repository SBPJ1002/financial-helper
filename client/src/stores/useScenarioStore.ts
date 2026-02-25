import { create } from 'zustand';
import api from '../services/api';

export interface Scenario {
  id: string;
  name: string;
  initialAmount: number;
  monthlyDeposit: number;
  annualRate: number;
  periodMonths: number;
  interestType: string;
  referenceIndex: string | null;
  totalAmount: number | null;
  totalInvested: number | null;
  totalYield: number | null;
  createdAt: string;
}

interface ScenarioState {
  scenarios: Scenario[];
  isLoading: boolean;
  fetchScenarios: () => Promise<void>;
  createScenario: (data: Omit<Scenario, 'id' | 'totalAmount' | 'totalInvested' | 'totalYield' | 'createdAt'>) => Promise<Scenario>;
  updateScenario: (id: string, data: Partial<Scenario>) => Promise<void>;
  deleteScenario: (id: string) => Promise<void>;
  duplicateScenario: (id: string) => Promise<void>;
}

export const useScenarioStore = create<ScenarioState>()((set, get) => ({
  scenarios: [],
  isLoading: false,

  fetchScenarios: async () => {
    set({ isLoading: true });
    try {
      const { data } = await api.get('/scenarios');
      set({ scenarios: data });
    } finally {
      set({ isLoading: false });
    }
  },

  createScenario: async (data) => {
    const { data: created } = await api.post('/scenarios', data);
    await get().fetchScenarios();
    return created;
  },

  updateScenario: async (id, data) => {
    await api.put(`/scenarios/${id}`, data);
    await get().fetchScenarios();
  },

  deleteScenario: async (id) => {
    await api.delete(`/scenarios/${id}`);
    await get().fetchScenarios();
  },

  duplicateScenario: async (id) => {
    await api.post(`/scenarios/${id}/duplicate`);
    await get().fetchScenarios();
  },
}));

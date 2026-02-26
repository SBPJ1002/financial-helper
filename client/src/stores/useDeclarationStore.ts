import { create } from 'zustand';
import api from '../services/api';

export interface Declaration {
  id: string;
  label: string;
  categoryName: string | null;
  paymentMethod: 'PIX' | 'BOLETO' | 'AUTO_DEBIT' | 'CREDIT_CARD';
  creditAccountId: string | null;
  creditAccount: { id: string; accountLabel: string } | null;
  estimatedAmount: number;
  amountTolerance: number;
  expectedDay: number | null;
  dayTolerance: number;
  matchKeywords: string[];
  matchCounterpartDocument: string | null;
  isActive: boolean;
  matches: DeclarationMatch[];
}

export interface DeclarationMatch {
  id: string;
  strategy: string;
  confidenceScore: number;
  month: string;
  matchedAmount: number;
  isConfirmed: boolean;
  stdTransaction?: { descriptionOriginal: string; absoluteAmount: number; date: string };
}

export interface CreateDeclarationInput {
  label: string;
  paymentMethod: 'PIX' | 'BOLETO' | 'AUTO_DEBIT' | 'CREDIT_CARD';
  estimatedAmount: number;
  categoryName?: string;
  creditAccountId?: string;
  amountTolerance?: number;
  expectedDay?: number;
  dayTolerance?: number;
  matchKeywords?: string[];
  matchCounterpartDocument?: string;
}

interface MatchingResult {
  matched: Array<{
    declarationId: string;
    declarationLabel: string;
    stdTransactionId: string;
    strategy: string;
    confidenceScore: number;
    matchedAmount: number;
  }>;
  unmatched: string[];
}

interface DeclarationStore {
  declarations: Declaration[];
  isLoading: boolean;
  matchingResult: MatchingResult | null;
  fetchDeclarations: () => Promise<void>;
  createDeclaration: (data: CreateDeclarationInput) => Promise<void>;
  bulkCreateDeclarations: (data: CreateDeclarationInput[]) => Promise<void>;
  updateDeclaration: (id: string, data: Partial<CreateDeclarationInput> & { isActive?: boolean }) => Promise<void>;
  deleteDeclaration: (id: string) => Promise<void>;
  triggerMatching: () => Promise<MatchingResult>;
  getMatchResults: (month: string) => Promise<DeclarationMatch[]>;
}

export const useDeclarationStore = create<DeclarationStore>((set) => ({
  declarations: [],
  isLoading: false,
  matchingResult: null,

  fetchDeclarations: async () => {
    set({ isLoading: true });
    try {
      const { data } = await api.get('/declarations');
      set({ declarations: data });
    } finally {
      set({ isLoading: false });
    }
  },

  createDeclaration: async (input) => {
    const { data } = await api.post('/declarations', input);
    set(s => ({ declarations: [data, ...s.declarations] }));
  },

  bulkCreateDeclarations: async (input) => {
    await api.post('/declarations/bulk', input);
    // Refresh full list
    const { data } = await api.get('/declarations');
    set({ declarations: data });
  },

  updateDeclaration: async (id, input) => {
    const { data } = await api.put(`/declarations/${id}`, input);
    set(s => ({ declarations: s.declarations.map(d => d.id === id ? data : d) }));
  },

  deleteDeclaration: async (id) => {
    await api.delete(`/declarations/${id}`);
    set(s => ({ declarations: s.declarations.filter(d => d.id !== id) }));
  },

  triggerMatching: async () => {
    const { data } = await api.post('/declarations/match');
    set({ matchingResult: data });
    // Refresh declarations to get updated matches
    const { data: declarations } = await api.get('/declarations');
    set({ declarations });
    return data;
  },

  getMatchResults: async (month) => {
    const { data } = await api.get(`/declarations/match/${month}`);
    return data;
  },
}));

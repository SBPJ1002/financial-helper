import { create } from 'zustand';
import api from '../services/api';

interface BankAccount {
  id: string;
  name: string;
  type: string;
  balance: number;
  bankConnection: { connectorName: string };
}

interface BankTransaction {
  id: string;
  description: string;
  amount: number;
  date: string;
  type: string;
  category: string | null;
  bankAccount: { name: string; bankConnection: { connectorName: string } };
}

interface BankConnection {
  id: string;
  connectorName: string;
  status: string;
  lastSyncAt: string | null;
  accounts: Array<{ id: string; name: string; type: string; balance: number }>;
}

interface ImportResult {
  total: number;
  expenses: number;
  incomes: number;
  skipped: number;
  errors: string[];
  batchId: string;
}

interface ImportBatch {
  incomes: Array<{ id: string; description: string; amount: number; date: string; recurrence: string; category?: { name: string; emoji: string } }>;
  expenses: Array<{ id: string; description: string; amount: number; type: string; date: string; category: { name: string; emoji: string }; fixedAmountType?: string }>;
}

interface SyncResult {
  investments: { synced: number; skipped: number };
  transactions: { synced: number; newCount: number };
  accounts: number;
}

interface BankingState {
  connections: BankConnection[];
  accounts: BankAccount[];
  transactions: BankTransaction[];
  totalPages: number;
  isLoading: boolean;
  isAvailable: boolean | null;
  isImporting: boolean;

  checkAvailability: () => Promise<void>;
  fetchConnections: () => Promise<void>;
  fetchAccounts: () => Promise<void>;
  fetchTransactions: (page?: number) => Promise<void>;
  getConnectToken: () => Promise<string>;
  createConnection: (pluggyItemId: string, connectorName: string) => Promise<void>;
  syncConnection: (id: string) => Promise<SyncResult>;
  deleteConnection: (id: string) => Promise<void>;
  importTransactions: (mode?: string) => Promise<ImportResult>;
  fetchImportBatch: (batchId: string) => Promise<ImportBatch>;
  bulkRename: (oldDescription: string, newDescription: string, scope: string, batchId?: string) => Promise<{ updatedExpenses: number; updatedIncomes: number }>;
  toggleExpenseType: (id: string) => Promise<void>;
  renameItem: (type: string, id: string, newDescription: string) => Promise<void>;
}

export const useBankingStore = create<BankingState>()((set) => ({
  connections: [],
  accounts: [],
  transactions: [],
  totalPages: 1,
  isLoading: false,
  isAvailable: null,
  isImporting: false,

  checkAvailability: async () => {
    try {
      const { data } = await api.get('/banking/available');
      set({ isAvailable: data.enabled });
    } catch {
      set({ isAvailable: false });
    }
  },

  fetchConnections: async () => {
    set({ isLoading: true });
    try {
      const { data } = await api.get('/banking/connections');
      set({ connections: data });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchAccounts: async () => {
    try {
      const { data } = await api.get('/banking/accounts');
      set({ accounts: data });
    } catch {
      // ignore
    }
  },

  fetchTransactions: async (page = 1) => {
    set({ isLoading: true });
    try {
      const { data } = await api.get('/banking/transactions', { params: { page } });
      set({ transactions: data.transactions, totalPages: data.pages });
    } finally {
      set({ isLoading: false });
    }
  },

  getConnectToken: async () => {
    const { data } = await api.post('/banking/connect-token');
    return data.accessToken;
  },

  createConnection: async (pluggyItemId, connectorName) => {
    await api.post('/banking/connections', { pluggyItemId, connectorName });
  },

  syncConnection: async (id) => {
    const { data } = await api.post(`/banking/connections/${id}/sync`, {}, { timeout: 120000 });
    return data;
  },

  deleteConnection: async (id) => {
    await api.delete(`/banking/connections/${id}`);
  },

  importTransactions: async (mode = 'all') => {
    set({ isImporting: true });
    try {
      const { data } = await api.post('/banking/import', { mode });
      return data;
    } finally {
      set({ isImporting: false });
    }
  },

  fetchImportBatch: async (batchId) => {
    const { data } = await api.get(`/banking/import/${batchId}`);
    return data;
  },

  bulkRename: async (oldDescription, newDescription, scope, batchId) => {
    const { data } = await api.put('/banking/import/bulk-rename', { oldDescription, newDescription, scope, batchId });
    return data;
  },

  toggleExpenseType: async (id) => {
    await api.put(`/banking/import/toggle-type/${id}`);
  },

  renameItem: async (type, id, newDescription) => {
    await api.put('/banking/import/rename', { type, id, newDescription });
  },
}));

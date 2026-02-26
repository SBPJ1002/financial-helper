import { create } from 'zustand';
import api from '../services/api';

interface Category {
  id: string;
  name: string;
  emoji: string;
  isDefault: boolean;
  type: 'EXPENSE' | 'INCOME' | 'BOTH';
}

interface Income {
  id: string;
  description: string;
  amount: number;
  date: string;
  recurrence: string;
  currency?: string;
  categoryId?: string;
  category?: Category;
  recurrenceDay?: number;
  contractMonths?: number;
  contractStartDate?: string;
}

interface Expense {
  id: string;
  description: string;
  amount: number;
  type: 'FIXED' | 'VARIABLE';
  currency?: string;
  categoryId: string;
  category: Category;
  date: string;
  dueDay: number | null;
  status: string;
  paymentMethod: string | null;
  fixedAmountType?: 'FIXED_AMOUNT' | 'VARIABLE_AMOUNT' | null;
  installmentNumber: number | null;
  totalInstallments: number | null;
  installmentGroupId: string | null;
  history: Array<{ id: string; month: string; amount: number }>;
  goal: { id: string; limit: number } | null;
}

interface SourceBreakdown {
  bank: number;
  creditCard: number;
  manual: number;
}

interface DashboardSummary {
  month: string;
  totalIncome: number;
  totalFixed: number;
  totalVariable: number;
  totalExpenses: number;
  balance: number;
  savingsRate: number;
  categoryBreakdown: Array<{ name: string; emoji: string; total: number }>;
  topExpenses: Array<{ description: string; amount: number; category: string; emoji: string }>;
  fixedBySource?: SourceBreakdown;
  variableBySource?: SourceBreakdown;
  invoiceTotal?: number;
  declarationMatchRate?: number;
}

interface FinanceState {
  // Data
  incomes: Income[];
  expenses: Expense[];
  categories: Category[];
  incomeCategories: Category[];
  dashboard: DashboardSummary | null;
  isLoading: boolean;

  // Fetch
  fetchIncomes: (month?: string) => Promise<void>;
  fetchExpenses: (type?: 'FIXED' | 'VARIABLE') => Promise<void>;
  fetchCategories: () => Promise<void>;
  fetchIncomeCategories: () => Promise<void>;
  fetchDashboard: (month?: string) => Promise<void>;
  fetchAll: () => Promise<void>;

  // Income CRUD
  addIncome: (data: Omit<Income, 'id'>) => Promise<void>;
  updateIncome: (id: string, data: Partial<Income>) => Promise<void>;
  deleteIncome: (id: string) => Promise<void>;

  // Expense CRUD
  addExpense: (data: {
    description: string; amount: number; type: 'FIXED' | 'VARIABLE';
    categoryId: string; date: string; dueDay?: number; status?: string; paymentMethod?: string;
  }) => Promise<{ id: string }>;
  updateExpense: (id: string, data: Record<string, unknown>) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  toggleExpenseType: (id: string) => Promise<void>;
  generateRecurring: (id: string, months: number) => Promise<{ created: number }>;
  deleteFutureExpenses: (id: string) => Promise<{ deleted: number }>;
  updateFutureAmount: (id: string, amount: number) => Promise<{ updated: number }>;

  // Expense history & goals
  addExpenseHistory: (expenseId: string, month: string, amount: number) => Promise<void>;
  setExpenseGoal: (expenseId: string, limit: number) => Promise<void>;
  removeExpenseGoal: (expenseId: string) => Promise<void>;

  // Category CRUD
  addCategory: (data: { name: string; emoji?: string; type?: string }) => Promise<Category>;
  updateCategory: (id: string, data: { name?: string; emoji?: string; type?: string }) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;

  // Helpers
  fixedExpenses: () => Expense[];
  variableExpenses: () => Expense[];
}

export const useFinanceStore = create<FinanceState>()((set, get) => ({
  incomes: [],
  expenses: [],
  categories: [],
  incomeCategories: [],
  dashboard: null,
  isLoading: false,

  // --- Fetch ---
  fetchIncomes: async (month) => {
    const params = month ? { month } : {};
    const { data } = await api.get('/incomes', { params });
    set({ incomes: data });
  },
  fetchExpenses: async (type) => {
    const params = type ? { type } : {};
    const { data } = await api.get('/expenses', { params });
    set({ expenses: data });
  },
  fetchCategories: async () => {
    const { data } = await api.get('/categories', { params: { type: 'EXPENSE' } });
    set({ categories: data });
  },
  fetchIncomeCategories: async () => {
    const { data } = await api.get('/categories', { params: { type: 'INCOME' } });
    set({ incomeCategories: data });
  },
  fetchDashboard: async (month) => {
    const params = month ? { month } : {};
    const { data } = await api.get('/dashboard/summary', { params });
    set({ dashboard: data });
  },
  fetchAll: async () => {
    set({ isLoading: true });
    try {
      await Promise.all([
        get().fetchIncomes(),
        get().fetchExpenses(),
        get().fetchCategories(),
        get().fetchIncomeCategories(),
        get().fetchDashboard(),
      ]);
    } finally {
      set({ isLoading: false });
    }
  },

  // --- Income ---
  addIncome: async (data) => {
    await api.post('/incomes', data);
    await get().fetchIncomes();
  },
  updateIncome: async (id, data) => {
    await api.put(`/incomes/${id}`, data);
    await get().fetchIncomes();
  },
  deleteIncome: async (id) => {
    await api.delete(`/incomes/${id}`);
    await get().fetchIncomes();
  },

  // --- Expense ---
  addExpense: async (data) => {
    const { data: expense } = await api.post('/expenses', data);
    await get().fetchExpenses();
    return expense;
  },
  updateExpense: async (id, data) => {
    await api.put(`/expenses/${id}`, data);
    await get().fetchExpenses();
  },
  deleteExpense: async (id) => {
    await api.delete(`/expenses/${id}`);
    await get().fetchExpenses();
  },
  toggleExpenseType: async (id) => {
    await api.put(`/expenses/${id}/toggle-type`);
    await get().fetchExpenses();
  },
  generateRecurring: async (id, months) => {
    const { data } = await api.post(`/expenses/${id}/generate-recurring`, { months });
    await get().fetchExpenses();
    return data;
  },
  deleteFutureExpenses: async (id) => {
    const { data } = await api.delete(`/expenses/${id}/future`);
    await get().fetchExpenses();
    return data;
  },
  updateFutureAmount: async (id, amount) => {
    const { data } = await api.put(`/expenses/${id}/future-amount`, { amount });
    await get().fetchExpenses();
    return data;
  },

  // --- Expense History & Goals ---
  addExpenseHistory: async (expenseId, month, amount) => {
    await api.post(`/expenses/${expenseId}/history`, { month, amount });
    await get().fetchExpenses();
  },
  setExpenseGoal: async (expenseId, limit) => {
    await api.put(`/expenses/${expenseId}/goal`, { limit });
    await get().fetchExpenses();
  },
  removeExpenseGoal: async (expenseId) => {
    await api.delete(`/expenses/${expenseId}/goal`);
    await get().fetchExpenses();
  },

  // --- Category ---
  addCategory: async (data) => {
    const { data: category } = await api.post('/categories', data);
    await Promise.all([get().fetchCategories(), get().fetchIncomeCategories()]);
    return category;
  },
  updateCategory: async (id, data) => {
    await api.put(`/categories/${id}`, data);
    await Promise.all([get().fetchCategories(), get().fetchIncomeCategories()]);
  },
  deleteCategory: async (id) => {
    await api.delete(`/categories/${id}`);
    await Promise.all([get().fetchCategories(), get().fetchIncomeCategories()]);
  },

  // --- Helpers ---
  fixedExpenses: () => get().expenses.filter((e) => e.type === 'FIXED'),
  variableExpenses: () => get().expenses.filter((e) => e.type === 'VARIABLE'),
}));

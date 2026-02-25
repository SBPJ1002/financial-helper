import { create } from 'zustand';
import api from '../services/api';

export interface RegisterData {
  fullName: string;
  email: string;
  password: string;
  cpf?: string;
  birthDate?: string;
  gender?: string;
  zipCode?: string;
  street?: string;
  addressNumber?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
}

interface User {
  id: string;
  fullName: string;
  email: string;
  role: 'USER' | 'ADMIN';
  createdAt: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isInitialized: boolean;

  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  token: localStorage.getItem('auth-token'),
  isLoading: false,
  isInitialized: false,

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const { data } = await api.post('/auth/login', { email, password });
      localStorage.setItem('auth-token', data.token);
      set({ user: data.user, token: data.token });
    } finally {
      set({ isLoading: false });
    }
  },

  register: async (registerData) => {
    set({ isLoading: true });
    try {
      const { data } = await api.post('/auth/register', registerData);
      localStorage.setItem('auth-token', data.token);
      set({ user: data.user, token: data.token });
    } finally {
      set({ isLoading: false });
    }
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore error on logout
    }
    localStorage.removeItem('auth-token');
    set({ user: null, token: null });
  },

  initialize: async () => {
    const token = localStorage.getItem('auth-token');
    if (!token) {
      set({ isInitialized: true });
      return;
    }
    try {
      const { data } = await api.get('/auth/me');
      set({ user: data, token, isInitialized: true });
    } catch {
      localStorage.removeItem('auth-token');
      set({ user: null, token: null, isInitialized: true });
    }
  },
}));

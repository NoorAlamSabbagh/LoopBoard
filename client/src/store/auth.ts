import { create } from 'zustand';
import { authApi } from '@/services/dataApi';
import { refreshAccessToken, setAccessToken } from '@/services/api';
import type { User } from '@/types/api';

type AuthState = {
  user: User | null;
  ready: boolean;
  bootstrap: () => Promise<void>;
  setSession: (user: User, token: string) => void;
  logout: () => Promise<void>;
};

export const useAuth = create<AuthState>((set) => ({
  user: null,
  ready: false,
  setSession: (user, token) => {
    setAccessToken(token);
    set({ user });
  },
  bootstrap: async () => {
    const token = await refreshAccessToken();
    if (!token) {
      set({ user: null, ready: true });
      return;
    }
    try {
      const res = await authApi.profile();
      set({ user: res.data, ready: true });
    } catch {
      setAccessToken('');
      set({ user: null, ready: true });
    }
  },
  logout: async () => {
    try {
      await authApi.logout();
    } catch {
      /* ignore */
    }
    setAccessToken('');
    set({ user: null });
  },
}));

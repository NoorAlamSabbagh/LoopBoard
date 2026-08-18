import { create } from 'zustand';

type Toast = { id: number; message: string; tone: 'ok' | 'err' };

type UiState = {
  toasts: Toast[];
  sidebarOpen: boolean;
  push: (message: string, tone?: Toast['tone']) => void;
  dismiss: (id: number) => void;
  setSidebarOpen: (open: boolean) => void;
};

let n = 1;

export const useUi = create<UiState>((set) => ({
  toasts: [],
  sidebarOpen: false,
  push: (message, tone = 'ok') => {
    const id = n++;
    set((s) => ({ toasts: [...s.toasts, { id, message, tone }] }));
    window.setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 3800);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
}));

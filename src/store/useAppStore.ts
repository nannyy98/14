import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Language } from '../lib/translations';

type Theme = 'light' | 'dark' | 'system';

interface AppStore {
  language: Language;
  setLanguage: (language: Language) => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  telegramUserId: number | null;
  setTelegramUserId: (id: number | null) => void;
  registeredPhone: string | null;
  registeredName: string | null;
  setRegistration: (name: string, phone: string) => void;
  clearRegistration: () => void;
  isRegistered: () => boolean;
  getUserId: () => number;
}

function phoneToNumericId(phone: string): number {
  const digits = phone.replace(/\D/g, '');
  return parseInt(digits.slice(-9), 10) || Date.now();
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.remove('light', 'dark');
  if (theme === 'system') {
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.classList.add(isDark ? 'dark' : 'light');
  } else {
    root.classList.add(theme);
  }
}

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      language: 'ru',
      setLanguage: (language) => set({ language }),
      theme: 'system' as Theme,
      setTheme: (theme) => {
        set({ theme });
        applyTheme(theme);
      },
      telegramUserId: null,
      setTelegramUserId: (id) => set({ telegramUserId: id }),
      registeredPhone: null,
      registeredName: null,
      setRegistration: (name, phone) => set({ registeredName: name, registeredPhone: phone }),
      clearRegistration: () => set({ registeredName: null, registeredPhone: null }),
      isRegistered: () => {
        const state = get();
        return !!(state.telegramUserId || state.registeredPhone);
      },
      getUserId: () => {
        const state = get();
        if (state.telegramUserId) return state.telegramUserId;
        if (state.registeredPhone) return phoneToNumericId(state.registeredPhone);
        return 0;
      },
    }),
    {
      name: 'app-storage',
      onRehydrateStorage: () => (state) => {
        if (state?.theme) {
          applyTheme(state.theme);
        }
      },
    }
  )
);

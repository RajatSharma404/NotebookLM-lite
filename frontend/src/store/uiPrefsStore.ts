// ============================================================================
// UI Preferences Store (Zustand + Versioned LocalStorage)
// Follows: zustand-store-ts, react-state-management, design-theme-guide
// ============================================================================

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type AppTheme = 'dark' | 'light';

export interface UiPrefsState {
  theme: AppTheme;
  sourcesCollapsed: boolean;
  studioCollapsed: boolean;
  selectedModel: string;
  selectedProvider: string;

  // Actions
  setTheme: (theme: AppTheme) => void;
  toggleTheme: () => void;
  setSourcesCollapsed: (collapsed: boolean) => void;
  toggleSourcesCollapsed: () => void;
  setStudioCollapsed: (collapsed: boolean) => void;
  toggleStudioCollapsed: () => void;
  setSelectedModel: (model: string, provider?: string) => void;
}

export const useUiPrefsStore = create<UiPrefsState>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      sourcesCollapsed: false,
      studioCollapsed: false,
      selectedModel: 'gemini-1.5-flash',
      selectedProvider: 'gemini',

      setTheme: (theme: AppTheme) => {
        document.documentElement.setAttribute('data-theme', theme);
        set({ theme });
      },

      toggleTheme: () => {
        const nextTheme: AppTheme = get().theme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', nextTheme);
        set({ theme: nextTheme });
      },

      setSourcesCollapsed: (collapsed: boolean) => set({ sourcesCollapsed: collapsed }),

      toggleSourcesCollapsed: () => set((state) => ({ sourcesCollapsed: !state.sourcesCollapsed })),

      setStudioCollapsed: (collapsed: boolean) => set({ studioCollapsed: collapsed }),

      toggleStudioCollapsed: () => set((state) => ({ studioCollapsed: !state.studioCollapsed })),

      setSelectedModel: (model: string, provider?: string) =>
        set((state) => ({
          selectedModel: model,
          selectedProvider: provider || state.selectedProvider
        }))
    }),
    {
      name: 'notebooklm_ui_prefs',
      version: 2,
      storage: createJSONStorage(() => localStorage),
      migrate: (persistedState: unknown, version: number) => {
        const state = (persistedState || {}) as Partial<UiPrefsState>;
        if (version < 2) {
          // Migration from version 1: Ensure theme is valid
          return {
            ...state,
            theme: state.theme === 'light' ? 'light' : 'dark',
            sourcesCollapsed: Boolean(state.sourcesCollapsed),
            studioCollapsed: Boolean(state.studioCollapsed),
            selectedModel: state.selectedModel || 'gemini-1.5-flash',
            selectedProvider: state.selectedProvider || 'gemini'
          } as UiPrefsState;
        }
        return state as UiPrefsState;
      },
      onRehydrateStorage: () => (state) => {
        if (state?.theme) {
          document.documentElement.setAttribute('data-theme', state.theme);
        }
      }
    }
  )
);

import { create } from 'zustand'
import { type State, type Action } from './types'

const initialState: State = {
  theme:
    (localStorage.getItem('starlight-theme') as
      | State['theme']
      | null) ?? 'auto',
}

export const useStore = create<Action & State>((set, get) => {
  const store = {
    ...initialState,

    updateTheme: (theme: State['theme']) => {
      set(() => ({ theme }))
      localStorage.setItem('starlight-theme', theme)
    },

    getPreferredColorScheme: () =>
      window.matchMedia('(prefers-color-scheme: light)').matches ?
        'light'
      : 'dark',

    getResolvedTheme: (): 'light' | 'dark' => {
      const { theme } = get()
      if (theme === 'auto') {
        return store.getPreferredColorScheme()
      }
      return theme
    },
  }

  return store
})

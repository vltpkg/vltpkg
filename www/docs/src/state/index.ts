import { create } from 'zustand'
import type { State, Action } from './types'

const initialState: State = {
  theme: (localStorage.getItem('starlight-theme') ||
    '{}') as State['theme'],
}

export const useStore = create<Action & State>((set, _get) => {
  const store = {
    ...initialState,
    updateTheme: (theme: State['theme']) => {
      set(() => ({ theme }))
      localStorage.setItem('starlight-theme', theme)
    },
  }
  return store
})

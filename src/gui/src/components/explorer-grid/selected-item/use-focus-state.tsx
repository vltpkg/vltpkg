import { useGraphStore } from '@/state/index.ts'

export const useFocusState = (): {
  focused: boolean
  setFocused: (focused: boolean) => void
} => {
  const focused = useGraphStore(state => state.focused)
  const updateFocused = useGraphStore(state => state.updateFocused)

  const setFocused = (value: boolean) => {
    updateFocused(value)
  }

  return { focused, setFocused }
}

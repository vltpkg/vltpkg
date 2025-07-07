import { useEffect, useState } from 'react'

export const useFocusState = (): {
  focused: boolean
  setFocused: (focused: boolean) => void
} => {
  const [focused, setFocusedState] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    const storedFocus = localStorage.getItem('focused')
    return storedFocus ? (JSON.parse(storedFocus) as boolean) : false
  })

  useEffect(() => {
    localStorage.setItem('focused', JSON.stringify(focused))
  }, [focused])

  const setFocused = (value: boolean) => {
    setFocusedState(value)
  }

  return { focused, setFocused }
}

import { useEffect } from 'react'

/**
 * A custom hook to handle `keydown` events of any shape
 */
export const useKeyDown = (
  keys: string | string[],
  cb: (e: KeyboardEvent) => void,
) => {
  useEffect(() => {
    const combos = Array.isArray(keys) ? keys : [keys]

    const normalize = (combo: string) =>
      combo
        .toLowerCase()
        .split('+')
        .map(k => k.trim())

    const handleKeyDown = (e: KeyboardEvent) => {
      const pressed: string[] = []
      if (e.ctrlKey) pressed.push('ctrl')
      if (e.metaKey) pressed.push('meta')
      if (e.altKey) pressed.push('alt')
      if (e.shiftKey) pressed.push('shift')
      pressed.push(e.key.toLowerCase())

      const match = combos.some(combo => {
        const normalized = normalize(combo)
        return normalized.every(key => pressed.includes(key))
      })

      if (match) {
        e.preventDefault()
        cb(e)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () =>
      document.removeEventListener('keydown', handleKeyDown)
  }, [keys, cb])
}

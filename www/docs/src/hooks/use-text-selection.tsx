'use client'

import React from 'react'

const useTextSelection = () => {
  const [selection, setSelection] = React.useState<
    string | undefined
  >(undefined)

  const handleSelection = React.useCallback(() => {
    const text = window.getSelection()?.toString()
    setSelection(text)
  }, [])

  React.useEffect(() => {
    document.addEventListener('selectionchange', handleSelection)
    return () =>
      document.removeEventListener('selectionchange', handleSelection)
  }, [handleSelection])

  return { selection }
}

export { useTextSelection }

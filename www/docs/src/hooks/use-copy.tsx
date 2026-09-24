'use client'
import React from 'react'
import { toast } from 'sonner'

const ID = 'copied-to-clipboard'

interface CopyOptions {
  /** The toast confirmation and error, Enabled by default. */
  enableToast?: boolean
}

const useCopy = (duration = 3000) => {
  const [copied, setCopied] = React.useState(false)
  const timeout = React.useRef<ReturnType<typeof setTimeout> | null>(
    null,
  )

  React.useEffect(() => {
    return () => {
      if (timeout.current) clearTimeout(timeout.current)
    }
  }, [])

  const copy = React.useCallback(
    async (v: string, options?: CopyOptions): Promise<void> => {
      const { enableToast = true }: CopyOptions = options ?? {}
      try {
        if (!('clipboard' in navigator) || !window.isSecureContext)
          throw new Error('Clipboard is unavailable')

        await navigator.clipboard.writeText(v)
        setCopied(true)
        if (enableToast) toast('Copied to clipboard!', { id: ID })

        if (timeout.current) clearTimeout(timeout.current)
        timeout.current = setTimeout(() => setCopied(false), duration)
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Failed to copy'
        if (enableToast) toast.error(msg, { id: ID })
      }
    },
    [duration],
  )

  return { copied, copy }
}

export { useCopy }

import React, { useState, useCallback } from 'react'
import { Copy, Check, AlertCircle } from 'lucide-react'

export interface CopyMarkdownButtonProps {
  /**
   * The doc slug/ID to fetch markdown for.
   * E.g., "cli/commands/install" or "get-started/why-vlt"
   */
  docSlug: string

  /**
   * Optional custom button text. Defaults to "Copy as Markdown"
   */
  label?: string

  /**
   * Optional CSS class for styling
   */
  className?: string
}

/**
 * Button component that fetches a doc as markdown and copies it to clipboard.
 * Shows loading/success/error states with visual feedback.
 */
export const CopyMarkdownButton: React.FC<CopyMarkdownButtonProps> = ({
  docSlug,
  label = 'Copy as Markdown',
  className = '',
}) => {
  const [state, setState] = useState<
    'idle' | 'loading' | 'success' | 'error'
  >('idle')
  const [error, setError] = useState<string | null>(null)

  const handleCopy = useCallback(async () => {
    setState('loading')
    setError(null)

    try {
      // Fetch markdown from API
      const url = `/api/markdown/${docSlug.replace(/\/$/, '')}`
      console.log('[CopyMarkdownButton] Fetching markdown from:', url)

      const response = await fetch(url)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMsg =
          errorData.message || `Failed to fetch markdown (${response.status})`
        console.error('[CopyMarkdownButton] API error:', errorMsg, errorData)
        throw new Error(errorMsg)
      }

      const markdown = await response.text()
      console.log('[CopyMarkdownButton] Received markdown:', markdown.length, 'characters')

      // Copy to clipboard
      if (!navigator.clipboard) {
        throw new Error('Clipboard API not available in this browser')
      }
      await navigator.clipboard.writeText(markdown)
      console.log('[CopyMarkdownButton] Successfully copied to clipboard')

      // Show success state
      setState('success')

      // Reset after 2 seconds
      setTimeout(() => {
        setState('idle')
      }, 2000)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unknown error'
      console.error('[CopyMarkdownButton] Error:', message, err)
      setError(message)
      setState('error')

      // Reset after 3 seconds
      setTimeout(() => {
        setState('idle')
        setError(null)
      }, 3000)
    }
  }, [docSlug])

  const buttonLabel =
    state === 'loading'
      ? 'Copying...'
      : state === 'success'
        ? 'Copied!'
        : state === 'error'
          ? 'Error'
          : label

  const buttonVariant =
    state === 'success'
      ? 'success'
      : state === 'error'
        ? 'destructive'
        : 'default'

  const iconComponent =
    state === 'success' ? (
      <Check size={16} />
    ) : state === 'error' ? (
      <AlertCircle size={16} />
    ) : (
      <Copy size={16} />
    )

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleCopy}
        disabled={state === 'loading'}
        title={error || 'Copy this page as markdown'}
        className={`flex items-center gap-2 rounded px-3 py-2 text-sm font-medium transition-colors ${
          buttonVariant === 'success'
            ? 'bg-green-100 text-green-900 dark:bg-green-900 dark:text-green-100'
            : buttonVariant === 'destructive'
              ? 'bg-red-100 text-red-900 dark:bg-red-900 dark:text-red-100'
              : 'bg-slate-100 text-slate-900 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600'
        } ${state === 'loading' ? 'cursor-not-allowed opacity-50' : ''} ${className}`}>
        {iconComponent}
        <span>{buttonLabel}</span>
      </button>

      {/* Error message */}
      {state === 'error' && error && (
        <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  )
}

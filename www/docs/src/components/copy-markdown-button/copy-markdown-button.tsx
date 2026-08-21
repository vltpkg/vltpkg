import React, { useState, useCallback } from 'react'
import { Copy, Check, AlertCircle } from 'lucide-react'

export interface CopyMarkdownButtonProps {
  /**
   * The doc slug/ID to fetch markdown for.
   * E.g., "cli/commands/install" or "get-started/why-vlt"
   */
  slug: string

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
 * Extract an error message from a failed response, always including the
 * HTTP status code so failures surface actionable information.
 */
async function getErrorMessage(response: Response): Promise<string> {
  try {
    const message = (await response.text()).trim()
    if (message) {
      return `${message} (HTTP ${response.status})`
    }
  } catch {
    // Body unreadable — fall back to the status-based message
  }
  return `Failed to fetch markdown (HTTP ${response.status})`
}

/**
 * Button component that fetches a doc as markdown and copies it to clipboard.
 * Shows loading/success/error states with visual feedback.
 */
export const CopyMarkdownButton: React.FC<
  CopyMarkdownButtonProps
> = ({ slug, label, className }) => {
  const [state, setState] = useState<
    'idle' | 'loading' | 'success' | 'error'
  >('idle')
  const [error, setError] = useState<string | null>(null)

  const handleCopy = useCallback(async () => {
    setState('loading')
    setError(null)

    try {
      // Fetch markdown from API
      const url = `/api/markdown/${slug.replace(/\/$/, '')}`

      const response = await fetch(url)

      if (!response.ok) {
        const errorMsg = await getErrorMessage(response)
        console.error('[CopyMarkdownButton] API error:', errorMsg)
        throw new Error(errorMsg)
      }

      const markdown = await response.text()

      // Copy to clipboard
      await navigator.clipboard.writeText(markdown)
      console.log(
        '[CopyMarkdownButton] Successfully copied to clipboard',
      )

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
  }, [slug])

  const buttonLabel = (() => {
    switch (state) {
      case 'loading':
        return 'Copying...'
      case 'success':
        return 'Copied!'
      case 'error':
        return 'Error'
      default:
        return label
    }
  })()

  const buttonVariant = (() => {
    switch (state) {
      case 'success':
        return 'success'
      case 'error':
        return 'destructive'
      default:
        return 'default'
    }
  })()

  const iconComponent = (() => {
    switch (state) {
      case 'success':
        return <Check size={16} aria-hidden="true" />
      case 'error':
        return <AlertCircle size={16} aria-hidden="true" />
      default:
        return <Copy size={16} aria-hidden="true" />
    }
  })()

  // Generate ARIA labels based on state
  const ariaLabel = (() => {
    const docLabel = label ?? 'document'
    switch (state) {
      case 'loading':
        return `Copying ${docLabel} as markdown to clipboard`
      case 'success':
        return `Successfully copied ${docLabel} as markdown to clipboard`
      case 'error':
        return `Failed to copy ${docLabel} as markdown: ${error}`
      default:
        return `Copy ${docLabel} as markdown to clipboard`
    }
  })()

  const errorId =
    state === 'error' && error ? 'copy-error-message' : undefined

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleCopy}
        disabled={state === 'loading' || state === 'error'}
        title={
          state === 'error' ? `Error: ${error}`
          : state === 'success' ?
            'Successfully copied to clipboard'
          : state === 'loading' ?
            'Copying to clipboard...'
          : `Copy this page as markdown to your clipboard`
        }
        aria-label={ariaLabel}
        aria-busy={state === 'loading'}
        aria-disabled={state === 'loading' || state === 'error'}
        aria-describedby={errorId}
        className={`flex items-center gap-2 rounded px-3 py-2 text-sm font-medium transition-colors ${
          buttonVariant === 'success' ?
            'bg-green-100 text-green-900 dark:bg-green-900 dark:text-green-100'
          : buttonVariant === 'destructive' ?
            'bg-red-100 text-red-900 dark:bg-red-900 dark:text-red-100'
          : 'bg-slate-100 text-slate-900 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600'
        } ${
          state === 'loading' || state === 'error' ?
            'cursor-not-allowed opacity-50'
          : 'cursor-pointer'
        } ${className}`}>
        {iconComponent}
        <span aria-live="polite" aria-atomic="true">
          {buttonLabel}
        </span>
      </button>

      {/* Error message with ARIA attributes */}
      {state === 'error' && error && (
        <p
          id={errorId}
          role="alert"
          className="text-xs text-red-600 dark:text-red-400">
          <span className="sr-only">Error: </span>
          {error}
        </p>
      )}
    </div>
  )
}

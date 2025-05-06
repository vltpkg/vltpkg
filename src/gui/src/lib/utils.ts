import { clsx } from 'clsx'
import type { ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function assert(
  value: unknown,
  message?: string | Error,
): asserts value {
  if (!value) {
    if (message instanceof Error) {
      throw message
    }
    throw new Error(message ?? 'Assertion failed')
  }
}

// Tremor Raw focusInput [v0.0.1]

export const focusInput = [
  // base
  'focus:ring-2',
  // ring color
  'focus:ring-blue-200 focus:dark:ring-blue-700/30',
  // border color
  'focus:border-blue-500 focus:dark:border-blue-700',
]

// Tremor Raw focusRing [v0.0.1]

export const focusRing = [
  // base
  'outline outline-offset-2 outline-0 focus-visible:outline-2',
  // outline color
  'outline-blue-500 dark:outline-blue-500',
]

// Tremor Raw hasErrorInput [v0.0.1]

export const hasErrorInput = [
  // base
  'ring-2',
  // border color
  'border-red-500 dark:border-red-700',
  // ring color
  'ring-red-200 dark:ring-red-700/30',
]

export const severityStyles = {
  low: {
    background:
      'bg-gray-500/5 dark:bg-gray-600/10 hover:bg-gray-500/15',
    border: 'border-gray-600/80 hover:border-gray-500/80',
    text: 'text-gray-600 dark:text-gray-500',
  },
  medium: {
    background:
      'bg-yellow-500/5 dark:bg-yellow-600/10 hover:bg-yellow-500/15',
    border: 'border-yellow-600/80 hover:border-yellow-500/80',
    text: 'text-yellow-700 dark:text-yellow-600',
  },
  high: {
    background: 'bg-red-500/5 dark:bg-red-600/10 hover:bg-red-500/15',
    border: 'border-red-600/80 hover:border-red-500/80',
    text: 'text-red-600 dark:text-red-500',
  },
  critical: {
    background: 'bg-red-500/5 dark:bg-red-600/10 hover:bg-red-500/15',
    border: 'border-red-600/80 hover:border-red-500/80',
    text: 'text-red-600 dark:text-red-500',
  },
} as const

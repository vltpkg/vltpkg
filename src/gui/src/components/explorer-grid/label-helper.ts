export const labelClassNamesMap = new Map<string | undefined, string>(
  [
    [
      undefined,
      'cursor-default border-none bg-gray-100 text-neutral-900 hover:bg-gray-100/80',
    ],
    [
      'prod',
      'cursor-default border-none bg-cyan-500/30 text-cyan-600 hover:bg-cyan-500/40 dark:bg-cyan-500/30 dark:text-cyan-500 dark:hover:bg-cyan-500/40',
    ],
    [
      'dev',
      'cursor-default border-none bg-fuchsia-500/20 text-fuchsia-500 hover:bg-fuchsia-400/30 dark:bg-fuchsia-500/30 dark:text-fuchsia-400 dark:hover:bg-fuchsia-500/40',
    ],
    [
      'optional',
      'cursor-default border-none bg-orange-500/20 text-orange-500 hover:bg-orange-400/30 dark:bg-orange-500/30 dark:text-orange-400 dark:hover:bg-orange-500/40',
    ],
    [
      'peer',
      'cursor-default border-none bg-lime-500/30 text-lime-600 hover:bg-lime-400/40 dark:bg-lime-500/30 dark:text-lime-400 dark:hover:bg-lime-500/40',
    ],
    [
      'peerOptional',
      'cursor-default border-none bg-yellow-500/30 text-yellow-600 hover:bg-yellow-400/40 dark:bg-yellow-500/30 dark:text-yellow-400 dark:hover:bg-yellow-500/40',
    ],
  ],
)

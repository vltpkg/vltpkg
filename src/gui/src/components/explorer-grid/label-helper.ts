export const labelClassNamesMap = new Map<string | undefined, string>(
  [
    [
      undefined,
      'bg-gray-100 border-[1px] border-neutral-900 text-neutral-900 hover:bg-gray-100/80',
    ],
    [
      'prod',
      'bg-cyan-500/25 text-cyan-600 border-[1px] border-cyan-600 dark:border-cyan-500 hover:bg-cyan-500/40 dark:bg-cyan-500/30 dark:text-cyan-500 dark:hover:bg-cyan-500/40',
    ],
    [
      'dev',
      'bg-fuchsia-500/20 border-[1px] dark:border-fuchsia-400 border-fuchsia-500 text-fuchsia-500 hover:bg-fuchsia-400/30 dark:bg-fuchsia-500/30 dark:text-fuchsia-400 dark:hover:bg-fuchsia-500/40',
    ],
    [
      'optional',
      'bg-orange-500/20 border-[1px] border-orange-500 dark:border-orange-400 text-orange-500 hover:bg-orange-400/30 dark:bg-orange-500/30 dark:text-orange-400 dark:hover:bg-orange-500/40',
    ],
    [
      'peer',
      'bg-lime-500/25 border-[1px] border-lime-600 dark:border-lime-400 text-lime-600 hover:bg-lime-400/40 dark:bg-lime-500/30 dark:text-lime-400 dark:hover:bg-lime-500/40',
    ],
    [
      'peerOptional',
      'bg-yellow-500/25 border-[1px] border-yellow-600 dark:border-yellow-400 text-yellow-600 hover:bg-yellow-400/40 dark:bg-yellow-500/30 dark:text-yellow-400 dark:hover:bg-yellow-500/40',
    ],
    [
      'workspace',
      'bg-gray-500/25 border-[1px] border-gray-600 dark:border-gray-400 text-gray-600 hover:bg-gray-400/40 dark:bg-gray-500/30 dark:text-gray-400 dark:hover:bg-gray-500/40',
    ],
  ],
)

export const labelClassNamesMap = new Map<string | undefined, string>(
  [
    [
      undefined,
      'border-[1px] border-neutral-900  bg-gray-100 text-neutral-900 hover:bg-gray-100/80',
    ],
    [
      'prod',
      'border-transparent bg-cyan-100 text-neutral-900 hover:bg-cyan-100/80',
    ],
    [
      'dev',
      'border-[1px] dark:border-fuchsia-600 border-fuchsia-500 bg-fuchsia-100 dark:bg-fuchsia-300 text-neutral-900 dark:text-fuchsia-900 hover:bg-fuchsia-100/80',
    ],
    [
      'optional',
      'border-[1px] border-orange-500 dark:border-orange-400 bg-orange-100 text-neutral-900 dark:text-orange-900 hover:bg-orange-100/80',
    ],
    [
      'peer',
      'border-[1px] border-lime-600 dark:border-lime-700 bg-lime-100 dark:bg-lime-300 text-neutral-900 dark:text-lime-900 hover:bg-lime-100/80',
    ],
    [
      'peerOptional',
      'border-[1px] border-yellow-600 dark:border-yellow-400  bg-yellow-100 text-neutral-900 dark:text-yellow-900 hover:bg-yellow-100/80',
    ],
    [
      'workspace',
      'bg-gray-500/25 border-[1px] border-gray-600 dark:border-gray-400 text-gray-600 hover:bg-gray-400/40 dark:bg-gray-500/30 dark:text-gray-400 dark:hover:bg-gray-500/40',
    ],
  ],
)

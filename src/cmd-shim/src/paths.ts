// On non-windows platforms, we only look for symlinks, not shims
/* c8 ignore start */
export const paths =
  process.platform === 'win32' ?
    (path: string) => [
      path + '.cmd',
      path + '.ps1',
      path,
      path + '.pwsh',
    ]
  : (path: string) => [path]
/* c8 ignore stop */

import type { GitOptions } from './index.ts'
export const isWindows = (opts: GitOptions) =>
  (opts.fakePlatform || process.platform) === 'win32'

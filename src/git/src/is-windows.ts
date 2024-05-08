import { type GitOptions } from './index.js'
export const isWindows = (opts: GitOptions) =>
  (opts.fakePlatform || process.platform) === 'win32'

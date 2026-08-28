import { unload } from '@vltpkg/vlt-json'
import { Config } from './config/index.ts'
import type { ParsedConfig } from './config/index.ts'

// static imports, not `import()`: any `import()` below module top level is
// silently dropped by the compiler and throws at runtime
export const reloadConfig = async (
  folder: string,
): Promise<ParsedConfig> => {
  try {
    unload('user')
    unload('project')
    /* c8 ignore next */
  } catch {}

  return Config.load(folder, process.argv, true)
}

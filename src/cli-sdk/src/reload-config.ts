import type { ParsedConfig } from './config/index.ts'

type VltJsonModule = {
  unload: (which?: 'user' | 'project') => void
}

export const reloadConfig = async (
  folder: string,
): Promise<ParsedConfig> => {
  try {
    const { unload } =
      (await import('@vltpkg/vlt-json')) as VltJsonModule
    unload('user')
    unload('project')
    /* c8 ignore next */
  } catch {}

  const { Config } = await import('./config/index.ts')
  return Config.load(folder, process.argv, true)
}

type VltJsonModule = {
  unload: (which?: 'user' | 'project') => void
}

export const reloadConfig = async (folder: string) => {
  // Clear vlt-json caches to ensure fresh file reads
  try {
    const { unload } =
      (await import('@vltpkg/vlt-json')) as VltJsonModule
    unload('user')
    unload('project')
    /* c8 ignore next */
  } catch {}

  // Create a fresh config instance for the set operation to avoid cache issues
  const { Config } = await import('@vltpkg/cli-sdk/config')
  return Config.load(folder, process.argv, true)
}

import { fileURLToPath } from 'node:url'
import type { LoadedConfig } from '../config/index.js'
import { startGUI } from '../start-gui.js'

export const usage = `Usage:
  vlt gui`

export const command = async (
  conf: LoadedConfig,
  _opts: unknown,
  assetsDir: string = fileURLToPath(
    import.meta.resolve('@vltpkg/gui'),
  ),
) => {
  await startGUI({ conf, assetsDir })
}

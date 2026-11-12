import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { emitter } from '@vltpkg/output'
import type { Events } from '@vltpkg/output'
import { defaultRegistries } from '@vltpkg/spec'
import { XDG } from '@vltpkg/xdg'
import type { LoadedConfig } from './config/index.ts'
import { isCI, stderr } from './output.ts'

export const mirrorNotice = [
  "Using vlt's public npm mirror (https://registry.vlt.io/upstream/npm/), which has usage limits.",
  'Run `vlt setup` for an account mirror with no usage limits, or `vlt config set registries.npm=<url>` to use another registry.',
].join('\n')

/**
 * Watch registry requests while a command runs. The returned function
 * prints {@link mirrorNotice} once per machine, after a successful
 * command that fetched from the built-in npm mirror without the user
 * configuring a registry.
 */
export const watchMirrorNotice = (
  conf: LoadedConfig,
): (() => void) => {
  if (
    !process.stderr.isTTY ||
    isCI() ||
    conf.values.view !== 'human' ||
    conf.values.help ||
    conf.options.registry ||
    conf.getRecord('registries').npm !== undefined ||
    conf.options.registries.npm !== defaultRegistries.npm
  ) {
    return () => {}
  }
  let used = false
  const handler = ({ url }: Events['request']) => {
    if (String(url).startsWith(defaultRegistries.npm)) used = true
  }
  emitter.on('request', handler)
  return () => {
    emitter.off('request', handler)
    if (!used || process.exitCode) return
    try {
      const file = new XDG('vlt').state('public-mirror-notice')
      mkdirSync(dirname(file), { recursive: true })
      // `wx`: only the first run to create the marker prints it
      writeFileSync(file, '', { flag: 'wx', mode: 0o600 })
    } catch {
      return
    }
    stderr(mirrorNotice)
  }
}

import { spawn } from 'child_process'
import { cacheEntries } from './utils'
import type { PluginOptions } from './utils'
import { typedocBasePath } from '../../typedoc/constants.mjs'

export const directory = typedocBasePath

export const plugin = {
  name: directory,
  hooks: {
    async setup(o: PluginOptions) {
      const entries = cacheEntries(directory, directory, o)
      if (!entries) return
      await new Promise<void>((res, rej) => {
        const proc = spawn('./node_modules/.bin/typedoc', [])
        proc.stdout
          .setEncoding('utf8')
          .on('data', (data: string) => o.logger.info(data.trim()))
        proc.stderr
          .setEncoding('utf8')
          .on('data', (data: string) => o.logger.info(data.trim()))
        proc
          .on('close', code =>
            code === 0 ? res() : rej(new Error(`typedoc failed`)),
          )
          .on('error', rej)
      })
    },
  },
}

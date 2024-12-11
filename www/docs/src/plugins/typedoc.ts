import { spawn } from 'child_process'
import { type AstroIntegrationLogger } from 'astro'
import { cacheEntries } from './utils'

export const directory = 'packages'

export const plugin = {
  name: directory,
  hooks: {
    async setup({ logger }: { logger: AstroIntegrationLogger }) {
      const entries = cacheEntries(directory, directory, logger)
      if (!entries) return
      await new Promise<void>((res, rej) => {
        const proc = spawn('./node_modules/.bin/typedoc', [])
        proc.stdout
          .setEncoding('utf8')
          .on('data', (data: string) => logger.info(data.trim()))
        proc.stderr
          .setEncoding('utf8')
          .on('data', (data: string) => logger.info(data.trim()))
        proc
          .on('close', code =>
            code === 0 ? res() : rej(new Error(`typedoc failed`)),
          )
          .on('error', rej)
      })
    },
  },
}

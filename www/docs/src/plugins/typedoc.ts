import { rm, stat } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import type { AstroIntegrationLogger } from 'astro'
import { typedocBasePath } from '../../typedoc/constants.mts'

export const directory = typedocBasePath

export const plugin = {
  name: directory,
  hooks: {
    async setup(o: {
      command: string
      logger: AstroIntegrationLogger
    }) {
      if (o.command === 'sync' || o.command === 'check') {
        return o.logger.info(`skipping due to command=${o.command}`)
      }

      if (process.env.NODE_ENV === 'test') {
        return o.logger.warn(`skipping due to NODE_ENV=test`)
      }

      if (process.env.VLT_TYPEDOC_REBUILD) {
        o.logger.info(`removing ${directory}`)
        await rm(directory, { recursive: true, force: true })
      }

      if (
        await stat(directory)
          .then(f => f.isDirectory())
          .catch(() => false)
      ) {
        return o.logger.info(
          `using previously generated files, run with VLT_TYPEDOC_REBUILD=1 to rebuild`,
        )
      }

      await new Promise<void>((res, rej) => {
        const proc = spawn('./node_modules/.bin/typedoc', [], {
          env: {
            ...process.env,
            NODE_OPTIONS: '--experimental-strip-types --no-warnings',
          },
        })
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

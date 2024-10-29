import {
  cpSync,
  mkdirSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { createServer } from 'node:http'
import { resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import handler from 'serve-handler'
import { actual } from '@vltpkg/graph'
import { LoadedConfig } from '../config/index.js'
import opener from 'opener'

export const usage = `Usage:
  vlt gui`

export const command = async (
  conf: LoadedConfig,
  _opts: unknown,
  extra?: string,
) => {
  const monorepo = conf.options.monorepo
  const mainManifest = conf.options.packageJson.read(
    conf.options.projectRoot,
  )
  const graph = actual.load({
    ...conf.options,
    mainManifest,
    monorepo,
    loadManifests: true,
  })
  const importers = [...graph.importers]
  const json = JSON.stringify({
    importers,
    lockfile: graph,
  })

  const tmp = resolve(tmpdir(), 'vltgui')
  rmSync(tmp, { recursive: true, force: true })
  mkdirSync(tmp, { recursive: true })
  const dir =
    /* c8 ignore next */
    extra || fileURLToPath(import.meta.resolve('@vltpkg/gui'))
  for (const file of readdirSync(dir)) {
    cpSync(resolve(dir, file), resolve(tmp, file), {
      recursive: true,
    })
  }
  writeFileSync(resolve(tmp, 'graph.json'), json)

  const opts = {
    cleanUrls: true,
    public: tmp,
  }
  const server = createServer((req, res): void => {
    /* c8 ignore start */
    handler(req, res, opts).catch((err: unknown) => {
      console.error(err)
      res.statusCode = 500
      res.end('Internal server error')
    })
    /* c8 ignore stop */
  })

  await new Promise<void>(res => {
    server.listen(7017, 'localhost', () => {
      console.log('⚡️ vlt GUI running at http://localhost:7017')
      opener('http://localhost:7017/explore')
      res()
    })
  })
}

import {
  readdirSync,
  mkdirSync,
  statSync,
  realpathSync,
} from 'node:fs'
import { homedir } from 'node:os'
import { resolve, extname, join } from 'node:path'
import { install, uninstall } from '@vltpkg/graph'
import { init } from '@vltpkg/init'
import { asError } from '@vltpkg/types'
import { handleStatic } from './handle-static.ts'
import * as json from './json.ts'
import { parseInstallOptions } from './parse-install-options.ts'
import { parseUninstallOptions } from './parse-uninstall-options.ts'
import {
  isValidWhich,
  normalizeKeyPairs,
  normalizeKeyValuePairs,
} from './utils.ts'

import type { IncomingMessage, ServerResponse } from 'node:http'
import type { DependencyTypeShort } from '@vltpkg/types'
import type { WhichConfig } from '@vltpkg/vlt-json'
import type { VltServerListening } from './index.ts'

export type GUIInstallOptions = Record<
  string,
  Record<string, { version: string; type: DependencyTypeShort }>
>

export type GUIUninstallOptions = Record<string, string[]>

/**
 * The main request handler for Vlt Server requests
 */
export const handleRequest = async (
  req: IncomingMessage,
  res: ServerResponse,
  server: VltServerListening,
): Promise<void> => {
  if (req.method !== 'POST') {
    return handleStatic(req, res, server)
  }

  switch (req.url) {
    case '/select-project': {
      const data = await json.read<{ path: unknown }>(req)
      if (typeof data.path !== 'string') {
        return json.error(
          res,
          'Bad request',
          'Project path must be a string',
          400,
        )
      }
      server.emit('needConfigUpdate', data.path)
      await server.update()
      return json.ok(res, 'ok')
    }

    case '/create-project': {
      const data = await json.read<{
        path: unknown
        name: unknown
        author: unknown
      }>(req)

      const { path, name, author } = data
      if (typeof path !== 'string') {
        return json.error(
          res,
          'Bad request',
          'Project path must be a string',
          400,
        )
      }

      if (
        typeof name !== 'string' ||
        !/^[a-z0-9-]+$/.test(name) ||
        name.length > 128
      ) {
        return json.error(
          res,
          'Bad request',
          'Project name must be lowercase, alphanumeric, and may contain hyphens',
          400,
        )
      }

      if (
        typeof author !== 'string' &&
        typeof author !== 'undefined'
      ) {
        return json.error(
          res,
          'Bad request',
          'Project author must be a string if specified',
          400,
        )
      }

      try {
        const cwd = resolve(path, name)
        mkdirSync(cwd, { recursive: true })
        // TODO: investigate why this needs to be updated twice,
        // seems like once should be enough?
        await init({ cwd, author })
        server.emit('needConfigUpdate', cwd)
        await install(server.options)
        server.emit('needConfigUpdate', server.options.projectRoot)
        await server.update()
        return json.ok(res, 'ok')
      } catch (err) {
        return json.error(res, 'CLI Error', asError(err).message, 500)
      }
    }

    case `/install`: {
      const { add } = await json.read<{ add?: GUIInstallOptions }>(
        req,
      )
      if (!add) {
        return json.error(
          res,
          'Bad request',
          'GUI install endpoint called without add argument',
          400,
        )
      }
      try {
        await install(...parseInstallOptions(server.options, add))
        server.emit('needConfigUpdate', server.options.projectRoot)
        await server.updateGraph()
        return json.ok(res, 'ok')
      } catch (err) {
        return json.error(res, 'Install failed', err, 500)
      }
    }

    case `/uninstall`: {
      const { remove } = await json.read<{
        remove?: GUIUninstallOptions
      }>(req)
      if (!remove) {
        return json.error(
          res,
          'Bad request',
          'GUI uninstall endpoint called without remove argument',
          400,
        )
      }
      try {
        await uninstall(
          ...parseUninstallOptions(server.options, remove),
        )
        server.emit('needConfigUpdate', server.options.projectRoot)
        await server.updateGraph()
        return json.ok(res, 'ok')
      } catch (err) {
        return json.error(res, 'Uninstall failed', err, 500)
      }
    }

    case `/config`: {
      try {
        const data = await json.read<{
          which: WhichConfig
          pairs?: unknown
        }>(req)
        if (!data.pairs) {
          const entire = await server.config.get(
            undefined,
            data.which,
          )
          return json.ok(
            res,
            typeof entire === 'string' ? entire : (
              JSON.stringify(entire)
            ),
          )
        }

        const keysRes = normalizeKeyPairs(res, data.pairs)
        if (!keysRes.ok) return json.ok(res, '{}')
        const out: Record<string, unknown> = {}
        for (const key of keysRes.keys) {
          out[key] = await server.config.get(key, data.which)
        }
        return json.ok(res, JSON.stringify(out))
      } catch (err) {
        return json.error(
          res,
          'Config retrieval failed',
          asError(err).message,
          500,
        )
      }
    }

    case `/config/set`: {
      try {
        const data = await json.read<{
          which: WhichConfig
          pairs: unknown
        }>(req)
        if (!isValidWhich(data.which)) {
          return json.error(
            res,
            'Bad request',
            'which must be "user" or "project"',
            400,
          )
        }
        const normRes = normalizeKeyValuePairs(res, data.pairs)
        if (!normRes.ok) return
        await server.config.setPairs(normRes.normalized, data.which)
        // reload loadedConfig if present and fold new options into server
        if (server.options.loadedConfig) {
          await server.options.loadedConfig.reloadFromDisk()
          server.updateOptions({
            ...server.options,
            ...server.options.loadedConfig.options,
          })
        }
        // if dashboard-root was set explicitly, update server options immediately
        const dr = normRes.normalized.find(
          p => p.key === 'dashboard-root',
        )
        if (dr) {
          try {
            const parsed = JSON.parse(dr.value) as unknown
            if (
              Array.isArray(parsed) &&
              parsed.every(v => typeof v === 'string')
            ) {
              server.updateOptions({
                ...server.options,
                'dashboard-root': parsed,
              })
            }
            /* c8 ignore next */
          } catch {}
        }
        // notify and reload server so changes take effect immediately
        server.emit('needConfigUpdate', server.options.projectRoot)
        await server.update()
        return json.ok(res, 'Config values set successfully')
      } catch (err) {
        return json.error(
          res,
          'Config set failed',
          asError(err).message,
          500,
        )
      }
    }

    case `/config/delete`: {
      try {
        const data = await json.read<{
          which: WhichConfig
          pairs: unknown
        }>(req)
        if (!isValidWhich(data.which)) {
          return json.error(
            res,
            'Bad request',
            'which must be "user" or "project"',
            400,
          )
        }
        const keysRes = normalizeKeyPairs(res, data.pairs)
        if (!keysRes.ok) return
        await server.config.deleteMany(keysRes.keys, data.which)
        // reload loadedConfig if present and fold new options into server
        if (server.options.loadedConfig) {
          await server.options.loadedConfig.reloadFromDisk()
          server.updateOptions({
            ...server.options,
            ...server.options.loadedConfig.options,
          })
        }
        // notify and reload server so changes take effect immediately
        server.emit('needConfigUpdate', server.options.projectRoot)
        await server.update()
        return json.ok(res, 'Config values deleted successfully')
      } catch (err) {
        return json.error(
          res,
          'Config delete failed',
          asError(err).message,
          500,
        )
      }
    }

    case '/fs/homedir': {
      try {
        const dir = homedir()
        return json.ok(res, JSON.stringify(dir))
        /* c8 ignore next 8 */
      } catch (err) {
        return json.error(
          res,
          'Unable to retrieve home directory',
          asError(err).message,
          500,
        )
      }
    }

    case '/fs/ls': {
      try {
        const { path } = await json.read<{ path?: string }>(req)
        const ROOT = homedir()

        const targetPath = realpathSync(
          path ? resolve(ROOT, path) : ROOT,
        )

        if (!targetPath.startsWith(ROOT)) {
          return json.error(
            res,
            'Forbidden',
            'Path traversal detected',
            403,
          )
        }

        const stats = statSync(targetPath)
        if (!stats.isDirectory()) {
          return json.error(
            res,
            'Bad request',
            'Path must be a directory',
            400,
          )
        }

        const entries = readdirSync(targetPath, {
          withFileTypes: true,
        })

        const list = entries.map(dirent => {
          const fullPath = join(targetPath, dirent.name)

          let size: number | null = null
          let mtime: Date | null = null
          try {
            const s = statSync(fullPath)
            size = s.isFile() ? s.size : null
            mtime = s.mtime
            /* c8 ignore next */
          } catch {}

          return {
            name: dirent.name,
            path: fullPath,
            type:
              dirent.isDirectory() ? 'directory'
              : dirent.isFile() ? 'file'
              : 'other',
            fileType:
              dirent.isFile() ?
                extname(dirent.name).slice(1) || null
              : null,
            size,
            mtime,
          }
        })

        return json.ok(res, JSON.stringify(list))
      } catch (err: unknown) {
        const e = asError(err)
        const code = (e as Partial<NodeJS.ErrnoException>).code
        if (code === 'ENOENT') {
          return json.error(
            res,
            'Not Found',
            'Directory does not exist',
            404,
          )
        }
        if (code === 'EACCES') {
          return json.error(
            res,
            'Forbidden',
            'Permission denied',
            403,
          )
        }
        return json.error(res, 'Server error', e.message, 500)
      }
    }

    default: {
      return json.error(res, 'Not found', undefined, 404)
    }
  }
}

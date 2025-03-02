import { install, uninstall } from '@vltpkg/graph'
import { init } from '@vltpkg/init'
import type { DependencyTypeShort } from '@vltpkg/types'
import { mkdirSync } from 'node:fs'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { resolve } from 'node:path'
import { handleStatic } from './handle-static.ts'
import * as json from './json.ts'
import { parseInstallOptions } from './parse-install-options.ts'
import { parseUninstallOptions } from './parse-uninstall-options.ts'
import type { VltServerListening } from './index.ts'

export type GUIInstallOptions = Record<
  string,
  Record<string, { version: string; type: DependencyTypeShort }>
>

export type GUIUninstallOptions = Record<string, Set<string>>

/**
 * The main request handler for Vlt Server requests
 */
export const handleRequest = async (
  server: VltServerListening,
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> => {
  if (req.method !== 'POST') {
    return handleStatic(req, res, server)
  }

  switch (req.url) {
    case '/select-project': {
      const data = await json.read<{ path: unknown }>(req)
      server.emit('needConfigUpdate', String(data.path))
      await server.update()
      return json.ok(res, 'ok')
    }

    case '/create-project': {
      const data = await json.read<{
        path: unknown
        name: unknown
        author: unknown
      }>(req)
      if (typeof data.path !== 'string') {
        return json.error(
          res,
          'Bad request.',
          'Project path must be a string',
          400,
        )
      }
      if (
        !/^[a-z0-9-]+$/.test(String(data.name)) ||
        String(data.name).length > 128
      ) {
        return json.error(
          res,
          'Bad request.',
          'Project name must be lowercase, alphanumeric, and may contain hyphens',
          400,
        )
      }
      const path = String(data.path)
      const name = String(data.name)
      const author = String(data.author)
      try {
        const cwd = resolve(path, name)
        mkdirSync(cwd, { recursive: true })
        await init({ cwd, author })
        server.emit('needConfigUpdate', cwd)
        await install(server.options)
        server.emit('needConfigUpdate', server.options.projectRoot)
        await server.update()
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(err)
        return json.error(
          res,
          'CLI Error',
          (err as Error).message,
          500,
        )
      }
      return json.ok(res, 'ok')
    }

    case `/install`: {
      const { add } = await json.read<{ add?: GUIInstallOptions }>(
        req,
      )
      if (!add) {
        return json.error(
          res,
          'Bad request.',
          'GUI install endpoint called without add argument',
          400,
        )
      }
      try {
        await install(...parseInstallOptions(server.options, add))
        server.emit('needConfigUpdate', server.options.projectRoot)
        server.updateGraph()
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
          'Bad request.',
          'GUI uninstall endpoint called with no arguments',
          400,
        )
      }
      try {
        await uninstall(
          ...parseUninstallOptions(server.options, remove),
        )
        server.emit('needConfigUpdate', server.options.projectRoot)
        server.updateGraph()
        return json.ok(res, 'ok')
      } catch (err) {
        return json.error(res, 'Uninstall failed', err, 500)
      }
    }

    default: {
      return json.error(res, 'Not found', undefined, 404)
    }
  }
}

import { install, uninstall } from '@vltpkg/graph'
import { init } from '@vltpkg/init'
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { handleStatic } from './handle-static.ts'
import * as json from './json.ts'
import { parseInstallOptions } from './parse-install-options.ts'
import { parseUninstallOptions } from './parse-uninstall-options.ts'
import { asError } from '@vltpkg/types'

import type { DependencyTypeShort } from '@vltpkg/types'
import type { IncomingMessage, ServerResponse } from 'node:http'
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
        const data = await json.read<{ key?: string }>(req)
        const result = await server.config.get(data.key)

        if (result === undefined) {
          return json.error(
            res,
            'Config key not found',
            'The specified config key does not exist',
            404,
          )
        }

        const stringResult =
          typeof result === 'string' ? result : JSON.stringify(result)
        return json.ok(res, stringResult)
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
          key: unknown
          value: unknown
        }>(req)

        if (typeof data.key !== 'string') {
          return json.error(
            res,
            'Bad request',
            'Config key must be a string',
            400,
          )
        }

        if (typeof data.value !== 'string') {
          return json.error(
            res,
            'Bad request',
            'Config value must be a string',
            400,
          )
        }

        await server.config.set(data.key, data.value)
        return json.ok(res, 'Config value set successfully')
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
        const data = await json.read<{ key: unknown }>(req)

        if (typeof data.key !== 'string') {
          return json.error(
            res,
            'Bad request',
            'Config key must be a string',
            400,
          )
        }

        await server.config.delete(data.key)
        return json.ok(res, 'Config value deleted successfully')
      } catch (err) {
        return json.error(
          res,
          'Config delete failed',
          asError(err).message,
          500,
        )
      }
    }

    default: {
      return json.error(res, 'Not found', undefined, 404)
    }
  }
}
